import { ARTICLES, NARRATIVES, getCountry, getEventsForNarrative } from '@/mock/data';
import { getNeighbors, getSubgraph, graphHealth } from '@/lib/graph/query';

const GEOPULSE_BASE = process.env.GEOPULSE_API_BASE_URL || 'https://massaraksh.tech';

type LiveCountry = {
  code: string;
  divergence: number;
  article_count: number;
  last_updated: string | null;
  temperature: number | null;
};

type LiveCountriesResponse = {
  countries: LiveCountry[];
};

type LiveCountryEvent = {
  title: string;
  published_at: string | null;
  sentiment: number | null;
  source: string;
  action_level: number;
};

type LiveCountryEventsResponse = {
  events: LiveCountryEvent[];
};

function stanceFromSentiment(sentiment: number): string {
  if (sentiment > 0.2) return 'pro_russia';
  if (sentiment < -0.2) return 'anti_russia';
  return 'neutral';
}

async function fetchJSON<T>(path: string): Promise<T | null> {
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

async function loadCountryMap(days = 14): Promise<Map<string, LiveCountry>> {
  const payload = await fetchJSON<LiveCountriesResponse>(`/api/v1/countries?days=${days}`);
  const map = new Map<string, LiveCountry>();

  if (!payload?.countries?.length) return map;

  for (const c of payload.countries) {
    map.set(c.code, c);
  }

  return map;
}

function narrativeWithLiveMetrics(narrative: (typeof NARRATIVES)[number], countryMap: Map<string, LiveCountry>) {
  const liveCountries = narrative.countries
    .map((code) => countryMap.get(code))
    .filter((x): x is LiveCountry => Boolean(x));

  const divergence = liveCountries.length
    ? Math.round(liveCountries.reduce((acc, c) => acc + Number(c.divergence || 0), 0) / liveCountries.length)
    : narrative.divergenceScore;

  const articleCount = liveCountries.length
    ? liveCountries.reduce((acc, c) => acc + Number(c.article_count || 0), 0)
    : narrative.articleCount;

  const lastSeen = liveCountries
    .map((c) => c.last_updated)
    .filter((x): x is string => Boolean(x))
    .sort((a, b) => +new Date(b) - +new Date(a))[0] || narrative.lastSeen;

  return {
    ...narrative,
    divergenceScore: divergence,
    articleCount,
    lastSeen,
  };
}

export async function getTriageData() {
  const countryMap = await loadCountryMap(14);
  const narratives = NARRATIVES.map((n) => narrativeWithLiveMetrics(n, countryMap));

  const escalations = [...narratives]
    .sort((a, b) => b.divergenceScore - a.divergenceScore)
    .slice(0, 4)
    .map((n) => ({
      narrativeId: n.id,
      title: n.titleRu,
      divergence: n.divergenceScore,
      status: n.status,
      countries: n.countries,
    }));

  const newest = [...narratives]
    .sort((a, b) => +new Date(b.lastSeen) - +new Date(a.lastSeen))
    .slice(0, 4)
    .map((n) => ({
      narrativeId: n.id,
      title: n.titleRu,
      lastSeen: n.lastSeen,
      articleCount: n.articleCount,
    }));

  const quality = graphHealth();

  return {
    escalations,
    newest,
    quality,
    generatedAt: new Date().toISOString(),
  };
}

function mergeTimelineWithLive(
  baseTimeline: Array<{
    articleId: number;
    title: string;
    source: string;
    publishedAt: string;
    sentiment: number;
    stance: string;
  }>,
  liveEvents: LiveCountryEvent[],
) {
  if (!liveEvents.length) return baseTimeline;

  const sortedLive = [...liveEvents]
    .filter((e) => Boolean(e.title) && Boolean(e.published_at))
    .sort((a, b) => +new Date(b.published_at || 0) - +new Date(a.published_at || 0));

  return baseTimeline.map((item, index) => {
    const live = sortedLive[index];
    if (!live) return item;

    const sentiment = live.sentiment ?? item.sentiment;
    return {
      ...item,
      title: live.title || item.title,
      source: live.source || item.source,
      publishedAt: live.published_at || item.publishedAt,
      sentiment,
      stance: stanceFromSentiment(sentiment),
    };
  });
}

export async function getCaseWorkspace(narrativeId: number) {
  const narrative = NARRATIVES.find((n) => n.id === narrativeId);
  if (!narrative) return null;

  const countryMap = await loadCountryMap(30);
  const liveNarrative = narrativeWithLiveMetrics(narrative, countryMap);

  const timelineBase = ARTICLES
    .filter((a) => a.narrativeId === narrativeId)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 20)
    .map((a) => ({
      articleId: a.id,
      title: a.title,
      source: a.source,
      publishedAt: a.publishedAt,
      sentiment: a.sentiment,
      stance: a.stance,
    }));

  const eventPayloads = await Promise.all(
    narrative.countries.map((code) => fetchJSON<LiveCountryEventsResponse>(`/api/v1/countries/${code}/events?limit=25&sort=impact`)),
  );

  const liveEvents = eventPayloads.flatMap((payload) => payload?.events || []);
  const timeline = mergeTimelineWithLive(timelineBase, liveEvents);

  const neighbors = getNeighbors(`narrative:${narrativeId}`).neighbors
    .filter((n) => n.node.id.startsWith('person:') || n.node.id.startsWith('org:') || n.node.id.startsWith('place:'))
    .slice(0, 12)
    .map((n) => ({
      id: n.node.id,
      label: n.node.label,
      kind: n.node.kind,
      relation: n.relation,
      confidence: n.confidence,
      evidence: n.evidence,
    }));

  const subgraph = getSubgraph(`narrative:${narrativeId}`, 2);
  const events = getEventsForNarrative(narrativeId).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    impact: e.impact,
  }));

  const countries = narrative.countries.map((cid) => {
    const c = getCountry(cid);
    const live = countryMap.get(cid);
    if (!c) return null;

    const liveSuffix = live?.temperature !== null && live?.temperature !== undefined
      ? ` · индекс ${Math.round(live.temperature)}`
      : '';

    return { id: c.id, label: `${c.flag} ${c.nameRu}${liveSuffix}` };
  }).filter(Boolean);

  return {
    narrative: {
      id: narrative.id,
      title: narrative.titleRu,
      status: narrative.status,
      divergence: liveNarrative.divergenceScore,
      articleCount: liveNarrative.articleCount,
      keywords: narrative.keywords,
    },
    countries,
    timeline,
    entities: neighbors,
    events,
    graphStats: {
      nodes: subgraph.nodes.length,
      edges: subgraph.edges.length,
    },
  };
}

