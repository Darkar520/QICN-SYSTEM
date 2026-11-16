# Optional System B / language realization v5

claim_scope: optional_internal_language_verification  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: source-bound factual atoms and explicitly open
proposals. No external validation, phenomenal certification, philosophical
truth certificate, run verdict or batch enforcement is produced.

## Activation

`prepareTurn({ ..., contract: 'evidential' })` enables v5. Explicit aliases
`v5` and `qicn.language_realization.v5` also work. Existing `free` (v4) and
`verified` (v3) branches are unchanged. Chat continues to request `free`;
the historical helper default remains `verified`. No UI selection, provider
transport or B4 build/asset-sync/service-worker authority was changed.

The preregistration JSON stays frozen. Its `not_recorded` field is a checkpoint;
the current implementation inventory is IMPLEMENTATION_STATUS.md.

## Responsibilities

| Module | Responsibility |
| --- | --- |
| claimGrammar | Strict data-only JSON, complete binding, four parts, unique IDs and bounded sizes. Unknown/self-verification fields reject. |
| factualVerifier | Full snapshot SHA/schema/tick/config hash, structural/algebraic consistency, exact serialized decimal/rational comparisons, signs, closed catalog and operation scopes, verified ledger events. |
| evidenceRegistry | Verify optional B2 capture/protocol/result bundles plus inner v3 digest/header; retain detached immutable provenance; no executor imports or calls. |
| reasoningPlan | Give Gemini complete local authority and the question, without a closed question/answer catalog. |
| epistemicPolicy | Insert both epistemic poles locally; quarantine unbound factual surfaces in open prose, irrespective of negation/conditionals. |
| realization | Verify all atoms, insert authoritative fact spans locally, retain open proposals, enforce coverage/dependencies, bounded correction or honest failure. |

`propositions.evidentialMetricCatalog` is separate from existing proposition
construction. `definitionCatalog` adds separate v5 operation and closed-fact
exports without rewriting old text. Operations require the exact
module/operation/scope tuple with an implementation anchor; inventory membership
alone grants no operation.

The B2 verifier/comparison algorithms were moved, unchanged, into
`resultVerifier.js` and `trajectoryComparison.js`. Existing runner/metrics
exports remain available. The registry's transitive imports no longer pull in
restore, driver, persistence codecs, simulation classes or workers. The
compatibility test traverses this graph.

## Data contract

The envelope has only `schema`, `snapshot: {digest,tick}`, optional
`frame: OPEN_FRAME`, `atoms` and `parts`. The schema is
`qicn.language_realization.v5`; digest must contain all 64 hex characters.
`atoms` contains 1..64 objects; output is bounded to 48000 characters.
Every atom carries `id`, `type` and `binding: {digest,tick}`. Binding and
factual checking apply even to unused atoms, with no OPEN_FRAME bypass.

| Type | Fields beyond id/type/binding | Authority |
| --- | --- | --- |
| metric_value | ref; optional asserted/sign | Registered snapshot reading, parameter or measured rational value. |
| analytical_bound | ref; optional asserted | Registered bound, never retyped as a measurement/error. |
| comparison | left/right refs, operator | Exact decimal/rational comparison; CCC/threshold uses the unrounded predicate and config. |
| algebraic_relation | relation; optional asserted | Registered relation with finite operands and explicit serialization tolerance. |
| module_operation | module, operation, scope | Exact operation authority tuple; availability is not observed causal efficacy. |
| catalog_statement | key; optional asserted | Closed v5 catalog, including the qualified historical CN-3=false checkpoint. |
| ledger_event | ledgerDigest, eventHash, eventTick, eventType | Verified full ledger record, exact event hash/type/tick and independent ledger binding; future events reject. |
| measured_effect | resultDigest, branchId, measure; optional asserted/sign | Verified B2 comparisons/chain, labelled as an isolated past copy and interval, never current live evidence or external support. |

`asserted` is untrusted. Omitting it never supplies a value: resolution and
insertion still use the local source. Question numbers are not evidence.
Comparisons of serialized decimals/rationals use integer cross-products, not
eval, parseFloat or rounded equality. Measured zero and a positive analytical
bound remain different sources and types. Snapshot relations check body balance,
L1, world contrast, CCC-X_N and active fraction alongside the existing structural
verifier. Ledger summaries alone cannot authorize event claims.

