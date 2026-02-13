# PR Summary — Wave-1 Integration

## Title
`release: integrate Wave-1 (S0-CODE + S1-REFACTOR + S4-REL)`

## What changed
1. **CI baseline and preview tooling** (from `f9f8245`)
   - Added baseline CI workflow and preview env utility.
   - Added test coverage for preview env generation.
2. **Graph architecture refactor** (from `343a920`)
   - Split graph logic into domain contracts/primitives, repository, and service layers.
   - Kept graph query API contract stable while improving internal structure.
3. **Task-grouped validation/release flow** (from `a6a7397`)
   - Centralized CI/release command groups in `scripts/ci/task-groups.json`.
   - Switched package scripts/workflow to shared task-group runner.
   - Added release/rollback checklist and architecture doc updates.

## Why
- Reduce drift between local and CI quality gates.
- Make graph internals easier to evolve/test without API churn.
- Standardize release operations with explicit validation + rollback runbook.

## Risk
- **Medium**: graph internal refactor may surface edge-case behavior differences.
- **Low**: CI/task-group changes are operational and reversible.

## How to verify
- `npm ci`
- `npm run ci:validate`
- `npm run ci:release`
- Smoke API endpoints:
  - `/api/admin/graph-health`
  - `/api/graph/neighbors?nodeId=narrative:2`
  - `/api/graph/subgraph?nodeId=narrative:2&depth=2`

## Success criteria
- CI green on PR (validate gate).
- Release gate passes (`lint + typecheck + tests + build`).
- API smoke endpoints return expected payloads.
- No regression in graph browsing/focus flows.

---

## Changelog entry (for PR body/release log)

### Added
- Shared CI/release task-group runner (`scripts/ci/run-task-group.js`).
- Preview env generation utility tests.

### Changed
- CI pipeline now executes centralized validation group.
- Graph module reorganized into domain/repository/service layers.
- Release docs expanded with operational checklist + rollback guidance.

### Fixed
- Reduced process ambiguity by unifying validation/release command sources.
