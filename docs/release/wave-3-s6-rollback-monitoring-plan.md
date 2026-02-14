# Wave-3 / S6-REL — Rollback drill + post-release monitoring plan

## Risk profile
- Runtime impact: **medium** (API behavior consistency + retrieval quality)
- Data migration impact: **none** (code/config/docs only)
- Primary risk vectors:
  1. Contract drift on analyst endpoints
  2. Retrieval quality degradation (precision/coverage)
  3. Error envelope inconsistency across endpoints

---

## A) Rollback drill (pre-launch, mandatory)

### Drill objective
Prove the team can restore last known stable release within target RTO and with clear operator ownership.

### Owners and targets
- Drill lead: Release owner
- Executor: On-call engineer
- Verifier: QA owner
- Target RTO: **<= 15 minutes** to restore prior stable artifact

### Drill steps
1. **Prepare baseline**
   - Confirm current commit/tag and previous stable tag are recorded in release thread.
   - Capture baseline health:
     - `/api/admin/graph-health`
     - Sample analyst endpoint (`/api/analyst/case?narrativeId=2`)
2. **Simulate rollback trigger**
   - Use a controlled "release degraded" scenario (no production breakage required).
3. **Execute rollback**
   - Redeploy previous stable artifact/tag.
   - Ensure latest unstable artifact is no longer serving traffic.
4. **Verify restoration**
   - Re-run smoke suite from go-live checklist (critical subset at minimum).
   - Confirm error envelope and key endpoint contracts are restored.
5. **Close drill**
   - Record total duration, blockers, and action items.

### Drill exit criteria
- Prior version restored within RTO.
- Critical endpoints healthy.
- Verification notes published in release thread.

---

## B) Production rollback instructions

## Rollback triggers (any one = initiate)
1. `5xx` rate > **2%** for 10+ minutes on analyst API.
2. Critical endpoint unavailable/invalid (`triage`, `case`, `timeline`, `query`, `graph`, `explain`).
3. Retrieval QA signal shows severe regression vs release baseline.
4. Incident commander declares customer-facing impact.

## Rollback procedure
1. Announce rollback start (release channel + incident thread).
2. Freeze further deploys and config changes.
3. Redeploy previous stable tag/artifact.
4. Run critical verification set:
   - `/api/admin/graph-health`
   - `/api/analyst/triage`
   - `/api/analyst/case?narrativeId=2`
   - `/api/analyst/timeline?scope=narrative&narrativeId=2`
   - `/api/analyst/query?scope=entity&entity=Россия&countries=KZ,BY`
5. Confirm alert recovery and endpoint stability.
6. Announce rollback complete + next update ETA.

## Recovery criteria after rollback
- Error rates return to pre-release baseline.
- Critical endpoint set healthy for 30+ minutes.
- Incident ticket includes timeline, trigger, and hypothesis.

---

## C) Post-release monitoring plan (first 24 hours)

### 0-60 minutes (intensive watch)
- Check every 10 minutes:
  - API 5xx / 4xx trend by endpoint
  - p95 latency for analyst endpoints
  - health endpoint status
  - retrieval QA quick probe (manual/API spot checks)

### 1-6 hours (stabilization)
- Check every 30-60 minutes:
  - Error code distribution consistency (`bad_request`, `not_found`, `internal_error`)
  - Scope endpoint behavior (`country|narrative|entity`) on representative queries
  - Any stakeholder-reported payload mismatches

### 6-24 hours (normalization)
- Hourly passive monitoring, with alert thresholds still active.
- End-of-day release summary posted (status + known follow-ups).

## Monitoring success criteria
- No sustained alert breach beyond 10 minutes.
- No contract-breaking regressions in critical endpoints.
- Retrieval quality remains within expected operational variance.
- Release marked stable after 24h and handed back to normal support flow.
