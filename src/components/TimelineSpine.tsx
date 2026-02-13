'use client';

import { useMemo, useState } from 'react';

export type SpineItem = {
  id: string;
  title: string;
  date: string;
  meta?: string;
  cta?: string;
  isTurningPoint?: boolean;
};

type ZoomLevel = 'day' | 'week' | 'month';

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

export function TimelineSpine({
  items,
  emptyText,
  onOpen,
}: {
  items: SpineItem[];
  emptyText: string;
  onOpen?: (id: string) => void;
}) {
  const [zoom, setZoom] = useState<ZoomLevel>('day');
  const [activeId, setActiveId] = useState<string | null>(null);

  const visibleItems = useMemo(() => {
    const sorted = [...items].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (zoom === 'day') return sorted;

    const buckets = new Map<string, SpineItem[]>();
    for (const item of sorted) {
      const d = new Date(item.date);
      const key = zoom === 'week'
        ? weekKey(d)
        : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

      const arr = buckets.get(key) || [];
      arr.push(item);
      buckets.set(key, arr);
    }

    const collapsed: SpineItem[] = [];
    for (const [, bucketItems] of buckets) {
      const head = bucketItems[0];
      const rest = bucketItems.length - 1;
      collapsed.push({
        ...head,
        meta: rest > 0 ? `${head.meta ? `${head.meta} · ` : ''}+${rest} событий` : head.meta,
      });
    }

    return collapsed;
  }, [items, zoom]);

  if (!items.length) {
    return <div className="t-body text-zinc-500 text-center py-8">{emptyText}</div>;
  }

  return (
    <section className="relative py-2 min-h-[52vh]">
      <div className="flex justify-end mb-2">
        <div className="inline-flex gap-1 rounded-lg border border-zinc-800 bg-zinc-950/70 p-1">
          {([
            ['day', 'день'],
            ['week', 'неделя'],
            ['month', 'месяц'],
          ] as Array<[ZoomLevel, string]>).map(([v, label]) => (
            <button
              key={v}
              onClick={() => setZoom(v)}
              className={`t-meta px-2 py-1 rounded ${zoom === v ? 'bg-cyan-500/15 text-cyan-200' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {!visibleItems.length && (
        <div className="t-body text-zinc-500 text-center py-8">Нет событий для выбранного масштаба.</div>
      )}

      {visibleItems.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-10 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-400/20 via-cyan-300/55 to-cyan-400/20" />

          <div className="space-y-1">
            {visibleItems.map((item, i) => {
              const side = i % 2 === 0 ? 'md:justify-start' : 'md:justify-end';
              const highlighted = activeId === item.id;
              const turning = item.isTurningPoint || i === 0;

              return (
                <div key={item.id} className={`relative flex ${side} justify-center w-full py-2`}>
                  <span
                    className={`absolute left-1/2 top-6 -translate-x-1/2 h-3 w-3 rounded-full ring-4 transition-all ${turning ? 'bg-amber-300 ring-amber-500/30' : 'bg-cyan-200 ring-cyan-500/30'} ${highlighted ? 'scale-125' : ''}`}
                  />

                  <article
                    onMouseEnter={() => setActiveId(item.id)}
                    onMouseLeave={() => setActiveId((prev) => (prev === item.id ? null : prev))}
                    className={`w-[90%] md:w-[44%] rounded-2xl border bg-zinc-950/60 p-3 transition-all ${highlighted ? 'border-cyan-400/60 -translate-y-0.5' : 'border-zinc-800/80 hover:border-cyan-500/40'}`}
                  >
                    <div className="t-meta text-zinc-500">{new Date(item.date).toLocaleDateString('ru')}</div>
                    <h3 className="t-body text-white mt-1">{item.title}</h3>
                    {item.meta && <div className="t-meta text-zinc-400 mt-1">{item.meta}</div>}

                    {item.cta && onOpen && (
                      <button
                        onClick={() => onOpen(item.id)}
                        className="mt-2 t-meta px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-cyan-500/40"
                      >
                        {item.cta}
                      </button>
                    )}
                  </article>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
