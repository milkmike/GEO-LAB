import { NextRequest } from 'next/server';
import { getCountryWorkspace } from '@/lib/analyst/service';
import { apiJson, notFound, requiredStringParam, withApiErrorHandling } from '@/lib/api/http';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const code = requiredStringParam(request, 'code');
  const data = await getCountryWorkspace(code);
  if (!data) throw notFound();

  return apiJson(data);
});
