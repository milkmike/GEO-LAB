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

function SentimentBadge({ value }: { value: number }) {
  const color = value > 0.3 ? 'text-green-400' : value < -0.3 ? 'text-red-400' : 'text-zinc-400';
  return <span className={`text-xs ${color}`}>{value > 0 ? '+' : ''}{value.toFixed(1)}</span>;
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
    <span className={`text-xs px-1.5 py-0.5 rounded ${styles[stance] || ''}`}>
      {labels[stance] || stance}
    </span>
  );
}

function narrativeStatusLabel(status: string): string {
  if (status === 'active') return 'активно обсуждается';
  if (status === 'fading') return 'обсуждение стихает';
  return status;
}

function entityKindLabel(kind: string): string {
  if (kind === 'person') return 'человек';
  if (kind === 'org') return 'организация';
  if (kind === 'place') return 'место';
  if (kind === 'event') return 'событие';
  return kind;
}

function ArticleRow({ article, onNavigate }: { article: Article; onNavigate: () => void }) {
  return (
    <button onClick={onNavigate} className="w-full text-left p-2 rounded-lg hover:bg-zinc-800 transition-colors">
      <div className="text-sm text-white line-clamp-2">{article.title}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs text-zinc-500">{article.source}</span>
        <SentimentBadge value={article.sentiment} />
        <StanceBadge stance={article.stance} />
        <span className="text-xs text-zinc-600">{new Date(article.publishedAt).toLocaleDateString('ru')}</span>
      </div>
    </button>
  );
}

