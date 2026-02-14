type EndpointBucket = {
  route: string;
  operation: string;
  count: number;
  errors: number;
  statuses: Record<string, number>;
  latencyMs: number[];
  lastSeenAt: string;
};

type RetrievalBucket = {
  key: string;
  scope: string;
  querySample: string;
  count: number;
  avgCandidates: number;
  avgReturned: number;
  avgFreshnessHours: number;
  lastSeenAt: string;
};

type FreshnessBucket = {
  key: string;
  count: number;
  staleCount: number;
  avgHours: number;
  p95Hours: number;
  maxHours: number;
  lastSeenAt: string;
};

type MonitoringState = {
  startedAt: string;
  endpoints: Map<string, EndpointBucket>;
  retrieval: Map<string, RetrievalBucket>;
  freshness: Map<string, FreshnessBucket>;
};

declare global {
  var __geoLabMonitoringState: MonitoringState | undefined;
}

function getState(): MonitoringState {
  if (!globalThis.__geoLabMonitoringState) {
    globalThis.__geoLabMonitoringState = {
      startedAt: new Date().toISOString(),
      endpoints: new Map(),
      retrieval: new Map(),
      freshness: new Map(),
    };
  }

  return globalThis.__geoLabMonitoringState;
}

function percentile(values: number[], p: number): number {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function hoursSince(isoDate: string): number {
  const ts = +new Date(isoDate);
  if (!Number.isFinite(ts)) return 0;
  const diffMs = Date.now() - ts;
  return diffMs <= 0 ? 0 : diffMs / (60 * 60 * 1000);
}

function toOperationName(route: string): string {
  return route
    .replace(/^\/+/, '')
    .replace(/\?.*$/, '')
    .replace(/\//g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase() || 'api.unknown';
}

function upsertEndpoint(route: string, operation?: string): EndpointBucket {
  const state = getState();
  const key = operation || toOperationName(route);
  const existing = state.endpoints.get(key);
  if (existing) return existing;

  const created: EndpointBucket = {
    route,
    operation: key,
    count: 0,
    errors: 0,
    statuses: {},
    latencyMs: [],
    lastSeenAt: new Date().toISOString(),
  };

  state.endpoints.set(key, created);
  return created;
}

export function recordApiMetric(input: {
  route: string;
  status: number;
  latencyMs: number;
  operation?: string;
}): void {
  const bucket = upsertEndpoint(input.route || 'api.unknown', input.operation);
  bucket.count += 1;
  if (input.status >= 400 || input.status === 0) bucket.errors += 1;
  bucket.statuses[String(input.status)] = (bucket.statuses[String(input.status)] || 0) + 1;
  bucket.latencyMs.push(Number(input.latencyMs.toFixed(2)));
  if (bucket.latencyMs.length > 200) bucket.latencyMs.shift();
  bucket.lastSeenAt = new Date().toISOString();
}

export function recordRetrievalMetric(input: {
  scope: string;
  query: string;
  candidates: number;
  returned: number;
  freshnessHours: number;
}): void {
  const querySample = input.query.trim().slice(0, 48).toLowerCase();
  const key = `${input.scope}:${querySample}`;
  const state = getState();
  const existing = state.retrieval.get(key);

  if (!existing) {
    state.retrieval.set(key, {
      key,
      scope: input.scope,
      querySample,
      count: 1,
      avgCandidates: input.candidates,
      avgReturned: input.returned,
      avgFreshnessHours: input.freshnessHours,
      lastSeenAt: new Date().toISOString(),
    });
    return;
  }

  const nextCount = existing.count + 1;
  existing.avgCandidates = ((existing.avgCandidates * existing.count) + input.candidates) / nextCount;
  existing.avgReturned = ((existing.avgReturned * existing.count) + input.returned) / nextCount;
  existing.avgFreshnessHours = ((existing.avgFreshnessHours * existing.count) + input.freshnessHours) / nextCount;
  existing.count = nextCount;
  existing.lastSeenAt = new Date().toISOString();
}

export function recordFreshnessMetric(input: {
  key: string;
  timestamps: Array<string | null | undefined>;
  staleAfterHours?: number;
}): void {
  const values = input.timestamps
    .map((ts) => (ts ? hoursSince(ts) : null))
    .filter((x): x is number => x !== null && Number.isFinite(x));

  if (!values.length) return;

  const staleAfterHours = input.staleAfterHours ?? 24;
  const staleCount = values.filter((v) => v > staleAfterHours).length;
  const avgHours = values.reduce((acc, x) => acc + x, 0) / values.length;
  const p95Hours = percentile(values, 95);
  const maxHours = Math.max(...values);

  const state = getState();
  state.freshness.set(input.key, {
    key: input.key,
    count: values.length,
    staleCount,
    avgHours: Number(avgHours.toFixed(2)),
    p95Hours: Number(p95Hours.toFixed(2)),
    maxHours: Number(maxHours.toFixed(2)),
    lastSeenAt: new Date().toISOString(),
  });
}

export function monitoringSnapshot() {
  const state = getState();

  const endpoints = Array.from(state.endpoints.values()).map((bucket) => ({
    route: bucket.route,
    operation: bucket.operation,
    count: bucket.count,
    errors: bucket.errors,
    errorRate: bucket.count ? Number((bucket.errors / bucket.count).toFixed(3)) : 0,
    statuses: bucket.statuses,
    latencyMs: {
      avg: bucket.latencyMs.length
        ? Number((bucket.latencyMs.reduce((acc, x) => acc + x, 0) / bucket.latencyMs.length).toFixed(2))
        : 0,
      p95: Number(percentile(bucket.latencyMs, 95).toFixed(2)),
      max: Number((Math.max(0, ...bucket.latencyMs)).toFixed(2)),
      samples: bucket.latencyMs.length,
    },
    lastSeenAt: bucket.lastSeenAt,
  }));

  const freshness = Array.from(state.freshness.values());
  const retrieval = Array.from(state.retrieval.values()).map((bucket) => ({
    ...bucket,
    avgCandidates: Number(bucket.avgCandidates.toFixed(2)),
    avgReturned: Number(bucket.avgReturned.toFixed(2)),
    avgFreshnessHours: Number(bucket.avgFreshnessHours.toFixed(2)),
  }));

  return {
    startedAt: state.startedAt,
    generatedAt: new Date().toISOString(),
    endpoints,
    retrieval,
    freshness,
  };
}

export function resetMonitoringState() {
  globalThis.__geoLabMonitoringState = undefined;
}
