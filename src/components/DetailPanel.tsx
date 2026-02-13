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
import type { Article, VoxComment } from '@/types/ontology';
import { fetchBrief, fetchCase, type BriefResponse, type CaseResponse } from '@/lib/analyst/client';
import { entityKindLabel, narrativeStatusLabel, relationLabel } from '@/lib/plain-language';

function SentimentBadge({ value }: { value: number }) {
  const color = value > 0.3 ? 'text-green-400' : value < -0.3 ? 'text-red-400' : 'text-zinc-400';
  return <span className={`t-meta ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}</span>;
}

function StanceBadge({ stance }: { stance: string }) {
  const styles: Record<string, string> = {
    pro_russia: 'bg-blue-500/20 text-blue-300',
    neutral: 'bg-zinc-500/20 text-zinc-300',
    anti_russia: 'bg-orange-500/20 text-orange-300',
  };
  const labels: Record<string, string> = {
    pro_russia: '🇷🇺 за Россию',
    neutral: '⚖️ нейтрально',
    anti_russia: '🌍 против России',
  };
  return (
    <span className={`t-meta px-1.5 py-0.5 rounded ${styles[stance] || ''}`}>
      {labels[stance] || stance}
    </span>
  );
}

function ArticleRow({ article, onNavigate }: { article: Article; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="w-full text-left p-2 rounded-lg hover:bg-zinc-800 transition-colors">
      <div className="t-body text-white line-clamp-2">{article.title}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="t-meta text-zinc-500">{article.source}</span>
        <SentimentBadge value={article.sentiment} />
        <StanceBadge stance={article.stance} />
        <span className="t-meta text-zinc-600">{new Date(article.publishedAt).toLocaleDateString('ru')}</span>
      </div>
    </button>
  );
}

function CommentRow({ comment }: { comment: VoxComment }) {
  return (
    <div className="p-2 rounded-lg bg-zinc-800/50">
      <div className="t-body text-zinc-300 line-clamp-2">{comment.text}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="t-meta">{comment.emotion}</span>
        <StanceBadge stance={comment.stance} />
        <span className="t-meta text-zinc-600">{comment.topics.join(', ')}</span>
      </div>
    </div>
  );
}

// ============================================================
// Country Detail
// ============================================================

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

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <span className="t-display">{country.flag}</span>
        <div>
          <h2 className="t-display font-bold text-white">{country.nameRu}</h2>
          <div className="t-body text-zinc-400">
Уровень внимания {country.tier} · {country.region}
            {temp && <span className="ml-2">· 🌡 {temp.value}° ({temp.delta > 0 ? '+' : ''}{temp.delta})</span>}
          </div>
        </div>
      </div>

      {/* Связанные объекты */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {[
          { label: 'Сюжеты', count: narratives.length, emoji: '📰' },
          { label: 'Статьи', count: articles.length, emoji: '📄' },
          { label: 'Каналы', count: channels.length, emoji: '📡' },
          { label: 'Комменты', count: comments.length, emoji: '💬' },
        ].map(s => (
          <div key={s.label} className="p-2 rounded-lg bg-zinc-800/50">
            <div className="t-body">{s.emoji}</div>
            <div className="t-body font-semibold text-white">{s.count}</div>
            <div className="t-meta text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Narratives */}
      {narratives.length > 0 && (
        <div>
          <h3 className="t-body font-semibold text-zinc-400 mb-2">📰 Сюжеты</h3>
          <div className="space-y-2">
            {narratives.map(n => (
              <button
                key={n.id}
                onClick={() => navigate('Narrative', n.id, { relation: 'has_narratives', fromType: 'Country', fromId: countryId })}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="t-body text-white font-medium">{n.titleRu}</span>
                  <span className={`t-meta px-2 py-0.5 rounded-full ${
                    n.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    n.status === 'fading' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-zinc-500/20 text-zinc-300'
                  }`}>{narrativeStatusLabel(n.status)}</span>
                </div>
                <div className="flex items-center gap-3 t-meta text-zinc-500 mt-1">
                  <span>Расхождение: {n.divergenceScore}%</span>
                  <span>{n.articleCount} статей</span>
                  <span>{n.countries.join(', ')}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Articles */}
      {articles.length > 0 && (
        <div>
          <h3 className="t-body font-semibold text-zinc-400 mb-2">📄 Статьи</h3>
          <div className="space-y-1">
            {articles.map(a => (
              <ArticleRow 
                key={a.id} 
                article={a} 
                onNavigate={() => navigate('Article', a.id, { relation: 'has_articles', fromType: 'Country', fromId: countryId })} 
              />
            ))}
          </div>
        </div>
      )}

      {/* Events */}
      {events.length > 0 && (
        <div>
          <h3 className="t-body font-semibold text-zinc-400 mb-2">🔥 События</h3>
          <div className="space-y-1">
            {events.map(e => (
              <div key={e.id} className="p-2 rounded-lg bg-zinc-800/50 flex items-center justify-between">
                <div>
                  <div className="t-body text-white">{e.title}</div>
                  <div className="t-meta text-zinc-500">{new Date(e.date).toLocaleDateString('ru')}</div>
                </div>
                <span className={`t-meta px-2 py-0.5 rounded ${
                  e.impact === 'high' ? 'bg-red-500/20 text-red-300' :
                  e.impact === 'medium' ? 'bg-yellow-500/20 text-yellow-300' :
                  'bg-zinc-500/20 text-zinc-300'
                }`}>{e.impact}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Narrative Detail
// ============================================================

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
  const countriesPlain = narrative.countries
    .map((cid) => getCountry(cid)?.nameRu)
    .filter(Boolean)
    .join(', ');

  const simpleSummary = brief?.bullets?.[0] || `Сейчас в центре внимания тема: ${narrative.titleRu}.`;

  const timelineItems = workspace
    ? workspace.timeline.slice(0, 12).map((a) => ({
        id: a.articleId,
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        sentiment: a.sentiment,
        stance: a.stance,
      }))
    : articles.slice(0, 12).map((a) => ({
        id: a.id,
        title: a.title,
        source: a.source,
        publishedAt: a.publishedAt,
        sentiment: a.sentiment,
        stance: a.stance,
      }));

  return (
    <div className="space-y-5">
      <div className="g-panel rounded-2xl p-4 space-y-2">
        <div className="g-kicker">Главный сюжет</div>
        <h2 className="t-display font-semibold text-white">{narrative.titleRu}</h2>
        <p className="t-body text-zinc-300">{simpleSummary}</p>
        <div className="flex flex-wrap gap-2 t-meta text-zinc-400">
          <span className={`px-2 py-0.5 rounded-full ${
            narrative.status === 'active' ? 'bg-green-500/20 text-green-300' : 'bg-yellow-500/20 text-yellow-300'
          }`}>{narrativeStatusLabel(narrative.status)}</span>
          <span>Страны: {countriesPlain}</span>
          <span>Уровень споров: {narrative.divergenceScore}%</span>
        </div>
      </div>

      <section className="g-panel rounded-2xl p-4">
        <div className="flex items-end justify-between mb-3">
          <div>
            <div className="g-kicker">Главная ось сюжета</div>
            <h3 className="t-body text-white font-semibold">Вертикальная лента событий</h3>
          </div>
          <div className="t-meta text-zinc-500">Сверху новое, ниже более раннее</div>
        </div>

        <div className="space-y-0">
          {timelineItems.map((item, i) => {
            const isLast = i === timelineItems.length - 1;
            return (
              <div key={item.id} className="relative pl-8 pb-4">
                <span className="absolute left-1.5 top-1.5 h-3 w-3 rounded-full bg-cyan-300 ring-4 ring-cyan-500/20" />
                {!isLast && <span className="absolute left-[11px] top-5 bottom-0 w-px bg-zinc-700" />}

                <div className="rounded-xl border border-zinc-800 bg-zinc-900/70 p-3">
                  <div className="t-body text-white">{item.title}</div>
                  <div className="t-meta text-zinc-500 mt-1">
                    {new Date(item.publishedAt).toLocaleDateString('ru')} · {item.source}
                  </div>
                  <div className="t-meta text-zinc-400 mt-1">
                    Тон публикации: <SentimentBadge value={item.sentiment} /> · <StanceBadge stance={String(item.stance)} />
                  </div>
                  <button
                    onClick={() => navigate('Article', item.id, { relation: 'contains_articles', fromType: 'Narrative', fromId: narrativeId })}
                    className="mt-2 t-meta px-2 py-1 rounded border border-zinc-700 hover:border-zinc-500 text-zinc-300"
                  >
                    Открыть материал
                  </button>
                </div>
              </div>
            );
          })}

          {timelineItems.length === 0 && (
            <div className="t-body text-zinc-500">Пока нет событий для этой ленты.</div>
          )}
        </div>
      </section>

      {workspace && workspace.entities.length > 0 && (
        <section className="g-panel rounded-2xl p-4">
          <h3 className="t-body font-semibold text-zinc-300 mb-2">Чем это подтверждается</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {workspace.entities.slice(0, 8).map((e) => (
              <div key={e.id} className="p-2 rounded-lg bg-zinc-800/50">
                <div className="t-body text-white">{e.label}</div>
                <div className="t-meta text-zinc-500">{entityKindLabel(e.kind)} · связь: {relationLabel(e.relation)} · уверенность: {e.confidence.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

// ============================================================
// Article Detail
// ============================================================

function ArticleDetail({ articleId }: { articleId: number }) {
  const { navigate } = useGraph();
  const article = ARTICLES.find(a => a.id === articleId);
  if (!article) return <div className="p-4 text-zinc-500">Статья не найдена</div>;

  const comments = getCommentsForArticle(articleId);
  const channel = CHANNELS.find(c => c.id === article.channelId);
  const narrative = article.narrativeId ? getNarrative(article.narrativeId) : null;
  const country = getCountry(article.countryId);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="t-display font-bold text-white">{article.title}</h2>
        <div className="flex items-center gap-3 t-body text-zinc-400 mt-2">
          <SentimentBadge value={article.sentiment} />
          <StanceBadge stance={article.stance} />
          <span>{new Date(article.publishedAt).toLocaleDateString('ru')}</span>
          <span className="text-zinc-600">·</span>
          <span>{article.language}</span>
        </div>
      </div>

      {/* Связи */}
      <div className="space-y-2">
        {country && (
          <button
            onClick={() => navigate('Country', country.id, { relation: 'about_country', fromType: 'Article', fromId: articleId })}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors w-full text-left"
          >
            <span>🌍</span>
            <span className="t-body text-zinc-300">{country.flag} {country.nameRu}</span>
          </button>
        )}
        {channel && (
          <button
            onClick={() => navigate('Channel', channel.id, { relation: 'published_by', fromType: 'Article', fromId: articleId })}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors w-full text-left"
          >
            <span>📡</span>
            <span className="t-body text-zinc-300">{channel.name} ({channel.platform})</span>
          </button>
        )}
        {narrative && (
          <button
            onClick={() => navigate('Narrative', narrative.id, { relation: 'belongs_to_narrative', fromType: 'Article', fromId: articleId })}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors w-full text-left"
          >
            <span>📰</span>
            <span className="t-body text-zinc-300">{narrative.titleRu}</span>
          </button>
        )}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div>
          <h3 className="t-body font-semibold text-zinc-400 mb-2">💬 Комментарии ({comments.length})</h3>
          <div className="space-y-2">
            {comments.map(c => <CommentRow key={c.id} comment={c} />)}
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// Detail Panel Router
// ============================================================

export function DetailPanel() {
  const { state } = useGraph();

  if (!state.focus) {
    return (
      <div className="p-8 text-center">
        <div className="t-display mb-3">🐙</div>
        <div className="text-zinc-500 t-body">
          Выберите объект на графе для детального просмотра
        </div>
        <div className="text-zinc-600 t-meta mt-2">
          Клик на страну → сюжеты → статьи → комментарии
        </div>
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
      return (
        <div className="p-4 text-zinc-500">
          Просмотр {nodeType} #{nodeId} — в разработке
        </div>
      );
  }
}
