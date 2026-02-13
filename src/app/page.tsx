'use client';

import { Suspense, useEffect, useState } from 'react';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { CountryGrid } from '@/components/CountryGrid';
import { NarrativeList } from '@/components/NarrativeList';
import { DetailPanel } from '@/components/DetailPanel';
import { RightRail } from '@/components/RightRail';
import { useGraph } from '@/lib/graph-provider';
import { useUrlSync } from '@/lib/url-sync';
import { fetchGraphHealth } from '@/lib/graph/client';
import { fetchTriage, type TriageResponse } from '@/lib/analyst/client';
import { getCountry, getNarrative } from '@/mock/data';

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

function AnalystTriageBar() {
  const { navigate, state } = useGraph();
  const [triage, setTriage] = useState<TriageResponse | null>(null);

  useEffect(() => {
    fetchTriage().then(setTriage).catch(() => null);
  }, []);

  useEffect(() => {
    if (!triage || triage.escalations.length === 0) return;
    if (state.focus) return;

    const top = triage.escalations[0];
    navigate('Narrative', top.narrativeId, {
      relation: 'triage_autostart',
      fromType: 'Country',
      fromId: top.countries[0] || 'N/A',
    });
  }, [triage, state.focus, navigate]);

  if (!triage) {
    return (
      <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950 text-xs text-zinc-500">
        Analyst Home: loading...
      </div>
    );
  }

  return (
    <div className="px-4 py-2 border-b border-zinc-800 bg-zinc-950/80">
      <div className="flex items-center justify-between mb-2">
        <div className="text-xs text-zinc-400">🎯 Analyst Home · triage</div>
        <div className="text-xs text-zinc-500">quality: {triage.quality.status} · alias conflicts {triage.quality.aliasConflicts}</div>
      </div>
      <div className="flex gap-2 overflow-x-auto pb-1">
        {triage.escalations.slice(0, 6).map((item) => (
          <button
            key={item.narrativeId}
            onClick={() => navigate('Narrative', item.narrativeId, { relation: 'triage_open_case', fromType: 'Country', fromId: item.countries[0] || 'N/A' })}
            className="text-left p-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 min-w-[300px]"
          >
            <div className="text-xs text-orange-300">⚡ escalation {item.divergence}%</div>
            <div className="text-sm text-white line-clamp-1">{item.title}</div>
            <div className="text-xs text-zinc-500">case #{item.narrativeId} · {item.status}</div>
          </button>
        ))}
      </div>
    </div>
  );
}

function ActiveCaseHeader() {
  const { state } = useGraph();

  if (!state.focus || state.focus.nodeType !== 'Narrative') {
    return null;
  }

  const n = getNarrative(Number(state.focus.nodeId));
  if (!n) return null;

  const countryLabels = n.countries
    .map((cid) => getCountry(cid))
    .filter(Boolean)
    .map((c) => `${c!.flag} ${c!.nameRu}`)
    .join(' · ');

  return (
    <div className="sticky top-0 z-10 mb-3 rounded-xl border border-zinc-800 bg-zinc-950/95 px-3 py-2 backdrop-blur">
      <div className="text-xs text-zinc-500">Active Case</div>
      <div className="text-sm text-white font-semibold line-clamp-1">{n.titleRu}</div>
      <div className="text-xs text-zinc-500">{countryLabels} · divergence {n.divergenceScore}%</div>
    </div>
  );
}

export default function Home() {
  const [leftCollapsed, setLeftCollapsed] = useState(false);

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
          <button
            onClick={() => setLeftCollapsed((v) => !v)}
            className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
            title="Toggle left panel"
          >
            {leftCollapsed ? '☰ Show rail' : '☰ Hide rail'}
          </button>
          <span className="px-2 py-1 rounded bg-zinc-800">🧬 Ontology v1</span>
          <span className="px-2 py-1 rounded bg-zinc-800">8 стран · 5 сюжетов · 10 статей</span>
          <GraphHealthBadge />
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Filters */}
      <FilterBar />

      {/* Analyst Triage */}
      <AnalystTriageBar />

      {/* Main content — 3-column layout */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left: Countries + Narratives */}
        <div className={`${leftCollapsed ? 'w-0 border-r-0' : 'w-72 border-r'} border-zinc-800 overflow-hidden flex-shrink-0 transition-all duration-200`}>
          {!leftCollapsed && (
            <div className="h-full overflow-y-auto">
              <CountryGrid />
              <div className="border-t border-zinc-800">
                <NarrativeList />
              </div>
            </div>
          )}
        </div>

        {/* Center: Active Case Workspace */}
        <div className="flex-1 overflow-y-auto p-4">
          <ActiveCaseHeader />
          <DetailPanel />
        </div>

        {/* Right: Graph / Evidence */}
        <div className="w-64 border-l border-zinc-800 overflow-y-auto flex-shrink-0">
          <RightRail />
        </div>
      </div>
    </div>
  );
}
