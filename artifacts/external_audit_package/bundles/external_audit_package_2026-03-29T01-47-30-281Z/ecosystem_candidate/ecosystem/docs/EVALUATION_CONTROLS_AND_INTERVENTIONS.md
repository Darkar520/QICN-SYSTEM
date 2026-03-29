# Evaluation Controls And Interventions

## Condition roles in this phase

- baseline condition
  - `baseline`
- control conditions
  - `replay`
  - `shuffled`
  - `prng_only`
- intervention conditions
  - `delayed_entropy`
  - `dropout`
- negative-control-like usage
  - `prng_only` and `shuffled` act as source-surface tension controls

## What each condition manipulates

- `baseline`
  - manipulates nothing intentionally
  - preserves upstream/custom source path
- `replay`
  - manipulates source chronology by replaying a preserved sequence
  - preserves sequence values and identity of source fixture
- `shuffled`
  - manipulates temporal ordering of a preserved sequence
  - preserves the value multiset under deterministic shuffle
- `prng_only`
  - manipulates source class by replacing provider input with seeded PRNG output
  - preserves deterministic replayability by seed
- `delayed_entropy`
  - manipulates delivery latency only
  - preserves source pathway and sample content
- `dropout`
  - manipulates delivery availability only
  - preserves the upstream attempt path while forcing loss at delivery

## What current controls do not support

- no direct causal manipulation of `omega`, `ccc`, `pmia`, or `stasis_index`
- no counterfactual intervention over the frozen theoretical corpus
- no closed-loop causal attribution across layers

## Interpretation boundary

Controls and interventions in this phase stress the entropy-delivery surface and
its governed artifacts. They do not validate the corpus or close causal claims.
