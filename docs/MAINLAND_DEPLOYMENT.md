# Mainland Deployment

Date: 2026-06-28

## CloudBase Status

CloudBase CLI is not installed globally, but `npx -p @cloudbase/cli tcb --help` works and reports CloudBase CLI 3.5.8.

No CloudBase environment ID or login session was available in this local shell, so deployment was not attempted.

## One-Step Upload Script

After CloudBase login and environment creation, upload the already verified static output with:

```powershell
.\scripts\deploy-cloudbase.ps1 -EnvId <cloudbase-env-id>
```

The script uploads the existing `out/` directory. It does not rebuild the site.

## Mainland Access Note

CloudBase should be treated as the mainland small-scale test entry after deployment. GitHub Pages remains a free public backup, but this project should not claim that GitHub Pages is stable across all mainland China networks.
