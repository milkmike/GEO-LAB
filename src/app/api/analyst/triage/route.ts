import { getTriageData } from '@/lib/analyst/service';
import { apiJson, withApiErrorHandlingNoRequest } from '@/lib/api/http';

export const GET = withApiErrorHandlingNoRequest(async () => {
  const data = await getTriageData();
  return apiJson(data);
}, '/api/analyst/triage');
