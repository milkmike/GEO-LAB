import { ARTICLES, NARRATIVES, getCountry, getEventsForNarrative } from '@/mock/data';
import { getNeighbors, getSubgraph, graphHealth } from '@/lib/graph/query';
import { temporalRetrieve, type TemporalDocument } from '@/lib/temporal/engine';
import type {
  AnalystScope,
  BriefResponse,
  CaseResponse,
  CountryWorkspaceResponse,
  EntityWorkspaceResponse,
  TriageResponse,
} from '@/lib/analyst/dto';
import {
  serializeArticleToTimelineSeed,
  serializeEntityTimelineItem,
  serializeNeighborEntity,
} from '@/lib/analyst/serializers';
import { loadCountryMap, type LiveCountry } from '@/lib/analyst/retrieval/geopulse.client';
import {
  GeoPulseCountryEventsRetriever,
  type RetrievedLiveEvent,
} from '@/lib/analyst/retrieval/live-country-events.retriever';
import {
  CountryTimelineReranker,
  NarrativeTimelineReranker,
} from '@/lib/analyst/retrieval/timeline.rerankers';

const liveEventsRetriever = new GeoPulseCountryEventsRetriever();
const countryTimelineReranker = new CountryTimelineReranker();
const narrativeTimelineReranker = new NarrativeTimelineReranker();

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

function toTimelineSeed(events: RetrievedLiveEvent[], idOffset: number) {
  return events.map((event, index) => ({
    articleId: idOffset + index,
    title: event.title,
    source: event.source,
    publishedAt: event.publishedAt,
    sentiment: event.sentiment,
  }));
}

function toTemporalDocs(events: RetrievedLiveEvent[], idOffset: number, narrativeId?: number): TemporalDocument[] {
  return events.map((event, index) => ({
    articleId: idOffset + index,
    title: event.title,
    source: event.source,
    publishedAt: event.publishedAt,
    sentiment: event.sentiment,
    countryCode: event.countryCode,
    narrativeId,
  }));
}

function validateScopeParams(scope: AnalystScope, params: TimelineScopeParams): string | null {
  if (scope === 'country') {
    if (!params.code) return 'code is required for country scope';
    if (params.narrativeId || params.entity) return 'country scope must not include narrativeId/entity';
  }

  if (scope === 'narrative') {
    if (!params.narrativeId) return 'narrativeId is required for narrative scope';
    if (params.code || params.entity) return 'narrative scope must not include code/entity';
  }

  if (scope === 'entity') {
    if (!params.entity) return 'entity is required for entity scope';
    if (params.code || params.narrativeId) return 'entity scope must not include code/narrativeId';
  }

  return null;
}

function confidenceToRelevance(confidence: number): number {
  return Math.max(1, Math.min(5, Math.round(confidence * 5)));
}

function confidenceExplainability(confidence: number, reason: string, evidence: string[]) {
  return {
    whyIncluded: reason,
    relevanceScore: confidenceToRelevance(confidence),
    confidence,
    evidence,
  };
}

export async function getTriageData(): Promise<TriageResponse> {
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

  return {
    escalations,
    newest,
    quality: graphHealth(),
    generatedAt: new Date().toISOString(),
  };
}

export async function getCountryWorkspace(countryCode: string): Promise<CountryWorkspaceResponse | null> {
  const code = countryCode.toUpperCase();
  const country = getCountry(code);
  if (!country) return null;

  const countryMap = await loadCountryMap(30);
  const liveCountry = countryMap.get(code);

  const liveEvents = await liveEventsRetriever.retrieve({
    countryCodes: [code],
    limit: 200,
    sort: 'date',
  });

  const baseTimeline = ARTICLES
    .filter((a) => a.countryId === code)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .map(serializeArticleToTimelineSeed);

  const timeline = countryTimelineReranker.rerank(
    [...toTimelineSeed(liveEvents, 700000), ...baseTimeline],
    { countryCode: code, limit: 200 },
  );

  return {
    timelineScope: 'country',
    country: {
      id: country.id,
      name: country.nameRu,
      flag: country.flag,
      temperature: liveCountry?.temperature ?? null,
      divergence: liveCountry?.divergence ?? 0,
      articleCount: liveCountry?.article_count ?? timeline.length,
      updatedAt: liveCountry?.last_updated ?? null,
    },
    timeline,
    generatedAt: new Date().toISOString(),
  };
}

