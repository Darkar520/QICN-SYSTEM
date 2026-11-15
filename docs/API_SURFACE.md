# API Surface

This file records stable internal API surfaces used by tests, runtime modules,
and audit scripts. It does not create new claims and does not imply external
validation.

## `src/simulation/PhenomenologyCore.js`

Public class: `PhenomenologyCore`

- `recordState(state, input)`: appends state/input scalars to the finite
  runtime history.
- `calculateBethQ()`: estimates causal-closure proxy `beth_q` over recorded
  histories.
- `calculateSpectralGap()`: returns empirical `lambda_1`, `lambda_2`, and
  `delta_lambda` estimates. High volatility is exposed through
  `_diagnostics.spectralWarning`.
- `testHolonomy()`: computes finite-history winding diagnostics:
  `raw_winding_number`, `winding_integer`, `winding_orientation`, and
  compatibility `topo_factor`.
- `calculateLipschitzNorm()`: estimates finite transition drift.
- `classifySystem()`: returns the current phenomenology class summary.
- `reset()`: clears runtime histories and returns the state to defaults.

Boundary: these are computational estimators over finite runtime traces, not
strict mathematical proof of phenomenology or consciousness.

## `src/canon/invariants/CanonicalInvariantPackage.js`

Public exports:

- `CANON_INVARIANT_PACKAGE_VERSION`: current package version string.
- `buildCanonicalInvariantPackage({ header, summary, verdict, ticks })`:
  builds invariant records `I_per` through `I_leg`, including the relational
  identity invariant `I_ri`.
- `flattenInvariantScores(invariantPackage)`: returns a flat map from invariant
  id to score.

Boundary: invariant packages are derived artifacts assembled from runtime
signals and summaries. They are not runtime-primary artifacts and not external
validation.

## `src/canon/finite_horizon/FiniteProjectionEvaluator.js`

Public exports:

- `INVERSE_LIMIT_COMPONENTS`: finite component list used for inverse-limit
  compatibility scoring.
- `evaluateFiniteProjection({ trace, horizon, projectionSpec, metricSpec })`:
  projects a bounded trace into a finite-horizon observable summary.
- `computeProjectionError({ projected, target, metricSpec })`: computes a
  bounded projection error against a target.
- `computeProjectionResourceProfile({ horizon, branchFactor, stateDimension })`:
  estimates bounded resource growth for finite projections.
- `projectionMorphism(state_t1, state_t, epsilon, components)`: evaluates
  adjacent finite-state compatibility.
- `buildInverseLimitStateFromTick(tick, summaryMetrics)`: normalizes tick data
  into finite inverse-limit components.
- `computeInverseLimitScore({ trace, window, epsilon, components })`: computes a
  finite-window adjacent-state compatibility score.

Boundary: `computeInverseLimitScore` is explicitly finite-window support. It is
not a full inverse-limit proof.

## `src/simulation/SimulationController.js`

Public class: `SimulationController`

- `attachCore(core)`: attaches the controller-owned `WorldModelEngine` and
  `CognitiveEmergencePlanner` to the provided core object.
- `reset()`: recreates the owned world model and planner, then reattaches them
  to the current core when present.
- `getDiagnostics()`: reports controller diagnostics, including whether the
  core binding remains unified.

Boundary: there is no public `runTick` method in the current implementation.
The browser tick loop remains in `src/components/SimulationEngine.jsx`.

## Barrel Exports

- `src/experiments/index.js` exposes negative controls, ROEO/SNO evaluation, and
  admissibility exports.
- `src/canon/index.js` exposes stable canon helpers. At the time of this
  document, finite-horizon barrel export includes `evaluateFiniteProjection`;
  callers requiring `projectionMorphism` or `computeInverseLimitScore` import
  directly from `src/canon/finite_horizon/FiniteProjectionEvaluator.js`.


## Operational transport and authentication boundaries

- `src/utils/llmTransport.js::robustFetchLLMResponse`: timeout covers headers and body; session tokens go only to the same-origin Netlify proxy, provider keys only to Gemini. Proxy provenance is returned as `qicnInference`, an operational diagnostic rather than a scientific descriptor.
- `netlify/functions/lib/llm-request-policy.js::boundGeminiPayload`: text payload validation and 8192-token output cap, including raw payloads. The proxy shares a 55-second upstream deadline across fallback attempts.
- `netlify/functions/lib/auth-user.js::requireUser`: accepts platform-supplied `clientContext.user` with an identity; it never authenticates by decoding a client JWT. The minimal local server cannot supply an authenticated Identity context.
- The main chat always generates and validates against its current packet. Historical memory is retained for inspection and explicitly does not bypass current-packet validation.
- `scripts/runtime-static-server.mjs::serveRuntimeStatic`: serves only `dist`, with path containment, dotfile rejection, explicit asset misses and GET/HEAD support. The local listener binds to 127.0.0.1 and rejects untrusted Host/Origin values.
- Selfpatch ignores client-provided switch states; ON or UNKNOWN blocks the quorum even in unrestricted mode. Risk and budget policies remain distinct controls.

These operational contracts do not modify the descriptor registry, claim projections, run verdicts or batch-enforcement results.
