# Preregistration Locking And Amendments

Stage3-3 allows local preregistration objects to become lockable without
pretending that an external registry entry already exists.

## Immutable after freeze

The following fields are immutable after local freeze:

- record identifier;
- protocol version;
- primary and secondary endpoints;
- threshold declarations;
- negative-control declarations;
- statistical-shell identifiers;
- blinding class;
- inclusion and exclusion rules;
- source-target pairing requirements, when relevant;
- core provenance hashes.

## Legal amendments

Legal amendments must:

- preserve the frozen parent reference;
- declare an amendment reason;
- declare whether blinding is preserved or intentionally broken;
- carry a new amendment identifier;
- preserve the original frozen record unchanged.

Examples of legal amendments:

- adding a non-substantive clarification appendix;
- adding a predeclared contingency branch that was already reserved;
- documenting a dry-run-only operational correction that does not change
  thresholds, endpoints, controls, or analysis shells.

## Illegal amendments

Illegal amendments include:

- changing thresholds after freeze;
- changing negative controls after freeze;
- changing analysis families after freeze;
- changing inclusion rules after viewing results;
- changing blinding class without an explicit authorized unblinding event;
- rewriting lineage fields to hide drift;
- backfilling an external filing claim.

## Boundary

Amendment architecture is not permission to rewrite evidence after collection.
