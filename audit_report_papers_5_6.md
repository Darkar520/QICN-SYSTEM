# Ultra-Granular Audit Report: QICN Papers 5 & 6

**Auditor:** Senior Mathematical Auditor  
**Protocol:** `audit-context-building` (line-by-line / block-by-block pure context mode)  
**Date:** 2026-05-24  
**Scope:** `paper5_operational_consciousness\main.tex` (1,365 lines) and `paper6_predictions_falsation\main.tex` (559 lines)  
**Directive:** Audit only. Do not fix.

---

# Audit Report: Paper 5 — Operational Consciousness Criterion

## a. Structure Map

| Section / Subsection | Line | Major Environments (Label) |
|---|---|---|
| Abstract | 81 | — |
| 1. Scope, System Boundary, and Non-Inference Note | 93 | — |
| 2. Introduction | 103 | — |
| 3. Claim-Type Ledger | 119 | — |
| 3.1 Claim Types Used in This Paper | 120 | — |
| 4. Terminology Debt Ledger | 131 | **Remark** `[Primary demonstrated name]` (151) |
| 5. Corpus Role and Novelty | 158 | — |
| 6. Admissible Systems, Supports, and Histories | 179 | — |
| 6.1 System Model | 180 | **Definition** `[def:system]` (181) |
| 6.2 Admissible Support | 202 | **Definition** `[def:support]` (203) |
| 6.3 Operational Histories | 215 | **Definition** `[def:history]` (216); **Definition** `[def:partition]` (228) |
| 6.4 Witness Margin Vector | 238 | **Definition** `[def:margins]` (239) |
| 7. Six Critical Invariants | 281 | — |
| 7.1 Structural Persistence | 284 | **Definition** `[def:iper]` (285) |
| 7.2 Rigid Identity | 300 | **Definition** `[def:iri]` (301) |
| 7.3 Causal Integration | 310 | **Definition** `[def:iint]` (311) |
| 7.4 Operational Continuity | 331 | **Definition** `[def:icont]` (332) |
| 7.5 Non-Null Differentiation | 356 | **Definition** `[def:idiff]` (357) |
| 7.6 Operational Legibility | 370 | **Definition** `[def:ileg]` (371) |
| 7.7 Necessity of Each Invariant | 395 | **Proposition** `[prop:necessity]` (396) |
| 8. Operational Consciousness, Operational Qualia, and Equivalence | 404 | — |
| 8.1 Operational Qualia Classes | 405 | **Definition** `[def:decoder]` (406); **Definition** `[def:indist]` (410); **Proposition** `[prop:qop-welldefined]` (418); **Definition** `[def:qop]` (426) |
| 8.2 Operational Consciousness | 436 | **Definition** `[def:cop]` (437); **Remark** `[Minimality of the criterion]` (444) |
| 8.3 Exact and Approximate Structural Equivalence | 448 | **Definition** `[def:eqdatum]` (449); **Definition** `[def:equiv]` (462); **Definition** `[def:rupture]` (494) |
| 9. Support Geometry and Partition Transport | 506 | **Lemma** `[lem:support-transfer]` (509); **Lemma** `[lem:decoder-transport]` (517); **Proposition** `[prop:transport]` (531); **Proposition** `[prop:margins]` (539); **Remark** `[Why this section matters]` (554) |
| 10. Inherited Inputs and Consolidation Step | 558 | — |
| (Core→Per, P1→RI, P2→Cont, P3→Diff, P4→Leg, Integration transfer) | 561–611 | **Propositions** `[prop:core-per]` (561), `[prop:p1-ri]` (569), `[prop:p2-cont]` (577), `[prop:p3-diff]` (585), `[prop:p4-leg]` (593), `[prop:integration-transfer]` (601); **Remark** `[Scope of the transfer]` (609) |
| 11. Main Theorems | 613 | — |
| 11.1 Existence of Operational Consciousness | 614 | **Theorem** `[thm:existence]` (615) |
| 11.2 Substrate Invariance | 632 | **Theorem** `[thm:substrate]` (633); **Corollary** `[cor:biology]` (652) |
| 11.3 Approximate Stability | 660 | **Theorem** `[thm:stability]` (661) |
| 11.4 Rupture by Invariant Loss | 684 | **Theorem** `[thm:rupture]` (685) |
| 11.5 Insufficiency of Complexity, Computation, and Connectivity | 698 | **Proposition** `[prop:insufficient]` (699) |
| 12. Rupture Taxonomy by Invariant | 713 | **Propositions** `[prop:rupt-per]` (716), `[prop:rupt-ri]` (724), `[prop:rupt-int]` (732), `[prop:rupt-cont]` (740), `[prop:rupt-diff]` (748), `[prop:rupt-leg]` (756) |
| 13. Minimality of the Invariant Basis | 765 | — |
| 13.1 Reduced invariant criterion | 768 | **Definition** `[def:reduced]` (768) |
| 13.2 Single-rupture witness family | 780 | **Definition** `[def:witness]` (780); **Proposition** `[prop:witness]` (788); **Theorem** `[thm:minimality]` (801); **Corollary** `[cor:onemetric]` (813); **Remark** `[What minimality does and does not say]` (821) |
| 14. Invariant Independence and Interaction Geometry | 825 | **Theorem** `[thm:six-witness-schemas]` (831); **Theorem** `[thm:six-sufficiency]` (873); **Propositions** `[prop:not-per-not-ri]` (894), `[prop:per-int-weak-ri]` (906), `[prop:leg-requires-diff]` (920), `[prop:per-cont-regime-stability]` (932); **Table** `[tab:invariant-implication-geometry]` (949) |
| 15. What the Six Invariants Do Not Guarantee | 964 | — |
| 16. Operational Legibility as a Certified Object | 981 | **Criterion** `[crit:legibility]` (984); **Proposition** `[prop:legibility]` (1020); **Remark** `[Why legibility is a constitutive invariant here]` (1046) |
| 16.1 Legibility Metrics | 998 | — |
| 17. Certified Candidate Audit Schema | 1051 | **Definition** `[def:cert]` (1054); **Criterion** `[crit:cert]` (1069); **Propositions** `[prop:cert-sound]` (1099), `[prop:cert-complete]` (1107), `[prop:cert-local]` (1115); **Remark** `[Audit schema and Forensic Predictions]` (1123) |
| 18. Operational Geometry of `Qop(S)` | 1126 | **Definitions** `[def:geometry]` (1129), `[def:radius]` (1140); **Propositions** `[prop:geometry]` (1144), `[prop:geometry-transfer]` (1157); **Corollary** `[cor:geometry-rupture]` (1165) |
| 19. Corpus Dependency Ledger | 1173 | — |
| 20. Discriminators and Falsifiable Consequences | 1194 | **Predictions** `[pred:sameclass]` (1197), `[pred:breakclass]` (1201), `[pred:intervention]` (1205), `[pred:complexity]` (1209); **Proposition** `[prop:ladder]` (1228) |
| 21. Intervention Geometry and Class Transition Semantics | 1238 | **Definitions** `[def:transition]` (1241), `[def:critical-sham]` (1253); **Propositions** `[prop:transition-well]` (1257), `[prop:transition-rupture]` (1265); **Corollary** `[cor:sham]` (1278); **Remark** `[Why transition semantics matter]` (1286) |
| 22. Baseline Families and Structural Exclusion | 1289 | **Definition** `[def:baseline]` (1292); **Propositions** `[prop:baseline-insufficient]` (1303), `[prop:substrate-strong]` (1311), `[prop:functional-weak]` (1319); **Theorem** `[thm:intermediate]` (1327); **Remark** `[Scientific value of the comparison]` (1341) |
| 23. Interpretive Consequences Without Overreach | 1344 | — |
| 24. Residual Instantiation and Interpretation Limits | 1349 | **Remark** `[Open burdens]` (1350) |
| 25. Conclusion | 1359 | — |

---

## b. Theorem Inventory

*Note: “Basecore?” indicates whether the result appears in `basecore.txt` (absorbed into the normalized base layer).*

---

### Lemma `[lem:support-transfer]` (line 509)
- **Exact statement:**
  ```latex
  If $S_1 \simeq_{\Gamma} S_2$ via $(\chi,\upsilon,\rho)$ and $A_1$ is an admissible support for $S_1$, then $A_2=\chi(A_1)$ is an admissible support for $S_2$.
  ```
