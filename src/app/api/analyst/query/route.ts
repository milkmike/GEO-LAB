import { NextRequest } from 'next/server';
import { runAnalystQuery } from '@/lib/analyst/service';
import { apiJson, badRequest, notFound, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalFlag, getScopeParams } from '@/lib/analyst/request';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const includeTimeline = getOptionalFlag(request, 'includeTimeline');
  const includeGraph = getOptionalFlag(request, 'includeGraph');

  const data = await runAnalystQuery({
    ...params,
    includeTimeline,
    includeGraph,
  });

  const error = (data as { error?: string }).error;
  if (typeof error === 'string') {
    if (error === 'not found') throw notFound();
    throw badRequest(error);
  }

  return apiJson(data);
});
