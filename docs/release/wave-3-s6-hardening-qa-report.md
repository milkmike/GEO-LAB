# Wave 3 / S6-QA — Hardening QA + Crash/Chaos Report

Date: 2026-02-14  
Scope: stress + chaos validation for GEO-LAB analyst/API + core UI path

## Execution summary

- ✅ `npm run ci:validate` — PASS
- ✅ `npm run ci:release` — PASS (includes build)
- ✅ Chaos scenarios executed via controlled upstream fault-injection mock
- ✅ Soak/perf smoke executed on core API + UI paths
- ✅ Incident simulation + recovery timing captured

Artifacts:
- Chaos/soak raw JSON: `/tmp/qa-wave3-s6-report.json`
- Temporal QA script output: `scripts/qa-temporal-retrieval.mjs` run against local target

---

## 1) Chaos scenarios

Tested modes: `slow`, `partial`, `empty`, `stale` (upstream GeoPulse simulation).

### A. Slow upstream
- Behavior: upstream delayed beyond client timeout budget.
- Result: **no 5xx**, all core endpoints still returned `200` with fallback content.
- Observed degraded latencies:
  - `/api/analyst/triage`: ~7.1s
  - `/api/analyst/country?code=KZ`: ~14.0s
  - `/api/analyst/case?narrativeId=1`: ~14.0s
  - `/api/analyst/entity?...`: ~7.0s
- Degradation signal present: `country.updatedAt = null` under timeout/fallback.

### B. Partial data
- Behavior: incomplete country/events payloads, missing/null fields.
- Result: all endpoints `200`, no parser/runtime crash.
- Timeline remained available (length 4–6 depending endpoint path).

### C. Empty graph slices
- Behavior: upstream returns empty countries/events.
- Result: all endpoints `200`, fallback timelines still returned from local/mock domain data.

### D. Stale cache/data
- Behavior: upstream returns old timestamps.
- Result: all endpoints `200`, stale marker visible through old `country.updatedAt`.
- Measured stale age in test: ~2 days.

---

## 2) Soak/perf smoke

Load profile: repeated requests with moderate concurrency (8–12 workers), 100–140 requests per endpoint.

| Path | Total | Concurrency | Error rate | p50 | p95 | p99 | Max |
|---|---:|---:|---:|---:|---:|---:|---:|
| `/api/analyst/triage` | 140 | 12 | 0.0% | 14.1 ms | 27.0 ms | 48.9 ms | 65.5 ms |
| `/api/analyst/country?code=KZ` | 140 | 12 | 0.0% | 12.4 ms | 15.6 ms | 15.8 ms | 20.8 ms |
| `/api/analyst/case?narrativeId=1` | 120 | 10 | 0.0% | 30.5 ms | 44.8 ms | 47.1 ms | 47.7 ms |
| `/api/analyst/entity?...` | 120 | 10 | 0.0% | 21.2 ms | 22.5 ms | 23.2 ms | 23.4 ms |
| `/` (UI home) | 100 | 8 | 0.0% | 3.5 ms | 15.4 ms | 15.7 ms | 15.9 ms |

UI smoke functional check:
- Home rendered without runtime crash.
- "Open main line" action works.
- Narrative timeline + relation panel populated and interactive.

---

## 3) Incident simulation checklist + recovery timing

### Incident runbook (validated)
1. Detect symptom:
   - latency spike and/or null `updatedAt` on country workspace.
2. Classify severity:
   - degraded data freshness vs hard outage.
3. Activate fallback mode:
   - continue serving mock/local graph/timeline data.
4. Verify blast radius:
   - triage/case/entity/country all respond.
5. Recover upstream:
   - restore upstream mode to `normal`.
6. Confirm recovery:
   - first healthy response includes non-null `updatedAt` and non-empty timeline.
7. Post-incident:
   - record timings, user impact, and mitigation backlog.

### Measured recovery
- Simulated outage mode: `slow`
- Recovery trigger: switch mode to `normal`
- **Observed recovery time (RTO to first healthy country response): ~3.5 ms**
- Probe history: first post-restore probe already healthy.

---

## 4) Additional temporal robustness signal

`qa-temporal-retrieval.mjs` status: **PASS**  
One medium finding:
- `BASELINE_NON_DETERMINISM` (top-15 overlap drift: 1.00 vs 0.93 across repeated baseline runs).

No critical/high findings in temporal QA run.

---

## 5) Risk matrix

| Risk | Likelihood | Impact | Level | Evidence | Mitigation |
|---|---|---|---|---|---|
| Slow upstream causes user-visible latency degradation | Medium | High | **High** | 7–14s response under slow mode | Add per-endpoint timeout budget + circuit breaker + partial response mode with explicit `degraded=true` |
| Freshness ambiguity when upstream stale | Medium | Medium | **Medium** | stale `updatedAt` but no explicit stale banner contract | Add freshness SLA fields (`dataAgeSec`, `isStale`) and UI stale badge |
| Retrieval ranking non-determinism at top-N | Low/Medium | Medium | **Medium** | overlap drift to 0.93 | Stabilize tie-breakers (deterministic secondary sort by id/source/date hash) |
| Fault visibility/alerting insufficient for on-call | Medium | Medium | **Medium** | fallback silent except payload clues | Add metrics/alerts for timeout ratio + fallback activation counters |

---

## Release verdict

## **PASS (with non-blocking risks)**

### Blockers
- **None** (no crash, no 5xx in chaos scenarios, no soak errors).

### Recommended mitigations before broad production rollout
1. Introduce explicit degraded/stale response flags in analyst payload contract.
2. Add circuit-breaker behavior to cap worst-case latency under repeated upstream slowness.
3. Add deterministic tie-break in temporal retrieval to reduce top-N drift.
4. Add operational alerts for fallback activation and upstream timeout rate.