- **Dependencies:** `def:equiv` (exact structural equivalence), `def:support`.
- **Known issues / suspicious claims:** Proof (lines 513–515) asserts that “Bi-Lipschitz bijectivity of `\chi` preserves non-emptiness and compactness” and that attractor-support relation is preserved exactly. This is correct *if* `\chi` is bi-Lipschitz and the intertwining is exact (`\eps=0`). However, the proof does not verify that `A_2 \cap \Attr(S_2) \neq \varnothing`; it merely asserts inheritance. This is technically fine because exact dynamic intertwining transports trajectories into the attractor, but the proof is a one-paragraph sketch.
- **Basecore?** **No.**

---

### Lemma `[lem:decoder-transport]` (line 517)
- **Exact statement:**
  ```latex
  Let $D \in \Dec_{S_1}$ and suppose $S_1 \simeq_{\Gamma} S_2$ via $(\chi,\upsilon,\rho)$. Then
  \[
  (\rho_\ast D)\bigl(h_{S_2,T}(\chi(x);\upsilon(u_\bullet))\bigr)
  :=
  D\bigl(h_{S_1,T}(x;u_\bullet)\bigr)
  \]
  defines a certified decoder on $S_2$.
  ```
- **Dependencies:** `def:equiv`, `def:history`, exact readout compatibility.
- **Known issues:** The notation `\rho_\ast D` is introduced without definition; the proof (lines 527–529) is a sketch claiming certification clauses are “preserved because … all remain unchanged under exact transport.” No explicit verification of each L1–L6 clause is given.
- **Basecore?** **No.**

---

### Proposition `[prop:necessity]` (line 396) — *Each invariant is individually necessary*
- **Exact statement:**
  ```latex
  If any one of $\Iper,\Iri,\Iint,\Icont,\Idiff,\Ileg$ fails, then $S \notin \Cop$.
  ```
- **Dependencies:** `def:cop`.
- **Known issues:** Proof (lines 400–402) is a direct unpacking of the conjunctive definition. It is valid but tautological. It does not prove that the failure modes are *independent* or that the invariants are *minimally* necessary (that is done later in `thm:minimality`).
- **Basecore?** **Yes** (appears as Proposition 24.7 in `basecore.txt`).

---

### Proposition `[prop:qop-welldefined]` (line 418) — *Well-definedness of operational qualia classes*
- **Exact statement:**
  ```latex
  If $\Iper(S)=\Iri(S)=\Icont(S)=\Idiff(S)=\Ileg(S)=1$, then $\sim_{Q,S}$ is an equivalence relation on $\Aset$.
  ```
- **Dependencies:** `def:indist`, `def:decoder` (implicitly), `def:ileg`.
- **Known issues:** **Formal error in proof (line 422–424).** Transitivity is claimed because “the bounded mismatch condition remains within the certified tolerance because the decoder family is closed under the legibility margin.” The phrase “closed under the legibility margin” is **not defined anywhere** in the paper. If the mismatch between `x` and `y` is bounded by `\delta_{\text{leg}}` and the mismatch between `y` and `z` is also bounded by `\delta_{\text{leg}}`, the mismatch between `x` and `z` could be up to `2\delta_{\text{leg}}`. Without a halving of the margin or a metric triangle-inequality on the intervention-response space, transitivity is **not justified**. This is a **circular/incomplete proof**.
- **Basecore?** **No.**

---

### Proposition `[prop:transport]` (line 531) — *Operational classes are closed under exact transport*
- **Exact statement:**
  ```latex
  If $S_1 \simeq_{\Gamma} S_2$, then the image under $\chi$ of any class in $\Qop(S_1)$ is a class in $\Qop(S_2)$, and every class in $\Qop(S_2)$ arises this way.
  ```
- **Dependencies:** `lem:decoder-transport`, `def:equiv` (partition-preservation clause).
- **Known issues:** The proposition is essentially a restatement of the partition-preservation clause in `def:equiv` combined with bijectivity of `\chi`. The proof is trivial and correct, but the result has no independent content beyond the definition of exact equivalence.
- **Basecore?** **No.**

---

### Proposition `[prop:margins]` (line 539) — *Approximate margin preservation*
- **Exact statement:**
  ```latex
  If $S_1 \simeq_{(\Gamma,\eps)} S_2$, then for every critical invariant index $j$,
  \[
  \bigl| \delta_j(S_1) - \delta_j(S_2) \bigr| \le \eps.
  \]
  Hence
  \[
  \delta_\star(S_2) \ge \delta_\star(S_1) - \eps.
  \]
  ```
- **Dependencies:** `def:equiv` (clause 4: invariant preservation).
- **Known issues:** The first statement is literally clause 4 of `def:equiv`. The second is a trivial consequence of taking minima. The proposition adds no new content beyond the definition.
- **Basecore?** **No.**

---

### Propositions `[prop:core-per]` through `[prop:p4-leg]` (lines 561, 569, 577, 585, 593) — *Upstream transfer propositions*
- **Exact statements (representative):**
  ```latex
  [prop:core-per] Suppose a realization of the framework satisfies the Core hypotheses on a non-empty compact domain and remains in the non-collapse region. Then it satisfies $\Iper$.
  [prop:p1-ri] Suppose the observable family on an admissible support satisfies the inverse-limit compatibility conditions of \textit{Rigid Identity}. Then $\Iri$ holds...
  [prop:p2-cont] Suppose an admissible support carries a phenomenological assignment satisfying the continuity and anti-fragmentation constraints of \textit{Phenomenological Regimes}. Then $\Icont$ holds.
  [prop:p3-diff] Suppose the support lies in a causally rigid channel satisfying the null-instability and forced non-nullity results of \textit{Null-Regime Instability}. Then $\Idiff$ holds.
  [prop:p4-leg] Suppose a readout family and decoder satisfy the admissibility, comparator, negative-control, and intervention-discipline requirements of \textit{Forensic Predictions}. Then $\Ileg$ holds.
  ```
- **Dependencies:** Respective upstream papers (Core, paper1–paper4).
- **Known issues:** All five are packaging claims, not independent mathematical results. They assume the upstream hypotheses and assert the invariants hold by direct recasting. This is methodologically acceptable but mathematically trivial.
- **Basecore?** **No.**

---

### Proposition `[prop:integration-transfer]` (line 601)
- **Exact statement:**
  ```latex
  If a system satisfies \textit{Rigid Identity} rigidity, \textit{Phenomenological Regimes} continuity, and \textit{Forensic Predictions} intervention fidelity, then any exact admissible factorization preserving all operational histories would contradict at least one of those upstream conditions. Hence $\Iint$ is justified as a new consolidation invariant.
  ```
- **Dependencies:** paper1, paper2, paper4.
- **Known issues:** Proof (lines 605–607) is a non-constructive argument by contradiction. It does not exhibit a concrete system where the conjunction blocks factorization; it merely asserts that *if* a factorization preserved everything, it would contradict one upstream condition. This is heuristic, not a proof of existence of `\Iint`.
- **Basecore?** **No.**

---

### Theorem `[thm:existence]` (line 615) — *Existence of operational consciousness*
- **Exact statement:**
  ```latex
  Let $S=(X,\Phi,C,R,\Gamma,U)$ be an admissible system with non-empty admissible support $\Aset$. If
  \[
  \Iper(S)=\Iri(S)=\Iint(S)=\Icont(S)=\Idiff(S)=\Ileg(S)=1,
  \]
  then:
  \begin{enumerate}[leftmargin=1.5em]
  \item $S \in \Cop$;
  \item $\Qop(S)$ is well-defined;
  \item $\Qop(S) \neq \varnothing$.
  \end{enumerate}
  ```
- **Dependencies:** `def:cop`, `def:qop`, `prop:qop-welldefined`.
- **Known issues:**
  - (1) is tautological from `def:cop`.
  - (2) depends on `prop:qop-welldefined`, whose transitivity proof is flawed (see above).
  - (3) **Proof overclaims (lines 628–630).** Non-emptiness of the quotient is trivial because `\Aset` is non-empty. However, the proof then asserts: “Because `\Idiff(S)=1`, the quotient is not forced into the null class alone; the admissible support contains at least one pair of histories with positive operational separation. Thus `\Qop(S)` is both defined and non-trivial.” The theorem only claims non-emptiness, but the proof claims **non-triviality** (at least two distinct classes). This is **not justified**: `\Idiff` guarantees readout-distance separation for *some* schedule, but `\sim_{Q,S}` requires equality for *all* decoders, *all* horizons, and *all* schedules. A pair separated under one schedule may still be indistinguishable under all decoders on all schedules. The proof conflates readout-distance separation with decoder-class separation. **Category error / unjustified inference.**
