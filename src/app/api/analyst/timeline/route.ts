import { NextRequest } from 'next/server';
import { getTimelineByScope } from '@/lib/analyst/service';
import { apiJson, withApiErrorHandling } from '@/lib/api/http';
import { getScopeParams } from '@/lib/analyst/request';
import { throwOnServiceError } from '@/lib/analyst/route-error';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const data = await getTimelineByScope(params);

  throwOnServiceError(data as { error?: string });
  return apiJson(data);
});
