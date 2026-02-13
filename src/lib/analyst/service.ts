import { ARTICLES, NARRATIVES, getCountry, getEventsForNarrative } from '@/mock/data';
import { getNeighbors, getSubgraph, graphHealth } from '@/lib/graph/query';

export function getTriageData() {
  const escalations = [...NARRATIVES]
    .sort((a, b) => b.divergenceScore - a.divergenceScore)
    .slice(0, 4)
    .map((n) => ({
      narrativeId: n.id,
      title: n.titleRu,
      divergence: n.divergenceScore,
      status: n.status,
      countries: n.countries,
    }));

  const newest = [...NARRATIVES]
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

export function getCaseWorkspace(narrativeId: number) {
  const narrative = NARRATIVES.find((n) => n.id === narrativeId);
  if (!narrative) return null;

  const timeline = ARTICLES
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
    return c ? { id: c.id, label: `${c.flag} ${c.nameRu}` } : null;
  }).filter(Boolean);

  return {
    narrative: {
      id: narrative.id,
      title: narrative.titleRu,
      status: narrative.status,
      divergence: narrative.divergenceScore,
      articleCount: narrative.articleCount,
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

export function generateBrief(narrativeId: number) {
  const ws = getCaseWorkspace(narrativeId);
  if (!ws) return null;

  const topSources = Array.from(new Set(ws.timeline.map((t) => t.source))).slice(0, 4);
  const topEntities = ws.entities.slice(0, 4).map((e) => e.label);
  const negativeCount = ws.timeline.filter((t) => t.sentiment < -0.2).length;

  const bullets = [
    `Сюжет: ${ws.narrative.title} (${ws.narrative.status}), расхождение ${ws.narrative.divergence}%.`,
    `Покрытие: ${ws.narrative.articleCount} материалов; в рабочем таймлайне ${ws.timeline.length} последних публикаций.`,
    `География: ${(ws.countries as Array<{label:string}>).map((c) => c.label).join(', ')}.`,
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
