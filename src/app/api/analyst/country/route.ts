import { NextRequest, NextResponse } from 'next/server';
import { getCountryWorkspace } from '@/lib/analyst/service';

export async function GET(request: NextRequest) {
  const code = String(request.nextUrl.searchParams.get('code') || '').trim();
  if (!code) return NextResponse.json({ error: 'code is required' }, { status: 400 });

  const data = await getCountryWorkspace(code);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });
  return NextResponse.json(data);
}
