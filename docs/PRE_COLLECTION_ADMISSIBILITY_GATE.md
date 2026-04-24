# Pre-Collection Admissibility Gate

The pre-collection admissibility gate determines whether the system may enter a
controlled `collection_openable_under_controls` state while remaining
pre-evidential.

## Gate logic

The gate may pass only if:

- session-zero is ready;
- live artifacts are instantiated and unpopulated;
- dataset manifests are empty;
- live collection log is empty;
- no collection-start marker exists;
- no evidence-generation marker exists;
- no contamination marker exists;
- no reviewer or adjudicator decision exists;
- abort and invalidation controls are present;
- operator checklist is complete.

## Gate boundary

Passing this gate does not start collection. It only allows a later, separate,
operator-controlled collection-start transition.
