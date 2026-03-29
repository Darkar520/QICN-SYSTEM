# Subjectivity Readiness Gate

This gate separates the closed internal subjectivity stack from the next phase.

## Current gate outputs

- `ecosystem_internal_state`: `ecosystem_internal_audit_ready`
- `subjectivity_stack_state`: `ecosystem_internal_subjectivity_complete`
- `bpf_gate_status`: `ready_for_bpf`
- `paper9_gate_status`: `not_ready_for_paper9_scoping`
- `external_validation_status`: `external_validation_absent`

## Reading rule

- `ready_for_bpf` means the current trunk is internally consistent enough to
  open the bridge phase.
- `not_ready_for_paper9_scoping` means Paper 9 should not be opened as if the
  bridge were already formalized.
- Neither status implies phenomenality, external validation, or human
  equivalence.

## Gate failure conditions

- stale subjectivity lineage
- gate or comparator invalidation
- subjectivity candidate projection invalidation
- claim-facing surface leakage
- release/system misalignment around Paper 8 or release pinning

## Required verifier

- `npm run verify:subjectivity-consolidation`
