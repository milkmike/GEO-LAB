'use client';

import { useEffect, useMemo, useState } from 'react';
import type { ValidationAnswer, ValidationReasonCode, ValidationRow } from '@/lib/validation/types';

const REASON_OPTIONS: Array<{ value: ValidationReasonCode; label: string }> = [
  { value: '', label: '— причина не выбрана —' },
  { value: 'actor_mismatch', label: 'Не те участники (actor mismatch)' },
  { value: 'topic_mismatch', label: 'Другая тема (topic mismatch)' },
  { value: 'geo_mismatch', label: 'Другая география (geo mismatch)' },
  { value: 'time_mismatch', label: 'Не тот период (time mismatch)' },
  { value: 'too_generic', label: 'Слишком общее (too generic)' },
  { value: 'other', label: 'Другое' },
];

type BatchResponse = {
  batchId: string;
  rows: ValidationRow[];
  summary: {
    totalRows: number;
    countries: string[];
    threads: number;
    createdAt: string | null;
  };
};

function storageKey(batchId: string) {
  return `geolab.validation.${batchId}`;
}

function defaultAnswer(rowId: number): ValidationAnswer {
  return {
    rowId,
    validatorDecision: '',
    sameThread: '',
    reasonCode: '',
    confidence: '',
    notes: '',
    updatedAt: new Date().toISOString(),
  };
}

