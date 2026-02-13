export type EntityKind = 'person' | 'org' | 'place' | 'event';

export type GraphNodeId = string;

export interface GraphEntity {
  id: GraphNodeId;
  kind: EntityKind;
  label: string;
  aliases: string[];
  countryCodes?: string[];
  metadata?: Record<string, string | number | boolean | null>;
}

export interface GraphEdge {
  id: string;
  source: GraphNodeId;
  target: GraphNodeId;
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
