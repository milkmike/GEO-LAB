#!/usr/bin/env node
import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE_URL || 'http://localhost:3000';
const findings = [];
const add = (severity, id, msg, evidence = {}) => findings.push({ severity, id, msg, evidence });

async function get(path) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { headers: { accept: 'application/json' }, signal: AbortSignal.timeout(12000) });
    const ms = performance.now() - t0;
    let body = null;
    try { body = await res.json(); } catch { body = null; }
    return { ok: res.ok, status: res.status, body, ms };
  } catch (error) {
    return { ok: false, status: 0, body: { error: String(error) }, ms: performance.now() - t0 };
  }
}

function norm(s) {
  return String(s || '').toLowerCase().replace(/ё/g, 'е').replace(/[^a-zа-я0-9\s]/gi, ' ').replace(/\s+/g, ' ').trim();
}

function overlapAt(a, b, n = 20) {
  const aa = a.slice(0, n).map((x) => norm(x));
  const bb = new Set(b.slice(0, n).map((x) => norm(x)));
  if (!aa.length) return 0;
  let hit = 0;
  for (const x of aa) if (bb.has(x)) hit += 1;
  return hit / aa.length;
}

function parseTrust(why = '') {
  const m = String(why).match(/trust\s+([0-9]+(?:\.[0-9]+)?)/i);
  return m ? Number(m[1]) : null;
}

function avg(arr) {
  if (!arr.length) return null;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 1) Precision / false-positive checks for alerts on noisy timelines
const triage = await get('/api/analyst/triage');
if (!triage.ok) {
  add('critical', 'TRIAGE_DOWN', 'Triage endpoint unavailable', { status: triage.status, body: triage.body });
}

const escalations = triage.body?.escalations || [];
for (const esc of escalations.slice(0, 4)) {
  const caseResp = await get(`/api/analyst/case?narrativeId=${esc.narrativeId}`);
  if (!caseResp.ok) {
    add('high', 'CASE_FOR_ALERT_FAIL', 'Cannot validate alert precision because case endpoint failed', { narrativeId: esc.narrativeId, status: caseResp.status });
    continue;
  }

  const timeline = caseResp.body?.timeline || [];
  const kw = (caseResp.body?.narrative?.keywords || [])
    .map((k) => norm(k))
    .flatMap((k) => k.split(' '))
    .filter((k) => k.length >= 4);

  if (!timeline.length) {
    add('high', 'ALERT_EMPTY_TIMELINE', 'Escalated narrative has empty timeline', { narrativeId: esc.narrativeId });
    continue;
  }

  const top = timeline.slice(0, 30);
  const matched = top.filter((it) => {
    const text = norm(`${it.title} ${it.whyIncluded}`);
    return kw.some((k) => text.includes(k));
  }).length;

  const precisionProxy = matched / top.length;
  if (precisionProxy < 0.35) {
    add('high', 'ALERT_LOW_PRECISION_PROXY', 'Escalated narrative top timeline weakly matches own keywords (false-positive risk)', {
      narrativeId: esc.narrativeId,
      precisionProxy: Number(precisionProxy.toFixed(2)),
      sampleSize: top.length,
    });
  }
}

// Noise / FP stress
const gibberish = encodeURIComponent('zzqvxx qwertyйцукен ### 999999 unrelated nonsense words');
const gib = await get(`/api/analyst/entity?entity=${gibberish}`);
if (!gib.ok) {
  add('medium', 'NOISY_QUERY_FAIL', 'Noisy query failed hard (should degrade gracefully)', { status: gib.status });
} else {
  const tl = gib.body?.timeline || [];
  const highConf = tl.filter((x) => Number(x.confidence) >= 0.8).length;
  if (highConf > 3) {
    add('high', 'NOISE_HIGH_CONF_FP', 'Noisy query produced too many high-confidence items (false-positive risk)', { highConfidenceItems: highConf, total: tl.length });
  }
}

