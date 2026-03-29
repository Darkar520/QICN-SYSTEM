# External Audit Technical Path

## Scope

This path is for a technically competent reviewer who needs exact baselines,
authoritative artifacts, and invalidation triggers without relying on private
context.

Start with `docs/EXTERNAL_AUDIT_SETUP.md` for clone layout, dependency setup,
and cross-platform command expectations.

## Authoritative baselines

Read the exact refs from `external_audit_package_manifest.json`.

- `QICN-SYSTEM`: operational source of truth
- `QICN-RELEASE`: canonical corpus source of truth
- frozen primary execution campaign: fixed operational baseline
- latest accepted comparable campaign: latest comparable extension under the
  same frozen architecture
- invalid historical attempt: preserved negative reference, not authoritative

## Expected artifacts

At minimum, inspect:

- package manifest and status:
  - `external_audit_package_manifest.json`
  - `external_audit_status.json`
  - `internal_red_team_report.json`
- ecosystem candidate:
  - `ecosystem_candidate/ecosystem_release_candidate_manifest.json`
  - `ecosystem_candidate/ecosystem/manifests/ecosystem_verification_matrix.json`
  - `ecosystem_candidate/ecosystem/manifests/ecosystem_gap_register.v1.json`
- execution campaign layer:
  - `system_authoritative/latest_accepted_comparable/campaign_execution_plan.json`
  - `system_authoritative/latest_accepted_comparable/evaluation_batch_report.json`
  - `system_authoritative/latest_accepted_comparable/condition_comparison_report.json`
  - `system_authoritative/latest_accepted_comparable/execution_campaign_readout.json`
  - `system_authoritative/latest_accepted_comparable/execution_campaign_audit_readout.json`
- frozen primary baseline:
  - `system_authoritative/frozen_primary/execution_campaign_readout.json`
  - `system_authoritative/frozen_primary/execution_campaign_audit_readout.json`
- invalid historical attempt:
  - `system_authoritative/invalid_historical_attempt/execution_campaign_readout.json`
  - `system_authoritative/invalid_historical_attempt/execution_campaign_audit_readout.json`
- canonical corpus boundary:
  - `ecosystem_candidate/release/manifests/release_freeze_manifest.json`
  - `ecosystem_candidate/release/manifests/claim_registry.v1.json`
  - `ecosystem_candidate/release/manifests/system_interface_boundary.v1.json`

## Expected PASS conditions

- both repos match the exact SHAs listed in the package manifest
- ecosystem candidate status is `PASS`
- latest accepted comparable campaign has:
  - `batch status = PASS`
  - `cross_artifact_consistency = PASS` or `PASS_WITH_NOTES`
  - `campaign_surface_gating = PASS`
  - `freezeable = true`
- frozen primary baseline remains distinct from latest comparable and latest
  pointer metadata
- invalid historical attempt remains preserved and non-authoritative

## Invalidation triggers

Treat the current package as invalidated if any of the following occurs:

- repo not clean or not pushed
- system canonical command change
- evaluation protocol or registry change without rerun
- unsupported comparison emitted
- claim-facing block not enforced
- release freeze manifest or claim registry change
- runtime-to-corpus or corpus-to-runtime validation inference attempted
- local absolute path leak in docs, manifests, packages, or copied artifacts

## Blocked outputs and surfaces

The following outputs remain blocked for claim-facing use:

- `run_evaluation_metrics.json`
- `condition_evaluation_summary.json`
- `condition_comparison_report.json`
- `evaluation_protocol_manifest.json`
- `evaluation_batch_report.json`
- `campaign_execution_plan.json`
- `execution_campaign_readout.json`
- `execution_campaign_audit_readout.json`
- `latest_campaign_pointer.json`

The latest pointer is routing metadata only. It is not a frozen source of
truth.

## Deep audit order

1. verify SHAs and freeze refs from the package manifest
2. verify ecosystem candidate `PASS`
3. inspect latest accepted comparable triad:
   - audit readout
   - batch report
   - comparison report
4. compare the latest accepted comparable against the frozen primary baseline
5. inspect the invalid attempt to confirm rejection logic is explicit
6. inspect theory-system boundary docs only after the system/campaign layer is
   already understood

## Interpretation boundary

This path supports external review of a frozen internal ecosystem. It does not
convert internal evidence into external validation.
