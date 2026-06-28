# Public Beta Release

Release date: 2026-06-28

## Version

- Data version: `guangdong-undergraduate-group-filing-2023-2025`
- Rollback commit before this release branch: `a7ebaad`

## Data Counts

- 2023 物理类：2666
- 2023 历史类：1511
- 2024 物理类：3121
- 2024 历史类：1560
- 2025 物理类：3503
- 2025 历史类：1637
- Total published records: 13998
- Review records: 0
- Rejected records: 0
- Demo records: 0
- Placeholder source records: 0

## Source Files

See `docs/OFFICIAL_DATA_AUDIT.md` and `data/official/manifests/source-manifest.json`.

## Sample Verification

- Sample count: 60
- Exact matches: 60
- Mismatches: 0

## Test Results

- lint: passed
- typecheck: passed
- test: passed
- static build: passed
- static gate: passed
- Playwright smoke: passed

## Deployment

- GitHub Pages: workflow ready; not published locally because `gh` is missing and no remote exists.
- CloudBase: upload script ready; not published locally because CloudBase login/environment ID is unavailable.
- Vercel backup: `https://yuezhitong-ldqdgr2yf-2135195482-hashs-projects.vercel.app`

## Known Issues

- 2026招生计划未内置。
- 历史专业组设置可能每年变化，页面不会只凭专业组代码强行连接。
- GitHub Pages actual URL must be filled after repository creation and workflow completion.
- CloudBase URL must be filled after environment login and upload.
