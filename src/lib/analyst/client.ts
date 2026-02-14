import type {
  BriefResponse,
  CaseResponse,
  CountryWorkspaceResponse,
  EntityWorkspaceResponse,
  TriageResponse,
  AnalystScope,
} from './dto';
import { fetchJsonNoStore } from '@/lib/api/fetch-json';

export type {
  BriefResponse,
  CaseResponse,
  CountryWorkspaceResponse,
  EntityWorkspaceResponse,
  TriageResponse,
  AnalystScope,
} from './dto';

export async function fetchTriage(): Promise<TriageResponse> {
  return fetchJsonNoStore('/api/analyst/triage');
}

export async function fetchCase(narrativeId: number): Promise<CaseResponse> {
  return fetchJsonNoStore(`/api/analyst/case?narrativeId=${narrativeId}`);
}

export async function fetchBrief(narrativeId: number): Promise<BriefResponse> {
  return fetchJsonNoStore(`/api/analyst/brief?narrativeId=${narrativeId}`);
}

export async function fetchCountryWorkspace(code: string): Promise<CountryWorkspaceResponse> {
  return fetchJsonNoStore(`/api/analyst/country?code=${encodeURIComponent(code)}`);
}

export async function fetchEntityWorkspace(entity: string, countries?: string[]): Promise<EntityWorkspaceResponse> {
  const params = new URLSearchParams({ entity });
  if (countries?.length) params.set('countries', countries.join(','));

  return fetchJsonNoStore(`/api/analyst/entity?${params.toString()}`);
}

export async function fetchAnalystTimeline(params: {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  entity?: string;
  countries?: string[];
}) {
  const query = new URLSearchParams({ scope: params.scope });
  if (params.code) query.set('code', params.code);
  if (params.narrativeId) query.set('narrativeId', String(params.narrativeId));
  if (params.entity) query.set('entity', params.entity);
  if (params.countries?.length) query.set('countries', params.countries.join(','));

  return fetchJsonNoStore(`/api/analyst/timeline?${query.toString()}`);
}

export async function fetchAnalystGraph(params: {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  nodeId?: string;
  depth?: number;
}) {
  const query = new URLSearchParams({ scope: params.scope });
  if (params.code) query.set('code', params.code);
  if (params.narrativeId) query.set('narrativeId', String(params.narrativeId));
  if (params.nodeId) query.set('nodeId', params.nodeId);
  if (params.depth) query.set('depth', String(params.depth));

  return fetchJsonNoStore(`/api/analyst/graph?${query.toString()}`);
}

export async function fetchAnalystQuery(params: {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  entity?: string;
  countries?: string[];
  includeTimeline?: boolean;
  includeGraph?: boolean;
}) {
  const query = new URLSearchParams({ scope: params.scope });
  if (params.code) query.set('code', params.code);
  if (params.narrativeId) query.set('narrativeId', String(params.narrativeId));
  if (params.entity) query.set('entity', params.entity);
  if (params.countries?.length) query.set('countries', params.countries.join(','));
  if (params.includeTimeline !== undefined) query.set('includeTimeline', String(params.includeTimeline));
  if (params.includeGraph !== undefined) query.set('includeGraph', String(params.includeGraph));

  return fetchJsonNoStore(`/api/analyst/query?${query.toString()}`);
}

export async function fetchAnalystExplain(params: {
  scope: AnalystScope;
  code?: string;
  narrativeId?: number;
  entity?: string;
  countries?: string[];
  articleId?: number;
  nodeId?: string;
  relatedNodeId?: string;
}) {
  const query = new URLSearchParams({ scope: params.scope });
  if (params.code) query.set('code', params.code);
  if (params.narrativeId) query.set('narrativeId', String(params.narrativeId));
  if (params.entity) query.set('entity', params.entity);
  if (params.countries?.length) query.set('countries', params.countries.join(','));
  if (params.articleId) query.set('articleId', String(params.articleId));
  if (params.nodeId) query.set('nodeId', params.nodeId);
  if (params.relatedNodeId) query.set('relatedNodeId', params.relatedNodeId);

  return fetchJsonNoStore(`/api/analyst/explain?${query.toString()}`);
}
