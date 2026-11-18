# B1-B2 isolated execution contract

claim_scope: isolated_internal_engineering  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: these are engineering checks and interventions on
detached runtime copies. No result is external validation, primary evidence of
the live trajectory, a claim_projection, an admissibility gate_result, or proof
of phenomenal consciousness. System B/v5 and live UI integration are deferred.

## One runtime implementation and two execution profiles

`src/runtime/SimulationCycleDriver.js` owns initialization and the imperative
tick. `src/hooks/useSimulationCycle.js` is the React adapter: it supplies the
original two useCallback calls in their original order and dependency arrays.
Effects and scheduling remain in the existing component. Source-based guards
follow the extracted driver rather than searching the now-small adapter.

For state S, parameters theta, inputs U, random stream R and clock C:

    S[t+1] = F_theta(S[t], U[t], R[t], C[t])

The language channel is not an argument of F. The experimental result is a
paired difference between runs of this same F, not a second simulation model.

Capabilities live in `ExecutionEnvironment` and are associated with instances
through a WeakMap. They are not enumerable state, do not enter persistence v3,
and survive restoration because fresh instances already own their environment.
Legacy defaults resolve the existing config, RNG, clock and timers lazily.
The legacy RECOMPUTED_EACH_TICK list, formulas and mutation order are unchanged.

| Profile | RNG and clocks | Future observations |
| --- | --- | --- |
| legacy_compatibility | Branch-owned continuation of the captured RNG, sensor RNG, stepped wall and measurement cursors | Synthetic generator continues from its captured cursor, or an explicit tape |
| paired_intervention | Common virtual epoch after the capture; random stream resets by evaluation tick, independent of other branches' draw counts | A complete, immutable per-tick perception tape is mandatory; optional numeric entropy inputs are deterministic fallback inputs |

`capture_only` setters reproduce the historical headless harness. `react_commit`
setters commit captured CCC/PMIA/humanCCC/ascension/running values between ticks.
The setter policy is explicit in the capture and is preserved on restore; these
policies must never be silently interchanged. The compatibility test uses the
actual frozen B0 source via a read-only loader, not a second copy of formulas.

Determinism is for identical wire data and execution implementation/runtime;
there is no assertion of bitwise agreement across arbitrary JS engines. The
CLI signs a normalized-LF manifest of current src code and services/config into
the capture build signature. sourceCommit identifies the base commit; uncommitted
implementation is additionally distinguished by that source signature.
The CLI requires that captured signature to match the current implementation;
the worker API also accepts an explicit trusted expectedBuild. When importing a
capture, its diagnostic seed selects the future tape; a conflicting CLI seed or
a held-out captured seed is rejected.

## Capture, restoration and ownership

`captureWorkbench` copies dynamic state and whitelisted execution components
synchronously at a completed-tick boundary, then asynchronously seals only the
copies. `captureSession` checks the headless boundary and supplies explicit time,
build, parameter, sensor, RNG and runtime-policy data. No live callback or ledger
observer is copied. A captured ledger head is a reference only; the Workbench
never receives the live ledger storage capability.

The inner `qicn.dynamic_state.v3` text and its SHA-256 digest are unmodified.
Its config/runtime/instance/plain registries and storage contract are unchanged.
The new execution-component decoder uses the same graph codec in a separate
context; it does not extend or reinterpret the v3 body. The extra sidecar covers
disabled entropy state, scheduler, scheduler metadata/abort state, last-save
timestamp, captured API/canvas telemetry, and plain runtime inputs. Data-only
copying omits callbacks, while fresh no-op callbacks stay attached on restore.

Restore rejects:

- Wrong envelope/v3 digest, schema, build, node count, tick or Kaizen mode.
- Missing required v3 instances/plain refs/runtime keys or sidecar components.
- Any decoder `unrestored` entry, unresolved reference, unknown class without
  its fresh instance, or post-restore node-count mismatch.
- Incorrect controller/core world-model or planner aliasing.

