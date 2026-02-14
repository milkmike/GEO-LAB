import type { Article } from '@/types/ontology';
import { stanceFromSentiment, type TimelineItem } from '@/lib/timeline/engine';

export type TimelineSeed = {
  articleId: number;
  title: string;
  source: string;
  publishedAt: string;
  sentiment: number;
};

export function serializeArticleToTimelineSeed(article: Article): TimelineSeed {
  return {
    articleId: article.id,
    title: article.title,
    source: article.source,
    publishedAt: article.publishedAt,
    sentiment: article.sentiment,
  };
}

export function serializeNeighborEntity(neighbor: {
  relation: string;
  confidence: number;
  evidence: string[];
  node: { id: string; label: string; kind: string };
}) {
  const relevanceScore = Math.max(1, Math.min(5, Math.round(neighbor.confidence * 5)));

  return {
    id: neighbor.node.id,
    label: neighbor.node.label,
    kind: neighbor.node.kind,
    relation: neighbor.relation,
    whyIncluded: `Связь обнаружена через отношение ${neighbor.relation}`,
    relevanceScore,
    confidence: neighbor.confidence,
    evidence: neighbor.evidence,
  };
}

export function serializeEntityTimelineItem(
  item: TimelineSeed,
  cleanEntity: string,
  relevanceScore: number,
  countryCode: string,
): TimelineItem & { countryCode: string } {
  const sentiment = item.sentiment;
  const confidence = Math.max(0.45, Math.min(0.97, 0.4 + relevanceScore * 0.11));

  return {
    ...item,
    stance: stanceFromSentiment(sentiment),
    relevanceScore,
    whyIncluded: `Есть упоминание: ${cleanEntity}`,
    confidence,
    evidence: [`entity:${cleanEntity}`, `country:${countryCode}`],
    countryCode,
  };
}
