import type { Country, Narrative, Article, Channel, VoxComment, TemperaturePoint, Event } from '@/types/ontology';

// ============================================================
// Countries
// ============================================================

export const COUNTRIES: Country[] = [
  { type: 'Country', id: 'KZ', name: 'Kazakhstan', nameRu: 'Казахстан', flag: '🇰🇿', tier: 1, region: 'Central Asia', temperature: 62 },
  { type: 'Country', id: 'UZ', name: 'Uzbekistan', nameRu: 'Узбекистан', flag: '🇺🇿', tier: 1, region: 'Central Asia', temperature: 45 },
  { type: 'Country', id: 'KG', name: 'Kyrgyzstan', nameRu: 'Кыргызстан', flag: '🇰🇬', tier: 2, region: 'Central Asia', temperature: 38 },
  { type: 'Country', id: 'GE', name: 'Georgia', nameRu: 'Грузия', flag: '🇬🇪', tier: 1, region: 'South Caucasus', temperature: 71 },
  { type: 'Country', id: 'MD', name: 'Moldova', nameRu: 'Молдова', flag: '🇲🇩', tier: 1, region: 'Eastern Europe', temperature: 58 },
  { type: 'Country', id: 'AZ', name: 'Azerbaijan', nameRu: 'Азербайджан', flag: '🇦🇿', tier: 2, region: 'South Caucasus', temperature: 44 },
  { type: 'Country', id: 'AM', name: 'Armenia', nameRu: 'Армения', flag: '🇦🇲', tier: 2, region: 'South Caucasus', temperature: 52 },
  { type: 'Country', id: 'TJ', name: 'Tajikistan', nameRu: 'Таджикистан', flag: '🇹🇯', tier: 3, region: 'Central Asia', temperature: 31 },
];

// ============================================================
// Narratives
// ============================================================

export const NARRATIVES: Narrative[] = [
  {
    type: 'Narrative', id: 1,
    title: 'Gas transit negotiations',
    titleRu: 'Переговоры по газовому транзиту',
    countries: ['KZ', 'UZ', 'KG'],
    articleCount: 47,
    divergenceScore: 73,
    status: 'active',
    firstSeen: '2025-11-15',
    lastSeen: '2026-02-12',
    keywords: ['газ', 'транзит', 'Газпром', 'CNPC'],
  },
  {
    type: 'Narrative', id: 2,
    title: 'EU integration push',
    titleRu: 'Курс на интеграцию с ЕС',
    countries: ['GE', 'MD'],
    articleCount: 83,
    divergenceScore: 89,
    status: 'active',
    firstSeen: '2025-08-20',
    lastSeen: '2026-02-11',
    keywords: ['ЕС', 'евроинтеграция', 'визы', 'ассоциация'],
  },
  {
    type: 'Narrative', id: 3,
    title: 'Military base discussions',
    titleRu: 'Обсуждение военных баз',
    countries: ['KG', 'TJ'],
    articleCount: 22,
    divergenceScore: 61,
    status: 'fading',
    firstSeen: '2026-01-05',
    lastSeen: '2026-02-08',
    keywords: ['база', 'ОДКБ', 'военные', 'вывод'],
  },
  {
    type: 'Narrative', id: 4,
    title: 'De-dollarization trend',
    titleRu: 'Дедолларизация расчётов',
    countries: ['KZ', 'UZ', 'AZ'],
    articleCount: 35,
    divergenceScore: 42,
    status: 'active',
    firstSeen: '2025-12-01',
    lastSeen: '2026-02-12',
    keywords: ['доллар', 'нацвалюта', 'SWIFT', 'расчёты'],
  },
  {
    type: 'Narrative', id: 5,
    title: 'Armenian-Azerbaijani normalization',
    titleRu: 'Нормализация армяно-азербайджанских отношений',
    countries: ['AM', 'AZ', 'GE'],
    articleCount: 56,
    divergenceScore: 91,
    status: 'active',
    firstSeen: '2025-09-10',
    lastSeen: '2026-02-11',
    keywords: ['мир', 'Карабах', 'коридор', 'граница'],
  },
];

// ============================================================
// Channels
// ============================================================

