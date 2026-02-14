import {
  buildCountryTimeline,
  buildNarrativeTimeline,
  type NarrativeInput,
  type TimelineItem,
  type TimelineSeedItem,
} from '@/lib/timeline/engine';
import type { Reranker } from '@/lib/analyst/retrieval/strategies';

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
