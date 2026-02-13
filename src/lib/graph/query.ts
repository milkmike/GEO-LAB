import { buildGraphSnapshot } from './catalog';
import type { GraphEdge, GraphEntity, NeighborsResponse, SubgraphResponse } from './types';

function byId(nodes: GraphEntity[]): Map<string, GraphEntity> {
  return new Map(nodes.map(n => [n.id, n]));
}

export function getNeighbors(nodeId: string): NeighborsResponse {
  const graph = buildGraphSnapshot();
  const nodeMap = byId(graph.entities);

  const neighbors = graph.edges
    .filter(e => e.source === nodeId || e.target === nodeId)
    .map(e => {
      const otherId = e.source === nodeId ? e.target : e.source;
      const node = nodeMap.get(otherId);
      return node
        ? {
            relation: e.relation,
            node,
            confidence: e.confidence,
            evidence: e.evidence,
          }
        : null;
    })
    .filter((x): x is NonNullable<typeof x> => Boolean(x));

  return { nodeId, neighbors };
}

export function getSubgraph(center: string, depth = 1): SubgraphResponse {
  const graph = buildGraphSnapshot();
  const nodeMap = byId(graph.entities);

  const visited = new Set<string>([center]);
  let frontier = new Set<string>([center]);

  for (let d = 0; d < depth; d += 1) {
    const next = new Set<string>();

    for (const edge of graph.edges) {
      if (frontier.has(edge.source) && !visited.has(edge.target)) {
        visited.add(edge.target);
        next.add(edge.target);
      }
      if (frontier.has(edge.target) && !visited.has(edge.source)) {
        visited.add(edge.source);
        next.add(edge.source);
      }
    }

    frontier = next;
    if (frontier.size === 0) break;
  }

  const nodes = Array.from(visited)
    .map(id => nodeMap.get(id))
    .filter((n): n is GraphEntity => Boolean(n));

  const edges = graph.edges.filter((e: GraphEdge) => visited.has(e.source) && visited.has(e.target));

  return { center, depth, nodes, edges };
}

export function graphHealth() {
  const graph = buildGraphSnapshot();

  const aliasToCanonical = new Map<string, string>();
  let aliasConflicts = 0;

  for (const node of graph.entities) {
    for (const alias of node.aliases) {
      const key = alias.toLowerCase().trim();
      const prev = aliasToCanonical.get(key);
      if (prev && prev !== node.id) aliasConflicts += 1;
      else aliasToCanonical.set(key, node.id);
    }
  }

  const lowConfidenceEdges = graph.edges.filter(e => e.confidence < 0.7).length;
  const danglingEdges = graph.edges.filter(
    e => !graph.entities.some(n => n.id === e.source) || !graph.entities.some(n => n.id === e.target)
  ).length;

  return {
    entities: graph.entities.length,
    edges: graph.edges.length,
    lowConfidenceEdges,
    danglingEdges,
    aliasConflicts,
    status: danglingEdges === 0 ? 'ok' : 'degraded',
  };
}