export const CHANNELS: Channel[] = [
  { type: 'Channel', id: 1, name: 'Tengrinews', platform: 'telegram', countryId: 'KZ', url: 't.me/tengrinews', subscriberCount: 450000, isActive: true },
  { type: 'Channel', id: 2, name: 'Zakon.kz', platform: 'telegram', countryId: 'KZ', url: 't.me/zakonkz', subscriberCount: 120000, isActive: true },
  { type: 'Channel', id: 3, name: 'Подробно.uz', platform: 'telegram', countryId: 'UZ', url: 't.me/podrobno', subscriberCount: 200000, isActive: true },
  { type: 'Channel', id: 4, name: 'Gazeta.uz', platform: 'telegram', countryId: 'UZ', url: 't.me/gazetauz', subscriberCount: 180000, isActive: true },
  { type: 'Channel', id: 5, name: 'Кабар', platform: 'telegram', countryId: 'KG', url: 't.me/kabar_kg', subscriberCount: 50000, isActive: true },
  { type: 'Channel', id: 6, name: 'Civil.ge', platform: 'web', countryId: 'GE', url: 'civil.ge', subscriberCount: undefined, isActive: true },
  { type: 'Channel', id: 7, name: 'Грузия Online', platform: 'telegram', countryId: 'GE', url: 't.me/gruzia_online', subscriberCount: 85000, isActive: true },
  { type: 'Channel', id: 8, name: 'Newsmaker.md', platform: 'telegram', countryId: 'MD', url: 't.me/newsmakermd', subscriberCount: 95000, isActive: true },
  { type: 'Channel', id: 9, name: 'Кавказский узел', platform: 'telegram', countryId: 'AZ', url: 't.me/kavkaz_uzel', subscriberCount: 130000, isActive: true },
  { type: 'Channel', id: 10, name: 'Sputnik Армения', platform: 'telegram', countryId: 'AM', url: 't.me/sputnik_am', subscriberCount: 60000, isActive: true },
];

// ============================================================
// Articles (sample)
// ============================================================

export const ARTICLES: Article[] = [
  { type: 'Article', id: 101, title: 'Казахстан и Узбекистан обсуждают новый газовый маршрут', url: '#', source: 'Tengrinews', channelId: 1, countryId: 'KZ', narrativeId: 1, publishedAt: '2026-02-12T08:00:00Z', sentiment: 0.2, stance: 'neutral', language: 'ru' },
  { type: 'Article', id: 102, title: 'CNPC расширяет присутствие в Центральной Азии', url: '#', source: 'Zakon.kz', channelId: 2, countryId: 'KZ', narrativeId: 1, publishedAt: '2026-02-11T14:00:00Z', sentiment: 0.1, stance: 'neutral', language: 'ru' },
  { type: 'Article', id: 103, title: 'Узбекистан ведёт переговоры с Газпромом о транзите', url: '#', source: 'Подробно.uz', channelId: 3, countryId: 'UZ', narrativeId: 1, publishedAt: '2026-02-11T10:00:00Z', sentiment: -0.3, stance: 'pro_russia', language: 'ru' },
  { type: 'Article', id: 104, title: 'Грузия приостанавливает переговоры с ЕС', url: '#', source: 'Civil.ge', channelId: 6, countryId: 'GE', narrativeId: 2, publishedAt: '2026-02-10T16:00:00Z', sentiment: -0.7, stance: 'anti_russia', language: 'en' },
  { type: 'Article', id: 105, title: 'Молдова ускоряет имплементацию соглашения об ассоциации', url: '#', source: 'Newsmaker.md', channelId: 8, countryId: 'MD', narrativeId: 2, publishedAt: '2026-02-10T12:00:00Z', sentiment: 0.6, stance: 'anti_russia', language: 'ru' },
  { type: 'Article', id: 106, title: 'Баку и Ереван договорились о демаркации', url: '#', source: 'Кавказский узел', channelId: 9, countryId: 'AZ', narrativeId: 5, publishedAt: '2026-02-09T09:00:00Z', sentiment: 0.5, stance: 'neutral', language: 'ru' },
  { type: 'Article', id: 107, title: 'Армения настаивает на международных гарантиях', url: '#', source: 'Sputnik Армения', channelId: 10, countryId: 'AM', narrativeId: 5, publishedAt: '2026-02-09T11:00:00Z', sentiment: -0.2, stance: 'pro_russia', language: 'ru' },
  { type: 'Article', id: 108, title: 'Тенге укрепляется на фоне дедолларизации', url: '#', source: 'Tengrinews', channelId: 1, countryId: 'KZ', narrativeId: 4, publishedAt: '2026-02-08T07:00:00Z', sentiment: 0.4, stance: 'neutral', language: 'ru' },
  { type: 'Article', id: 109, title: 'ОДКБ пересматривает формат присутствия в ЦА', url: '#', source: 'Кабар', channelId: 5, countryId: 'KG', narrativeId: 3, publishedAt: '2026-02-07T15:00:00Z', sentiment: -0.4, stance: 'pro_russia', language: 'ru' },
  { type: 'Article', id: 110, title: 'Тбилиси: массовые протесты за евроинтеграцию', url: '#', source: 'Грузия Online', channelId: 7, countryId: 'GE', narrativeId: 2, publishedAt: '2026-02-06T18:00:00Z', sentiment: -0.8, stance: 'anti_russia', language: 'ru' },
];

// ============================================================
// VoxComments (sample)
// ============================================================

