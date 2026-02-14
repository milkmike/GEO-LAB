# Wave-2 / S2 Retrieval — Verification Playbook + Rollback

## Scope
Verification for retrieval stream behavior used by:
- `GET /api/analyst/case`
- `GET /api/analyst/entity`
- `GET /api/analyst/country`

Primary goals:
1. confirm scoring and fallback behavior;
2. confirm endpoint resilience when live data is degraded;
3. provide rollback path without schema operations.

---

## 1) Pre-checks

```bash
npm ci
npm run ci:validate
npm run ci:release
```

Expected:
- lint/typecheck/unit/build all pass.

---

## 2) API smoke checks

Run app locally (`npm run dev`) and execute:

```bash
curl -s 'http://localhost:3000/api/analyst/case?narrativeId=1' | jq '.timeline | length, .[0]'
curl -s 'http://localhost:3000/api/analyst/case?narrativeId=2' | jq '.timeline | length, .[0]'
curl -s 'http://localhost:3000/api/analyst/entity?entity=Газпром&countries=KZ,UZ' | jq '.timeline | length, .[0]'
curl -s 'http://localhost:3000/api/analyst/country?code=KZ' | jq '.timeline | length, .[0]'
```

Expected:
- HTTP 200 on valid requests.
- `timeline` arrays are present and non-empty for seeded test cases.
- `relevanceScore` and `whyIncluded` are present for narrative/country/entity timeline items.

---

## 3) Scoring/fallback verification checklist

### Narrative timeline (`buildNarrativeTimeline`)
- [ ] `strong` items have `relevanceScore >= 2`.
- [ ] If strong items < 8, weak matches (`> 0`) are appended from fallback pool.
- [ ] Output is deduplicated and sorted by `publishedAt` desc.

### Entity timeline (`getEntityWorkspace` + `temporalRetrieve`)
- [ ] Returned timeline items include explainability text in `whyIncluded` and numeric `relevanceScore`.
- [ ] Results are recency-ordered (desc by `publishedAt`), deduped by normalized `title+source`.
- [ ] Query variants with temporal phrases (`за последние 24 часа`, `за неделю`) still return stable non-error payloads.

### Service fallback behavior
- [ ] If GeoPulse endpoint times out/returns non-200, endpoint still responds via available source set (including mock docs for entity workspace).
- [ ] Case entities use full-neighbor fallback when focused subset is empty.
- [ ] Narrative timeline weak-match fallback activates only when strong set is insufficient.

---

## 4) Benchmark (before/after)

```bash
npm run benchmark:retrieval
node scripts/qa-temporal-retrieval.mjs
```

Script compares:
- **Before baseline**: strict retrieval (`relevanceScore >= 2`, no adaptive fallback)
- **After current**: adaptive fallback (strong + weak top matches when strong set is insufficient)

Expected output section:
- per-narrative `returned`, `truePositive`, `precision`, `recall`
- aggregate comparison table

Reference result artifact:
- `docs/release/wave-2-s2-benchmark-before-after.md`

Target interpretation for release decision:
- recall should increase or remain stable in sparse-keyword narratives;
- precision drop is acceptable only if bounded and explained in release notes.

---

## 5) Rollback notes

## Trigger conditions
- Significant retrieval quality regression (analyst users report irrelevant timeline flooding).
- Endpoint instability linked to retrieval merge.
- Persistent false-positive escalation in key narratives after release.

## Rollback strategy (code-only)
1. Announce rollback start in release channel.
2. Revert deployment to pre-S2 stable commit/tag.
3. Re-run API smoke + quick benchmark baseline.
4. Confirm triage/case/entity flows return to expected quality.
5. Publish incident summary + remediation plan.

## Why rollback is safe
- No DB/schema migration in S2 retrieval documentation scope.
- Rollback requires only git/deploy operations.

---

## 6) Success criteria

Release is accepted when all are true:
- [ ] `ci:validate` and `ci:release` pass.
- [ ] Analyst retrieval endpoints pass smoke checks.
- [ ] Fallback behavior observed matches documented logic.
- [ ] Benchmark artifact generated and attached to release notes.
- [ ] Rollback plan reviewed by release owner.
