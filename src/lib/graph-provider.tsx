'use client';

import React, { createContext, useContext, useCallback, useMemo, useReducer } from 'react';
import {
  type GraphFocus,
  type GlobalFilters,
  type NodeType,
  type OntologyNode,
  ONTOLOGY_SCHEMA,
} from '@/types/ontology';

// ============================================================
// State
// ============================================================

interface GraphState {
  /** Текущий фокус — на каком узле "стоим" */
  focus: GraphFocus | null;
  
  /** История навигации по графу (breadcrumbs) */
  history: GraphFocus[];
  
  /** Указатель в истории (для back/forward) */
  historyIndex: number;
  
  /** Глобальные фильтры, применяемые ко всем виджетам */
  filters: GlobalFilters;
  
  /** Подсветка — какие узлы выделены (hover, selection) */
  highlighted: Set<string>; // "Type:id" format
  
  /** Выбранные узлы (множественный выбор) */
  selected: Set<string>;
}

const initialState: GraphState = {
  focus: null,
  history: [],
  historyIndex: -1,
  filters: {},
  highlighted: new Set(),
  selected: new Set(),
};

// ============================================================
// Actions
// ============================================================

type GraphAction =
  | { type: 'NAVIGATE'; focus: GraphFocus }
  | { type: 'GO_BACK' }
  | { type: 'GO_FORWARD' }
  | { type: 'SET_FILTERS'; filters: Partial<GlobalFilters> }
  | { type: 'CLEAR_FILTERS' }
  | { type: 'HIGHLIGHT'; nodeKeys: string[] }
  | { type: 'CLEAR_HIGHLIGHT' }
  | { type: 'SELECT'; nodeKey: string }
  | { type: 'DESELECT'; nodeKey: string }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'RESET' };

