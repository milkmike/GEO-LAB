# Final merge checklist — Wave-1

## Branch/PR hygiene
- [ ] Base branch is `main`
- [ ] PR title follows conventional format
- [ ] PR description includes summary/why/verification/success criteria
- [ ] No unresolved review threads

## Quality gates
- [ ] `npm run ci:validate` passed locally or in CI
- [ ] GitHub CI `Validate (lint + typecheck + tests)` is green
- [ ] `npm run ci:release` passed (build included)

## Functional checks
- [ ] `/api/admin/graph-health` healthy
- [ ] `/api/graph/neighbors` returns graph neighbors
- [ ] `/api/graph/subgraph` returns depth-bounded graph
- [ ] Main UI renders and graph interactions work

## Release readiness
- [ ] `docs/release/checklist.md` reviewed
- [ ] Rollback owner assigned
- [ ] Release note draft approved
- [ ] Post-merge monitoring owner assigned (15 min)

## Merge decision
- [ ] Merge approved
- [ ] Merge method selected (squash/merge commit/rebase)
- [ ] Release tag/version plan recorded
