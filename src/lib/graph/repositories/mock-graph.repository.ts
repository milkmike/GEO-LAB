import { ARTICLES, COUNTRIES, EVENTS, NARRATIVES } from '@/mock/data';
import type { Article, Narrative } from '@/types/ontology';
import type { GraphRepository, GraphSnapshotWithIndex } from '../domain/contracts';
import type { EntityKind, GraphEdge, GraphEntity, GraphSnapshot } from '../domain/primitives';

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
  for (const edge of edges) {
    const key = `${edge.source}|${edge.target}|${edge.relation}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(edge);
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
      const normalizedAlias = normalize(alias);
      if (!normalizedAlias) continue;
      if (hay.includes(normalizedAlias)) {
        refs.push({ id: item.canonical, alias, kind: item.kind });
        break;
      }
    }
  }

  return refs;
}

function narrativeNodeId(narrative: Narrative): string {
  return `narrative:${narrative.id}`;
}

function articleNodeId(article: Article): string {
  return `article:${article.id}`;
}

export function buildGraphSnapshot(): GraphSnapshot {
  const entityMap = new Map<string, GraphEntity>();
  const edges: GraphEdge[] = [];

  for (const country of COUNTRIES) {
    entityMap.set(`country:${country.id}`, {
      id: `country:${country.id}`,
      kind: 'place',
      label: country.nameRu,
      aliases: [country.name, country.nameRu, country.id],
      countryCodes: [country.id],
      metadata: { source: 'country', tier: country.tier, region: country.region },
    });
  }

  for (const narrative of NARRATIVES) {
    entityMap.set(narrativeNodeId(narrative), {
      id: narrativeNodeId(narrative),
      kind: 'event',
      label: narrative.titleRu,
      aliases: [narrative.title, narrative.titleRu, ...narrative.keywords],
      countryCodes: narrative.countries,
      metadata: {
        source: 'narrative',
        articleCount: narrative.articleCount,
        divergenceScore: narrative.divergenceScore,
        status: narrative.status,
      },
    });

    for (const countryId of narrative.countries) {
      edges.push({
        id: `edge:${narrative.id}:country:${countryId}`,
        source: narrativeNodeId(narrative),
        target: `country:${countryId}`,
        relation: 'spans_country',
        confidence: 1,
        evidence: [`narrative:${narrative.id}`],
        validFrom: narrative.firstSeen,
        validTo: narrative.lastSeen,
      });
    }
  }

  for (const article of ARTICLES) {
    const nodeId = articleNodeId(article);
    entityMap.set(nodeId, {
      id: nodeId,
      kind: 'event',
      label: article.title,
      aliases: [article.title, article.source],
      countryCodes: [article.countryId],
      metadata: {
        source: 'article',
        sentiment: article.sentiment,
        stance: article.stance,
        language: article.language,
      },
    });

    edges.push({
      id: `edge:article:${article.id}:country:${article.countryId}`,
      source: nodeId,
      target: `country:${article.countryId}`,
      relation: 'about_country',
      confidence: 0.95,
      evidence: [`article:${article.id}`],
      validFrom: article.publishedAt,
    });

    if (article.narrativeId) {
      edges.push({
        id: `edge:article:${article.id}:narrative:${article.narrativeId}`,
        source: nodeId,
        target: `narrative:${article.narrativeId}`,
        relation: 'belongs_to_narrative',
        confidence: 0.9,
        evidence: [`article:${article.id}`],
        validFrom: article.publishedAt,
      });
    }

    const refs = detectEntityRefs(article.title);
    for (const ref of refs) {
      const canonical = mergeEntity(entityMap.get(ref.id), {
        id: ref.id,
        kind: ref.kind,
        label: labelFromCanonical(ref.id),
        aliases: [ref.alias],
        countryCodes: [article.countryId],
        metadata: { source: 'dictionary' },
      });
      entityMap.set(ref.id, canonical);

      edges.push({
        id: `edge:article:${article.id}:${ref.id}`,
        source: nodeId,
        target: ref.id,
        relation: 'mentions',
        confidence: confidenceByAlias(ref.alias),
        evidence: [`article:${article.id}`, `alias:${ref.alias}`],
        validFrom: article.publishedAt,
      });
    }
  }

  for (const event of EVENTS) {
    const eventNodeId = `event:${event.id}`;
    entityMap.set(eventNodeId, {
      id: eventNodeId,
      kind: 'event',
      label: event.title,
      aliases: [event.title],
      countryCodes: [event.countryId],
      metadata: { source: 'event', impact: event.impact },
    });

    edges.push({
      id: `edge:event:${event.id}:country:${event.countryId}`,
      source: eventNodeId,
      target: `country:${event.countryId}`,
      relation: 'happened_in',
      confidence: 1,
      evidence: [`event:${event.id}`],
      validFrom: event.date,
    });

    for (const narrativeId of event.relatedNarrativeIds) {
      edges.push({
        id: `edge:event:${event.id}:narrative:${narrativeId}`,
        source: eventNodeId,
        target: `narrative:${narrativeId}`,
        relation: 'related_to_narrative',
        confidence: 0.92,
        evidence: [`event:${event.id}`],
        validFrom: event.date,
      });
    }
  }

  return {
    entities: Array.from(entityMap.values()),
    edges: uniqueEdges(edges),
  };
}

export class MockGraphRepository implements GraphRepository {
  getSnapshot(): GraphSnapshotWithIndex {
    const snapshot = buildGraphSnapshot();
    return {
      ...snapshot,
      nodeMap: new Map(snapshot.entities.map((entity) => [entity.id, entity])),
      nodeIds: new Set(snapshot.entities.map((entity) => entity.id)),
    };
  }
}

export const defaultGraphRepository = new MockGraphRepository();
