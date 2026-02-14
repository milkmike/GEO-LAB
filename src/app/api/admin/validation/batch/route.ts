import { NextResponse } from 'next/server';
import batch001 from '@/lib/validation/batch-001.json';
import type { ValidationRow } from '@/lib/validation/types';

export const runtime = 'nodejs';

const BATCHES: Record<string, ValidationRow[]> = {
  'BATCH-001': batch001 as ValidationRow[],
};

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const batchId = (searchParams.get('batch') || 'BATCH-001').toUpperCase();
  const rows = BATCHES[batchId];

  if (!rows) {
    return NextResponse.json({ error: 'batch not found' }, { status: 404 });
  }

  const countries = Array.from(new Set(rows.map((row) => row.country_code))).sort();
  const threads = Array.from(new Set(rows.map((row) => row.thread_id))).length;

  return NextResponse.json({
    batchId,
    rows,
    summary: {
      totalRows: rows.length,
      countries,
      threads,
      createdAt: rows[0]?.created_at_utc || null,
    },
  });
}
