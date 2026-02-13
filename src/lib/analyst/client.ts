export interface TriageResponse {
  escalations: Array<{ narrativeId: number; title: string; divergence: number; status: string; countries: string[] }>;
  newest: Array<{ narrativeId: number; title: string; lastSeen: string; articleCount: number }>;
  quality: { status: string; entities: number; edges: number; aliasConflicts: number };
  generatedAt: string;
}

export interface CaseResponse {
  narrative: {
    id: number;
    title: string;
    status: string;
    divergence: number;
    articleCount: number;
    keywords: string[];
  };
  countries: Array<{ id: string; label: string }>;
  timeline: Array<{ articleId: number; title: string; source: string; publishedAt: string; sentiment: number; stance: string }>;
  entities: Array<{ id: string; label: string; kind: string; relation: string; confidence: number; evidence: string[] }>;
  events: Array<{ id: number; title: string; date: string; impact: string }>;
  graphStats: { nodes: number; edges: number };
}

export interface BriefResponse {
  narrativeId: number;
  title: string;
  bullets: string[];
  generatedAt: string;
}

export async function fetchTriage(): Promise<TriageResponse> {
  const r = await fetch('/api/analyst/triage', { cache: 'no-store' });
  if (!r.ok) throw new Error(`triage ${r.status}`);
  return r.json();
}

export async function fetchCase(narrativeId: number): Promise<CaseResponse> {
  const r = await fetch(`/api/analyst/case?narrativeId=${narrativeId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`case ${r.status}`);
  return r.json();
}

export async function fetchBrief(narrativeId: number): Promise<BriefResponse> {
  const r = await fetch(`/api/analyst/brief?narrativeId=${narrativeId}`, { cache: 'no-store' });
  if (!r.ok) throw new Error(`brief ${r.status}`);
  return r.json();
}