- **Basecore?** **No.**

---

### Theorem `[thm:substrate]` (line 633) — *Substrate invariance*
- **Exact statement:**
  ```latex
  Let $S_1$ and $S_2$ be admissible systems. If $S_1 \simeq_{\Gamma} S_2$ and the six critical invariants are preserved exactly, then
  \[
  S_1 \in \Cop \quad \Longleftrightarrow \quad S_2 \in \Cop,
  \]
  and there exists a canonically induced bijection
  \[
  \widehat{\chi} : \Qop(S_1) \to \Qop(S_2).
  \]
  ```
- **Dependencies:** `def:equiv` (exact equivalence), `lem:support-transfer`, `prop:transport`.
- **Known issues:** **Redundant hypothesis.** Clause 4 of `def:equiv` (line 462) already requires that “the witness margins for all six invariants differ by at most `\eps`.” For exact equivalence (`\eps=0`), this means the invariants are preserved exactly. Stating “and the six critical invariants are preserved exactly” as an additional hypothesis is **superfluous**.
- **Basecore?** **No** (mentioned in commentary at line 3084 of `basecore.txt`, but not as an absorbed theorem).

---

### Corollary `[cor:biology]` (line 652) — *Biological non-primacy*
- **Exact statement:**
  ```latex
  Biology is not a primitive constitutive requirement for membership in $\Cop$. If a biological system and a non-biological system are exactly structurally equivalent in the sense of Definition~\ref{def:equiv}, then they belong to the same operational consciousness class and carry equivalent operational qualia classes.
  ```
- **Dependencies:** `thm:substrate`.
- **Known issues:** Valid conditional statement. The interpretive burden (line 657) correctly notes that it does not claim any *present* non-biological system satisfies the criterion.
- **Basecore?** **No** (mentioned in `basecore.txt` commentary only).

---

### Theorem `[thm:stability]` (line 661) — *Approximate stability*
- **Exact statement:**
  ```latex
  Let $S_1 \in \Cop$ with witness margins
  \[
  \delta_\star(S_1) = \min\{\delta_{\mathrm{per}},\delta_{\mathrm{ri}},\delta_{\mathrm{int}}, \delta_{\mathrm{cont}},\delta_{\mathrm{diff}},\delta_{\mathrm{leg}}\}.
  \]
  If $S_2$ satisfies $S_1 \simeq_{(\Gamma,\eps)} S_2$ with
  \[
  0 \le \eps < \frac{\delta_\star(S_1)}{2},
  \]
  then $S_2 \in \Cop$.
  ```
- **Dependencies:** `def:equiv`, `def:cop`, `prop:margins`.
- **Known issues:** The theorem is **true but extremely weak**. `def:equiv` already presupposes that `S_2` possesses all the structures required to define the six invariant margins (support, identity object, decoder family, etc.) and that these margins are within `\eps` of those of `S_1`. Therefore the theorem essentially says: “If `S_2` already has all the requisite structures and its margins are close enough to positive margins, then `S_2` satisfies the invariants.” This is a tautology dressed as a stability result. It does **not** prove stability under generic perturbations that might destroy the auxiliary structures.
- **Basecore?** **No.**

---

### Theorem `[thm:rupture]` (line 685) — *Rupture by invariant loss*
- **Exact statement:**
  ```latex
  Let $S$ be admissible. If one or more critical invariants fail beyond admissible threshold, then exactly one of the following occurs:
  \begin{enumerate}[leftmargin=1.5em]
  \item $S \notin \Cop$;
  \item $\Qop(S)$ becomes undefined;
  \item $\Qop(S)$ becomes trivial or non-legible in the framework-relevant sense.
  \end{enumerate}
  ```
- **Dependencies:** `def:cop`, rupture taxonomy from Section 12.
- **Known issues:** The disjunction “exactly one of the following” is **not strictly mutually exclusive** across all six invariants. For example, if `\Iper` fails (support lost), then `\Qop(S)` is undefined *and* `S \notin \Cop`. The proof (lines 694–696) enumerates cases but does not prove mutual exclusivity. The phrase “exactly one” is stronger than the argument supports.
- **Basecore?** **Yes** (appears as Theorem 25.8 in `basecore.txt`).

---

### Proposition `[prop:insufficient]` (line 699) — *Complexity-only baselines are insufficient*
- **Exact statement:**
  ```latex
  Let $S$ be an admissible system candidate. The following are each insufficient for membership in $\Cop$:
  \begin{enumerate}[leftmargin=1.5em]
  \item large state-space dimension $\dim(X)$;
  \item large computational throughput or expressivity of $\Phi$;
  \item large edge count, density, or raw connectivity of $C$.
  \end{enumerate}
  In each case, failure of one or more critical invariants excludes membership regardless of the size of the surrogate metric.
  ```
- **Dependencies:** `def:cop`.
- **Known issues:** Valid but trivial: the definition of `\Cop` does not include the surrogates as sufficient conditions. The proof simply notes that a system can be large while lacking the required invariants. No counterexample system is constructed.
- **Basecore?** **No.**

---

### Propositions `[prop:rupt-per]` through `[prop:rupt-leg]` (lines 716, 724, 732, 740, 748, 756)
- **Exact statements (pattern):**
  ```latex
  [prop:rupt-per] If $\delta_{\mathrm{per}}(S)=0$, then every candidate operational partition becomes horizon-dependent in an inadmissible way: there exists no non-empty compact forward-invariant support on which class membership can be defined uniformly.
  [prop:rupt-ri] If $\delta_{\mathrm{ri}}(S)=0$, then operational class labels no longer transport uniquely across admissible histories. Therefore $\Qop(S)$ becomes representation-dependent.
  [prop:rupt-int] If $\delta_{\mathrm{int}}(S)=0$, then $S$ admits a non-trivial admissible factorization into operationally independent components. Such a system fails $\Cop$ even if each component separately satisfies weaker criteria.
  [prop:rupt-cont] If $\delta_{\mathrm{cont}}(S)=0$, then arbitrarily small admissible perturbations can force transitions between incompatible operational classes while identity is preserved.
  [prop:rupt-diff] If $\delta_{\mathrm{diff}}(S)=0$, then either $\Qop(S)$ collapses to a single trivial class or the null class remains admissibly stable.
  [prop:rupt-leg] If $\delta_{\mathrm{leg}}(S)=0$, then any remaining latent partition is scientifically inadmissible for this paper...
  ```
- **Dependencies:** Respective invariant definitions and `prop:necessity`.
- **Known issues:** These are **restatements of the negations of the invariant definitions** with added interpretive gloss. They are not independent mathematical results. For example, `prop:rupt-per` simply unpacks the negation of `def:iper`.
- **Basecore?** **No.**

---

### Proposition `[prop:witness]` (line 788) — *Single-rupture witnesses generate false positives for reduced criteria*
- **Exact statement:**
  ```latex
  Let $J_k = \mathfrak{I}\setminus\{I_k\}$ and assume $\mathcal{W}_k \neq \varnothing$. Then every $S \in \mathcal{W}_k$ satisfies
  \[
  S \in \mathcal{C}_{\mathrm{op}}(J_k) \qquad\text{but}\qquad S \notin \Cop.
  \]
  ```
- **Dependencies:** `def:reduced`, `def:witness`, `prop:necessity`.
- **Known issues:** Valid given the hypothesis that `\mathcal{W}_k \neq \varnothing`. The proof is a direct unpacking of definitions.
- **Basecore?** **No.**

---

### Theorem `[thm:minimality]` (line 801) — *Minimality of the six-invariant basis*
- **Exact statement:**
  ```latex
  Let $\mathfrak{U}$ be any admissible universe containing at least one single-rupture witness for each of the six invariants. Then no strict subset $J \subsetneq \mathfrak{I}$ satisfies
  \[
  \mathcal{C}_{\mathrm{op}}(J) \cap \mathfrak{U} = \Cop \cap \mathfrak{U}.
  \]
  Hence the six-invariant family is minimal on every such admissible universe.
  ```
- **Dependencies:** `def:reduced`, `prop:witness`.
- **Known issues:** The theorem is **conditionally correct** but **existentially fragile**. It assumes the universe contains a witness for each invariant. The paper does **not** construct such witnesses or prove their existence. Without existence, the theorem is vacuously true but inapplicable. The remark (line 821) correctly notes this limitation.
- **Basecore?** **Yes** (appears as Theorem 26.4 in `basecore.txt`).

