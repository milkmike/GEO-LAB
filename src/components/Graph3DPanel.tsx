'use client';

import { useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { fetchSubgraph } from '@/lib/graph/client';
import type { SubgraphResponse } from '@/lib/graph/types';

const ForceGraph3D = dynamic(() => import('react-force-graph-3d'), { ssr: false });

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
    <div className="h-full w-full">
      <div className="px-3 pt-2 pb-1 text-xs text-zinc-500">
        3D subgraph · {graphData.nodes.length} nodes / {graphData.links.length} links
      </div>
      <div className="h-[calc(100%-24px)]">
        {/* @ts-expect-error dynamic import generic type */}
        <ForceGraph3D
          graphData={graphData}
          backgroundColor="#09090b"
          nodeLabel={(n: GraphNode) => `${n.name} (${n.kind})`}
          nodeColor={(n: GraphNode) => n.color}
          nodeVal={(n: GraphNode) => n.val}
          linkColor={(l: GraphLink) => (l.confidence >= 0.9 ? '#a1a1aa' : '#52525b')}
          linkWidth={(l: GraphLink) => Math.max(0.3, l.confidence * 1.5)}
          linkOpacity={0.55}
          showNavInfo={false}
          enableNodeDrag={true}
          cooldownTicks={80}
        />
      </div>
    </div>
  );
}