export async function getEntityWorkspace(entity: string, countryCodes?: string[]): Promise<EntityWorkspaceResponse | null> {
  const cleanEntity = entity.trim();
  if (!cleanEntity) return null;

  const allowedCountries = (countryCodes || []).map((c) => c.trim().toUpperCase()).filter(Boolean);
  const countriesToScan = allowedCountries.length
    ? allowedCountries
    : Array.from(new Set(NARRATIVES.flatMap((n) => n.countries)));

  const liveEvents = await liveEventsRetriever.retrieve({
    countryCodes: countriesToScan,
    limit: 120,
    sort: 'date',
  });

  const liveDocs = toTemporalDocs(liveEvents, 980000);
  const mockDocs: TemporalDocument[] = ARTICLES
    .filter((article) => countriesToScan.includes(article.countryId))
    .map((article) => ({
      ...serializeArticleToTimelineSeed(article),
      countryCode: article.countryId,
      narrativeId: article.narrativeId,
    }));

  const retrieval = temporalRetrieve({
    query: cleanEntity,
    scope: 'entity',
    countries: countriesToScan,
    documents: [...liveDocs, ...mockDocs],
    limit: 120,
  });

  const sourceDocs = [...liveDocs, ...mockDocs];
  const timeline = retrieval.timeline.map((item) => {
    const source = sourceDocs.find((doc) => doc.articleId === item.articleId && doc.title === item.title);
    return serializeEntityTimelineItem(
      {
        articleId: item.articleId,
        title: item.title,
        source: item.source,
        publishedAt: item.publishedAt,
        sentiment: item.sentiment,
      },
      cleanEntity,
      item.relevanceScore,
      source?.countryCode || 'N/A',
    );
  });

  return {
    timelineScope: 'entity',
    entity: cleanEntity,
    countries: countriesToScan,
    timeline,
    generatedAt: new Date().toISOString(),
  };
}