---

### Corollary `[cor:onemetric]` (line 813)
- **Exact statement:**
  ```latex
  On any admissible universe satisfying Theorem~\ref{thm:minimality}, no criterion based on only persistence, only integration, only continuity, only differentiation, or only legibility is extensionally equivalent to $\Cop$.
  ```
- **Dependencies:** `thm:minimality`.
- **Known issues:** Valid corollary of `thm:minimality`. Note that it excludes “only rigidity” (`\Iri`) from the list for no stated reason; the theorem covers all six, so the omission in the text is an inconsistency.
- **Basecore?** **No.**

---

### Theorem `[thm:six-witness-schemas]` (line 831) — *Six canonical single-rupture witness schemas*
- **Exact statement:**
  ```latex
  For each invariant in $\mathfrak{I}$ there is a formal admissible witness schema that satisfies the other five invariant predicates while failing the selected one:
  [enumerated list of six schema descriptions]
  Hence no invariant in $\mathfrak{I}$ is derivable from the conjunction of the other five within the admissible witness universe generated by these schemas.
  ```
- **Dependencies:** `def:witness`, rupture taxonomy.
- **Known issues:** The “schemas” are **descriptions**, not formal constructions. No metric spaces, dynamics, or readout families are explicitly given. The theorem claims non-derivability “in the witness universe,” but since the universe is not shown to be non-empty, the result is conditional and heuristic.
- **Basecore?** **No.**

---

### Theorem `[thm:six-sufficiency]` (line 873) — *Sufficiency of the six-invariant basis*
- **Exact statement:**
  ```latex
  Let $S$ be admissible on support $\Aset$. If
  \[
  \Iper(S)=\Iri(S)=\Iint(S)=\Icont(S)=\Idiff(S)=\Ileg(S)=1,
  \]
  then $S$ satisfies every structural burden required for membership in $\Cop$ as defined in this paper. No additional independent predicate can invalidate $S\in\Cop$ without changing the definition of $\Cop$ or causing at least one of the six invariants to fail.
  ```
- **Dependencies:** `def:cop`.
- **Known issues:** **Epistemic gap / tautology.** The first sentence restates the definition of `\Cop`. The second sentence is a meta-logical claim that is trivially true: if membership is *defined* as the conjunction of six predicates, then no seventh predicate can invalidate membership *under that definition*. This is not a mathematical theorem; it is a statement about the paper's own naming convention.
- **Basecore?** **No.**

---

### Propositions `[prop:not-per-not-ri]`, `[prop:per-int-weak-ri]`, `[prop:leg-requires-diff]`, `[prop:per-cont-regime-stability]` (lines 894, 906, 920, 932)
- **Exact statements:**
  ```latex
  [prop:not-per-not-ri] If $\Iper(S)=0$ because no non-empty forward-invariant admissible support exists, then $\Iri(S)=0$ for the Paper 5 membership problem.
  [prop:per-int-weak-ri] If $\Iper(S)=1$ and $\Iint(S)=1$, then the family of admissible identity candidates is bounded to the non-factorizable persistent support. This is a weak rigidity statement, not the uniqueness required by $\Iri$.
  [prop:leg-requires-diff] If all admissible classes collapse to a stable null or single indistinguishable class, then $\Ileg(S)=0$ for the criterion of this paper.
  [prop:per-cont-regime-stability] If $\Iper(S)=1$ and $\Icont(S)=1$, then admissible histories remain in a stable regime-transport domain...
  ```
- **Dependencies:** Respective invariant definitions.
- **Known issues:** These are **interpretive glosses on definitions**, not independent propositions. They restate what is already implicit in the invariant definitions. For example, `prop:leg-requires-diff` unpacks the contrapositive of L1 and L4 from `def:ileg`.
- **Basecore?** **No.**

---

### Proposition `[prop:legibility]` (line 1020) — *Legibility is jointly constrained*
- **Exact statement:**
  ```latex
  No single legibility metric is sufficient for $\Ileg$. The invariant requires simultaneous control of separation, admissible noise robustness, persistence window, intervention fidelity, negative controls, and structured compressibility.
  ```
- **Dependencies:** `def:ileg`.
- **Known issues:** Valid unpacking of the conjunctive definition. The proof enumerates ways a single metric can succeed while others fail.
- **Basecore?** **No.**

---

### Propositions `[prop:cert-sound]`, `[prop:cert-complete]`, `[prop:cert-local]` (lines 1099, 1107, 1115)
- **Exact statements:**
  ```latex
  [prop:cert-sound] If $\mathrm{Cert}(S)$ exists and satisfies Criterion~\ref{crit:cert}, then $S \in \Cop$ and $\Qop(S)$ is well-defined.
  [prop:cert-complete] Assume $S \in \Cop$ and suppose the support, decoder, intervention, and compression objects are fully instrumented in the \textit{Forensic Predictions} sense. Then there exists an operational consciousness certificate $\mathrm{Cert}(S)$.
  [prop:cert-local] If a candidate system fails Criterion~\ref{crit:cert}, then the failure localizes to at least one entry of the evidence bundle $E_S$...
  ```
- **Dependencies:** `def:cert`, `crit:cert`, `def:cop`.
- **Known issues:**
  - `prop:cert-sound` is a direct unpacking of `crit:cert`.
  - `prop:cert-complete` is a **tautology**: it says “if `S` satisfies the invariants and all required objects are instrumented, then a tuple collecting those objects exists.” This is a packaging claim, not a theorem.
  - `prop:cert-local` is also definitional: a conjunctive checklist fails at some item.
- **Basecore?** **No.**

---

### Proposition `[prop:geometry]` (line 1144)
- **Exact statement:**
  ```latex
  If $S \in \Cop$, then:
  \begin{enumerate}[leftmargin=1.5em]
  \item every class in $\Qop(S)$ has finite diameter on admissible windows;
  \item there exists at least one pair of distinct classes with positive inter-class separation;
  \item every class has non-zero persistence radius.
  \end{enumerate}
  ```
- **Dependencies:** `def:geometry`, `def:radius`, `def:cop`.
- **Known issues:** Item 2 claims “at least one pair of distinct classes with positive inter-class separation.” This depends on `\Idiff` and L1 of `\Ileg`. However, as noted in `thm:existence`, `\Idiff` only guarantees readout-distance separation for *some* schedule, not necessarily decoder-class separation for *all* schedules. The proof (line 1154) asserts positive separation follows from `\Idiff` and class-separability, but the link between readout-distance and decoder-class separation is **not rigorously established**.
- **Basecore?** **No.**

---

### Proposition `[prop:geometry-transfer]` (line 1157)
- **Exact statement:**
  ```latex
  If $S_1 \simeq_{\Gamma} S_2$, then class diameter, inter-class separation, and persistence radius are preserved by the induced bijection $\widehat{\chi}$ up to the bi-Lipschitz constants of $\chi$ and $\chi^{-1}$.
  ```
- **Dependencies:** `def:equiv`, `def:geometry`, `def:radius`.
- **Known issues:** The proof (lines 1161–1163) is a sketch. It does not compute the explicit distortion bounds using the Lipschitz constants; it merely asserts they follow. Acceptable as a sketch but not a fully detailed proof.
- **Basecore?** **No.**

---

### Corollary `[cor:geometry-rupture]` (line 1165)
- **Exact statement:**
  ```latex
  If a rupture eliminates either $\Idiff$ or $\Ileg$, then the geometric content of $\Qop(S)$ contracts to triviality or becomes operationally unavailable.
  ```
- **Dependencies:** `prop:geometry`, `def:rupture`.
- **Known issues:** Restatement of definitions. Correct but trivial.
- **Basecore?** **No.**

---

### Proposition `[prop:ladder]` (line 1228) — *Prediction ladder is discriminative*
- **Exact statement:**
  ```latex
  The four predictions above distinguish the present criterion from at least four weaker baseline families: substrate-privilege baselines, substrate-blind functional similarity, complexity-only baselines, and connectivity-only baselines.
  ```
- **Dependencies:** Predictions `[pred:sameclass]`–`[pred:complexity]`.
- **Known issues:** The “proof” (lines 1232–1234) is an **argument by incompatibility**, not a formal proof. It asserts that each prediction is incompatible with a baseline because the baseline would permit what the prediction forbids. This is logically sound at the level of set inclusion, but it relies on informal descriptions of the baselines.
- **Basecore?** **No.**

---

