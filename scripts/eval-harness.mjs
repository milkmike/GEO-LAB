#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { performance } from 'node:perf_hooks';

const cwd = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const scenariosPath = process.env.EVAL_SCENARIOS_PATH || path.join(cwd, 'scripts/evals/temporal-retrieval.scenarios.json');
const outPath = process.env.EVAL_OUT_PATH || path.join(cwd, 'artifacts/evals/temporal-retrieval.latest.json');
const baselinePath = process.env.EVAL_BASELINE_PATH || path.join(cwd, 'artifacts/evals/temporal-retrieval.baseline.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function nowIso() {
  return new Date().toISOString();
}

function parseJson(filePath, fallback = null) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function overlapAt(titlesA, titlesB, at = 20) {
  const left = titlesA.slice(0, at);
  if (!left.length) return 0;
  const rightSet = new Set(titlesB.slice(0, at));
  let hit = 0;
  for (const title of left) {
    if (rightSet.has(title)) hit += 1;
  }
  return hit / left.length;
}

function percentile(values, p) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx];
}

function ageHours(iso) {
  const ts = +new Date(iso);
  if (!Number.isFinite(ts)) return null;
  return Math.max(0, (Date.now() - ts) / (1000 * 60 * 60));
}

async function getEntityScenario(scenario) {
  const params = new URLSearchParams({ entity: scenario.query });
  if (scenario.countries?.length) {
    params.set('countries', scenario.countries.join(','));
  }

  const started = performance.now();
  try {
    const response = await fetch(`${baseUrl}/api/analyst/entity?${params.toString()}`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(12000),
    });
    const latencyMs = performance.now() - started;
    const body = await response.json().catch(() => ({}));

    const timeline = Array.isArray(body?.timeline) ? body.timeline : [];
    const titles = timeline.map((item) => String(item?.title || '').trim().toLowerCase()).filter(Boolean);
    const freshnessHours = timeline
      .map((item) => ageHours(item?.publishedAt))
      .filter((value) => value !== null);

    return {
      scenarioId: scenario.id,
      httpStatus: response.status,
      ok: response.ok,
      latencyMs: Number(latencyMs.toFixed(1)),
      resultCount: timeline.length,
      titles,
      freshnessHours: {
        avg: freshnessHours.length ? Number((freshnessHours.reduce((a, b) => a + b, 0) / freshnessHours.length).toFixed(2)) : 0,
        p95: Number(percentile(freshnessHours, 95).toFixed(2)),
        max: Number(Math.max(0, ...freshnessHours).toFixed(2)),
      },
    };
  } catch (error) {
    return {
      scenarioId: scenario.id,
      ok: false,
      httpStatus: 0,
      latencyMs: Number((performance.now() - started).toFixed(1)),
      error: String(error),
      resultCount: 0,
      titles: [],
      freshnessHours: { avg: 0, p95: 0, max: 0 },
    };
  }
}

function evaluateScenario(scenario, current, byId) {
  const findings = [];
  const expected = scenario.expected || {};

  if (!current.ok) {
    findings.push({ severity: 'high', id: `${scenario.id}.http`, message: 'Scenario endpoint returned non-200', evidence: { httpStatus: current.httpStatus } });
    return findings;
  }

  if (expected.minResults && current.resultCount < expected.minResults) {
    findings.push({
      severity: 'high',
      id: `${scenario.id}.min_results`,
      message: 'Too few results for scenario',
      evidence: { expected: expected.minResults, actual: current.resultCount },
    });
  }

  if (expected.maxFreshnessHoursP95 && current.freshnessHours.p95 > expected.maxFreshnessHoursP95) {
    findings.push({
      severity: 'medium',
      id: `${scenario.id}.freshness_p95`,
      message: 'Freshness p95 is above threshold',
      evidence: { expectedMax: expected.maxFreshnessHoursP95, actual: current.freshnessHours.p95 },
    });
  }

  if (expected.minOverlapAgainst) {
    const base = byId.get(expected.minOverlapAgainst.scenarioId);
    if (base) {
      const overlap = overlapAt(current.titles, base.titles, expected.minOverlapAgainst.at || 20);
      current.overlapAgainst = {
        scenarioId: expected.minOverlapAgainst.scenarioId,
        at: expected.minOverlapAgainst.at || 20,
        value: Number(overlap.toFixed(3)),
      };

      if (overlap < expected.minOverlapAgainst.value) {
        findings.push({
          severity: 'high',
          id: `${scenario.id}.overlap`,
          message: 'Overlap against baseline scenario is below threshold',
          evidence: {
            expectedMin: expected.minOverlapAgainst.value,
            actual: Number(overlap.toFixed(3)),
          },
        });
      }
    }
  }

  return findings;
}

