import type { GraphHealth, GraphRepository, NeighborsResponse, SubgraphResponse } from '../domain/contracts';
import type { GraphEdge, GraphNodeId } from '../domain/primitives';

export class GraphService {
  constructor(private readonly repository: GraphRepository) {}

  getNeighbors(nodeId: GraphNodeId): NeighborsResponse {
    const snapshot = this.repository.getSnapshot();

    const neighbors = snapshot.edges
      .filter((edge) => edge.source === nodeId || edge.target === nodeId)
      .map((edge) => {
        const otherId = edge.source === nodeId ? edge.target : edge.source;
        const node = snapshot.nodeMap.get(otherId);
        if (!node) return null;

        return {
          relation: edge.relation,
          node,
          confidence: edge.confidence,
          evidence: edge.evidence,
        };
      })
      .filter((neighbor): neighbor is NonNullable<typeof neighbor> => Boolean(neighbor));

    return { nodeId, neighbors };
  }

  getSubgraph(center: GraphNodeId, depth = 1): SubgraphResponse {
    const snapshot = this.repository.getSnapshot();

    const visited = new Set<string>([center]);
    let frontier = new Set<string>([center]);

    for (let level = 0; level < depth; level += 1) {
      const next = new Set<string>();

      for (const edge of snapshot.edges) {
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
      .map((id) => snapshot.nodeMap.get(id))
      .filter((node): node is NonNullable<typeof node> => Boolean(node));

    const edges = snapshot.edges.filter(
      (edge: GraphEdge) => visited.has(edge.source) && visited.has(edge.target),
    );

    return { center, depth, nodes, edges };
  }

  getHealth(): GraphHealth {
    const snapshot = this.repository.getSnapshot();

    const aliasToCanonical = new Map<string, string>();
    let aliasConflicts = 0;

    for (const node of snapshot.entities) {
      for (const alias of node.aliases) {
        const key = alias.toLowerCase().trim();
        const previous = aliasToCanonical.get(key);
        if (previous && previous !== node.id) aliasConflicts += 1;
        else aliasToCanonical.set(key, node.id);
      }
    }

    const lowConfidenceEdges = snapshot.edges.filter((edge) => edge.confidence < 0.7).length;
    const danglingEdges = snapshot.edges.filter(
      (edge) => !snapshot.nodeIds.has(edge.source) || !snapshot.nodeIds.has(edge.target),
    ).length;

    return {
      entities: snapshot.entities.length,
      edges: snapshot.edges.length,
      lowConfidenceEdges,
      danglingEdges,
      aliasConflicts,
      status: danglingEdges === 0 ? 'ok' : 'degraded',
    };
  }
}
