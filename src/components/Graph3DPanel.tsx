'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchSubgraph } from '@/lib/graph/client';
import type { SubgraphResponse } from '@/lib/graph/types';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });
const ForceGraph2D = dynamic(() => import('react-force-graph-2d'), { ssr: false });

type GraphNode = {
  id: string;
  name: string;
  kind: string;
  val: number;
  color: string;
};

type GraphLink = {
  source: string;
  target: string;
  relation: string;
  confidence: number;
};

type Pos = { x: number; y: number };

type KindFilter = 'all' | 'person' | 'org' | 'place' | 'event';

function colorByKind(kind: string): string {
  switch (kind) {
    case 'person': return '#60a5fa';
    case 'org': return '#f59e0b';
    case 'place': return '#22c55e';
    case 'event': return '#a78bfa';
    default: return '#71717a';
  }
}

function clamp01(x: number): number {
  return Math.max(0, Math.min(1, x));
}

export function Graph3DPanel({ nodeId }: { nodeId: string | null }) {
  const [subgraph, setSubgraph] = useState<SubgraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<{ zoomToFit: (ms?: number, px?: number) => void } | null>(null);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderMode, setRenderMode] = useState<'svg' | '2d' | '3d'>('svg');
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [minConfidence, setMinConfidence] = useState(0.5);
  const [kindFilter, setKindFilter] = useState<KindFilter>('all');
  const [draggedNodeId, setDraggedNodeId] = useState<string | null>(null);
  const [dragPositions, setDragPositions] = useState<Record<string, Pos>>({});

  useEffect(() => {
    if (!nodeId) return;
    fetchSubgraph(nodeId, 2)
      .then((data) => {
        setSubgraph(data);
        setError(null);
        setSelectedNodeId(data.center);
        setDragPositions({});
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : 'graph load failed');
      });
  }, [nodeId]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };

    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);

    return () => ro.disconnect();
  }, []);

  const graphData = useMemo(() => {
    if (!subgraph) return null;

    const nodes: GraphNode[] = subgraph.nodes.map((n) => ({
      id: n.id,
      name: n.label,
      kind: n.kind,
      val: n.id === subgraph.center ? 10 : 6,
      color: n.id === subgraph.center ? '#ffffff' : colorByKind(n.kind),
    }));

    const links: GraphLink[] = subgraph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      confidence: e.confidence,
    }));

    return { nodes, links, center: subgraph.center };
  }, [subgraph]);

  useEffect(() => {
    if (!graphData || renderMode === 'svg') return;
    const t = setTimeout(() => {
      const fg = fgRef.current;
      if (!fg) return;
      try {
        fg.zoomToFit(400, 40);
      } catch {
        // noop
      }
    }, 250);
    return () => clearTimeout(t);
  }, [graphData, renderMode]);

  const effectiveWidth = Math.max(size.width, 560);
  const effectiveHeight = Math.max(size.height, 420);

  const baseLayout = useMemo(() => {
    if (!graphData) return null;

    const cx = effectiveWidth / 2;
    const cy = effectiveHeight / 2;
    const radius = Math.max(80, Math.min(effectiveWidth, effectiveHeight) * 0.34);

    const centerNode = graphData.nodes.find((n) => n.id === graphData.center) || graphData.nodes[0];
    const rest = graphData.nodes.filter((n) => n.id !== centerNode.id);

    const pos = new Map<string, Pos>();
    pos.set(centerNode.id, { x: cx, y: cy });

    rest.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(rest.length, 1);
      pos.set(n.id, {
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      });
    });

    return pos;
  }, [graphData, effectiveHeight, effectiveWidth]);

  const nodePos = (id: string): Pos | null => {
    if (dragPositions[id]) return dragPositions[id];
    return baseLayout?.get(id) || null;
  };

  const filtered = useMemo(() => {
    if (!graphData) return null;

    const nodes = graphData.nodes.filter((n) => kindFilter === 'all' || n.kind === kindFilter);
    const nodeSet = new Set(nodes.map((n) => n.id));
    const links = graphData.links.filter((l) => l.confidence >= minConfidence && nodeSet.has(l.source) && nodeSet.has(l.target));

    return { nodes, links, nodeSet };
  }, [graphData, kindFilter, minConfidence]);

  const neighbors = useMemo(() => {
    if (!filtered || !selectedNodeId) return new Set<string>();
    const s = new Set<string>([selectedNodeId]);
    for (const l of filtered.links) {
      if (l.source === selectedNodeId) s.add(l.target);
      if (l.target === selectedNodeId) s.add(l.source);
    }
    return s;
  }, [filtered, selectedNodeId]);

  const toSvgCoord = (ev: React.PointerEvent<SVGSVGElement>): Pos | null => {
    const svg = svgRef.current;
    if (!svg) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;

    const rx = (ev.clientX - rect.left) / rect.width;
    const ry = (ev.clientY - rect.top) / rect.height;

    return {
      x: rx * effectiveWidth,
      y: ry * effectiveHeight,
    };
  };

  if (!nodeId) {
    return <div className="p-3 t-meta text-zinc-500">Открой сюжет, чтобы увидеть карту связей.</div>;
  }

  if (error) {
    return <div className="p-3 t-meta text-red-400">{error}</div>;
  }

  if (!graphData || !filtered) {
    return <div className="p-3 t-meta text-zinc-500">Загрузка карты связей…</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 pt-2 pb-1 t-meta text-zinc-500 flex items-center justify-between gap-2 flex-wrap">
        <span>Режим: {renderMode.toUpperCase()} · узлов: {filtered.nodes.length} · связей: {filtered.links.length}</span>
        <div className="flex gap-1">
          <button onClick={() => setRenderMode('svg')} className={`px-2 py-0.5 rounded ${renderMode === 'svg' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>SVG</button>
          <button onClick={() => setRenderMode('2d')} className={`px-2 py-0.5 rounded ${renderMode === '2d' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>2D</button>
          <button onClick={() => setRenderMode('3d')} className={`px-2 py-0.5 rounded ${renderMode === '3d' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>3D</button>
        </div>
      </div>

      <div className="px-3 pb-2 text-[11px] text-zinc-500 flex items-center gap-2 flex-wrap">
        <span>Показывать связи с уверенностью ≥</span>
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={minConfidence}
          onChange={(e) => setMinConfidence(clamp01(Number(e.target.value)))}
        />
        <span>{minConfidence.toFixed(2)}</span>
        <select
          value={kindFilter}
          onChange={(e) => setKindFilter(e.target.value as KindFilter)}
          className="bg-zinc-900 border border-zinc-700 rounded px-1 py-0.5"
        >
          <option value="all">все типы</option>
          <option value="person">люди</option>
          <option value="org">организации</option>
          <option value="place">места</option>
          <option value="event">события</option>
        </select>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0 relative">
        {renderMode === 'svg' && baseLayout && (
          <svg
            ref={svgRef}
            width="100%"
            height="100%"
            viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`}
            style={{ background: '#09090b', touchAction: 'none' }}
            onPointerMove={(e) => {
              if (!draggedNodeId) return;
              const p = toSvgCoord(e);
              if (!p) return;
              setDragPositions((prev) => ({ ...prev, [draggedNodeId]: p }));
            }}
            onPointerUp={() => setDraggedNodeId(null)}
            onPointerLeave={() => setDraggedNodeId(null)}
          >
            <rect x="1" y="1" width={effectiveWidth - 2} height={effectiveHeight - 2} fill="transparent" stroke="#334155" strokeWidth="1" />

            {filtered.links.map((l, i) => {
              const a = nodePos(l.source);
              const b = nodePos(l.target);
              if (!a || !b) return null;
              const isNeighborLink = selectedNodeId && (l.source === selectedNodeId || l.target === selectedNodeId);
              return (
                <line
                  key={`${l.source}-${l.target}-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={isNeighborLink ? '#f8fafc' : '#6b7280'}
                  strokeWidth={Math.max(1, l.confidence * 2.5)}
                  opacity={selectedNodeId ? (isNeighborLink ? 0.95 : 0.25) : 0.75}
                />
              );
            })}

            {filtered.nodes.map((n) => {
              const p = nodePos(n.id);
              if (!p) return null;
              const selected = n.id === selectedNodeId;
              const neighbor = neighbors.has(n.id);
              return (
                <g
                  key={n.id}
                  onPointerDown={(e) => {
                    e.stopPropagation();
                    setDraggedNodeId(n.id);
                  }}
                  onClick={() => setSelectedNodeId(n.id)}
                  style={{ cursor: 'grab' }}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={selected ? n.val + 2 : n.val}
                    fill={n.color}
                    stroke={selected ? '#ffffff' : '#18181b'}
                    strokeWidth={selected ? 2 : 1}
                    opacity={selectedNodeId ? (neighbor ? 1 : 0.35) : 1}
                  />
                  <text
                    x={p.x + n.val + 4}
                    y={p.y + 4}
                    fill={selected ? '#ffffff' : '#d4d4d8'}
                    fontSize="11"
                    opacity={selectedNodeId ? (neighbor ? 1 : 0.4) : 1}
                  >
                    {n.name}
                  </text>
                </g>
              );
            })}
          </svg>
        )}

        {size.width > 0 && size.height > 0 && renderMode === '2d' && (
          // @ts-expect-error dynamic import generic type
          <ForceGraph2D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={filtered}
            backgroundColor="#09090b"
            nodeLabel={(n: GraphNode) => `${n.name} (${n.kind})`}
            nodeColor={(n: GraphNode) => n.color}
            nodeVal={(n: GraphNode) => Math.max(2, n.val)}
            nodeRelSize={3}
            linkColor={(l: GraphLink) => (l.confidence >= 0.9 ? '#d4d4d8' : '#52525b')}
            linkWidth={(l: GraphLink) => Math.max(1, l.confidence * 2.5)}
            linkDirectionalParticles={1}
            linkDirectionalParticleWidth={(l: GraphLink) => Math.max(1, l.confidence * 2)}
            cooldownTicks={120}
          />
        )}

        {size.width > 0 && size.height > 0 && renderMode === '3d' && (
          // @ts-expect-error dynamic import generic type
          <ForceGraph3D
            ref={fgRef}
            width={size.width}
            height={size.height}
            graphData={filtered}
            backgroundColor="#09090b"
            nodeLabel={(n: GraphNode) => `${n.name} (${n.kind})`}
            nodeColor={(n: GraphNode) => n.color}
            nodeVal={(n: GraphNode) => n.val}
            linkColor={(l: GraphLink) => (l.confidence >= 0.9 ? '#a1a1aa' : '#52525b')}
            linkWidth={(l: GraphLink) => Math.max(0.5, l.confidence * 2)}
            linkOpacity={0.65}
            showNavInfo={true}
            enableNodeDrag={true}
            cooldownTicks={90}
          />
        )}
      </div>
    </div>
  );
}