After applyDynamicState, syncFromCore adopts the restored core-owned engines;
worldModelRef and cogPlannerRef are rebound to those exact instances. Original
captures are immutable, every branch restores fresh instances, and no apply-back
operation exists. Typed shared memory, functions and class instances are not
accepted as protocol wire data. Host changes after request submission cannot
alter an experiment already detached at entry.

Persistence intentionally excludes live external state. B2 captures disabled,
nonpolling entropy execution context and rejects enabled/polling external
providers with `external_entropy_requires_explicit_replay_capture`. It does not
save credentials, run network requests or predict the real future sensor stream.
Supporting a live enabled provider requires an explicit future replay-capture
contract, not pretending v3 captures that provider. The worker can consume a
synthetic entropy-value tape through the deterministic fallback input.

## Entropy capability audit

| Component | Audited dependencies | Injected capability |
| --- | --- | --- |
| QuantumEntropyBridge | Constructor/configuration/selection/telemetry/forensics time; eager fallback expressions; reactive refill and polling timers | Instance wallNow, set/clearTimeout, set/clearInterval; passes same environment to all four helpers |
| EntropyBufferManager | Event defaults, prune/refill/ingest/consume/snapshot timestamps | Instance wallNow |
| EntropyHealthMonitor | Constructor plus success/failure/pending/fallback timestamps | Instance wallNow |
| EntropyExperimentController | Synthetic chunk timestamps; delayed-entropy sleep; private seeded PRNG | Instance wallNow and timer; private PRNG remains private |
| EntropyProviderClient | Fetch timestamps, provider resolution, timeout AbortController, retries/backoff | Instance fetch, wallNow, abortController and set/clearTimeout |

Workbench network and timer capabilities reject by default. A disabled bridge
still evaluates its legacy eager defaults, but those reads now use the owned
virtual clock. Legacy retains the original eager evaluation and call counts.
The entropy test traps all global clocks/RNG/network/timers and also exercises
the provider timeout and delayed-control paths with explicit mock capabilities.

## Intervention scopes and diagnostics

| Intervention | Declared effect | Explicitly retained behavior |
| --- | --- | --- |
| sham | Identity | Complete trajectory and decisions must match exactly |
| block_history_read | Selector's engram lookup, historical action bonuses and adaptation exploration are disabled | Predictor EWC, fast gradients, consolidation and policy credit recording continue |
| suspend_consolidation | Predictor anchor/Fisher/maturation, structural engrams and policy credit updates are suspended | Fast predictor gradients, existing history reads and settlement accounting continue |
| freeze_predictor_weights | Existing FREEZE_WORLD_MODEL behavior freezes predictor weights and its consolidation | Settlement accounting and other memory/policy channels continue |
| erase_declared_history | One-time existing reset of predictor priors/consolidation/commit queues, structural engrams and policy history | Nodes, tower, transition history, last observation, trainingSteps, residualEma and subsequent prediction/learning remain |
| sensor_impulse | Explicit synthetic sensory perturbation | Positive sensitivity control, never labeled sham or historical erasure |

Each intervention records an exact writable-field list and before/after physical
digests. Immediate undeclared nodal/tower/observable mutations are rejected.
The capture's original commitment records remain in provenance even when a
branch retires its pending commitments. IDs are namespaced by capture, protocol
and branch in the experiment chain, not inserted into the live ledger.

Per-tick records include a full dynamic-state digest, full-precision observed
values, actions, actual pre-selection scores and top-two margin, objective
viability components/inputs, fast/consolidated weights, Fisher state, policy
credits, engram count and execution/sensor cursors. Diagnostics execute only in
the owned environment and never query the live memory's mutating recall method.

Historical v1 remains unchanged and separate. Its 420/180/250 CN-3 failure is
not repaired by renaming these interventions, relaxing a threshold or excluding
seeds. No held-out preregistered seeds are evaluated in this delivery.

## Wire schemas and SHA-256 chain

