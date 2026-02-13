import { NextRequest, NextResponse } from 'next/server';
import { getCaseWorkspace } from '@/lib/analyst/service';

export async function GET(request: NextRequest) {
  const id = Number(request.nextUrl.searchParams.get('narrativeId'));
  if (!id) return NextResponse.json({ error: 'narrativeId is required' }, { status: 400 });

  const data = getCaseWorkspace(id);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
