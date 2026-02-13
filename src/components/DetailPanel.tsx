'use client';

import { useEffect, useState } from 'react';
import { useGraph } from '@/lib/graph-provider';
import {
  getCountry,
  getNarrative,
  getNarrativesForCountry,
  getArticlesForCountry,
  getArticlesForNarrative,
  getChannelsForCountry,
  getCommentsForCountry,
  getCommentsForArticle,
  getEventsForCountry,
  getTemperatureForCountry,
  ARTICLES,
  CHANNELS,
} from '@/mock/data';
import type { VoxComment } from '@/types/ontology';
import { fetchBrief, fetchCase, type BriefResponse, type CaseResponse } from '@/lib/analyst/client';
import { narrativeStatusLabel } from '@/lib/plain-language';
import { TimelineSpine, type SpineItem } from '@/components/TimelineSpine';

function stanceLabel(stance: string): string {
  if (stance === 'pro_russia') return 'за Россию';
  if (stance === 'anti_russia') return 'против России';
  return 'нейтрально';
}

function sentimentLabel(v: number): string {
  if (v > 0.2) return `позитивно (+${v.toFixed(1)})`;
  if (v < -0.2) return `негативно (${v.toFixed(1)})`;
  return `спокойно (${v.toFixed(1)})`;
}

function CommentRow({ comment }: { comment: VoxComment }) {
  return (
    <div className="p-2 rounded-lg bg-zinc-800/50">
      <div className="t-body text-zinc-300 line-clamp-2">{comment.text}</div>
      <div className="t-meta text-zinc-500 mt-1">{comment.emotion} · {stanceLabel(comment.stance)}</div>
    </div>
  );
}

function CountryDetail({ countryId }: { countryId: string }) {
  const { navigate } = useGraph();
  const country = getCountry(countryId);
  if (!country) return <div className="p-4 text-zinc-500">Страна не найдена</div>;

  const narratives = getNarrativesForCountry(countryId);
  const articles = getArticlesForCountry(countryId);
  const channels = getChannelsForCountry(countryId);
  const comments = getCommentsForCountry(countryId);
  const events = getEventsForCountry(countryId);
  const temp = getTemperatureForCountry(countryId);

  const fromEvents: SpineItem[] = events.map((e) => ({
    id: `event:${e.id}`,
    title: e.title,
    date: e.date,
    meta: `Событие · важность: ${e.impact}`,
    cta: e.relatedNarrativeIds[0] ? 'Открыть сюжет' : undefined,
    isTurningPoint: e.impact === 'high',
  }));

  const fromArticles: SpineItem[] = articles.map((a) => ({
    id: `article:${a.id}`,
    title: a.title,
    date: a.publishedAt,
    meta: `${a.source} · ${sentimentLabel(a.sentiment)} · ${stanceLabel(a.stance)}`,
    cta: 'Открыть материал',
    isTurningPoint: Math.abs(a.sentiment) >= 0.6,
  }));

  const timelineItems: SpineItem[] = [...fromEvents, ...fromArticles].sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="g-kicker">Линия времени страны</div>
        <h2 className="t-display text-white font-semibold">{country.flag} {country.nameRu}</h2>
        <p className="t-body text-zinc-400">
          {country.region} · уровень внимания {country.tier}
          {temp ? ` · индекс: ${temp.value} (${temp.delta > 0 ? '+' : ''}${temp.delta})` : ''}
        </p>
        <div className="t-meta text-zinc-500 mt-1">
          {narratives.length} сюжетов · {articles.length} материалов · {channels.length} каналов · {comments.length} комментариев
        </div>
      </div>

      <TimelineSpine
        items={timelineItems}
        emptyText="Пока нет событий на линии времени этой страны."
        onOpen={(id) => {
          const [kind, raw] = id.split(':');
          if (!kind || !raw) return;

          if (kind === 'article') {
            navigate('Article', Number(raw), { relation: 'has_articles', fromType: 'Country', fromId: countryId });
            return;
          }

          if (kind === 'event') {
            const ev = events.find((e) => e.id === Number(raw));
            if (ev?.relatedNarrativeIds[0]) {
              navigate('Narrative', ev.relatedNarrativeIds[0], { relation: 'has_events', fromType: 'Country', fromId: countryId });
            }
          }
        }}
      />
    </div>
  );
}

