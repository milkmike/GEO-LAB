import { NextRequest } from 'next/server';
import { apiJson, badRequest, notFound, withApiErrorHandling } from '@/lib/api/http';
import { getScopeParams, getWindowHours } from '@/lib/analyst/request';
import { buildTrust } from '@/lib/analyst/signals';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const windowHours = getWindowHours(request);

  const data = await buildTrust({ ...params, windowHours });
  const error = (data as { error?: string }).error;
  if (typeof error === 'string') {
    if (error === 'not found') throw notFound();
    throw badRequest(error);
  }

  return apiJson(data);
});
