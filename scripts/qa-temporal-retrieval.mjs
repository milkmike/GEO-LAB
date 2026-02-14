#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE_URL || 'http://localhost:3000';

async function getJson(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(10000),
    });
    const ms = performance.now() - t0;
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { status: res.status, ok: res.ok, ms, body };
  } catch (error) {
    const ms = performance.now() - t0;
    return { status: 0, ok: false, ms, body: { error: String(error) } };
  }
}

function topTitles(entityResp, n = 20) {
  const timeline = entityResp?.body?.timeline || [];
  return timeline.slice(0, n).map((x) => String(x.title || '').trim().toLowerCase());
}

function overlap(a, b) {
  if (!a.length) return 0;
  const sb = new Set(b);
  let hit = 0;
  for (const x of a) if (sb.has(x)) hit += 1;
  return hit / a.length;
}

function isNonIncreasingISO(items) {
  let prev = Infinity;
  for (const it of items) {
    const t = +new Date(it.publishedAt);
    if (!Number.isFinite(t)) return false;
    if (t > prev) return false;
    prev = t;
  }
  return true;
}

async function sampleLatency(path, rounds = 5) {
  const times = [];
  for (let i = 0; i < rounds; i += 1) {
    const r = await getJson(path);
    times.push(r.ms);
  }
  const s = [...times].sort((a, b) => a - b);
  const pick = (p) => s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
  return { times: times.map((x) => Number(x.toFixed(1))), p50: Number(pick(50).toFixed(1)), p95: Number(pick(95).toFixed(1)), max: Number(Math.max(...times).toFixed(1)) };
}

const findings = [];
const add = (severity, id, msg, evidence) => findings.push({ severity, id, msg, evidence });

// 1) Adversarial temporal queries (conflicts/ambiguity/recency)
const qBase = encodeURIComponent('Газпром');
const qRecent = encodeURIComponent('Газпром за последние 24 часа');
const qConflict = encodeURIComponent('Газпром вчера в 2024 году сейчас');
const qAmbiguous = encodeURIComponent('Газпром в ближайшие 2 года вчера');

const rBase = await getJson(`/api/analyst/entity?entity=${qBase}`);
const rRecent = await getJson(`/api/analyst/entity?entity=${qRecent}`);
const rConflict = await getJson(`/api/analyst/entity?entity=${qConflict}`);
const rAmbiguous = await getJson(`/api/analyst/entity?entity=${qAmbiguous}`);

if (!rBase.ok) {
  add('critical', 'BASELINE_QUERY_FAIL', 'Baseline entity query failed', { status: rBase.status });
}

for (const [name, r] of [['recent', rRecent], ['conflict', rConflict], ['ambiguous', rAmbiguous]]) {
  if (!r.ok) add('high', `ADVERSARIAL_${name.toUpperCase()}_HTTP`, 'Adversarial temporal query returned non-200', { status: r.status });
}

const baseTop = topTitles(rBase, 20);
const recentTop = topTitles(rRecent, 20);
const conflictTop = topTitles(rConflict, 20);
const ambiguousTop = topTitles(rAmbiguous, 20);

const ovRecent = overlap(baseTop, recentTop);
const ovConflict = overlap(baseTop, conflictTop);
const ovAmbiguous = overlap(baseTop, ambiguousTop);

if (ovRecent < 0.3) {
  add('high', 'TEMPORAL_RECENCY_REGRESSION', 'Temporal recency phrase heavily degrades retrieval overlap vs baseline', { overlapAt20: Number(ovRecent.toFixed(2)), baseCount: baseTop.length, recentCount: recentTop.length });
}
if (ovConflict < 0.25) {
  add('high', 'TEMPORAL_CONFLICT_REGRESSION', 'Conflicting temporal phrase heavily degrades retrieval overlap vs baseline', { overlapAt20: Number(ovConflict.toFixed(2)), conflictCount: conflictTop.length });
}
if (ovAmbiguous < 0.25) {
  add('medium', 'TEMPORAL_AMBIGUITY_REGRESSION', 'Ambiguous temporal wording degrades retrieval overlap vs baseline', { overlapAt20: Number(ovAmbiguous.toFixed(2)), ambiguousCount: ambiguousTop.length });
}

