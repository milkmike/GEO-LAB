import { TEMPORAL_RULES, TEMPORAL_SCORING } from '@/lib/analyst/config/scoring';
import { stanceFromSentiment } from '@/lib/timeline/engine';
import {
  allowedByScope,
  buildWhy,
  cosine,
  dedupe,
  decomposeTemporalQuery,
  graphSignals,
  hashedVector,
  inRange,
  lexicalScore,
  parseTemporalQuery,
  rerank,
  sourceTrust,
  temporalFreshness,
} from '@/lib/temporal/rules';
import type { TemporalCandidate, TemporalRetrieveResult, TemporalSearchInput } from '@/lib/temporal/types';
import { recordRetrievalMetric } from '@/lib/monitoring/metrics';

export function temporalRetrieve(input: TemporalSearchInput): TemporalRetrieveResult {
  const now = input.now || new Date();
  const parsed = parseTemporalQuery({
    query: input.query,
    scope: input.scope,
    countries: input.countries,
    narrativeId: input.narrativeId,
    timeFrom: input.timeFrom,
    timeTo: input.timeTo,
    now,
  });
  const subqueries = decomposeTemporalQuery(parsed);

  const queryVector = hashedVector(input.query);
  const candidates: TemporalCandidate[] = [];

  for (const subquery of subqueries) {
    for (const doc of input.documents) {
      if (!allowedByScope(doc, parsed)) continue;
      if (!inRange(doc.publishedAt, subquery.from, subquery.to)) continue;

      const lexical = lexicalScore(doc, subquery.boostedTerms);
      const vector = cosine(queryVector, hashedVector(`${doc.title} ${doc.source}`));
      const graph = graphSignals(doc, parsed);
      const temporal = temporalFreshness(doc, now);
      const trust = sourceTrust(doc.source);

      const gate = Math.max(lexical, vector, graph.score);
      if (gate < TEMPORAL_SCORING.gates.candidateScore) continue;

      candidates.push({
        ...doc,
        lexicalScore: lexical * subquery.weight,
        vectorScore: vector * subquery.weight,
        graphScore: graph.score,
        temporalScore: temporal,
        consistencyScore: 0,
        centralityScore: graph.centrality,
        trustScore: trust,
        rerankScore: 0,
        why: graph.reasons,
      });
    }
  }

  const ranked = rerank(dedupe(candidates)).slice(0, input.limit || TEMPORAL_RULES.limits.defaultTimelineLimit);

  const timeline = ranked.map((candidate) => {
    const confidence = Math.max(TEMPORAL_RULES.confidence.floor, Math.min(TEMPORAL_RULES.confidence.ceil, candidate.rerankScore));

    return {
      articleId: candidate.articleId,
      title: candidate.title,
      source: candidate.source,
      publishedAt: candidate.publishedAt,
      sentiment: candidate.sentiment,
      stance: stanceFromSentiment(candidate.sentiment),
      relevanceScore: Math.max(1, Math.min(5, Math.round(candidate.rerankScore * 5))),
      whyIncluded: buildWhy(candidate, parsed),
      confidence,
      evidence: candidate.why.length ? candidate.why : [`source:${candidate.source}`],
    };
  });

  const freshnessHours = ranked.length
    ? ranked.reduce((acc, item) => {
      const ts = +new Date(item.publishedAt);
      if (!Number.isFinite(ts)) return acc;
      return acc + Math.max(0, (now.getTime() - ts) / (1000 * 60 * 60));
    }, 0) / ranked.length
    : 0;

  recordRetrievalMetric({
    scope: parsed.scope,
    query: parsed.normalized,
    candidates: candidates.length,
    returned: timeline.length,
    freshnessHours,
  });

  return { parsed, subqueries, timeline };
}
