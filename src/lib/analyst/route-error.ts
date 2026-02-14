import { badRequest, notFound } from '@/lib/api/http';

export function throwOnServiceError(result: { error?: string }) {
  if (!result.error) return;

  if (result.error === 'not found' || result.error.includes('not found')) {
    throw notFound(result.error === 'not found' ? 'not found' : result.error);
  }

  throw badRequest(result.error);
}
