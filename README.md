# GEO-LAB

**Timeline-first analyst backend** для исследования медиапотоков по странам, сюжетам и сущностям.

GEO-LAB можно использовать как API-продукт без фронтенда: сервис отдаёт timeline, graph, explainability и signal-layer ответы для аналитических сценариев.

---

## 1) Что это и зачем

GEO-LAB решает задачу: **быстро объяснимо ответить “что происходит, почему это важно, и где сигнал/шум”**.

Ключевая модель:
- **Country scope** — лента страны
- **Narrative scope** — лента конкретного сюжета
- **Entity scope** — лента вокруг сущности (персона/организация/место)

Важно: scopes не должны смешиваться по смыслу.

---

## 2) Текущий статус (честно)

- Прод: `https://lab.massaraksh.tech`
- Основной live-источник: `https://massaraksh.tech` (GeoPulse Core API)
- Graph-слой внутри LAB сейчас работает через **in-memory mock repository** (`src/lib/graph/repositories/mock-graph.repository.ts`)
- Retrieval/temporal слой в LAB уже использует live-данные из Core для части сценариев

То есть сейчас архитектура гибридная: **live + mock**.

---

## 3) Архитектура backend-only

```text
GeoPulse Core (massaraksh.tech)
  └─ /api/v1/countries, /events, ...
        ↓
GEO-LAB Retrieval + Temporal + Rerank
  └─ scope-aware timeline/query/explain/signal endpoints
        ↓
GEO-LAB Graph Service
  └─ subgraph/neighbors/health (на текущем этапе: mock graph repository)
```

Слои в GEO-LAB:
1. **API routes** (`src/app/api/*`)  
2. **Analyst service** (`src/lib/analyst/service.ts`)  
3. **Retrieval/Temporal/Rerank** (`src/lib/analyst/retrieval`, `src/lib/temporal`)  
4. **Graph domain/service/repository** (`src/lib/graph/*`)  
5. **Monitoring hooks** (`src/lib/monitoring/*`)

---

## 4) Быстрый старт

### Прод (основной сценарий)

```bash
BASE='https://lab.massaraksh.tech'
```

### Локально (разработка)

```bash
npm ci
npm run dev
# then BASE='http://localhost:3000'
```

---

## 5) API smoke-test (без фронтенда)

```bash
# prod by default
BASE='https://lab.massaraksh.tech'
# local option:
# BASE='http://localhost:3000'

# graph/admin
curl "$BASE/api/admin/graph-health"
curl "$BASE/api/admin/monitoring"
curl "$BASE/api/graph/neighbors?nodeId=narrative:2"
curl "$BASE/api/graph/subgraph?nodeId=narrative:2&depth=2"

# analyst core (scope-aware)
curl "$BASE/api/analyst/timeline?scope=country&code=KZ"
curl "$BASE/api/analyst/timeline?scope=narrative&narrativeId=1"
curl "$BASE/api/analyst/query?scope=country&code=KZ&includeTimeline=true&includeGraph=true"
curl "$BASE/api/analyst/graph?scope=narrative&narrativeId=1"
curl "$BASE/api/analyst/explain?scope=country&code=KZ&articleId=101"

# signal layer
curl "$BASE/api/analyst/forecast?scope=narrative&narrativeId=1&windowHours=24"
curl "$BASE/api/analyst/alerts?scope=country&code=GE&windowHours=72"
curl "$BASE/api/analyst/trust?scope=entity&entity=%D0%93%D0%B0%D0%B7%D0%BF%D1%80%D0%BE%D0%BC&windowHours=24"
curl "$BASE/api/analyst/briefing?scope=narrative&narrativeId=1&windowHours=72"
```

---

## 6) Endpoint map

### Analyst (актуальные)
- `GET /api/analyst/timeline` — timeline по scope (country/narrative/entity)
- `GET /api/analyst/graph` — граф по scope
- `GET /api/analyst/query` — агрегированный ответ (timeline + graph)
- `GET /api/analyst/explain` — explainability по элементу
- `GET /api/analyst/forecast` — forecast сигнал
- `GET /api/analyst/alerts` — alerting сигнал
- `GET /api/analyst/trust` — trust/качество сигнала
- `GET /api/analyst/briefing` — краткий аналитический бриф

### Analyst (legacy, совместимость)
- `GET /api/analyst/triage`
- `GET /api/analyst/case`
- `GET /api/analyst/brief`
- `GET /api/analyst/country`
- `GET /api/analyst/entity`

### Graph/Admin
- `GET /api/graph/neighbors`
- `GET /api/graph/subgraph`
- `GET /api/admin/graph-health`
- `GET /api/admin/monitoring`

---

## 7) Explainability contract

Каждый релевантный элемент в аналитических выдачах должен быть объясним:
- `whyIncluded`
- `relevanceScore`
- `confidence`
- `evidence`

Это обязательный слой доверия, а не optional metadata.

---

## 8) Качество, регрессии, release readiness

```bash
# dynamic eval temporal/retrieval
npm run eval:harness

# regression for analyst flows + signal layer
npm run test:regression

# machine-readable GO/NO_GO report
npm run report:release-readiness

# CI release pipeline
npm run release
```

Артефакты:
- `artifacts/evals/*.json`
- `artifacts/reports/s6-release-readiness.json`

---

## 9) Переменные окружения

- `GEOPULSE_API_BASE_URL` — базовый URL Core API (default: `https://massaraksh.tech`)
- `BASE_URL` — базовый URL для скриптов/eval
- `EVAL_SCENARIOS_PATH`
- `EVAL_BASELINE_PATH`
- `EVAL_OUT_PATH`
- `REGRESSION_OUT_PATH`
- `RELEASE_REPORT_PATH`
- `MOCK_PORT`
- `MODE_FILE`

---

## 10) Ограничения текущей версии

1. Graph repository пока mock/in-memory (не внешняя graph DB).  
2. Narrative relevance в широких/шумных запросах может деградировать.  
3. Гибрид live+mock требует аккуратного контроля source-of-truth на проде.  

---

## 11) Документация

- `docs/lab/architecture.md` — архитектурный baseline
- `docs/lab/WAVE_1_IMPLEMENTATION.md` — Wave 1 детали
- `docs/api/openapi.analyst.yaml` — analyst OpenAPI
- `docs/api/examples/` — примеры ответов
- `docs/release/` — release guides, verification, rollback, risks
- `TIMELINE_ARCHITECTURE.md` — timeline-first контракт
- `PLAIN_LANGUAGE_SPEC.md` — plain-language правила

---

## 12) Branching convention

```text
lab/<stream>/<task>
```

Пример: `lab/s0-code/ci-baseline`
