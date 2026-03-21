# Canon Source Of Truth

## Intent

This implementation repository is not the canonical theory repository. It is the engineering repository for runtime code, tests, and operational controls.

## Canonical Reference Status

| Item | Value | Status |
| --- | --- | --- |
| Canonical theory working tree referenced by release materials | `../rigid-identity-framework/` | observed_working_tree |
| Verified frozen external package | `../release_repo_qicn_2026-03-01/` | verified_freeze_package |
| Frozen external package commit | `2b0d0c0` | verified_from_freeze_audit |
| Frozen external package tag | `release-2026-03-01` | verified_from_freeze_audit |
| Upstream theory repo commit or tag for `rigid-identity-framework/` | `TBD_UPSTREAM_REPO_PIN_REQUIRED` | unresolved |
| Local runtime source of truth | `src/` | active |
| Local build authority | `build.cjs` | active |

The strongest external freeze currently verifiable from this workspace is the release package `release_repo_qicn_2026-03-01`, whose own freeze audit records commit `2b0d0c0` and tag `release-2026-03-01`. That freeze package documents source lineage into `rigid-identity-framework/` through `release/CANON_MAP.v1.json` and related release artifacts.

This does not yet close the upstream theory-repository pin for `rigid-identity-framework/` itself. The current repo can therefore rely on a verified external freeze package, but it cannot yet claim a directly pinned upstream theory commit for the primary canonical working tree.

## Verified External Freeze Boundary

The following external artifacts were verified in the local workspace:

- `../release_repo_qicn_2026-03-01/release/FREEZE_AUDIT_v1/git_log_1.txt`
- `../release_repo_qicn_2026-03-01/release/FREEZE_AUDIT_v1/git_tags.txt`
- `../release_repo_qicn_2026-03-01/release/CANON_MAP.v1.json`
- `../release_repo_qicn_2026-03-01/CHANGELOG.md`
- `../release_repo_qicn_2026-03-01/RELEASE_NOTES.md`

Verified facts from those artifacts:

- the frozen external package is `release_repo_qicn_2026-03-01`
- its recorded freeze commit is `2b0d0c0`
- its recorded release tag is `release-2026-03-01`
- its canon map points primary theory lineage to `rigid-identity-framework/CANONICAL_CORE.tex` and `rigid-identity-framework/paper1..paper4/main.tex`

This freeze package is the strongest currently verifiable external boundary available to this repository.

## Dependency Boundary

| Surface | Depends on verified external freeze package | Depends on unresolved upstream theory repo pin | Notes |
| --- | --- | --- | --- |
| Runtime execution in `src/` | no | no | Runtime behavior is determined locally by this engineering repo. |
| Claim labels and inherited claim-family naming in `src/canon/claimMapping/canonicalClaimCatalog.js` | yes | yes | Labels are inherited from an external canon family even when mapping logic is local. |
| Claim interpretation limits in `TRACEABILITY_MATRIX.md`, `DESCRIPTOR_REGISTRY.md`, and `ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md` | yes | yes | These documents must continue to mark canon-dependent interpretation as open where upstream pinning is unresolved. |
| Editorial or release-facing paper surfaces derived from this repo | yes | yes | The release package is available, but it is still a downstream freeze rather than a direct upstream theory pin. |
| Source-of-truth enforcement, build authority, registry validation, and run/batch admissibility logic | no | no | These are local engineering and audit surfaces. |

## Pinning Outcome

- External freeze package pin: available and verified at `release_repo_qicn_2026-03-01`, commit `2b0d0c0`, tag `release-2026-03-01`.
- Upstream theory working tree pin for `rigid-identity-framework/`: still unresolved in this repository.
- Required discipline: do not present the release-package freeze as equivalent to a direct upstream theory-repo pin.

## Inherited Claim Families

The following claim identifiers are inherited from `src/canon/claimMapping/canonicalClaimCatalog.js`. Their presence in this repository means there is runtime mapping logic, not external claim closure.

| Claim | Canon label | Runtime mapping in repo | Current interpretation |
| --- | --- | --- | --- |
| `P5-01` | `existence_side_boundary` | yes | internal boundary runtime path present |
| `P5-02` | `substrate_preserved_class_membership` | yes | runtime path present; external pair family may still be required |
| `P5-03` | `threshold_robustness` | yes | localized threshold runtime path present; denser external stress still pending |
| `P5-04` | `rupture_side_boundary` | yes | internal boundary runtime path present |
| `P5-05` | `complexity_only_failure` | yes | negative-control runtime path present |
| `P5-06` | `biological_non_primacy_operational` | yes | substrate-equivalence path present; external closure still pending |

## Non-Claims

- This repository does not certify external validation.
- This repository does not replace the canonical theory corpus.
- This repository does not, by itself, pin the upstream `rigid-identity-framework/` history.
- The verified release-package freeze is not identical to a direct upstream theory-repo pin.
- This repository does not, by itself, close claim-ledger status or publication claims.
