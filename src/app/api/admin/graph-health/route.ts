import { graphHealth } from '@/lib/graph/query';
import { apiJson, withApiErrorHandlingNoRequest } from '@/lib/api/http';

export const GET = withApiErrorHandlingNoRequest(() => apiJson(graphHealth()));