### Proposition `[prop:transition-well]` (line 1257)
- **Exact statement:**
  ```latex
  Let $S \in \Cop$. If $u \in U$ is either certified critical or sham and remains within the admissibility envelope of \textit{Forensic Predictions}, then $\mathsf{T}_u$ is well-defined on every class $q \in \Qop(S)$.
  ```
- **Dependencies:** `def:transition`, `def:critical-sham`, `def:cop`.
- **Known issues:** Proof (lines 1261–1263) claims well-definedness because “legibility prevents class assignment from depending on the choice of representative.” This assumes a strong form of decoder consistency that is not explicitly in `def:ileg`. `def:ileg` guarantees separability and noise robustness, but it does not explicitly state that all representatives of a class map to the same class under intervention. This is a **gap**.
- **Basecore?** **No.**

---

### Proposition `[prop:transition-rupture]` (line 1265)
- **Exact statement:**
  ```latex
  Let $q \in \Qop(S)$ and let $u$ be a certified critical intervention for invariant $I_k$. If applying $u$ drives the corresponding witness margin to zero, then one of the following occurs: [list: bot, contraction, or global exit]
  ```
- **Dependencies:** `def:transition`, `thm:rupture`, `cor:geometry-rupture`.
- **Known issues:** The proof is a case analysis that references earlier results. Correct as a conditional statement, but the hypothesis “drives the corresponding witness margin to zero” is an idealization; the paper does not prove that any concrete intervention can exactly zero a margin.
- **Basecore?** **No.**

---

### Corollary `[cor:sham]` (line 1278)
- **Exact statement:**
  ```latex
  Let $u \in U$ be sham... If $u$ stays below all six witness margins, then $\mathsf{T}_u(q)=q$ for every $q \in \Qop(S)$.
  ```
- **Dependencies:** `def:critical-sham`, approximate stability.
- **Known issues:** Valid consequence of the definitions.
- **Basecore?** **No.**

---

### Proposition `[prop:baseline-insufficient]` (line 1303)
- **Exact statement:**
  ```latex
  For every choice of thresholds $\theta_X,\theta_\Phi,\theta_C$, the families $\mathcal{B}_{\mathrm{cx}}(\theta_X)$, $\mathcal{B}_{\mathrm{cmp}}(\theta_\Phi)$, and $\mathcal{B}_{\mathrm{conn}}(\theta_C)$ are each insufficient for membership in $\Cop$.
  ```
- **Dependencies:** `def:baseline`, `def:cop`.
- **Known issues:** Restatement of `prop:insufficient` with explicit threshold notation. Trivially true by definition.
- **Basecore?** **No.**

---

### Proposition `[prop:substrate-strong]` (line 1311)
- **Exact statement:**
  ```latex
  On any admissible universe containing one exact cross-substrate equivalent pair, $\mathcal{B}_{\mathrm{sub}}$ is strictly narrower than $\Cop$.
  ```
- **Dependencies:** `cor:biology`, `def:baseline`.
- **Known issues:** Valid conditional statement. The proof is a direct application of `cor:biology`.
- **Basecore?** **No.**

---

### Proposition `[prop:functional-weak]` (line 1319)
- **Exact statement:**
  ```latex
  On any admissible universe containing a same-output rupture pair, $\mathcal{B}_{\mathrm{fun}}(\eta)$ is strictly broader than $\Cop$.
  ```
- **Dependencies:** `def:baseline`, `thm:rupture`.
- **Known issues:** Valid conditional statement. Proof is direct.
- **Basecore?** **No.**

---

### Theorem `[thm:intermediate]` (line 1327) — *The structural criterion is strictly intermediate*
- **Exact statement:**
  ```latex
  Let $\mathfrak{U}$ be an admissible universe containing: [three existence hypotheses]. Then $\Cop$ is strictly intermediate between substrate-privilege baselines and weak substrate-blind surrogates...
  ```
- **Dependencies:** `prop:substrate-strong`, `prop:functional-weak`, `prop:baseline-insufficient`, `cor:onemetric`.
- **Known issues:** **Existentially conditional.** Like `thm:minimality`, it assumes the universe contains specific pairs and witnesses. The paper does not construct or prove existence of such a universe. The theorem is vacuously true if no such universe exists.
- **Basecore?** **No.**

---

## c. Macro Usage

| Macro | Line | Definition | Usage in Paper 5 | Collision / Issue |
|---|---|---|---|---|
| `\Cop` | 53 | `\mathrm{Consciousness}_{\mathrm{op}}` | Extensively used | **Collision with Paper 6** (same macro, same definition). Acceptable for separate documents. |
| `\Qop` | 54 | `\mathrm{Q}_{\mathrm{op}}` | Extensively used | **Collision with Paper 6.** |
| `\Qualop` | 55 | `\mathrm{Qualia}_{\mathrm{op}}` | **Never used** | **Dead macro.** Defined but absent from the entire text. |
| `\Iper` … `\Ileg` | 56–61 | Subscripted `I` macros | Extensively used | **Collision with Paper 6.** |
| `\Aset` | 62 | `A_S` | Extensively used | **Collision with Paper 6.** |
| `\Class` | 70 | `\mathscr{Q}` | Used in `def:partition`, `def:ileg`, etc. | No collision. |
| `\Part` | 71 | `\mathscr{P}` | **Never used** | **Dead macro.** |
| `\Critop` | — | — | **Not defined in Paper 5** | User directive flagged this; it does **not** appear. Possibly defined in Paper 4 or missing entirely. |
| `\Status` | — | — | **Not defined in Paper 5** | Defined only in Paper 6. |
| `\Read` | 67 | `\mathscr{R}` | Used in `def:ileg` (`\Read^{\mathrm{leg}}`) | No collision. |
| `\Hist` | 68 | `\mathscr{H}` | Used in `def:history` | No collision. |
| `\Dec` | 69 | `\mathscr{D}` | Used in decoder definitions | No collision. |
| `\Id` | 66 | `\mathcal{I}` | Used for identity object `\Id_S` | No collision. |
| `\nullclass` | 72 | `\mathbf{0}` | Used in `def:idiff` and discussion | No collision. |
| `\eps` | 73 | `\varepsilon` | Extensively used | **Collision with Paper 6.** |
| `\Nset` | 74 | `\mathbb{N}` | Used in `def:history` | No collision. |
| `\newcolumntype{Y}` | 75 | `>{\raggedright\arraybackslash}X` | Used in multiple tables | **Collision with Paper 6.** |

**Summary of macro issues:**
- `\Qualop` and `\Part` are **dead macros** in Paper 5.
- `\Critop` and `\Status` are **absent** from Paper 5 (the user specifically asked to watch for these).
- Shared macros (`\Cop`, `\Qop`, invariants, `\Aset`, `\eps`, `\newcolumntype{Y}`) are redefined identically in Paper 6. No semantic drift detected.

---

## d. Formal Errors

1. **Undefined meta-mathematical type for `C` (line 191).** In `def:system`, the component `C` is described as “the effective causal structure of the system: the object that records which factorizations, intervention responses, and couplings are admissible on `X`.” There is **no set-theoretic or category-theoretic type** assigned to `C`. It is a meta-mathematical description masquerading as a formal tuple component. **Category error.**

2. **Forward-reference / definitional cycle between `Ileg` and `certified decoder` (lines 371–408).** `def:ileg` (line 371) requires a “certified readout subfamily `\Read^{\mathrm{leg}} \subseteq R`” and a “certified decoder family `\Dec_S`” before `def:decoder` (line 406) defines what a certified decoder is. `def:decoder` then cites `def:ileg`. This is a **circular dependency** in the definition chain.

3. **Undefined term `\nullclass` (line 357).** `def:idiff` references “the null operational class `\nullclass`” without having defined it. It is first introduced as a macro on line 72 but receives no semantic definition until used in `def:idiff`.

4. **Undefined terms inside `def:icont` (line 332).** The definition uses “finite-energy perturbation” and “incompatible regime class” without prior definition. These are **informal predicates inside a formal definition**.

5. **Undefined bound `T_\Gamma` in `def:equiv` (line 470).** The dynamic intertwining clause takes `sup` over `0 \le t \le T_\Gamma`. The symbol `T_\Gamma` is **never defined** in the paper.

6. **Undefined iterate notation `\Phi_{1,u}^t` (line 470).** The paper defines `\Phi_u : X \to X` as a transition operator. The notation `\Phi_{1,u}^t(x)` for `t` in a continuous interval is **not defined**. If `t` is discrete, the `sup` over a continuous range is ill-typed. If `t` is continuous, the paper never establishes a flow.