function CommentRow({ comment }: { comment: VoxComment }) {
  return (
    <div className="p-2 rounded-lg bg-zinc-800/50">
      <div className="text-sm text-zinc-300 line-clamp-2">{comment.text}</div>
      <div className="flex items-center gap-2 mt-1">
        <span className="text-xs">{comment.emotion}</span>
        <StanceBadge stance={comment.stance} />
        <span className="text-xs text-zinc-600">{comment.topics.join(', ')}</span>
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
        <span className="text-4xl">{country.flag}</span>
        <div>
          <h2 className="text-xl font-bold text-white">{country.nameRu}</h2>
          <div className="text-sm text-zinc-400">
Уровень {country.tier} · {country.region}
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
            <div className="text-lg">{s.emoji}</div>
            <div className="text-lg font-bold text-white">{s.count}</div>
            <div className="text-xs text-zinc-500">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Narratives */}
      {narratives.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">📰 Сюжеты</h3>
          <div className="space-y-2">
            {narratives.map(n => (
              <button
                key={n.id}
                onClick={() => navigate('Narrative', n.id, { relation: 'has_narratives', fromType: 'Country', fromId: countryId })}
                className="w-full text-left p-3 rounded-lg border border-zinc-800 hover:border-zinc-600 hover:bg-zinc-800/50 transition-all"
              >
                <div className="flex items-center justify-between">
                  <span className="text-sm text-white font-medium">{n.titleRu}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    n.status === 'active' ? 'bg-green-500/20 text-green-300' :
                    n.status === 'fading' ? 'bg-yellow-500/20 text-yellow-300' :
                    'bg-zinc-500/20 text-zinc-300'
                  }`}>{narrativeStatusLabel(n.status)}</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-zinc-500 mt-1">
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
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">📄 Статьи</h3>
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
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">🔥 События</h3>
          <div className="space-y-1">
            {events.map(e => (
              <div key={e.id} className="p-2 rounded-lg bg-zinc-800/50 flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">{e.title}</div>
                  <div className="text-xs text-zinc-500">{new Date(e.date).toLocaleDateString('ru')}</div>
                </div>
                <span className={`text-xs px-2 py-0.5 rounded ${
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

  if (!narrative) return <div className="p-4 text-zinc-500">Сюжет не найден</div>;

  const articles = getArticlesForNarrative(narrativeId);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-white">{narrative.titleRu}</h2>
          <div className="flex items-center gap-3 text-sm text-zinc-400 mt-1">
            <span className={`px-2 py-0.5 rounded-full ${
              narrative.status === 'active' ? 'bg-green-500/20 text-green-300' :
              'bg-yellow-500/20 text-yellow-300'
            }`}>{narrativeStatusLabel(narrative.status)}</span>
            <span>Уровень споров: {narrative.divergenceScore}%</span>
            {workspace && <span>Карта связей: {workspace.graphStats.nodes} узлов / {workspace.graphStats.edges} связей</span>}
          </div>
        </div>
        <button
          onClick={() => fetchBrief(narrativeId).then(setBrief).catch(() => null)}
          className="text-xs px-3 py-2 rounded-lg bg-blue-500/20 text-blue-300 hover:bg-blue-500/30"
        >
Собрать краткую сводку
        </button>
      </div>

      {/* Countries involved */}
      <div>
        <h3 className="text-sm font-semibold text-zinc-400 mb-2">🌍 Страны</h3>
        <div className="flex gap-2 flex-wrap">
          {narrative.countries.map(cid => {
            const c = getCountry(cid);
            return c ? (
              <button
                key={cid}
                onClick={() => navigate('Country', cid, { relation: 'spans_countries', fromType: 'Narrative', fromId: narrativeId })}
                className="px-3 py-1.5 rounded-lg border border-zinc-700 hover:border-zinc-500 bg-zinc-800/50 text-sm text-white transition-colors"
              >
                {c.flag} {c.nameRu}
              </button>
            ) : null;
          })}
        </div>
      </div>

      {/* Keywords */}
      <div className="flex flex-wrap gap-1.5">
        {narrative.keywords.map(kw => (
          <span key={kw} className="text-xs px-2 py-1 rounded-full bg-zinc-800 text-zinc-400">{kw}</span>
        ))}
      </div>

      {/* Entities + Evidence */}
      {workspace && workspace.entities.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">🧩 Кто участвует и чем это подтверждается</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            {workspace.entities.slice(0, 8).map((e) => (
              <div key={e.id} className="p-2 rounded-lg bg-zinc-800/50">
                <div className="text-sm text-white">{e.label}</div>
                <div className="text-xs text-zinc-500">{entityKindLabel(e.kind)} · связь: {e.relation} · уверенность: {e.confidence.toFixed(2)}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Timeline */}
      {workspace && workspace.timeline.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">🕒 Хронология событий по сюжету</h3>
          <div className="space-y-1">
            {workspace.timeline.slice(0, 12).map((a) => (
              <ArticleRow
                key={a.articleId}
                article={{
                  type: 'Article',
                  id: a.articleId,
                  title: a.title,
                  url: '#',
                  source: a.source,
                  channelId: 0,
                  countryId: narrative.countries[0],
                  narrativeId,
                  publishedAt: a.publishedAt,
                  sentiment: a.sentiment,
                  stance: a.stance as 'pro_russia' | 'neutral' | 'anti_russia',
                  language: 'ru',
                }}
                onNavigate={() => navigate('Article', a.articleId, { relation: 'contains_articles', fromType: 'Narrative', fromId: narrativeId })}
              />
            ))}
          </div>
        </div>
      )}

      {/* Brief */}
      {brief && (
        <div className="p-3 rounded-xl border border-zinc-700 bg-zinc-900/80">
          <h3 className="text-sm font-semibold text-zinc-300 mb-2">📝 Краткая сводка по сюжету</h3>
          <ul className="list-disc list-inside space-y-1 text-sm text-zinc-300">
            {brief.bullets.map((b, i) => <li key={i}>{b}</li>)}
          </ul>
        </div>
      )}

      {/* Articles fallback */}
      {articles.length > 0 && !workspace && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">📄 Статьи ({articles.length})</h3>
          <div className="space-y-1">
            {articles.map(a => (
              <ArticleRow
                key={a.id}
                article={a}
                onNavigate={() => navigate('Article', a.id, { relation: 'contains_articles', fromType: 'Narrative', fromId: narrativeId })}
              />
            ))}
          </div>
        </div>
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
        <h2 className="text-lg font-bold text-white">{article.title}</h2>
        <div className="flex items-center gap-3 text-sm text-zinc-400 mt-2">
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
            <span className="text-sm text-zinc-300">{country.flag} {country.nameRu}</span>
          </button>
        )}
        {channel && (
          <button
            onClick={() => navigate('Channel', channel.id, { relation: 'published_by', fromType: 'Article', fromId: articleId })}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors w-full text-left"
          >
            <span>📡</span>
            <span className="text-sm text-zinc-300">{channel.name} ({channel.platform})</span>
          </button>
        )}
        {narrative && (
          <button
            onClick={() => navigate('Narrative', narrative.id, { relation: 'belongs_to_narrative', fromType: 'Article', fromId: articleId })}
            className="flex items-center gap-2 p-2 rounded-lg hover:bg-zinc-800 transition-colors w-full text-left"
          >
            <span>📰</span>
            <span className="text-sm text-zinc-300">{narrative.titleRu}</span>
          </button>
        )}
      </div>

      {/* Comments */}
      {comments.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-zinc-400 mb-2">💬 Комментарии ({comments.length})</h3>
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
        <div className="text-4xl mb-3">🐙</div>
        <div className="text-zinc-500 text-sm">
          Выберите объект на графе для детального просмотра
        </div>
        <div className="text-zinc-600 text-xs mt-2">
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
