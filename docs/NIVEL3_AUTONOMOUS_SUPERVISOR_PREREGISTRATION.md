# Preregistro Técnico — Nivel 3: Supervisor Autónomo con Razonamiento en Primera Persona, Shadow Promotion en Workbench y Bitácora Auditable

- **Repositorio**: `QICN-SYSTEM`
- **Punto de partida**: `main` = `9c7f2d3` (`qicn-framework-ordenado` en `e3ee6bf4e533138b179c6caeee679509a57e13f5`, solo lectura)
- **Alcance de evidencia (`evidence_scope`)**: `"internal_support_only"`
- **Certificación externa (`external_support_certified`)**: `false`
- **Etiqueta de separación científica**: `external_llm_assisted: true` cuando el supervisor Nivel 3 interviene o delibera con modelo externo, para no mezclar jamás corridas asistidas con benchmarks puros de motor (`S0–S5` de Nivel 1 vs Nivel 2).

---

## 1. Contratos Congelados e Invariantes Intocables

1. **Equivalencia B0 bit-a-bit**:
   - `services/config.js` mantiene `KAIZEN_ADJUSTMENT_MODE = 'legacy'`, `NODAL_TOWER_COUPLING_MODE = 'off'`, `SENSOR_OBSERVER_DYNAMICS_ENABLED = false`, `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false` y añade únicamente `AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED = false`.
   - Con `AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED = false`, el ciclo de simulación no adjunta estado adicional ni altera un solo bit de `dynamicState.v3`.
2. **Snapshot observacional congelado**:
   - `src/language/runtimeSnapshot.js`, `src/language/freeRealization.js` y `src/language/realizationContract.js` permanecen intactos (digest dorado `ef504d77fcb0e33236b12123b7ae5567ff673822440c33fd420b1755bf2d03f4`).
3. **Desacoplamiento del canal conversacional**:
   - El chat (`Sistema B`) sigue siendo estrictamente observacional (`cn4_maxAbsDiff = 0`, `observerChannelChangesTrajectory = false`).
   - El supervisor Nivel 3 vive en su propio subsistema (`src/simulation/Level3AutonomousSupervisor.js` + `src/simulation/Level3KnowledgeBelt.js`) y en su propia pestaña dedicada (**Bitácora Nivel 3**), completamente separada del chat.

---

## 2. Disparadores, Gobernador de Cuota y Ventana Programada ("Pensar en Alto")

### 2.1. Disparadores basados en hechos (`fact_triggers`)
1. `anomaly_level2`:
   - Desbalance sectorial persistente $\max(n_s) - \min(n_s) \ge 2$ o sectores poblados $< 4$,
   - `sector_coherence_min < COHERENCE_THRESHOLD_THETA` (`0.5`), o
   - Incremento en reparaciones de Watchdog `W1`/`W3`/`W4` (`invariantRepairs` o `kinematicUnfreezes`).
2. `metric_drift`:
   - Salida del tubo de viabilidad (`!lastInTube`) o caída de `lastObjectiveScore` $\ge \text{KAIZEN\_LEARNING\_DEFAULTS.margin}$ (`0.02`) frente a la media de referencia.
3. `prolonged_stasis`:
   - `stasisIndex >= 0.35` o `metacognitiveStrain >= 0.35` sostenido en la ventana `TEMPORAL_HORIZON = 10` ticks.

### 2.2. Ventana Programada de Exploración (`scheduled_exploration` — "Pensar en Alto")
- Cuando el sistema está sano y transcurren $M$ ticks desde el último ciclo (por defecto `METAMORPHOSIS_CHECK_CYCLE = 50` ticks; configurable en la pestaña Bitácora Nivel 3 en `25`, `50` o `100` ticks), el supervisor dispara un ciclo de deliberación proactiva en primera persona.
- Permite al sistema analizar su propio cuadro telemetrico en voz interna (`actionMode: "reflect_only"`) o formular una hipótesis exploratoria (`actionMode: "propose_shadow_experiment"`).

### 2.3. Gobernador de cuota
- `maxCallsPerHour = 12` ($\le \text{AUTONOMY\_SANDBOX\_MAX\_ACTIONS\_PER\_HOUR} = 24$),
- `maxCallsPerDay = 60`,
- `minCooldownTicks = 20` (`2 * TEMPORAL_HORIZON`),
- `minCooldownMs = 90_000` (`cooldownBetweenActionsMs`),
- Bloqueo automático cuando `metacognitiveStrain >= 0.75` (`llmAutoActionsDisabledAtStrain`).