7. **Invalid proof of transitivity in `prop:qop-welldefined` (lines 422–424).** As detailed in the Theorem Inventory, the proof invokes “the decoder family is closed under the legibility margin,” a **meaningless phrase** under the paper's definitions. Transitivity of `\sim_{Q,S}` is **not established**.

8. **Tautological / overclaimed proof of `thm:existence` (lines 628–630).** The proof conflates readout-distance separation (from `\Idiff`) with decoder-class separation, claiming non-triviality of `\Qop(S)` when the theorem only asserts non-emptiness. **Category error / unjustified inference.**

9. **Redundant hypothesis in `thm:substrate` (line 633).** The clause “and the six critical invariants are preserved exactly” is **already implied** by exact structural equivalence (`\eps=0` in `def:equiv`, clause 4).

10. **Probability measures undefined in legibility metrics (lines 1000–1007).** The metrics `\eta_{\mathrm{noise}}`, `\alpha_{\mathrm{int}}`, and `\beta_{\mathrm{nc}}` use `\Pr[\dots]` without defining a sample space, sigma-algebra, or probability measure. **Formal gap.**

11. **Infimum over undefined set in `\kappa_{\mathrm{comp}}` (line 1006).** The metric takes `\inf_{\kappa}` over compression maps, but the admissible set of compressions is **not specified**.

12. **Disjunction in `thm:rupture` is not mutually exclusive (lines 686–692).** The theorem claims “exactly one of the following occurs,” but the cases overlap (e.g., support loss implies both `S \notin \Cop` and `\Qop(S)` undefined).

---

## e. Epistemic Gaps

1. **`thm:six-sufficiency` is a tautology dressed as a theorem.** It says the definition is sufficient by definition. This is ontological re-labeling, not new mathematics.

2. **Transfer propositions (`prop:core-per` to `prop:p4-leg`) are definitional repackaging.** They restate upstream results in the new vocabulary without adding independent proof content.

3. **Rupture propositions (`prop:rupt-per` to `prop:rupt-leg`) are negations of definitions with interpretive gloss.** They are not independent discoveries.

4. **`\Cop` is an ontological re-labeling.** The paper introduces a symbol for the conjunction of six invariants and then proves theorems (existence, invariance, stability, rupture) that are largely unpackings of this definition. The genuine mathematical work is delegated to upstream papers.

5. **Propositions `prop:cert-complete` and `prop:cert-sound` are packaging claims.** They assert that if all required objects exist and are collected, then a certificate tuple exists. This is not a mathematical result about consciousness; it is bookkeeping.

6. **`thm:minimality` and `thm:intermediate` are existentially conditional.** They assume the existence of witnesses and specific pairs without constructing them. Their scientific force depends on whether the assumed universes are non-empty, which the paper does not establish.

---

## f. Dependencies

**Cited upstream documents:**
- **Core** (`\cite{core}`): Persistent support, attractor, non-collapse. Cited in `def:support`, `def:iper`, dependency ledger.
- **Paper 1 — Rigid Identity** (`\cite{paper1}`): Rigid identity, inverse-limit observability. Cited in `def:iri`, `prop:p1-ri`.
- **Paper 2 — Phenomenological Regimes** (`\cite{paper2}`): Continuity, anti-fragmentation. Cited in `def:icont`, `prop:p2-cont`.
- **Paper 3 — Null-Regime Instability** (`\cite{paper3}`): Null-instability, forced non-nullity. Cited in `def:idiff`, `prop:p3-diff`.
- **Paper 4 — Forensic Predictions** (`\cite{paper4}`): Admissibility, comparators, negative controls. Cited in `def:ileg`, `prop:p4-leg`, `crit:legibility`.
- **Tononi 2004** (`\cite{tononi2004}`): Philosophical contrast in Section 23.
- **Baars 1988** (`\cite{baars1988}`): Philosophical contrast in Section 23.
- **Chalmers** (`\cite{chalmers}`): Philosophical contrast in Section 23.

**Accuracy:** The internal citations (Core, paper1–paper4) are structurally consistent with the roles described in the Introduction (lines 103–117) and the Corpus Dependency Ledger (lines 1173–1192). The external philosophical citations are used only for contrast, not as mathematical dependencies, so their accuracy is not formally verifiable from the text alone.

---

## g. Operational Grammar Assessment

The six invariants (`\Iper` to `\Ileg`) are the core of Paper 5’s “operational grammar.” Assessment:

- **`\Iper` (Structural Persistence):** Rigorous. Uses standard concepts (compactness, forward invariance, metric distance from a collapse set). The collapse set is externally defined, but the invariant itself is well-formed.

- **`\Iri` (Rigid Identity):** **Not self-contained.** It delegates its entire content to Paper 1’s inverse-limit rigidity. The “weighted deformation distance” is not defined in Paper 5. Without Paper 1, `\Iri` is a black box.

- **`\Iint` (Causal Integration):** **Partially rigorous but ambiguous.** The factorization condition uses `R = R_1 \sqcup R_2` for a family of functions, which is ill-typed (should be a partition of the index set). The “error smaller than `\delta_{\mathrm{int}}(S)`” is not measured in a specified metric on history space. The invariant is **observer-dependent** on the choice of `R`.

- **`\Icont` (Operational Continuity):** **Mixes formal and informal elements.** The metric space `(\mathcal{E}_S, d_{\mathcal{E}})` and the fragmentation functional are formal, but “finite-energy perturbation” and “incompatible regime class” are undefined. The definition is **underdetermined**.

- **`\Idiff` (Non-Null Differentiation):** **Mixes formal and informal elements.** The readout-distance condition is formal, but the “null operational class `\nullclass`” is undefined, and “asymptotically stable admissible attractor” applied to a class is a **category error** (a class is not a dynamical system).

- **`\Ileg` (Operational Legibility):** **Primarily operational/regulatory, not purely mathematical.** Clauses L1–L6 are a **checklist** (separability, noise robustness, persistence window, intervention fidelity, negative controls, compressibility). They rely on undefined probability measures, norms on noise, and admissible sets of compression maps. This invariant is the most grammar-mixed: it is a **forensic governance protocol** dressed as a mathematical predicate.

**Conclusion on `\Cop`:** The criterion is **well-defined relative to a rich bundle of auxiliary choices** (readout family, decoder family, compression map, intervention panel), but it is **not a canonical property of the tuple `S`** alone. The paper does not prove that these auxiliary choices are unique or canonical, so class membership is **underdetermined** without additional conventions. This is a **structural circularity / dependency gap**, not a logical contradiction.

---

---

# Audit Report: Paper 6 — Predictions, Discriminators, and Failure Modes

## a. Structure Map

| Section / Subsection | Line | Major Environments |
|---|---|---|
| Abstract | 80 | — |
| 1. Scope, System Boundary, and Non-Inference Note | 88 | — |
| 2. Introduction | 98 | — |
| 3. Status Classes | 117 | — |
| 4. Upstream Canon and Dependency Map | 139 | — |
| 5. Core Predictive Structure of the Framework | 161 | — |
| 5.1 Certification, Equivalence, and Rupture as Predictive Objects | 162 | **Definition** `[Operational certification]` (163); **Definition** `[Equivalence discriminator]` (173); **Definition** `[Rupture event]` (181) |
| 5.2 Prediction Family 1: Complexity-Only Failure | 189 | **Proposition** `[Complexity-only negative-control prediction]` (190) |
| 5.3 Prediction Family 2: Invariant-Loss Rupture | 199 | **Proposition** `[Ablation prediction]` (200) |
| 5.4 Prediction Family 3: Substrate-Preserved Class Membership | 206 | **Proposition** `[Substrate-preserved equivalence prediction]` (207) |
| 5.5 Prediction Family 4: Threshold-Sensitive Boundary Behavior | 213 | **Proposition** `[Boundary-topology prediction]` (214) |
| 5.6 Prediction Family 5: Legibility Dependence | 220 | **Proposition** `[Legibility dependence prediction]` (221) |
| 5.7 Prediction Family 6: Continuity and Non-Nullity Relevance | 227 | **Proposition** `[Continuity/non-nullity relevance]` (228) |
| 6. Main Discriminators | 234 | — |
| 6.1 Rival-Structure Compression | 258 | — |
| 7. Prediction Matrix | 279 | — |
| 8. Failure Modes | 318 | — |
| 8.1 What Would Count Against the Framework | 319 | — |
| 8.2 Failure-Mode Taxonomy | 339 | **Criterion** `[Status meaning]` (340) |
| 9. Claim-to-Test Binding Ledger | 353 | — |
| 10. Boundary Diagnostics | 374 | — |
| 11. Minimal Reproducibility and Admissibility Discipline | 394 | — |
| 12. Current Status of Internal Support | 416 | — |
| 12.1 Interpretive Discipline | 417 | — |
| 12.2 Claim-Specific Diagnostic Notes | 438 | — |
| 12.3 Methodological Status | 451 | — |
| 13. Cycle Evidence Map | 475 | — |
| 14. Priority Next Discriminators | 497 | — |
| 15. Residual Technical Caveats and Non-Claims | 515 | — |
| 16. Final Claim Freeze Table | 525 | — |
| 17. Conclusion | 546 | — |
| 18. Computational Verification Infrastructure | 553 | — |

