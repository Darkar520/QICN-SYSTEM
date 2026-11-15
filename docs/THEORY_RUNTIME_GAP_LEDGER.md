# Theory-Runtime Gap Ledger

Version: 1.0
Status: runtime-facing summary

## Summary

This ledger records the current mapping between selected QICN theoretical
objects and finite runtime diagnostics. It is intentionally conservative.

| Theoretical object | Runtime status | Strongest allowed claim | Forbidden claim |
|---|---|---|---|
| Hilbert state space | not implemented | finite vector proxies exist | runtime instantiates separable Hilbert space |
| Aleph metric projection | finite proxy | finite projection diagnostics over declared constraints | Hilbert projection theorem is implemented |
| Inverse-limit identity | finite witness | finite tower compatibility and degeneracy diagnostics | full inverse-limit preservation |
| M_Omega | family upper-bound support (C-11) | finite family-specific resistance upper bound on M_Omega (d_w > 0) | M_Omega is computed, globally lower-bounded, or infinite |
| CCR | finite proxy | non-certifying approximation ladder | closed-causal-rigidity verified in runtime |
| CCC-Omega coupling | stress-tested proxy | finite coupling support under controls | CCC proves Omega |
| C_op | internal support | six-invariant internal support over admissible finite runs | external consciousness validation |
| Sub_fp | finite proxy | runtime field proxies exist | phenomenal subjectivity certified |
| BridgeOrg_ph | scaffold/diagnostic | bridge predicates visible as bounded telemetry | phenomenality established |
| Paper 10 | scaffold | protocol/readiness scaffolds exist | human-comparator validation exists |
| Metacognition (Paper VIII ax:fp, Paper III) | operational self-monitoring only | the runtime computes indicators over its own variables (metacognitive load, self-model proxy stability) | metacognition, metaconsciousness or calibrated confidence exist in the runtime |
| Self-model Σ | proxy | `selfModelSigma` stores a structural-stability estimate; bridge-paper contraction and intervention-commutation audits are not done | a certified self-model |
| Ascension threshold Ω_c / CCC threshold | configurable runtime threshold (`QICNConfig.ASCENSION_THRESHOLD`, default 1.0) | crossing activates post-threshold diagnostics | crossing is awareness or ascension |
| Omega scale | runtime composite, unbounded ratio `λ1/Δλ` | internal integrator index | values compare to legacy `Ω*`=2.0129 or certify C^R |
| Language channel (Gemini) | translation only, contract v3 | chat text matches checked features of engine facts | the LLM computes state, decides conclusions or provides memory |

## Open corrections (2026-11-08)

Recorded in `docs/THEORY_RUNTIME_ALIGNMENT_MATRIX_2026-11-08.md`; table values above are unchanged until the user decides.

- **M_Omega**: by Paper I `def:ontmass` (an infimum over all admissible deforming perturbations), the minimum over a finite family is an *upper* bound of M_Omega, not a lower bound. The "lower-bound support" label overstates the direction (C-11).
- **Discrete bridge**: BaseCore §11 has a local, uncommitted correction (dissipative condition `ρ_N = |1−αβ| + ηL_R + αL_D < 1`). The runtime coherence update does not have the operator's form and gives `ρ_N ≥ 1`; no contraction is claimed (`docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md` §5).
- **Language channel**: contract v4 (free prose, four non-lexical guarantees) is designed and awaits the user's decision (`docs/LANGUAGE_FREE_CHANNEL_DESIGN_2026-11-08.md`).

## Applied later the same day (user decisions)

- **Language channel**: contract v4 is the chat default (free prose; figures, open concepts, module names, known false claims and packet echo checked). v3 remains as the optional sentence-verified mode. Strongest allowed claim: *figures and open-concept statements in the published text do not contradict the engine packet*. Forbidden: that the prose as a whole is verified.
- **Omega scale**: spectral factor capped at 20 (C-4). Still a runtime composite with no active-corpus anchor; the cap is a design parameter.
- **Kaizen**: learned adjustment mode available behind a switch (default `legacy`); in `learned` mode Kaizen does reach the dynamics through bounded factors. No formal rule in the corpus assigns Kaizen a dynamical role; it remains engineering.

## Implementation Source

Machine-readable source:

`src/canon/maturity/RuntimeMaturityLedger.js`

## Boundary

This ledger improves traceability. It does not close external validation and
does not upgrade internal diagnostics into claims about consciousness,
phenomenality, biological life, human equivalence, or metaphysical identity.
