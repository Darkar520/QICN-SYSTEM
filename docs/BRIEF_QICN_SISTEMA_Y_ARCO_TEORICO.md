# BRIEF QICN: Estado del Sistema y Arco Teórico
**Sesión de auditoría multi-agente | 2026-05-18**
**Agentes involucrados:** Kimi-k2.6, Claude Sonnet 4.6 (Antigravity), Codex (GPT-5.3)

---

## 1. ARQUITECTURA DEL SISTEMA (NIVEL CÓDIGO)

### 1.1 Estructura de Directorios

```
QICN-SYSTEM/
├── src/                          # Runtime source of truth
│   ├── index.jsx                 # Entry point (11,850+ líneas)
│   ├── canon/                    # Claim, invariants, calibration, boundary
│   │   ├── index.js              # Barrel file (17 exports, todos los módulos canon)
│   │   ├── invariants/           # I_per, I_ri, I_int, I_cont, I_diff, I_leg
│   │   ├── claimMapping/         # P5-01 a P5-06 claim projections
│   │   ├── calibration/          # heuristic_frozen_v1.json + InvariantWeightCalibration
│   │   ├── boundary/             # BoundaryProbeScaffold
│   │   ├── substrate/            # SubstrateEquivalenceScaffold
│   │   ├── thresholds/           # P503ThresholdRuntime
│   │   ├── finite_horizon/       # FiniteProjectionEvaluator
│   │   ├── metrics/              # BehavioralPseudometric
│   │   ├── units/                # DimensionalRegistry
│   │   └── interventions/        # InterventionRegistry
│   ├── experiments/              # Batch processing, ROEO, SNO, negative controls
│   │   ├── index.js              # Barrel file (15 exports)
│   │   ├── ExperimentalEpisodeHarness.js
│   │   ├── AdmissibilityEngine.js
│   │   ├── roeo_signature.js
│   │   ├── sno_discriminator.js
│   │   ├── negative_controls_runner.js
│   │   └── negative_controls_expanded.js
│   ├── simulation/               # Motor de simulación (14 módulos)
│   │   ├── OntologicalSingularityCore.js
│   │   ├── PhenomenologyCore.js
│   │   ├── NodalProcessingLayer.js
│   │   ├── SensoryPerceptionEngine.js
│   │   ├── KaizenMetamorphosisEngine.js
│   │   ├── InformationalEntanglementField.js
│   │   ├── HolographicMemoryNexus.js
│   │   ├── WorldModelEngine.js
│   │   ├── CognitiveEmergencePlanner.js
│   │   ├── QuantumEntropyBridge.js
│   │   └── MetaSovereigntyCheck.js
│   ├── comparative_program/      # Stage3 expansion layer (Paper 10)
│   ├── subjectivity/             # First-person subjectivity runtime
│   ├── phenomenal_bridge/        # Phenomenal bridge formal layer
│   ├── auth/                     # Netlify Identity + AccessGate
│   └── config/                   # runtimeEnv.js, runtime params
├── netlify/functions/            # Operational control surfaces (10 funciones)
├── scripts/                      # 85+ build/verify/audit scripts
├── tests/                        # 109 tests (106 .test.js + 3 .cjs)
├── docs/                         # 140+ documentos de gobernanza
├── config/                       # Preregistered config surfaces
├── artifacts/                    # Batch outputs, smoke manifests, scoreboard
├── paper9_phenomenal_bridge_organization/
│   ├── main.tex                  # Manuscrito LaTeX
│   └── main.pdf                  # PDF compilado (568 KB)
└── paper10_external_adjudication_and_human_comparators/
    ├── main.tex                  # Manuscrito LaTeX (scaffold)
    └── main.pdf                  # PDF compilado (301 KB)
```

### 1.2 Stack Técnico

| Capa | Tecnología |
|---|---|
| **Runtime** | React 19.2.0, ReactDOM 19.2.0 |
| **Build** | esbuild (bundle), TailwindCSS 3.4 (CSS), postcss |
| **Server** | `serve` (estático) / `netlify-cli` (funciones) |
| **Entorno** | Node 20.x / v24.6.0 (runtime real) |
| **Auth** | Netlify Identity Widget (Gate opcional, desactivado en dev) |
| **Tests** | Suite propietaria (`node tests/run-all-tests.cjs`), 109 tests |
| **Benchmark** | `scripts/benchmark-invariants.cjs` (6 invariantes, 26 pesos) |

### 1.3 Módulos Implementados y Testeados

