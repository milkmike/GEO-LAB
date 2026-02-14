# Wave-2 / S3-REL — Verification checklist (analyst endpoints)

## Pre-check
- [ ] `npm ci`
- [ ] `npm run ci:validate`
- [ ] `npm run ci:release`
- [ ] OpenAPI file present: `docs/api/openapi.analyst.yaml`
- [ ] Example payloads present: `docs/api/examples/`

## Endpoint checks

### 1) Triage
- [ ] `GET /api/analyst/triage` returns `200`
- [ ] Response has keys: `escalations`, `newest`, `quality`, `generatedAt`
- [ ] `escalations[].narrativeId` is numeric

### 2) Case
- [ ] `GET /api/analyst/case?narrativeId=2` returns `200`
- [ ] Response has keys: `narrative`, `countries`, `timeline`, `entities`, `events`, `graphStats`
- [ ] `GET /api/analyst/case` returns `400` and body contains `error: narrativeId is required`

### 3) Brief
- [ ] `GET /api/analyst/brief?narrativeId=2` returns `200`
- [ ] `bullets` exists and is non-empty array
- [ ] `GET /api/analyst/brief` returns `400`

### 4) Country workspace
- [ ] `GET /api/analyst/country?code=KZ` returns `200`
- [ ] Response has `country.id == "KZ"`
- [ ] `timeline` is array
- [ ] `GET /api/analyst/country` returns `400` and body contains `error: code is required`

### 5) Entity workspace
- [ ] `GET /api/analyst/entity?entity=Россия&countries=KZ,BY` returns `200`
- [ ] Response has keys: `entity`, `countries`, `timeline`, `generatedAt`
- [ ] `GET /api/analyst/entity` returns `400` and body contains `error: entity is required`

## Contract consistency
- [ ] Live responses match `docs/api/openapi.analyst.yaml`
- [ ] Example files deserialize as valid JSON
- [ ] No undocumented required query parameter is observed

## Success criteria
- [ ] All 5 analyst endpoints pass happy-path checks
- [ ] All required error-path checks (`400`) pass
- [ ] OpenAPI + examples match actual payload shape
- [ ] QA can execute checklist without additional clarifications
