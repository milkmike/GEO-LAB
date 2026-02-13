'use client';

export type SpineItem = {
  id: string;
  title: string;
  date: string;
  meta?: string;
  cta?: string;
};

export function TimelineSpine({
  items,
  emptyText,
  onOpen,
}: {
  items: SpineItem[];
  emptyText: string;
  onOpen?: (id: string) => void;
}) {
  if (!items.length) {
    return <div className="t-body text-zinc-500 text-center py-8">{emptyText}</div>;
  }

  return (
    <section className="relative py-2 min-h-[50vh]">
      <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-gradient-to-b from-cyan-400/20 via-cyan-300/60 to-cyan-400/20" />

      <div className="space-y-1">
        {items.map((item, i) => {
          const side = i % 2 === 0 ? 'md:justify-start' : 'md:justify-end';
          return (
            <div key={item.id} className={`relative flex ${side} justify-center w-full py-2`}>
              <span className="absolute left-1/2 top-6 -translate-x-1/2 h-3 w-3 rounded-full bg-cyan-200 ring-4 ring-cyan-500/30" />

              <article className="w-[90%] md:w-[44%] rounded-2xl border border-zinc-800/80 bg-zinc-950/65 p-3 hover:border-cyan-500/50 transition-colors">
                <div className="t-meta text-zinc-500">{new Date(item.date).toLocaleDateString('ru')}</div>
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
    </section>
  );
}