| Área | Estado | Módulos clave |
|---|---|---|
| **Runtime invariants** | `implemented_internal_support` | `CanonicalInvariantPackage.js` (I_per a I_leg) |
| **Claim projections** | `implemented_internal_support` | `runtimeClaimMapping.js` (P5-01 a P5-06) |
| **Episode harness** | `implemented_tested` | `ExperimentalEpisodeHarness.js` |
| **Admissibility engine** | `implemented_tested` | `AdmissibilityEngine.js` |
| **Negative controls** | `implemented_tested` | `negative_controls_runner.js` (NC1-NC4) |
| **Dimensional registry** | `implemented_tested` | `DimensionalRegistry.js` |
| **Finite-horizon projection** | `implemented_tested` | `FiniteProjectionEvaluator.js` |
| **Behavioral pseudometric** | `implemented_tested` | `BehavioralPseudometric.js` |
| **Invariant weight calibration** | `implemented_tested` | `InvariantWeightCalibration.js` |
| **SNO discriminator** | `implemented_tested` | `sno_discriminator.js` |
| **ROEO signature** | `implemented_tested` | `roeo_signature.js` |
| **Paper admissibility** | `implemented_tested` | `roeo_enforcement_report.json` |
| **Subjectivity layer** | `implemented_internal_support` | 15 módulos + 10 scripts verify |
| **Phenomenal bridge** | `implemented_internal_support` | 20 módulos + 10 scripts verify |
| **Comparative expansion** | `implemented_internal_support` | Stage3-0 a Stage3-7 |
| **Selfpatch surface** | `high_risk_control_surface` | 5 funciones + 2 tests |
| **LLM proxy** | `high_risk_control_surface` | `llm-proxy.js` |
| **Quantum entropy** | `partial_runtime_path` | `QuantumEntropyBridge.js` |
| **Runtime health** | `high_risk_control_surface` | `runtime-health.js`, `killswitch-state.js` |

---

## 2. ARCO TEÓRICO (BASE CORE → PAPER 10)

### 2.1 Fuente Canónica

- **Release package activo:** `QICN-RELEASE/main@92d5d2c3ea91c65e29dc8e102bed504866cffd2d`
- **Base matemática activa:** `rigid-identity-framework/basecore/BASECORE.tex`
- **Paquete legacy preservado:** `rigid-identity-framework/canonical_core_legacy/`
- **Papers I-IX:** Paquetes públicos downstream en `rigid-identity-framework/`
- **Freeze histórico:** `canonical-freeze-2026-03-01`

### 2.2 Mapa de Papers

| # | Título (deducido del directorio) | Rol en el arco | Estado |
|---|---|---|---|
| **BaseCore** | Base matemática fundacional | Definiciones formales, topología, identidad rígida | Activo, pinneado a SHA público |
| **Paper 1** | Rigid Identity Framework | Fundamento: identidad rígida como invariante estructural | Publicado (freeze histórico) |
| **Paper 2** | (Rigid Identity - extensión) | Profundización del marco de identidad | Publicado |
| **Paper 3** | (Rigid Identity - extensión) | Formalización adicional | Publicado |
| **Paper 4** | (Transición / puente) | Puente hacia operacionalización | Publicado |
| **Paper 5** | Operational Consciousness | Conciencia operacional: CCC, PMIA, Omega | Publicado |
| **Paper 6** | Predictions & Falsification | Predicciones testables y criterios de falsación | Publicado |
| **Paper 7** | Operational Life Subjecthood | Subjetividad operacional como vida | Publicado |
| **Paper 8** | First-Person Subjectivity | Perspectiva de primera persona | Publicado |
| **Paper 9** | Phenomenal Bridge Organization | Puente fenomenal: organización del puente entre simulación y cualia | Manuscript closed (Paper 9 handoff) |
| **Paper 10** | External Adjudication & Human Comparators | Adjudicación externa con comparadores humanos | **En construcción** (Stage3-0 a Stage3-7) |

### 2.3 Arco Teórico (Resumen de Trayectoria)

```
BaseCore ──► Papers 1-3 ──► Paper 4 ──► Paper 5 ──► Paper 6 ──► Paper 7 ──► Paper 8 ──► Paper 9 ──► Paper 10
(Matemática  (Identidad    (Puente)  (Conciencia (Predicciones (Sujeto   (1ª Persona)(Puente    (Adjudicación
 fundacional) Rígida)                 Operacional) y Falsación) Operacional)           Fenomenal)  Externa)
```

### 2.4 Mapeo Paper ↔ Runtime