// 2) Forecast sanity checks (sanity + perturbation stability)
const qBase = encodeURIComponent('Газпром');
const qPerturb = encodeURIComponent('ГаЗпром!!!');
const qSmall = encodeURIComponent('Газпром последние 24 часа');
const base = await get(`/api/analyst/entity?entity=${qBase}`);
const perturb = await get(`/api/analyst/entity?entity=${qPerturb}`);
const small = await get(`/api/analyst/entity?entity=${qSmall}`);

for (const [name, r] of [['base', base], ['perturb', perturb], ['small', small]]) {
  if (!r.ok) add('high', `FORECAST_${name.toUpperCase()}_FAIL`, 'Sanity query failed', { status: r.status });
}

const now = Date.now();
for (const [name, r] of [['base', base], ['perturb', perturb], ['small', small]]) {
  const tl = r.body?.timeline || [];
  for (const item of tl.slice(0, 60)) {
    const t = +new Date(item.publishedAt);
    if (!Number.isFinite(t)) {
      add('high', 'IMPOSSIBLE_DATE', 'Invalid publishedAt in timeline', { name, articleId: item.articleId, publishedAt: item.publishedAt });
      break;
    }
    if (t > now + 5 * 60 * 1000) {
      add('high', 'FUTURE_EVENT', 'Timeline returned future-dated event', { name, articleId: item.articleId, publishedAt: item.publishedAt });
      break;
    }
    if (!(item.confidence >= 0 && item.confidence <= 1)) {
      add('high', 'CONFIDENCE_OOB', 'Confidence out of [0,1]', { name, articleId: item.articleId, confidence: item.confidence });
      break;
    }
    if (!(item.relevanceScore >= 1 && item.relevanceScore <= 5)) {
      add('high', 'RELEVANCE_OOB', 'Relevance out of [1,5]', { name, articleId: item.articleId, relevanceScore: item.relevanceScore });
      break;
    }
  }
}

const baseTitles = (base.body?.timeline || []).map((x) => x.title || '');
const perturbTitles = (perturb.body?.timeline || []).map((x) => x.title || '');
const smallTitles = (small.body?.timeline || []).map((x) => x.title || '');
const ovPerturb = overlapAt(baseTitles, perturbTitles, 20);
const ovSmall = overlapAt(baseTitles, smallTitles, 20);

if (ovPerturb < 0.7) {
  add('high', 'PERTURBATION_INSTABILITY', 'Small lexical perturbation caused major retrieval drift', { overlapAt20: Number(ovPerturb.toFixed(2)) });
}
if (ovSmall < 0.3) {
  add('medium', 'TIME_HINT_INSTABILITY', 'Small temporal hint caused severe drift', { overlapAt20: Number(ovSmall.toFixed(2)) });
}

// 3) Trust score calibration smoke (high/low confidence separation)
if (base.ok) {
  const tl = base.body?.timeline || [];
  const rows = tl.map((x) => ({ confidence: Number(x.confidence), trust: parseTrust(x.whyIncluded) }))
    .filter((x) => Number.isFinite(x.confidence) && Number.isFinite(x.trust));

  const high = rows.filter((x) => x.trust >= 0.72).map((x) => x.confidence);
  const low = rows.filter((x) => x.trust <= 0.64).map((x) => x.confidence);

  if (high.length < 3 || low.length < 3) {
    add('medium', 'TRUST_BUCKET_THIN', 'Insufficient high/low trust samples for robust calibration smoke', { high: high.length, low: low.length });
  } else {
    const highAvg = avg(high);
    const lowAvg = avg(low);
    const delta = (highAvg ?? 0) - (lowAvg ?? 0);
    if (delta < 0) {
      add('high', 'TRUST_INVERSION', 'Higher-trust sources have lower average confidence than low-trust sources', { highAvg: Number(highAvg.toFixed(3)), lowAvg: Number(lowAvg.toFixed(3)), delta: Number(delta.toFixed(3)) });
    } else if (delta < 0.01) {
      add('medium', 'TRUST_WEAK_SEPARATION', 'High/low trust confidence separation is very weak', { highAvg: Number(highAvg.toFixed(3)), lowAvg: Number(lowAvg.toFixed(3)), delta: Number(delta.toFixed(3)) });
    }
  }
}

