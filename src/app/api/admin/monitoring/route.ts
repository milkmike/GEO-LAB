import { apiJson, withApiErrorHandlingNoRequest } from '@/lib/api/http';
import { monitoringSnapshot } from '@/lib/monitoring/metrics';

export const GET = withApiErrorHandlingNoRequest(
  () => apiJson(monitoringSnapshot()),
  '/api/admin/monitoring',
);
