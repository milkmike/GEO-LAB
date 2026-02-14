import { NextRequest } from 'next/server';
import { getNeighbors } from '@/lib/graph/query';
import { apiJson, requiredStringParam, withApiErrorHandling } from '@/lib/api/http';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const nodeId = requiredStringParam(request, 'nodeId');
  return apiJson(getNeighbors(nodeId));
});
