# Final merge checklist — Wave-3 / S6-REL (explicit go/no-go)

## 1) PR and branch hygiene (hard gate)
- [ ] Base branch is `main`
- [ ] PR title + description include: **what changed / why / how to verify / success criteria**
- [ ] All review threads resolved
- [ ] Required checks configured and reported

**NO-GO if any unchecked**

---

## 2) Build and quality gates (hard gate)
- [ ] `npm run ci:validate` passed
- [ ] `npm run ci:release` passed
- [ ] `npm run benchmark:retrieval` executed and artifact attached
- [ ] `node scripts/qa-temporal-retrieval.mjs` executed with no blocking regression

**NO-GO if any command fails or artifacts missing**

---

## 3) Functional verification (hard gate)

### Critical health
- [ ] `/api/admin/graph-health` healthy
- [ ] `/api/graph/neighbors?nodeId=narrative:2` returns non-empty graph payload

### Analyst workspace
- [ ] `/api/analyst/triage` 200
- [ ] `/api/analyst/case?narrativeId=2` 200
- [ ] `/api/analyst/brief?narrativeId=2` 200
- [ ] `/api/analyst/country?code=KZ` 200
- [ ] `/api/analyst/entity?entity=Россия&countries=KZ,BY` 200

### Unified scope APIs
- [ ] `/api/analyst/timeline?scope=narrative&narrativeId=2` 200
- [ ] `/api/analyst/query?scope=entity&entity=Россия&countries=KZ,BY` 200
- [ ] `/api/analyst/graph?scope=narrative&narrativeId=2&depth=2` 200
- [ ] `/api/analyst/explain?scope=narrative&narrativeId=2&articleId=101` non-5xx

### Error contract
- [ ] Missing required params return `400` with `{ error, code: "bad_request" }`
- [ ] Not-found path returns `404` with `{ error, code: "not_found" }`

**NO-GO if any critical endpoint fails or error contract is inconsistent**

---

## 4) Operational readiness (hard gate)
- [ ] Release owner assigned
- [ ] Rollback owner assigned
- [ ] Monitoring owner assigned
- [ ] Rollback drill completed with evidence
- [ ] Launch communication draft prepared

**NO-GO if ownership or rollback readiness is missing**

---

## 5) Go/No-Go decision record (mandatory)
- [ ] **GO** approved by Release Owner
- [ ] **GO** approved by QA Owner
- [ ] Decision timestamp recorded
- [ ] If **NO-GO**: blocker list + next checkpoint ETA documented

## Final decision
- [ ] GO
- [ ] NO-GO

> Merge is allowed only when all hard gates are checked and final decision is explicitly marked as GO.
