# Phenomenal Bridge Implementation Plan

## BPF-0

- Objective: open the bridge layer with protocol, manifests, schemas, non-claims, and scaffold-only code.
- Modules: docs manifests, bridge registries, root schema stubs, verifier.
- Artifacts: none emitted; schemas only.
- Verifiers: `verify-phenomenal-bridge-scaffolding.cjs`
- Risks: semantic inflation, fake thresholds, fake gate language.
- Closes: formal opening discipline only.
- Remains open: all bridge runtime work.

## BPF-1

- Objective: implement bridge predicate surfaces and normalized estimator design.
- Modules: bridge predicate mappers and report builders.
- Artifacts: world richness, valence structure, ambiguity bearing, embodied closure, temporal lived structure reports.
- Verifiers: predicate-surface checks, normalization integrity checks, negative controls for fake richness.
- Risks: decorative ontology, estimator circularity, report-only semantics.
- Closes: bridge predicates become measurable.
- Remains open: interventions, comparators, bridge gate.

## BPF-2

- Objective: implement bridge intervention family and matched controls.
- Modules: bridge intervention harness, control registry, perturbation descriptors.
- Artifacts: `bridge_intervention_profile.json`
- Verifiers: intervention selectivity checks, matched-control checks, instability checks.
- Risks: rebranding SRT interventions, generic damage mistaken for bridge evidence.
- Closes: bridge perturbation burden.
- Remains open: comparator burden and gate.

## BPF-3

- Objective: implement bridge rival family, admissible composites, bridge loss family, and bridge irreducibility margin.
- Modules: bridge rival registry runtime, bridge comparator, bridge loss policy.
- Artifacts: `bridge_reducibility_report.json`
- Verifiers: loss-sharing checks, anti-strawman checks, composite coverage checks.
- Risks: weak rivals, unfair loss, naming-based irreducibility.
- Closes: bridge comparator burden.
- Remains open: bridge gate and ecosystem integration.

## BPF-4

- Objective: implement bridge functional, bridge gate, symbolic-to-bound threshold binding, and run-level bridge roots.
- Modules: bridge evaluator, threshold binder, drift logic.
- Artifacts:
  - `phenomenal_bridge_projection.json`
  - `phenomenal_bridge_gate_result.json`
  - `phenomenal_bridge_manifest.json`
- Verifiers: no-compensation control, comparator invalidation control, intervention instability control, drift invalidation control.
- Risks: premature verdicts, fake calibration, bridge support inflation.
- Closes: run-level bridge evaluation.
- Remains open: ecosystem integration and final bridge audit.

## BPF-5

- Objective: integrate BPF into condition, batch, campaign, candidate, and audit-facing governance.
- Modules: bridge ecosystem integrator, bundle wiring, anti-stale lineage checks.
- Artifacts:
  - condition/batch/campaign bridge summaries
  - bridge candidate projection
  - bridge audit handoff summary
  - bridge verification matrix
- Verifiers: bundle integrity, stale bundle invalidation, surface enforcement.
- Risks: candidate misuse, audit misuse, claim-facing leakage.
- Closes: ecosystem integration.
- Remains open: final bridge audit.

## BPF-6

- Objective: execute final internal bridge audit and readiness gate.
- Modules: consolidation verifier, bridge readiness gate, gap register updater.
- Artifacts: bridge consolidation audit and readiness outputs.
- Verifiers: full stack BPF-0..6, cross-repo alignment, anti-overclaim governance.
- Risks: overreading internal admissibility as phenomenality, premature Paper 9 opening.
- Closes: internal bridge audit only.
- Remains open: external validation, human equivalence, Paper 9 theorem program.

## Planning rule

No later block may be treated as closed merely because its terminology exists in
BPF-0. Runtime implementation begins only at BPF-1.
