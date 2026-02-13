import { fetchJSON, type LiveCountryEventsResponse } from '@/lib/analyst/retrieval/geopulse.client';
import type { Retriever } from '@/lib/analyst/retrieval/strategies';

export type RetrievedLiveEvent = {
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
  countryCode: string;
};

export type LiveEventsQuery = {
  countryCodes: string[];
  limit: number;
  sort: 'date' | 'impact';
};

export class GeoPulseCountryEventsRetriever implements Retriever<LiveEventsQuery, RetrievedLiveEvent> {
  async retrieve(query: LiveEventsQuery): Promise<RetrievedLiveEvent[]> {
    const payloads = await Promise.all(
      query.countryCodes.map((code) => fetchJSON<LiveCountryEventsResponse>(`/api/v1/countries/${code}/events?limit=${query.limit}&sort=${query.sort}`)),
    );

    const events: RetrievedLiveEvent[] = [];

    for (let idx = 0; idx < query.countryCodes.length; idx += 1) {
      const countryCode = query.countryCodes[idx];
      const countryEvents = payloads[idx]?.events || [];

      for (const event of countryEvents) {
        if (!event.title || !event.published_at) continue;

        events.push({
          title: event.title,
          source: event.source || 'Источник не указан',
          publishedAt: event.published_at,
          sentiment: event.sentiment ?? 0,
          countryCode,
        });
      }
    }

    return events;
  }
}
