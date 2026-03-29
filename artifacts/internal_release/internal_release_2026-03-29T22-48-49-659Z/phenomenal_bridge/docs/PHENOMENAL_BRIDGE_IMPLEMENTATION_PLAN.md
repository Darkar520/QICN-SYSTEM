# Phenomenal Bridge Implementation Plan

## BPF-0

- Objective: open the bridge layer with protocol, manifests, schemas, boundaries, and scaffold-only code.
- Status: closed.

## BPF-1

- Objective: implement first runtime-facing bridge predicate surfaces and provisional estimators.
- Status: closed at run-level surface scope only.

## BPF-M2

- Objective: implement bridge interventions, matched controls, executable weak rivals, admissible composites, shared bridge loss family, complexity penalty, and bridge reducibility comparison.
- Status: closed at adversarial pre-gate scope only.

## BPF-M3

- Objective: close the internal bridge runtime with root evaluation, bounded threshold binding, root artifacts, ecosystem integration, final audit, and readiness gate.
- Modules:
  - `PhenomenalBridgeGateEvaluator.js`
  - `PhenomenalBridgeEcosystemIntegrator.js`
  - `PhenomenalBridgeFinalAuditor.js`
  - `build-phenomenal-bridge-root.cjs`
  - `build-phenomenal-bridge-ecosystem.cjs`
- Artifacts:
  - `phenomenal_bridge_projection.json`
  - `phenomenal_bridge_gate_result.json`
  - `phenomenal_bridge_manifest.json`
  - `phenomenal_bridge_condition_summary.json`
  - `phenomenal_bridge_batch_summary.json`
  - `phenomenal_bridge_campaign_summary.json`
  - `phenomenal_bridge_candidate_projection.json`
  - `phenomenal_bridge_audit_handoff_summary.json`
  - `phenomenal_bridge_verification_matrix.json`
  - `phenomenal_bridge_final_internal_audit.json`
  - `phenomenal_bridge_readiness_gate.json`
- Verifiers:
  - `verify-phenomenal-bridge-gate.cjs`
  - `verify-phenomenal-bridge-ecosystem.cjs`
  - `verify-phenomenal-bridge-final-audit.cjs`
  - plus retained BPF-0, BPF-1, and BPF-M2 verifiers
- Risks:
  - threshold overreading
  - candidate/audit overreading
  - single-run bridge campaign inflation
  - stale lineage bypass
- Closes:
  - internal bridge root evaluation
  - bounded bridge ecosystem integration
  - final internal bridge audit and readiness gate
- Remains open:
  - external validation
  - human comparator adjudication
  - phenomenality proof
  - metaphysical closure
  - Paper 9 final hardening
