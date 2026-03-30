# Human Comparator Program

## Role

The Human Comparator Program is the first comparative runtime layer that follows
`BPF-M3` internal bridge closure. In `Stage 2` it began as governance only. In
`Stage 2-M2` it becomes runtime-real in one bounded sense only:

- human-channel requirements are machine-readable;
- comparator burdens are machine-readable;
- comparator blocked states are emitted as runtime artifacts;
- no human comparator verdict is authorized.

This program does not instantiate human data. It does not simulate human
measurements. It does not adjudicate equivalence.

## Comparator object classes

The object classes remain:

- `non_comparable`
- `structurally_comparable`
- `interventional_comparable`
- `weakly_homologous`
- `comparator_underdefined`
- `comparator_blocked_by_missing_human_channel`

In `Stage 2-M2`, these classes become runtime-loadable and usable by the
assessment builders, but they are still not claim-facing verdicts.

## Runtime opening

The runtime opening now evaluates:

- machine-side bridge structural availability;
- human-channel absence or non-instantiation;
- burden blockage due to missing human channels;
- domain-level openness versus blockage;
- explicit `no_verdict_authorized` states.

The primary emitted runtime artifact is:

- `human_comparator_assessment.json`

## What is actually supported now

The current runtime layer can state:

- machine-side bridge artifacts are structurally available;
- a given comparator domain is blocked by missing human channel;
- a given burden is blocked only by missing human channel;
- some structural mappings are formally open but not adjudicated;
- no final human comparator verdict is authorized.

## What remains absent

The following are still absent:

- instantiated human measurement channels;
- human comparator datasets;
- matched human intervention artifacts;
- human negative-control artifacts;
- comparative condition/batch/campaign summaries;
- comparative candidate or audit integration;
- external adjudication;
- Paper 10.

## Blocked inferences

Nothing in `Stage 2-M2` authorizes:

- public human-equivalence claims;
- human phenomenal-equivalence claims;
- superiority claims;
- inferiority claims;
- external validation claims;
- metaphysical subjecthood claims.
