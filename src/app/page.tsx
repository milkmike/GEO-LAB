'use client';

import { Suspense, useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CountryGrid } from '@/components/CountryGrid';
import { NarrativeList } from '@/components/NarrativeList';
import { DetailPanel } from '@/components/DetailPanel';
import { GraphVisualizer } from '@/components/GraphVisualizer';
import { useGraph } from '@/lib/graph-provider';
import { useUrlSync } from '@/lib/url-sync';
import { fetchGraphHealth } from '@/lib/graph/client';

function UrlSyncWrapper() {
  useUrlSync();
  return null;
}

function GraphHealthBadge() {
  const [health, setHealth] = useState<{ status: string; entities: number; edges: number } | null>(null);

  useEffect(() => {
    fetchGraphHealth().then(setHealth).catch(() => null);
  }, []);

  if (!health) {
    return <span className="px-2 py-1 rounded bg-zinc-800 text-zinc-500">graph: ...</span>;
  }

  return (
    <span className={`px-2 py-1 rounded ${health.status === 'ok' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'}`}>
      graph: {health.status} · {health.entities}N/{health.edges}E
    </span>
  );
}

function FilterBar() {
  const { state, clearFilters } = useGraph();
  const hasFilters = Object.keys(state.filters).length > 0;
  
  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-zinc-800 bg-zinc-950">
      <span className="text-xs text-zinc-500">🔍 Фильтры:</span>
      {state.filters.countries?.map(c => (
        <span key={c} className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-300">{c}</span>
      ))}
      {state.filters.search && (
        <span className="text-xs px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300">
          &ldquo;{state.filters.search}&rdquo;
        </span>
      )}
      {state.filters.stance?.map(s => (
        <span key={s} className="text-xs px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-300">{s}</span>
      ))}
      {hasFilters && (
        <button onClick={clearFilters} className="text-xs text-zinc-500 hover:text-white ml-auto">
          ✕ Очистить
        </button>
      )}
      {!hasFilters && (
        <span className="text-xs text-zinc-600">нет активных фильтров</span>
      )}
    </div>
  );
}

export default function Home() {
  return (
    <div className="h-screen flex flex-col overflow-hidden">
      <Suspense fallback={null}>
        <UrlSyncWrapper />
      </Suspense>
      
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-950 px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🐙</span>
        <div>
          <h1 className="text-lg font-bold text-white">GeoPulse Lab</h1>
          <p className="text-xs text-zinc-500">Ontology Graph · Прототип связей виджетов</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
          <span className="px-2 py-1 rounded bg-zinc-800">🧬 Ontology v1</span>
          <span className="px-2 py-1 rounded bg-zinc-800">8 стран · 5 сюжетов · 10 статей</span>
          <GraphHealthBadge />
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Filters */}
      <FilterBar />

      {/* Main content — 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Countries + Narratives */}
        <div className="w-80 border-r border-zinc-800 overflow-y-auto flex-shrink-0">
          <CountryGrid />
          <div className="border-t border-zinc-800">
            <NarrativeList />
          </div>
        </div>

        {/* Center: Detail Panel */}
        <div className="flex-1 overflow-y-auto p-4">
          <DetailPanel />
        </div>

        {/* Right: Graph Visualizer */}
        <div className="w-72 border-l border-zinc-800 overflow-y-auto flex-shrink-0">
          <GraphVisualizer />
        </div>
      </div>
    </div>
  );
}
