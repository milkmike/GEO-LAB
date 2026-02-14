import { TEMPORAL_RULES, TEMPORAL_SCORING } from '@/lib/analyst/config/scoring';
import { defaultGraphRepository } from '@/lib/graph/repositories/mock-graph.repository';
import { TEMPORAL_DEFAULT_SOURCE_TRUST, TEMPORAL_SOURCE_TRUST } from '@/lib/temporal/config';
import type {
  ParsedTemporalQuery,
  TemporalCandidate,
  TemporalDocument,
  TemporalScope,
  TemporalSubquery,
} from '@/lib/temporal/types';

export function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function tokenize(text: string): string[] {
  return normalize(text)
    .split(' ')
    .filter((t) => t.length >= 2);
}

export function parseDate(value: string): Date | null {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date;
}

export function iso(date: Date): string {
  return date.toISOString();
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) return (sorted[mid - 1] + sorted[mid]) / 2;
  return sorted[mid];
}

export function cosine(a: number[], b: number[]): number {
  if (!a.length || !b.length || a.length !== b.length) return 0;

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < a.length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) return 0;
  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
}

export function hashedVector(text: string, dims = TEMPORAL_RULES.vectorDimensions): number[] {
  const out = new Array<number>(dims).fill(0);
  const terms = tokenize(text);

  for (const term of terms) {
    let hash = 0;
    for (let i = 0; i < term.length; i += 1) {
      hash = ((hash << 5) - hash) + term.charCodeAt(i);
      hash |= 0;
    }

    const idx = Math.abs(hash) % dims;
    out[idx] += 1;
  }

  return out;
}

function detectIntent(normalized: string, scope: TemporalScope): ParsedTemporalQuery['intent'] {
  if (/сравн|compare|versus|vs\b/.test(normalized)) return 'compare';
  if (/расслед|почему|investigat|impact|последств/.test(normalized)) return 'investigate';
  if (scope === 'entity' || /кто|entity|персон|организац/.test(normalized)) return 'entity_focus';
  if (/монитор|динам|latest|последн|сейчас/.test(normalized)) return 'monitor';
  return 'unknown';
}

function deriveTimeRange(rawQuery: string, now: Date, fromHint?: string, toHint?: string): ParsedTemporalQuery['time'] {
  if (fromHint || toHint) {
    return {
      from: fromHint ?? null,
      to: toHint ?? null,
      preset: 'custom',
    };
  }

  const normalized = normalize(rawQuery);

  if (/последн(ие|яя)?\s+сутк|last\s+24\s*h|today|сегодня/.test(normalized)) {
    const from = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return { from: iso(from), to: iso(now), preset: '24h' };
  }

  if (/последн(ие|яя)?\s+7\s*д|за\s+недел|last\s+week/.test(normalized)) {
    const from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    return { from: iso(from), to: iso(now), preset: '7d' };
  }

  if (/последн(ие|яя)?\s+30\s*д|за\s+месяц|last\s+month/.test(normalized)) {
    const from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    return { from: iso(from), to: iso(now), preset: '30d' };
  }

  const intervalMatch = rawQuery.match(/(20\d{2}-\d{2}-\d{2}).{0,10}(20\d{2}-\d{2}-\d{2})/);
  if (intervalMatch?.[1] && intervalMatch?.[2]) {
    return { from: intervalMatch[1], to: intervalMatch[2], preset: 'custom' };
  }

  return { from: null, to: null, preset: 'all' };
}

function extractEntityAliases(query: string): string[] {
  const snapshot = defaultGraphRepository.getSnapshot();
  const q = normalize(query);
  if (!q) return [];

  const entities = new Set<string>();

  for (const entity of snapshot.entities) {
    if (!entity.aliases?.length) continue;
    for (const alias of entity.aliases) {
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias || normalizedAlias.length < 2) continue;
      if (q.includes(normalizedAlias)) {
        entities.add(entity.label);
      }
    }
  }

  return Array.from(entities);
}

export function parseTemporalQuery(input: {
  query: string;
  scope: TemporalScope;
  countries?: string[];
  narrativeId?: number;
  timeFrom?: string;
  timeTo?: string;
  now?: Date;
}): ParsedTemporalQuery {
  const now = input.now || new Date();
  const normalized = normalize(input.query);
  const terms = tokenize(input.query);
  const time = deriveTimeRange(input.query, now, input.timeFrom, input.timeTo);
  const entities = extractEntityAliases(input.query);

  return {
    raw: input.query,
    normalized,
    terms,
    intent: detectIntent(normalized, input.scope),
    scope: input.scope,
    entities,
    time,
    countries: (input.countries || []).map((c) => c.toUpperCase()),
    narrativeId: input.narrativeId,
  };
}

