#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
const artifactPath = process.env.RELEASE_REPORT_PATH || path.join(cwd, 'artifacts/reports/s6-release-readiness.json');

function ensureDir(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function runNodeScript(scriptPath, options = {}) {
  const { extraEnv = {}, artifactFile } = options;

  const result = spawnSync(process.execPath, [scriptPath], {
    cwd,
    env: { ...process.env, BASE_URL: baseUrl, ...extraEnv },
    encoding: 'utf8',
    maxBuffer: 10 * 1024 * 1024,
  });

  const stdout = result.stdout || '';
  const stderr = result.stderr || '';

  let payload = null;
  try {
    payload = JSON.parse(stdout);
  } catch {
    if (artifactFile) {
      try {
        payload = JSON.parse(fs.readFileSync(artifactFile, 'utf8'));
      } catch {
        payload = {
          status: 'FAIL',
          parseError: 'Could not parse script output and artifact file',
          artifactFile,
        };
      }
    } else {
      payload = {
        status: 'FAIL',
        parseError: 'Could not parse script JSON output',
      };
    }
  }

  return {
    exitCode: result.status ?? 1,
    payload,
    stderr,
  };
}

async function fetchMonitoring() {
  try {
    const response = await fetch(`${baseUrl}/api/admin/monitoring`, {
      headers: { accept: 'application/json' },
      signal: AbortSignal.timeout(8000),
    });
    if (!response.ok) return null;
    return await response.json();
  } catch {
    return null;
  }
}

async function main() {
  const evalArtifact = path.join(cwd, 'artifacts/evals/temporal-retrieval.latest.json');
  const regressionArtifact = path.join(cwd, 'artifacts/evals/analyst-regression.latest.json');

  const evalRun = runNodeScript(path.join(cwd, 'scripts/eval-harness.mjs'), {
    artifactFile: evalArtifact,
  });
  const regressionRun = runNodeScript(path.join(cwd, 'scripts/regression-analyst-flows.mjs'), {
    artifactFile: regressionArtifact,
  });
  const monitoring = await fetchMonitoring();

  const gates = {
    evalStatus: evalRun.payload?.status === 'PASS',
    regressionStatus: regressionRun.payload?.status === 'PASS',
    monitoringAvailable: Boolean(monitoring),
    monitoringErrorRateOk: monitoring
      ? (monitoring.endpoints || []).every((endpoint) => Number(endpoint.errorRate || 0) <= 0.05)
      : false,
  };

  const failedGates = Object.entries(gates)
    .filter(([, value]) => !value)
    .map(([key]) => key);

  const report = {
    kind: 'geo-lab.release-readiness',
    generatedAt: new Date().toISOString(),
    baseUrl,
    gatePolicy: {
      description: 'Go only when eval+regression pass and monitoring is available with <=5% endpoint error rate',
      gates,
    },
    decision: failedGates.length ? 'NO_GO' : 'GO',
    failedGates,
    artifacts: {
      eval: {
        exitCode: evalRun.exitCode,
        status: evalRun.payload?.status || 'FAIL',
        artifact: 'artifacts/evals/temporal-retrieval.latest.json',
      },
      regression: {
        exitCode: regressionRun.exitCode,
        status: regressionRun.payload?.status || 'FAIL',
        artifact: 'artifacts/evals/analyst-regression.latest.json',
      },
      monitoring: {
        available: Boolean(monitoring),
        endpoint: '/api/admin/monitoring',
      },
    },
    details: {
      eval: evalRun.payload,
      regression: regressionRun.payload,
      monitoring,
    },
  };

  ensureDir(artifactPath);
  fs.writeFileSync(artifactPath, `${JSON.stringify(report, null, 2)}\n`);
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(report.decision === 'GO' ? 0 : 1);
}

main().catch((error) => {
  const report = {
    kind: 'geo-lab.release-readiness',
    generatedAt: new Date().toISOString(),
    baseUrl,
    decision: 'NO_GO',
    error: String(error),
  };
  process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
  process.exit(1);
});
