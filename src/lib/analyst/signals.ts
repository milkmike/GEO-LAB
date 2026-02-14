import type { AnalystScope, ExplainabilityFields, TimelineResponseItem } from '@/lib/analyst/dto';
import { getTimelineByScope } from '@/lib/analyst/service';
import { defaultGraphRepository } from '@/lib/graph/repositories/mock-graph.repository';

export type SignalWindowHours = 24 | 72;

type ScopeParams = {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  entity?: string;
  countries?: string[];
};

type SignalTimelineItem = TimelineResponseItem & { countryCode?: string };

type TrendDirection = 'escalating' | 'cooling' | 'stable';
type AlertSeverity = 'low' | 'medium' | 'high';

export interface TrustAssessment extends ExplainabilityFields {
  score: number;
  level: 'low' | 'medium' | 'high';
  rationale: string[];
  textFeatures: {
    sourceDiversity: number;
    evidenceDensity: number;
    confidenceConsistency: number;
  };
  graphFeatures: {
    entityCoverage: number;
    connectivity: number;
  };
}

export interface ForecastResponse {
  scope: AnalystScope;
  windowHours: SignalWindowHours;
  horizonHours: SignalWindowHours;
  baseline: {
    recentCount: number;
    baselineCount: number;
    recentSentiment: number;
    baselineSentiment: number;
  };
  forecast: ExplainabilityFields & {
    trend: TrendDirection;
    projectedVolume: number;
    sentimentDrift: number;
    rationale: string[];
    trust: TrustAssessment;
  };
  generatedAt: string;
}

export interface AlertSignal extends ExplainabilityFields {
  id: string;
  kind: 'spike' | 'new_cluster' | 'sentiment_shift' | 'novel_entity';
  severity: AlertSeverity;
  summary: string;
  metrics: Record<string, number | string | boolean>;
  trust: TrustAssessment;
  detectedAt: string;
}

export interface AlertsResponse {
  scope: AnalystScope;
  windowHours: SignalWindowHours;
  alerts: AlertSignal[];
  generatedAt: string;
}

export interface TrustResponse {
  scope: AnalystScope;
  windowHours: SignalWindowHours;
  trust: TrustAssessment;
  generatedAt: string;
}

export interface BriefingResponse {
  scope: AnalystScope;
  windowHours: SignalWindowHours;
  headline: string;
  bullets: string[];
  forecast: ForecastResponse['forecast'];
  alerts: AlertSignal[];
  trust: TrustAssessment;
  generatedAt: string;
}

function normalize(text: string): string {
  return text
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((acc, value) => acc + value, 0) / values.length;
}

function parseDate(input: string): Date | null {
  const value = new Date(input);
  if (Number.isNaN(value.getTime())) return null;
  return value;
}

function splitTimelineByWindow(timeline: SignalTimelineItem[], windowHours: SignalWindowHours): {
  recent: SignalTimelineItem[];
  baseline: SignalTimelineItem[];
} {
  const sorted = [...timeline].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const latest = sorted[0] ? parseDate(sorted[0].publishedAt) : new Date();
  const anchor = latest || new Date();

  const recentFrom = new Date(anchor.getTime() - (windowHours * 60 * 60 * 1000));
  const baselineFrom = new Date(recentFrom.getTime() - (windowHours * 60 * 60 * 1000));

  const recent = sorted.filter((item) => {
    const ts = parseDate(item.publishedAt);
    return Boolean(ts && ts >= recentFrom && ts <= anchor);
  });

  const baseline = sorted.filter((item) => {
    const ts = parseDate(item.publishedAt);
    return Boolean(ts && ts >= baselineFrom && ts < recentFrom);
  });

  return { recent, baseline };
}

function extractTerms(items: SignalTimelineItem[]): Map<string, number> {
  const stopWords = new Set(['это', 'как', 'при', 'или', 'для', 'после', 'между', 'about', 'with', 'that', 'from']);
  const result = new Map<string, number>();

  for (const item of items) {
    const terms = normalize(item.title)
      .split(' ')
      .filter((term) => term.length >= 5 && !stopWords.has(term));

    for (const term of terms) {
      result.set(term, (result.get(term) || 0) + 1);
    }
  }

  return result;
}

function getEntityDegrees() {
  const snapshot = defaultGraphRepository.getSnapshot();
  const degreeMap = new Map<string, number>();

  for (const edge of snapshot.edges) {
    degreeMap.set(edge.source, (degreeMap.get(edge.source) || 0) + 1);
    degreeMap.set(edge.target, (degreeMap.get(edge.target) || 0) + 1);
  }

  return { snapshot, degreeMap };
}