export function decomposeTemporalQuery(parsed: ParsedTemporalQuery): TemporalSubquery[] {
  if (!parsed.time.from || !parsed.time.to) {
    return [
      {
        id: 'all-time',
        label: 'Вся доступная история',
        from: null,
        to: null,
        boostedTerms: parsed.terms,
        weight: 1,
      },
    ];
  }

  const from = parseDate(parsed.time.from);
  const to = parseDate(parsed.time.to);
  if (!from || !to) {
    return [
      {
        id: 'fallback',
        label: 'Единый интервал',
        from: parsed.time.from,
        to: parsed.time.to,
        boostedTerms: parsed.terms,
        weight: 1,
      },
    ];
  }

  const totalDays = Math.max(1, Math.ceil((to.getTime() - from.getTime()) / (24 * 60 * 60 * 1000)));
  if (totalDays <= TEMPORAL_RULES.windows.shortRangeDays) {
    return [{
      id: 'short-window',
      label: 'Короткий период',
      from: iso(from),
      to: iso(to),
      boostedTerms: parsed.terms,
      weight: 1,
    }];
  }

  const recentFrom = new Date(to.getTime() - TEMPORAL_RULES.windows.recentSliceDays * 24 * 60 * 60 * 1000);
  const baselineTo = new Date(recentFrom.getTime() - 1);

  return [
    {
      id: 'recent',
      label: 'Свежие сигналы',
      from: iso(recentFrom > from ? recentFrom : from),
      to: iso(to),
      boostedTerms: [...parsed.terms, 'сейчас', 'новое'],
      weight: TEMPORAL_RULES.windows.recentWeight,
    },
    {
      id: 'baseline',
      label: 'Исторический фон',
      from: iso(from),
      to: iso(baselineTo > from ? baselineTo : from),
      boostedTerms: parsed.terms,
      weight: TEMPORAL_RULES.windows.baselineWeight,
    },
  ];
}

export function inRange(ts: string, from: string | null, to: string | null): boolean {
  const d = parseDate(ts);
  if (!d) return false;
  if (from) {
    const f = parseDate(from);
    if (f && d < f) return false;
  }
  if (to) {
    const t = parseDate(to);
    if (t && d > t) return false;
  }
  return true;
}

export function allowedByScope(doc: TemporalDocument, parsed: ParsedTemporalQuery): boolean {
  if (parsed.scope === 'country') {
    return parsed.countries.length === 0 || parsed.countries.includes(doc.countryCode.toUpperCase());
  }

  if (parsed.scope === 'narrative') {
    if (parsed.narrativeId && doc.narrativeId !== parsed.narrativeId) return false;
    if (parsed.countries.length > 0 && !parsed.countries.includes(doc.countryCode.toUpperCase())) return false;
    return true;
  }

  if (parsed.scope === 'entity') {
    if (parsed.countries.length > 0 && !parsed.countries.includes(doc.countryCode.toUpperCase())) return false;
    return true;
  }

  return false;
}

export function lexicalScore(doc: TemporalDocument, terms: string[]): number {
  if (!terms.length) return 0;
  const hay = normalize(`${doc.title} ${doc.source}`);
  let score = 0;

  for (const term of terms) {
    if (!hay.includes(term)) continue;
    score += term.length >= 6
      ? TEMPORAL_SCORING.lexical.longTermWeight
      : TEMPORAL_SCORING.lexical.shortTermWeight;
  }

  return Math.min(
    1,
    score / Math.max(
      TEMPORAL_SCORING.lexical.normalizationFloor,
      terms.length * TEMPORAL_SCORING.lexical.normalizationFactor,
    ),
  );
}

