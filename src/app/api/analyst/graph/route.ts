import { NextRequest } from 'next/server';
import { getGraphByScope } from '@/lib/analyst/service';
import { apiJson, badRequest, notFound, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalNumber, getOptionalString, getScopeParams } from '@/lib/analyst/request';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const nodeId = getOptionalString(request, 'nodeId');
  const depth = getOptionalNumber(request, 'depth');

  const data = await getGraphByScope({
    ...params,
    nodeId,
    depth,
  });

  const error = (data as { error?: string }).error;
  if (typeof error === 'string') {
    if (error === 'not found') throw notFound();
    throw badRequest(error);
  }

  return apiJson(data);
});
