export type EntityKind = 'person' | 'org' | 'place' | 'event';

export interface GraphEntity {
  id: string;
  kind: EntityKind;
  label: string;
  aliases: string[];
  countryCodes?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  relation: string;
  confidence: number; // 0..1
  evidence: string[];
  validFrom?: string;
  validTo?: string;
}

export interface GraphSnapshot {
  entities: GraphEntity[];
  edges: GraphEdge[];
}

export interface SubgraphResponse {
  center: string;
  depth: number;
  nodes: GraphEntity[];
  edges: GraphEdge[];
}

export interface NeighborsResponse {
  nodeId: string;
  neighbors: Array<{
    relation: string;
    node: GraphEntity;
    confidence: number;
    evidence: string[];
  }>;
}
