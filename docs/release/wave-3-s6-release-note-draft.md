# Release note draft — Wave-3 / S6-REL (Launch Closure)

Wave-3 closes launch readiness for GEO-LAB by finalizing integrated analyst API operations, error consistency, and release guardrails.

## What changed

- Unified API error handling across graph/admin/analyst routes with standard error envelope:
  - `{ error, code }` where `code ∈ { bad_request, not_found, internal_error }`
- Locked integrated analyst coverage across both endpoint families:
  - Workspace endpoints (`triage`, `case`, `brief`, `country`, `entity`)
  - Scope-driven endpoints (`timeline`, `query`, `graph`, `explain` with `scope=country|narrative|entity`)
- Finalized release closure documentation package for Wave-3/S6:
  - Go-live checklist
  - Rollback drill + production rollback runbook
  - Post-release monitoring plan
  - Merge go/no-go checklist

## Why this release matters

- Improves operator confidence during launch by making readiness and rollback explicit.
- Reduces ambiguity for QA and downstream consumers through consistent API error semantics.
- Provides an auditable go/no-go decision path for release owners.

## How to verify

Run quality gates:

```bash
npm ci
npm run ci:validate
npm run ci:release
npm run benchmark:retrieval
node scripts/qa-temporal-retrieval.mjs
```

Smoke key endpoints:

```bash
curl 'http://localhost:3000/api/admin/graph-health'
curl 'http://localhost:3000/api/analyst/triage'
curl 'http://localhost:3000/api/analyst/case?narrativeId=2'
curl 'http://localhost:3000/api/analyst/timeline?scope=narrative&narrativeId=2'
curl 'http://localhost:3000/api/analyst/query?scope=entity&entity=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&countries=KZ,BY&includeTimeline=1&includeGraph=1'
```

Validate error envelope examples:

```bash
curl 'http://localhost:3000/api/analyst/case'
curl 'http://localhost:3000/api/analyst/timeline'
```

Both should return `400` with JSON body containing `error` and `code`.

## Success criteria

- All launch checklist gates pass.
- Critical analyst and graph endpoints are healthy on happy and error paths.
- Rollback drill completed and documented before launch window.
- No Sev-1/Sev-2 incidents attributable to Wave-3 changes during first 24h.
