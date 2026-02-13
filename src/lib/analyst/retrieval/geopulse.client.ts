const GEOPULSE_BASE = process.env.GEOPULSE_API_BASE_URL || 'https://massaraksh.tech';

export type LiveCountry = {
  code: string;
  divergence: number;
  article_count: number;
  last_updated: string | null;
  temperature: number | null;
};

export type LiveCountriesResponse = {
  countries: LiveCountry[];
};

export type LiveCountryEvent = {
  title: string;
  published_at: string | null;
  sentiment: number | null;
  source: string;
  action_level: number;
};

export type LiveCountryEventsResponse = {
  events: LiveCountryEvent[];
};

export async function fetchJSON<T>(path: string): Promise<T | null> {
  const url = `${GEOPULSE_BASE}${path}`;

  try {
    const response = await fetch(url, {
      cache: 'no-store',
      signal: AbortSignal.timeout(7000),
      headers: {
        Accept: 'application/json',
      },
    });

    if (!response.ok) return null;
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

export async function loadCountryMap(days = 14): Promise<Map<string, LiveCountry>> {
  const payload = await fetchJSON<LiveCountriesResponse>(`/api/v1/countries?days=${days}`);
  const map = new Map<string, LiveCountry>();

  if (!payload?.countries?.length) return map;

  for (const c of payload.countries) {
    map.set(c.code, c);
  }

  return map;
}
