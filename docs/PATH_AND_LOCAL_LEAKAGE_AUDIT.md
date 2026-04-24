# Path And Local Leakage Audit

## Purpose

This audit distinguishes historical references and audit-detector patterns from
live normative path leaks that would make the Stage3 stack non-reproducible or
machine-specific.

## Classification rule

- `allowed_historical_snapshot`: preserved prior-run or planning surface; not a
  live normative dependency.
- `harmless_documentation_example`: explanatory example; not used by runtime or
  live governance.
- `allowed_detector_pattern`: explicit leakage-detection code; not itself a
  path leak.
- `requires_fix`: live normative surface leaks a machine-specific path or stale
  authority pin.
- `blocker`: live normative surface requires a machine-specific absolute path to
  execute correctly.
- `no_issue`: no actionable local leakage found.

## Fix policy

Only live normative leaks are to be corrected. Historical snapshots are not to
be rewritten merely to cosmetically erase old local context.
