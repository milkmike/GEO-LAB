'use client';

import { useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { useGraph } from './graph-provider';
import type { GlobalFilters, NodeType } from '@/types/ontology';

/**
 * URL Sync — двунаправленная синхронизация состояния графа с URL.
 * 
 * URL формат:
 *   ?focus=Country:KZ&via=has_narratives:Narrative:42
 *   &countries=KZ,UZ&dateFrom=2025-01-01&dateTo=2025-12-31
 *   &stance=pro_russia,neutral&search=газ
 * 
 * Это позволяет:
 * - Копировать ссылку и получить тот же вид
 * - Работать с browser back/forward
 * - Делиться конкретным срезом данных
 */

// Сериализация фильтров в URL params
export function filtersToParams(filters: GlobalFilters): URLSearchParams {
  const params = new URLSearchParams();
  
  if (filters.countries?.length) {
    params.set('countries', filters.countries.join(','));
  }
  if (filters.dateRange) {
    params.set('dateFrom', filters.dateRange[0]);
    params.set('dateTo', filters.dateRange[1]);
  }
  if (filters.sentiment) {
    params.set('sentFrom', String(filters.sentiment[0]));
    params.set('sentTo', String(filters.sentiment[1]));
  }
  if (filters.stance?.length) {
    params.set('stance', filters.stance.join(','));
  }
  if (filters.search) {
    params.set('search', filters.search);
  }
  
  return params;
}

// Парсинг фильтров из URL params
export function paramsToFilters(params: URLSearchParams): GlobalFilters {
  const filters: GlobalFilters = {};
  
  const countries = params.get('countries');
  if (countries) filters.countries = countries.split(',');
  
  const dateFrom = params.get('dateFrom');
  const dateTo = params.get('dateTo');
  if (dateFrom && dateTo) filters.dateRange = [dateFrom, dateTo];
  
  const sentFrom = params.get('sentFrom');
  const sentTo = params.get('sentTo');
  if (sentFrom && sentTo) filters.sentiment = [Number(sentFrom), Number(sentTo)];
  
  const stance = params.get('stance');
  if (stance) filters.stance = stance.split(',') as GlobalFilters['stance'];
  
  const search = params.get('search');
  if (search) filters.search = search;
  
  return filters;
}

// Парсинг фокуса из URL
export function parseFocusParam(param: string | null): { nodeType: NodeType; nodeId: string | number } | null {
  if (!param) return null;
  const [type, ...idParts] = param.split(':');
  const id = idParts.join(':');
  if (!type || !id) return null;
  return {
    nodeType: type as NodeType,
    nodeId: isNaN(Number(id)) ? id : Number(id),
  };
}

/**
 * React hook: подключает URL ↔ GraphProvider синхронизацию.
 * Добавить в layout.tsx один раз.
 */
export function useUrlSync() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { state, navigate, setFilters } = useGraph();

  // URL → State (при загрузке страницы)
  useEffect(() => {
    const focusParam = searchParams.get('focus');
    const focus = parseFocusParam(focusParam);
    
    if (focus && (!state.focus || state.focus.nodeType !== focus.nodeType || state.focus.nodeId !== focus.nodeId)) {
      navigate(focus.nodeType, focus.nodeId);
    }

    const urlFilters = paramsToFilters(searchParams);
    if (Object.keys(urlFilters).length > 0) {
      setFilters(urlFilters);
    }
    // Только при первой загрузке
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // State → URL (при изменении состояния)
  useEffect(() => {
    const params = filtersToParams(state.filters);
    
    if (state.focus) {
      params.set('focus', `${state.focus.nodeType}:${state.focus.nodeId}`);
      if (state.focus.via) {
        params.set('via', `${state.focus.via.relation}:${state.focus.via.fromType}:${state.focus.via.fromId}`);
      }
    }

    const newSearch = params.toString();
    const currentSearch = searchParams.toString();
    
    if (newSearch !== currentSearch) {
      router.replace(`${pathname}${newSearch ? '?' + newSearch : ''}`, { scroll: false });
    }
  }, [state.focus, state.filters, pathname, router, searchParams]);
}
