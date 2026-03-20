# Canon Source Of Truth

## Intent

This implementation repository is not the canonical theory repository. It is the engineering repository for runtime code, tests, and operational controls.

## Canonical Reference Status

| Item | Value | Status |
| --- | --- | --- |
| Canonical theory repository | `TBD_MANUAL_PIN_REQUIRED` | unresolved |
| Canonical commit or tag | `TBD_MANUAL_PIN_REQUIRED` | unresolved |
| Local runtime source of truth | `src/` | active |
| Local build authority | `build.cjs` | active |

The canonical repository identifier and frozen commit are not yet recorded in this repository. That pin should be added before any external audit workflow that depends on canonical traceability.

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
- This repository does not, by itself, close claim-ledger status or publication claims.
