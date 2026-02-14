# PR Summary — Wave-2 / S3-REL (release/docs closure)

## Title
`docs(release): close S3 with analyst OpenAPI, rollout notes, and verification pack`

## What changed
1. Added analyst OpenAPI contract:
   - `docs/api/openapi.analyst.yaml`
   - Covers `/api/analyst/triage`, `/case`, `/brief`, `/country`, `/entity`
   - Includes query params, status codes (`200/400/404`) and schema definitions
2. Added concrete response examples:
   - `docs/api/examples/analyst-*.200.json`
   - `docs/api/examples/analyst-errors.json`
3. Added S3 release docs:
   - rollout + rollback runbook
   - endpoint verification checklist
4. Linked docs from `README.md` and updated `CHANGELOG.md` with S3 entry.

## Why
- Lock API contract for analyst endpoints before release.
- Give QA/release a single source of truth for expected payload shape.
- Reduce ambiguity during rollout and incident response.

## How to verify
- Open spec: `docs/api/openapi.analyst.yaml`
- Validate endpoint behavior with curl:
  - `curl 'http://localhost:3000/api/analyst/triage'`
  - `curl 'http://localhost:3000/api/analyst/case?narrativeId=2'`
  - `curl 'http://localhost:3000/api/analyst/brief?narrativeId=2'`
  - `curl 'http://localhost:3000/api/analyst/country?code=KZ'`
  - `curl 'http://localhost:3000/api/analyst/entity?entity=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&countries=KZ,BY'`
- Compare real responses against `docs/api/examples/*`.
- Run release checks from checklist doc.

## Success criteria
- Analyst OpenAPI spec reflects all 5 live analyst endpoints.
- Examples deserialize and match actual response fields.
- Verification checklist can be executed end-to-end without undocumented steps.
- Rollout/rollback notes are actionable by on-call without code context.

---

## Changelog draft (for PR body / release notes)

### Added
- Analyst API OpenAPI spec (`docs/api/openapi.analyst.yaml`).
- Analyst endpoint response examples (`docs/api/examples/`).
- Wave-2 S3 rollout/rollback and analyst verification docs.

### Changed
- README now references analyst API contract and example payloads.
- Release docs expanded for S3 operational closure.

### Risk
- **Low** (docs-only). No runtime or schema migration changes.
