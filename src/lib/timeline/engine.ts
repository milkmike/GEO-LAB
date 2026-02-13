import { NARRATIVE_SCORING, STANCE_THRESHOLDS } from '@/lib/analyst/config/scoring';
import { normalizeText } from '@/lib/analyst/text';

export type TimelineSeedItem = {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
};

export type NarrativeInput = {
  title: string;
  keywords: string[];
};

export type TimelineItem = {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
  stance: string;
  relevanceScore: number;
  whyIncluded: string;
  confidence: number;
  evidence: string[];
};

export function stanceFromSentiment(sentiment: number): string {
  if (sentiment > STANCE_THRESHOLDS.proRussia) return 'pro_russia';
  if (sentiment < STANCE_THRESHOLDS.antiRussia) return 'anti_russia';
  return 'neutral';
}

function dedupeAndSort(items: TimelineItem[]): TimelineItem[] {
  const sorted = [...items].sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt));
  const seen = new Set<string>();
  const result: TimelineItem[] = [];

  for (const item of sorted) {
    const key = normalizeText(`${item.title} ${item.source}`);
    if (seen.has(key)) continue;
    seen.add(key);
    result.push(item);
  }

  return result;
}

export function buildCountryTimeline(items: TimelineSeedItem[], countryCode: string, limit = 200): TimelineItem[] {
  const hydrated: TimelineItem[] = items.map((item) => ({
    ...item,
    stance: stanceFromSentiment(item.sentiment),
    relevanceScore: 1,
    whyIncluded: `Материал страны ${countryCode}`,
    confidence: 0.6,
    evidence: [`country:${countryCode}`],
  }));

  return dedupeAndSort(hydrated).slice(0, limit);
}

function buildNarrativeTerms(narrative: NarrativeInput): string[] {
  return Array.from(new Set(
    (narrative.keywords || [])
      .flatMap((k) => normalizeText(k).split(' '))
      .filter((term) => term.length >= 2),
  ));
}

function narrativeScore(title: string, terms: string[]): number {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle || terms.length === 0) return 0;

  let score = 0;
  const broadTerms = new Set<string>(NARRATIVE_SCORING.broadTerms as readonly string[]);

  for (const term of terms) {
    if (!normalizedTitle.includes(term)) continue;
    if (/[a-z]/i.test(term)) {
      score += NARRATIVE_SCORING.latinTermWeight;
      continue;
    }
    if (term.length >= 6 && !broadTerms.has(term)) {
      score += NARRATIVE_SCORING.longSpecificTermWeight;
      continue;
    }
    score += NARRATIVE_SCORING.defaultTermWeight;
  }

  return score;
}

export function buildNarrativeTimeline(
  items: TimelineSeedItem[],
  narrative: NarrativeInput,
  limit = 80,
): TimelineItem[] {
  const terms = buildNarrativeTerms(narrative);

  const scored = items.map((item) => {
    const score = narrativeScore(item.title, terms);
    const reason = score >= NARRATIVE_SCORING.strongMatchThreshold
      ? `Относится к сюжету: ${narrative.title}`
      : `Слабо связано с сюжетом: ${narrative.title}`;

    return {
      ...item,
      stance: stanceFromSentiment(item.sentiment),
      relevanceScore: score,
      whyIncluded: reason,
      confidence: Math.max(0.4, Math.min(0.95, 0.35 + score * 0.12)),
      evidence: [`narrative:${narrative.title}`],
    };
  });

  const strong = scored.filter((item) => item.relevanceScore >= NARRATIVE_SCORING.strongMatchThreshold);
  const fallback = scored
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, NARRATIVE_SCORING.fallbackLimit);

  const base = strong.length >= NARRATIVE_SCORING.minimumStrongItems ? strong : [...strong, ...fallback];
  return dedupeAndSort(base).slice(0, limit);
}
