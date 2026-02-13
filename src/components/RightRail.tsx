'use client';

import { useEffect, useState } from 'react';
import { useGraph } from '@/lib/graph-provider';
import { GraphVisualizer } from '@/components/GraphVisualizer';
import { Graph3DPanel } from '@/components/Graph3DPanel';
import { fetchCase, type CaseResponse } from '@/lib/analyst/client';
import { focusToGraphNodeId } from '@/lib/graph/client';

function entityKindLabel(kind: string): string {
  if (kind === 'person') return 'человек';
  if (kind === 'org') return 'организация';
  if (kind === 'place') return 'место';
  if (kind === 'event') return 'событие';
  return kind;
}

export function RightRail() {
  const { state } = useGraph();
  const [tab, setTab] = useState<'graph' | 'graph3d' | 'evidence'>('graph');
  const [workspace, setWorkspace] = useState<CaseResponse | null>(null);

  const narrativeId = state.focus?.nodeType === 'Narrative' ? Number(state.focus.nodeId) : null;
  const graphNodeId = state.focus ? focusToGraphNodeId(state.focus) : null;

  useEffect(() => {
    if (!narrativeId) return;
    fetchCase(narrativeId).then(setWorkspace).catch(() => null);
  }, [narrativeId]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-zinc-800 flex gap-2">
        <button
          onClick={() => setTab('graph')}
          className={`t-meta px-2 py-1 rounded border ${tab === 'graph' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
        >
Связи
        </button>
        <button
          onClick={() => setTab('graph3d')}
          className={`t-meta px-2 py-1 rounded border ${tab === 'graph3d' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
        >
Карта
        </button>
        <button
          onClick={() => setTab('evidence')}
          className={`t-meta px-2 py-1 rounded border ${tab === 'evidence' ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-200' : 'border-zinc-700 bg-zinc-900 text-zinc-400'}`}
        >
Подтверждения
        </button>
      </div>

      {tab === 'graph' && (
        <div className="flex-1 overflow-y-auto">
          <GraphVisualizer />
        </div>
      )}

      {tab === 'graph3d' && (
        <div className="flex-1 overflow-hidden">
          <Graph3DPanel nodeId={graphNodeId} />
        </div>
      )}

      {tab === 'evidence' && (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="t-body text-zinc-300 mb-2">Что подтверждает этот сюжет</h3>
          {!narrativeId && (
            <div className="t-meta text-zinc-500">Сначала открой сюжет, и здесь появятся подтверждения.</div>
          )}
          {narrativeId && !workspace && (
            <div className="t-meta text-zinc-500">Загружаю подтверждения…</div>
          )}
          {workspace && (
            <div className="space-y-2">
              {workspace.entities.slice(0, 12).map((e) => (
                <div key={e.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="t-body text-white line-clamp-2">{e.label}</div>
                  <div className="t-meta text-zinc-500">{entityKindLabel(e.kind)} · связь: {e.relation} · уверенность: {e.confidence.toFixed(2)}</div>
                  <div className="text-[11px] text-zinc-600 line-clamp-2">{e.evidence.join(', ')}</div>
                </div>
              ))}
              {workspace.entities.length === 0 && (
                <div className="t-meta text-zinc-500">Пока нет извлечённых evidence-связей.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
