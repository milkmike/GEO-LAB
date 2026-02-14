import { fetchJSON, type LiveCountryEventsResponse } from '@/lib/analyst/retrieval/geopulse.client';
import type { Retriever } from '@/lib/analyst/retrieval/strategies';
import { recordFreshnessMetric } from '@/lib/monitoring/metrics';

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
    const freshnessTimestamps: string[] = [];

    for (let idx = 0; idx < query.countryCodes.length; idx += 1) {
      const countryCode = query.countryCodes[idx];
      const countryEvents = payloads[idx]?.events || [];

      for (const event of countryEvents) {
        if (!event.title || !event.published_at) continue;
        freshnessTimestamps.push(event.published_at);

        events.push({
          title: event.title,
          source: event.source || 'Источник не указан',
          publishedAt: event.published_at,
          sentiment: event.sentiment ?? 0,
          countryCode,
        });
      }
    }

    recordFreshnessMetric({
      key: `geopulse.events.${query.sort}`,
      timestamps: freshnessTimestamps,
      staleAfterHours: 72,
    });

    return events;
  }
}