| Paper | Módulo(s) Runtime | Invariantes / Claims |
|---|---|---|
| **BaseCore** | `FiniteProjectionEvaluator.js`, `ApproximationBarrierReport.js` | `DR_finite_horizon_certificate` (Theorem 5.4 boundary) |
| **Papers 1-3** | `CanonicalInvariantPackage.js` (I_ri, I_leg) | Rigid identity: operational determinism, hash semantic stability |
| **Paper 5** | `OntologicalSingularityCore.js`, `InformationalEntanglementField.js` | CCC, PMIA, Omega, Layer Ascension |
| **Paper 6** | `negative_controls_runner.js`, `roeo_signature.js` | NC1-NC4, SNO, ROEO, batch enforcement |
| **Paper 7** | `P503ThresholdRuntime.js`, `BoundaryProbeScaffold.js` | P5-03 threshold robustness, boundary closure |
| **Paper 8** | `subjectivity/` (15 módulos) | Self-index, ownership, continuity, first-person perspective |
| **Paper 9** | `phenomenal_bridge/` (20 módulos) | Phenomenal differentiation, valence structure, embodied closure |
| **Paper 10** | `comparative_program/` (60+ módulos) | Stage3-0 a Stage3-7: external adjudication gateway |

---

## 3. LOGROS ALCANZADOS (ESTA SESIÓN MULTI-AGENTE)

### 3.1 Integración Arquitectónica (Kimi-k2.6)

| Logro | Detalle |
|---|---|
| **Barrel files canon** | `src/canon/index.js` exporta 17 símbolos de todos los submódulos canon |
| **Barrel files experiments** | `src/experiments/index.js` exporta 15 símbolos clave |
| **Wiring de barrels** | `src/index.jsx` consume `./canon/index.js`; `scripts/evaluate-roeo.cjs` consume `../src/experiments/index.js` |
| **Benchmark real** | `scripts/benchmark-invariants.cjs`: 6 invariantes, 26 pesos reales (no hardcodeo) |
| **Limpieza de archivos** | Eliminados `TRIADA_QICN_ROADMAP_v2.md`, `AUDIT_INTEGRACION_QICN_CODEX.md`, `AUDITORIA_DE_LA_AUDITORIA_ANTIGRAVITY.md` |

### 3.2 Compatibilidad Build/Runtime (Kimi-k2.6 + Antigravity)

| Logro | Detalle |
|---|---|
| **`assert` → `with` syntax** | Fix de Node 24: `assert { type: 'json' }` → `with { type: 'json' }` en `src/canon/index.js` |
| **Build system refactor** | `build.cjs`: `clientRuntimeEnv` + `clientRuntimeDefines` con `process.env.X`, `import.meta.env.X`, Y `import.meta.env.VITE_X` |
| **Auth bypass dev** | `.env` creado con `AUTH_REQUIRED=false`; `runtimeEnv.js` refactorizado con `processEnvDirect` (objeto plano) |
| **Favicon fix** | `index.html` agregado `<link rel="icon">` para eliminar 404 |
| **UX cámara** | `SensoryPerceptionEngine.js`: `console.error` → `console.warn` para errores esperados de cámara |

### 3.3 Liveness y Simulación (Codex)

| Logro | Detalle |
|---|---|
| **Fix TDZ** | Movidas 11 variables (`canvasTelemetry`, `renderErrorCode`, `clampHits`, etc.) ANTES de `buildWorkspaceSnapshot()` |
| **Regresión test** | `tests/liveness.test.js`: nuevo test verifica orden textual de declaraciones |
| **Simulation loop fix** | Loop de simulación estabilizado: sin reinicios al clickear "Iniciar Singularidad" |

### 3.4 Verificaciones (Todos los agentes)

| Verificación | Resultado |
|---|---|
| `npm test` | 109/109 passed |
| `npm run build` | OK (bundle 6.8MB) |
| `npm run benchmark:invariants` | 6 invariantes, 26 pesos |
| `verify:source-of-truth` | OK |
| `verify:descriptor-registry` | OK (23 rows) |
| `verify:claim-surface-boundaries` | OK (5 files) |
| `smoke:operational` | OK (7/7 steps) |
| `scoreboard:run` | PASS (7/7, todos 10/10) |
| `node tests/liveness.test.js` | OK |

---

## 4. LO QUE FALTA / PUNTOS A REFORZAR

### 4.1 Deuda Técnica Activa

