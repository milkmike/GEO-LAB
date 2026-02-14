# Wave-3 / S5-REL — Known risks and mitigations (signal layer)

## Risk 1 — Query ambiguity/noise can degrade retrieval quality

**Symptoms**
- Low overlap vs baseline under adversarial time phrasing/noisy terms.
- Top results fluctuate more than expected.

**Impact**
- Medium/High (quality): false narrative shifts, operator confusion.

**Mitigation**
- Run `scripts/qa-temporal-retrieval.mjs` before release.
- Gate release on no critical/high findings.
- Use operator trust checks (confidence + evidence + quality) before escalation.

---

## Risk 2 — Alert overreaction from divergence-only interpretation

**Symptoms**
- Triage top escalation treated as incident without trust validation.

**Impact**
- Medium (operational): unnecessary escalation load.

**Mitigation**
- Enforce triage -> case -> explain workflow.
- Require evidence review and trust band assignment before escalation.

---

## Risk 3 — Source bias / low source diversity

**Symptoms**
- Timeline dominated by narrow source cluster.
- Confidence appears stable but evidence is repetitive.

**Impact**
- Medium (analytical): overconfident conclusions.

**Mitigation**
- Track source diversity during verification.
- Mark outputs as medium trust when evidence is narrow.
- Prefer escalation with caveat when diversity is weak.

---

## Risk 4 — Live data fetch instability

**Symptoms**
- GeoPulse retrieval timeout/non-JSON/non-200.
- Partial data feeds or fallback to available corpus.

**Impact**
- Low/Medium (continuity): reduced freshness, possible recall loss.

**Mitigation**
- Keep fallback behavior explicit in operator guidance.
- Monitor endpoint latency and error rate.
- Re-run triage/case smoke after transient incidents.

---

## Risk 5 — Alias conflicts reduce trustworthiness

**Symptoms**
- `quality.aliasConflicts` elevated.
- Entity linkage ambiguity in graph context.

**Impact**
- Medium (trust): wrong entity-level attribution.

**Mitigation**
- Downgrade trust level when alias conflicts are high.
- Require explain endpoint validation for key relations.
- Route ambiguous cases to manual analyst review.

---

## Risk 6 — Performance regression in signal endpoints

**Symptoms**
- p95 latency > smoke threshold.
- Timeouts in entity/case queries.

**Impact**
- Medium (UX/ops): delayed incident triage and slower response cycle.

**Mitigation**
- Include latency smoke in release checklist.
- Block release on sustained p95 degradation.
- Roll back to previous stable revision if user-facing impact persists.