import { NextRequest } from 'next/server';
import { generateBrief } from '@/lib/analyst/service';
import { apiJson, notFound, requiredNumberParam, withApiErrorHandling } from '@/lib/api/http';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const narrativeId = requiredNumberParam(request, 'narrativeId');
  const data = await generateBrief(narrativeId);
  if (!data) throw notFound();

  return apiJson(data);
});
