# GEO-LAB architecture baseline

## Purpose
GEO-LAB provides a web application baseline for release/process hardening and future feature streams.

## High-level components
1. **Frontend (Next.js)**
   - Renders UI and handles client interactions.
   - Built with TypeScript and modern React stack.
2. **Static assets (`public/`)**
   - Stores static files served by the web app.
3. **Build and quality tooling**
   - ESLint for code quality.
   - TypeScript typecheck for compile-time safety.
   - CI task groups (`scripts/ci/task-groups.json`) drive shared validation/release command sets.
   - Next.js build pipeline for production artifacts.
4. **Containerization**
   - `Dockerfile` defines runtime image for deployment consistency.

## Repository structure (baseline)
- `src/` — application code (UI/pages/components)
- `public/` — static assets
- `scripts/` — utility/automation scripts (`scripts/ci/` for pipeline task orchestration)
- `docs/` — operational/project documentation

## Runtime flow (baseline)
1. Developer changes code in feature branch.
2. Validation runs (`lint` + `build`).
3. Artifact is built (local or CI) and deployed via container/runtime process.
4. Smoke checks confirm service health.

## Release controls introduced in S0-REL
- PR template requiring change intent + verification + success criteria.
- Release checklist for pre/during/post deployment actions.
- Rollback checklist with trigger conditions and recovery steps.

## Known gaps (next iterations)
- Add environment diagram (dev/stage/prod).
- Define observability baseline (logs/metrics/alerts).
- Add ownership map for services/components.