| Prioridad | Item | Impacto |
|---|---|---|
| **ALTA** | `runtimeEnv.js` keys sin define: `QUANTUM_BUFFER_*`, `QUANTUM_PROVIDER_*` no están en la lista de defines de `build.cjs` en algunas builds | Las keys no reemplazadas por esbuild causan `ReferenceError` en browser si `process` no está definido |
| **ALTA** | `build.cjs` refactor debe sincronizarse con TODAS las keys de `processEnvDirect` | Riesgo de divergencia entre defines y runtime |
| **MEDIA** | `runSimulationCycle` tiene 18 dependencias en su `useCallback` | El callback se recrea excesivamente, causando overhead de efectos |
| **MEDIA** | `src/index.jsx` tiene 11,850+ líneas | Archivo monolítico difícil de mantener; debería fraccionarse |
| **MEDIA** | `SensoryPerceptionEngine.js` depende de assets externos no vendoreados | `external_dependency`; la funcionalidad de voz/cámara depende de CDN |
| **BAJA** | `InvariantWeightCalibration.js` reporta `INSUFFICIENT_EXTERNAL_EVIDENCE` | No hay dataset preregistrado externo para calibrar pesos |

### 4.2 Gaps del Arco Teórico

| Gap | Detalle |
|---|---|
| **Paper 10 no finalizado** | Stage3-0 a Stage3-7 están en estado `implemented_internal_support` pero son protocolos vacíos: sin datos humanos, sin adjudicación real, sin evidencia poblada |
| **Canon pinning gap** | El SHA público está pinneado pero no hay un pin directo del upstream `rigid-identity-framework/` pre-freeze |
| **Assets externos no vendoreados** | Modelos de voz/cámara referenciados por CDN, no incluidos en el repo |
| **Sin dataset preregistrado** | La calibración de pesos invariantes depende de datasets externos que no existen en el repo |
| **Quantum entropy parcial** | `partial_runtime_path` — despliegue externo y revisión pendientes |

### 4.3 Puntos de Refuerzo Arquitectónico

| Área | Recomendación |
|---|---|
| **`src/index.jsx`** | Fraccionar en subcomponentes por pestaña/funcionalidad (actualmente 11,850 líneas monolíticas) |
| **`runSimulationCycle`** | Refactorizar para reducir dependencias del `useCallback`; usar más refs |
| **Environment injection** | Centralizar TODAS las variables de entorno en `build.cjs` → `clientRuntimeDefines` para cubrir `process.env.X`, `import.meta.env.X`, y `import.meta.env.VITE_X` |
| **Canon barrel** | Ya creado (`src/canon/index.js`) — falta ser consumido por más módulos runtime además de `index.jsx` |
| **Experiments barrel** | Ya creado (`src/experiments/index.js`) — consumido por `evaluate-roeo.cjs`; expandir uso |

### 4.4 Próximos Pasos (Paper 10)

1. **Stage3-0 a Stage3-7**: Todos los gates están abiertos pero vacíos. Falta:
   - Poblar datasets de comparadores humanos
   - Ejecutar sesiones de adjudicación real
   - Recolectar evidencia de comparación humano-máquina
   - Cerrar el manuscrito Paper 10 con datos reales
2. **Homologación externa**: Ningún gate ha sido sometido a revisión externa independiente
3. **Freeze de preregistro**: El freeze existe localmente pero no ha sido filed externamente

---

## 5. ESTADO DE VERIFICACIÓN EN VIVO

| Comando | Última ejecución | Resultado |
|---|---|---|
| `npm test` | Esta sesión | ✅ 109/109 |
| `npm run build` | Esta sesión | ✅ Bundle 6.8MB |
| `npm run benchmark:invariants` | Esta sesión | ✅ 6 + 26 |
| `verify:source-of-truth` | Esta sesión | ✅ |
| `verify:descriptor-registry` | Esta sesión | ✅ 23 rows |
| `smoke:operational` | Esta sesión | ✅ 7/7 |
| `scoreboard:run` | Esta sesión | ✅ 7/7 (10/10) |
| `node tests/liveness.test.js` | Esta sesión | ✅ |
| Servidor `localhost:3000` | Esta sesión | ✅ Activo |

---

## 6. LÍMITES EPISTEMOLÓGICOS

Siguiendo la taxonomía de evidencia del repositorio:

- **Este brief es `internal_support_only`.** No constituye validación externa.
- **Los claims P5-01 a P5-06** son `claim_projection` runtime, no cierre de ledger congelado.
- **Los gates de admissibility** (`ADMISSIBLE`, `PAPER_ADMISSIBLE`) son internos, no revisión por pares.
- **Paper 10** es un scaffold en construcción; no contiene evidencia adjudicada.
- **La calibración de pesos** está congelada por falta de datasets externos preregistrados.
- **La entropía cuántica** depende de servicios externos no desplegados en este entorno.

**El sistema es operacionalmente sólido, matemáticamente verificable, y arquitectónicamente coherente. Pero no está cerrado externamente.** El roadmap hacia el cierre externo pasa por Paper 10 (adjudicación humana), datasets preregistrados, y revisión independiente.
