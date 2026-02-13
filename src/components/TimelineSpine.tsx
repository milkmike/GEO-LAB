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
type KindFilter = 'all' | 'event' | 'article';
type SortMode = 'new' | 'old';

function weekKey(date: Date): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getUTCFullYear()}-W${weekNo}`;
}

function itemKind(id: string): KindFilter {
  if (id.startsWith('event:')) return 'event';
  if (id.startsWith('article:')) return 'article';
  return 'all';
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
  const [onlyTurning, setOnlyTurning] = useState(false);
  const [kind, setKind] = useState<KindFilter>('all');
  const [sort, setSort] = useState<SortMode>('new');
  const [query, setQuery] = useState('');

  const processed = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    const base = [...items]
      .filter((item) => (kind === 'all' ? true : itemKind(item.id) === kind))
      .filter((item) => (onlyTurning ? Boolean(item.isTurningPoint) : true))
      .filter((item) => {
        if (!normalizedQuery) return true;
        const hay = `${item.title} ${item.meta || ''}`.toLowerCase();
        return hay.includes(normalizedQuery);
      })
      .sort((a, b) => {
        const delta = new Date(b.date).getTime() - new Date(a.date).getTime();
        return sort === 'new' ? delta : -delta;
      });

    if (zoom === 'day') {
      return base;
    }

    const buckets = new Map<string, SpineItem[]>();
    for (const item of base) {
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
        meta: rest > 0
          ? `${head.meta ? `${head.meta} · ` : ''}ещё ${rest} событий в этом периоде`
          : head.meta,
      });
    }

    return collapsed;
  }, [items, kind, onlyTurning, query, sort, zoom]);

  const turningCount = useMemo(
    () => processed.filter((i) => i.isTurningPoint).length,
    [processed],
  );

  const rangeLabel = useMemo(() => {
    if (!processed.length) return 'нет данных';
    const maxDate = new Date(processed[0].date);
    const minDate = new Date(processed[processed.length - 1].date);
    const minStr = minDate.toLocaleDateString('ru');
    const maxStr = maxDate.toLocaleDateString('ru');
    return `${minStr} — ${maxStr}`;
  }, [processed]);

  if (!items.length) {
    return <div className="t-body text-zinc-500 text-center py-8">{emptyText}</div>;
  }

  return (
    <section className="relative py-2 min-h-[52vh]">
      <div className="g-panel rounded-2xl p-3 mb-3 space-y-3">
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="t-meta text-zinc-500">Супер-таймлиния: настраиваемый вид</div>
          <div className="flex items-center gap-1">
            {([
              ['day', 'день'],
              ['week', 'неделя'],
              ['month', 'месяц'],
            ] as Array<[ZoomLevel, string]>).map(([v, label]) => (
              <button
                key={v}
                onClick={() => setZoom(v)}
                className={`t-meta px-2 py-1 rounded border ${zoom === v ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Поиск по событиям"
            className="t-meta px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-200 w-56"
          />

          <select
            value={kind}
            onChange={(e) => setKind(e.target.value as KindFilter)}
            className="t-meta px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300"
          >
            <option value="all">все типы</option>
            <option value="event">только события</option>
            <option value="article">только материалы</option>
          </select>

          <button
            onClick={() => setOnlyTurning((v) => !v)}
            className={`t-meta px-2 py-1 rounded border ${onlyTurning ? 'border-amber-500/50 bg-amber-500/10 text-amber-200' : 'border-zinc-700 text-zinc-400 hover:border-zinc-500'}`}
          >
            переломные точки
          </button>

          <button
            onClick={() => setSort((v) => (v === 'new' ? 'old' : 'new'))}
            className="t-meta px-2 py-1 rounded border border-zinc-700 text-zinc-400 hover:border-zinc-500"
          >
            {sort === 'new' ? 'сначала новые' : 'сначала старые'}
          </button>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <span className="t-meta px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">событий: {processed.length}</span>
          <span className="t-meta px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">переломных: {turningCount}</span>
          <span className="t-meta px-2 py-1 rounded border border-zinc-700 bg-zinc-900 text-zinc-300">диапазон: {rangeLabel}</span>
        </div>
      </div>

      {!processed.length && (
        <div className="t-body text-zinc-500 text-center py-8">Нет событий под текущие фильтры.</div>
      )}

      {processed.length > 0 && (
        <div className="relative">
          <div className="absolute inset-y-12 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-400/20 via-cyan-300/60 to-cyan-400/20" />

          <div className="space-y-1 pr-0 md:pr-10">
            {processed.map((item, i) => {
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
                    className={`w-[90%] md:w-[44%] rounded-2xl border bg-zinc-950/65 p-3 transition-all ${highlighted ? 'border-cyan-400/70 -translate-y-0.5 shadow-[0_0_0_1px_rgba(34,211,238,0.25)]' : 'border-zinc-800/80 hover:border-cyan-500/50'}`}
                  >
                    <div className="t-meta text-zinc-500">{new Date(item.date).toLocaleDateString('ru')}</div>
                    {turning && <div className="t-meta text-amber-300 mt-0.5">переломный момент</div>}
                    <h3 className="t-body text-white mt-1">{item.title}</h3>
                    {item.meta && <div className="t-meta text-zinc-400 mt-1">{item.meta}</div>}

                    {item.cta && onOpen && (
                      <button
                        onClick={() => onOpen(item.id)}
                        className="mt-2 t-meta px-2 py-1 rounded border border-zinc-700 text-zinc-300 hover:border-cyan-500/50"
                      >
                        {item.cta}
                      </button>
                    )}
                  </article>
                </div>
              );
            })}
          </div>

          <div className="hidden md:flex absolute right-0 top-12 bottom-0 w-8 flex-col items-center justify-start gap-1">
            {processed.slice(0, 24).map((item) => {
              const turning = item.isTurningPoint;
              const active = activeId === item.id;
              return (
                <button
                  key={`map-${item.id}`}
                  title={item.title}
                  onMouseEnter={() => setActiveId(item.id)}
                  onMouseLeave={() => setActiveId((prev) => (prev === item.id ? null : prev))}
                  className={`h-2.5 w-2.5 rounded-full transition-all ${turning ? 'bg-amber-300/90' : 'bg-cyan-300/70'} ${active ? 'scale-125 ring-2 ring-cyan-300/40' : 'opacity-70 hover:opacity-100'}`}
                />
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
