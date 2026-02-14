import { NextRequest } from 'next/server';
import { runAnalystQuery } from '@/lib/analyst/service';
import { apiJson, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalFlag, getScopeParams } from '@/lib/analyst/request';
import { throwOnServiceError } from '@/lib/analyst/route-error';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const includeTimeline = getOptionalFlag(request, 'includeTimeline');
  const includeGraph = getOptionalFlag(request, 'includeGraph');

  const data = await runAnalystQuery({
    ...params,
    includeTimeline,
    includeGraph,
  });

  throwOnServiceError(data as { error?: string });
  return apiJson(data);
});