// 2) Noise-heavy narrative terms tests
const qNoise = encodeURIComponent('СРОЧНО!!! Газпром транзит доллар евроинтеграция карабах мемы котики случайный шум 12345 за все годы и вчера');
const qTypoNoise = encodeURIComponent('ГаЗпром!!! ### ~~');
const rNoise = await getJson(`/api/analyst/entity?entity=${qNoise}`);
const rTypoNoise = await getJson(`/api/analyst/entity?entity=${qTypoNoise}`);

const noiseTop = topTitles(rNoise, 20);
const typoTop = topTitles(rTypoNoise, 20);
const ovNoise = overlap(baseTop, noiseTop);
const ovTypo = overlap(baseTop, typoTop);

if (ovNoise < 0.2) {
  add('high', 'NOISE_QUERY_INSTABILITY', 'Noise-heavy narrative query collapses retrieval consistency', { overlapAt20: Number(ovNoise.toFixed(2)), noiseCount: noiseTop.length });
}
if (ovTypo < 0.4) {
  add('medium', 'PUNCT_NOISE_SENSITIVITY', 'Punctuation/case noise significantly changes retrieval set', { overlapAt20: Number(ovTypo.toFixed(2)), typoCount: typoTop.length });
}

// 3) Regression vs baseline retrieval behavior
const rBase2 = await getJson(`/api/analyst/entity?entity=${qBase}`);
const rBase3 = await getJson(`/api/analyst/entity?entity=${qBase}`);
const b1 = topTitles(rBase, 15);
const b2 = topTitles(rBase2, 15);
const b3 = topTitles(rBase3, 15);

const stable12 = overlap(b1, b2);
const stable13 = overlap(b1, b3);
if (stable12 < 0.95 || stable13 < 0.95) {
  add('medium', 'BASELINE_NON_DETERMINISM', 'Repeated baseline query is not stable (top-15 overlap drift)', { overlap12: Number(stable12.toFixed(2)), overlap13: Number(stable13.toFixed(2)) });
}

const case1 = await getJson('/api/analyst/case?narrativeId=1');
if (!case1.ok) {
  add('high', 'CASE_ENDPOINT_FAIL', 'Case retrieval endpoint failed', { status: case1.status });
} else {
  const t = case1.body?.timeline || [];
  if (!isNonIncreasingISO(t.slice(0, 50))) {
    add('high', 'CASE_TEMPORAL_ORDER_BROKEN', 'Case timeline is not strictly recency-sorted or has invalid dates', { sample: t.slice(0, 5).map((x) => x.publishedAt) });
  }
}

// 4) Latency/perf smoke for retrieval endpoint paths
const latEntity = await sampleLatency(`/api/analyst/entity?entity=${qBase}`, 5);
const latCountry = await sampleLatency('/api/analyst/country?code=KZ', 5);
const latCase = await sampleLatency('/api/analyst/case?narrativeId=1', 5);
const latTriage = await sampleLatency('/api/analyst/triage', 5);

for (const [name, lat] of [['entity', latEntity], ['country', latCountry], ['case', latCase], ['triage', latTriage]]) {
  if (lat.p95 > 3000) {
    add('medium', `LATENCY_${name.toUpperCase()}_P95`, 'Endpoint p95 latency is above smoke threshold (3s)', lat);
  }
}

const summary = {
  baseUrl: BASE,
  checks: {
    adversarialTemporal: {
      baseCount: baseTop.length,
      recentCount: recentTop.length,
      conflictCount: conflictTop.length,
      ambiguousCount: ambiguousTop.length,
      overlapRecentAt20: Number(ovRecent.toFixed(2)),
      overlapConflictAt20: Number(ovConflict.toFixed(2)),
      overlapAmbiguousAt20: Number(ovAmbiguous.toFixed(2)),
    },
    noiseHeavy: {
      noiseCount: noiseTop.length,
      typoCount: typoTop.length,
      overlapNoiseAt20: Number(ovNoise.toFixed(2)),
      overlapTypoAt20: Number(ovTypo.toFixed(2)),
    },
    regressionBaseline: {
      repeatOverlapTop15_1v2: Number(stable12.toFixed(2)),
      repeatOverlapTop15_1v3: Number(stable13.toFixed(2)),
      caseTimelineSorted: case1.ok ? isNonIncreasingISO((case1.body?.timeline || []).slice(0, 50)) : null,
    },
    latencySmoke: {
      entity: latEntity,
      country: latCountry,
      case: latCase,
      triage: latTriage,
    },
  },
  findings,
  status: findings.some((f) => ['critical', 'high'].includes(f.severity)) ? 'FAIL' : 'PASS',
};

console.log(JSON.stringify(summary, null, 2));
