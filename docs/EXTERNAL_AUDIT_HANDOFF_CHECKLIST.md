# External Audit Handoff Checklist

## Delivery preconditions

- latest ecosystem candidate status is `PASS`
- both repos are clean and pushed
- the package manifest lists exact branches and SHAs
- the frozen primary baseline is separated from the latest accepted comparable
- the invalid historical attempt is preserved and explicitly non-authoritative
- internal red-team findings are attached

## Deliverables to the external reviewer

- the external audit package directory
- `external_audit_package_manifest.json`
- `external_audit_status.json`
- `internal_red_team_report.json`
- copied ecosystem candidate bundle
- copied authoritative campaign artifacts

## Minimum instructions to the reviewer

- follow `docs/EXTERNAL_AUDIT_SETUP.md` before running verification commands
- verify the pinned SHAs first
- reproduce the minimum command set in both repos
- inspect blocked outputs as blocked outputs only
- treat runtime evidence and corpus evidence as distinct layers
- record every finding against an exact file, command, or artifact path

## Suggested findings format

Ask the reviewer to report each finding with:

- `finding_id`
- `severity`: `blocker`, `material_issue`, `note`, or `no_issue`
- `location`
- `reproduction_steps`
- `observed_behavior`
- `expected_behavior`
- `boundary_risk`
- `minimal_correction`

## Process success

The external audit process is considered successfully handed off if a competent
reviewer can:

- understand the package without private context
- reproduce the pinned baselines
- identify expected artifacts
- identify invalidation triggers
- return structured findings

## Process failure

Treat the handoff as failed if:

- the reviewer cannot determine authoritative refs
- the package depends on local private paths or undocumented context
- blocked outputs appear claim-facing safe
- the latest pointer is presented as authoritative frozen evidence
- the package implies external validation already exists

## Non-claim reminder

External handoff readiness is not external validation. A completed handoff is
not an external favorable verdict.