// 4) Adversarial & malformed input tests for endpoints
const malformedCases = [
  { id: 'MISSING_SCOPE', path: '/api/analyst/timeline' },
  { id: 'BAD_SCOPE', path: '/api/analyst/timeline?scope=oops' },
  { id: 'COUNTRY_MISSING_CODE', path: '/api/analyst/timeline?scope=country' },
  { id: 'NARRATIVE_BAD_ID', path: '/api/analyst/timeline?scope=narrative&narrativeId=abc' },
  { id: 'ENTITY_EMPTY', path: '/api/analyst/timeline?scope=entity&entity=' },
  { id: 'EXPLAIN_MISSING_TARGET', path: '/api/analyst/explain?scope=country&code=KZ' },
  { id: 'QUERY_CONFLICTING_PARAMS', path: '/api/analyst/query?scope=country&code=KZ&entity=Gazprom' },
  { id: 'CASE_SQLI', path: `/api/analyst/case?narrativeId=${encodeURIComponent("1 OR 1=1")}` },
  { id: 'ENTITY_LONG', path: `/api/analyst/entity?entity=${encodeURIComponent('Газпром '.repeat(3000))}` },
];

for (const c of malformedCases) {
  const r = await get(c.path);
  if (r.status >= 500 || r.status === 0) {
    add('critical', 'MALFORMED_500', 'Malformed/adversarial input triggered server error', { case: c.id, path: c.path, status: r.status, body: r.body });
  }

  const shouldBe4xx = ['MISSING_SCOPE', 'BAD_SCOPE', 'COUNTRY_MISSING_CODE', 'NARRATIVE_BAD_ID', 'ENTITY_EMPTY', 'EXPLAIN_MISSING_TARGET', 'QUERY_CONFLICTING_PARAMS'].includes(c.id);
  if (shouldBe4xx && !(r.status >= 400 && r.status < 500)) {
    add('high', 'VALIDATION_GAP', 'Malformed request did not produce expected 4xx validation response', { case: c.id, status: r.status, body: r.body });
  }
}

const sevRank = { critical: 4, high: 3, medium: 2, low: 1 };
const sortedFindings = [...findings].sort((a, b) => sevRank[b.severity] - sevRank[a.severity]);

const out = {
  baseUrl: BASE,
  status: sortedFindings.some((f) => f.severity === 'critical' || f.severity === 'high') ? 'FAIL' : 'PASS',
  findings: sortedFindings,
  summary: {
    totalFindings: sortedFindings.length,
    bySeverity: {
      critical: sortedFindings.filter((f) => f.severity === 'critical').length,
      high: sortedFindings.filter((f) => f.severity === 'high').length,
      medium: sortedFindings.filter((f) => f.severity === 'medium').length,
      low: sortedFindings.filter((f) => f.severity === 'low').length,
    },
    checks: {
      perturbationOverlapAt20: Number(ovPerturb.toFixed(2)),
      temporalHintOverlapAt20: Number(ovSmall.toFixed(2)),
      triageEscalations: escalations.length,
    },
  },
  repro: {
    run: [`BASE_URL=${BASE} node scripts/s5-qa-wave3.mjs`],
    noisy: [`curl -s '${BASE}/api/analyst/entity?entity=${encodeURIComponent('zzqvxx qwertyйцукен ### 999999 unrelated nonsense words')}'`],
    perturb: [
      `curl -s '${BASE}/api/analyst/entity?entity=${encodeURIComponent('Газпром')}'`,
      `curl -s '${BASE}/api/analyst/entity?entity=${encodeURIComponent('ГаЗпром!!!')}'`
    ],
    malformed: malformedCases.map((c) => `curl -i '${BASE}${c.path}'`),
  },
};

console.log(JSON.stringify(out, null, 2));