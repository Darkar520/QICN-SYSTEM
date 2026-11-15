# Architecture

This document describes the current operational runtime architecture after the
professionalization split. It is an implementation map, not an ontology or
external validation statement.

## Runtime Entry

```text
src/index.jsx
  -> src/App.jsx
     -> AuthProvider
     -> AccessGate
     -> StateProvider
     -> QICNErrorBoundary
     -> lazy SimulationEngine
```

`src/index.jsx` bootstraps React. `src/App.jsx` is the composition shell. The
large interactive runtime now lives in `src/components/SimulationEngine.jsx`.

## Component Map

```text
index.jsx (bootstrap)
  -> App.jsx (composition, access gate, error boundary)
      -> StateProvider.jsx (React context composition)
          -> SimulationStateContext.jsx
          -> SimulationConfigContext.jsx
      -> SimulationEngine.jsx (interactive runtime, loop, tabs, telemetry)
          -> SimulationController.js (WorldModel + Planner ownership)
              -> WorldModelEngine.js
              -> CognitiveEmergencePlanner.js
          -> OntologicalSingularityCore.js
              -> PhenomenologyCore.js (spectral and topology estimators)
          -> FiniteProjectionEvaluator.js (finite inverse-limit proxy)
      -> lazy-tabs/*
```

Additional extracted UI components exist as stable boundaries:

- `ControlPanel.jsx`
- `TelemetryHUD.jsx`
- `ChatInterface.jsx`
- `NetworkCanvas.jsx`
- `TabRouter.jsx`
- `ErrorBoundary.jsx`

These boundaries support future migration out of `SimulationEngine.jsx`; they
do not by themselves change runtime evidence contracts.

## Evidence Layers

- `src/simulation/`: browser-runtime model modules and tick-level behavior.
- `src/experiments/`: episode harness, admissibility, ROEO, SNO, and negative
  controls.
- `src/canon/`: source-of-truth policy, invariant packages, claim mappings,
  finite-horizon approximations, and registry-facing logic.
- `tests/`: reproducible internal verification anchors.
- `docs/`: governance, traceability, posture, architecture, and audit records.

## Boundary Notes

- `PhenomenologyCore` and `FiniteProjectionEvaluator` are imported by runtime
  and canon paths. They are not owned by `StateProvider`.
- `SimulationController` currently owns `WorldModelEngine` and
  `CognitiveEmergencePlanner` instances. It does not expose a public `runTick`
  API; the browser tick loop is extracted into `src/hooks/useSimulationCycle.js` and wired by `SimulationEngine.jsx`.
- Health checks and structured logs are operational diagnostics. They are not
  claim projections and must not be reported as external validation.
- `netlify/functions/` and `js/api/` remain operational or compatibility
  surfaces, not strong scientific evidence surfaces.

## Verification Flow

```text
npm run verify:source-of-truth
  -> source path and authority check

npm run verify:descriptor-registry
  -> machine-readable descriptor registry validation

npm test
  -> internal regression and contract tests

npm run build
  -> esbuild + Tailwind + asset sync

npm run scoreboard:run
  -> internal professionalization scoreboard
```


## Runtime stabilization boundaries (2026-11-05)

`SimulationEngine.jsx` owns presentation and chat orchestration; `src/utils/llmTransport.js` owns HTTP deadlines, provider/proxy routing and transport provenance. This extraction is still Gemini-specific and is not a universal inference adapter.

The chat validates each newly generated reply against its current integrity packet; historical Q&A cannot bypass that validation. `HolographicMemoryNexus` remains an internal heuristic memory with context-dependent retrieval, not a truth store.

Server authentication is centralized in `netlify/functions/lib/auth-user.js`. The standalone local server serves only the built public tree and binds to loopback; it does not emulate verified Identity contexts. Selfpatch remains a high-risk operational surface even after its path and stop-control fixes.

See [the dated audit](RUNTIME_STABILIZATION_AUDIT_2026-11-05.md) for baseline provenance, test evidence, scientific non-claims and unresolved dependencies.
