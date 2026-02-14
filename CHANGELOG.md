# Changelog

All notable changes to GEO-LAB are documented here.

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