export function graphSignals(doc: TemporalDocument, parsed: ParsedTemporalQuery): { score: number; reasons: string[]; centrality: number } {
  const snapshot = defaultGraphRepository.getSnapshot();
  const text = normalize(doc.title);
  const reasons: string[] = [];
  let matchedEntities = 0;
  let centrality = 0;

  for (const entity of snapshot.entities) {
    if (!entity.aliases?.length) continue;

    const matched = entity.aliases.some((alias) => {
      const normalizedAlias = normalize(alias);
      return normalizedAlias.length >= 2 && text.includes(normalizedAlias);
    });

    if (!matched) continue;
    matchedEntities += 1;

    const degree = snapshot.edges.filter((e) => e.source === entity.id || e.target === entity.id).length;
    centrality += Math.min(1, degree / TEMPORAL_RULES.graph.centralityDegreeNormalization);

    if (parsed.entities.includes(entity.label)) {
      reasons.push(`Прямое упоминание сущности: ${entity.label}`);
    }
  }

  const score = Math.min(1, matchedEntities / TEMPORAL_RULES.graph.entityCoverageNormalization);
  return {
    score,
    reasons,
    centrality: matchedEntities ? Math.min(1, centrality / matchedEntities) : 0,
  };
}

export function temporalFreshness(doc: TemporalDocument, now: Date): number {
  const date = parseDate(doc.publishedAt);
  if (!date) return 0;
  const ageDays = Math.max(0, (now.getTime() - date.getTime()) / (24 * 60 * 60 * 1000));
  if (ageDays <= 1) return TEMPORAL_RULES.freshness.day1;
  if (ageDays <= 7) return TEMPORAL_RULES.freshness.week1;
  if (ageDays <= 30) return TEMPORAL_RULES.freshness.month1;
  return TEMPORAL_RULES.freshness.older;
}

export function sourceTrust(source: string): number {
  const key = normalize(source);
  return TEMPORAL_SOURCE_TRUST[key] ?? TEMPORAL_DEFAULT_SOURCE_TRUST;
}

export function rerank(candidates: TemporalCandidate[]): TemporalCandidate[] {
  if (!candidates.length) return candidates;

  const sentimentMedian = median(candidates.map((c) => c.sentiment));
  const sourceFrequency = new Map<string, number>();
  for (const c of candidates) {
    sourceFrequency.set(c.source, (sourceFrequency.get(c.source) || 0) + 1);
  }

  for (const c of candidates) {
    const sentimentDelta = Math.abs(c.sentiment - sentimentMedian);
    const consistencyBySentiment = Math.max(0, 1 - sentimentDelta);
    const frequency = sourceFrequency.get(c.source) || 1;
    const consistencyBySource = Math.min(1, frequency / 4);
    c.consistencyScore =
      (consistencyBySentiment * TEMPORAL_SCORING.consistencyWeights.sentiment)
      + (consistencyBySource * TEMPORAL_SCORING.consistencyWeights.sourceFrequency);

    c.rerankScore =
      (c.lexicalScore * TEMPORAL_SCORING.rerankWeights.lexical) +
      (c.vectorScore * TEMPORAL_SCORING.rerankWeights.vector) +
      (c.graphScore * TEMPORAL_SCORING.rerankWeights.graph) +
      (c.temporalScore * TEMPORAL_SCORING.rerankWeights.temporal) +
      (c.consistencyScore * TEMPORAL_SCORING.rerankWeights.consistency) +
      (c.centralityScore * TEMPORAL_SCORING.rerankWeights.centrality) +
      (c.trustScore * TEMPORAL_SCORING.rerankWeights.trust);
  }

  return candidates.sort((a, b) => {
    const byTime = +new Date(b.publishedAt) - +new Date(a.publishedAt);
    if (byTime !== 0) return byTime;
    return b.rerankScore - a.rerankScore;
  });
}

export function dedupe(candidates: TemporalCandidate[]): TemporalCandidate[] {
  const seen = new Set<string>();
  const out: TemporalCandidate[] = [];

  for (const c of candidates) {
    const key = normalize(`${c.title} ${c.source}`);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(c);
  }

  return out;
}

export function buildWhy(candidate: TemporalCandidate, parsed: ParsedTemporalQuery): string {
  const parts: string[] = [];

  if (candidate.lexicalScore >= TEMPORAL_SCORING.gates.lexicalWhy) {
    parts.push('Лексически совпадает с запросом');
  }
  if (candidate.vectorScore >= TEMPORAL_SCORING.gates.vectorWhy) {
    parts.push('Семантически близко к формулировке');
  }
  if (candidate.graphScore > 0) {
    parts.push('Поддержано графовыми связями');
  }
  if (parsed.time.preset !== 'all') {
    parts.push('Попадает в выбранный период');
  }

  parts.push(`Ранг ${candidate.rerankScore.toFixed(2)} (consistency ${candidate.consistencyScore.toFixed(2)}, centrality ${candidate.centralityScore.toFixed(2)}, trust ${candidate.trustScore.toFixed(2)})`);

  return parts.join(' · ');
}
