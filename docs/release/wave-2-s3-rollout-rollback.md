# Wave-2 / S3-REL — Rollout and rollback notes

## Scope
S3 closes release/docs for analyst endpoints only:
- `/api/analyst/triage`
- `/api/analyst/case`
- `/api/analyst/brief`
- `/api/analyst/country`
- `/api/analyst/entity`

No code-path change in this task; scope is contract + release documentation.

## Rollout plan
1. Confirm branch/PR includes:
   - `docs/api/openapi.analyst.yaml`
   - `docs/api/examples/*`
   - `docs/release/wave-2-s3-*.md`
2. Run baseline quality gate:
   - `npm run ci:validate`
   - `npm run ci:release`
3. Smoke analyst endpoints in target env:
   - `GET /api/analyst/triage`
   - `GET /api/analyst/case?narrativeId=2`
   - `GET /api/analyst/brief?narrativeId=2`
   - `GET /api/analyst/country?code=KZ`
   - `GET /api/analyst/entity?entity=Россия&countries=KZ,BY`
4. Verify response fields match documented OpenAPI + examples.
5. Announce S3 closure with links to PR summary + verification checklist.

## Rollback triggers
Initiate rollback if any of the following occurs during rollout:
- Analyst endpoint contract mismatch blocks QA or downstream consumers.
- Published docs reference non-existent endpoints/params.
- Verification checklist contains blocking inaccuracies.

## Rollback procedure
Because S3 is docs-only:
1. Revert S3 documentation commit(s) / PR merge.
2. Re-publish previous stable docs snapshot.
3. Re-run a quick smoke check against live endpoints.
4. Post incident note with corrected ETA for docs re-cut.

## Recovery criteria after rollback
- Previous docs version is restored and accessible.
- Analyst endpoints remain healthy and unchanged.
- Follow-up issue created with exact doc deltas needed.

## Ownership
- Release owner: GEO-LAB maintainer on duty
- Verification owner: QA/analyst representative
- Rollback owner: same as release owner (no infra migration required)
