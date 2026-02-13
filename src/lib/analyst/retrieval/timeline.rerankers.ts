import { ENTITY_SCORING } from '@/lib/analyst/config/scoring';
import { normalizeText } from '@/lib/analyst/text';
import { buildCountryTimeline, buildNarrativeTimeline, stanceFromSentiment, type NarrativeInput, type TimelineItem, type TimelineSeedItem } from '@/lib/timeline/engine';
import type { Reranker } from '@/lib/analyst/retrieval/strategies';
import type { RetrievedLiveEvent } from '@/lib/analyst/retrieval/live-country-events.retriever';

export class CountryTimelineReranker implements Reranker<TimelineSeedItem, { countryCode: string; limit: number }, TimelineItem> {
  rerank(items: TimelineSeedItem[], context: { countryCode: string; limit: number }): TimelineItem[] {
    return buildCountryTimeline(items, context.countryCode, context.limit);
  }
}

export class NarrativeTimelineReranker implements Reranker<TimelineSeedItem, { narrative: NarrativeInput; limit: number }, TimelineItem> {
  rerank(items: TimelineSeedItem[], context: { narrative: NarrativeInput; limit: number }): TimelineItem[] {
    return buildNarrativeTimeline(items, context.narrative, context.limit);
  }
}

type EntityTimelineItem = TimelineItem & { countryCode: string };

function matchesEntityTitle(title: string, entity: string): { matched: boolean; score: number } {
  const normalizedTitle = normalizeText(title);
  const terms = normalizeText(entity)
    .split(' ')
    .filter((t) => t.length >= ENTITY_SCORING.minTermLength);

  if (!normalizedTitle || terms.length === 0) return { matched: false, score: 0 };

  const matchedTerms = terms.filter((term) => normalizedTitle.includes(term));
  const score = matchedTerms.reduce(
    (acc, term) => acc + (term.length >= ENTITY_SCORING.longTermLength ? ENTITY_SCORING.longTermWeight : ENTITY_SCORING.shortTermWeight),
    0,
  );

  if (terms.length === 1) return { matched: score >= ENTITY_SCORING.singleTermThreshold, score };

  return {
    matched: matchedTerms.length >= ENTITY_SCORING.multiTermMatchedThreshold || score >= ENTITY_SCORING.multiTermScoreThreshold,
    score,
  };
}

export class EntityTimelineReranker implements Reranker<RetrievedLiveEvent, { entity: string; limit: number; idOffset: number }, EntityTimelineItem> {
  rerank(items: RetrievedLiveEvent[], context: { entity: string; limit: number; idOffset: number }): EntityTimelineItem[] {
    const filtered: EntityTimelineItem[] = [];

    for (const event of items) {
      const match = matchesEntityTitle(event.title, context.entity);
      if (!match.matched) continue;

      const relevanceScore = Math.max(1, Math.min(5, match.score));
      const confidence = Math.max(0.45, Math.min(0.97, 0.4 + relevanceScore * 0.11));

      filtered.push({
        articleId: context.idOffset + filtered.length,
        title: event.title,
        source: event.source,
        publishedAt: event.publishedAt,
        sentiment: event.sentiment,
        stance: stanceFromSentiment(event.sentiment),
        relevanceScore,
        whyIncluded: `Есть упоминание: ${context.entity}`,
        confidence,
        evidence: [`entity:${context.entity}`, `country:${event.countryCode}`],
        countryCode: event.countryCode,
      });
    }

    const deduped = new Map<string, EntityTimelineItem>();

    for (const item of filtered.sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))) {
      const key = normalizeText(`${item.title} ${item.source}`);
      if (!deduped.has(key)) deduped.set(key, item);
    }

    return Array.from(deduped.values()).slice(0, context.limit);
  }
}

export type { EntityTimelineItem };