function compareWithBaseline(currentResults, baselineResults) {
  const drift = [];
  if (!baselineResults?.length) return drift;

  const baselineById = new Map(baselineResults.map((item) => [item.scenarioId, item]));
  for (const current of currentResults) {
    const baseline = baselineById.get(current.scenarioId);
    if (!baseline) continue;

    const latencyDelta = current.latencyMs - Number(baseline.latencyMs || 0);
    const countDelta = current.resultCount - Number(baseline.resultCount || 0);

    drift.push({
      scenarioId: current.scenarioId,
      latencyDeltaMs: Number(latencyDelta.toFixed(1)),
      resultCountDelta: countDelta,
    });
  }

  return drift;
}

async function main() {
  const scenariosConfig = parseJson(scenariosPath);
  if (!scenariosConfig?.scenarios?.length) {
    throw new Error(`No scenarios found in ${scenariosPath}`);
  }

  const currentResults = [];
  for (const scenario of scenariosConfig.scenarios) {
    const result = await getEntityScenario(scenario);
    currentResults.push(result);
  }

  const byId = new Map(currentResults.map((result) => [result.scenarioId, result]));
  const findings = [];
  for (const scenario of scenariosConfig.scenarios) {
    const result = byId.get(scenario.id);
    if (!result) continue;
    findings.push(...evaluateScenario(scenario, result, byId));
  }

  const latencyValues = currentResults.map((result) => result.latencyMs);
  const httpErrors = currentResults.filter((result) => !result.ok).length;
  const summary = {
    scenarioCount: currentResults.length,
    httpErrorRate: currentResults.length ? Number((httpErrors / currentResults.length).toFixed(3)) : 0,
    latencyMs: {
      p50: Number(percentile(latencyValues, 50).toFixed(1)),
      p95: Number(percentile(latencyValues, 95).toFixed(1)),
      max: Number(Math.max(0, ...latencyValues).toFixed(1)),
    },
  };

  const gates = scenariosConfig.gates || {};
  if (gates.maxP95LatencyMs && summary.latencyMs.p95 > gates.maxP95LatencyMs) {
    findings.push({
      severity: 'medium',
      id: 'global.latency_p95',
      message: 'Global eval harness p95 latency breached threshold',
      evidence: { expectedMax: gates.maxP95LatencyMs, actual: summary.latencyMs.p95 },
    });
  }
  if (gates.maxHttpErrorRate !== undefined && summary.httpErrorRate > gates.maxHttpErrorRate) {
    findings.push({
      severity: 'high',
      id: 'global.http_error_rate',
      message: 'Global eval harness HTTP error rate breached threshold',
      evidence: { expectedMax: gates.maxHttpErrorRate, actual: summary.httpErrorRate },
    });
  }

  const baselinePayload = parseJson(baselinePath);
  const drift = compareWithBaseline(currentResults, baselinePayload?.results || []);

  const report = {
    kind: 'geo-lab.temporal-retrieval-eval',
    generatedAt: nowIso(),
    baseUrl,
    scenariosPath,
    summary,
    results: currentResults.map((item) => ({
      ...item,
      titles: item.titles.slice(0, 25),
    })),
    drift,
    findings,
    status: findings.some((f) => f.severity === 'high' || f.severity === 'critical') ? 'FAIL' : 'PASS',
  };

  ensureDir(outPath);
  fs.writeFileSync(outPath, `${JSON.stringify(report, null, 2)}\n`);

  if (!baselinePayload?.results?.length) {
    ensureDir(baselinePath);
    fs.writeFileSync(baselinePath, `${JSON.stringify({ generatedAt: nowIso(), results: currentResults }, null, 2)}\n`);
  }

  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.status === 'PASS' ? 0 : 1);
}

main().catch((error) => {
  const payload = {
    kind: 'geo-lab.temporal-retrieval-eval',
    generatedAt: nowIso(),
    status: 'FAIL',
    error: String(error),
  };
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
  process.exit(1);
});