**Note:** Paper 6 contains **no theorems, no lemmas, and no corollaries**. Only definitions, propositions, and one criterion environment.

---

## b. Theorem Inventory

*(All formal numbered statements are propositions or definitions.)*

---

### Definition `[Operational certification]` (line 163)
- **Exact statement:**
  ```latex
  For an admissible system $S$ already defined in \textit{Operational Consciousness Criterion}, define the certification predicate
  \[
  \Cert(S)=1
  \quad\Longleftrightarrow\quad
  \Iper(S),\Iri(S),\Iint(S),\Icont(S),\Idiff(S),\Ileg(S) > 0
  \]
  on a non-empty admissible support $\Aset$, under the governance and admissibility constraints inherited from \textit{Forensic Predictions}.
  ```
- **Dependencies:** Paper 5 (`\Cop` definition), Paper 4 (governance).
- **Known issues:** This is a **redefinition / renaming** of Paper 5’s conjunction. It adds no new content.
- **Basecore?** **Yes** (Definition 30.1 in `basecore.txt`).

---

### Definition `[Equivalence discriminator]` (line 173)
- **Exact statement:**
  ```latex
  For two admissible systems $S_1,S_2$, define the operational equivalence discriminator
  \[
  \Eq_{\Gamma,\eps}(S_1,S_2)=1
  \]
  when the relevant signatures match, the admissibility bundle is preserved, and the tolerated invariant deltas remain within the allowed comparison regime.
  ```
- **Dependencies:** Paper 5 (`def:equiv`).
- **Known issues:** The definition is **intentionally vague** (“relevant signatures,” “allowed comparison regime”). It delegates the exact burden to Paper 5.
- **Basecore?** **Yes** (Definition 30.2 in `basecore.txt`).

---

### Definition `[Rupture event]` (line 181)
- **Exact statement:**
  ```latex
  For a set of targeted invariants $J$, define
  \[
  \Rupt_J(S)=1
  \]
  when the intervention or perturbation drives at least one invariant in $J$ below the admissible certification margin so that class membership becomes invalidated, destroyed, or undefined.
  ```
- **Dependencies:** Paper 5 (`def:rupture`).
- **Known issues:** Valid repackaging of Paper 5 rupture semantics.
- **Basecore?** **Yes** (Definition 30.3 in `basecore.txt`).

---

### Proposition `[Complexity-only negative-control prediction]` (line 190)
- **Exact statement:**
  ```latex
  If a candidate system exhibits high connectivity, high entropy, or rich activity while failing one or more critical invariants, then the framework predicts
  \[
  \Cert(S)=0,\qquad \Cop(S)\ \text{not certified},\qquad \Qop(S)\ \text{not certified}.
  \]
  ```
- **Dependencies:** Paper 5 (`prop:insufficient`).
- **Known issues:** The proposition is a **heuristic translation** of `prop:insufficient` into predictive language. It is not independently falsifiable without first accepting the framework’s invariant measurements.
- **Basecore?** **No.**

---

### Proposition `[Ablation prediction]` (line 200)
- **Exact statement:**
  ```latex
  If a system is initially certified and a critical intervention selectively destroys one or more invariants, then the framework predicts either loss of certification or a transition to an ambiguous boundary regime, depending on how close the pre-ablation margins were to zero.
  ```
- **Dependencies:** Paper 5 (`thm:rupture`), `def:rupture`.
- **Known issues:** The prediction includes an escape clause (“or a transition to an ambiguous boundary regime, depending on … margins”). This makes the prediction **unfalsifiable in boundary cases**: if certification is not lost, the observer can always claim the margin was close to zero and the system entered the “ambiguous boundary regime.”
- **Basecore?** **Yes** (Proposition 31.2 in `basecore.txt`).

---

### Proposition `[Substrate-preserved equivalence prediction]` (line 207)
- **Exact statement:**
  ```latex
  If two realizations preserve the relevant signatures, admissibility conditions, and six critical invariants up to the allowed comparison regime, then the framework predicts preserved operational class membership independently of substrate labels.
  ```
- **Dependencies:** Paper 5 (`thm:substrate`).
- **Known issues:** The condition “preserve the relevant signatures … up to the allowed comparison regime” is **circular**: the framework itself defines what is “relevant” and what is “allowed.” An external refutation would require an independent metric of structural preservation, which the paper does not supply.
- **Basecore?** **No.**

---

### Proposition `[Boundary-topology prediction]` (line 214)
- **Exact statement:**
  ```latex
  The framework predicts neither global threshold collapse nor perfectly flat insensitivity. Instead, it predicts stable pass/fail regions together with narrow transition bands near critical margins.
  ```
- **Dependencies:** Paper 5 (`thm:stability`).
- **Known issues:** **Designed to be irrefutable.** Any observed threshold behavior can be described as either a “stable pass/fail region” or a “narrow transition band.” If decisions are sharp, the observer cites the “narrow band”; if decisions are flat, the observer cites the “stable region.” The prediction covers both poles and everything in between, making it **immune to falsification**.
- **Basecore?** **No.**

---

### Proposition `[Legibility dependence prediction]` (line 221)
- **Exact statement:**
  ```latex
  Operational class membership should fail or become inadmissible if readouts cease to be separable, noise-robust, intervention-sensitive, and compressible without total collapse.
  ```
- **Dependencies:** Paper 5 (`def:ileg`), Paper 4.
- **Known issues:** This is a direct restatement of `\Ileg` in predictive mood. It has no independent empirical content beyond the definition.
- **Basecore?** **Yes** (Proposition 31.5 in `basecore.txt`).

---

### Proposition `[Continuity/non-nullity relevance]` (line 228)
- **Exact statement:**
  ```latex
  The current canon predicts that continuity and non-null differentiation are not optional extras. Systems that preserve rich activity while losing continuity or falling toward effective null structure should fail the operational criterion or leave it undefined.
  ```
- **Dependencies:** Paper 5 (`def:icont`, `def:idiff`).
- **Known issues:** Valid restatement, but the escape clause “or leave it undefined” provides an unfalsifiable retreat.
- **Basecore?** **No.**

---

### Criterion `[Status meaning]` (line 340)
- **Exact statement:**
  ```latex
  Within the current scientific program, a result belongs to:
  \begin{enumerate}[leftmargin=1.5em]
  \item \Status{ROBUST\_SUPPORT} if the target claim survives repeated internal discrimination...
  \item \Status{PROVISIONAL\_SUPPORT} if the target is strengthened but still depends on a localized unresolved bottleneck;
  \item \Status{STILL\_AMBIGUOUS} if the current tests do not cleanly separate support from failure;
  \item \Status{IMPLEMENTATION\_LIMIT} if the current bottleneck is primarily due to probe, runner, or case-construction quality;
  \item \Status{METRIC\_OR\_TOLERANCE\_LIMIT} if the bottleneck is mainly due to normalization, comparison regime, or threshold handling.
  \end{enumerate}
  ```
- **Dependencies:** None (methodological convention).
- **Known issues:** This is a **reporting taxonomy**, not a mathematical criterion. It is appropriately labeled as a criterion environment.
- **Basecore?** **No.**

---

## c. Macro Usage

