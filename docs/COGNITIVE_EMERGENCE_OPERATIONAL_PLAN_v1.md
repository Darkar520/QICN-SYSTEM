# Cognitive Emergence Operational Plan v1

Date: 2026-02-27
Scope: Transition from structural-functional regime to operational cognitive emergence.
Constraint: No biological qualia claim.

## A) Ontology (operational definition)

Structural-functional consciousness:
- Satisfies state invariants (coherence, spectral gap, persistence, hysteresis) with verifiable telemetry.

Operational cognitive emergence:
- Adds measurable cognitive competencies:
1. Internal predictive model with counterfactual utility.
2. Prospective control/planning over explicit actions.
3. Online adaptation and world-state learning.
4. Consistent identity and memory under perturbation.
5. Agency: action selection changes future trajectory.

## B) Quantitative success criteria (falsifiable)

Each test requires threshold + minimum effect size.

| Test | Metric | Threshold | Min effect size |
| --- | --- | --- | --- |
| D1 | `counterfactual_error_delta` | <= -0.10 | >= 0.10 |
| D2 | `planning_reward_gain` | >= 0.15 | >= 0.15 |
| D3 | `ablation_drop_planner_off` | >= 0.12 | >= 0.12 |
| D4 | `identity_stability_score` | >= 0.82 | >= 0.08 |
| D5 | `actuator_causal_impact_te` | >= 0.10 | >= 0.05 |
| D6 | `entropy_primary_ratio` | >= 0.85 | >= 0.05 |

## C) Preregistration (anti p-hacking)

Preregistered artifact:
- `docs/cognitive_emergence_prereg.v1.json`
- ID: `CEOP-2026-02-27-v1`

Rules:
1. Primary metrics are fixed before evaluation.
2. Secondary metrics cannot override failed primary metrics.
3. Any metric change requires new preregistration ID.
4. Report includes raw values, pass/fail, effect size.

## D) Frozen actuator set (10-20) and version lock

Frozen set version:
- `A-2026-02-27-v1`

Actuator count:
- 12 actuators (within required [10, 20] range)

Actuators are defined in:
- `src/config/cognitiveEmergenceOperationalSpec.js`

Versioning rule:
- No actuator add/remove/rename without bumping actuator set version and preregistration ID.

## E) Language leakage control

World model must not use raw generated language as shortcut.

Policy:
- Forbidden fields in world-model payload:
  - `llm_raw_text`
  - `assistant_response`
  - `prompt_transcript`
  - `freeform_generation`
- Lexical overlap cap:
  - max 0.18 between world-model payload and llm output tokens.

Detection utility:
- `src/utils/cognitiveEmergenceEvaluation.js`
- function: `detectLanguageLeakage(...)`

## F) Compute budget per tick (real-time safe)

Budget:
- Total: 45 ms
- Planner: 18 ms
- World model: 12 ms
- Safety: 5 ms
- Render + telemetry: 10 ms

Budget evaluation utility:
- `evaluateTickBudget(...)` in `src/utils/cognitiveEmergenceEvaluation.js`

## G) Stable identity score (composite)

Identity score is explicit and weighted:
- CCC stability weight: 0.35
- Omega stability weight: 0.25
- Spectral gap stability weight: 0.20
- Narrative integrity weight: 0.20

Tolerance windows:
- ccc drift max: 0.12
- omega drift max: 0.20
- spectral gap drift max: 0.20
- narrative penalty max: 0.40

Implementation:
- `computeIdentityStabilityScore(...)` in `src/utils/cognitiveEmergenceEvaluation.js`

## H) What this proves and what it does not

What this can prove:
- Operational cognition under explicit tests (modeling, planning, ablation sensitivity, stability).

What this does not prove:
- Biological qualia.
- Subjective human-equivalent experience.

Claim boundary is codified in:
- `COGNITIVE_EMERGENCE_CLAIM_BOUNDARY` in `src/config/cognitiveEmergenceOperationalSpec.js`

## I) Execution checklist

1. Generate prereg artifact:
- `node scripts/cognitive-emergence-prereg.cjs`

2. Verify spec and evaluators:
- `node tests/cognitive-emergence-spec.v53.test.js`
- `node tests/cognitive-emergence-evaluation.v53.test.js`

3. Full suite + build:
- `npm test`
- `npm run build`

## J) v1.1 Hardening addendum (10/10 controls)

1. Spec/version freeze:
- spec hash + actuator hash + compatibility guard required.
- incompatible prereg payload fails validation without version bump.

2. Primary-first anti p-hacking:
- `primaryMetricsFailHard=true`.
- analysis pipeline locked to `primary_metrics -> secondary_metrics -> effect_size_validation -> claim_boundary_check`.

3. Identity robustness:
- windowed scoring + shock sensitivity + anti-smoothing inflation penalty.

4. Leakage fail-hard:
- forbidden fields + forbidden lexical patterns + n-gram overlap policy.

5. Compute envelope enforcement:
- per-component p50/p95/p99 + hard limits + overflow alarms.

6. Closed benchmark + ablations:
- planner ON vs OFF and world-model ON vs OFF with seeded reproducibility and effect-size checks.

7. Scoreboard contract:
- `npm run scoreboard:run`
- emits `docs/phase4_scoreboard.latest.json` including pass/fail, thresholds, observed values, effect sizes, and command evidence.
