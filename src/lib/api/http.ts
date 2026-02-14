import { NextRequest, NextResponse } from 'next/server';
import { applyApiObservability } from '@/lib/api/observability';
import { recordApiMetric } from '@/lib/monitoring/metrics';

export type ApiErrorCode =
  | 'bad_request'
  | 'not_found'
  | 'internal_error';

export type ApiErrorResponse = {
  error: string;
  code: ApiErrorCode;
};

export class ApiRouteError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code: ApiErrorCode,
  ) {
    super(message);
    this.name = 'ApiRouteError';
  }
}

export function badRequest(message: string): ApiRouteError {
  return new ApiRouteError(message, 400, 'bad_request');
}

export function notFound(message = 'not found'): ApiRouteError {
  return new ApiRouteError(message, 404, 'not_found');
}

export function requiredStringParam(request: NextRequest, name: string): string {
  const value = String(request.nextUrl.searchParams.get(name) || '').trim();
  if (!value) {
    throw badRequest(`${name} is required`);
  }

  return value;
}

export function requiredNumberParam(request: NextRequest, name: string): number {
  const raw = request.nextUrl.searchParams.get(name);
  const value = Number(raw);

  if (!raw || Number.isNaN(value) || value <= 0) {
    throw badRequest(`${name} is required`);
  }

  return value;
}

export function optionalCsvParam(request: NextRequest, name: string): string[] | undefined {
  const value = String(request.nextUrl.searchParams.get(name) || '').trim();
  if (!value) return undefined;

  const parts = value
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  return parts.length ? parts : undefined;
}

export function clampNumberParam(request: NextRequest, name: string, fallback: number, min: number, max: number): number {
  const raw = request.nextUrl.searchParams.get(name);
  const value = Number(raw ?? fallback);
  if (Number.isNaN(value)) return fallback;
  return Math.max(min, Math.min(max, value));
}

export function apiJson<T>(payload: T, status = 200): NextResponse<T> {
  return NextResponse.json(payload, { status });
}

export function apiError(error: unknown): NextResponse<ApiErrorResponse> {
  if (error instanceof ApiRouteError) {
    return NextResponse.json(
      {
        error: error.message,
        code: error.code,
      },
      { status: error.status },
    );
  }

  return NextResponse.json(
    {
      error: 'internal server error',
      code: 'internal_error',
    },
    { status: 500 },
  );
}

function routeToOperation(route: string): string {
  return route
    .replace(/^\/+/, '')
    .replace(/\?.*$/, '')
    .replace(/\//g, '.')
    .replace(/[^a-zA-Z0-9._-]/g, '_')
    .toLowerCase() || 'api.unknown';
}

function observeAndReturn<T>(response: NextResponse<T>, startedAtMs: number, route: string): NextResponse<T> {
  const operation = routeToOperation(route);
  const latencyMs = Date.now() - startedAtMs;

  recordApiMetric({
    route,
    operation,
    status: response.status,
    latencyMs,
  });

  return applyApiObservability(response, {
    operation,
    outcome: response.status >= 400 ? 'error' : 'ok',
    startedAtMs,
  });
}

export function withApiErrorHandling<T>(handler: (request: NextRequest) => Promise<NextResponse<T>> | NextResponse<T>) {
  return async function route(request: NextRequest): Promise<NextResponse<T | ApiErrorResponse>> {
    const startedAtMs = Date.now();
    const routeId = request.nextUrl.pathname;

    try {
      const response = await handler(request);
      return observeAndReturn(response, startedAtMs, routeId);
    } catch (error) {
      const response = apiError(error);
      return observeAndReturn(response, startedAtMs, routeId);
    }
  };
}

export function withApiErrorHandlingNoRequest<T>(
  handler: () => Promise<NextResponse<T>> | NextResponse<T>,
  routeId = 'internal/no-request',
) {
  return async function route(): Promise<NextResponse<T | ApiErrorResponse>> {
    const startedAtMs = Date.now();

    try {
      const response = await handler();
      return observeAndReturn(response, startedAtMs, routeId);
    } catch (error) {
      const response = apiError(error);
      return observeAndReturn(response, startedAtMs, routeId);
    }
  };
}
