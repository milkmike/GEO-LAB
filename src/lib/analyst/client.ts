import type {
  BriefResponse,
  CaseResponse,
  CountryWorkspaceResponse,
  EntityWorkspaceResponse,
  TriageResponse,
  AnalystScope,
} from './dto';

export type {
  BriefResponse,
  CaseResponse,
  CountryWorkspaceResponse,
  EntityWorkspaceResponse,
  TriageResponse,
  AnalystScope,
} from './dto';

type MaybeApiError = {
  error?: string;
  code?: string;
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, { cache: 'no-store' });

  if (!response.ok) {
    let message = `${response.status}`;

    try {
      const payload = (await response.json()) as MaybeApiError;
      if (payload.error) {
        message = payload.code ? `${payload.error} (${payload.code})` : payload.error;
      }
    } catch {
      // fallback to status message
    }

    throw new Error(message);
  }

  return response.json() as Promise<T>;
}

export async function fetchTriage(): Promise<TriageResponse> {
  return fetchJson('/api/analyst/triage');
}

export async function fetchCase(narrativeId: number): Promise<CaseResponse> {
  return fetchJson(`/api/analyst/case?narrativeId=${narrativeId}`);
}

export async function fetchBrief(narrativeId: number): Promise<BriefResponse> {
  return fetchJson(`/api/analyst/brief?narrativeId=${narrativeId}`);
}

export async function fetchCountryWorkspace(code: string): Promise<CountryWorkspaceResponse> {
  return fetchJson(`/api/analyst/country?code=${encodeURIComponent(code)}`);
}

export async function fetchEntityWorkspace(entity: string, countries?: string[]): Promise<EntityWorkspaceResponse> {
  const params = new URLSearchParams({ entity });
  if (countries?.length) params.set('countries', countries.join(','));

  return fetchJson(`/api/analyst/entity?${params.toString()}`);
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

  return fetchJson(`/api/analyst/timeline?${query.toString()}`);
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

  return fetchJson(`/api/analyst/graph?${query.toString()}`);
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

  return fetchJson(`/api/analyst/query?${query.toString()}`);
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

  return fetchJson(`/api/analyst/explain?${query.toString()}`);
}
