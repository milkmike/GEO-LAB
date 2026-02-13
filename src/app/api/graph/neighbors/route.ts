import { NextRequest, NextResponse } from 'next/server';
import { getNeighbors } from '@/lib/graph/query';

export async function GET(request: NextRequest) {
  const nodeId = request.nextUrl.searchParams.get('nodeId');
  if (!nodeId) {
    return NextResponse.json({ error: 'nodeId is required' }, { status: 400 });
  }

  const data = getNeighbors(nodeId);
  return NextResponse.json(data);
}
