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
