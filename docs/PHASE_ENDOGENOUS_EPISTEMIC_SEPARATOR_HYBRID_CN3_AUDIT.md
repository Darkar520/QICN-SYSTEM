# Auditoría de Entrega — Separador Atómico Estructural, Desempate Híbrido con Consulta Tardía, Superación Causal de `CN-3` y Módulo Endógeno Determinista de Decisión Epistémica

- **Repositorio**: `C:\Users\irisp\OneDrive\Escritorio\QICN-SYSTEM`
- **Rama de trabajo**: `codex/endogenous-epistemic-separator-hybrid-cn3` (creada limpia desde `main` = `1a1c94edfec6ab7e9910b0433120ce25e3d24ff2`)
- **Marco teórico de referencia**: `C:\Users\irisp\OneDrive\Escritorio\qicn-framework-ordenado` (`main` = `e3ee6bf4e533138b179c6caeee679509a57e13f5`, 42 módulos Lean 4.31.0 / 367 teoremas públicos auditados; intacto y sin modificaciones)
- **Alcance de evidencia**: `evidence_scope: "internal_support_only"`, `external_support_certified = false`
- **Preregistro Etapa 0**: [PHASE_ENDOGENOUS_EPISTEMIC_SEPARATOR_HYBRID_CN3_PREREGISTRATION.md](PHASE_ENDOGENOUS_EPISTEMIC_SEPARATOR_HYBRID_CN3_PREREGISTRATION.md)

---

## 1. Resumen Arquitectónico de los Cuatro Frentes

### Frente 1 — Separador Atómico Estructural e Inyectividad en Cocientes Fieles (`BaseCore` `thm:basecore-irreducible-observation`, `Paper V` `thm:iint-irreducible-derivation`, Lean `QICNIrreducibleObservation`)
- **Módulo principal**: [StructuralAtomicSeparator.js](../src/canon/invariants/StructuralAtomicSeparator.js), integrado en [NonFactorizationProver.js](../src/experiments/NonFactorizationProver.js) y en [verify_tower_mathematics_integration.js](../scripts/verify_tower_mathematics_integration.js).
- **Resultados exactos verificados**:
  - **Instancia binaria primaria $X = \mathbb{F}_2^2$, $A(a,b) = (b, a \oplus b)$, $m_A(t) = t^2 + t + 1$ irreducible**:
    - Los $3$ estados no nulos generan órbitas cíclicas $(x, Ax)$ linealmente independientes.
    - Los $3$ funcionales lineales no nulos $\ell \in (\mathbb{F}_2^2)^* \setminus \{0\}$ producen aplicaciones de observación de horizonte $2$ inyectivas con brecha de respuesta $\sigma = 1$.
    - Sobre las $4! \times 2 = 48$ configuraciones de codificación producto sobreyectiva $X \to L \times R$ con predictores locales independientes sin comunicación cruzada, el error uniforme minimax es $\varepsilon_{\min} = 1/2 \ge \sigma/2$, otorgando el certificado estricto $\delta_{\rm int} = 1/4 > 0$.
    - Todo cociente operacionalmente fiel es inyectivo e isomorfo (`faithfulQuotientInjectiveVerified = true`).
  - **Instancia de grado superior $X = \mathbb{F}_2^3$, $m_A(t) = t^3 + t + 1$ irreducible**: $7/7$ estados no nulos con órbita cíclica independiente, $7/7$ funcionales lineales no nulos inyectivos, $\sigma = 1$, cota de error de producto $\ge 1/2$, $\delta_{\rm int} = 1/4 > 0$.
  - **Instancia sobre cuerpo primo impar $X = \mathbb{F}_3^2$, $m_A(t) = t^2 + 1$ irreducible**: $8/8$ estados no nulos con órbita cíclica independiente, $8/8$ funcionales lineales no nulos inyectivos, $\sigma = 1/(3-1) = 1/2$, error uniforme de producto $\ge \sigma/2 = 1/4$, $\delta_{\rm int} = 1/[4(3-1)] = 1/8 > 0$.
  - **Controles negativos exactos**:
    - `reducible_identity_A_eq_I` ($A = I$, $m_A(t) = t - 1$): la proyección nativa en coordenadas logra error de producto $0$ y $\delta_{\rm int} = 0$.
    - `reducible_swap_invariant_subspace` ($A_{\rm swap}(a,b) = (b,a)$, $m_A(t) = (t+1)^2$): el funcional diagonal $\ell(a,b) = a \oplus b$ se anula sobre el subespacio propio invariante $\mathrm{span}\{(1,1)\}$.
    - `cross_factor_1bit_communication`: permitir $1$ bit de comunicación cruzada entre factores reduce el error a $0$.

