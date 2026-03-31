# Canon Source Of Truth

## Intent

This implementation repository is not the canonical theory repository. It is the engineering repository for runtime code, tests, and operational controls.

## Canonical Reference Status

| Item | Value | Status |
| --- | --- | --- |
| Canonical theory lineage referenced by release materials | `rigid-identity-framework/*` as recorded inside `QICN-RELEASE` manifests | lineage_reference_only |
| Verified frozen canonical corpus repo | `QICN-RELEASE/main` | verified_public_source_of_truth |
| Verified frozen canonical corpus commit | `4779eb1c78341185d03b14bbb300a673e255f407` | verified_git_head |
| Frozen canonical corpus tag | `canonical-freeze-2026-03-01` -> `2d7504be95ca33af5941e30abf7059dc2774edca` | verified_from_release_freeze |
| Direct upstream repo pin for the pre-freeze `rigid-identity-framework` working tree | not separately pinned in this repo | not_required_for_frozen_release_baseline |
| Local runtime source of truth | `src/` | active |
| Local build authority | `build.cjs` | active |

The strongest external canonical baseline currently verifiable from this
repository is `QICN-RELEASE` at the pinned public baseline above. Its freeze
manifests and tags document source lineage into `rigid-identity-framework/*`
without requiring a local sibling checkout of that historical working tree.

This still does not create a separate direct git pin, inside this repository,
for the original pre-freeze `rigid-identity-framework` workspace. The current
repo therefore relies on the frozen canonical corpus baseline, not on a second
live theory branch or a private sibling working tree.

## Verified External Freeze Boundary

The following external artifacts were verified at the pinned `QICN-RELEASE`
baseline:

- `QICN-RELEASE/release/FREEZE_AUDIT_v1/git_log_1.txt`
- `QICN-RELEASE/release/FREEZE_AUDIT_v1/git_tags.txt`
- `QICN-RELEASE/release/CANON_MAP.v1.json`
- `QICN-RELEASE/CHANGELOG.md`
- `QICN-RELEASE/RELEASE_NOTES.md`

Verified facts from those artifacts:

- the canonical external corpus repo is `QICN-RELEASE`
- its current public source-of-truth branch is `main`
- its pinned canonical freeze commit is `2d7504be95ca33af5941e30abf7059dc2774edca`
- its explicit canonical freeze tag is `canonical-freeze-2026-03-01`
- its canon map points the public primary formal spine to `rigid-identity-framework/CANONICAL_CORE.tex` and `rigid-identity-framework/paper1..paper8/main.tex`
- its live public trunk scope now promotes `paper8.first_person_subjectivity` into the public canonical release as `primary_formal_spine` and `formal_source_of_truth`
- its supporting public lineages remain separately classified in release manifests rather than collapsed into the primary formal spine

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

- External canonical corpus baseline: available and verified at `QICN-RELEASE/main`, pinned for the current ecosystem baseline at `4779eb1c78341185d03b14bbb300a673e255f407`.
- Canonical freeze authority: `canonical-freeze-2026-03-01` -> `2d7504be95ca33af5941e30abf7059dc2774edca`.
- Separate direct upstream theory working-tree pin for `rigid-identity-framework/`: not established here and not required for the frozen release baseline.
- Required discipline: do not present the canonical release freeze as equivalent to a direct upstream theory-repo pin for the original working tree.
- Public trunk scope at the pinned release baseline: primary formal spine through Paper VIII, with remaining supporting public lineages still classified separately in the release manifests.

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
