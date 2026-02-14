import { NextRequest } from 'next/server';
import { generateBrief } from '@/lib/analyst/service';
import { apiJson, notFound, requiredNumberParam, withApiErrorHandling } from '@/lib/api/http';
import { getWindowHours } from '@/lib/analyst/request';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const narrativeId = requiredNumberParam(request, 'narrativeId');
  const windowHours = getWindowHours(request);
  const data = await generateBrief(narrativeId, windowHours);
  if (!data) throw notFound();

  return apiJson(data);
});