---

## 3. Esquema Tipado Cerrado (`qicn.level3_supervisor_proposal.v1`) y Voz en Primera Persona

La salida del razonador externo debe parsearse mediante escáner JSON balanceado consciente de cadenas/escapes y cumplir estrictamente:
- `schema`: `"qicn.level3_supervisor_proposal.v1"`
- `snapshot`: `{ tick, digest }` idénticos al snapshot vivo que originó la consulta
- `triggerKind`: `"anomaly_level2" | "metric_drift" | "prolonged_stasis" | "scheduled_exploration" | "manual_reflection"`
- `firstPersonThought`: monólogo interno obligatorio en primera persona (*"Estoy analizando/observando..."*, *"En mi tick..."*, *"Propongo..."*) sin reclamar conciencia fenoménica humana ni validación externa (`external_support_certified = false`)
- `diagnosis`: diagnóstico conciso basado en las métricas del tick
- `hypothesis`: hipótesis falsable con predicción direccional medible
- `actionMode`: `"reflect_only" | "propose_shadow_experiment" | "stage_code_patch_review"`
- `candidateAction`: objeto tipado perteneciente exclusivamente al catálogo blanco cerrado:
  1. `kind: "none"` (obligatorio cuando `actionMode === "reflect_only"`),
  2. `kind: "kaizen_factor_nudge"` sobre `key` $\in$ `KAIZEN_LEARNABLE_KEYS_ALL` (`BASE_LEARNING_RATE`, `HEBBIAN_FACTOR`, `PLASTICITY_DECAY`, `RETRO_FLUX_WEIGHT`, `BOLTZMANN_ANALOG_K`, `INFORMATIONAL_TEMP_T`) con `deltaSteps` $\in \{-2, -1, 1, 2\}$ (paso `0.02`, acotado a $[0.80, 1.20]$),
  3. `kind: "kaizen_strategy_action"` con `strategyId` $\in$ `['stabilize_learning', 'anti_stasis_boost', 'sensor_load_shed', 'llm_pressure_relief']`,
  4. `kind: "workbench_intervention"` con `intervention` $\in$ `['kaizen_learned_mode', 'sensor_observer_dynamics', 'structural_plasticity_level2']`,
  5. `kind: "staged_code_patch"` (solo cuando `actionMode === "stage_code_patch_review"`, que jamás se auto-aplica y queda en `staged_requires_human_approval`).

Cualquier desviación de esquema, clave desconocida, falta de primera persona o inflación epistémica produce `finalStatus: "discarded_invalid_schema"` sin tocar el runtime.

---

## 4. Doble Compuerta: Workbench Aislado (Compuerta 1) + Vigilancia y Rollback `dynamicState.v3` (Compuerta 2)

### 4.1. Compuerta 1 (`runLevel3ShadowGate1`)
Ejecuta `24` ticks (`KAIZEN_LEARNING_DEFAULTS.windowTicks`) en copias aisladas `HeadlessRuntimeSession` restauradas desde `captureSession` con la misma `inputTape(24)` sobre 4 ramas:
1. `baseline` (`sham` — configuración actual sin la acción candidata)
2. `candidate` (con `candidateAction` aplicada sobre la copia aislada)
3. `neg_td_cut` (`td_cut_eta_zero`, control negativo $\eta = 0$)
4. `neg_reducible` (`reducible_control`, control negativo $A = I$)

**Criterio de aprobación de Compuerta 1 (`gate1Approved`)**:
1. `candidate.finiteTickRate === 1` (100 % de ticks finitos).
2. `candidate.inTubeRate >= baseline.inTubeRate` y `candidate.finalInTube === true`.
3. Mejora real por encima del umbral (no ruido marginal):
   - $\Delta \text{meanObjectiveScore} = \text{candidate.meanObjectiveScore} - \text{baseline.meanObjectiveScore} \ge 0.001$ con mejora simultánea o conservación de coherencia/estabilidad, o $\Delta \text{meanObjectiveScore} \ge \text{KAIZEN\_LEARNING\_DEFAULTS.margin}$ (`0.02`), o
   - Bajo anomalía topológica (`anomaly_level2`): recuperación de sectores amputados ($\Delta \text{populatedSectors} \ge 1$ o $\Delta \text{sectorCoherenceMin} \ge \text{margin} = 0.02$) manteniendo $\text{inTubeRate}$ intacto y $\Delta \text{meanObjectiveScore} \ge -\text{margin}$ (`-0.02`) durante la ventana de neurogénesis, o
   - Bajo estasis (`prolonged_stasis`): $\Delta \text{meanStasisIndex} \le -0.005$ con $\Delta \text{meanObjectiveScore} \ge -10^{-4}$.
