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
    return <span className="g-chip text-zinc-500">Состояние системы: проверка…</span>;
  }

  return (
    <span className={`g-chip ${health.status === 'ok' ? 'text-green-300 border-green-500/40' : 'text-yellow-300 border-yellow-500/40'}`}>
      {health.status === 'ok' ? 'Система: всё стабильно' : 'Система: есть нюансы'}
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

function SignalDeck({ landing = false }: { landing?: boolean }) {
  const { navigate } = useGraph();
  const [triage, setTriage] = useState<TriageResponse | null>(null);

  useEffect(() => {
    fetchTriage().then(setTriage).catch(() => null);
  }, []);

  if (!triage) {
    return (
      <div className="px-4 py-3 text-sm text-zinc-500">Подбираю главную тему…</div>
    );
  }

  const hero = triage.escalations[0];
  const next = triage.escalations.slice(1, 4);

  if (!hero) return null;

  return (
    <div className={`${landing ? 'p-6 md:p-10' : 'px-4 py-2 border-b border-zinc-800 bg-zinc-950/70'}`}>
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-3">
          <div className="g-kicker">Главная повестка</div>
          <div className="text-xs text-zinc-500">Качество данных: {triage.quality.status === 'ok' ? 'нормально' : 'нужно проверить'} · спорных совпадений: {triage.quality.aliasConflicts}</div>
        </div>

        <div className="rounded-2xl g-panel-strong p-5 mb-3">
          <div className="g-kicker mb-1">Главная тема · уровень споров {hero.divergence}%</div>
          <h2 className="text-2xl md:text-3xl font-semibold text-white mb-2">{hero.title}</h2>
          <p className="text-sm text-zinc-400 mb-4">Это лучший сюжет для старта: открой и посмотри кто участвует, что произошло и на чём основаны выводы.</p>
          <div className="flex gap-2">
            <button
              onClick={() => navigate('Narrative', hero.narrativeId, { relation: 'signal_deck_open_case', fromType: 'Country', fromId: hero.countries[0] || 'N/A' })}
              className="px-3 py-2 rounded-lg bg-cyan-300/90 text-black text-sm font-medium hover:bg-cyan-200"
            >
Открыть сюжет
            </button>
            {next[0] && (
              <button
                onClick={() => navigate('Narrative', next[0].narrativeId, { relation: 'signal_deck_next_case', fromType: 'Country', fromId: next[0].countries[0] || 'N/A' })}
                className="px-3 py-2 rounded-lg bg-zinc-900 text-zinc-200 text-sm border border-zinc-700 hover:border-cyan-600"
              >
Открыть следующий сюжет
              </button>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-3 gap-2">
          {next.map((item) => (
            <button
              key={item.narrativeId}
              onClick={() => navigate('Narrative', item.narrativeId, { relation: 'signal_deck_pick', fromType: 'Country', fromId: item.countries[0] || 'N/A' })}
              className="text-left rounded-xl g-panel p-3 hover:border-cyan-700"
            >
              <div className="text-xs text-orange-300 mb-1">{item.divergence}%</div>
              <div className="text-sm text-white line-clamp-2">{item.title}</div>
              <div className="text-xs text-zinc-500 mt-1">Сюжет №{item.narrativeId}</div>
            </button>
          ))}
        </div>
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
    <div className="sticky top-0 z-10 mb-3 rounded-xl g-panel px-3 py-2">
      <div className="text-xs text-zinc-500">Открытый сюжет</div>
      <div className="text-sm text-white font-semibold line-clamp-1">{n.titleRu}</div>
      <div className="text-xs text-zinc-500">{countryLabels} · уровень споров {n.divergenceScore}%</div>
    </div>
  );
}

export default function Home() {
  const { state } = useGraph();
  const [leftCollapsed, setLeftCollapsed] = useState(true);

  return (
    <div className="h-screen flex flex-col overflow-hidden g-shell">
      <Suspense fallback={null}>
        <UrlSyncWrapper />
      </Suspense>
      
      {/* Header */}
      <header className="g-panel border-b px-4 py-3 flex items-center gap-3">
        <span className="text-2xl">🐙</span>
        <div>
          <h1 className="text-lg font-bold text-white">GeoPulse Lab</h1>
          <p className="text-xs text-zinc-500">Панель геополитики простыми словами</p>
        </div>
        <div className="ml-auto flex items-center gap-3 text-xs text-zinc-500">
          {state.focus && (
            <button
              onClick={() => setLeftCollapsed((v) => !v)}
              className="px-2 py-1 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
              title="Показать или скрыть левую панель"
            >
              {leftCollapsed ? '☰ Показать панель стран' : '☰ Скрыть панель стран'}
            </button>
          )}
          <span className="g-chip">🧬 База связей v1</span>
          <span className="g-chip">8 стран · 5 главных сюжетов</span>
          <GraphHealthBadge />
        </div>
      </header>

      {/* Breadcrumbs */}
      <Breadcrumbs />
      
      {/* Filters */}
      {state.focus && <FilterBar />}

      {!state.focus ? (
        <div className="flex-1 overflow-y-auto">
          <SignalDeck landing />
        </div>
      ) : (
        <>
          <SignalDeck />

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
            <div className="w-[34rem] max-w-[45vw] border-l border-zinc-800 overflow-y-auto flex-shrink-0">
              <RightRail />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
