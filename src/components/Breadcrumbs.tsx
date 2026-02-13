'use client';

import { useGraph } from '@/lib/graph-provider';
import { COUNTRIES, NARRATIVES } from '@/mock/data';
import type { GraphFocus } from '@/types/ontology';

function focusLabel(f: GraphFocus): string {
  switch (f.nodeType) {
    case 'Country': {
      const c = COUNTRIES.find(c => c.id === f.nodeId);
      return c ? `${c.flag} ${c.nameRu}` : String(f.nodeId);
    }
    case 'Narrative': {
      const n = NARRATIVES.find(n => n.id === f.nodeId);
      return n ? n.titleRu : `Сюжет #${f.nodeId}`;
    }
    case 'Article': return `Статья #${f.nodeId}`;
    case 'Channel': return `Канал #${f.nodeId}`;
    case 'VoxComment': return `Коммент #${f.nodeId}`;
    case 'Event': return `Событие #${f.nodeId}`;
    default: return String(f.nodeId);
  }
}

function viaLabel(via: GraphFocus['via']): string | null {
  if (!via) return null;
  const relations: Record<string, string> = {
    has_narratives: '→ сюжеты',
    has_articles: '→ статьи',
    has_channels: '→ каналы',
    has_comments: '→ комменты',
    has_temperature: '→ температура',
    has_events: '→ события',
    contains_articles: '→ статьи',
    published_by: '→ канал',
    belongs_to_narrative: '→ сюжет',
    comments_on: '→ статья',
  };
  return relations[via.relation] || `→ ${via.relation}`;
}

export function Breadcrumbs() {
  const { breadcrumbs, navigate, goBack, canGoBack, canGoForward, goForward, reset } = useGraph();

  if (breadcrumbs.length === 0) return null;

  return (
    <nav className="flex items-center gap-1 text-sm px-4 py-2 bg-zinc-950/70 border-b border-zinc-800">
      <button
        onClick={reset}
        className="text-zinc-500 hover:text-white transition-colors mr-1"
        title="На главную"
      >
        🏠
      </button>
      
      <button
        onClick={goBack}
        disabled={!canGoBack}
        className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors"
        title="Назад"
      >
        ←
      </button>
      <button
        onClick={goForward}
        disabled={!canGoForward}
        className="text-zinc-500 hover:text-white disabled:opacity-30 transition-colors mr-2"
        title="Вперёд"
      >
        →
      </button>

      {breadcrumbs.map((crumb, i) => {
        const isLast = i === breadcrumbs.length - 1;
        const via = viaLabel(crumb.via);
        return (
          <span key={i} className="flex items-center gap-1">
            {i > 0 && <span className="text-zinc-600 mx-1">/</span>}
            {via && <span className="text-zinc-600 text-xs">{via}</span>}
            <button
              onClick={() => !isLast && navigate(crumb.nodeType, crumb.nodeId, crumb.via)}
              className={`${
                isLast
                  ? 'text-white font-medium'
                  : 'text-zinc-400 hover:text-white'
              } transition-colors`}
            >
              {focusLabel(crumb)}
            </button>
          </span>
        );
      })}
    </nav>
  );
}