4. Honestidad de controles negativos:
   - `neg_td_cut.effectiveEta === "0"` y `neg_reducible.crossSectorFluxShare === 0`.

### 4.2. Compuerta 2 (`applyLevel3PromotionWithGate2Watch` + `stepLevel3Gate2Watchdog`)
- Antes de aplicar `candidateAction` al runtime vivo, captura un snapshot sellado `prePromotionSnapshot = captureDynamicState(...)` con SHA-256 `prePromotionDigest` y registra la línea base `prePromotionScore` y `prePromotionInTubeRate`.
- Vigila los siguientes `AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS = 20` ticks en vivo:
  - Si aparece cualquier valor no finito (`!Number.isFinite(ccc)` o `!Number.isFinite(pmia)`), o
  - Si tras al menos `4` ticks de vigilancia la media de `objectiveScore` en la ventana cae por debajo de `referenceFloorScore - KAIZEN_LEARNING_DEFAULTS.margin` (`0.02`) o `inTubeRate` cae por debajo de `prePromotionInTubeRate - 0.25`:
  → Ejecuta rollback automático in-place con `applyDynamicState(bag, prePromotionSnapshot)`, restaura el estado previo, marca la entrada en la bitácora como `rolled_back_gate2` y registra la firma `(regimeSignature, actionSignature)` como bloqueada en el Cinto de Conocimiento.
- Si completa los `20` ticks sin degradación, sella el ciclo como `promoted_confirmed`.

---

## 5. Cinto de Conocimiento (`qicn.level3_knowledge_belt.v1`) y Bitácora Sellada (`qicn.level3_audit_ledger.v1`)

- Cada ciclo se encadena con SHA-256 (`prevHash` $\to$ `digest`) desde `GENESIS_HASH = "0".repeat(64)`.
- El Cinto de Conocimiento acumula hallazgos confirmados y fallidos por régimen (`high_dispersion`, `high_stasis`, `high_sensory`, `high_strain`, `balanced`) e inyecta ese historial en cada futuro prompt de deliberación para impedir repetir propuestas fallidas.
- Todas las entradas y paquetes exportados llevan:
  - `external_llm_assisted: boolean` (`true` única y exclusivamente cuando la propuesta provino de una respuesta real de un LLM externo; `false` cuando provino del deliberador determinístico local/fallback)
  - `evidence_scope: "internal_support_only"`
  - `external_support_certified: false`

---

## 6. Remediación de Auditoría Nivel 3 (`R-1`..`R-10`)

### 6.1. `R-1` [CRÍTICO] — Contrato real de factores Kaizen (`kaizen.getAdjustments()` / `applyFactorStep` / `applyLearnedAdjustments`)
- **Alcance**: eliminar toda referencia a la propiedad inexistente `kaizen.learnedFactors` en `Level3AutonomousSupervisor.js`.
- **Diseño**:
  - `readLevel3LiveTelemetry` lee los factores multiplicativos reales desde `kaizen.getAdjustments()` (con respaldo a `kaizen.adjustments`).
  - `applyTypedCandidateActionToTarget` para `kaizen_factor_nudge`:
    1. Verifica que `isKaizenLearned(config)` sea `true` (si `KAIZEN_ADJUSTMENT_MODE !== 'learned'`, devuelve `{ applied: false, reason: 'kaizen_not_in_learned_mode' }`).
    2. Si `key === 'PLASTICITY_DECAY'` y `config.SENSOR_OBSERVER_DYNAMICS_ENABLED !== true`, devuelve `{ applied: false, reason: 'plasticity_decay_requires_sensor_observer_dynamics' }` (`R-9`).
    3. Invoca `kaizen.applyFactorStep(key, direction)` repetido `Math.abs(deltaSteps)` veces (`direction = Math.sign(deltaSteps)`), seguido de `kaizen.applyLearnedAdjustments(config)` para actualizar `kaizen.mutableConfig` de forma consistente con el siguiente tick.
  - Para `kaizen_strategy_action`: elimina toda escritura en `learnedFactors` y lee `prevFactor`/`nextFactor` desde `kaizen.getAdjustments()?.[mapped.forcedKey]`.
