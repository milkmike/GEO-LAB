# Wave-3 / S5-REL — Operator guide (Forecast / Alerts / Trust)

## 1) Purpose

This guide explains how to interpret signal-layer output in operations:
- what looks like a **forecast**,
- what should be treated as an **alert**,
- how to judge **trust** before escalation.

Important: current S5 signal layer is a ranking/explainability system, not a deterministic prediction model.

---

## 2) Forecast interpretation (what is likely next)

Use these fields first:
- `timeline[].publishedAt` (recency)
- `timeline[].relevanceScore` (1..5)
- `timeline[].confidence` (0.35..0.99)
- `timeline[].whyIncluded`
- `timeline[].stance` + sentiment balance

How to read:
1. **Direction**: look at top recent items in the selected scope (country/narrative/entity).
2. **Momentum**: if top-10 keeps same stance/topic and confidence is stable, trajectory is persistent.
3. **Fragility**: if top items flip stance/source frequently, treat trajectory as unstable.

Recommended action bands:
- **Stable trajectory**: top items coherent in topic + confidence mostly >= 0.65.
- **Unstable trajectory**: mixed stance, low overlap, confidence drift < 0.55.
- **Need analyst review**: contradictory `whyIncluded` reasons across top results.

---

## 3) Alert interpretation (what deserves immediate attention)

Primary alert source: `GET /api/analyst/triage`.

Use:
- `escalations[]` (already sorted by divergence desc)
- `divergence` level
- `quality.status`, `quality.aliasConflicts`
- `newest[]` (recency spikes)

Operational heuristic:
- **High-priority alert**: top escalation has high divergence and is supported by fresh timeline evidence.
- **Medium alert**: divergence high but weak/contradictory evidence.
- **Watch-only**: divergence moderate and no fresh reinforcement in timeline.

If triage is high but quality is degraded (`aliasConflicts` elevated), route to manual review before external escalation.

---

## 4) Trust interpretation (how much to rely on output)

Trust is compositional in S5:
- per-item `confidence`
- explanation quality (`whyIncluded` specificity + `evidence[]` richness)
- graph/data quality (`quality.status`, `aliasConflicts`)
- source trust contribution in temporal reranker

Practical trust bands:
- **High trust**: confidence >= 0.75 and specific evidence from multiple independent signals.
- **Medium trust**: confidence 0.55..0.74, evidence present but narrow or repetitive.
- **Low trust**: confidence < 0.55 or generic explanations, sparse evidence, quality warnings.

Do not treat high confidence alone as sufficient when:
- alias conflicts are high,
- source diversity is low,
- query wording is adversarial/ambiguous.

---

## 5) Escalation decision matrix

- **Escalate now**
  - triage top divergence is materially above peers,
  - latest timeline confirms momentum,
  - trust is medium/high.

- **Escalate with caveat**
  - alert is strong, but trust is medium-low due to quality issues.

- **Hold / monitor**
  - alert weak or unstable,
  - trust low,
  - evidence contradictory.

---

## 6) Operator quick routine (5–10 min)

1. Open triage: identify top 1–2 escalations.
2. Open case timeline for top escalation.
3. Validate trust signals (confidence + evidence + quality).
4. Run explain endpoint for 1–2 key items:
   - `/api/analyst/explain?...&articleId=...`
5. Decide: escalate / caveat / monitor.

---

## 7) Anti-patterns to avoid

- Treating timeline ranking as guaranteed prediction.
- Escalating on divergence alone without trust checks.
- Ignoring `aliasConflicts` when confidence appears high.
- Overfitting decisions to a single source cluster.