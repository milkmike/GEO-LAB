# Changelog

All notable changes to GEO-LAB are documented here.

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
