# GeoPulse Lab

Лабораторный стенд для графовой модели GeoPulse (ontology graph + API для подграфов).

## Ключевые архитектурные документы

- `TIMELINE_ARCHITECTURE.md` — контракт timeline-first архитектуры (scope: Country / Narrative / Entity / Article)
- `PLAIN_LANGUAGE_SPEC.md` — правила простого языка и UX-понятности
- `docs/lab/architecture.md` — базовая архитектура репозитория и release-контур
- `docs/lab/WAVE_1_IMPLEMENTATION.md` — что именно реализовано в Wave 1 (infra/graph/workbench), как проверять и что дальше
- `docs/api/openapi.analyst.yaml` — OpenAPI-контракт analyst endpoints (Wave-2 / S3-REL)
- `docs/api/examples/` — эталонные JSON-ответы analyst endpoints
- `docs/release/wave-3-s5-operator-guide.md` — как оператору интерпретировать forecast/alerts/trust в signal layer
- `docs/release/wave-3-s5-verification-rollback.md` — чеклист проверки и rollback для S5
- `docs/release/wave-3-s5-known-risks.md` — known risks + mitigation playbook

## Что уже есть

- UI-прототип навигации по онтологии (Country/Narrative/Article/...)
- Graph API:
  - `GET /api/graph/neighbors?nodeId=<id>`
  - `GET /api/graph/subgraph?nodeId=<id>&depth=1..3`
  - `GET /api/admin/graph-health`
  - `GET /api/admin/monitoring` (latency/error/freshness hooks snapshot)
- Канонические сущности `person/org/place/event`
- Рёбра с `confidence`, `evidence`, `validFrom/validTo`
- Analyst API (timeline/graph/query/explain) с explainability-полями `whyIncluded`, `relevanceScore`, `confidence`, `evidence`

## Примеры

```bash
curl 'http://localhost:3000/api/admin/graph-health'
curl 'http://localhost:3000/api/graph/neighbors?nodeId=narrative:2'
curl 'http://localhost:3000/api/graph/subgraph?nodeId=narrative:2&depth=2'

# analyst endpoints
curl 'http://localhost:3000/api/analyst/triage'
curl 'http://localhost:3000/api/analyst/case?narrativeId=2'
curl 'http://localhost:3000/api/analyst/brief?narrativeId=2'
curl 'http://localhost:3000/api/analyst/country?code=KZ'
curl 'http://localhost:3000/api/analyst/entity?entity=%D0%A0%D0%BE%D1%81%D1%81%D0%B8%D1%8F&countries=KZ,BY'

# Wave-3 signal layer
curl 'http://localhost:3000/api/analyst/forecast?scope=narrative&narrativeId=2&windowHours=24'
curl 'http://localhost:3000/api/analyst/alerts?scope=country&code=GE&windowHours=72'
curl 'http://localhost:3000/api/analyst/trust?scope=entity&entity=%D0%93%D0%B0%D0%B7%D0%BF%D1%80%D0%BE%D0%BC&windowHours=24'
curl 'http://localhost:3000/api/analyst/briefing?scope=narrative&narrativeId=2&windowHours=72'
```

## Запуск

```bash
npm ci
npm run dev
```

## Git branch convention

Используем единый формат для рабочих веток лаборатории:

```text
lab/<stream>/<task>
```

Пример: `lab/s0-code/ci-baseline`.

## Preview env для feature-веток

Минимальный скрипт для локальной подготовки preview-переменных:

```bash
npm run preview:env
# или явно
npm run preview:env -- lab/s0-code/ci-baseline
```

Скрипт создаёт `.env.preview.local` с переменными `NEXT_PUBLIC_DEPLOY_ENV`, `NEXT_PUBLIC_PREVIEW_BRANCH`, `NEXT_PUBLIC_PREVIEW_SLUG`.

## Release readiness / hardening (Wave-3 S6)

```bash
# динамический eval temporal/retrieval
npm run eval:harness

# регрессии ключевых analyst flow + signal endpoints
npm run test:regression

# единый machine-readable go/no-go отчёт
npm run report:release-readiness
```

Артефакты пишутся в `artifacts/evals/*.json` и `artifacts/reports/s6-release-readiness.json`.

## Прод-сборка

```bash
npm run release
```

`release` прогоняет lint + typecheck + unit tests и только затем собирает проект.

> Для Docker используется `output: "standalone"` в `next.config.ts`.
