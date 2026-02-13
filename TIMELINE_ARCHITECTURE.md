# TIMELINE_ARCHITECTURE

Короткий контракт по архитектуре GEO-LAB: **всё строится на тайм-линиях**.

## 1) Базовый принцип

Тайм-линия — это не просто UI-компонент, а **фильтр по scope**.

- `Country timeline` → все новости страны
- `Narrative timeline` → новости, релевантные сюжету
- `Entity timeline` → новости с упоминанием сущности
- `Article timeline` → локальный контекст вокруг выбранного материала

## 2) Scope-изоляция (обязательно)

Нельзя смешивать scope в одной ленте:

- В линии страны нельзя показывать только «сюжетные» новости.
- В линии сюжета нельзя показывать весь шум страны.

Если scope смешан, пользователь теряет доверие к данным.

## 3) Контракт данных для каждого элемента

Каждый элемент тайм-линии должен содержать:

- `title`
- `source`
- `publishedAt`
- `sentiment`
- `stance`
- `relevanceScore` — степень релевантности
- `whyIncluded` — почему элемент попал в ленту
- `confidence` — уверенность алгоритма (0..1)
- `evidence` — список оснований (ID/маркеры источников)

## 4) Текущая реализация

- `src/lib/timeline/engine.ts`
  - `buildCountryTimeline(...)`
  - `buildNarrativeTimeline(...)`

- API:
  - Backward-compatible:
    - `GET /api/analyst/country?code=...`
    - `GET /api/analyst/case?narrativeId=...`
    - `GET /api/analyst/entity?entity=...&countries=...`
  - Unified analyst endpoints:
    - `GET /api/analyst/timeline?scope=country|narrative|entity&...`
    - `GET /api/analyst/graph?scope=country|narrative|entity&...`
    - `GET /api/analyst/query?scope=country|narrative|entity&...`
    - `GET /api/analyst/explain?scope=country|narrative|entity&...`

## 5) UX-правила

- По умолчанию: понятные подписи, без тех-жаргона.
- Сначала «главная мысль», потом детали.
- Высокая плотность данных допустима только при ясном фильтре.

## 6) Критерии качества

1. Пользователь понимает за 30 секунд, почему элемент в ленте.
2. Переходы Country → Narrative → Entity логичны и предсказуемы.
3. Нет визуально «похожих», но логически разных лент.

## 7) Ближайшие шаги

- Сделать `Entity` полноценным уровнем навигации (как Country/Narrative/Article).
- Добавить единый `timelineScope` в ответы API (`country|narrative|entity|article`).
- Ввести автоматическую проверку, что scope не смешивается в рендере.
