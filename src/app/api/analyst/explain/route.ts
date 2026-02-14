import { NextRequest } from 'next/server';
import { explainAnalystItem } from '@/lib/analyst/service';
import { apiJson, withApiErrorHandling } from '@/lib/api/http';
import { getOptionalNumber, getOptionalString, getScopeParams } from '@/lib/analyst/request';
import { throwOnServiceError } from '@/lib/analyst/route-error';

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

  throwOnServiceError(data as { error?: string });
  return apiJson(data);
});