Spans have only these forms:

- `fact`: `{id,kind:'fact',atom}`. No model text; the complete sentence comes
  from a verified atom, including values/source/scope.
- `open`: `{id,kind:'open',argumentType,text,premises,dependsOn?}`. Types:
  counterfactual_assumption, open_hypothesis, rival_mechanism, proposed_falsifier.
  Premises reference valid atoms; dependencies reference earlier valid spans.
- `absence`: `{id,kind:'absence'}`, solely in the intervention part when no
  non-sham verified intervention is available.
- `scope`: `{id,kind:'scope'}`, exactly once in the epistemic part. Both poles
  and external_support_certified=false are rendered locally.

All four parts are mandatory: measured_observation, applicable_model,
intervention_or_explicit_absence, symmetric_epistemic_scope. Observation needs
a state metric atom (tick/config alone is insufficient); model needs a
registered mechanism, model catalog statement or relation. A generic scope
statement cannot substitute for an applicable model.
A bound or open proposal cannot substitute for the measured observation.

## Gemini and open philosophy

Gemini authors the argument itself: new hypotheses, rivals, counterfactual
assumptions, objections and falsifiers. It is not limited to catalog answers.
Tests publish distinct novel responses verbatim for unfamiliar questions.

Facts are locally authoritative. Open spans remain quoted **proposals of
Gemini**, never certified philosophical truth. Runtime figures, operations and
source assertions belong in fact spans. The prose quarantine rejects raw
numeric/module/metric/runtime/certification surfaces even under negation or
conditional language. It is independent of fact verification; its labels never
authorize an atom. Model-authored `verified` flags or unknown fields reject.

This quarantine is deliberately conservative and can reject harmless wording;
correction can move a fact into an atom or rephrase an abstract proposal. It is
a bounded surface check, not exhaustive semantic verification or a general
natural-language theorem prover. Do not treat atom sidecars, the v5 route or
model annotations as certification of arbitrary prose, logical entailment,
external-domain assertions or philosophical conclusions. The supported factual
assertion channel is the typed grammar. Residual arbitrary-prose coverage is
partial_runtime_path and appears in the guarantee note/inventory.

## B2 evidence, correction and dynamics

`workbenchEvidence` accepts at most four `{capture,protocol,result}` bundles.
Invalid bundles reject preparation instead of becoming silent absence. Checks
include B2 envelopes, links/payloads/ticks/lengths/comparison replay and inner-v3
SHA/schema/build/node/tick. WeakSet branding prevents a model-tagged JSON
registry from becoming authority. Caller mutations cannot change detached data.
Sham-only records leave intervention availability `not_recorded`; zero/negative
effects of a genuine intervention remain available. Original capture/protocol/
result hashes, build and source/evaluation ticks stay in provenance. Integrity
hashes do not authenticate an external campaign or defeat fabrication of a
wholly new internally consistent archive.

At most two attempts are checked. Strict publication needs every check.
Graceful removes bad facts, arguments with bad premises and their transitive
dependents, then requires all four parts and unchanged symmetric scope. Invalid
grammar, binding or scope cannot be repaired by dropping sentences. Failed
publication returns explicit failure and a separately labelled local reading;
no replacement philosophical argument is fabricated.

The six evidential modules receive no live core, control/ledger/storage writer,
RNG, clock or worker execution capability. The orchestration adapter only reads
plain data from the legacy ledger argument (or accepts explicit ledgerRecord);
it calls none of that ledger's methods. v5 controlProposal is null. Expanded B2
invariance compares complete state digests, actions, numeric differences and
RNG/clock cursors through v5 valid/rejected/corrected/graceful turns. Historical
v1, legacy recomputation and persistence/snapshot/ledger hashes stay intact.

Real-provider Gemini publication rate and argument quality remain not_recorded:
engineering tests use model-shaped responses, not a provider campaign. UI and
browser/worker packaging remain B4. Raw verification and file inventory are in
LANGUAGE_SYSTEM_B_B3_DELIVERY_AUDIT.md.
