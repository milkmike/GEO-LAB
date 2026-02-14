# Wave-3 / S6-CODE — Eval Harness + Hardening

## Что добавлено

1. **Dynamic eval harness**
   - `scripts/eval-harness.mjs`
   - `scripts/evals/temporal-retrieval.scenarios.json`
   - Артефакты:
     - `artifacts/evals/temporal-retrieval.latest.json`
     - `artifacts/evals/temporal-retrieval.baseline.json`

2. **Regression suite (analyst flows + signal endpoints)**
   - `scripts/regression-analyst-flows.mjs`
   - Проверяет: triage/country/entity/case/brief/timeline/graph/query/explain + graph-health + monitoring
   - Артефакт: `artifacts/evals/analyst-regression.latest.json`

3. **Monitoring hooks (latency/error/freshness)**
   - In-memory мониторинг: `src/lib/monitoring/metrics.ts`
   - API instrumentation: `src/lib/api/http.ts` wrappers (`withApiErrorHandling*`)
   - Freshness hooks:
     - `src/lib/analyst/retrieval/geopulse.client.ts` (`countries.last_updated`)
     - `src/lib/analyst/retrieval/live-country-events.retriever.ts` (`events.published_at`)
   - Retrieval telemetry:
     - `src/lib/temporal/orchestration.ts`
   - Endpoint snapshot:
     - `GET /api/admin/monitoring`

4. **Machine-readable GO/NO_GO report**
   - `scripts/release-readiness-report.mjs`
   - Артефакт: `artifacts/reports/s6-release-readiness.json`
   - Decision policy:
     - eval = PASS
     - regression = PASS
     - monitoring endpoint available
     - monitoring endpoint error rate <= 5%

## Как проверять

```bash
npm run eval:harness
npm run test:regression
npm run report:release-readiness
```

или группой:

```bash
node scripts/ci/run-task-group.js s6-readiness
```

## Критерии успеха

- `artifacts/evals/temporal-retrieval.latest.json` → `status: PASS`
- `artifacts/evals/analyst-regression.latest.json` → `status: PASS`
- `artifacts/reports/s6-release-readiness.json` → `decision: GO`
- `GET /api/admin/monitoring` возвращает endpoint/retrieval/freshness метрики
