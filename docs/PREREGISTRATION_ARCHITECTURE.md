# Preregistration Architecture

Primary manifests:

- `docs/external_adjudication_preregistration_template.v1.json`
- `docs/human_comparator_preregistration_template.v1.json`
- `docs/reviewer_conflict_disclosure_template.v1.json`
- `docs/statistical_analysis_shells.v1.json`

This layer defines template-only preregistration structures. Nothing here counts
as an externally filed preregistration record.

The architecture now fixes:

- required fields
- versioning rules
- amendment rules
- freeze rules
- invalid retrospective edits
- threshold declaration rules
- analysis-family declaration rules
- negative-control declaration rules
- failure and inconclusive pathways

Interpretation boundary:

- preregistration template defined
- preregistration record absent
- preregistration freeze not executed
