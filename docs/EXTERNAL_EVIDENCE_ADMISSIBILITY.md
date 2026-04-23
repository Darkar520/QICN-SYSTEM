# External Evidence Admissibility

## Purpose

This document defines which evidence classes may later count as admissible in a
real external adjudication program and which substitutes are invalid even if
they look superficially persuasive.

At `Stage3-0`, these criteria are defined but not exercised.

## Admissible evidence classes

- `independent_reviewer_report`
- `preregistered_human_comparator_dataset`
- `matched_intervention_dataset`
- `negative_control_dataset`
- `replication_log`
- `statistical_analysis_report`
- `reviewer_conflict_of_interest_statement`
- `reproducibility_package`
- `external_failure_report`
- `external_inconclusive_report`

## Required admissibility dimensions

Every admissible evidence class must specify:

- provenance;
- reviewer or collector independence;
- typed artifact references;
- negative-control requirements;
- statistical properties;
- invalid substitutes;
- non-implications.

## Invalid substitutes

The following never count as admissible external evidence:

- internal runtime artifacts alone;
- self-generated reviewer notes;
- synthetic human data;
- LLM-generated "human" reports;
- undocumented manual judgments;
- unblinded reviewer impressions;
- post-hoc threshold selection;
- cherry-picked examples;
- release inclusion alone;
- Paper 9 publication alone.

## Boundary

Admissibility criteria are not evidence. Evidence class definitions are not
execution. Execution is not verdict. Verdict is not public metaphysical
closure.
