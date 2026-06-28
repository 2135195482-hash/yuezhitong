# GitHub Pages Release

Date: 2026-06-28

## Repository

- GitHub account: `2135195482-hash`
- Repository: `https://github.com/2135195482-hash/yuezhitong`
- Visibility: public
- Default branch: `main`
- Working release branch: `feature/official-static-data-release`

## Pages

- Pages URL: `https://2135195482-hash.github.io/yuezhitong/`
- Pages mode: GitHub Actions (`build_type=workflow`)
- Initial successful workflow run: `28318268561`
- Workflow: `.github/workflows/deploy-pages.yml`

The workflow runs `npm ci`, `npm run lint`, `npm run typecheck`, `npm test`, `npm run build`, `npm run test:static`, uploads `out/`, and deploys GitHub Pages.

## Online QA

Anonymous QA passed against the public Pages URL.

- Home: 200
- Official historical data page: 200
- Candidate review page: 200
- Results page direct route: 200
- Sources page: 200
- Disclaimer page: 200
- Static official JSON files: all six year/category files loaded
- Official search: passed with institution code `10590`
- Add historical row to plan: passed
- Manual candidate entry: passed
- CSV/batch paste preview and error row: passed
- Local rule analysis result page: passed
- CSV, JSON, and text export: passed
- Official checklist persistence after refresh: passed
- 390px mobile overflow check: passed
- 1440px desktop overflow check: passed
- Forbidden requests to localhost, Vercel, DeepSeek, Prisma, demo DB, or `/api/`: none observed

Screenshots and export samples are saved locally under:

`artifacts/github-pages-final/`