export async function getCaseWorkspace(narrativeId: number): Promise<CaseResponse | null> {
  const narrative = NARRATIVES.find((n) => n.id === narrativeId);
  if (!narrative) return null;

  const countryMap = await loadCountryMap(30);
  const liveNarrative = narrativeWithLiveMetrics(narrative, countryMap);

  const timelineBase: TemporalDocument[] = ARTICLES
    .filter((a) => a.narrativeId === narrativeId)
    .sort((a, b) => +new Date(b.publishedAt) - +new Date(a.publishedAt))
    .slice(0, 60)
    .map((article) => ({
      ...serializeArticleToTimelineSeed(article),
      countryCode: article.countryId,
      narrativeId: article.narrativeId,
    }));

  const liveEvents = await liveEventsRetriever.retrieve({
    countryCodes: narrative.countries,
    limit: 120,
    sort: 'impact',
  });

  const liveDocs = toTemporalDocs(liveEvents, 900000, narrativeId);

  const retrieval = temporalRetrieve({
    query: `${narrative.titleRu} ${narrative.keywords.join(' ')}`,
    scope: 'narrative',
    countries: narrative.countries,
    narrativeId,
    documents: [...timelineBase, ...liveDocs],
    limit: 120,
  });

  const timeline = retrieval.timeline.length
    ? retrieval.timeline
    : narrativeTimelineReranker.rerank(
      [...timelineBase, ...liveDocs],
      { narrative: { title: narrative.titleRu, keywords: narrative.keywords }, limit: 120 },
    );

  const allNeighbors = getNeighbors(`narrative:${narrativeId}`).neighbors;
  const focusedNeighbors = allNeighbors.filter(
    (n) => n.node.id.startsWith('person:') || n.node.id.startsWith('org:') || n.node.id.startsWith('place:'),
  );

  const neighbors = (focusedNeighbors.length ? focusedNeighbors : allNeighbors)
    .slice(0, 30)
    .map(serializeNeighborEntity);

  const subgraph = getSubgraph(`narrative:${narrativeId}`, 2);
  const events = getEventsForNarrative(narrativeId).map((e) => ({
    id: e.id,
    title: e.title,
    date: e.date,
    impact: e.impact,
  }));

  const countries = narrative.countries
    .map((cid) => {
      const c = getCountry(cid);
      const live = countryMap.get(cid);
      if (!c) return null;

      const liveSuffix = live?.temperature !== null && live?.temperature !== undefined
        ? ` · индекс ${Math.round(live.temperature)}`
        : '';

      return { id: c.id, label: `${c.flag} ${c.nameRu}${liveSuffix}` };
    })
    .filter((item): item is { id: string; label: string } => Boolean(item));

  return {
    timelineScope: 'narrative',
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

type TimelineScopeParams = {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  entity?: string;
  countries?: string[];
};

type GraphScopeParams = {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  nodeId?: string;
  depth?: number;
};

type QueryScopeParams = TimelineScopeParams & {
  includeTimeline?: boolean;
  includeGraph?: boolean;
};

type ExplainScopeParams = TimelineScopeParams & {
  articleId?: number;
  nodeId?: string;
  relatedNodeId?: string;
};

export async function getTimelineByScope(params: TimelineScopeParams) {
  const validation = validateScopeParams(params.scope, params);
  if (validation) return { error: validation };

  if (params.scope === 'country') {
    const data = await getCountryWorkspace(String(params.code));
    return data ? { scope: 'country' as const, ...data } : { error: 'not found' };
  }

  if (params.scope === 'narrative') {
    const data = await getCaseWorkspace(Number(params.narrativeId));
    if (!data) return { error: 'not found' };

    return {
      scope: 'narrative' as const,
      timelineScope: data.timelineScope,
      narrative: data.narrative,
      countries: data.countries,
      timeline: data.timeline,
      generatedAt: new Date().toISOString(),
    };
  }

  const data = await getEntityWorkspace(String(params.entity), params.countries);
  return data ? { scope: 'entity' as const, ...data } : { error: 'not found' };
}

export async function getGraphByScope(params: GraphScopeParams) {
  const depth = Math.max(1, Math.min(3, Number(params.depth || 2)));

  let nodeId = params.nodeId?.trim();
  if (!nodeId) {
    if (params.scope === 'country') nodeId = `country:${String(params.code || '').toUpperCase()}`;
    if (params.scope === 'narrative') nodeId = `narrative:${String(params.narrativeId)}`;
  }

  if (!nodeId || nodeId.endsWith(':')) return { error: 'nodeId is required for this scope' };

  const neighbors = getNeighbors(nodeId).neighbors.map((n) => ({
    id: n.node.id,
    label: n.node.label,
    kind: n.node.kind,
    relation: n.relation,
    ...confidenceExplainability(
      n.confidence,
      `Связь обнаружена через отношение ${n.relation}`,
      n.evidence,
    ),
  }));

  return {
    scope: params.scope,
    nodeId,
    depth,
    neighbors,
    subgraph: getSubgraph(nodeId, depth),
    generatedAt: new Date().toISOString(),
  };
}

export async function runAnalystQuery(params: QueryScopeParams) {
  const validation = validateScopeParams(params.scope, params);
  if (validation) return { error: validation };

  const includeTimeline = params.includeTimeline !== false;
  const includeGraph = params.includeGraph !== false;

  const result: {
    scope: AnalystScope;
    timeline?: unknown;
    graph?: unknown;
    generatedAt: string;
  } = {
    scope: params.scope,
    generatedAt: new Date().toISOString(),
  };

  if (includeTimeline) {
    const timeline = await getTimelineByScope(params);
    if ('error' in timeline) return timeline;
    result.timeline = timeline;
  }

  if (includeGraph) {
    const graph = await getGraphByScope({
      scope: params.scope,
      code: params.code,
      narrativeId: params.narrativeId,
      nodeId: params.scope === 'entity' ? params.entity : undefined,
      depth: 2,
    });

    if ('error' in graph && params.scope !== 'entity') return graph;
    if (!('error' in graph)) result.graph = graph;
  }

  return result;
}

export async function explainAnalystItem(params: ExplainScopeParams) {
  const validation = validateScopeParams(params.scope, params);
  if (validation) return { error: validation };

  if (params.articleId) {
    const timelineData = await getTimelineByScope(params);
    if ('error' in timelineData) return timelineData;

    const timeline = (timelineData as { timeline: Array<{ articleId: number; whyIncluded: string; relevanceScore: number; confidence: number; evidence: string[] }> }).timeline || [];
    const found = timeline.find((item) => Number(item.articleId) === Number(params.articleId));
    if (!found) return { error: 'article not found in selected scope' };

    return {
      scope: params.scope,
      target: { kind: 'article', id: params.articleId },
      explanation: {
        whyIncluded: found.whyIncluded,
        relevanceScore: found.relevanceScore,
        confidence: found.confidence,
        evidence: found.evidence,
      },
      generatedAt: new Date().toISOString(),
    };
  }

  if (params.nodeId && params.relatedNodeId) {
    const neighbors = getNeighbors(params.nodeId).neighbors;
    const found = neighbors.find((n) => n.node.id === params.relatedNodeId);
    if (!found) return { error: 'relation not found' };

    return {
      scope: params.scope,
      target: { kind: 'relation', from: params.nodeId, to: params.relatedNodeId },
      explanation: confidenceExplainability(
        found.confidence,
        `Связь подтверждена типом ${found.relation}`,
        found.evidence,
      ),
      generatedAt: new Date().toISOString(),
    };
  }

  return { error: 'provide articleId or nodeId+relatedNodeId' };
}

export async function generateBrief(narrativeId: number): Promise<BriefResponse | null> {
  const ws = await getCaseWorkspace(narrativeId);
  if (!ws) return null;

  const topSources = Array.from(new Set(ws.timeline.map((t) => t.source))).slice(0, 4);
  const topEntities = ws.entities.slice(0, 4).map((e) => e.label);
  const negativeCount = ws.timeline.filter((t) => t.sentiment < -0.2).length;

  return {
    narrativeId,
    title: ws.narrative.title,
    bullets: [
      `Сюжет: ${ws.narrative.title} (${ws.narrative.status}), расхождение ${ws.narrative.divergence}%.`,
      `Покрытие: ${ws.narrative.articleCount} материалов; в рабочем таймлайне ${ws.timeline.length} последних публикаций.`,
      `География: ${ws.countries.map((c) => c.label).join(', ')}.`,
      `Ключевые сущности: ${topEntities.join(', ') || 'н/д'}.`,
      `Источники ядра: ${topSources.join(', ') || 'н/д'}.`,
      `Тональность: негативных публикаций ${negativeCount}/${ws.timeline.length}.`,
      `Граф-контекст: ${ws.graphStats.nodes} узлов и ${ws.graphStats.edges} связей в подграфе кейса.`,
    ],
    generatedAt: new Date().toISOString(),
  };
}
