import type { NextRequest } from 'next/server';
import { badRequest } from '@/lib/api/http';

export type AnalystScope = 'country' | 'narrative' | 'entity';

export type AnalystScopeRequest = {
  scope: AnalystScope;
  code?: string;
  entity?: string;
  countries?: string[];
  narrativeId?: number;
};

function parseFlag(value: string | null): boolean | undefined {
  if (value === null || value === '') return undefined;
  if (value === '1' || value.toLowerCase() === 'true') return true;
  if (value === '0' || value.toLowerCase() === 'false') return false;
  return undefined;
}

export function getRequiredScope(request: NextRequest): AnalystScope {
  const scope = String(request.nextUrl.searchParams.get('scope') || '').trim();
  if (scope === 'country' || scope === 'narrative' || scope === 'entity') {
    return scope;
  }

  throw badRequest('scope must be one of: country|narrative|entity');
}

export function getScopeParams(request: NextRequest): AnalystScopeRequest {
  const scope = getRequiredScope(request);
  const code = String(request.nextUrl.searchParams.get('code') || '').trim();
  const entity = String(request.nextUrl.searchParams.get('entity') || '').trim();
  const countriesParam = String(request.nextUrl.searchParams.get('countries') || '').trim();
  const narrativeId = Number(request.nextUrl.searchParams.get('narrativeId'));

  const countries = countriesParam
    ? countriesParam.split(',').map((x) => x.trim()).filter(Boolean)
    : undefined;

  return {
    scope,
    code: code || undefined,
    entity: entity || undefined,
    countries,
    narrativeId: Number.isFinite(narrativeId) ? narrativeId : undefined,
  };
}

export function getOptionalFlag(request: NextRequest, paramName: string): boolean | undefined {
  return parseFlag(request.nextUrl.searchParams.get(paramName));
}

export function getOptionalNumber(request: NextRequest, paramName: string): number | undefined {
  const value = Number(request.nextUrl.searchParams.get(paramName));
  return Number.isFinite(value) ? value : undefined;
}

export function getOptionalString(request: NextRequest, paramName: string): string | undefined {
  const value = String(request.nextUrl.searchParams.get(paramName) || '').trim();
  return value || undefined;
}

export function getWindowHours(request: NextRequest, paramName = 'windowHours', fallback: 24 | 72 = 24): 24 | 72 {
  const raw = String(request.nextUrl.searchParams.get(paramName) || '').trim();
  if (!raw) return fallback;

  const hours = Number(raw);
  if (hours === 24 || hours === 72) return hours;

  throw badRequest(`${paramName} must be 24 or 72`);
}
