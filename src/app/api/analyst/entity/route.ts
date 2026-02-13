import { NextRequest, NextResponse } from 'next/server';
import { getEntityWorkspace } from '@/lib/analyst/service';

export async function GET(request: NextRequest) {
  const entity = String(request.nextUrl.searchParams.get('entity') || '').trim();
  const countriesParam = String(request.nextUrl.searchParams.get('countries') || '').trim();

  if (!entity) {
    return NextResponse.json({ error: 'entity is required' }, { status: 400 });
  }

  const countries = countriesParam
    ? countriesParam.split(',').map((x) => x.trim()).filter(Boolean)
    : undefined;

  const data = await getEntityWorkspace(entity, countries);
  if (!data) return NextResponse.json({ error: 'not found' }, { status: 404 });

  return NextResponse.json(data);
}