export async function generateBrief(narrativeId: number) {
  const ws = await getCaseWorkspace(narrativeId);
  if (!ws) return null;

  const topSources = Array.from(new Set(ws.timeline.map((t) => t.source))).slice(0, 4);
  const topEntities = ws.entities.slice(0, 4).map((e) => e.label);
  const negativeCount = ws.timeline.filter((t) => t.sentiment < -0.2).length;

  const bullets = [
    `Сюжет: ${ws.narrative.title} (${ws.narrative.status}), расхождение ${ws.narrative.divergence}%.`,
    `Покрытие: ${ws.narrative.articleCount} материалов; в рабочем таймлайне ${ws.timeline.length} последних публикаций.`,
    `География: ${(ws.countries as Array<{ label: string }>).map((c) => c.label).join(', ')}.`,
    `Ключевые сущности: ${topEntities.join(', ') || 'н/д'}.`,
    `Источники ядра: ${topSources.join(', ') || 'н/д'}.`,
    `Тональность: негативных публикаций ${negativeCount}/${ws.timeline.length}.`,
    `Граф-контекст: ${ws.graphStats.nodes} узлов и ${ws.graphStats.edges} связей в подграфе кейса.`,
  ];

  return {
    narrativeId,
    title: ws.narrative.title,
    bullets,
    generatedAt: new Date().toISOString(),
  };
}
