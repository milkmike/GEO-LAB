import { NextResponse } from 'next/server';
import { getTriageData } from '@/lib/analyst/service';

export async function GET() {
  return NextResponse.json(getTriageData());
}
