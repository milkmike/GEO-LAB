#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const cwd = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const outPath = process.env.REGRESSION_OUT_PATH || path.join(cwd, 'artifacts/evals/analyst-regression.latest.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function isNonIncreasingISO(items) {
  let prev = Infinity;
  for (const item of items) {
    const ts = +new Date(item?.publishedAt);
    if (!Number.isFinite(ts)) return false;
    if (ts > prev) return false;
    prev = ts;
  }
  return true;
}

function previewBody(body) {
  if (!body || typeof body !== 'object') return body;
  const preview = {};

  for (const [key, value] of Object.entries(body)) {
    if (Array.isArray(value)) {
      preview[key] = {
        count: value.length,
        sample: value.slice(0, 2),
      };
      continue;
    }

    if (value && typeof value === 'object') {
      preview[key] = value;
      continue;
    }

    preview[key] = value;
  }

  return preview;
}

async function getJson(pathname) {
  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}${pathname}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    const latencyMs = performance.now() - started;
    const body = await response.json().catch(() => ({}));
    return {
      path: pathname,
      ok: response.ok,
      httpStatus: response.status,
      latencyMs: Number(latencyMs.toFixed(1)),
      body: previewBody(body),
      rawBody: body,
    };
  } catch (error) {
    return {
      path: pathname,
      ok: false,
      httpStatus: 0,
      latencyMs: Number((performance.now() - started).toFixed(1)),
      error: String(error),
      body: {},
    };
  }
}

function expect(ok, severity, id, message, evidence, findings) {
  if (ok) return;
  findings.push({ severity, id, message, evidence });
}

async function main() {
  const findings = [];
  const calls = [];

  const health = await getJson('/api/admin/graph-health');
  calls.push(health);
  expect(health.ok, 'critical', 'graph_health.http', 'Graph health endpoint unavailable', { status: health.httpStatus }, findings);

  const triage = await getJson('/api/analyst/triage');
  calls.push(triage);
  expect(triage.ok, 'high', 'triage.http', 'Triage endpoint unavailable', { status: triage.httpStatus }, findings);
  expect(Array.isArray(triage.rawBody?.escalations), 'high', 'triage.schema.escalations', 'Triage escalations missing', {}, findings);

  const country = await getJson('/api/analyst/country?code=KZ');
  calls.push(country);
  expect(country.ok, 'high', 'country.http', 'Country workspace endpoint unavailable', { status: country.httpStatus }, findings);
  expect(Array.isArray(country.rawBody?.timeline), 'high', 'country.schema.timeline', 'Country timeline missing', {}, findings);

  const entity = await getJson('/api/analyst/entity?entity=%D0%93%D0%B0%D0%B7%D0%BF%D1%80%D0%BE%D0%BC&countries=KZ,UZ');
  calls.push(entity);
  expect(entity.ok, 'high', 'entity.http', 'Entity workspace endpoint unavailable', { status: entity.httpStatus }, findings);
  expect(Array.isArray(entity.rawBody?.timeline), 'high', 'entity.schema.timeline', 'Entity timeline missing', {}, findings);

  const caseResp = await getJson('/api/analyst/case?narrativeId=1');
  calls.push(caseResp);
  expect(caseResp.ok, 'high', 'case.http', 'Case endpoint unavailable', { status: caseResp.httpStatus }, findings);
  expect(Array.isArray(caseResp.rawBody?.timeline), 'high', 'case.schema.timeline', 'Case timeline missing', {}, findings);
  if (Array.isArray(caseResp.rawBody?.timeline)) {
    expect(isNonIncreasingISO(caseResp.rawBody.timeline.slice(0, 50)), 'high', 'case.timeline.order', 'Case timeline is not recency-sorted', {}, findings);
  }

  const brief = await getJson('/api/analyst/brief?narrativeId=1');
  calls.push(brief);
  expect(brief.ok, 'medium', 'brief.http', 'Brief endpoint unavailable', { status: brief.httpStatus }, findings);
  expect(Array.isArray(brief.rawBody?.bullets) && brief.rawBody.bullets.length >= 3, 'medium', 'brief.schema.bullets', 'Brief bullets are insufficient', {}, findings);

  const timeline = await getJson('/api/analyst/timeline?scope=narrative&narrativeId=1');
  calls.push(timeline);
  expect(timeline.ok, 'high', 'timeline.http', 'Timeline endpoint unavailable', { status: timeline.httpStatus }, findings);

  const graph = await getJson('/api/analyst/graph?scope=narrative&narrativeId=1&depth=2');
  calls.push(graph);
  expect(graph.ok, 'high', 'graph.http', 'Graph endpoint unavailable', { status: graph.httpStatus }, findings);
  expect(Array.isArray(graph.rawBody?.neighbors), 'high', 'graph.schema.neighbors', 'Graph neighbors missing', {}, findings);

  const query = await getJson('/api/analyst/query?scope=country&code=KZ&includeTimeline=true&includeGraph=true');
  calls.push(query);
  expect(query.ok, 'high', 'query.http', 'Unified query endpoint unavailable', { status: query.httpStatus }, findings);

  const firstArticleId = Array.isArray(caseResp.rawBody?.timeline) ? caseResp.rawBody.timeline?.[0]?.articleId : undefined;
  if (firstArticleId) {
    const explain = await getJson(`/api/analyst/explain?scope=narrative&narrativeId=1&articleId=${firstArticleId}`);
    calls.push(explain);
    expect(explain.ok, 'medium', 'explain.http', 'Explain endpoint unavailable', { status: explain.httpStatus }, findings);
    expect(Boolean(explain.rawBody?.explanation?.whyIncluded), 'medium', 'explain.schema.why', 'Explain payload missing explanation', {}, findings);
  } else {
    findings.push({ severity: 'medium', id: 'explain.skip', message: 'Explain test skipped because no article found in case timeline', evidence: {} });
  }

  const monitoring = await getJson('/api/admin/monitoring');
  calls.push(monitoring);
  expect(monitoring.ok, 'medium', 'monitoring.http', 'Monitoring endpoint unavailable', { status: monitoring.httpStatus }, findings);

  const latencies = calls.map((call) => call.latencyMs);
  const summary = {
    checks: calls.length,
    failures: findings.length,
    latencyMs: {
      p50: Number(percentile(latencies, 50).toFixed(1)),
      p95: Number(percentile(latencies, 95).toFixed(1)),
      max: Number(Math.max(0, ...latencies).toFixed(1)),
    },
  };

  const report = {
    kind: 'geo-lab.analyst-regression',
    generatedAt: new Date().toISOString(),
    baseUrl,
    summary,
    calls: calls.map(({ rawBody, ...rest }) => rest),
    findings,
    status: findings.some((item) => item.severity === 'critical' || item.severity === 'high') ? 'FAIL' : 'PASS',
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.status === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  const report = {
    kind: 'geo-lab.analyst-regression',
    generatedAt: new Date().toISOString(),
    baseUrl,
    status: 'FAIL',
    error: String(error),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
});