function csvEscape(value: string | number) {
  const s = String(value ?? '');
  if (s.includes(',') || s.includes('"') || s.includes('\n')) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export default function ValidationAdminPage() {
  const [batch, setBatch] = useState<BatchResponse | null>(null);
  const [answers, setAnswers] = useState<Record<number, ValidationAnswer>>({});
  const [index, setIndex] = useState(0);
  const [status, setStatus] = useState<string>('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetch('/api/admin/validation/batch?batch=BATCH-001', { cache: 'no-store' })
      .then((r) => r.json())
      .then((data: BatchResponse) => {
        setBatch(data);
        const key = storageKey(data.batchId);
        const raw = localStorage.getItem(key);
        if (raw) {
          try {
            const parsed = JSON.parse(raw) as Record<number, ValidationAnswer>;
            setAnswers(parsed);
            return;
          } catch {
            // ignore corrupted local state
          }
        }

        const initial: Record<number, ValidationAnswer> = {};
        for (const row of data.rows) {
          initial[row.row_id] = defaultAnswer(row.row_id);
        }
        setAnswers(initial);
      })
      .catch(() => setStatus('Не удалось загрузить batch.'));
  }, []);

  useEffect(() => {
    if (!batch || !Object.keys(answers).length) return;
    localStorage.setItem(storageKey(batch.batchId), JSON.stringify(answers));
  }, [answers, batch]);

  const rows = batch?.rows || [];
  const current = rows[index];

  const completed = useMemo(
    () =>
      rows.filter((row) => {
        const a = answers[row.row_id];
        return a && a.validatorDecision && a.sameThread && a.confidence;
      }).length,
    [rows, answers],
  );

  function updateAnswer(patch: Partial<ValidationAnswer>) {
    if (!current) return;
    const rowId = current.row_id;
    setAnswers((prev) => ({
      ...prev,
      [rowId]: {
        ...(prev[rowId] || defaultAnswer(rowId)),
        ...patch,
        updatedAt: new Date().toISOString(),
      },
    }));
  }

  function exportCsv() {
    if (!batch) return;

    const headers = [
      'batch_id',
      'row_id',
      'country_code',
      'thread_id',
      'thread_title',
      'article_id',
      'published_at',
      'source',
      'title',
      'url',
      'validator_decision',
      'same_thread',
      'reason_code',
      'confidence',
      'notes',
      'updated_at',
    ];

    const lines = [headers.join(',')];

    for (const row of batch.rows) {
      const a = answers[row.row_id] || defaultAnswer(row.row_id);
      const values = [
        row.batch_id,
        row.row_id,
        row.country_code,
        row.thread_id,
        row.thread_title,
        row.article_id,
        row.published_at,
        row.source,
        row.title,
        row.url,
        a.validatorDecision,
        a.sameThread,
        a.reasonCode,
        a.confidence,
        a.notes,
        a.updatedAt,
      ];
      lines.push(values.map(csvEscape).join(','));
    }

    const blob = new Blob([`\uFEFF${lines.join('\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${batch.batchId.toLowerCase()}-answers.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function submitSnapshot() {
    if (!batch) return;

    setSaving(true);
    setStatus('Сохраняю snapshot...');

    try {
      const response = await fetch('/api/admin/validation/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          batchId: batch.batchId,
          answers,
          meta: {
            totalRows: batch.summary.totalRows,
            completed,
            submittedFrom: 'admin/validation',
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        throw new Error(payload?.error || 'save failed');
      }

      setStatus(`Сохранено: ${payload.filePath}`);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'save failed';
      setStatus(`Ошибка сохранения: ${message}`);
    } finally {
      setSaving(false);
    }
  }

  if (!batch || !current) {
    return (
      <main className="min-h-screen bg-zinc-950 text-zinc-100 p-6">
        <h1 className="text-xl font-semibold">GeoPulse · Validation Admin</h1>
        <p className="mt-2 text-zinc-400">Загружаю batch...</p>
        {status && <p className="mt-3 text-amber-400">{status}</p>}
      </main>
    );
  }

  const answer = answers[current.row_id] || defaultAnswer(current.row_id);
  const progress = Math.round((completed / rows.length) * 100);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100 p-4 md:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <header className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <h1 className="text-xl md:text-2xl font-semibold">GeoPulse · Validation Admin</h1>
          <p className="text-zinc-400 mt-1">Проверка качества кластеров: core / context / noise.</p>

          <div className="mt-3 grid md:grid-cols-4 gap-3 text-sm">
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-zinc-500">Batch</div>
              <div className="font-medium">{batch.batchId}</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-zinc-500">Строк</div>
              <div className="font-medium">{batch.summary.totalRows}</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-zinc-500">Выполнено</div>
              <div className="font-medium">{completed} ({progress}%)</div>
            </div>
            <div className="rounded-lg bg-zinc-900 border border-zinc-800 p-3">
              <div className="text-zinc-500">Страны</div>
              <div className="font-medium">{batch.summary.countries.join(', ')}</div>
            </div>
          </div>

          <div className="mt-3 h-2 bg-zinc-800 rounded-full overflow-hidden">
            <div className="h-full bg-cyan-400" style={{ width: `${progress}%` }} />
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={exportCsv}
              className="px-3 py-2 rounded-lg bg-cyan-300 text-black font-medium hover:bg-cyan-200"
            >
              Экспорт CSV
            </button>
            <button
              onClick={submitSnapshot}
              disabled={saving}
              className="px-3 py-2 rounded-lg bg-zinc-800 border border-zinc-700 hover:border-zinc-500 disabled:opacity-60"
            >
              {saving ? 'Сохраняю...' : 'Сохранить snapshot на сервер'}
            </button>
            {status && <span className="text-sm text-zinc-400 self-center">{status}</span>}
          </div>
        </header>

        <section className="rounded-xl border border-zinc-800 bg-zinc-900/50 p-4">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm text-zinc-400">
              Строка {index + 1} / {rows.length} · country <span className="text-zinc-200">{current.country_code}</span> · thread #{current.thread_id}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setIndex((v) => Math.max(0, v - 1))}
                className="px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500"
              >Назад</button>
              <button
                onClick={() => setIndex((v) => Math.min(rows.length - 1, v + 1))}
                className="px-3 py-1.5 rounded border border-zinc-700 hover:border-zinc-500"
              >Дальше</button>
            </div>
          </div>

          <div className="mt-4 grid lg:grid-cols-2 gap-4">
            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-3">
              <div>
                <div className="text-xs text-zinc-500">Тред</div>
                <div className="font-medium">{current.thread_title}</div>
                <div className="text-xs text-zinc-500 mt-1">thread_key: {current.thread_key}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Вопрос</div>
                <div className="text-zinc-200">{current.focus_question}</div>
              </div>

              <div>
                <div className="text-xs text-zinc-500">Статья</div>
                <div className="text-zinc-100">{current.title}</div>
                <div className="text-xs text-zinc-500 mt-1">
                  {current.published_at} · {current.source} · {current.tier}
                </div>
                <a
                  href={current.url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-block mt-2 text-cyan-300 hover:text-cyan-200 text-sm"
                >
                  Открыть источник ↗
                </a>
              </div>
            </div>

            <div className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-4 space-y-4">
              <div>
                <div className="text-sm text-zinc-400 mb-2">1) Насколько статья про этот сюжет?</div>
                <div className="flex gap-2 flex-wrap">
                  {['core', 'context', 'noise'].map((value) => (
                    <button
                      key={value}
                      onClick={() => updateAnswer({ validatorDecision: value as ValidationAnswer['validatorDecision'] })}
                      className={`px-3 py-2 rounded border ${answer.validatorDecision === value ? 'border-cyan-400 bg-cyan-400/20' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-2">2) Должна ли статья быть в этом треде?</div>
                <div className="flex gap-2">
                  {(['yes', 'no'] as const).map((value) => (
                    <button
                      key={value}
                      onClick={() => updateAnswer({ sameThread: value })}
                      className={`px-3 py-2 rounded border ${answer.sameThread === value ? 'border-cyan-400 bg-cyan-400/20' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2" htmlFor="reason">3) Причина (если no/noise)</label>
                <select
                  id="reason"
                  value={answer.reasonCode}
                  onChange={(event) => updateAnswer({ reasonCode: event.target.value as ValidationReasonCode })}
                  className="w-full rounded bg-zinc-900 border border-zinc-700 px-3 py-2"
                >
                  {REASON_OPTIONS.map((option) => (
                    <option key={option.value || 'empty'} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <div className="text-sm text-zinc-400 mb-2">4) Уверенность</div>
                <div className="flex gap-2">
                  {[1, 2, 3].map((value) => (
                    <button
                      key={value}
                      onClick={() => updateAnswer({ confidence: value as 1 | 2 | 3 })}
                      className={`px-3 py-2 rounded border ${answer.confidence === value ? 'border-cyan-400 bg-cyan-400/20' : 'border-zinc-700 hover:border-zinc-500'}`}
                    >
                      {value}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-sm text-zinc-400 block mb-2" htmlFor="notes">5) Комментарий (опционально)</label>
                <textarea
                  id="notes"
                  value={answer.notes}
                  onChange={(event) => updateAnswer({ notes: event.target.value })}
                  className="w-full min-h-[90px] rounded bg-zinc-900 border border-zinc-700 px-3 py-2"
                  placeholder="Коротко, почему так оценил"
                />
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
