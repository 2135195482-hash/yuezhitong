# GitHub Pages Release

Date: 2026-06-28

## Status

GitHub Pages workflow has been added at `.github/workflows/deploy-pages.yml`.

Local blockers:

- `gh` is not installed on this Windows machine.
- The local repository has no GitHub remote configured.
- The GitHub connector exposed in this session can operate on existing repositories, but it does not expose repository creation or whole-repository push.

## Workflow

The workflow runs:

1. checkout
2. setup Node 24
3. `npm ci`
4. `npm run lint`
5. `npm run typecheck`
6. `npm test`
7. `npm run build`
8. `npm run test:static`
9. upload `out`
10. deploy Pages

## Expected URL

After pushing this repository as `yuezhitong` and enabling GitHub Pages through Actions, the expected URL is:

`https://<github-user-or-org>.github.io/yuezhitong/`

The exact address cannot be verified locally until the GitHub repository exists and the workflow completes.
