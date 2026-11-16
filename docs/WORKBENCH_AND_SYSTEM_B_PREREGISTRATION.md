# Workbench and System B: staged engineering preregistration

claim_scope: internal_engineering_and_optional_language_verification  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: this is an internal implementation preregistration. It
does not establish external validation, phenomenal consciousness, run-level
admissibility, batch enforcement, or final claim closure.

## Frozen starting point and delivery B0

The source baseline is `main` at
`4142610792c51a171db3b965ff314646fa5535c1`. Machine-readable protocols live in
`config/workbench/preregister.v1.json` and
`config/language/system-b-preregister.v1.json`. Protocols may only change with an
explicit version/rationale before their evaluation; diagnostic findings must not
be used to retroactively change acceptance thresholds.

B0 implements opt-in report routing and detached observational snapshots. It
does not implement the future Workbench or optional v5 language contract. Those
remain `not_recorded` until their separate delivery and checks.

## Opt-in operational compatibility

`scripts/lib/report-output-path.cjs` resolves destinations without filesystem
side effects. Precedence is explicit API `outputPath` / CLI `--out`, then
`QICN_REPORT_DIR`, then the exact historical destination. Existing `--output`
(readiness/environment) and `--json-file` (bridge) aliases remain available.
Empty or conflicting CLI output paths are rejected.

Without opt-in, these defaults remain unchanged:

| Producer | Default destination |
| --- | --- |
| source-of-truth | `artifacts/runtime_source_of_truth_check.json` |
| operational readiness | `artifacts/operational_readiness_manifest.json` |
| environment contract | `artifacts/operational_readiness/environment_contract_manifest.json` |
| operational smoke | `artifacts/operational_smoke_manifest.json` |
| cognitive preregistration | `docs/cognitive_emergence_prereg.v1.json` |
| bridge drift | No report file unless requested |

`QICN_REPORT_DIR` mirrors those project-relative paths under the requested
directory. An explicitly relocated readiness manifest also relocates its child
environment manifest beside it, under `operational_readiness/`. Exported APIs
do not parse their host process's CLI arguments. Package scripts, callers and
pre-commit hooks retain their existing defaults.

`QICN_BRIDGE_LOCAL_ONLY=1` (exactly `1`), or `--local-only`, prevents resolution,
existence checks and reads of upstream. The report has null upstream root and
presence, `upstream_status: not_recorded`, and `sync_status: not_recorded`.
`counts.in_sync` is not incremented by local checks; `local_intact` records the
local successes. `--strict` cannot pass with upstream unchecked. The normal
upstream behavior and report shape remain unchanged without opt-in.

During this project, every executed report writer must use a TEMP destination.
Legacy defaults are compatibility contracts, not permission to use them here.
Some final audit commands contain additional nested writers; these must be
audited/routed before execution, never run and cleaned up afterwards.

## Observational integrity

`captureRuntimeSnapshot` clones `constructive_cuts` before freezing. The tower
capture API also clones telemetry before freezing. The clone preserves nested
enumerable values, undefined properties and graph sharing, retaining the exact
existing `stableStringify` and SHA-256 semantics. It does not freeze, rewrite or
detach any live object. Tests compare descriptors, identities and extensibility
of the complete source graph, alongside pre-fix golden digests.

Persistence `qicn.dynamic_state.v3`, snapshot schema v3, ledger hash-chain rules,
prediction commitment digests and legacy `RECOMPUTED_EACH_TICK` remain intact.

## B1 and B2: isolated execution

Extract one common cycle driver with explicit configuration, RNG, clock,
measurement clock, sensor, entropy, logging and storage capabilities. Preserve
legacy call order and formulas. Audit constructors and helpers reachable through
`QuantumEntropyBridge`, `EntropyBufferManager`, `EntropyHealthMonitor`,
`EntropyExperimentController` and `EntropyProviderClient`, including network,
timers and eager default expressions. Disabled entropy must not accidentally
read a real clock in Workbench mode.

