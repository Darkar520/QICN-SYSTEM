# Clean-Room Reproducibility Audit

## Purpose

This audit asks whether the repository can be rebuilt and reverified from a
clean-room working copy without relying on hidden local state.

## Minimum clean-room scope

- clean-room checkout or copy inside a bounded local sandbox path;
- dependency install on the copied tree;
- repository build on the copied tree;
- key verifier execution on the copied tree;
- Stage3 controlled-execution verification on the copied tree;
- Paper 10 compile attempt if toolchain is available;
- local-path leakage inspection;
- artifact-regeneration behavior inspection.

## Classification rule

- `clean_room_reproducible`: the copied tree rebuilds and verifies on the
  canonical surface.
- `clean_room_reproducible_with_warnings`: the copied tree rebuilds and
  verifies on a documented compatibility surface with explicit warnings.
- `clean_room_failed`: the copied tree fails for repository-local reasons.
- `clean_room_blocked_by_environment`: the copied tree cannot be evaluated
  because the environment blocks required steps.

## Non-implication boundary

Clean-room reproducibility does not imply:

- evidence;
- adjudication;
- reviewer validity;
- external validation;
- result-bearing Paper 10 authorization.
