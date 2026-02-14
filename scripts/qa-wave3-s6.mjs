#!/usr/bin/env node
import fs from 'node:fs/promises';
import { performance } from 'node:perf_hooks';

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3005';
const MODE_FILE = process.env.MODE_FILE || '/tmp/geopulse-mode.txt';

const ENDPOINTS = {
  triage: '/api/analyst/triage',
  country: '/api/analyst/country?code=KZ',
  case: '/api/analyst/case?narrativeId=1',
  entity: '/api/analyst/entity?entity=%D0%93%D0%B0%D0%B7%D0%BF%D1%80%D0%BE%D0%BC&countries=KZ,UZ',
  home: '/',
};

async function setMode(mode) {
  await fs.writeFile(MODE_FILE, `${mode}\n`, 'utf8');
}

async function req(path, { timeoutMs = 15000 } = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(`${BASE}${path}`, { signal: AbortSignal.timeout(timeoutMs) });
    const ms = performance.now() - t0;
    const text = await res.text();
    let json = null;
    try { json = JSON.parse(text); } catch {}
    return { ok: res.ok, status: res.status, ms: Number(ms.toFixed(1)), json, textLen: text.length };
  } catch (error) {
    const ms = performance.now() - t0;
    return { ok: false, status: 0, ms: Number(ms.toFixed(1)), error: String(error) };
  }
}

function summarizeFunctional(responses) {
  const out = {};
  for (const [name, r] of Object.entries(responses)) {
    out[name] = {
      status: r.status,
      ok: r.ok,
      ms: r.ms,
      keySignals: {
        timelineLength: r.json?.timeline?.length ?? null,
        generatedAt: r.json?.generatedAt ?? null,
        updatedAt: r.json?.country?.updatedAt ?? null,
        escalations: r.json?.escalations?.length ?? null,
      },
    };
  }
  return out;
}

async function runChaosScenario(mode) {
  await setMode(mode);
  await new Promise((r) => setTimeout(r, 120));
  const responses = {
    triage: await req(ENDPOINTS.triage),
    country: await req(ENDPOINTS.country),
    case: await req(ENDPOINTS.case),
    entity: await req(ENDPOINTS.entity),
  };

  return {
    mode,
    responses: summarizeFunctional(responses),
    hardFailure: Object.values(responses).some((r) => r.status >= 500 || r.status === 0),
  };
}

function pct(sorted, p) {
  const idx = Math.min(sorted.length - 1, Math.ceil((p / 100) * sorted.length) - 1);
  return sorted[idx];
}

async function soak(path, { total = 120, concurrency = 10 } = {}) {
  let next = 0;
  const results = [];

  async function worker() {
    while (next < total) {
      const i = next++;
      const r = await req(path, { timeoutMs: 12000 });
      results[i] = r;
    }
  }

  const workers = Array.from({ length: concurrency }, () => worker());
  const t0 = performance.now();
  await Promise.all(workers);
  const durationMs = performance.now() - t0;

  const ok = results.filter((r) => r.ok).length;
  const errors = results.length - ok;
  const lat = results.map((r) => r.ms).sort((a, b) => a - b);

  return {
    path,
    total,
    concurrency,
    ok,
    errors,
    errorRate: Number((errors / total).toFixed(3)),
    rps: Number((total / (durationMs / 1000)).toFixed(2)),
    p50: Number(pct(lat, 50).toFixed(1)),
    p95: Number(pct(lat, 95).toFixed(1)),
    p99: Number(pct(lat, 99).toFixed(1)),
    max: Number(lat[lat.length - 1].toFixed(1)),
  };
}

async function measureRecovery() {
  await setMode('slow');
  await req(ENDPOINTS.country);

  await setMode('normal');
  const start = performance.now();
  const probes = [];

  while (performance.now() - start < 20000) {
    const r = await req(ENDPOINTS.country);
    const healthy = r.ok && Boolean(r.json?.country?.updatedAt) && (r.json?.timeline?.length ?? 0) > 0;
    probes.push({ msSinceStart: Number((performance.now() - start).toFixed(1)), status: r.status, updatedAt: r.json?.country?.updatedAt ?? null, healthy });
    if (healthy) {
      return {
        recovered: true,
        recoveryMs: Number((performance.now() - start).toFixed(1)),
        probes,
      };
    }
    await new Promise((r2) => setTimeout(r2, 500));
  }

  return {
    recovered: false,
    recoveryMs: null,
    probes,
  };
}

function staleAgeDays(isoTime) {
  if (!isoTime) return null;
  const ts = +new Date(isoTime);
  if (!Number.isFinite(ts)) return null;
  return Number((((Date.now() - ts) / 86400000)).toFixed(2));
}

const report = {
  baseUrl: BASE,
  startedAt: new Date().toISOString(),
  scenarios: {},
  soak: {},
  recovery: {},
};

report.scenarios.slowUpstream = await runChaosScenario('slow');
report.scenarios.partialData = await runChaosScenario('partial');
report.scenarios.emptyGraphSlices = await runChaosScenario('empty');
report.scenarios.staleCache = await runChaosScenario('stale');

report.scenarios.staleCache.staleness = {
  countryUpdatedAtAgeDays: staleAgeDays(report.scenarios.staleCache.responses.country.keySignals.updatedAt),
};

await setMode('normal');
report.soak.triage = await soak(ENDPOINTS.triage, { total: 140, concurrency: 12 });
report.soak.country = await soak(ENDPOINTS.country, { total: 140, concurrency: 12 });
report.soak.case = await soak(ENDPOINTS.case, { total: 120, concurrency: 10 });
report.soak.entity = await soak(ENDPOINTS.entity, { total: 120, concurrency: 10 });
report.soak.home = await soak(ENDPOINTS.home, { total: 100, concurrency: 8 });

report.recovery = await measureRecovery();
report.finishedAt = new Date().toISOString();

console.log(JSON.stringify(report, null, 2));