Capture at a completed tick, restore verified v3 data into new instances inside
a worker, synchronize controller/core aliases, and reject any unrestored field.
No mutable shared refs, live callback capabilities, shared-memory buffers or
apply-back operation are allowed. Later host changes cannot enter a branch.
Worker branches own their config, RNG streams, virtual clocks and input tape.
Never describe their synthetic future as the real future of the live session.

Use distinct legacy-compatibility and paired-intervention execution profiles.
Common future inputs must include sensory cursor/calendar, not only RNG seeds.
Each historical intervention declares its writable fields. Preserve original
captures and commitments in provenance instead of rewriting their hashes.
Engineering correctness does not require a positive experimental effect.

Keep historical v1 unchanged: at 420/180/250 and seeds 11,23,37,41,53, Stage 0
reproduced viability gain in 4/5 seeds but CN-3 advantage and action divergence
in only 3/5. Thus CN-3 and allPreregisteredCriteriaPass remain false. A new
protocol needs a new identity; held-out seeds are 67,79,97,101,113 and must not be
inspected before its freeze.

## B3: Gemini, factual verification and open philosophical reasoning

Optional v5 has two independent checks. Factual verification checks full digest,
tick, values, signs, comparisons, algebra, closed catalog facts, ledger events
and module-to-operation attribution. Existence of a module is insufficient.
OPEN_FRAME and epistemic qualifiers never skip a factual check.

`reasoningPlan` asks Gemini to propose the argument itself: new hypotheses,
rival mechanisms, counterfactual assumptions, objections and falsifiable tests
are not restricted to a catalog of questions or closed answer templates. Each
answer organizes measured observation, applicable model, available intervention
or explicit absence, and symmetric epistemic scope. Missing evidence remains
`not_recorded`; mechanism availability alone is not an observed causal effect.

`realization` permits Gemini-authored philosophical prose and argument structure
while binding every factual span to independently verified typed atoms. Local
code inserts authoritative values and checks attribution before publication.
Gemini's own labels are untrusted input, never proof that its prose is factual.
Unbound factual assertions must be rejected or revised, including those inside
speculation. Open arguments are marked as open arguments, not deterministic
logical or philosophical truth. Never promise exhaustive semantic validation of
arbitrary prose merely because its sidecar JSON passed.

Graceful publication must preserve premise dependencies and epistemic scope.
An uncertain philosophical conclusion cannot repair a false numeric premise.
An adversarial test must show that a novel philosophical question can receive a
new substantive argument without a pre-existing answer template. Both positive
phenomenal certification and absolute unsupported impossibility remain blocked.
The API default and existing v2/v3/v4 paths remain intact (v3:87, v4:95 cases).

## B4 and final acceptance

Only read-only capture, worker requests and result display enter the UI. If the
worker is bundled, update `build.cjs` and `scripts/sync-netlify-assets.cjs` and
review `sw.js` together. Every phase adding src modules regenerates the module
inventory and runs `node scripts/build-module-inventory.mjs --check`.
The check normalizes CRLF to LF so an unchanged Windows autocrlf checkout is
not falsely reported as a stale inventory; module names and generation remain
unchanged.

Mandatory controls and final commands are enumerated in the machine-readable
protocols. In particular: sham identity; both leakage directions; reference and
descriptor changes; RNG/clock traps; cn4 zero difference; observer trajectory
invariance; tampering; stale evidence; cancellation; speculative/factual
collisions; and a positive sensitivity control. Compare full trajectory lengths,
ticks and actions; never mask missing/nonfinite values as zero.

Final acceptance also includes operational readiness, subjectivity stack,
phenomenal-bridge final audit, comparative-program closure and module inventory.
No passing engineering check is external validation. No new experiment result
is a primary record of the live runtime, claim_projection, or existing gate_result.

## Evidence anchors and current delivery status

| Area | implementation_status | Verification anchor |
| --- | --- | --- |
| Opt-in output resolution and legacy bridge parity | implemented_tested | `tests/report-output-policy.v1.test.cjs` |
| Observational clone and unchanged snapshot digests | implemented_tested | `tests/runtime-snapshot-observational.v1.test.mjs` |
| Workbench headless/worker execution | implemented_tested | B1-B2 delivery; see WORKBENCH_EXECUTION_CONTRACT.md |
| Optional System B/v5 factual/evidential contract | implemented_tested | B3; LANGUAGE_SYSTEM_B_CONTRACT_V5.md and the three new language test anchors |
| Browser UI integration / worker packaging | not_recorded | Separate B4 implementation required |

