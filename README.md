# GeoPulse Lab

Лабораторный стенд для графовой модели GeoPulse (ontology graph + API для подграфов).

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

## Прод-сборка

```bash
npm run build
node .next/standalone/server.js
```

> Для Docker используется `output: "standalone"` в `next.config.ts`.
