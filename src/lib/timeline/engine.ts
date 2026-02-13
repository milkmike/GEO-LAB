type TimelineSeedItem = {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
};

type NarrativeInput = {
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
};

function normalizeText(value: string): string {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function stanceFromSentiment(sentiment: number): string {
  if (sentiment > 0.2) return 'pro_russia';
  if (sentiment < -0.2) return 'anti_russia';
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
  const broadTerms = new Set(['газ', 'транзит']);

  for (const term of terms) {
    if (!normalizedTitle.includes(term)) continue;
    if (/[a-z]/i.test(term)) {
      score += 3;
      continue;
    }
    if (term.length >= 6 && !broadTerms.has(term)) {
      score += 2;
      continue;
    }
    score += 1;
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
    const reason = score >= 2
      ? `Относится к сюжету: ${narrative.title}`
      : `Слабо связано с сюжетом: ${narrative.title}`;

    return {
      ...item,
      stance: stanceFromSentiment(item.sentiment),
      relevanceScore: score,
      whyIncluded: reason,
    };
  });

  const strong = scored.filter((item) => item.relevanceScore >= 2);
  const fallback = scored
    .filter((item) => item.relevanceScore > 0)
    .sort((a, b) => b.relevanceScore - a.relevanceScore)
    .slice(0, 20);

  const base = strong.length >= 8 ? strong : [...strong, ...fallback];
  return dedupeAndSort(base).slice(0, limit);
}