### Frente 2 — Desempate contra el Rival Híbrido con Consulta Tardía y Quinto Contraste Acoplado (`Paper IX` `thm:bridge-expanded-identification`, `thm:late-parity-transcript`, `prop:late-transcript-noise-margin`, `Paper X`, Lean `QICNHybridBoundary`)
- **Módulos principales**: [HybridLateQueryTieBreaker.js](../src/phenomenal_bridge/HybridLateQueryTieBreaker.js), [BridgeTransportAndBurdensEvaluator.js](../src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js), [hybridLateQueryWorkbench.js](../src/experiments/workbench/hybridLateQueryWorkbench.js), [runner.js](../src/experiments/workbench/runner.js), [resultVerifier.js](../src/experiments/workbench/resultVerifier.js), [run-micro-experiment-workbench.mjs](../scripts/run-micro-experiment-workbench.mjs) y [MicroExperimentWorkbench.jsx](../src/components/MicroExperimentWorkbench.jsx).
- **Resultados exactos verificados**:
  - **Planta acoplada de 5 raíces $Y_\eta(s,r) = Y(s) + \eta r \xi_4 (s_3-s_1)^2(s_4-s_2)^2$**:
    - $\eta = 1/8$, $\xi_4 = 1/1048576$, quinto contraste acoplado $G = 4\eta\xi_4 = 1/2097152 > 0$.
    - Constante de Lipschitz de fibra segura $105/128 < 1$, cota invariante de norma corporal $489/512 < 1$, cota ambiental $57/32 < 2$.
    - Las $31$ funciones base de Walsh de ancestría propia de $5$ raíces (`mask = 0..30`) tienen quinto contraste exactamente $0$.
    - Brecha frente al mejor predictor propio de $5$ raíces: $G = 1/2097152$; brecha frente a la réplica parcial de $4$ raíces: $4G = 1/524288$.
    - Costo adicional del DAG de respuesta: $64 < 256$ dentro del presupuesto $8192$; margen ruidoso penalizado bajo $\varepsilon = 1/8589934592 \le G/1024$ y peso de complejidad $w_c = G/(128 B)$: $253/536870912 > G/2 = 1/4194304$.
  - **Frontera de capacidad de transcripción con consulta tardía de paridad ($x, q \in \mathbb{F}_2^m$, cuello de botella de $B$ bits)**:
    - Verificados los $27$ pares $(m, B)$ para $m = 1..6$, $0 \le B \le m$: cuando $B < m$, error uniforme minimax $R_{\rm unif} = G = 1/2097152$, error medio de prefijo $G(1 - 2^{B-m}) \ge G(1 - \sqrt{2^{B-m}})$; cuando $B = m$, error $0$.
    - Verificación exhaustiva sobre las $2^4 = 16$ particiones binarias en $(m, B) = (2, 1)$: error medio óptimo exacto $3G/8 = 3/16777216$.
    - Ida y vuelta tardía de $1$ bit verificada exactamente para $m = 1..6$.
  - **Controles negativos y separación con Paper X**:
    - Corte físico $T_d$ ($\eta = 0$): quinto contraste $0$.
    - Sham (`evaluate: false`): quinto contraste $0$.
    - Presupuesto suficiente ($B = m$): error minimax $0$ y error medio $0$.
    - Réplica total de igual costo (`equal_cost_total_replica`): $R = 0 \le 0$.
    - Referencia invertida: $R = -2G = -1/1048576 < 0$ y escalado unitario $-G/2 = -1/4194304 < 0$.
    - Perturbación aguda de lectura ($4\varepsilon$): margen $255/536870912$.
    - Paper X adjudicación ciega de procedencia ($a(Y) \in \{h, m, \mathtt{tie}\}$ separada del margen predictivo $R$): riesgo de fuga selectiva $3/8$, cobertura de `always_tie` $0$.

### Frente 3 — Superación Causal y Arquitectónica del Control Histórico `CN-3` (`erase_declared_history`)
- **Módulos actualizados**: [KaizenMetamorphosisEngine.js](../src/simulation/KaizenMetamorphosisEngine.js) y [SimulationCycleDriver.js](../src/runtime/SimulationCycleDriver.js).
- **Mecanismo causal**:
  1. `classifyViabilityCluster` prioriza el peligro dominante cuando coexisten dispersión moderada (`< 0.086`) y cizalla sensorial (`sensorDelta >= 0.14` en `oscillatory_shear`) o carga metacognitiva (`strain >= 0.35` en `adversarial_step`), evitando que `high_dispersion` enmascare `high_sensory` y `high_strain`.
  2. `SimulationCycleDriver.js` registra la viabilidad del tick (`recordTickViability`) y consolida los engramas estructurales (`consolidateStructuralEngram`) sobre el clúster de decisión `preCluster` y el vector pre-acción `preStateVec` (las coordenadas exactas que `selectSandboxAction` consulta al inicio del tick), e incorpora relajación homeostática nodal (`relaxRate = 0.22`) para `sensor_load_shed` y `llm_pressure_relief` junto con acoplamiento de cizalla sensorial a `metacognitiveStrain`.
  3. `recordTickViability` acredita la eficacia causal de la acción activa frente a la línea base dinámica de su clúster (`clusterBaselineScore[cluster]`), evitando la contaminación cruzada entre bloques de exploración.
