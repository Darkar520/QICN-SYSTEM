# Branch Protection Recommendations

This repository treats CI status as an internal engineering gate. Passing CI does
not imply external validation or paper-level closure.

Recommended protection for `main`:

- Require status checks before merging: `verify`.
- Require branches to be up to date before merging.
- Require pull request review for non-trivial source, test, CI, or governance changes.
- Block force pushes to `main`.
- Block branch deletion for `main`.
- Require conversation resolution before merge.
- Treat failures in `npm run verify:source-of-truth`, `npm run verify:descriptor-registry`, `npm run test:coverage`, `npm run build`, or `npm run scoreboard:run` as blocking until diagnosed.

Scope boundary:

- These rules protect the repository's implementation and internal verification
  surfaces.
- They do not convert runtime-local support, claim projections, or batch gates
  into external validation.
