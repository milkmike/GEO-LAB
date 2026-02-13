import { NextRequest } from 'next/server';
import { getTimelineByScope } from '@/lib/analyst/service';
import { apiJson, badRequest, notFound, withApiErrorHandling } from '@/lib/api/http';
import { getScopeParams } from '@/lib/analyst/request';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const data = await getTimelineByScope(params);

  const error = (data as { error?: string }).error;
  if (typeof error === 'string') {
    if (error === 'not found') throw notFound();
    throw badRequest(error);
  }

  return apiJson(data);
});
