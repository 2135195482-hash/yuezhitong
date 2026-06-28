# Agent A - Repository And Security Audit

Date: 2026-06-28

## Git State

- Verified current branch before takeover: `feature/volunteer-plan-review-mvp`
- Verified public beta commit: `a7ebaad feat: launch Guangdong volunteer plan review public beta`
- Verified existing tag: `yuezhitong-2026-public-beta`
- Created working branch for this release: `feature/official-static-data-release`
- Git remote: none configured at takeover time
- Working tree before branch creation: clean

## Project State

- `package.json` contains Next.js 16, React 19, TypeScript, Prisma, OpenAI SDK, and Playwright.
- Existing MVP uses browser localStorage and local rule analysis for user-entered candidate plans.
- Existing Prisma schema remains in the repository, but the static release must not require Prisma, SQLite, API routes, server actions, or server environment variables at runtime.
- Existing official import scripts are present under `scripts/importers/`, but they are treated as untrusted until revalidated against the real official files.

## Local Data And Secrets

- `.env` exists locally and is ignored by Git.
- DeepSeek key in local `.env` was previously identified as a placeholder, not a usable production key.
- No `official.db` or `demo.db` file is tracked in the repository.
- Static release policy: demo records must remain at `0` in published official datasets, and all official records must carry `isDemo: false`.

## Ignore Rules Added Or Confirmed

- `.env`, `.env.local`, `.env.*.local`
- `.next`, `out`, `node_modules`
- `*.log`, `*.db`, SQLite journals and backups
- `data/official/raw/` for downloaded original official attachments
- `data/official/work/` for temporary extraction and parsing files

## Baseline Decision

The previous public beta branch is usable. This release starts from commit `a7ebaad` and continues on `feature/official-static-data-release`.

The static official-data release will commit only source manifests, parser/validator scripts, normalized public JSON, tests, product code, and release documentation. Raw downloaded official files remain local by default.
