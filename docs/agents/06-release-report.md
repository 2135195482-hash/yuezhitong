# Agent F - Test, Deployment And Release Report

Date: 2026-06-28

## Local Verification

- `npm run lint`: passed
- `npm run typecheck`: passed
- `npm test`: passed
- `npm run build`: passed and generated `out/`
- `npm run test:static`: passed
- `npm run smoke:static`: passed

## GitHub Pages

- Workflow file created: `.github/workflows/deploy-pages.yml`
- Deployment not completed locally because `gh` is not installed and no GitHub remote is configured.
- Expected Pages URL after repository creation: `https://<github-user-or-org>.github.io/yuezhitong/`

## CloudBase

- CLI can be invoked through `npx -p @cloudbase/cli tcb`.
- Deployment script created: `scripts/deploy-cloudbase.ps1`
- Deployment not completed locally because no CloudBase environment ID/login session was available.

## Vercel Backup

Vercel backup Preview:

`https://yuezhitong-ldqdgr2yf-2135195482-hashs-projects.vercel.app`

Anonymous access test passed for:

- `/`
- `/official/`
- `/questionnaire/`
- `/sources/`
- `/disclaimer/`
- `/data/official/catalog.json`

This is not a substitute for the requested GitHub Pages and CloudBase deployment targets.
