# Release note draft — Wave-1 integration

Wave-1 integrates three foundations for GEO-LAB delivery quality:

- CI/release commands are now centralized and reused across local/CI runs.
- Graph internals were refactored into domain/repository/service layers for safer iteration.
- Release operations now include explicit verification and rollback runbooks.

## Impact
- More predictable validation before merge and release.
- Better maintainability of graph logic without changing public graph API routes.
- Faster incident response with a concrete rollback checklist.

## Operator note
No schema/data migration is included in this wave; rollback is code-level redeploy to the previous stable commit/tag.
