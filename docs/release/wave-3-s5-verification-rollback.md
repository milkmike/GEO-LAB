# Wave-3 / S5-REL — Verification checklist + rollback notes

## A) Pre-release verification

### Build/quality gate
- [ ] `npm ci`
- [ ] `npm run ci:validate`
- [ ] `npm run ci:release`
- [ ] `node scripts/qa-temporal-retrieval.mjs`
- [ ] QA smoke has no `critical`/`high` findings

### API signal-layer smoke
- [ ] `GET /api/analyst/triage` returns `200`
- [ ] `GET /api/analyst/case?narrativeId=2` returns `200`
- [ ] `GET /api/analyst/country?code=KZ` returns `200`
- [ ] `GET /api/analyst/entity?entity=Газпром&countries=KZ,UZ` returns `200`
- [ ] `GET /api/analyst/explain?scope=narrative&narrativeId=2&articleId=1` returns explanation

### Contract/explainability checks
- [ ] Timeline items include: `whyIncluded`, `relevanceScore`, `confidence`, `evidence`
- [ ] Triage includes: `escalations`, `newest`, `quality`, `generatedAt`
- [ ] Error paths return structured `error` (400/404 where expected)

### Behavioral checks
- [ ] Triage escalations are sorted by divergence descending
- [ ] Case timeline is recency-ordered
- [ ] Explain endpoint resolves at least one timeline article and one graph relation
- [ ] Latency p95 for triage/case/entity/country is within local smoke threshold

## B) Release success criteria

Release is accepted when all are true:
- [ ] Operator guide is actionable and used in sign-off run.
- [ ] Forecast/alert/trust interpretation works on at least two narratives.
- [ ] No blocking mismatch between API payloads and docs.
- [ ] QA temporal smoke status = PASS or only low/medium findings with explicit waiver.

## C) Rollback triggers

Start rollback if any occurs after deploy:
- Signal endpoints return persistent non-200 / malformed payloads.
- Explainability fields missing or semantically broken.
- Critical/high retrieval QA findings appear in prod smoke.
- Alert ranking becomes obviously unstable (severe non-determinism on repeated baseline queries).

## D) Rollback procedure (code-only)

1. Announce rollback start in release channel.
2. Revert S5 release commit(s) to last stable revision.
3. Redeploy previous artifact.
4. Re-run smoke:
   - triage / case / country / entity / explain
   - `node scripts/qa-temporal-retrieval.mjs`
5. Confirm recovery criteria and post incident note.

## E) Recovery criteria after rollback

- Previous stable payload shape restored.
- Core analyst endpoints healthy.
- No critical/high findings in smoke checks.
- Follow-up issue created with root-cause and re-release plan.