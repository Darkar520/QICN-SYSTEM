# Live-But-Unpopulated Artifact Policy

Stage3-6 introduces live execution-facing artifacts whose only honest state is
`live-but-unpopulated`.

## Required markers

Every live artifact that could be mistaken for evidence must declare:

- `empty_dataset = true` where applicable;
- `evidence_state = evidence_generation_absent`;
- `collection_state = collection_not_started`;
- `adjudication_state = adjudication_not_open`.

## Families

- session-zero manifest;
- live collection manifest;
- live collection log;
- live dataset manifests;
- live reproducibility manifest;
- live decision-record stub;
- live evidence-insertion register.

## Interpretation boundary

Live artifacts are operationally instantiated, but they are still empty and
non-evidential.
