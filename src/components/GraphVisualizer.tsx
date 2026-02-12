'use client';

import { useGraph } from '@/lib/graph-provider';
import { COUNTRIES, NARRATIVES, ARTICLES, CHANNELS, VOX_COMMENTS, EVENTS, getCountry } from '@/mock/data';
import type { NodeType } from '@/types/ontology';

/**
 * Визуализация связей текущего фокуса — какие объекты связаны и как.
 * Не force-directed graph (это позже), а информативная панель связей.
 */

interface LinkGroup {
  targetType: NodeType;
  relation: string;
  count: number;
  label: string;
  emoji: string;
}

function getLinksForFocus(nodeType: NodeType, nodeId: string | number): LinkGroup[] {
  switch (nodeType) {
    case 'Country': {
      const cid = String(nodeId);
      return [
        { targetType: 'Narrative', relation: 'has_narratives', count: NARRATIVES.filter(n => n.countries.includes(cid)).length, label: 'Сюжеты', emoji: '📰' },
        { targetType: 'Article', relation: 'has_articles', count: ARTICLES.filter(a => a.countryId === cid).length, label: 'Статьи', emoji: '📄' },
        { targetType: 'Channel', relation: 'has_channels', count: CHANNELS.filter(c => c.countryId === cid).length, label: 'Каналы', emoji: '📡' },
        { targetType: 'VoxComment', relation: 'has_comments', count: VOX_COMMENTS.filter(c => c.countryId === cid).length, label: 'Комменты', emoji: '💬' },
        { targetType: 'Event', relation: 'has_events', count: EVENTS.filter(e => e.countryId === cid).length, label: 'События', emoji: '🔥' },
      ];
    }
    case 'Narrative': {
      const nid = Number(nodeId);
      const n = NARRATIVES.find(x => x.id === nid);
      return [
        { targetType: 'Country', relation: 'spans_countries', count: n?.countries.length ?? 0, label: 'Страны', emoji: '🌍' },
        { targetType: 'Article', relation: 'contains_articles', count: ARTICLES.filter(a => a.narrativeId === nid).length, label: 'Статьи', emoji: '📄' },
        { targetType: 'Event', relation: 'triggered_by', count: EVENTS.filter(e => e.relatedNarrativeIds.includes(nid)).length, label: 'События', emoji: '🔥' },
      ];
    }
    case 'Article': {
      const aid = Number(nodeId);
      const a = ARTICLES.find(x => x.id === aid);
      return [
        { targetType: 'Country', relation: 'about_country', count: a ? 1 : 0, label: 'Страна', emoji: '🌍' },
        { targetType: 'Channel', relation: 'published_by', count: a ? 1 : 0, label: 'Канал', emoji: '📡' },
        { targetType: 'Narrative', relation: 'belongs_to_narrative', count: a?.narrativeId ? 1 : 0, label: 'Сюжет', emoji: '📰' },
        { targetType: 'VoxComment', relation: 'has_comments', count: VOX_COMMENTS.filter(c => c.articleId === aid).length, label: 'Комменты', emoji: '💬' },
      ];
    }
    default:
      return [];
  }
}

function NodeTypeLabel({ type, id }: { type: NodeType; id: string | number }) {
  switch (type) {
    case 'Country': {
      const c = getCountry(String(id));
      return <span>{c?.flag} {c?.nameRu || id}</span>;
    }
    case 'Narrative': {
      const n = NARRATIVES.find(x => x.id === Number(id));
      return <span>📰 {n?.titleRu || `#${id}`}</span>;
    }
    case 'Article': {
      const a = ARTICLES.find(x => x.id === Number(id));
      return <span className="line-clamp-1">📄 {a?.title || `#${id}`}</span>;
    }
    default:
      return <span>{type} #{id}</span>;
  }
}

export function GraphVisualizer() {
  const { state, navigate } = useGraph();

  if (!state.focus) {
    return (
      <div className="p-4">
        <h2 className="text-lg font-semibold text-white mb-3">🕸️ Граф связей</h2>
        <div className="text-sm text-zinc-500 text-center py-8">
          Выберите объект чтобы увидеть его связи
        </div>
      </div>
    );
  }

  const links = getLinksForFocus(state.focus.nodeType, state.focus.nodeId);
  const activeLinks = links.filter(l => l.count > 0);

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-3">🕸️ Граф связей</h2>
      
      {/* Current node */}
      <div className="text-center mb-4">
        <div className="inline-block px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/50">
          <div className="text-sm font-medium text-blue-300">
            <NodeTypeLabel type={state.focus.nodeType} id={state.focus.nodeId} />
          </div>
          <div className="text-xs text-blue-400/60">{state.focus.nodeType}</div>
        </div>
      </div>

      {/* Links */}
      <div className="space-y-2">
        {activeLinks.map(link => (
          <div 
            key={link.relation}
            className="flex items-center gap-3 p-2 rounded-lg bg-zinc-800/50 hover:bg-zinc-800 transition-colors"
          >
            <span className="text-lg">{link.emoji}</span>
            <div className="flex-1">
              <div className="text-sm text-white">{link.label}</div>
              <div className="text-xs text-zinc-500">{link.relation}</div>
            </div>
            <div className="text-lg font-bold text-white">{link.count}</div>
          </div>
        ))}
      </div>

      {/* Navigation history */}
      {state.history.length > 1 && (
        <div className="mt-6">
          <h3 className="text-xs font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Путь навигации</h3>
          <div className="space-y-1">
            {state.history.map((h, i) => (
              <button
                key={i}
                onClick={() => navigate(h.nodeType, h.nodeId, h.via)}
                className={`w-full text-left text-xs p-1.5 rounded transition-colors ${
                  i === state.historyIndex 
                    ? 'text-blue-300 bg-blue-500/10' 
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {i + 1}. <NodeTypeLabel type={h.nodeType} id={h.nodeId} />
                {h.via && <span className="text-zinc-600 ml-1">via {h.via.relation}</span>}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
