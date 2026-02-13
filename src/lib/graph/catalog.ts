import { ARTICLES, COUNTRIES, EVENTS, NARRATIVES } from '@/mock/data';
import type { Article, Narrative } from '@/types/ontology';
import type { EntityKind, GraphEdge, GraphEntity, GraphSnapshot } from './types';

const ENTITY_DICTIONARY: Array<{ kind: EntityKind; canonical: string; aliases: string[] }> = [
  { kind: 'person', canonical: 'person:vance', aliases: ['вэнс', 'вэнса', 'венс', 'vance', 'jd vance'] },
  { kind: 'person', canonical: 'person:aliyev', aliases: ['алиев', 'алиев-пашинян', 'aliyev'] },
  { kind: 'person', canonical: 'person:pashinyan', aliases: ['пашинян', 'aliyev-pashinyan', 'pashinyan'] },
  { kind: 'org', canonical: 'org:nato', aliases: ['нато', 'nato'] },
  { kind: 'org', canonical: 'org:eu', aliases: ['ес', 'евросоюз', 'european union', 'eu'] },
  { kind: 'org', canonical: 'org:csto', aliases: ['одкб', 'csto'] },
  { kind: 'org', canonical: 'org:gazprom', aliases: ['газпром', 'gazprom'] },
  { kind: 'org', canonical: 'org:cnpc', aliases: ['cnpc'] },
  { kind: 'place', canonical: 'place:russia', aliases: ['россия', 'рф', 'russia'] },
  { kind: 'place', canonical: 'place:ukraine', aliases: ['украина', 'ukraine'] },
  { kind: 'place', canonical: 'place:karabakh', aliases: ['карабах', 'karabakh'] },
];

function normalize(text: string): string {
  return text.toLowerCase().replace(/[.,!?"'()]/g, ' ').replace(/\s+/g, ' ').trim();
}

function labelFromCanonical(canonical: string): string {
  const raw = canonical.split(':')[1] || canonical;
  return raw.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
}

function confidenceByAlias(alias: string): number {
  if (alias.length >= 8) return 0.9;
  if (alias.length >= 5) return 0.82;
  return 0.75;
}

function uniqueEdges(edges: GraphEdge[]): GraphEdge[] {
  const seen = new Set<string>();
  const out: GraphEdge[] = [];
  for (const e of edges) {
    const key = `${e.source}|${e.target}|${e.relation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(e);
  }
  return out;
}

function mergeEntity(base: GraphEntity | undefined, next: GraphEntity): GraphEntity {
  if (!base) return next;
  return {
    ...base,
    aliases: Array.from(new Set([...base.aliases, ...next.aliases])),
    countryCodes: Array.from(new Set([...(base.countryCodes || []), ...(next.countryCodes || [])])),
    metadata: { ...(base.metadata || {}), ...(next.metadata || {}) },
  };
}

function detectEntityRefs(text: string): Array<{ id: string; alias: string; kind: EntityKind }> {
  const hay = normalize(text);
  const refs: Array<{ id: string; alias: string; kind: EntityKind }> = [];

  for (const item of ENTITY_DICTIONARY) {
    for (const alias of item.aliases) {
      const a = normalize(alias);
      if (!a) continue;
      if (hay.includes(a)) {
        refs.push({ id: item.canonical, alias, kind: item.kind });
        break;
      }
    }
  }

  return refs;
}

function narrativeNodeId(n: Narrative): string {
  return `narrative:${n.id}`;
}

function articleNodeId(a: Article): string {
  return `article:${a.id}`;
}

export function buildGraphSnapshot(): GraphSnapshot {
  const entityMap = new Map<string, GraphEntity>();
  const edges: GraphEdge[] = [];

  // Base ontology nodes as graph entities
  for (const c of COUNTRIES) {
    entityMap.set(`country:${c.id}`, {
      id: `country:${c.id}`,
      kind: 'place',
      label: c.nameRu,
      aliases: [c.name, c.nameRu, c.id],
      countryCodes: [c.id],
      metadata: { source: 'country', tier: c.tier, region: c.region },
    });
  }

  for (const n of NARRATIVES) {
    entityMap.set(narrativeNodeId(n), {
      id: narrativeNodeId(n),
      kind: 'event',
      label: n.titleRu,
      aliases: [n.title, n.titleRu, ...n.keywords],
      countryCodes: n.countries,
      metadata: {
        source: 'narrative',
        articleCount: n.articleCount,
        divergenceScore: n.divergenceScore,
        status: n.status,
      },
    });

    for (const cid of n.countries) {
      edges.push({
        id: `edge:${n.id}:country:${cid}`,
        source: narrativeNodeId(n),
        target: `country:${cid}`,
        relation: 'spans_country',
        confidence: 1,
        evidence: [`narrative:${n.id}`],
        validFrom: n.firstSeen,
        validTo: n.lastSeen,
      });
    }
  }

  for (const a of ARTICLES) {
    const nodeId = articleNodeId(a);
    entityMap.set(nodeId, {
      id: nodeId,
      kind: 'event',
      label: a.title,
      aliases: [a.title, a.source],
      countryCodes: [a.countryId],
      metadata: {
        source: 'article',
        sentiment: a.sentiment,
        stance: a.stance,
        language: a.language,
      },
    });

    edges.push({
      id: `edge:article:${a.id}:country:${a.countryId}`,
      source: nodeId,
      target: `country:${a.countryId}`,
      relation: 'about_country',
      confidence: 0.95,
      evidence: [`article:${a.id}`],
      validFrom: a.publishedAt,
    });

    if (a.narrativeId) {
      edges.push({
        id: `edge:article:${a.id}:narrative:${a.narrativeId}`,
        source: nodeId,
        target: `narrative:${a.narrativeId}`,
        relation: 'belongs_to_narrative',
        confidence: 0.9,
        evidence: [`article:${a.id}`],
        validFrom: a.publishedAt,
      });
    }

    const refs = detectEntityRefs(a.title);
    for (const ref of refs) {
      const canonical = mergeEntity(entityMap.get(ref.id), {
        id: ref.id,
        kind: ref.kind,
        label: labelFromCanonical(ref.id),
        aliases: [ref.alias],
        countryCodes: [a.countryId],
        metadata: { source: 'dictionary' },
      });
      entityMap.set(ref.id, canonical);

      edges.push({
        id: `edge:article:${a.id}:${ref.id}`,
        source: nodeId,
        target: ref.id,
        relation: 'mentions',
        confidence: confidenceByAlias(ref.alias),
        evidence: [`article:${a.id}`, `alias:${ref.alias}`],
        validFrom: a.publishedAt,
      });
    }
  }

  for (const e of EVENTS) {
    const eventNodeId = `event:${e.id}`;
    entityMap.set(eventNodeId, {
      id: eventNodeId,
      kind: 'event',
      label: e.title,
      aliases: [e.title],
      countryCodes: [e.countryId],
      metadata: { source: 'event', impact: e.impact },
    });

    edges.push({
      id: `edge:event:${e.id}:country:${e.countryId}`,
      source: eventNodeId,
      target: `country:${e.countryId}`,
      relation: 'happened_in',
      confidence: 1,
      evidence: [`event:${e.id}`],
      validFrom: e.date,
    });

    for (const nId of e.relatedNarrativeIds) {
      edges.push({
        id: `edge:event:${e.id}:narrative:${nId}`,
        source: eventNodeId,
        target: `narrative:${nId}`,
        relation: 'related_to_narrative',
        confidence: 0.92,
        evidence: [`event:${e.id}`],
        validFrom: e.date,
      });
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    edges: uniqueEdges(edges),
  };
}
