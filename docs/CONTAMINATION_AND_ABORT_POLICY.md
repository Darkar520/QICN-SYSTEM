# Contamination and Abort Policy

Stage3-6 requires explicit contamination, abort, and invalidation controls
before collection may become openable.

## Contamination events

- undeclared artifact mutation after session-zero;
- non-empty dataset before collection-start authorization;
- live log containing evidential payload before collection-start authorization;
- reviewer or adjudicator action recorded before allowed phase;
- undeclared threshold or shell drift after session-zero.

## Abort events

- operator detects contamination;
- manifest inconsistency across live artifacts;
- preregistration binding inconsistency;
- missing operator checklist confirmation;
- missing live log emptiness confirmation.

## Invalidation rule

If contamination is detected, the session remains non-evidential but becomes
invalidated for any later admissibility claim until reset.

## Interpretation boundary

Abort and invalidation control prevents accidental evidence pollution. It does
not itself generate evidence or adjudication.