export const VOX_COMMENTS: VoxComment[] = [
  { type: 'VoxComment', id: 1001, text: 'Газпром опять всех нагнёт, как обычно', articleId: 101, countryId: 'KZ', emotion: 'anger', stance: 'anti_russia', topics: ['газ', 'монополия'], sentiment: -0.6, language: 'ru', publishedAt: '2026-02-12T09:15:00Z' },
  { type: 'VoxComment', id: 1002, text: 'Хорошо что Китай альтернативу предлагает', articleId: 101, countryId: 'KZ', emotion: 'hope', stance: 'neutral', topics: ['газ', 'Китай', 'альтернатива'], sentiment: 0.4, language: 'ru', publishedAt: '2026-02-12T09:30:00Z' },
  { type: 'VoxComment', id: 1003, text: 'ЕС нас бросит при первой проблеме', articleId: 104, countryId: 'GE', emotion: 'fear', stance: 'pro_russia', topics: ['ЕС', 'недоверие'], sentiment: -0.5, language: 'ru', publishedAt: '2026-02-10T17:00:00Z' },
  { type: 'VoxComment', id: 1004, text: 'Наконец-то мир, хватит воевать', articleId: 106, countryId: 'AZ', emotion: 'joy', stance: 'neutral', topics: ['мир', 'Карабах'], sentiment: 0.8, language: 'ru', publishedAt: '2026-02-09T10:00:00Z' },
  { type: 'VoxComment', id: 1005, text: 'Без России ничего не решится', articleId: 107, countryId: 'AM', emotion: 'sadness', stance: 'pro_russia', topics: ['Россия', 'гарант'], sentiment: -0.3, language: 'ru', publishedAt: '2026-02-09T12:00:00Z' },
];

// ============================================================
// Temperature
// ============================================================

export const TEMPERATURE: TemperaturePoint[] = [
  { type: 'TemperaturePoint', id: 'KZ_2026-02-12', countryId: 'KZ', date: '2026-02-12', value: 62, delta: 3, drivers: ['1', '4'] },
  { type: 'TemperaturePoint', id: 'GE_2026-02-12', countryId: 'GE', date: '2026-02-12', value: 71, delta: -2, drivers: ['2'] },
  { type: 'TemperaturePoint', id: 'MD_2026-02-12', countryId: 'MD', date: '2026-02-12', value: 58, delta: 1, drivers: ['2'] },
  { type: 'TemperaturePoint', id: 'AM_2026-02-12', countryId: 'AM', date: '2026-02-12', value: 52, delta: -5, drivers: ['5'] },
  { type: 'TemperaturePoint', id: 'AZ_2026-02-12', countryId: 'AZ', date: '2026-02-12', value: 44, delta: -3, drivers: ['5'] },
  { type: 'TemperaturePoint', id: 'UZ_2026-02-12', countryId: 'UZ', date: '2026-02-12', value: 45, delta: 2, drivers: ['1'] },
  { type: 'TemperaturePoint', id: 'KG_2026-02-12', countryId: 'KG', date: '2026-02-12', value: 38, delta: 0, drivers: ['3'] },
  { type: 'TemperaturePoint', id: 'TJ_2026-02-12', countryId: 'TJ', date: '2026-02-12', value: 31, delta: -1, drivers: [] },
];

// ============================================================
// Events
// ============================================================

export const EVENTS: Event[] = [
  { type: 'Event', id: 201, title: 'Саммит ЦА по энергетике', date: '2026-02-10', countryId: 'KZ', impact: 'high', relatedNarrativeIds: [1, 4] },
  { type: 'Event', id: 202, title: 'Протесты в Тбилиси', date: '2026-02-06', countryId: 'GE', impact: 'high', relatedNarrativeIds: [2] },
  { type: 'Event', id: 203, title: 'Встреча Алиев-Пашинян в Мюнхене', date: '2026-02-08', countryId: 'AZ', impact: 'high', relatedNarrativeIds: [5] },
  { type: 'Event', id: 204, title: 'Визит делегации ОДКБ в Бишкек', date: '2026-02-05', countryId: 'KG', impact: 'medium', relatedNarrativeIds: [3] },
];

// ============================================================
// Graph query helpers
// ============================================================

export function getCountry(id: string): Country | undefined {
  return COUNTRIES.find(c => c.id === id);
}

export function getNarrative(id: number): Narrative | undefined {
  return NARRATIVES.find(n => n.id === id);
}

export function getArticlesForCountry(countryId: string): Article[] {
  return ARTICLES.filter(a => a.countryId === countryId);
}

export function getArticlesForNarrative(narrativeId: number): Article[] {
  return ARTICLES.filter(a => a.narrativeId === narrativeId);
}

export function getNarrativesForCountry(countryId: string): Narrative[] {
  return NARRATIVES.filter(n => n.countries.includes(countryId));
}

export function getCommentsForArticle(articleId: number): VoxComment[] {
  return VOX_COMMENTS.filter(c => c.articleId === articleId);
}

export function getCommentsForCountry(countryId: string): VoxComment[] {
  return VOX_COMMENTS.filter(c => c.countryId === countryId);
}

export function getChannelsForCountry(countryId: string): Channel[] {
  return CHANNELS.filter(c => c.countryId === countryId);
}

export function getTemperatureForCountry(countryId: string): TemperaturePoint | undefined {
  return TEMPERATURE.find(t => t.countryId === countryId);
}

export function getEventsForCountry(countryId: string): Event[] {
  return EVENTS.filter(e => e.countryId === countryId);
}

export function getEventsForNarrative(narrativeId: number): Event[] {
  return EVENTS.filter(e => e.relatedNarrativeIds.includes(narrativeId));
}
