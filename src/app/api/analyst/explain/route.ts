import { NextRequest } from 'next/server';
import { explainAnalystItem } from '@/lib/analyst/service';
import { apiJson, badRequest, notFound, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalNumber, getOptionalString, getScopeParams } from '@/lib/analyst/request';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const params = getScopeParams(request);
  const articleId = getOptionalNumber(request, 'articleId');
  const nodeId = getOptionalString(request, 'nodeId');
  const relatedNodeId = getOptionalString(request, 'relatedNodeId');

  const data = await explainAnalystItem({
    ...params,
    articleId,
    nodeId,
    relatedNodeId,
  });

  const error = (data as { error?: string }).error;
  if (typeof error === 'string') {
    if (error.includes('not found')) throw notFound(error);
    throw badRequest(error);
  }

  return apiJson(data);
});