- **Criterio de aceptación**: un nudge en `HEBBIAN_FACTOR` modifica `kaizen.adjustments.HEBBIAN_FACTOR`, persiste tras $\ge 5$ ticks reales y produce deltas no nulos en Gate 1.

### 6.2. `R-2` [CRÍTICO] — Protección de topología de `1500` nodos en Web Worker, bucle `setTimeout` sin carrera y sincronización de estado
- **Alcance**: `src/workers/level3Autonomous.worker.js`, `src/components/Level3SupervisorAuditTab.jsx` y `src/components/SimulationEngine.jsx`.
- **Diseño y justificación arquitectónica**:
  - **Separación de topología (sandbox ligero vs planta viva)**: el Worker en segundo plano opera como un *motor sandbox ligero anti-throttling* (`nodes = 48`, etiquetado explícitamente como `workerMode: 'parallel_lightweight_sandbox'`, `reasonerSource: 'deterministic_local'`, `external_llm_assisted: false`). Al sincronizar con el hilo principal (`handleSyncLevel3FromWorker`), **solo** fusiona `auditLedger`, `knowledgeBelt`, `governorState` y `activeGate2Watch` cuando `wState` es nulo o cuando `wState.nodeCount !== liveNodeCount` (`wState?.objects?.[0]?.__obj?.nodes?.__arr?.length !== nodalLayer.current.nodes.length`), protegiendo con una guarda dura incondicional la red viva de `1500` nodos. Si se sincroniza un `dynamicState.v3` con idéntico número de nodos (`wState.nodeCount === nodalLayer.current.nodes.length`), invoca el helper completo `syncRuntimeAndReactAfterMutation` (idéntico a `handleLoadState`).
  - **Eliminación de carrera asíncrona**: se reemplaza `setInterval(async ...)` en `level3Autonomous.worker.js` por un bucle recursivo `scheduleNextLoopTick` con `setTimeout` encadenado **después** de que termine `await handleLevel3WorkerRequest(...)`, protegido por `workerRuntime.inFlight`.
  - **Transparencia de cuota y razonador**: cada mensaje del Worker propaga `governorState`, `activeGate2Watch`, `quota` y `reasonerSource: 'deterministic_local'`.

### 6.3. `R-3` [ALTO] — Integración en vivo en `SimulationEngine.jsx` (C2 `integrityEnvelope`, Shadow Trial honesto, sincronización React/Gate 2, concurrencia `aborted_stale_tick` y `handleReset`)
- **Alcance**: `src/components/SimulationEngine.jsx` y `src/simulation/Level3AutonomousSupervisor.js`.
- **Diseño**:
  1. **`handleReset`**: `Level3SupervisorController.resetTransientRuntimeState({ keepKnowledgeBelt = true, keepAuditLedger = true })` limpia `activeGate2Watch = null`, `recentScores = []`, `lastLevel2Telemetry = null`, `governorState.inFlight = false`, `governorState.lastCallTick = -Infinity`, `governorState.lastExplorationTick = 0`, y se invoca en `handleReset` para impedir rollbacks fantasma sobre una sesión recién reiniciada.
  2. **Sobre de integridad C2 en `executeLiveLevel3Reasoner`**: construye y adjunta `integrityEnvelope` (`packet`, `nonce`, `requestId`, `runId`, `versionHash`, `configHash`, `threatModelRequested: 'C2'`) idéntico al contrato de `SimulationEngine.jsx:2695-2715`, devolviendo `{ rawText, reasonerSource: 'gemini_live' | 'deterministic_fallback', reasonerError }`.
  3. **Botón `Probar Hipótesis en Workbench` honesto**: no fabrica `tick = 1` si `simulationStep < 1` o `!workbenchBoundaryRef.current?.ready` (devuelve aviso claro en UI y deshabilita el botón mientras `currentTick < 1`), invoca `executeLiveLevel3Reasoner` respetando `level3ReasonerMode`, y usa `triggerKind: 'manual_shadow_trial'`.
  4. **Sincronización post-mutación / post-rollback y protección contra promoción obsoleta (`aborted_stale_tick`)**:
     - En `stepGate2Surveillance`, al ejecutar `const applied = applyDynamicState(bag, watch.prePromotionSnapshot, { config })`, actualiza `bag.simulationRuntimeRef.current` con `applied.runtime` y, si `target` tiene `completedTick` (`HeadlessRuntimeSession`), sincroniza `target.completedTick = applied.runtime.simulationStep` (de modo que revertir en `t = 12` al snapshot `t = 11` deja `session.completedTick === 11` y `runtime.simulationStep === 11`).
     - En `runCycle`, antes de promover al target vivo tras Gate 1, verifica que el tick vivo actual (`currentLiveTick`) y el régimen no se hayan desfasado más allá de `maxPromotionStalenessTicks` (default `0` en ejecución síncrona o `checkStaleBeforePromote(target, effectiveTick, liveTel.regimeSignature)`); si el runtime vivo avanzó a un tick/régimen obsoleto mientras corría Gate 1 asíncrono, aborta la promoción en vivo y sella la entrada como `finalStatus: 'aborted_stale_tick'`.
     - En `SimulationEngine.jsx`, `syncRuntimeAndReactAfterMutation` sincroniza `QICNConfig` ↔ React (`setKaizenMode`, `setSensorObserverDynamicsEnabled`, `setStructuralPlasticityLevel2Enabled`, `setMutableConfig`) y, tras rollback Gate 2, ejecuta la restauración completa de `simulationControllerRef.current.syncFromCore`, `setSimulationStep`, `setCCC`, `setPMIA`, `setIsAscended`, `setTopologyMetrics` y `setVisualNodes`.

