# Release checklist (Wave-1 integrated state)

## Scope covered by this release
- S0-CODE baseline CI/scripts (`f9f8245`)
- S1-REFACTOR graph domain layering (`343a920`)
- S4-REL CI task-group centralization + release docs (`a6a7397`)

## Pre-release
- [ ] Scope and release goal are documented in PR
- [ ] Branch is up to date with `main`
- [ ] Validation gate passed (`npm run ci:validate`)
- [ ] Release gate passed (`npm run ci:release`)
- [ ] No required env/config change is missing from docs
- [ ] Release notes drafted

## Release execution
- [ ] Tag/version prepared
- [ ] Deploy executed in target environment
- [ ] Smoke checks passed (see verification pack below)
- [ ] Monitoring reviewed for at least 15 minutes

## Verification pack (integrated Wave-1)
### Automated
- [ ] `npm ci`
- [ ] `npm run ci:validate`
- [ ] `npm run ci:release`

### API smoke
- [ ] `GET /api/admin/graph-health` returns healthy payload
- [ ] `GET /api/graph/neighbors?nodeId=narrative:2` returns nodes/edges
- [ ] `GET /api/graph/subgraph?nodeId=narrative:2&depth=2` returns bounded subgraph

### UI smoke
- [ ] Home page renders without runtime errors
- [ ] Graph interaction (select/focus) still works
- [ ] Right-rail/details panel still updates from selected entity

## Post-release
- [ ] Stakeholders notified
- [ ] Release notes published
- [ ] Follow-up tasks captured

---

# Rollback checklist (Wave-1 integrated state)

## Trigger conditions
- [ ] Critical user flow broken (graph browsing, right-rail context, API access)
- [ ] Elevated error rate or failed health checks
- [ ] Repeated CI/prod regressions from task-group or graph service changes

## Rollback strategy
- [ ] Announce rollback start in release channel
- [ ] Roll back to previous stable tag/commit before Wave-1 merge
- [ ] Re-deploy previous artifact
- [ ] Re-run API + UI smoke checks
- [ ] Confirm health checks and error rates recovered

## Notes specific to Wave-1
- No schema/data migrations are introduced by Wave-1 commits.
- Rollback is code-only (git + redeploy), with no data restore step expected.
- If issue is CI-only, hotfix can target workflow/scripts without reverting graph refactor.

## After rollback
- [ ] Document incident timeline and root-cause hypothesis
- [ ] Open remediation task(s)
- [ ] Communicate status and next release window
