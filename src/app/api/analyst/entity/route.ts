import { NextRequest } from 'next/server';
import { getEntityWorkspace } from '@/lib/analyst/service';
import { apiJson, notFound, optionalCsvParam, requiredStringParam, withApiErrorHandling } from '@/lib/api/http';

export const GET = withApiErrorHandling(async (request: NextRequest) => {
  const entity = requiredStringParam(request, 'entity');
  const countries = optionalCsvParam(request, 'countries');

  const data = await getEntityWorkspace(entity, countries);
  if (!data) throw notFound();

  return apiJson(data);
});
