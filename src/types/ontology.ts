/**
 * GeoPulse Ontology — Core Type System
 * 
 * Граф объектов и связей, вдохновлённый Palantir Ontology.
 * Каждый ObjectType — узел графа, каждый LinkType — направленная связь.
 */

// ============================================================
// Object Types — узлы графа
// ============================================================

export interface Country {
  type: 'Country';
  id: string;           // ISO code: "KZ", "UZ", etc.
  name: string;
  nameRu: string;
  flag: string;         // emoji
  tier: 1 | 2 | 3;
  region: string;
  temperature?: number; // текущий индекс напряжённости 0-100
}

export interface Narrative {
  type: 'Narrative';
  id: number;
  title: string;
  titleRu: string;
  countries: string[];     // country IDs
  articleCount: number;
  divergenceScore: number; // 0-100, расхождение позиций
  status: 'active' | 'fading' | 'resolved';
  firstSeen: string;       // ISO date
  lastSeen: string;
  keywords: string[];
}

export interface Article {
  type: 'Article';
  id: number;
  title: string;
  url: string;
  source: string;
  channelId: number;
  countryId: string;
  narrativeId?: number;
  publishedAt: string;
  sentiment: number;       // -1 to 1
  stance: 'pro_russia' | 'neutral' | 'anti_russia';
  language: string;
}

export interface Channel {
  type: 'Channel';
  id: number;
  name: string;
  platform: 'telegram' | 'web' | 'rss';
  countryId: string;
  url: string;
  subscriberCount?: number;
  isActive: boolean;
}

export interface VoxComment {
  type: 'VoxComment';
  id: number;
  text: string;
  articleId: number;
  countryId: string;
  emotion: string;
  stance: 'pro_russia' | 'neutral' | 'anti_russia';
  topics: string[];
  sentiment: number;
  language: string;
  publishedAt: string;
}

export interface TemperaturePoint {
  type: 'TemperaturePoint';
  id: string;              // `${countryId}_${date}`
  countryId: string;
  date: string;
  value: number;           // 0-100
  delta: number;           // change from previous
  drivers: string[];       // narrative IDs that contributed
}

export interface Event {
  type: 'Event';
  id: number;
  title: string;
  date: string;
  countryId: string;
  impact: 'high' | 'medium' | 'low';
  relatedNarrativeIds: number[];
}

// ============================================================
// Union type — любой объект в графе
// ============================================================

export type OntologyNode = 
  | Country 
  | Narrative 
  | Article 
  | Channel 
  | VoxComment 
  | TemperaturePoint 
  | Event;

export type NodeType = OntologyNode['type'];

// ============================================================
// Link Types — рёбра графа
// ============================================================

export interface OntologyLink {
  sourceType: NodeType;
  targetType: NodeType;
  relation: string;
  // Функция для получения связанных объектов
  // (реализуется в GraphProvider)
}

/**
 * Схема всех связей в графе GeoPulse.
 * Каждая связь двунаправленная (можно пройти в обе стороны).
 */
export const ONTOLOGY_SCHEMA: OntologyLink[] = [
  // Country connections
  { sourceType: 'Country', targetType: 'Narrative',        relation: 'has_narratives' },
  { sourceType: 'Country', targetType: 'Article',          relation: 'has_articles' },
  { sourceType: 'Country', targetType: 'Channel',          relation: 'has_channels' },
  { sourceType: 'Country', targetType: 'VoxComment',       relation: 'has_comments' },
  { sourceType: 'Country', targetType: 'TemperaturePoint', relation: 'has_temperature' },
  { sourceType: 'Country', targetType: 'Event',            relation: 'has_events' },

  // Narrative connections
  { sourceType: 'Narrative', targetType: 'Article',   relation: 'contains_articles' },
  { sourceType: 'Narrative', targetType: 'Country',   relation: 'spans_countries' },
  { sourceType: 'Narrative', targetType: 'Event',     relation: 'triggered_by' },

  // Article connections
  { sourceType: 'Article', targetType: 'Channel',     relation: 'published_by' },
  { sourceType: 'Article', targetType: 'VoxComment',  relation: 'has_comments' },
  { sourceType: 'Article', targetType: 'Narrative',   relation: 'belongs_to_narrative' },
  { sourceType: 'Article', targetType: 'Country',     relation: 'about_country' },

  // Channel connections
  { sourceType: 'Channel', targetType: 'Article',     relation: 'publishes' },
  { sourceType: 'Channel', targetType: 'Country',     relation: 'based_in' },

  // VoxComment connections
  { sourceType: 'VoxComment', targetType: 'Article',  relation: 'comments_on' },
  { sourceType: 'VoxComment', targetType: 'Country',  relation: 'from_country' },

  // Temperature connections
  { sourceType: 'TemperaturePoint', targetType: 'Country',   relation: 'measures' },
  { sourceType: 'TemperaturePoint', targetType: 'Narrative', relation: 'driven_by' },

  // Event connections
  { sourceType: 'Event', targetType: 'Country',   relation: 'happened_in' },
  { sourceType: 'Event', targetType: 'Narrative', relation: 'spawned_narrative' },
];

// ============================================================
// Navigation State — позиция в графе
// ============================================================

export interface GraphFocus {
  nodeType: NodeType;
  nodeId: string | number;
  via?: {
    relation: string;
    fromType: NodeType;
    fromId: string | number;
  };
}

export interface GraphPath {
  steps: GraphFocus[];
  current: number; // index in steps
}

/**
 * Сериализация пути в URL.
 * Пример: /country/KZ/narrative/42/articles
 * → [{ nodeType: 'Country', nodeId: 'KZ' }, { nodeType: 'Narrative', nodeId: 42 }]
 */
export function serializeGraphPath(path: GraphFocus[]): string {
  return path
    .map(f => `${f.nodeType.toLowerCase()}/${f.nodeId}`)
    .join('/');
}

export function parseGraphPath(url: string): GraphFocus[] {
  const segments = url.split('/').filter(Boolean);
  const focuses: GraphFocus[] = [];
  
  for (let i = 0; i < segments.length; i += 2) {
    const typeStr = segments[i];
    const id = segments[i + 1];
    if (!typeStr || !id) continue;
    
    const nodeType = TYPE_MAP[typeStr];
    if (!nodeType) continue;
    
    focuses.push({
      nodeType,
      nodeId: isNaN(Number(id)) ? id : Number(id),
    });
  }
  
  return focuses;
}

const TYPE_MAP: Record<string, NodeType> = {
  country: 'Country',
  narrative: 'Narrative',
  article: 'Article',
  channel: 'Channel',
  comment: 'VoxComment',
  vox: 'VoxComment',
  temperature: 'TemperaturePoint',
  event: 'Event',
};

// ============================================================
// Filters — глобальные фильтры поверх графа
// ============================================================

export interface GlobalFilters {
  dateRange?: [string, string]; // [from, to] ISO dates
  countries?: string[];
  sentiment?: [number, number]; // range
  stance?: ('pro_russia' | 'neutral' | 'anti_russia')[];
  search?: string;
}
