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

/* no extra render-only type */

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
  const [renderMode, setRenderMode] = useState<'3d' | '2d'>('2d');

  useEffect(() => {
    if (!nodeId) return;
    fetchSubgraph(nodeId, 2)
      .then((data) => {
        setSubgraph(data);
        setError(null);
      })
      .catch((e: unknown) => {
        setError(e instanceof Error ? e.message : '3D graph load failed');
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
      val: n.id === subgraph.center ? 8 : 4,
      color: n.id === subgraph.center ? '#ffffff' : colorByKind(n.kind),
    }));

    const links: GraphLink[] = subgraph.edges.map((e) => ({
      source: e.source,
      target: e.target,
      relation: e.relation,
      confidence: e.confidence,
    }));

    return { nodes, links };
  }, [subgraph]);

  useEffect(() => {
    if (!graphData) return;
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

  if (!nodeId) {
    return <div className="p-3 text-xs text-zinc-500">Открой кейс, чтобы увидеть 3D-граф.</div>;
  }

  if (error) {
    return <div className="p-3 text-xs text-red-400">{error}</div>;
  }

  if (!graphData) {
    return <div className="p-3 text-xs text-zinc-500">Загрузка 3D-графа...</div>;
  }

  return (
    <div className="h-full w-full flex flex-col">
      <div className="px-3 pt-2 pb-1 text-xs text-zinc-500 flex items-center justify-between">
        <span>{renderMode.toUpperCase()} subgraph · {graphData.nodes.length} nodes / {graphData.links.length} links</span>
        <button
          onClick={() => setRenderMode((m) => (m === '3d' ? '2d' : '3d'))}
          className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-300"
        >
          {renderMode === '3d' ? 'Switch to 2D' : 'Try 3D'}
        </button>
      </div>

      <div ref={containerRef} className="flex-1 min-h-0">
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
      </div>
    </div>
  );
}
