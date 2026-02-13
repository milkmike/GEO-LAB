'use client';

import { useEffect, useMemo, useState } from 'react';
import { useGraph } from '@/lib/graph-provider';
import { getCountry } from '@/mock/data';
import { fetchNeighbors, focusToGraphNodeId } from '@/lib/graph/client';
import type { NeighborsResponse } from '@/lib/graph/types';
import type { NodeType } from '@/types/ontology';

function NodeTypeLabel({ type, id }: { type: NodeType; id: string | number }) {
  switch (type) {
    case 'Country': {
      const c = getCountry(String(id));
      return <span>{c?.flag} {c?.nameRu || id}</span>;
    }
    case 'Narrative':
      return <span>📰 Сюжет №{id}</span>;
    case 'Article':
      return <span>📄 Статья №{id}</span>;
    default:
      return <span>{type} #{id}</span>;
  }
}

export function GraphVisualizer() {
  const { state, navigate } = useGraph();
  const [error, setError] = useState<string | null>(null);
  const [neighbors, setNeighbors] = useState<NeighborsResponse['neighbors']>([]);

  const graphNodeId = useMemo(() => {
    if (!state.focus) return null;
    return focusToGraphNodeId(state.focus);
  }, [state.focus]);

  useEffect(() => {
    if (!graphNodeId) return;

    let cancelled = false;

    fetchNeighbors(graphNodeId)
      .then((data) => {
        if (!cancelled) {
          setNeighbors(data.neighbors || []);
          setError(null);
        }
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setError(e instanceof Error ? e.message : 'Не удалось загрузить связи');
          setNeighbors([]);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [graphNodeId]);

  if (!state.focus) {
    return (
      <div className="p-4">
        <h2 className="t-display font-semibold text-white mb-3">🕸️ Карта связей</h2>
        <div className="t-body text-zinc-500 text-center py-8">
          Выберите объект чтобы увидеть его связи
        </div>
      </div>
    );
  }

  const grouped = neighbors.reduce<Record<string, number>>((acc, n) => {
    acc[n.relation] = (acc[n.relation] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="p-4">
      <h2 className="t-display font-semibold text-white mb-3">🕸️ Карта связей</h2>

      <div className="text-center mb-4">
        <div className="inline-block px-4 py-2 rounded-xl bg-blue-500/20 border border-blue-500/50">
          <div className="t-body font-medium text-blue-300">
            <NodeTypeLabel type={state.focus.nodeType} id={state.focus.nodeId} />
          </div>
          <div className="t-meta text-blue-400/60">{graphNodeId}</div>
        </div>
      </div>

      {error && <div className="t-meta text-red-400 mb-3">{error}</div>}

      {!error && (
        <>
          <div className="space-y-2 mb-4">
            {Object.entries(grouped).map(([relation, count]) => (
              <div key={relation} className="flex items-center justify-between p-2 rounded-lg bg-zinc-800/50">
                <span className="t-body text-zinc-300">{relation}</span>
                <span className="t-body text-white font-semibold">{count}</span>
              </div>
            ))}
            {neighbors.length === 0 && (
              <div className="t-meta text-zinc-500">Связей пока нет</div>
            )}
          </div>

          <div className="space-y-2 max-h-64 overflow-y-auto">
            {neighbors.slice(0, 40).map((n, i) => (
              <button
                key={`${n.node.id}:${i}`}
                className="w-full text-left p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 transition-colors"
                onClick={() => {
                  const [kind, rawId] = n.node.id.split(':');
                  if (!kind || !rawId) return;
                  if (kind === 'country') navigate('Country', rawId, { relation: n.relation, fromType: state.focus!.nodeType, fromId: state.focus!.nodeId });
                  if (kind === 'narrative') navigate('Narrative', Number(rawId), { relation: n.relation, fromType: state.focus!.nodeType, fromId: state.focus!.nodeId });
                  if (kind === 'article') navigate('Article', Number(rawId), { relation: n.relation, fromType: state.focus!.nodeType, fromId: state.focus!.nodeId });
                }}
              >
                <div className="t-meta text-zinc-500">{n.relation} · уверенность: {n.confidence.toFixed(2)}</div>
                <div className="t-body text-white line-clamp-2">{n.node.label}</div>
              </button>
            ))}
          </div>
        </>
      )}

      {state.history.length > 1 && (
        <div className="mt-6">
          <h3 className="t-meta font-semibold text-zinc-500 mb-2 uppercase tracking-wider">Путь навигации</h3>
          <div className="space-y-1">
            {state.history.map((h, i) => (
              <button
                key={i}
                onClick={() => navigate(h.nodeType, h.nodeId, h.via)}
                className={`w-full text-left t-meta p-1.5 rounded transition-colors ${
                  i === state.historyIndex
                    ? 'text-blue-300 bg-blue-500/10'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                {i + 1}. <NodeTypeLabel type={h.nodeType} id={h.nodeId} />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
