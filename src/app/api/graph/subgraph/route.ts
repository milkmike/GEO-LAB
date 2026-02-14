import { NextRequest } from 'next/server';
import { getSubgraph } from '@/lib/graph/query';
import { apiJson, clampNumberParam, requiredStringParam, withApiErrorHandling } from '@/lib/api/http';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const nodeId = requiredStringParam(request, 'nodeId');
  const depth = clampNumberParam(request, 'depth', 1, 1, 3);

  return apiJson(getSubgraph(nodeId, depth));
});
