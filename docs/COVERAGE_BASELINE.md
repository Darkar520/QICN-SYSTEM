# Coverage Baseline

Generated during Phase 11 with:

```powershell
npm run test:coverage
```

The command uses:

```text
c8 --reporter=text --reporter=json --lines=50 --branches=40 --functions=50 node tests/run-all-tests.cjs
```

## Initial Baseline

| Metric | Baseline | Threshold |
| --- | ---: | ---: |
| Statements | 77.42% | 50% |
| Branches | 63.66% | 40% |
| Functions | 81.89% | 50% |
| Lines | 77.42% | 50% |
| Instrumented files | 73 | n/a |

`npm run test:coverage` passed with 119/119 tests. This baseline is an internal engineering quality signal only; it does not upgrade any QICN claim to external validation.

## Notes

- Coverage is generated under `coverage/`, which remains ignored by Git.
- The thresholds are intentionally conservative because the runtime includes browser-only and operational surfaces that are validated through static anchors, smoke tests, and browser liveness rather than direct Node execution.
- Future professionalization work should treat this file as a regression baseline, not as a publication claim.
