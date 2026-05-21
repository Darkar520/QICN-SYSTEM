# Epistemic Posture

This repository is an empirical-first engineering baseline. The runtime, tests, scoreboards, and internal gates are evidence surfaces for local behavior; the papers and theoretical language are rational reconstructions that must remain separated from implementation status.

## Layer Separation

QICN work in this repository must keep five layers distinct:

- Ontology: interpretive or metaphysical framing. It is not closed by this repository.
- Mathematical model: formal objects, hypotheses, estimators, and falsification criteria.
- Implementation: executable JavaScript, Python bridge checks, configs, scripts, and tests.
- Language: UI labels, reports, concepts, and explanatory prose.
- Interpretation: what an observed run is allowed to support.

No internal artifact should promote implementation support into external validation, claim closure, consciousness, agency, subjecthood, or identity without operational definitions, metrics, new predictions, and reproducible experiments.

## Support Taxonomy

- `ROBUST_INTERNAL_SUPPORT`: implemented and tested inside this repository, with direct or bounded derived evidence and a stable test anchor.
- `PROVISIONAL_SUPPORT`: implemented or partially connected, but dependent on runtime conditions, finite windows, calibration assumptions, or incomplete external corroboration.
- `SCAFFOLD_AWAITING_DATA`: structure exists, but current data is insufficient to decide the associated claim or estimator.

These labels are repository-local. None of them means external validation.

## Invariants

Runtime invariants are computational estimators. They are not literal implementations of Hilbert-space, Banach-space, inverse-limit, or topological objects unless the code exposes the needed formal structure and the tests verify it. When this repository computes finite-window proxies such as `inverse_limit_score`, the support boundary remains finite and operational.

## Anti-Freeze Warm-Up

The `beth_q` and `spectral_gap` values use ANTI-FREEZE warm-up heuristics derived from CCC when the history is short (`src/simulation/PhenomenologyCore.js`). During this start-up window, the values must not be interpreted as strict mutual-information or BaseCore spectral-gap estimators. This is an engineering decision to prevent metric freeze at startup; the values converge toward their formal runtime estimators only after sufficient recorded history exists.

## Negative Controls

Negative controls are falsification routes, not proof routes. Passing NC5 spectral decay, NC6 finite inverse-limit rupture, or NC7 trivial topology verifies that a specific internal failure mode is detectable. It does not externally validate the theory or close a publication-grade claim.

## Reporting Rule

Reports must state whether a result is `implemented_tested`, `implemented_internal_support`, `partial_runtime_path`, `compatibility_only`, `high_risk_control_surface`, `external_dependency`, or `not_recorded`. If current data cannot decide a claim, the correct status is insufficient local evidence, not narrative closure.
