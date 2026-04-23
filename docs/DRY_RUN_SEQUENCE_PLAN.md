# Dry-Run Sequence Plan

The dry-run sequence is ordered and non-evidential:

1. check provenance closure state;
2. check local frozen record template;
3. check reviewer and adjudicator candidate pools;
4. check assignment stubs and blinding stub;
5. check execution session template and collection-log schema;
6. check rehearsal event log schema;
7. confirm reset-policy completeness.

Failure at any step is operational and governance-facing only. It is not an
adjudication outcome.
