import { NextRequest, NextResponse } from 'next/server';
import { getSubgraph } from '@/lib/graph/query';

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get('nodeId');
  const depthParam = request.nextUrl.searchParams.get('depth');

  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }

  const depth = Math.max(1, Math.min(3, Number(depthParam || 1)));
  const data = getSubgraph(nodeId, Number.isNaN(depth) ? 1 : depth);
  return NextResponse.json(data);
}
