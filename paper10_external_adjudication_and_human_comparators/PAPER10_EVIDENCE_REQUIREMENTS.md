# Paper 10 Evidence Requirements

## Human comparator result insertion

Requires all of:

- frozen preregistration record;
- typed human comparator dataset;
- channel-specific negative-control bundle;
- declared statistical shell output;
- dataset admissibility record;
- reviewer-selection package;
- reviewer report family.

## Matched intervention result insertion

Requires all of:

- matched intervention dataset;
- matched negative-control dataset;
- frozen intervention family declaration;
- timing and branch accounting references;
- effect-shell output;
- failure and deviation log.

## External adjudication result insertion

Requires all of:

- independent reviewer reports;
- reviewer conflict disclosures;
- blinding and unblinding log;
- adjudicator decision record;
- reproducibility package manifest;
- external failure and inconclusive pathways resolved or explicitly reported.

## Transport-sensitive comparison insertion

Requires all of:

- source-target pairing manifest;
- cross-substrate lineage map;
- schema compatibility proof;
- axis-specific error-budget package;
- transport negative controls;
- adjudicator layer.

## Dry-run boundary

Dry-run opening is allowed to validate:

- manifest structure;
- freeze binding structure;
- instantiated-empty record structure;
- candidate-pool and assignment-stub structure;
- blinding route structure;
- empty bundle structure;
- collection session schema structure;
- rehearsal event-log schema structure.

Dry-run opening is not allowed to substitute for:

- human data collection;
- reviewer decision records;
- adjudicator decision records;
- result-bearing statistics;
- external validation language.

## Instantiated-empty boundary

Instantiated-empty records are allowed to validate:

- field grammar;
- null and empty placeholder policy;
- provenance slot presence;
- freeze-capable local structure;
- evidence insertion routes.

Instantiated-empty records are not allowed to substitute for:

- external filing;
- real reviewer or adjudicator identity;
- collection events;
- evidence-bearing logs;
- populated decision records.

## Live-but-unpopulated boundary

Live-but-unpopulated artifacts are allowed to validate:

- session-zero routing;
- live manifest routing;
- empty dataset declaration;
- empty decision-stub grammar;
- empty evidence-register grammar;
- pre-collection gate wiring.

Live-but-unpopulated artifacts are not allowed to substitute for:

- collection-start events;
- populated datasets;
- evidential logs;
- decision records;
- adjudication output.

## Runtime-health boundary

Runtime-health audit is allowed to validate:

- dependency-install behavior;
- build behavior;
- test behavior;
- bounded local-start behavior;
- verifier-chain behavior.

Runtime-health audit is not allowed to substitute for:

- collection-start events;
- populated datasets;
- reviewer action;
- adjudication;
- result-bearing evidence.

## Clean-room reproducibility boundary

Clean-room reproducibility is allowed to validate:

- bounded rebuildability;
- reinstallability;
- source-driven artifact regeneration;
- reproducibility of Stage3-6 gates.

Clean-room reproducibility is not allowed to substitute for:

- admissible evidence;
- human comparator data;
- reviewer or adjudicator decisions;
- Paper 10 final authorization.

## Collection-start boundary

Collection-start is not implied by:

- session-zero readiness;
- pre-collection gate passage;
- live artifact instantiation;
- controlled execution opening.

Collection-start requires:

- explicit operator authorization;
- an authorized collection-start event;
- contamination-free session start;
- the first populated collection-log event.

## First admissible collection opening boundary

Stage3-7 first-collection opening is allowed to validate:

- collection-start command grammar;
- operator-authorization grammar;
- runtime-health passage;
- clean-room reproducibility passage;
- preservation of pre-evidential state.

Stage3-7 first-collection opening is not allowed to substitute for:

- executed collection start;
- dataset population;
- evidence generation;
- adjudication output.

## Decision-record boundary

Decision-record population requires:

- real reviewer or adjudicator action;
- admissible evidence context;
- provenance-linked decision entries.

The live decision-record stub is not allowed to substitute for:

- reviewer decisions;
- adjudicator decisions;
- adjudication outcomes.

## Invalid substitutes

- internal runtime artifacts alone;
- Paper 9 publication alone;
- release inclusion alone;
- synthetic human data;
- LLM-generated "human" reports;
- undocumented manual judgments;
- post-hoc threshold selection;
- cherry-picked examples.
