# Wave-2 / S2 Retrieval Benchmark — Before vs After

## Method

Command:

```bash
npm run benchmark:retrieval
```

Dataset:
- GEO-LAB mock article set (10 items)
- 3 narratives (`id=1,2,3`) with current keyword config

Comparison modes:
- **Before (strict baseline)**: include only `relevanceScore >= 2`
- **After (adaptive retrieval)**: include strong matches, plus weak matches (`>0`) when strong set is sparse

---

## Results

| Narrative | Mode | Returned | True Positive | Precision | Recall |
|---|---:|---:|---:|---:|---:|
| 1: Переговоры по газовому транзиту | before | 2 | 2 | 100.0% | 66.7% |
| 1: Переговоры по газовому транзиту | after | 3 | 3 | 100.0% | 100.0% |
| 2: Курс на интеграцию с ЕС | before | 0 | 0 | 0.0% | 0.0% |
| 2: Курс на интеграцию с ЕС | after | 3 | 2 | 66.7% | 66.7% |
| 3: Обсуждение военных баз | before | 0 | 0 | 0.0% | 0.0% |
| 3: Обсуждение военных баз | after | 1 | 1 | 100.0% | 100.0% |

Aggregate (macro average):
- **Before:** precision 33.3%, recall 22.2%
- **After:** precision 88.9%, recall 88.9%

---

## Interpretation for release

- Adaptive fallback substantially improves coverage in sparse narratives.
- Trade-off is expected: weak-match fallback can introduce false positives (seen in Narrative 2).
- This is acceptable for S2 as long as:
  - fallback is transparent (`whyIncluded`, `relevanceScore`),
  - weak-match volume remains bounded,
  - operators monitor for relevance drift.

## Known caveat

Current lexical match uses substring checks; short terms (e.g. `ЕС`) may match inside unrelated words (e.g. `пересматривает`).
Track as follow-up quality task if false-positive rate increases on live traffic.
