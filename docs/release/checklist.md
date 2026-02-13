# Release checklist

## Pre-release
- [ ] Scope and release goal are documented
- [ ] Branch is up to date and reviewed
- [ ] CI passed (`npm run ci:validate`)
- [ ] Environment/config changes are documented
- [ ] Release notes drafted and approved

## Release execution
- [ ] Tag/version prepared
- [ ] Deploy executed in target environment
- [ ] Smoke tests passed after deploy
- [ ] Monitoring/alerts reviewed for at least 15 minutes

## Post-release
- [ ] Stakeholders notified
- [ ] Release notes published
- [ ] Follow-up tasks captured

---

# Rollback checklist

## Trigger conditions
- [ ] Critical user flow broken
- [ ] Elevated error rate or failed health checks
- [ ] Data integrity risk detected

## Rollback steps
- [ ] Announce rollback start in release channel
- [ ] Revert to previous stable tag/build
- [ ] Restore previous config/secrets (if changed)
- [ ] Re-run smoke tests on rolled back version
- [ ] Confirm error rates and health checks recovered

## After rollback
- [ ] Document incident timeline and root cause hypothesis
- [ ] Open remediation task(s)
- [ ] Communicate status and next release window
