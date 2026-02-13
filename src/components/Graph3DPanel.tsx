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

function colorByKind(kind: string): string {
  switch (kind) {
    case 'person': return '#60a5fa';
    case 'org': return '#f59e0b';
    case 'place': return '#22c55e';
    case 'event': return '#a78bfa';
    default: return '#71717a';
  }
}

export function Graph3DPanel({ nodeId }: { nodeId: string | null }) {
  const [subgraph, setSubgraph] = useState<SubgraphResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const fgRef = useRef<{ zoomToFit: (ms?: number, px?: number) => void } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const [renderMode, setRenderMode] = useState<'svg' | '2d' | '3d'>('svg');

  useEffect(() => {
    if (!nodeId) return;
    fetchSubgraph(nodeId, 2)
      .then((data) => {
        setSubgraph(data);
        setError(null);
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
    }, 200);
    return () => clearTimeout(t);
  }, [graphData, renderMode]);

  const effectiveWidth = Math.max(size.width, 560);
  const effectiveHeight = Math.max(size.height, 420);

  const svgLayout = useMemo(() => {
    if (!graphData) return null;

    const cx = effectiveWidth / 2;
    const cy = effectiveHeight / 2;
    const radius = Math.max(80, Math.min(effectiveWidth, effectiveHeight) * 0.35);

    const centerNode = graphData.nodes.find((n) => n.id === graphData.center) || graphData.nodes[0];
    const rest = graphData.nodes.filter((n) => n.id !== centerNode.id);

    const positions = new Map<string, { x: number; y: number }>();
    positions.set(centerNode.id, { x: cx, y: cy });

    rest.forEach((n, i) => {
      const a = (2 * Math.PI * i) / Math.max(rest.length, 1);
      positions.set(n.id, {
        x: cx + Math.cos(a) * radius,
        y: cy + Math.sin(a) * radius,
      });
    });

    return { positions };
  }, [graphData, effectiveHeight, effectiveWidth]);

  if (!nodeId) {
    return <div className="p-3 text-xs text-zinc-500">Открой кейс, чтобы увидеть граф.</div>;
  }

  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>;
  }

  if (!graphData) {
    return <div className="p-3 text-xs text-zinc-500">Загрузка графа...</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 pt-2 pb-1 text-xs text-zinc-500 flex items-center justify-between">
        <span>{renderMode.toUpperCase()} subgraph · {graphData.nodes.length} nodes / {graphData.links.length} links · {size.width}×{size.height}</span>
        <div className="flex gap-1">
          <button onClick={() => setRenderMode('svg')} className={`px-2 py-0.5 rounded ${renderMode==='svg' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>SVG</button>
          <button onClick={() => setRenderMode('2d')} className={`px-2 py-0.5 rounded ${renderMode==='2d' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>2D</button>
          <button onClick={() => setRenderMode('3d')} className={`px-2 py-0.5 rounded ${renderMode==='3d' ? 'bg-zinc-700 text-white' : 'bg-zinc-800 text-zinc-300'}`}>3D</button>
        </div>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
        {renderMode === 'svg' && svgLayout && (
          <svg width="100%" height="100%" viewBox={`0 0 ${effectiveWidth} ${effectiveHeight}`} style={{ background: '#09090b' }}>
            <rect x="1" y="1" width={effectiveWidth - 2} height={effectiveHeight - 2} fill="transparent" stroke="#334155" strokeWidth="1" />
            <line x1="10" y1="10" x2={effectiveWidth - 10} y2="10" stroke="#ef4444" strokeWidth="2" />
            {graphData.links.map((l, i) => {
              const a = svgLayout.positions.get(l.source);
              const b = svgLayout.positions.get(l.target);
              if (!a || !b) return null;
              return (
                <line
                  key={`${l.source}-${l.target}-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke={l.confidence >= 0.9 ? '#d4d4d8' : '#52525b'}
                  strokeWidth={Math.max(1, l.confidence * 2.5)}
                  opacity={0.9}
                />
              );
            })}

            {graphData.nodes.map((n) => {
              const p = svgLayout.positions.get(n.id);
              if (!p) return null;
              return (
                <g key={n.id}>
                  <circle cx={p.x} cy={p.y} r={n.val} fill={n.color} stroke="#18181b" strokeWidth={1} />
                  <text x={p.x + n.val + 3} y={p.y + 4} fill="#d4d4d8" fontSize="11">{n.name}</text>
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
            graphData={graphData}
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
            graphData={graphData}
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