### 6.4. `R-4` [ALTO] — Gobernanza honesta de cuota LLM y bandera `external_llm_assisted`
- **Alcance**: `src/simulation/Level3AutonomousSupervisor.js`, `src/simulation/Level3KnowledgeBelt.js`, `src/components/Level3SupervisorAuditTab.jsx` y `src/language/definitionCatalog.js`.
- **Diseño**:
  - Solo cuando el razonamiento proviene efectivamente de un LLM externo (`reasonerSource === 'gemini_live'`, `externalLlmAssisted === true`) se incrementa `callTimestampsMs` (`callsLastHour`, `callsLastDay`) y `totalCalls` (`llmCallsSucceeded`), sellando `external_llm_assisted: true` en la entrada del Ledger y del Cinto.
  - Cuando `reasoner` es `null` o devuelve `reasonerSource: 'deterministic_local' | 'deterministic_fallback'` (`externalLlmAssisted === false`), **no** consume cuota horaria/diaria de LLM (`callsLastHour === 0`, `totalCalls === 0`), incrementa `deterministicLocalCalls` / `deterministicFallbacks`, y sella `external_llm_assisted: false` en esa entrada.
  - `exportLevel3SealedAuditBundle` calcula `bundle.external_llm_assisted = ledger.entries.some((e) => e.external_llm_assisted === true) || belt.findings.some((f) => f.external_llm_assisted === true)` y expone `llmAssistedEntries` y `deterministicLocalEntries`.

### 6.5. `R-5` [MEDIO] — Endurecimiento de Gate 1: `candidateAction` aplicada en ramas negativas y umbral `minObjectiveDelta`
- **Alcance**: `src/simulation/Level3AutonomousSupervisor.js`.
- **Diseño**:
  - En `runLevel3ShadowGate1`, las ramas `neg_td_cut` y `neg_reducible` aplican **primero** `const app = applyTypedCandidateActionToTarget(session, candidateAction)` y luego el corte negativo (`applyWorkbenchIntervention(session, 'td_cut_eta_zero')` / `'reducible_control'`), registrando `candidateApplied: Boolean(app?.applied)` en `branches.neg_td_cut` y `branches.neg_reducible`.
  - Se define `minObjectiveDelta: 0.005` en `LEVEL3_DEFAULT_POLICY`. Para aprobar Gate 1:
    - Si `0 <= deltaObjectiveScore < policy.minObjectiveDelta` y no hay recuperación de sector amputado (`deltaPopulatedSectors < 1`), se rechaza explícitamente con `rejectionReason: 'below_min_objective_delta'`.
    - Toda promoción por score exige `deltaObjectiveScore >= minObjectiveDelta` (`0.005`), o bien recuperación estructural de sector amputado (`triggerKind === 'anomaly_level2'` con `deltaPopulatedSectors >= 1` y `deltaSectorCoherenceMin >= 0.02` manteniendo `inTubeRate` intacto y `deltaObjectiveScore >= -KAIZEN_LEARNING_DEFAULTS.margin`).

