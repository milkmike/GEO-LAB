import { NextRequest } from 'next/server';
import { getGraphByScope } from '@/lib/analyst/service';
import { apiJson, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalNumber, getOptionalString, getScopeParams } from '@/lib/analyst/request';
import { throwOnServiceError } from '@/lib/analyst/route-error';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const nodeId = getOptionalString(request, 'nodeId');
  const depth = getOptionalNumber(request, 'depth');

  const data = await getGraphByScope({
    ...params,
    nodeId,
    depth,
  });

  throwOnServiceError(data as { error?: string });
  return apiJson(data);
});
