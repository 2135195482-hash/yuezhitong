# Agent E - Static Product Integration Report

Date: 2026-06-28

## Integrated Features

- Added `/official` for browser-side official historical data search.
- Historical records load from split JSON files under `public/data/official/` by year and category.
- Added reliable trend display only when institution code, institution name, group code, and category all match.
- Added "历史参考候选" pool from 2023-2025 records based on the user's rank.
- Added "加入研究方案" with blank 2026 fields so users must manually fill the official 2026 code, group, majors, plan, tuition, and adjustment choice.
- Preserved manual candidate entry, CSV/TSV paste import, local rule review, exports, and official checklist.
- Added local backup export and local data clearing controls.

## Static Runtime

- `next.config.ts` uses `output: "export"`, `trailingSlash: true`, and `images.unoptimized: true`.
- GitHub Pages can set `NEXT_PUBLIC_BASE_PATH=/yuezhitong`; local and root-domain builds keep an empty base path.
- Removed `src/app/api` route handlers from this static branch.
- Removed unused Prisma and DeepSeek runtime entrypoints from `src/lib`.
- Static results page clearly states that AI deep explanation is not open in this static version.

## Data Loading

- The homepage does not load official records.
- `/official` first loads `catalog.json`, then loads the selected year/category file on demand.
- The three-year reference pool is loaded only when the user asks for it.

## Static Build Gate

`node scripts/static-release.test.cjs` passes after `npm run build`, confirming:

- `out/index.html` and `out/404.html` exist.
- official static JSON is included in `out`.
- no API route tree remains.
- no SQLite, Prisma runtime, or API key literal is present in static output.
