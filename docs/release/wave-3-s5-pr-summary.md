# PR Summary — Wave-3 / S5-REL (Signal Layer release/docs)

## Title
`docs(release): close Wave-3 S5 signal layer package (summary, operator guide, verification, rollback, risks)`

## What changed

1. Added S5 release documentation package for the signal layer:
   - `docs/release/wave-3-s5-pr-summary.md`
   - `docs/release/wave-3-s5-operator-guide.md`
   - `docs/release/wave-3-s5-verification-rollback.md`
   - `docs/release/wave-3-s5-known-risks.md`

2. Captured operator interpretation model for three key outputs:
   - **Forecast view** (timeline trajectory from recency + consistency + context)
   - **Alerts view** (triage escalations ordered by divergence / urgency)
   - **Trust view** (confidence/evidence/quality signals and when to downgrade trust)

3. Added release-ready verification and rollback procedure for S5:
   - endpoint checks,
   - explainability checks,
   - latency/consistency smoke checks,
   - rollback triggers and code-only rollback path.

4. Added known-risk register with mitigation steps for runtime operations and QA sign-off.

> Scope note: this S5 package is **release/docs closure** for the existing signal layer behavior (no schema migration).

## Why

- Signal-layer behavior is spread across triage, retrieval, explainability, and quality signals.
- Operators need one practical playbook for interpreting "what is happening now", "what deserves attention", and "how much to trust this output".
- Release/QA needs deterministic acceptance and rollback rules to reduce ambiguity in incident handling.

## How to verify

See: `docs/release/wave-3-s5-verification-rollback.md`

Quick path:

```bash
npm ci
npm run ci:validate
npm run ci:release
node scripts/qa-temporal-retrieval.mjs
```

API smoke:

```bash
curl 'http://localhost:3000/api/analyst/triage'
curl 'http://localhost:3000/api/analyst/case?narrativeId=2'
curl 'http://localhost:3000/api/analyst/explain?scope=narrative&narrativeId=2&articleId=1'
curl 'http://localhost:3000/api/analyst/entity?entity=%D0%93%D0%B0%D0%B7%D0%BF%D1%80%D0%BE%D0%BC&countries=KZ,UZ'
```

## Success criteria

- Operator can correctly read **forecast / alert / trust** signals without code context.
- S5 checklist is executable end-to-end with no undocumented steps.
- Explainability payloads (`whyIncluded`, `relevanceScore`, `confidence`, `evidence`) are present and coherent.
- Temporal QA smoke (`scripts/qa-temporal-retrieval.mjs`) has no critical/high findings before release.
- Rollback can be executed as code-only revert/redeploy and validated by smoke checks.

---

## Changelog draft (for PR body / release notes)

### Added
- Wave-3 S5 signal-layer release docs: PR summary, operator guide, verification/rollback, known risks.

### Changed
- Release package now formalizes operational interpretation of forecast/alerts/trust and acceptance criteria.

### Notes
- No schema/data migration in S5 docs closure scope.