function detectEntities(items: SignalTimelineItem[]): Array<{ id: string; label: string; degree: number }> {
  const { snapshot, degreeMap } = getEntityDegrees();
  const entities = snapshot.entities.filter((entity) => entity.id.startsWith('person:') || entity.id.startsWith('org:') || entity.id.startsWith('place:'));

  const seen = new Map<string, { id: string; label: string; degree: number }>();

  for (const item of items) {
    const title = normalize(item.title);

    for (const entity of entities) {
      const hit = (entity.aliases || []).some((alias) => {
        const normalizedAlias = normalize(alias);
        return normalizedAlias.length >= 2 && title.includes(normalizedAlias);
      });

      if (!hit) continue;
      if (!seen.has(entity.id)) {
        seen.set(entity.id, {
          id: entity.id,
          label: entity.label,
          degree: degreeMap.get(entity.id) || 0,
        });
      }
    }
  }

  return Array.from(seen.values());
}

function levelFromScore(score: number): TrustAssessment['level'] {
  if (score >= 0.72) return 'high';
  if (score >= 0.5) return 'medium';
  return 'low';
}

function trustExplainability(score: number, rationale: string[], evidence: string[]): ExplainabilityFields {
  return {
    whyIncluded: rationale[0] || 'Сигнал рассчитан на основе текстовых и графовых признаков',
    relevanceScore: clamp(Math.round(score * 5), 1, 5),
    confidence: clamp(score, 0.3, 0.99),
    evidence,
  };
}

function buildTrustAssessment(items: SignalTimelineItem[], windowHours: SignalWindowHours): TrustAssessment {
  const sourceDiversity = items.length ? clamp(new Set(items.map((item) => normalize(item.source))).size / Math.max(3, items.length), 0, 1) : 0;
  const evidenceDensity = items.length
    ? clamp(mean(items.map((item) => Math.min(1, (item.evidence?.length || 0) / 3))), 0, 1)
    : 0;

  const confidenceConsistency = items.length
    ? clamp(1 - mean(items.map((item) => Math.abs((item.confidence || 0.5) - 0.65))), 0, 1)
    : 0;

  const entities = detectEntities(items);
  const entityCoverage = items.length ? clamp(entities.length / Math.max(3, items.length / 2), 0, 1) : 0;
  const connectivity = entities.length ? clamp(mean(entities.map((entity) => Math.min(1, entity.degree / 8))), 0, 1) : 0;

  const score = clamp(
    (sourceDiversity * 0.24)
    + (evidenceDensity * 0.16)
    + (confidenceConsistency * 0.22)
    + (entityCoverage * 0.2)
    + (connectivity * 0.18),
    0.25,
    0.96,
  );

  const rationale: string[] = [];
  if (sourceDiversity >= 0.55) rationale.push('Есть разнообразие источников, риск эхо-камеры ниже');
  else rationale.push('Источник(и) однотипные, нужен ручной cross-check');

  if (entityCoverage >= 0.4) rationale.push('В тексте есть опора на сущности из графа');
  else rationale.push('Мало графовых сущностей — контекст может быть неполным');

  if (confidenceConsistency >= 0.6) rationale.push('Уверенность элементов стабильна по окну наблюдения');
  else rationale.push('Уверенность сильно колеблется между публикациями');

  const evidence = [
    `window:${windowHours}h`,
    `sources:${new Set(items.map((item) => normalize(item.source))).size}`,
    `entities:${entities.length}`,
  ];

  return {
    ...trustExplainability(score, rationale, evidence),
    score,
    level: levelFromScore(score),
    rationale,
    textFeatures: {
      sourceDiversity,
      evidenceDensity,
      confidenceConsistency,
    },
    graphFeatures: {
      entityCoverage,
      connectivity,
    },
  };
}

async function resolveTimeline(params: ScopeParams): Promise<{ scope: AnalystScope; timeline: SignalTimelineItem[] } | { error: string }> {
  const timelineData = await getTimelineByScope(params);
  if ('error' in timelineData) return timelineData;

  const timeline = ((timelineData as { timeline?: SignalTimelineItem[] }).timeline || []);
  return {
    scope: params.scope,
    timeline,
  };
}

function scoreToConfidence(score: number): number {
  return clamp(score, 0.35, 0.97);
}

