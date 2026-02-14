# Wave-3 / S6-REL — Go-live checklist (integrated state)

## Scope (integrated)
Wave-3 launch closure is based on the integrated analyst + graph state currently on `main`:
- Unified API error envelope via `src/lib/api/http.ts`
- Unified analyst scope endpoints (`scope=country|narrative|entity`) for:
  - `/api/analyst/timeline`
  - `/api/analyst/query`
  - `/api/analyst/graph`
  - `/api/analyst/explain`
- Existing analyst workspace endpoints remain live:
  - `/api/analyst/triage`
  - `/api/analyst/case?narrativeId=<id>`
  - `/api/analyst/brief?narrativeId=<id>`
  - `/api/analyst/country?code=<CC>`
  - `/api/analyst/entity?entity=<name>&countries=<csv>`
- Graph/admin health endpoints:
  - `/api/admin/graph-health`
  - `/api/graph/neighbors?nodeId=<id>`
  - `/api/graph/subgraph?nodeId=<id>&depth=1..3`

---

## 1) Pre-go-live quality gate
- [ ] Branch is synced with `main` and release PR has no unresolved review threads
- [ ] `npm ci`
- [ ] `npm run ci:validate`
- [ ] `npm run ci:release`
- [ ] `npm run benchmark:retrieval` (attach artifact/log to release thread)
- [ ] `node scripts/qa-temporal-retrieval.mjs` (no blocking regressions)

## 2) API contract and behavior gate
- [ ] `docs/api/openapi.analyst.yaml` exists and is aligned with live payloads
- [ ] `docs/api/examples/*.json` deserialize successfully
- [ ] Unified API error envelope validated on representative 400/404 cases:
  - format: `{ error: string, code: bad_request|not_found|internal_error }`
- [ ] No undocumented required query parameter discovered in smoke run

## 3) Smoke checks (happy path)
- [ ] `GET /api/admin/graph-health` returns healthy payload
- [ ] `GET /api/graph/neighbors?nodeId=narrative:2` returns nodes/edges
- [ ] `GET /api/graph/subgraph?nodeId=narrative:2&depth=2` returns bounded graph

### Analyst workspace endpoints
- [ ] `GET /api/analyst/triage` -> `200`
- [ ] `GET /api/analyst/case?narrativeId=2` -> `200`
- [ ] `GET /api/analyst/brief?narrativeId=2` -> `200`
- [ ] `GET /api/analyst/country?code=KZ` -> `200`
- [ ] `GET /api/analyst/entity?entity=Россия&countries=KZ,BY` -> `200`

### Unified scope endpoints
- [ ] `GET /api/analyst/timeline?scope=country&code=KZ` -> `200`
- [ ] `GET /api/analyst/timeline?scope=narrative&narrativeId=2` -> `200`
- [ ] `GET /api/analyst/query?scope=entity&entity=Россия&countries=KZ,BY&includeTimeline=1&includeGraph=1` -> `200`
- [ ] `GET /api/analyst/graph?scope=narrative&narrativeId=2&depth=2` -> `200`
- [ ] `GET /api/analyst/explain?scope=narrative&narrativeId=2&articleId=101` -> non-5xx (expected `200` or `404` depending on fixture)

## 4) Smoke checks (error path)
- [ ] `GET /api/analyst/case` -> `400`, `code=bad_request`
- [ ] `GET /api/analyst/brief` -> `400`, `code=bad_request`
- [ ] `GET /api/analyst/country` -> `400`, `code=bad_request`
- [ ] `GET /api/analyst/entity` -> `400`, `code=bad_request`
- [ ] `GET /api/analyst/timeline` -> `400`, `error` includes scope guidance
- [ ] `GET /api/graph/neighbors` -> `400`, `code=bad_request`

## 5) Operational readiness
- [ ] Release owner assigned
- [ ] Rollback owner assigned
- [ ] Monitoring owner assigned (first 60 min)
- [ ] Stakeholder update template prepared
- [ ] Rollback drill completed (see rollback plan doc)

## Go-live success criteria
- [ ] All quality gates pass (`ci:validate`, `ci:release`, retrieval QA scripts)
- [ ] All critical happy-path endpoints return expected payload structures
- [ ] Error envelope is consistent across old/new API surfaces
- [ ] No Sev-1/Sev-2 alerts in first 60 minutes post-release
- [ ] Go/no-go checklist signed by release owner + QA owner
