import { NextResponse } from 'next/server';
import { getTriageData } from '@/lib/analyst/service';

export async function GET() {
  const data = await getTriageData();
  return NextResponse.json(data);
}
