import type { TimelineItem } from '@/lib/timeline/engine';

export type TemporalScope = 'country' | 'narrative' | 'entity';
export type TemporalIntent = 'monitor' | 'investigate' | 'compare' | 'entity_focus' | 'unknown';

export type TemporalDocument = {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
  countryCode: string;
  narrativeId?: number;
};

export type ParsedTemporalQuery = {
  raw: string;
  normalized: string;
  terms: string[];
  intent: TemporalIntent;
  scope: TemporalScope;
  entities: string[];
  time: {
    from: string | null;
    to: string | null;
    preset: '24h' | '7d' | '30d' | 'custom' | 'all';
  };
  countries: string[];
  narrativeId?: number;
};

export type TemporalSubquery = {
  id: string;
  label: string;
  from: string | null;
  to: string | null;
  boostedTerms: string[];
  weight: number;
};

export type TemporalSearchInput = {
  query: string;
  scope: TemporalScope;
  documents: TemporalDocument[];
  countries?: string[];
  narrativeId?: number;
  timeFrom?: string;
  timeTo?: string;
  now?: Date;
  limit?: number;
};

export type TemporalRetrieveResult = {
  parsed: ParsedTemporalQuery;
  subqueries: TemporalSubquery[];
  timeline: TimelineItem[];
};

export type TemporalCandidate = TemporalDocument & {
  lexicalScore: number;
  vectorScore: number;
  graphScore: number;
  temporalScore: number;
  consistencyScore: number;
  centralityScore: number;
  trustScore: number;
  rerankScore: number;
  why: string[];
};