The reporting tests exercise actual TEMP outputs and synthetic no-opt-in/default
paths without writing canonical reports or probing an external source tree.

## B0 verification checkpoint

The B0 checks pass for report routing (including the readiness child manifest),
no-opt-in bridge report parity, zero local-only upstream probes, observational
graph isolation and the two unchanged pre-fix golden SHA-256 digests. The
preregistration test also freezes the historical v1 script and the v2/v3/v4
batteries against the starting commit. Module inventory, lint, source-of-truth,
descriptor registry, claim boundaries, output policies, operational readiness,
operational smoke, tower math, local-only bridge and comparative-program closure
pass. Scoreboard inspect mode reports 7/7 dimensions; it is not a substitute for
the independent test/build commands.

The full test invocation completed 174/175 modules successfully plus the
headless cycle guard. Its failing module, `local-static-boundary.test.js`, was
reproduced separately: the execution environment denies loopback fetch with
`connect EACCES 127.0.0.1`. The test and static server were not changed or skipped.
The additional preregistration test was added after that suite's collection and
passed separately. This environment runs Node 24.6.0; the canonical repository
engine remains 22.x. Do not label the full suite or canonical-Node run PASS.

The unmodified historical 420/180/250 experiment was rerun with its report in
TEMP: action divergence 5/5, anchor shift 5/5, viability gain 4/5, CN-3 false,
CN-4 true and cn4_maxAbsDiff=0. This is the expected preserved negative outcome.

Final subjectivity-stack and phenomenal-bridge-final-audit execution still needs
safe routing for their nested fixed-path writers. The stack imports the
protected ecosystem common module and its checks regenerate subjectivity
reports; the bridge suite writes its synthetic verification reports under the
repository. Their current entrypoints must not be run with an assumed --out
flag or falsely reported as passed. Keep those final checks pending until
their complete execution paths can respect TEMP-only reports and the forbidden
surfaces, preserving all default contracts.

## B1-B2 delivery extension

The approved B0 checkpoint is 454dcb9a5cd5c4a7728b211cc0d438b80258922e on codex/workbench-system-b. The user independently verified the full 176-test B0 suite outside the sandbox with EXIT=0; the loopback restriction was environmental and its test remains intact. B1-B2 implements the common imperative driver, owned entropy capabilities, detached v3 restore and independent experimental records. The original preregistration JSON remains frozen as the starting protocol; its not_recorded field is not the current implementation inventory. Current implementation inventory is IMPLEMENTATION_STATUS.md.

Detailed wire schemas, intervention scopes, test anchors, disabled-provider capture boundary, runtime setter policies and deferred audit writers are recorded in WORKBENCH_EXECUTION_CONTRACT.md. No B3/v5 language implementation or B4 browser packaging is included. Main and git metadata are not written by this delivery.

B1-B2 verification results and final file inventory are recorded in WORKBENCH_B1_B2_DELIVERY_AUDIT.md; acceptance remains subject to the explicit environment and deferred-writer limitations recorded there.

## B3 delivery extension

Checkpoint: codex/workbench-system-b at 5dfddd5b2b101865621c4d10f8177ff260b8813b.
The optional evidential/v5 contract separates locally checked factual atoms
from Gemini-authored open proposals, binds the complete digest and tick, and
consumes verified detached B2 records or records not_recorded. Existing
v2/v3/v4 paths and defaults remain intact. The guarantee does not certify
arbitrary prose or philosophical conclusions. Detailed authority, limits and
verification are in LANGUAGE_SYSTEM_B_CONTRACT_V5.md and
LANGUAGE_SYSTEM_B_B3_DELIVERY_AUDIT.md. Machine preregistration remains frozen;
current inventory is IMPLEMENTATION_STATUS.md. This delivery stops before B4
and writes no git metadata.