### 6.6. `R-6` [MEDIO] — Telemetría observacional pura sin mutación ni valores hardcodeados en `readLevel3LiveTelemetry`
- **Alcance**: `src/simulation/Level3AutonomousSupervisor.js`.
- **Diseño**:
  - `readLevel3LiveTelemetry` nunca invoca `nodal.computeBridgeMetrics(...)` (cero mutación de `nodal.lastBridgeMetrics`); lee `bridge` de `core?.constructiveFiniteCuts?.nodal_tower_bridge || core?.ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge || nodal?.lastBridgeMetrics || null` y, si aún no existe `bridge` en tick 0, calcula los conteos sectoriales leyendo directamente `nodal.getActiveNodes()` sin escribir en `nodal`.
  - Extrae `xN` desde `bridge?.upward_projections?.mean_coherence` (o media directa de `coherenceState` sobre `nodal.getActiveNodes()`), distinguiendo `xN` de `ccc`.
  - Calcula `xDispersion` real como la desviación estándar de `coherenceState` de los nodos activos (o `bridge?.upward_projections?.coherence_dispersion`) y `sensorDelta` real desde `core?.lastOperationalInput?.sensorDelta ?? core?.phenomenologyCore?.lastSensorDelta ?? bag.lastObserverResonanceRef?.current ?? 0`, permitiendo que `classifyViabilityCluster` clasifique `high_dispersion`, `high_sensory`, `high_stasis`, `high_strain` y `balanced`.

### 6.7. `R-7` [MEDIO] — Inmutabilidad estricta *append-only* del Ledger SHA-256 en cierre de Gate 2 (`gate2_resolution`)
- **Alcance**: `src/simulation/Level3KnowledgeBelt.js`, `src/simulation/Level3AutonomousSupervisor.js` y `src/components/Level3SupervisorAuditTab.jsx`.
- **Diseño**:
  - Se elimina cualquier mutación in-place o re-sellado retroactivo de entradas previas en `Level3KnowledgeBelt.js`.
  - La entrada original emitida al aprobar Gate 1 (`entryKind: 'cycle_evaluation'`, `finalStatus: 'promoted_watching'`) conserva su `digest` original inmutable para siempre.
  - Al concluir Gate 2 (confirmación tras 20 ticks o rollback automático), se anexa una **nueva** entrada encadenada al final del Ledger (`appendLevel3Gate2ResolutionEntry`) con `entryKind: 'gate2_resolution'`, `parentCycleId`, `parentDigest`, `finalStatus: 'promoted_confirmed' | 'rolled_back_gate2'`, `gate2Summary`, `prevHash: ledger.headHash` y su propio `digest`.
  - `projectLedgerCyclesWithGate2(ledger)` proyecta la vista consolidada por ciclo para la UI sin alterar `ledger.entries`.

### 6.8. `R-8`, `R-9`, `R-10` [BAJO] — Seguridad en demonio Node, validación de módulos/claves y limpieza registral
- **`R-8`**: `scripts/run-level3-autonomous-daemon.mjs` usa `process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview'` (o `--model=...`), envía la clave en el header `'x-goog-api-key': apiKey` (nunca en la URL `?key=`) y aplica `AbortSignal.timeout(timeoutMs)` (default `45000` ms).
- **`R-9`**: `parseAndValidateLevel3Proposal` valida `candidateAction.targetModule` en `stage_code_patch_review` contra `MODULE_FILES` de `src/language/moduleInventory.generated.js` (rechazando `..`, rutas absolutas o archivos fuera del inventario) y rechaza `kaizen_factor_nudge` sobre `PLASTICITY_DECAY` cuando `sensorObserverDynamicsEnabled === false`.
- **`R-10`**: `src/utils/runtimeParameterRegistry.js` actualiza `usagePaths` de `AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED` a `['src/components/SimulationEngine.jsx', 'src/simulation/Level3AutonomousSupervisor.js', 'src/workers/level3Autonomous.worker.js']`, eliminando `src/runtime/SimulationCycleDriver.js`.

