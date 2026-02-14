import { NextResponse } from 'next/server';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

export const runtime = 'nodejs';

type SubmitPayload = {
  batchId?: string;
  answers?: unknown;
  meta?: unknown;
};

function safeName(value: string) {
  return value.replace(/[^a-zA-Z0-9_-]/g, '_');
}

export async function POST(request: Request) {
  let payload: SubmitPayload;

  try {
    payload = (await request.json()) as SubmitPayload;
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  if (!payload.batchId || !payload.answers || typeof payload.answers !== 'object') {
    return NextResponse.json({ error: 'batchId and answers are required' }, { status: 400 });
  }

  const batchId = safeName(payload.batchId);
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = join(process.cwd(), 'artifacts', 'validation', 'submissions');
  const fileName = `${batchId}-${ts}.json`;
  const filePath = join(dir, fileName);

  await mkdir(dir, { recursive: true });
  await writeFile(
    filePath,
    JSON.stringify(
      {
        savedAt: new Date().toISOString(),
        batchId: payload.batchId,
        answers: payload.answers,
        meta: payload.meta || {},
      },
      null,
      2,
    ),
    'utf-8',
  );

  return NextResponse.json({ ok: true, fileName, filePath: `artifacts/validation/submissions/${fileName}` });
}