export async function buildForecast(params: ScopeParams & { windowHours: SignalWindowHours; horizonHours?: SignalWindowHours }): Promise<ForecastResponse | { error: string }> {
  const resolved = await resolveTimeline(params);
  if ('error' in resolved) return resolved;

  const { recent, baseline } = splitTimelineByWindow(resolved.timeline, params.windowHours);
  const trust = buildTrustAssessment(recent, params.windowHours);

  const recentCount = recent.length;
  const baselineCount = baseline.length;
  const recentSentiment = mean(recent.map((item) => item.sentiment));
  const baselineSentiment = mean(baseline.map((item) => item.sentiment));

  const volumeRatio = (recentCount + 1) / (baselineCount + 1);
  const sentimentDrift = recentSentiment - baselineSentiment;

  let trend: TrendDirection = 'stable';
  if (volumeRatio >= 1.4 || sentimentDrift >= 0.22) trend = 'escalating';
  if (volumeRatio <= 0.75 && sentimentDrift <= -0.2) trend = 'cooling';

  const projectedVolume = Math.max(1, Math.round(recentCount * (trend === 'escalating' ? 1.25 : trend === 'cooling' ? 0.8 : 1)));

  const rationale = [
    `Окно ${params.windowHours}ч: ${recentCount} материалов против ${baselineCount} в предыдущем окне`,
    `Сдвиг тональности: ${sentimentDrift.toFixed(2)} (от ${baselineSentiment.toFixed(2)} к ${recentSentiment.toFixed(2)})`,
    `Trust-оценка выборки: ${trust.score.toFixed(2)} (${trust.level})`,
  ];

  const confidence = scoreToConfidence(clamp((0.45 + Math.min(0.25, recentCount / 30) + trust.score * 0.3), 0, 1));

  return {
    scope: params.scope,
    windowHours: params.windowHours,
    horizonHours: params.horizonHours || params.windowHours,
    baseline: {
      recentCount,
      baselineCount,
      recentSentiment,
      baselineSentiment,
    },
    forecast: {
      ...trustExplainability(confidence, rationale, [`trend:${trend}`, `volumeRatio:${volumeRatio.toFixed(2)}`]),
      trend,
      projectedVolume,
      sentimentDrift,
      rationale,
      trust,
    },
    generatedAt: new Date().toISOString(),
  };
}

function severityFromMagnitude(magnitude: number): AlertSeverity {
  if (magnitude >= 0.75) return 'high';
  if (magnitude >= 0.45) return 'medium';
  return 'low';
}

function createAlert(params: {
  id: string;
  kind: AlertSignal['kind'];
  summary: string;
  magnitude: number;
  evidence: string[];
  metrics: Record<string, number | string | boolean>;
  trust: TrustAssessment;
}): AlertSignal {
  const severity = severityFromMagnitude(params.magnitude);
  const confidence = scoreToConfidence(clamp((params.magnitude * 0.6) + (params.trust.score * 0.4), 0, 1));

  return {
    id: params.id,
    kind: params.kind,
    severity,
    summary: params.summary,
    metrics: params.metrics,
    trust: params.trust,
    detectedAt: new Date().toISOString(),
    whyIncluded: params.summary,
    relevanceScore: clamp(Math.round(params.magnitude * 5), 1, 5),
    confidence,
    evidence: params.evidence,
  };
}

