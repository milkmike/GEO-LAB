import { NextResponse } from 'next/server';
import { graphHealth } from '@/lib/graph/query';

export async function GET() {
  return NextResponse.json(graphHealth());
}
