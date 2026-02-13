# GEO-LAB — Wave 1 Implementation (tech baseline)

Дата: 2026-02-14

## Что реализовано в Wave 1

Wave 1 закрывает фундамент для следующей продуктовой итерации: стабильный CI/релизный контур, рефактор графового ядра и базовый analyst-workbench в UI.

### 1) Infra / CI baseline

- Единый branch naming: `lab/<stream>/<task>`
- Централизованные task groups для пайплайнов:
  - `npm run ci:validate`
  - `npm run ci:release`
- Базовые quality gates:
  - lint
  - typecheck
  - unit tests
  - production build (в `ci:release`)
- Preview env скрипт для feature-веток:
  - `npm run preview:env`

### 2) Graph foundation refactor

Внутренняя архитектура графа разделена на слои:

- `domain` — типы/контракты
- `repository` — сборка/доступ к данным
- `service` — бизнес-логика запросов и health

Цель: улучшить поддерживаемость и подготовить почву под дальнейшее развитие графа без ломки текущего API-контракта.

### 3) Frontend workbench foundation (Palantir mode scaffold)

Подготовлена основа аналитического режима:

- 3-pane структура: Timeline / Graph / Evidence
- Улучшенные graph interactions (drag/highlight/filter/confidence)
- Скелеты:
  - time scrubber
  - command palette
  - hypothesis mode
- Усиленная устойчивость UI под нагрузкой (QA stress-path)

## Что проверить после выката

### Автоматические проверки

```bash
npm ci
npm run ci:validate
npm run ci:release
```

### API smoke

```bash
curl 'http://localhost:3000/api/admin/graph-health'
curl 'http://localhost:3000/api/graph/neighbors?nodeId=narrative:2'
curl 'http://localhost:3000/api/graph/subgraph?nodeId=narrative:2&depth=2'
```

### UI smoke

- Открыть главную линию
- Проверить переходы timeline -> graph -> evidence
- Проверить фокус/выделение в графе
- Проверить пустое состояние и slow-loading состояние

## Ограничения Wave 1

- Это фундамент, а не финальная продуктовая версия аналитики.
- Часть функций UI пока в scaffold-режиме и будет подключаться к расширенному backend в Wave 2.

## Что дальше (Wave 2)

- Temporal retrieval engine
- Explainability API contract everywhere
- Более глубокая интеграция workbench с analyst API
