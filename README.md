# GeoPulse Lab

Лабораторный стенд для графовой модели GeoPulse (ontology graph + API для подграфов).

## Ключевые архитектурные документы

- `TIMELINE_ARCHITECTURE.md` — контракт timeline-first архитектуры (scope: Country / Narrative / Entity / Article)
- `PLAIN_LANGUAGE_SPEC.md` — правила простого языка и UX-понятности
- `docs/lab/architecture.md` — базовая архитектура репозитория и release-контур
- `docs/lab/WAVE_1_IMPLEMENTATION.md` — что именно реализовано в Wave 1 (infra/graph/workbench), как проверять и что дальше

## Что уже есть

- UI-прототип навигации по онтологии (Country/Narrative/Article/...)
- Graph API:
  - `GET /api/graph/neighbors?nodeId=<id>`
  - `GET /api/graph/subgraph?nodeId=<id>&depth=1..3`
  - `GET /api/admin/graph-health`
- Канонические сущности `person/org/place/event`
- Рёбра с `confidence`, `evidence`, `validFrom/validTo`

## Примеры

```bash
curl 'http://localhost:3000/api/admin/graph-health'
curl 'http://localhost:3000/api/graph/neighbors?nodeId=narrative:2'
curl 'http://localhost:3000/api/graph/subgraph?nodeId=narrative:2&depth=2'
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

## Прод-сборка

```bash
npm run release
```

`release` прогоняет lint + typecheck + unit tests и только затем собирает проект.

> Для Docker используется `output: "standalone"` в `next.config.ts`.
