# PR Summary — Wave-2 / S2-REL (Retrieval Stream)

## Title
`docs(release): finalize S2 retrieval stream release package`

## What changed

1. **Release documentation for retrieval stream (S2)**
   - Added this PR summary/changelog package for retrieval-related behavior.
   - Added explicit scoring and fallback documentation (narrative + entity retrieval).
   - Added verification playbook and rollback notes focused on analyst endpoints.

2. **Benchmark section (before/after)**
   - Added reproducible benchmark script and baseline comparison model:
     - **Before**: strict relevance gate (`relevanceScore >= 2`), no adaptive fallback.
     - **After**: adaptive fallback behavior currently used in retrieval stream.
   - Captured retrieval coverage/precision deltas on GEO-LAB mock dataset in:
     - `docs/release/wave-2-s2-benchmark-before-after.md`

3. **Operationalization**
   - Added `npm run benchmark:retrieval` helper for local release validation.

---

## Why

- S2 introduces retrieval behavior that is not obvious from endpoint contracts alone.
- Release readiness requires clear operator guidance:
  - what signals drive scoring,
  - when fallback is expected,
  - how to distinguish healthy fallback from regression,
  - how to roll back safely if retrieval quality degrades.
- Benchmarking gives a consistent before/after narrative for release notes and QA sign-off.

---

## Retrieval behavior (documented)

### Narrative retrieval scoring (timeline engine)
Source: `src/lib/timeline/engine.ts`

- Terms are built from `narrative.keywords`, normalized and deduplicated.
- Score is additive per matched term in title:
  - Latin token match: `+3`
  - Cyrillic token length `>= 6` and not broad-term: `+2`
  - Otherwise: `+1`
- Broad terms currently treated as weak matches: `газ`, `транзит`.

### Narrative fallback
- `strong`: items with `relevanceScore >= 2`.
- If `strong.length < 8`, engine appends best weak matches (`relevanceScore > 0`, top 20).
- Results are deduplicated and recency-sorted.

### Entity retrieval scoring (temporal retrieval stream)
Source: `src/lib/temporal/engine.ts` + `src/lib/analyst/service.ts`

For entity scope, S2 uses `temporalRetrieve(...)` on combined live + mock document pool.

- Candidate signals (hybrid):
  - lexical score
  - hashed-vector cosine score
  - graph support score (entity alias matches + graph centrality)
  - temporal freshness
  - source trust
  - rerank consistency
- Candidate gate: item is dropped when `max(lexical, vector, graphScore) < 0.18`.
- Final rerank score (weighted):
  - lexical `0.26`
  - vector `0.22`
  - graph `0.18`
  - temporal `0.12`
  - consistency `0.10`
  - centrality `0.07`
  - trust `0.05`

### Fallback behavior
- **Temporal fallback:** if no explicit time window, retrieval runs against all-time window (`all-time` subquery).
- **Wide-range decomposition:** long intervals are split into `recent` + `baseline` subqueries.
- **Data-source fallback:** live GeoPulse fetch timeout/non-200/non-JSON => safe `null`; retrieval continues on available documents (including mock set for entity workspace).
- **Narrative fallback:** narrative timeline still uses strong/weak fallback (`relevanceScore >= 2` strong set, fallback top weak matches when strong set is sparse).
- **Graph fallback:** if focused neighbor subset is empty, case workspace returns full neighbor set.

---

## Risk

- **High (quality, known issue):** retrieval can be unstable on noisy/ambiguous temporal wording (low overlap across repeated or noisy queries). Mitigation in this release: keep strict scope filtering and temporal gates, and track via `scripts/qa-temporal-retrieval.mjs` before each deploy.
- **Medium (quality):** fallback can raise recall but may introduce weakly related items.
- **Low (stability):** no schema/db migration; behavior lives in retrieval/ranking logic and docs.

---

## How to verify

See: `docs/release/wave-2-s2-verification-playbook.md`

Quick commands:

```bash
npm ci
npm run ci:validate
npm run ci:release
npm run benchmark:retrieval
node scripts/qa-temporal-retrieval.mjs
```

API smoke:

```bash
curl 'http://localhost:3000/api/analyst/case?narrativeId=1'
curl 'http://localhost:3000/api/analyst/case?narrativeId=2'
curl 'http://localhost:3000/api/analyst/entity?entity=Газпром&countries=KZ,UZ'
curl 'http://localhost:3000/api/analyst/country?code=KZ'
```

---

## Success criteria

- CI and release gates are green.
- Analyst endpoints return non-error responses and structurally valid payloads.
- Retrieval fallback behaves as documented:
  - weak-match inclusion only when strong set is insufficient,
  - dedupe and recency ordering preserved,
  - case entities fallback triggers only when focused subset is empty.
- Benchmark output is generated and attached to release artifacts.

---

## Changelog entry (for PR body / release log)

### Added
- S2 retrieval release docs: PR summary, scoring/fallback notes, verification + rollback playbook.
- Reproducible retrieval benchmark command (`npm run benchmark:retrieval`).

### Changed
- Release package now explicitly documents retrieval scoring and fallback behavior for analyst endpoints.

### Notes
- No schema/data migrations.
- Expected trade-off: improved coverage via fallback with controlled precision impact.
