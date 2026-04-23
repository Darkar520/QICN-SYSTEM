# Adjudicator Assignment Workflow

The adjudicator layer remains separate from reviewer selection.

## Assignment stages

1. define adjudicator qualification class;
2. define disqualifiers and conflict classes;
3. define assignment prerequisites;
4. bind blinding and unblinding rules;
5. prepare a non-instantiated assignment package.

## Decision boundary

No adjudicator may be treated as assigned until:

- reviewer packaging exists;
- conflict classes are evaluated;
- blinding assignment is bound; and
- the assignment package leaves the `not_started` state.

## Current boundary

At Stage3-3 the assignment package may be ready without any real adjudicator
being named or assigned.