function graphReducer(state: GraphState, action: GraphAction): GraphState {
  switch (action.type) {
    case 'NAVIGATE': {
      // Обрезаем "будущую" историю при навигации из середины
      const newHistory = [
        ...state.history.slice(0, state.historyIndex + 1),
        action.focus,
      ];
      return {
        ...state,
        focus: action.focus,
        history: newHistory,
        historyIndex: newHistory.length - 1,
        // Сбрасываем подсветку при навигации
        highlighted: new Set(),
      };
    }

    case 'GO_BACK': {
      if (state.historyIndex <= 0) return state;
      const newIndex = state.historyIndex - 1;
      return {
        ...state,
        focus: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'GO_FORWARD': {
      if (state.historyIndex >= state.history.length - 1) return state;
      const newIndex = state.historyIndex + 1;
      return {
        ...state,
        focus: state.history[newIndex],
        historyIndex: newIndex,
      };
    }

    case 'SET_FILTERS':
      return {
        ...state,
        filters: { ...state.filters, ...action.filters },
      };

    case 'CLEAR_FILTERS':
      return { ...state, filters: {} };

    case 'HIGHLIGHT':
      return { ...state, highlighted: new Set(action.nodeKeys) };

    case 'CLEAR_HIGHLIGHT':
      return { ...state, highlighted: new Set() };

    case 'SELECT': {
      const newSelected = new Set(state.selected);
      newSelected.add(action.nodeKey);
      return { ...state, selected: newSelected };
    }

    case 'DESELECT': {
      const newSelected = new Set(state.selected);
      newSelected.delete(action.nodeKey);
      return { ...state, selected: newSelected };
    }

    case 'CLEAR_SELECTION':
      return { ...state, selected: new Set() };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

// ============================================================
// Context
// ============================================================

interface GraphContextValue {
  state: GraphState;
  
  /** Навигация к узлу графа */
  navigate: (nodeType: NodeType, nodeId: string | number, via?: GraphFocus['via']) => void;
  
  /** Назад по истории */
  goBack: () => void;
  
  /** Вперёд по истории */
  goForward: () => void;
  
  /** Можно ли идти назад/вперёд */
  canGoBack: boolean;
  canGoForward: boolean;
  
  /** Установить фильтры */
  setFilters: (filters: Partial<GlobalFilters>) => void;
  clearFilters: () => void;
  
  /** Подсветка узлов */
  highlight: (nodes: Array<{ type: NodeType; id: string | number }>) => void;
  clearHighlight: () => void;
  isHighlighted: (type: NodeType, id: string | number) => boolean;
  
  /** Выбор узлов */
  toggleSelect: (type: NodeType, id: string | number) => void;
  clearSelection: () => void;
  isSelected: (type: NodeType, id: string | number) => boolean;
  
  /** Получить доступные связи для текущего фокуса */
  getAvailableLinks: (fromType: NodeType) => Array<{ targetType: NodeType; relation: string }>;
  
  /** Breadcrumbs — путь навигации */
  breadcrumbs: GraphFocus[];
  
  /** Полный сброс */
  reset: () => void;
}

const GraphContext = createContext<GraphContextValue | null>(null);

// ============================================================
// Provider
// ============================================================

export function GraphProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = useReducer(graphReducer, initialState);

  const navigate = useCallback(
    (nodeType: NodeType, nodeId: string | number, via?: GraphFocus['via']) => {
      dispatch({ type: 'NAVIGATE', focus: { nodeType, nodeId, via } });
    },
    []
  );

  const goBack = useCallback(() => dispatch({ type: 'GO_BACK' }), []);
  const goForward = useCallback(() => dispatch({ type: 'GO_FORWARD' }), []);

  const setFilters = useCallback(
    (filters: Partial<GlobalFilters>) => dispatch({ type: 'SET_FILTERS', filters }),
    []
  );
  const clearFilters = useCallback(() => dispatch({ type: 'CLEAR_FILTERS' }), []);

  const highlight = useCallback(
    (nodes: Array<{ type: NodeType; id: string | number }>) =>
      dispatch({ type: 'HIGHLIGHT', nodeKeys: nodes.map(n => `${n.type}:${n.id}`) }),
    []
  );
  const clearHighlight = useCallback(() => dispatch({ type: 'CLEAR_HIGHLIGHT' }), []);

  const isHighlighted = useCallback(
    (type: NodeType, id: string | number) => state.highlighted.has(`${type}:${id}`),
    [state.highlighted]
  );

  const toggleSelect = useCallback(
    (type: NodeType, id: string | number) => {
      const key = `${type}:${id}`;
      if (state.selected.has(key)) {
        dispatch({ type: 'DESELECT', nodeKey: key });
      } else {
        dispatch({ type: 'SELECT', nodeKey: key });
      }
    },
    [state.selected]
  );
  const clearSelection = useCallback(() => dispatch({ type: 'CLEAR_SELECTION' }), []);

  const isSelected = useCallback(
    (type: NodeType, id: string | number) => state.selected.has(`${type}:${id}`),
    [state.selected]
  );

  const getAvailableLinks = useCallback(
    (fromType: NodeType) =>
      ONTOLOGY_SCHEMA
        .filter(link => link.sourceType === fromType)
        .map(link => ({ targetType: link.targetType, relation: link.relation })),
    []
  );

  const breadcrumbs = useMemo(
    () => state.history.slice(0, state.historyIndex + 1),
    [state.history, state.historyIndex]
  );

  const value: GraphContextValue = useMemo(
    () => ({
      state,
      navigate,
      goBack,
      goForward,
      canGoBack: state.historyIndex > 0,
      canGoForward: state.historyIndex < state.history.length - 1,
      setFilters,
      clearFilters,
      highlight,
      clearHighlight,
      isHighlighted,
      toggleSelect,
      clearSelection,
      isSelected,
      getAvailableLinks,
      breadcrumbs,
      reset: () => dispatch({ type: 'RESET' }),
    }),
    [state, navigate, goBack, goForward, setFilters, clearFilters, highlight, clearHighlight, isHighlighted, toggleSelect, clearSelection, isSelected, getAvailableLinks, breadcrumbs]
  );

  return <GraphContext.Provider value={value}>{children}</GraphContext.Provider>;
}

// ============================================================
// Hook
// ============================================================

export function useGraph(): GraphContextValue {
  const ctx = useContext(GraphContext);
  if (!ctx) {
    throw new Error('useGraph must be used within a GraphProvider');
  }
  return ctx;
}

// ============================================================
// Utility: node key
// ============================================================

export function nodeKey(node: OntologyNode): string {
  switch (node.type) {
    case 'Country': return `Country:${node.id}`;
    case 'Narrative': return `Narrative:${node.id}`;
    case 'Article': return `Article:${node.id}`;
    case 'Channel': return `Channel:${node.id}`;
    case 'VoxComment': return `VoxComment:${node.id}`;
    case 'TemperaturePoint': return `TemperaturePoint:${node.id}`;
    case 'Event': return `Event:${node.id}`;
  }
}
