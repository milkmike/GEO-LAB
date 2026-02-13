import type { GraphEdge, GraphEntity, GraphNodeId } from './primitives';

export interface SubgraphResponse {
  center: GraphNodeId;
  depth: number;
  nodes: GraphEntity[];
  edges: GraphEdge[];
}

export interface NeighborsResponse {
  nodeId: GraphNodeId;
  neighbors: Array<{
    relation: string;
    node: GraphEntity;
    confidence: number;
    evidence: string[];
  }>;
}

export interface GraphHealth {
  entities: number;
  edges: number;
  lowConfidenceEdges: number;
  danglingEdges: number;
  aliasConflicts: number;
  status: 'ok' | 'degraded';
}

export interface GraphRepository {
  getSnapshot(): GraphSnapshotWithIndex;
}

export interface GraphSnapshotWithIndex {
  entities: GraphEntity[];
  edges: GraphEdge[];
  nodeMap: Map<string, GraphEntity>;
  nodeIds: Set<string>;
}
