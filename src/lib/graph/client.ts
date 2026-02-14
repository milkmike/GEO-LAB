import type { NeighborsResponse, SubgraphResponse } from './types';
import type { GraphFocus } from '@/types/ontology';
import { fetchJsonNoStore } from '@/lib/api/fetch-json';

export function focusToGraphNodeId(focus: GraphFocus): string {
  switch (focus.nodeType) {
    case 'Country':
      return `country:${String(focus.nodeId)}`;
    case 'Narrative':
      return `narrative:${String(focus.nodeId)}`;
    case 'Article':
      return `article:${String(focus.nodeId)}`;
    case 'Event':
      return `event:${String(focus.nodeId)}`;
    case 'Channel':
      return `channel:${String(focus.nodeId)}`;
    case 'VoxComment':
      return `comment:${String(focus.nodeId)}`;
    case 'TemperaturePoint':
      return `temperature:${String(focus.nodeId)}`;
    default:
      return `${String(focus.nodeType).toLowerCase()}:${String(focus.nodeId)}`;
  }
}

export async function fetchNeighbors(nodeId: string): Promise<NeighborsResponse> {
  return fetchJsonNoStore(`/api/graph/neighbors?nodeId=${encodeURIComponent(nodeId)}`);
}

export async function fetchSubgraph(nodeId: string, depth = 2): Promise<SubgraphResponse> {
  return fetchJsonNoStore(`/api/graph/subgraph?nodeId=${encodeURIComponent(nodeId)}&depth=${depth}`);
}

export async function fetchGraphHealth(): Promise<{ status: string; entities: number; edges: number }> {
  return fetchJsonNoStore('/api/admin/graph-health');
}
