# Public Beta Release

Release date: 2026-06-28

Public name: `2026 Guangdong Volunteer Plan Review – Public Beta`

Chinese name: `粤志通 2026 志愿方案复核公测版`

## Deployment

- GitHub Pages: `https://2135195482-hash.github.io/yuezhitong/`
- GitHub repository: `https://github.com/2135195482-hash/yuezhitong`
- Vercel backup: `https://yuezhitong-ldqdgr2yf-2135195482-hashs-projects.vercel.app`
- CloudBase: upload script ready; environment login and environment ID are still required before mainland deployment

## Data

- Data version: `guangdong-undergraduate-group-filing-2023-2025`
- Official historical records: 13,998
- Demo records in public flow: 0
- Review records: 0
- Rejected records: 0
- Placeholder source records: 0
- 2026 enrollment plan: not included

Breakdown:

- 2023 physics: 2,666
- 2023 history: 1,511
- 2024 physics: 3,121
- 2024 history: 1,560
- 2025 physics: 3,503
- 2025 history: 1,637

## Verification

- lint: passed
- typecheck: passed
- unit/data/product tests: passed
- production build: passed
- static export gate: passed
- GitHub Actions deployment: passed
- Anonymous GitHub Pages access: passed
- Static JSON load: passed
- Mobile 390px QA: passed
- Desktop 1440px QA: passed
- Secret scan: no real secrets or API keys found in tracked release files

## AI Status

DeepSeek and other AI calls are disabled in the public static beta. The result page uses local rules only and does not call a server API.

## Known Issues

- The app does not include 2026招生计划; users must verify all 2026 codes, plans, majors, fees, campuses, and rules through official channels.
- Historical院校专业组设置 can change by year; the official data page does not claim a cross-year group code is always equivalent.
- CloudBase mainland deployment is not live yet.

## Disclaimer

本工具仅对用户自行录入的志愿候选方案进行整理和辅助分析，不提供官方招生数据，不构成录取预测或志愿填报承诺。院校代码、院校专业组代码、专业代码、招生计划、选科要求、收费标准和录取规则，必须以《广东省2026年普通高等学校招生专业目录》、广东省教育考试院志愿填报系统及高校2026年招生章程为准。
