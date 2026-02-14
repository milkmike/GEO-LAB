#!/usr/bin/env node

/*
 * Retrieval benchmark for Wave-2 / S2 release docs.
 *
 * Compares:
 *  - before: strict gate (score >= 2 only)
 *  - after: adaptive fallback (strong + weak matches when strong set is sparse)
 */

const ARTICLES = [
  { id: 101, narrativeId: 1, title: 'Казахстан и Узбекистан обсуждают новый газовый маршрут' },
  { id: 102, narrativeId: 1, title: 'CNPC расширяет присутствие в Центральной Азии' },
  { id: 103, narrativeId: 1, title: 'Узбекистан ведёт переговоры с Газпромом о транзите' },
  { id: 104, narrativeId: 2, title: 'Грузия приостанавливает переговоры с ЕС' },
  { id: 105, narrativeId: 2, title: 'Молдова ускоряет имплементацию соглашения об ассоциации' },
  { id: 106, narrativeId: 5, title: 'Баку и Ереван договорились о демаркации' },
  { id: 107, narrativeId: 5, title: 'Армения настаивает на международных гарантиях' },
  { id: 108, narrativeId: 4, title: 'Тенге укрепляется на фоне дедолларизации' },
  { id: 109, narrativeId: 3, title: 'ОДКБ пересматривает формат присутствия в ЦА' },
  { id: 110, narrativeId: 2, title: 'Тбилиси: массовые протесты за евроинтеграцию' },
];

const NARRATIVES = [
  { id: 1, title: 'Переговоры по газовому транзиту', keywords: ['газ', 'транзит', 'Газпром', 'CNPC'] },
  { id: 2, title: 'Курс на интеграцию с ЕС', keywords: ['ЕС', 'евроинтеграция', 'визы', 'ассоциация'] },
  { id: 3, title: 'Обсуждение военных баз', keywords: ['база', 'ОДКБ', 'военные', 'вывод'] },
];

function normalizeText(value) {
  return value
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/[^a-zа-я0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function buildNarrativeTerms(narrative) {
  return Array.from(new Set(
    (narrative.keywords || [])
      .flatMap((k) => normalizeText(k).split(' '))
      .filter((term) => term.length >= 2),
  ));
}

function narrativeScore(title, terms) {
  const normalizedTitle = normalizeText(title);
  if (!normalizedTitle || terms.length === 0) return 0;

  let score = 0;
  const broadTerms = new Set(['газ', 'транзит']);

  for (const term of terms) {
    if (!normalizedTitle.includes(term)) continue;
    if (/[a-z]/i.test(term)) {
      score += 3;
      continue;
    }
    if (term.length >= 6 && !broadTerms.has(term)) {
      score += 2;
      continue;
    }
    score += 1;
  }

  return score;
}

function evaluate(mode, narrative, scoredItems) {
  const positives = ARTICLES.filter((a) => a.narrativeId === narrative.id).length;

  let selected = [];
  if (mode === 'before') {
    selected = scoredItems.filter((item) => item.relevanceScore >= 2);
  } else {
    const strong = scoredItems.filter((item) => item.relevanceScore >= 2);
    const fallback = scoredItems
      .filter((item) => item.relevanceScore > 0)
      .sort((a, b) => b.relevanceScore - a.relevanceScore)
      .slice(0, 20);

    selected = strong.length >= 8 ? strong : dedupeById([...strong, ...fallback]);
  }

  const tp = selected.filter((item) => item.narrativeId === narrative.id).length;
  const precision = selected.length ? tp / selected.length : 0;
  const recall = positives ? tp / positives : 0;

  return {
    narrativeId: narrative.id,
    title: narrative.title,
    mode,
    returned: selected.length,
    truePositive: tp,
    precision,
    recall,
  };
}

function dedupeById(items) {
  const map = new Map();
  for (const item of items) {
    if (!map.has(item.id)) map.set(item.id, item);
  }
  return Array.from(map.values());
}

function fmtPct(value) {
  return `${(value * 100).toFixed(1)}%`;
}

function run() {
  const rows = [];

  for (const narrative of NARRATIVES) {
    const terms = buildNarrativeTerms(narrative);
    const scored = ARTICLES.map((a) => ({
      ...a,
      relevanceScore: narrativeScore(a.title, terms),
    }));

    rows.push(evaluate('before', narrative, scored));
    rows.push(evaluate('after', narrative, scored));
  }

  console.log('Wave-2 / S2 retrieval benchmark (mock dataset)');
  console.log('');
  console.log('| Narrative | Mode | Returned | TP | Precision | Recall |');
  console.log('|---|---:|---:|---:|---:|---:|');
  for (const row of rows) {
    console.log(`| ${row.narrativeId}: ${row.title} | ${row.mode} | ${row.returned} | ${row.truePositive} | ${fmtPct(row.precision)} | ${fmtPct(row.recall)} |`);
  }

  const before = rows.filter((r) => r.mode === 'before');
  const after = rows.filter((r) => r.mode === 'after');

  const avg = (list, key) => list.reduce((acc, x) => acc + x[key], 0) / (list.length || 1);

  console.log('');
  console.log('Aggregate averages');
  console.log(`- before precision: ${fmtPct(avg(before, 'precision'))}`);
  console.log(`- after precision:  ${fmtPct(avg(after, 'precision'))}`);
  console.log(`- before recall:    ${fmtPct(avg(before, 'recall'))}`);
  console.log(`- after recall:     ${fmtPct(avg(after, 'recall'))}`);
}

run();