Schema documents are in `config/workbench/schemas/`. Runtime validation also
checks semantic relationships such as complete paired tapes, branch uniqueness,
mandatory first sham, build identity, tick progression and comparison replay.

Each envelope digest hashes a schema-domain-prefixed canonical wire value;
every experimental chain record binds capture digest, protocol digest, branch,
sequence, tick, payload and previous hash. Verification checks ordering, length,
head, record payloads, archive references and recomputed comparisons. Missing or
nonfinite observations are errors, never converted to zero. Re-signing an outer
envelope does not bypass inner-v3, chain, length or comparison checks. These are
integrity hashes, not external signatures or protection against an adversary
who fabricates an entirely new internally consistent dataset and all its hashes.

COMPLETED is an execution status, not scientific success. A valid experiment may
find zero/negative effects or fail the historical hypothesis. Sham inconsistency
is an engineering error and rejects execution. No existing gate semantics change.

## Headless and worker entrypoints

`src/workers/microExperiment.worker.js` accepts data-only run requests. The Node
adapter uses worker_threads and the same handler; it verifies the returned chain
and comparisons. Cancellation/timeout terminates the worker and never returns a
positive execution result. Node workers have a 256 MB old-generation heap cap.
Browser UI/worker packaging is B4: build.cjs, asset sync and sw.js remain intact
in B1-B2. No worker is wired into the live language/control path.

The CLI requires an explicit TEMP output and refuses unregistered/held-out seeds:

```powershell
$out = Join-Path $env:TEMP 'qicn-workbench.json'
node scripts/run-micro-experiment-workbench.mjs --profile=paired_intervention --seed=11 --nodes=24 --warmup=40 --ticks=12 "--out=$out"
```

Omitting `--capture` creates a synthetic headless source. Providing a verified
capture forks that captured state. Neither mode reads future live observations.
The output retains capture, protocol and result together for reproducibility.

## Deferred audit writers

The optional routing expansion for legacy final audits is deferred. Static audit
found fixed writers in subjectivity scaffolding, self-index, continuity,
valuation, reducibility, gate and ecosystem/stack scripts. The stack imports the
protected ecosystem common module. Phenomenal-bridge surfaces also materialize
and remove `_synthetic_verify` under artifacts; later verifiers can invoke
builders when files are absent. QICN_REPORT_DIR does not yet route those complete
nested paths. They are not invoked, modified or reported PASS in this delivery.
Default report paths and the protected common module remain intact.

Delivery commands, observed outputs, environment limitations and complete changed-file status: see WORKBENCH_B1_B2_DELIVERY_AUDIT.md.

## B4 browser extension (supersedes B1-B2 deferral)

useMicroExperimentWorkbench and MicroExperimentWorkbench now capture at a safe committed tick and execute the same handler in a browser ESM Worker. liveCapture receives the native graph only for synchronous data copying; no apply-back exists. Active/polling external entropy rejects without changing the provider. Since browser RNG, wall/performance clocks and hardware cursors cannot be captured, execution explicitly starts a fresh synthetic seed/calendar/sensor context and common future tape, with react_commit setters. Neither profile claims exact continuation of the live trajectory. The initial virtual epoch is 1800000000000, not a live clock read.

Cancellation, unmount, supersession and timeout invalidate outstanding operations and terminate workers. Verified immutable bundles alone reach opt-in v5 evidence. Worker and main bundle share a build signature and preserve canonical class identity across separate/minified bundles (`keepNames: true` + `WeakMap` class registry in `dynamicState.js`); stale/missing worker build metadata rejects. `build.cjs` emits `microExperiment.worker.js`, sync copies it to root, and the cleanup/no-op `sw.js` neither intercepts nor caches its requests. Status and diagnostics label the source tick/hash and copy scope. The real-browser CDP test (`browser-workbench.v1`) and local live-runtime checks pass (`Node v24.6.0`, `internal_support_only`, `external_support_certified = false`); Node `22.x` local parity remains pending.
