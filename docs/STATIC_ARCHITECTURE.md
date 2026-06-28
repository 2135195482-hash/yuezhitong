# Static Architecture

The public beta uses split JSON files under `public/data/official/`.

- `catalog.json` loads first and contains indexes plus counts.
- Year/category files are loaded on demand by the official search page.
- No SQLite, Prisma runtime, API route, DeepSeek, or server environment variable is required for the static site.
- User-entered plan data remains in browser `localStorage`.

Total public official data size: 13050903 bytes across six split data files.
