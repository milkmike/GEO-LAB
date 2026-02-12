'use client';

import { useGraph } from '@/lib/graph-provider';
import { COUNTRIES, getNarrativesForCountry, getArticlesForCountry } from '@/mock/data';

function tempColor(value: number): string {
  if (value >= 70) return 'bg-red-500/20 border-red-500/50 text-red-300';
  if (value >= 50) return 'bg-orange-500/20 border-orange-500/50 text-orange-300';
  if (value >= 35) return 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300';
  return 'bg-green-500/20 border-green-500/50 text-green-300';
}

function tempBar(value: number): string {
  if (value >= 70) return 'bg-red-500';
  if (value >= 50) return 'bg-orange-500';
  if (value >= 35) return 'bg-yellow-500';
  return 'bg-green-500';
}

export function CountryGrid() {
  const { navigate, state, highlight, clearHighlight, isHighlighted } = useGraph();
  
  const filtered = state.filters.countries?.length
    ? COUNTRIES.filter(c => state.filters.countries!.includes(c.id))
    : COUNTRIES;

  return (
    <div className="p-4">
      <h2 className="text-lg font-semibold text-white mb-3 flex items-center gap-2">
        🌍 Страны
        <span className="text-xs text-zinc-500 font-normal">
          клик → провалиться в страну
        </span>
      </h2>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {filtered.map(country => {
          const narratives = getNarrativesForCountry(country.id);
          const articles = getArticlesForCountry(country.id);
          const highlighted = isHighlighted('Country', country.id);
          const focused = state.focus?.nodeType === 'Country' && state.focus.nodeId === country.id;
          
          return (
            <button
              key={country.id}
              onClick={() => navigate('Country', country.id)}
              onMouseEnter={() => highlight([{ type: 'Country', id: country.id }])}
              onMouseLeave={() => clearHighlight()}
              className={`
                relative p-4 rounded-xl border transition-all duration-200 text-left
                ${focused 
                  ? 'border-blue-500 bg-blue-500/10 ring-2 ring-blue-500/30' 
                  : highlighted
                    ? 'border-zinc-600 bg-zinc-800 scale-[1.02]'
                    : 'border-zinc-800 bg-zinc-900 hover:border-zinc-700 hover:bg-zinc-800/80'
                }
              `}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-2xl">{country.flag}</span>
                <span className={`text-xs px-2 py-0.5 rounded-full border ${tempColor(country.temperature ?? 0)}`}>
                  {country.temperature}°
                </span>
              </div>
              <div className="font-medium text-white">{country.nameRu}</div>
              <div className="text-xs text-zinc-500 mt-1">
                Tier {country.tier} · {country.region}
              </div>
              
              {/* Temperature bar */}
              <div className="mt-3 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                <div 
                  className={`h-full rounded-full transition-all ${tempBar(country.temperature ?? 0)}`}
                  style={{ width: `${country.temperature ?? 0}%` }}
                />
              </div>
              
              <div className="flex justify-between text-xs text-zinc-600 mt-2">
                <span>{narratives.length} сюжетов</span>
                <span>{articles.length} статей</span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