function NarrativeDetail({ narrativeId }: { narrativeId: number }) {
  const { navigate } = useGraph();
  const narrative = getNarrative(narrativeId);
  const [workspace, setWorkspace] = useState<CaseResponse | null>(null);
  const [brief, setBrief] = useState<BriefResponse | null>(null);

  useEffect(() => {
    fetchCase(narrativeId).then(setWorkspace).catch(() => null);
  }, [narrativeId]);

  useEffect(() => {
    fetchBrief(narrativeId).then(setBrief).catch(() => null);
  }, [narrativeId]);

  if (!narrative) return <div className="p-4 text-zinc-500">Сюжет не найден</div>;

  const articles = getArticlesForNarrative(narrativeId);
  const timelineItems: SpineItem[] = (workspace
    ? workspace.timeline.map((a) => ({
        id: `article:${a.articleId}`,
        title: a.title,
        date: a.publishedAt,
        meta: `${a.source} · ${sentimentLabel(a.sentiment)} · ${stanceLabel(a.stance)}`,
        cta: 'Открыть материал',
        isTurningPoint: Math.abs(a.sentiment) >= 0.6,
      }))
    : articles.map((a) => ({
        id: `article:${a.id}`,
        title: a.title,
        date: a.publishedAt,
        meta: `${a.source} · ${sentimentLabel(a.sentiment)} · ${stanceLabel(a.stance)}`,
        cta: 'Открыть материал',
        isTurningPoint: Math.abs(a.sentiment) >= 0.6,
      }))).slice(0, 14);

  const intro = brief?.bullets?.[0] || `Сюжет: ${narrative.titleRu}`;

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="g-kicker">Сюжет на линии времени</div>
        <h2 className="t-display text-white font-semibold">{narrative.titleRu}</h2>
        <p className="t-body text-zinc-400">{intro}</p>
        <div className="t-meta text-zinc-500 mt-1">
          {narrativeStatusLabel(narrative.status)} · уровень споров {narrative.divergenceScore}%
        </div>
      </div>

      <TimelineSpine
        items={timelineItems}
        emptyText="Пока нет событий для этой линии времени."
        onOpen={(id) => {
          const [, raw] = id.split(':');
          if (!raw) return;
          navigate('Article', Number(raw), { relation: 'contains_articles', fromType: 'Narrative', fromId: narrativeId });
        }}
      />

      {workspace && workspace.entities.length > 0 && (
        <section className="pt-2 border-t border-zinc-800">
          <h3 className="t-body text-zinc-300 font-semibold mb-2">Кто участвует</h3>
          <div className="flex flex-wrap gap-2">
            {workspace.entities.slice(0, 10).map((e) => (
              <span key={e.id} className="t-meta px-2 py-1 rounded-full border border-zinc-700 bg-zinc-900 text-zinc-300">
                {e.label}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function ArticleDetail({ articleId }: { articleId: number }) {
  const { navigate } = useGraph();
  const article = ARTICLES.find((a) => a.id === articleId);
  if (!article) return <div className="p-4 text-zinc-500">Статья не найдена</div>;

  const comments = getCommentsForArticle(articleId);
  const channel = CHANNELS.find((c) => c.id === article.channelId);
  const narrative = article.narrativeId ? getNarrative(article.narrativeId) : null;
  const country = getCountry(article.countryId);

  const around = article.narrativeId
    ? getArticlesForNarrative(article.narrativeId)
    : getArticlesForCountry(article.countryId);

  const timelineItems: SpineItem[] = around
    .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
    .slice(0, 10)
    .map((a) => ({
      id: `article:${a.id}`,
      title: a.id === articleId ? `● ${a.title}` : a.title,
      date: a.publishedAt,
      meta: `${a.source} · ${sentimentLabel(a.sentiment)} · ${stanceLabel(a.stance)}`,
      cta: 'Открыть материал',
      isTurningPoint: a.id === articleId || Math.abs(a.sentiment) >= 0.6,
    }));

  return (
    <div className="space-y-4">
      <div className="text-center py-2">
        <div className="g-kicker">Материал на линии времени</div>
        <h2 className="t-display text-white font-semibold">{article.title}</h2>
        <p className="t-body text-zinc-400">
          {country ? `${country.flag} ${country.nameRu}` : 'Страна не указана'}
          {channel ? ` · ${channel.name}` : ''}
          {narrative ? ` · сюжет: ${narrative.titleRu}` : ''}
        </p>
      </div>

      <TimelineSpine
        items={timelineItems}
        emptyText="Рядом нет других материалов на этой линии времени."
        onOpen={(id) => {
          const [, raw] = id.split(':');
          if (!raw) return;
          navigate('Article', Number(raw), { relation: 'contains_articles', fromType: 'Article', fromId: articleId });
        }}
      />

      {comments.length > 0 && (
        <div>
          <h3 className="t-body font-semibold text-zinc-400 mb-2">💬 Комментарии ({comments.length})</h3>
          <div className="space-y-2">
            {comments.map((c) => <CommentRow key={c.id} comment={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

export function DetailPanel() {
  const { state } = useGraph();

  if (!state.focus) {
    return (
      <div className="p-8 text-center">
        <div className="t-display mb-3">⏱</div>
        <div className="text-zinc-500 t-body">Выберите страну, сюжет или материал — и увидите его линию времени.</div>
      </div>
    );
  }

  const { nodeType, nodeId } = state.focus;

  switch (nodeType) {
    case 'Country':
      return <CountryDetail countryId={String(nodeId)} />;
    case 'Narrative':
      return <NarrativeDetail key={`n-${nodeId}`} narrativeId={Number(nodeId)} />;
    case 'Article':
      return <ArticleDetail articleId={Number(nodeId)} />;
    default:
      return <div className="p-4 text-zinc-500">Для этого типа пока нет временной ленты.</div>;
  }
}
