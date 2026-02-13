import type { NeighborsResponse, SubgraphResponse } from './types';
import type { GraphFocus } from '@/types/ontology';

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
  const res = await fetch(`/api/graph/neighbors?nodeId=${encodeURIComponent(nodeId)}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`neighbors failed: ${res.status}`);
  return res.json();
}

export async function fetchSubgraph(nodeId: string, depth = 2): Promise<SubgraphResponse> {
  const res = await fetch(`/api/graph/subgraph?nodeId=${encodeURIComponent(nodeId)}&depth=${depth}`, {
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(`subgraph failed: ${res.status}`);
  return res.json();
}

export async function fetchGraphHealth(): Promise<{ status: string; entities: number; edges: number }> {
  const res = await fetch('/api/admin/graph-health', { cache: 'no-store' });
  if (!res.ok) throw new Error(`graph-health failed: ${res.status}`);
  return res.json();
}
