'use client';

import { useEffect, useState } from 'react';
import { useGraph } from '@/lib/graph-provider';
import { GraphVisualizer } from '@/components/GraphVisualizer';
import { fetchCase, type CaseResponse } from '@/lib/analyst/client';

export function RightRail() {
  const { state } = useGraph();
  const [tab, setTab] = useState<'graph' | 'evidence'>('graph');
  const [workspace, setWorkspace] = useState<CaseResponse | null>(null);

  const narrativeId = state.focus?.nodeType === 'Narrative' ? Number(state.focus.nodeId) : null;

  useEffect(() => {
    if (!narrativeId) return;
    fetchCase(narrativeId).then(setWorkspace).catch(() => null);
  }, [narrativeId]);

  return (
    <div className="h-full flex flex-col">
      <div className="p-2 border-b border-zinc-800 flex gap-2">
        <button
          onClick={() => setTab('graph')}
          className={`text-xs px-2 py-1 rounded ${tab === 'graph' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'}`}
        >
          Graph
        </button>
        <button
          onClick={() => setTab('evidence')}
          className={`text-xs px-2 py-1 rounded ${tab === 'evidence' ? 'bg-zinc-700 text-white' : 'bg-zinc-900 text-zinc-400'}`}
        >
          Evidence
        </button>
      </div>

      {tab === 'graph' ? (
        <div className="flex-1 overflow-y-auto">
          <GraphVisualizer />
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto p-3">
          <h3 className="text-sm text-zinc-300 mb-2">Evidence panel</h3>
          {!narrativeId && (
            <div className="text-xs text-zinc-500">Открой сюжет из triage, чтобы увидеть evidence.</div>
          )}
          {narrativeId && !workspace && (
            <div className="text-xs text-zinc-500">Загрузка evidence...</div>
          )}
          {workspace && (
            <div className="space-y-2">
              {workspace.entities.slice(0, 12).map((e) => (
                <div key={e.id} className="p-2 rounded-lg bg-zinc-900 border border-zinc-800">
                  <div className="text-sm text-white line-clamp-2">{e.label}</div>
                  <div className="text-xs text-zinc-500">{e.kind} · {e.relation} · conf {e.confidence.toFixed(2)}</div>
                  <div className="text-[11px] text-zinc-600 line-clamp-2">{e.evidence.join(', ')}</div>
                </div>
              ))}
              {workspace.entities.length === 0 && (
                <div className="text-xs text-zinc-500">Пока нет извлечённых evidence-связей.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
