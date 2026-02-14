import type { NextResponse } from 'next/server';

export const API_OBSERVABILITY_HEADERS = {
  operation: 'x-geo-lab-operation',
  outcome: 'x-geo-lab-outcome',
  durationMs: 'x-geo-lab-duration-ms',
} as const;

export type ApiOutcome = 'ok' | 'error';

export function applyApiObservability<T>(response: NextResponse<T>, input: {
  operation: string;
  outcome: ApiOutcome;
  startedAtMs: number;
}) {
  const durationMs = Date.now() - input.startedAtMs;

  response.headers.set(API_OBSERVABILITY_HEADERS.operation, input.operation);
  response.headers.set(API_OBSERVABILITY_HEADERS.outcome, input.outcome);
  response.headers.set(API_OBSERVABILITY_HEADERS.durationMs, String(durationMs));

  return response;
}
