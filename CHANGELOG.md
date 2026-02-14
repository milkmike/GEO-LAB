# Changelog

All notable changes to GEO-LAB are documented here.

## [Wave-3 S5-CODE Signals Layer] - 2026-02-14

### Added
- Rule-based explainable signal engine (`src/lib/analyst/signals.ts`) with:
  - Forecast v1 (country/narrative/entity)
  - Alerts v1 (spikes, new clusters, sentiment shift, novel entities)
  - Trust scoring (text + graph features + rationale)
  - Briefing builder (24h/72h window)
- New analyst endpoints:
  - `GET /api/analyst/forecast`
  - `GET /api/analyst/alerts`
  - `GET /api/analyst/trust`
  - `GET /api/analyst/briefing`
- Query helper for `windowHours=24|72` in analyst request parser.

### Changed
- README examples expanded with Wave-3 signal layer curl calls.
- Temporal orchestration contains a stubbed metrics sink (`recordRetrievalMetric`) to keep type safety until observability hookup.

### Notes
- Signal outputs preserve explainability fields (`whyIncluded`, `relevanceScore`, `confidence`, `evidence`) in forecast/alerts/trust payloads.

## [Wave-3 S6-REL Launch Closure] - 2026-02-14

### Added
- Wave-3/S6 launch closure docs:
  - `docs/release/wave-3-s6-go-live-checklist.md`
  - `docs/release/wave-3-s6-rollback-monitoring-plan.md`
  - `docs/release/wave-3-s6-release-note-draft.md`
  - `docs/release/wave-3-s6-merge-checklist.md`

### Changed
- Release package now includes explicit go/no-go merge criteria, rollback drill requirements, and first-24h monitoring cadence.

### Notes
- Focus is launch readiness and operational closure for integrated analyst + graph API state.
- No schema/data migration introduced by this closure package.

## [Wave-3 S5-REL Signal Layer Release/Docs] - 2026-02-14

### Added
- Signal-layer release docs package:
  - `docs/release/wave-3-s5-pr-summary.md`
  - `docs/release/wave-3-s5-operator-guide.md`
  - `docs/release/wave-3-s5-verification-rollback.md`
  - `docs/release/wave-3-s5-known-risks.md`

### Changed
- Release package now formalizes operator interpretation for forecast/alerts/trust.
- Verification/rollback guidance extended with temporal QA smoke and explainability checks.

### Notes
- S5 scope is release/docs closure for existing signal-layer behavior.
- No schema/data migration required.

## [Wave-2 S3-REL Release/Docs Closure] - 2026-02-14

### Added
- Analyst OpenAPI contract: `docs/api/openapi.analyst.yaml`.
- Analyst API example payload pack in `docs/api/examples/`.
- S3 release docs:
  - `docs/release/wave-2-s3-pr-summary.md`
  - `docs/release/wave-2-s3-rollout-rollback.md`
  - `docs/release/wave-2-s3-verification-checklist.md`

### Changed
- README analyst curl examples aligned to live endpoints (`triage/case/brief/country/entity`).
- Release checklist coverage expanded with analyst endpoint verification flow.

### Notes
- S3 scope is release/docs closure only (no runtime change, no migration).

## [Wave-2 S2 Retrieval Release Docs] - 2026-02-14

### Added
- S2 retrieval release docs:
  - `docs/release/wave-2-s2-retrieval-pr-summary.md`
  - `docs/release/wave-2-s2-verification-playbook.md`
  - `docs/release/wave-2-s2-benchmark-before-after.md`
- Reproducible retrieval benchmark script (`scripts/benchmark-retrieval.js`) and npm command `benchmark:retrieval`.

### Changed
- Release package now explicitly documents retrieval scoring, adaptive fallback behavior, and code-only rollback path.

### Notes
- No schema or data migration required.
- Benchmark compares strict pre-fallback baseline vs current adaptive retrieval behavior.

## [Wave-1 Integration] - 2026-02-14

### Added
- CI/release task-group runner (`scripts/ci/run-task-group.js`) and shared task matrix.
- Preview environment utility tests.
- Release and rollback runbooks under `docs/release/`.

### Changed
- CI workflow now runs the centralized validation task group.
- Graph module refactored into domain/repository/service layers while keeping API endpoints stable.
- Package scripts aligned to shared validation/release groups.

### Notes
- No database/schema migration in this wave.
- Recommended verification: `npm run ci:release` + API smoke endpoints.
