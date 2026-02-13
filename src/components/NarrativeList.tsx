'use client';

import { useGraph } from '@/lib/graph-provider';
import { NARRATIVES, getCountry } from '@/mock/data';

export function NarrativeList() {
  const { navigate, state } = useGraph();
  
  // Если выбрана страна — фильтруем сюжеты
  const focusedCountry = state.focus?.nodeType === 'Country' ? String(state.focus.nodeId) : null;
  
  const filtered = focusedCountry
    ? NARRATIVES.filter(n => n.countries.includes(focusedCountry))
    : NARRATIVES;

  return (
    <div className="p-4">
      <h2 className="t-display font-semibold text-white mb-3 flex items-center gap-2">
        📰 Сюжеты
        {focusedCountry && (
          <span className="t-meta text-zinc-500 font-normal">
            фильтр: {getCountry(focusedCountry)?.flag} {getCountry(focusedCountry)?.nameRu}
          </span>
        )}
      </h2>
      <div className="space-y-2">
        {filtered.map(n => {
          const focused = state.focus?.nodeType === 'Narrative' && state.focus.nodeId === n.id;
          
          return (
            <button
              key={n.id}
              onClick={() => navigate('Narrative', n.id)}
              className={`w-full text-left p-3 rounded-xl border transition-all ${
                focused
                  ? 'border-blue-500 bg-blue-500/10'
                  : 'border-zinc-800 hover:border-zinc-700 bg-zinc-900 hover:bg-zinc-800/80'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="t-body font-medium text-white">{n.titleRu}</span>
                <div className="flex items-center gap-2">
                  <span className={`t-meta px-2 py-0.5 rounded-full ${
                    n.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    n.status === 'fading' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-zinc-500/20 text-zinc-300'
                  }`}>{n.status}</span>
                </div>
              </div>
              
              {/* Divergence bar */}
              <div className="flex items-center gap-2 mt-2">
                <span className="t-meta text-zinc-500 w-20">Расхожд.</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div 
                    className={`h-full rounded-full ${
                      n.divergenceScore >= 80 ? 'bg-red-500' :
                      n.divergenceScore >= 50 ? 'bg-orange-500' :
                      'bg-yellow-500'
                    }`}
                    style={{ width: `${n.divergenceScore}%` }}
                  />
                </div>
                <span className="t-meta text-zinc-400 w-8 text-right">{n.divergenceScore}%</span>
              </div>

              <div className="flex items-center gap-2 mt-2">
                <div className="flex gap-1">
                  {n.countries.map(cid => (
                    <span key={cid} className="t-body" title={getCountry(cid)?.nameRu}>
                      {getCountry(cid)?.flag}
                    </span>
                  ))}
                </div>
                <span className="t-meta text-zinc-600">·</span>
                <span className="t-meta text-zinc-500">{n.articleCount} статей</span>
              </div>
            </button>
          );
        })}
        
        {filtered.length === 0 && (
          <div className="text-center text-zinc-500 t-body py-4">
            Нет сюжетов для выбранной страны
          </div>
        )}
      </div>
    </div>
  );
}
