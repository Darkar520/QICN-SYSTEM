# Subjectivity Interventions And Negative Controls

This document records the intervention family planned for the Subjectivity
Runtime Layer and the minimal valuation/intervention controls already executed
in SRT-3.

## Planned intervention family

- `self_nonself_swap`
- `ownership_lesion`
- `continuity_break`
- `perspective_flattening`
- `valuation_inversion`
- `autobiographical_remap`
- `clone_competition`
- `memory_transplant`
- `self_permutation`
- `cross_substrate_remap`

## Minimum protocol condition set

- `baseline_subjectivity_enabled`
- `ownership_lesion`
- `continuity_break`
- `self_nonself_swap`
- `perspective_flattening`
- `valuation_inversion`
- `weak_rival_reconstruction`

## Negative controls

Implemented in SRT-3 verification:

- `label_only_swap_control`
- `bookkeeping_control`
- `memory_copy_without_continuity_control`
- `perspective_neutral_factorization_control`
- `reward_aliasing_control`
- `nonselective_damage_control`

Still planned for later blocks:

- `memory_rich_non_owning_control`
- `policy_retuned_control`
- `narrative_preserving_control`

## Role of the family

- interventions are meant to test selective degradation once the corresponding coordinates exist
- negative controls are meant to block flattering misreads
- weak-rival reconstruction is meant to support the irreducibility burden in later blocks

## SRT-3 boundary

In SRT-3:

- no full intervention family is executed
- no comparator is executed
- only a minimal valuation-oriented harness is executed
- `self_nonself_valuation_inversion` and `risk_consequence_reassignment` are the only executed perturbations
- no intervention artifact is claim evidence

These names exist now so that later blocks do not invent incompatible wording or
implicit scope.