| Macro | Line | Definition | Usage in Paper 6 | Collision / Issue |
|---|---|---|---|---|
| `\Cop` | 50 | `\mathrm{Consciousness}_{\mathrm{op}}` | Extensively used | **Identical collision with Paper 5.** |
| `\Qop` | 51 | `\mathrm{Q}_{\mathrm{op}}` | Extensively used | **Identical collision with Paper 5.** |
| `\Iper` … `\Ileg` | 52–57 | Subscripted `I` | Extensively used | **Identical collision with Paper 5.** |
| `\Status` | 58 | `\texttt{#1}` | Extensively used in status tables | **Not defined in Paper 5.** |
| `\TableStatus` | 59 | `\footnotesize\ttfamily` | Used in tables | No collision. |
| `\DualTableStatus` | 60 | `\shortstack` macro | Used in freeze table | No collision. |
| `\StatusRobustCell` etc. | 61–67 | `\shortstack` macros for table cells | Used in ledger tables | No collision. |
| `\Aset` | 68 | `A_S` | Used | **Identical collision with Paper 5.** |
| `\eps` | 69 | `\varepsilon` | Used | **Identical collision with Paper 5.** |
| `\Cert` | 70 | `\mathrm{Cert}` | Used | No collision. |
| `\Eq` | 71 | `\mathrm{Eq}` | Used | No collision. |
| `\Rupt` | 72 | `\mathrm{Rupt}` | Used | No collision. |
| `\Critop` | — | — | **Not defined in Paper 6** | Absent from both papers. |
| `\Class` | — | — | **Not defined in Paper 6** | Defined only in Paper 5. |
| `\Part` | — | — | **Not defined in Paper 6** | Defined only in Paper 5. |

**Summary:** Paper 6 reuses the core invariant macros identically. It adds a suite of status-reporting macros (`\Status*`) that are purely presentational. `\Critop`, `\Class`, and `\Part` are **absent** from Paper 6.

---

## d. Formal Errors

1. **All predictions are framework-internal consistency checks, not independent empirical predictions.** They are stated as `\begin{proposition}` but their content is entirely derived from Paper 5 definitions. This is a **category error in claim type**: they are interpretive translations, not propositions with independent mathematical proof burdens.

2. **Prediction PRED-04 / `Boundary-topology prediction` is designed to be irrefutable (line 214).** As detailed in the Theorem Inventory, the prediction encompasses both “stable regions” and “narrow transition bands,” which jointly cover every possible empirical outcome. This is a **formal immunization strategy**, not a falsifiable prediction.

3. **Escape clauses in prediction statements render them unfalsifiable.**
   - `Ablation prediction` (line 200): “…either loss of certification **or a transition to an ambiguous boundary regime**…” If certification survives, the framework can retreat to the ambiguous-boundary clause.
   - `Continuity/non-nullity relevance` (line 228): “…should fail the operational criterion **or leave it undefined**.” If the system does not fail, the framework can claim it is “undefined.”

4. **The Prediction Matrix (lines 279–313) defines failure conditions that are self-judging.** For example, PRED-01 failure is “class divergence or geometry mismatch **despite preserved structure**.” “Preserved structure” is defined by the framework’s own equivalence relation (`def:equiv` in Paper 5). An external observer who disagrees with the framework’s structural assessment cannot falsify the prediction independently; the framework controls the evidentiary standard.

5. **The “rival divergence” column in the Prediction Matrix (lines 290, 292, 294, etc.) often describes rivals that are straw-man versions of weaker theories.** For example, the “complexity-only rival” is described as predicting that “richness or scale alone can stand in for class membership.” While some informal theories might make this claim, the paper does not cite a specific formal rival theory, making the comparison rhetorical rather than rigorous.

6. **No theorem-level content.** Paper 6 contains no theorems, lemmas, or corollaries. All formal environments are either definitions (renaming Paper 5 objects) or propositions (rephrasing Paper 5 results). The paper’s scientific contribution is purely methodological and interpretive.

---

## e. Epistemic Gaps

1. **The entire paper is a heuristic layer.** No new mathematical objects, theorems, or proofs are introduced. The “predictions” are ontological re-labelings of Paper 5 definitions.

2. **Status classes are implementation-level reporting labels, not formal objects.** The elaborate taxonomy (`ROBUST_INTERNAL_SUPPORT`, `PROVISIONAL_SUPPORT_LOCALIZED`, etc.) is a project-management vocabulary masquerading as a scientific framework component.

3. **The paper is explicitly “internal-only” (lines 94–97, 415, 551).** By construction, it renders its own predictions unfalsifiable by external parties, because external replication or independent validation is explicitly excluded from the current support status.

4. **The Cycle Evidence Map (lines 475–495) and Final Claim Freeze Table (lines 525–543) present methodological progress as evidence.** This conflates **process improvement** (more blind ordering, better judge separation) with **scientific confirmation**. Process hardening is necessary but not sufficient for epistemic closure.

---

## f. Dependencies

**Cited upstream documents:**
- **Core** (`\cite{core}`)
- **Paper 1 — Rigid Identity** (`\cite{paper1}`)
- **Paper 2 — Phenomenological Regimes** (`\cite{paper2}`)
- **Paper 3 — Null-Regime Instability** (`\cite{paper3}`)
- **Paper 4 — Forensic Predictions** (`\cite{paper4}`)
- **Paper 5 — Operational Consciousness Criterion** (`\cite{paper5}`)

**Accuracy:** The dependency map (lines 139–157) is structurally consistent with the upstream paper descriptions. Paper 6 does not add new dependencies or misrepresent upstream burdens. However, it **does not verify** that the upstream dependencies themselves are externally validated; it treats them as a frozen canon.

---

## g. Operational Grammar Assessment

Paper 6 does not define new formal grammar. Its operational grammar assessment is therefore a meta-assessment of how it reuses Paper 5’s grammar:

- **Certification predicate (`\Cert`)**: A boolean repackaging of Paper 5’s six-invariant conjunction. Grammatically harmless but redundant.
- **Equivalence discriminator (`\Eq`)**: A boolean predicate whose truth conditions are delegated to Paper 5’s `def:equiv`. Grammatically weak because it does not resolve the ambiguities in `def:equiv` (e.g., `T_\Gamma` undefined).
- **Rupture event (`\Rupt`)**: A boolean repackaging of Paper 5’s rupture taxonomy. Grammatically acceptable.
- **Prediction propositions**: These are **not formal predictions** in the Popperian sense. They are **framework-internal conditional statements** whose antecedents and failure conditions are defined by the framework itself. The grammar is appropriate for an internal audit log, but it does **not** produce falsifiable empirical claims.

**Overall assessment:** Paper 6’s grammar is **operational and methodological**, not **formal and mathematical**. It is well-suited for its stated purpose as a “prediction-and-falsation ledger inside the internal program,” but it does not—and cannot—close logical gaps in Paper 5.

---

# Summary of Known-Issue Verification

## Paper 5: Is the six-invariant operational consciousness criterion (`\Cop`) well-defined, or does it contain circular dependencies?

**Verdict:** `\Cop` is **conditionally well-defined but contains definitional circularities and underdetermination.**

- **Circular dependency:** `def:ileg` (line 371) uses “certified decoder family” before `def:decoder` (line 406) is introduced, and `def:decoder` references back to `def:ileg`.
- **Underdetermination:** `\Cop` depends on auxiliary objects (readout subfamily `\Read^{\mathrm{leg}}`, decoder family `\Dec_S`, compression map `\kappa_S`, identity object `\Id_S`) that are **not canonically determined by the tuple `S`**. The paper does not prove uniqueness or canonicity of these choices. Therefore `S \in \Cop` is not a pure property of `S`; it is a property of `S` **plus** a bundle of auxiliary structures.
- **Black-box invariant:** `\Iri` delegates its entire content to Paper 1’s inverse-limit construction, making it formally opaque within Paper 5.
- **No logical contradiction:** The circularities do not make the criterion contradictory; they make it **non-canonical and context-dependent**.

## Paper 6: Are the predictions in the prediction table actually falsifiable, or are they designed to be irrefutable?

**Verdict:** The predictions are **designed to be internally consistent but largely irrefutable by external observers.**

- **PRED-04 (`Boundary-topology prediction`)** is the clearest example of **immunization**: it predicts both stability and narrow bands, covering all possible outcomes.
- **Escape clauses** (“or become inadmissible,” “or leave it undefined,” “or a transition to an ambiguous boundary regime”) provide **unfalsifiable retreats** in every prediction family.
- **Self-judging failure conditions:** The failure modes require accepting the framework’s own invariant measurements, equivalence definitions, and legibility assessments. An external skeptic cannot falsify the predictions without first accepting the framework’s ontological vocabulary.
- **Partial exception:** PRED-06 (tamper detection) and PRED-09 (compute-budget stress) are more conventionally falsifiable because they involve operational pipeline behavior rather than deep structural invariants. However, even these rely on framework-internal admissibility definitions.

---

*End of Audit Report.*