export async function buildAlerts(params: ScopeParams & { windowHours: SignalWindowHours }): Promise<AlertsResponse | { error: string }> {
  const resolved = await resolveTimeline(params);
  if ('error' in resolved) return resolved;

  const { recent, baseline } = splitTimelineByWindow(resolved.timeline, params.windowHours);
  const trust = buildTrustAssessment(recent, params.windowHours);
  const alerts: AlertSignal[] = [];

  const volumeRatio = (recent.length + 1) / (baseline.length + 1);
  if (recent.length >= 4 && volumeRatio >= 1.7) {
    alerts.push(createAlert({
      id: `spike:${params.scope}`,
      kind: 'spike',
      summary: `Обнаружен всплеск публикаций: x${volumeRatio.toFixed(2)} к предыдущему окну`,
      magnitude: clamp((volumeRatio - 1) / 2, 0, 1),
      evidence: [`recent:${recent.length}`, `baseline:${baseline.length}`, `ratio:${volumeRatio.toFixed(2)}`],
      metrics: { recentCount: recent.length, baselineCount: baseline.length, ratio: Number(volumeRatio.toFixed(2)) },
      trust,
    }));
  }

  const baselineTerms = extractTerms(baseline);
  const recentTerms = extractTerms(recent);
  const newClusters = Array.from(recentTerms.entries())
    .filter(([term, count]) => count >= 2 && !baselineTerms.has(term))
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  if (newClusters.length) {
    alerts.push(createAlert({
      id: `cluster:${params.scope}`,
      kind: 'new_cluster',
      summary: `Появились новые кластеры: ${newClusters.map(([term]) => term).join(', ')}`,
      magnitude: clamp(newClusters.length / 3, 0, 1),
      evidence: newClusters.map(([term, count]) => `cluster:${term}:${count}`),
      metrics: {
        clusters: newClusters.length,
        topCluster: newClusters[0]?.[0] || 'n/a',
      },
      trust,
    }));
  }

  const recentSentiment = mean(recent.map((item) => item.sentiment));
  const baselineSentiment = mean(baseline.map((item) => item.sentiment));
  const sentimentShift = recentSentiment - baselineSentiment;

  if (Math.abs(sentimentShift) >= 0.28 && recent.length >= 3) {
    alerts.push(createAlert({
      id: `sentiment:${params.scope}`,
      kind: 'sentiment_shift',
      summary: `Сдвиг тональности ${sentimentShift > 0 ? 'в плюс' : 'в минус'}: ${sentimentShift.toFixed(2)}`,
      magnitude: clamp(Math.abs(sentimentShift), 0, 1),
      evidence: [
        `recentSentiment:${recentSentiment.toFixed(2)}`,
        `baselineSentiment:${baselineSentiment.toFixed(2)}`,
      ],
      metrics: {
        recentSentiment: Number(recentSentiment.toFixed(3)),
        baselineSentiment: Number(baselineSentiment.toFixed(3)),
        delta: Number(sentimentShift.toFixed(3)),
      },
      trust,
    }));
  }

  const recentEntities = detectEntities(recent);
  const baselineEntities = new Set(detectEntities(baseline).map((entity) => entity.id));
  const novelEntities = recentEntities.filter((entity) => !baselineEntities.has(entity.id)).slice(0, 4);

  if (novelEntities.length) {
    alerts.push(createAlert({
      id: `entity:${params.scope}`,
      kind: 'novel_entity',
      summary: `Новые сущности в контуре: ${novelEntities.map((entity) => entity.label).join(', ')}`,
      magnitude: clamp(novelEntities.length / 4, 0, 1),
      evidence: novelEntities.map((entity) => `entity:${entity.id}`),
      metrics: {
        novelEntities: novelEntities.length,
        firstEntity: novelEntities[0]?.label || 'n/a',
      },
      trust,
    }));
  }

  return {
    scope: params.scope,
    windowHours: params.windowHours,
    alerts: alerts.sort((a, b) => b.confidence - a.confidence),
    generatedAt: new Date().toISOString(),
  };
}

export async function buildTrust(params: ScopeParams & { windowHours: SignalWindowHours }): Promise<TrustResponse | { error: string }> {
  const resolved = await resolveTimeline(params);
  if ('error' in resolved) return resolved;

  const { recent } = splitTimelineByWindow(resolved.timeline, params.windowHours);
  const trust = buildTrustAssessment(recent, params.windowHours);

  return {
    scope: params.scope,
    windowHours: params.windowHours,
    trust,
    generatedAt: new Date().toISOString(),
  };
}

export async function buildBriefing(params: ScopeParams & { windowHours: SignalWindowHours }): Promise<BriefingResponse | { error: string }> {
  const [forecast, alerts, trust] = await Promise.all([
    buildForecast({ ...params, horizonHours: params.windowHours }),
    buildAlerts(params),
    buildTrust(params),
  ]);

  if ('error' in forecast) return forecast;
  if ('error' in alerts) return alerts;
  if ('error' in trust) return trust;

  const topAlert = alerts.alerts[0];
  const headline = topAlert
    ? `${topAlert.severity.toUpperCase()} alert: ${topAlert.summary}`
    : `Сигналы стабильны: тренд ${forecast.forecast.trend}`;

  const bullets = [
    `Прогноз (${params.windowHours}ч): тренд ${forecast.forecast.trend}, ожидаемый объём ${forecast.forecast.projectedVolume}.`,
    `Тональность: дрейф ${forecast.forecast.sentimentDrift.toFixed(2)} относительно прошлого окна.`,
    `Alerts: ${alerts.alerts.length ? alerts.alerts.map((item) => `${item.kind}:${item.severity}`).join(', ') : 'критичных срабатываний нет'}.`,
    `Trust: ${trust.trust.score.toFixed(2)} (${trust.trust.level}); ключевой фактор — ${trust.trust.rationale[0] || 'mixed signals'}.`,
  ];

  return {
    scope: params.scope,
    windowHours: params.windowHours,
    headline,
    bullets,
    forecast: forecast.forecast,
    alerts: alerts.alerts,
    trust: trust.trust,
    generatedAt: new Date().toISOString(),
  };
}
