import type { NeighborsResponse, SubgraphResponse } from './types';
import type { GraphFocus } from '@/types/ontology';

type MaybeApiError = {
  error?: string;
  code?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { cache: 'no-store' });

  if (!res.ok) {
    let message = `${res.status}`;

    try {
      const payload = (await res.json()) as MaybeApiError;
      if (payload.error) {
        message = payload.code ? `${payload.error} (${payload.code})` : payload.error;
      }
    } catch {
      // no-op
    }

    throw new Error(message);
  }

  return res.json() as Promise<T>;
}

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
  return fetchJson<NeighborsResponse>(`/api/graph/neighbors?nodeId=${encodeURIComponent(nodeId)}`);
}

export async function fetchSubgraph(nodeId: string, depth = 2): Promise<SubgraphResponse> {
  return fetchJson<SubgraphResponse>(`/api/graph/subgraph?nodeId=${encodeURIComponent(nodeId)}&depth=${depth}`);
}

export async function fetchGraphHealth(): Promise<{ status: string; entities: number; edges: number }> {
  return fetchJson<{ status: string; entities: number; edges: number }>('/api/admin/graph-health');
}
