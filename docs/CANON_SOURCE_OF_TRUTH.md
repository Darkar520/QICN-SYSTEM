# Canon Source Of Truth

## Intent

This implementation repository is not the canonical theory repository. It is
the engineering repository for runtime code, tests, operational controls, and
ecosystem alignment against the release package.

## Canonical Reference Status

| Item | Value | Status |
| --- | --- | --- |
| Canonical theory lineage referenced by release materials | `rigid-identity-framework/*` as recorded inside `QICN-RELEASE` manifests | lineage_reference_only |
| Current public release package pinned by this repo | `QICN-RELEASE/main@92d5d2c3ea91c65e29dc8e102bed504866cffd2d` with `rigid-identity-framework/basecore/`, `rigid-identity-framework/canonical_core_legacy/`, and downstream Papers I-IX | verified_public_release_sha_pinned |
| Historical frozen public corpus baseline | `QICN-RELEASE/main` at the March 2026 freeze lineage | historical_public_freeze_provenance |
| Historical canonical corpus tag | `canonical-freeze-2026-03-01` -> `2d7504be95ca33af5941e30abf7059dc2774edca` | retained_for_provenance |
| Direct upstream repo pin for the original pre-freeze `rigid-identity-framework` working tree | not separately pinned in this repo | not_required_for_current_release_surface_alignment |
| Local runtime source of truth | `src/` | active |
| Local build authority | `build.cjs` | active |

For current cross-repo coordination, this repository follows the aligned
`QICN-RELEASE` working tree rather than the older `Canonical Core + Papers
I-VIII` description. The current release-candidate source package now uses:

- active mathematical base layer: `rigid-identity-framework/basecore/`
- preserved legacy package: `rigid-identity-framework/canonical_core_legacy/`
- downstream public package set: Papers I-IX

The historical March 2026 public freeze remains important provenance, but it
is no longer the right description of the current public release trunk pinned
above.

## Current Release-Candidate Boundary

The following release-facing documents in `QICN-RELEASE` now define the active
alignment target for this repository:

- `QICN-RELEASE/README.md`
- `QICN-RELEASE/docs/CANON_SOURCE_OF_TRUTH.md`
- `QICN-RELEASE/docs/CANON_MANIFEST.md`
- `QICN-RELEASE/release/canon_manifest.v1.json`
- `QICN-RELEASE/release/CANON_MAP.v1.json`
- `QICN-RELEASE/release/claim_registry.v1.json`
- `QICN-RELEASE/release/layer_boundaries.v1.json`
- `QICN-RELEASE/release/system_interface_boundary.v1.json`

Verified alignment facts from those release-candidate surfaces:

- the active mathematical base layer is `BaseCore`
- the active preferred source path is `rigid-identity-framework/basecore/BASECORE.tex`
- `canonical_core_legacy` is preserved as an explicit legacy package, not as
  the live formal spine
- Papers I-IX are classified as downstream public packages
- historical, mirror, reconstructed, and supporting variants remain preserved
  and explicitly classified rather than silently deleted

## Dependency Boundary

| Surface | Depends on current release-candidate package | Depends on historical public freeze provenance | Notes |
| --- | --- | --- | --- |
| Runtime execution in `src/` | no | no | Runtime behavior is determined locally by this engineering repo. |
| Claim labels and inherited claim-family naming in `src/canon/claimMapping/canonicalClaimCatalog.js` | yes | yes | Labels are inherited from an external canon family even when mapping logic is local. |
| Claim interpretation limits in `TRACEABILITY_MATRIX.md`, `DESCRIPTOR_REGISTRY.md`, and `ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md` | yes | yes | These documents depend on release-facing canon boundaries but still must not overstate theory closure or validation. |
| Editorial or release-facing paper surfaces derived from this repo | yes | yes | Current alignment tracks the release-candidate working tree; historical freeze materials remain provenance rather than the only live description. |
| Stage3-0, Stage3-1, Stage3-2, Stage3-3, Stage3-4, Stage3-4B, and Stage3-5 local governance docs, internal artifacts, instantiated-empty records, rehearsal layers, and the Paper 10 local source tree | no | no | These are local engineering governance, freeze, packaging, dry-run, provenance-closure, instantiated-empty, rehearsal, and protocol-readiness surfaces only and are explicitly excluded from the current public release canon. |
| Source-of-truth enforcement, build authority, registry validation, and run/batch admissibility logic | no | no | These are local engineering and audit surfaces. |

## Pinning Outcome

- Current cross-repo alignment target:
  `QICN-RELEASE/main@92d5d2c3ea91c65e29dc8e102bed504866cffd2d` with `BaseCore`
  as active base layer, `canonical_core_legacy` as preserved legacy, and
  Papers I-IX as downstream public packages.
- Historical public freeze provenance retained:
  `canonical-freeze-2026-03-01` -> `2d7504be95ca33af5941e30abf7059dc2774edca`.
- Separate direct upstream theory working-tree pin for the original private
  pre-freeze history: still not established here.
- Required discipline: do not present the historical March 2026 freeze as if it
  still described the current public trunk pinned above, and do not confuse a
  public SHA pin with external validation, theory confirmation, or claim
  closure.

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
- The current public SHA pin is not identical to external validation, theory confirmation, or claim closure.
- The verified release-package freeze is not identical to a direct upstream theory-repo pin.
- This repository does not, by itself, close claim-ledger status or publication claims.
