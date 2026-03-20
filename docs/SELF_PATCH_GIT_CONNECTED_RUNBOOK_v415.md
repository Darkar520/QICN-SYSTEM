# QICN Selfpatch Runbook (v4.15)

## 1) Operational mode
- Production selfpatch requires Git-connected Netlify deploy.
- Netlify Drop (ZIP) is emergency fallback only.

## 2) Required GitHub protections
- Branch protection on `main`:
  - Require status checks:
    - `ci/build-test`
    - `ci/selfpatch-policy-check`
  - Require code owner review.
  - Restrict direct pushes.

## 3) Required environment variables
- `GITHUB_REPO_OWNER`
- `GITHUB_REPO_NAME`
- `GITHUB_SELFPATCH_TOKEN` (fine-grained PAT):
  - Contents: Read/Write
  - Pull requests: Read/Write
  - Variables: Read
- `QICN_PATCH_MAX_PROPOSALS_24H=3`
- `QICN_PATCH_MAX_INFLIGHT=1`
- `QICN_PATCH_COOLDOWN_MIN=120`
- `QICN_PATCH_TOKEN_BUDGET_DAY=100000`
- `QICN_NETLIFY_ROLLBACK_MODE=api|ui_only`

Optional:
- `QICN_BLOB_KILLSWITCH_URL`
- `NETLIFY_SITE_ID`
- `NETLIFY_ROLLBACK_TOKEN`

## 4) Killswitch quorum
- `selfpatch-apply` requires BOTH:
  - Blob state = OFF
  - GitHub variable `QICN_KILLSWITCH` = OFF
- The check runs twice:
  - On entry
  - Immediately before GitHub write

## 5) Risk policy
- Low risk (`Σ1`): auto PR path allowed.
- Medium risk (`Σ2`): manual approval required.
- High risk: blocked.
- Protected files are non-modifiable by autonomous patch.

## 6) Rollback
- Primary: Git rollback PR (`selfpatch-rollback` with `rollbackRef`).
- Secondary: Netlify deploy restore via API if available.
- If Netlify API rollback not available, mode must stay `ui_only`.

## 7) CI policy-check and vars
- CI reads kill-switch through repository vars, not secrets:
  - `QICN_KILLSWITCH: ${{ vars.QICN_KILLSWITCH }}`