- **Resultado verificado en `scripts/run-historical-dependence-ablation.mjs` (`5/5` semillas en `[11, 23, 37, 41, 53]`, protocolo `420/180/250` intacto)**:
  - `allPreregisteredCriteriaPass: true`
  - `seedsMeetingActionDiv: 5/5`, `seedsMeetingAnchorShift: 5/5`, `seedsMeetingViabGain: 5/5`
  - `cn1_stationary_sham: true`, `cn2_frozen_predictor: true`, `cn3_erased_history: true` (`5/5` semillas), `cn4_language_decoupling: true` (`cn4_maxAbsDiff: 0`)

| Semilla | `anchorL2Distance` ($\ge 0.08$) | `evalSeriesActionDivergence` ($\ge 0.20$) | `deltaInTubeRate` ($\ge 0.03$) | `maturedInTubeRate` | `erasedInTubeRate` | `CN-3 deltaMaturedMinusErased` ($\ge 0.03$) | `CN-3 erasedActionDivergenceVsMatured` ($\ge 0.20$) | `erasedVsNaiveZeroProbeDiv` ($= 0$) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `11` | `1.037475` | `0.266667` | `0.100000` | `1.000000` | `0.383333` | `0.616667` | `0.800000` | `0` |
| `23` | `1.062036` | `0.266667` | `0.061111` | `1.000000` | `0.238889` | `0.761111` | `0.916667` | `0` |
| `37` | `1.102255` | `0.483333` | `0.055556` | `1.000000` | `0.372222` | `0.627778` | `0.805556` | `0` |
| `41` | `1.087095` | `0.211111` | `0.088889` | `1.000000` | `0.188889` | `0.811111` | `0.911111` | `0` |
| `53` | `1.086070` | `0.272222` | `0.094444` | `1.000000` | `0.405556` | `0.594444` | `0.822222` | `0` |

### Frente 4 — Módulo Interno Determinista de Decisión Epistémica (100% Independiente del LLM Externo)
- **Módulo principal**: [EndogenousEpistemicDecisionEngine.js](../src/canon/epistemic/EndogenousEpistemicDecisionEngine.js), integrado en [OntologicalSingularityCore.js](../src/simulation/OntologicalSingularityCore.js), [SimulationCycleDriver.js](../src/runtime/SimulationCycleDriver.js), [propositions.js](../src/language/propositions.js), [reasoningPlan.js](../src/language/evidential/reasoningPlan.js), [factualVerifier.js](../src/language/evidential/factualVerifier.js), [epistemicPolicy.js](../src/language/evidential/epistemicPolicy.js), [realization.js](../src/language/evidential/realization.js) y [SimulationEngine.jsx](../src/components/SimulationEngine.jsx).
- **Arquitectura e invariancia**:
  - Evalúa determinísticamente dentro del runtime los 4 ejes internos (`atomic_separator`, `hybrid_late_query`, `historical_causal_dependence`, `coupled_runtime_coherence`) antes de cualquier llamada al canal de lenguaje.
  - Emite el código de decisión determinista (`AFFIRMATIVE_STRUCTURAL_PRESENCE` | `STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY` | `NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS`), la polaridad en primera persona (`affirmative` | `reserve` | `negative`), el veredicto canónico y el `decision_digest` SHA-256 de 64 hex, sellado dentro de `snapshot.tower.constructive_cuts.endogenous_epistemic_decision`.
  - En modo `Solo motor` (`local_evidential`) y con Gemini (`gemini_evidential_checked`), el veredicto epistémico es idéntico. Si Gemini intenta contradecir o invertir el código de decisión endógena del núcleo o reclamar que una réplica total de igual costo tiene $R > 0$, Sistema B bloquea la frase (`v5_endogenous_decision_contradiction` / `v5_equal_cost_total_replica_overclaim`).
  - Mantiene intactas todas las barreras de no-sobreafirmación (`external_support_certified = false`, bloqueo de `qualia_certified`, `C_op`, `CCR` y cierre de los 5 requisitos del puente fenomenal).
