# Preregistration Freeze Policy

This document defines the Stage3-3 local freeze architecture for preregistration
records. It is a governance and packaging surface only. It is not an external
filing record.

## Freeze intent

The freeze layer upgrades the program from template-ready preregistration to a
locally lockable preregistration object family with:

- immutable field definitions;
- amendment pathways;
- blinding bindings;
- threshold freezing;
- negative-control freezing;
- statistical-shell freezing; and
- provenance-chain requirements.

## What counts as frozen locally

A preregistration record counts as locally frozen only if all of the following
are true:

- a record conforms to `docs/frozen_preregistration_record_schema.v1.json`;
- the lock metadata conforms to `docs/preregistration_lock_manifest.v1.json`;
- immutable fields are populated;
- threshold and negative-control declarations are bound;
- blinding class is bound;
- analysis-shell identifiers are bound;
- the lineage chain identifies the local repo state and document hashes;
- the record is marked `local_only` and `not_externally_filed`.

## What does not count

The following do not count as a frozen preregistration record:

- an unfrozen template;
- a partially filled draft;
- a local lock file without a bound record object;
- a record whose thresholds remain editable;
- a record that says or implies external filing when no filing exists.

## Interpretation boundary

Local freeze readiness is not external filing, not data collection, not
reviewer selection, and not adjudication.
