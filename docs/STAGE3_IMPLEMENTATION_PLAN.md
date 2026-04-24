# Stage3 Implementation Plan

## Stage decomposition

- `Stage3-RF`: bounded readiness fulfillment and opening gate.
- `Stage3-0`: external adjudication architecture, admissibility grammar, human
  comparator protocol scaffold, and Paper 10 scaffold.
- `Stage3-1`: human-channel instantiation contracts, matched-intervention and
  negative-control dataset contracts, and preregistration templates.
- `Stage3-2`: reviewer/adjudicator independence architecture,
  execution-readiness logic, and protocol-grade Paper 10 hardening.
- `Stage3-3`: preregistration freeze architecture, reviewer-selection
  packaging, adjudicator-assignment packaging, and execution-pilot packaging.
- `Stage3-4`: bounded execution-pilot dry-run opening under strict
  non-evidential and non-adjudicative policy.
- `Stage3-4B`: provenance closure, lineage reconciliation, and instantiated-empty
  record instantiation without evidence population.
- `Stage3-5`: rehearsal-kit formalization, dry-run sequence grammar, and
  rehearsal-ready gating.
- `Stage3-6`: controlled execution opening, session-zero gating,
  pre-collection admissibility, live-but-unpopulated artifacts, and first
  admissible-collection unlock mapping.
- later execution-era work: real preregistration lock instantiation, reviewer
  selection instantiation, data collection, admissibility assessment, and
  adjudication workflows.

## What Stage3-0 implements

- governance docs;
- machine-readable manifests;
- runtime-accessible registries;
- schema placeholders for future adjudication artifacts;
- internal-only Stage3-0 artifacts;
- a scaffold-only Paper 10 source tree.

## What Stage3-0 does not implement

- external reviewer assignment;
- preregistration execution;
- human data collection;
- matched human intervention campaigns;
- statistical outcome analysis on real human data;
- adjudication verdicts;
- release promotion of Paper 10.

## What Stage3-1 implements

- per-channel human comparator instantiation contracts;
- channel-level preregistration templates;
- matched-intervention dataset contracts;
- negative-control dataset contracts;
- richer readiness taxonomy for collection-preparatory surfaces.

## What Stage3-1 does not implement

- frozen preregistration records;
- actual human data collection;
- admissible datasets;
- execution-era statistics;
- result-bearing Paper 10 sections.

## What Stage3-2 implements

- reviewer and adjudicator independence criteria;
- conflict and blinding policy layers;
- execution-readiness runtime assessments;
- bounded Stage3-2 internal artifacts;
- protocol-grade hardening of Paper 10.

## What Stage3-2 does not implement

- reviewer selection execution;
- adjudicator assignment execution;
- external adjudication execution;
- adjudication verdicts;
- public release promotion of Paper 10;
- any claim-bearing closure beyond protocol readiness.

## What Stage3-3 implements

- frozen preregistration schema and policy layers;
- local lock-manifest architecture;
- reviewer candidate and adjudicator candidate schemas;
- reviewer-selection and adjudicator-assignment workflow packages;
- blinding assignment package;
- execution-pilot package, session, and reproducibility skeletons.

## What Stage3-3 does not implement

- actual frozen external filing;
- actual reviewer selection;
- actual adjudicator assignment;
- populated datasets;
- execution-era evidence;
- adjudication verdicts.

## What Stage3-4 implements

- a bounded dry-run opening gate;
- dry-run policy;
- dry-run manifest and status artifacts.

## What Stage3-4 does not implement

- evidential collection;
- reviewer decisions;
- adjudicator decisions;
- result-bearing statistics;
- Paper 10 final authorization.

## What Stage3-4B implements

- provenance closure assessment and lineage reconciliation;
- instantiated-empty local frozen preregistration records;
- instantiated-empty reviewer/adjudicator candidate pool templates;
- instantiated-empty assignment and blinding stubs;
- empty execution-session, collection-log, decision-record, reproducibility, and evidence-insertion surfaces.

## What Stage3-4B does not implement

- externally filed preregistration;
- populated datasets;
- real reviewer or adjudicator identities;
- real assignment events;
- evidential or adjudicative artifacts.

## What Stage3-5 implements

- execution-pilot rehearsal kit;
- dry-run sequence plan;
- rehearsal event log grammar;
- rehearsal failure and reset policy;
- rehearsal-ready gating and unlock-map semantics.

## What Stage3-5 does not implement

- real collection sessions;
- populated evidence bundles;
- reviewer decisions;
- adjudicator decisions;
- result-bearing Paper 10 sections;
- public-release promotion.

## What Stage3-6 implements

- controlled execution opening policy;
- session-zero manifest and gate;
- pre-collection admissibility and contamination checks;
- live-but-unpopulated collection, dataset, reproducibility, decision, and
  evidence-register artifacts;
- first admissible collection unlock-map semantics.

## What Stage3-6 does not implement

- collection-start execution;
- populated datasets;
- reviewer or adjudicator decisions;
- evidential or adjudicative artifacts;
- result-bearing Paper 10 sections;
- public-release promotion.

## What Stage3-6B implements

- runtime-health audit semantics;
- clean-room reproducibility audit semantics;
- local path-leakage audit semantics;
- artifact-regeneration audit semantics;
- conditional Stage3-7 follow-on gating.

## What Stage3-6B does not implement

- collection-start execution;
- populated datasets;
- evidence generation;
- reviewer or adjudicator decisions;
- adjudication results;
- result-bearing Paper 10 sections.

## What Stage3-7 implements

- first-admissible-collection opening criteria;
- collection-start command grammar;
- operator-authorization grammar;
- criteria-only Stage3-7 opening gate and manifest.

## What Stage3-7 does not implement

- executed collection start;
- populated collection logs;
- populated datasets;
- evidence generation;
- reviewer or adjudicator decisions;
- adjudication results;
- result-bearing Paper 10 sections;
- public-release promotion.
