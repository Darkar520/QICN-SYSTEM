# Runtime Health Audit

## Purpose

This audit defines the minimum runtime-health evidence required before the
Stage3 stack may be treated as operationally executable rather than only
formally specified.

## Required checks

- toolchain visibility (`node -v`, `npm -v`);
- dependency install behavior under the repository's declared install route;
- repository build behavior;
- repository test behavior;
- bounded local-start behavior;
- source-of-truth verification;
- comparative-program closure verification;
- Stage3 controlled-execution verification;
- Stage3-5 readiness verification;
- Paper 9 handoff verification.

## Classification rule

- `runtime_health_pass`: required runtime checks pass on the canonical surface.
- `runtime_health_pass_with_warnings`: required checks pass, but an
  environment, engine, fallback-install, or advisory warning remains.
- `runtime_health_fail`: a required runtime check fails for repository-local
  reasons.
- `runtime_health_blocked_by_environment`: a required check cannot be completed
  because the active environment blocks it.

## Non-implication boundary

Runtime health does not imply:

- admissible evidence;
- collection start;
- adjudication;
- reviewer action;
- Paper 10 authorization;
- human equivalence or superiority;
- metaphysical consequence claims.
