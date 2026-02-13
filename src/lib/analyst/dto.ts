export type AnalystScope = 'country' | 'narrative' | 'entity';

export interface TriageResponse {
  escalations: Array<{ narrativeId: number; title: string; divergence: number; status: string; countries: string[] }>;
  newest: Array<{ narrativeId: number; title: string; lastSeen: string; articleCount: number }>;
  quality: { status: string; entities: number; edges: number; aliasConflicts: number };
  generatedAt: string;
}

export interface ExplainabilityFields {
  whyIncluded: string;
  relevanceScore: number;
  confidence: number;
  evidence: string[];
}

export interface TimelineResponseItem extends ExplainabilityFields {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
  stance: string;
}

export interface CaseEntityResponseItem extends ExplainabilityFields {
  id: string;
  label: string;
  kind: string;
  relation: string;
}

export interface CaseResponse {
  timelineScope: 'narrative';
  narrative: {
    id: number;
    title: string;
    status: string;
    divergence: number;
    articleCount: number;
    keywords: string[];
  };
  countries: Array<{ id: string; label: string }>;
  timeline: TimelineResponseItem[];
  entities: CaseEntityResponseItem[];
  events: Array<{ id: number; title: string; date: string; impact: string }>;
  graphStats: { nodes: number; edges: number };
}

export interface BriefResponse {
  narrativeId: number;
  title: string;
  bullets: string[];
  generatedAt: string;
}

export interface CountryWorkspaceResponse {
  timelineScope: 'country';
  country: {
    id: string;
    name: string;
    flag: string;
    temperature: number | null;
    divergence: number;
    articleCount: number;
    updatedAt: string | null;
  };
  timeline: TimelineResponseItem[];
  generatedAt: string;
}

export interface EntityWorkspaceResponse {
  timelineScope: 'entity';
  entity: string;
  countries: string[];
  timeline: Array<TimelineResponseItem & { countryCode: string }>;
  generatedAt: string;
}
