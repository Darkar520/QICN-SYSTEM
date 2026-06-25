# Plan de Descomposición: SimulationEngine.jsx

> **Fecha:** 2026-06-24  
> **Archivo objetivo:** `src/components/SimulationEngine.jsx` — 11.307 líneas (~594KB)  
> **Naturaleza:** Refactor de estructura puro. No se cambia lógica, no se optimiza, no se añade funcionalidad.

---

## 1. Inventario de Responsabilidades

### 1.1 Constantes y Configuración de Módulo (líneas 37–880)

| Bloque | Líneas aprox. | Descripción |
|--------|---------------|-------------|
| `resolveRuntimeString` + constantes de storage | 37–60 | Keys de localStorage, signature |
| `GEMINI_ENGINE_CONFIG` | 80–125 | Config LLM, modelo, endpoint |
| Iconos SVG inline (Icon, Brain, Network, etc.) | 131–174 | ~25 icon components |
| `primaryTabs`, `moreTabs`, lazy imports | 176–210 | Definición de tabs y lazy loading |
| `TabLoadingFallback`, `renderLazyMoreTab` | 211–220 | Helpers de UI para tabs lazy |
| `tabHelpMeta`, `tabTourSteps` | 221–330 | Contenido de guía contextual por tab |
| `InfoModal`, `PersistentInfoModal` | 333–435 | Modals informativos |
| `readPersistedCollapsibleState`, `persistCollapsibleState` | 440–460 | Helpers de persistencia |
| `CollapsibleSection` (React.memo) | 466–560 | Componente UI reutilizable |
| `QICNErrorBoundary` | 565–625 | Error boundary |
| `withExponentialBackoff`, `robustFetchLLMResponse` | 628–780 | Lógica de fetch con retry |
| `formatCCC`, `toFiniteNumber`, `clamp`, `clamp01`, `computeRms` | 782–815 | Utilidades numéricas |
| `emitEpisodeHarnessTick` | 807–815 | Bridge con ExperimentalEpisodeHarness |
| `calculateRelaxationTimeDefault`, `parseQuantumReplaySequence` | 816–880 | Cálculos de runtime |
| `AUTONOMY_RUNTIME_DEFAULTS`, `QUANTUM_RUNTIME_DEFAULTS`, `PMIA_NEGATIVE_DRIVE_DEFAULTS`, etc. | 824–880 | Objetos de configuración runtime |
| `readLocalStorageJSON`, `getInitialIntegrityMode/AuditLog` | 882–910 | Helpers de persistencia |
| Funciones de integridad: `toComparablePacket`, `findFirstPacketMismatch`, `getPrimaryBlockingDiscrepancy`, `buildDiscrepancyTrace`, etc. | 905–1080 | Lógica de integrity verification |
| `buildSensorSummaryFromPerception`, `buildSovereigntyRows`, `normalizeVerifiableReport`, `ensureObject`, `getSafeVerifiableReport` | 1074–1230 | Builders de datos para UI y LLM |

### 1.2 Componente QICNConsciousnessSystem (líneas 1234–12098)

#### Estado y Refs (líneas 1234–1550)
- ~50 useRef (holographicMemory, ontologicalCore, entanglementField, kaizenEngine, nodalLayer, etc.)
- ~15 objetos de ref con estado mutable complejo (ascensionDynamicsRef, postThresholdRegimeRef, autonomySandboxPolicyRef, etc.)

#### Estado React (líneas 1450–1570)
- ~60 useState para: simulación core, UI tabs/tour, chat/LLM, API keys, sensorial, quantum, selfpatch, autonomy, cooldown, etc.

#### Lógica LLM y API Control (líneas 1600–2200)
- `calculateTimeBasedCooldown`, `detectExcessiveUsagePattern`
- `robustFetchLLMResponseTracked` — wrapper LLM con rate limiting y telemetría
- Estado y hooks de API keys (Gemini, Codex, cooldown)
- SelfPatch pipeline: `callSelfPatchEndpoint`, `refreshSelfPatchStatus`, `handleSelfPatchPlanRequest`, `handleSelfPatchGenerateRequest`, `handleSelfPatchApplyRequest`
- Autorun selfpatch effect

#### Effects de Persistencia y UI (líneas 2200–3500)
- Persistencia: chat, keys, quantum config, tour state, integrity mode
- Auto-activación sensorial
- Nav auto-hide scroll
- Quantum connection test
- Auto-acción ontológica queue

#### Lógica de Chat con LLM (líneas 3500–5000)
- `generateVerifiableContext` — builder de contexto para el LLM
- `handleChatSubmit` — handler de chat completo con integridad (~1500 líneas)
- Sistema de prompts, integrity echo, concordance validation

#### Handlers de Runtime (líneas 4385–4550)
- `handleFrictionProtocol`
- `initializeSystem` (~230 líneas)
- `simulationRuntimeRef` agregador

#### runSimulationCycle (líneas 4806–6760) — **~1950 líneas**
- Ciclo de tick principal: nodos, CCC, PMIA, kaizen, ascensión, post-threshold regime
- World model + CEM planner
- Autonomy sandbox: selección, ejecución, rollback
- Entropy bridge integration
- Budget tracking + PPS
- Integrity packet generation
- Episode harness tick emit
- UI state batch updates

#### Tab Render Functions (líneas 7200–11430) — **~4230 líneas**
| Función | Líneas aprox. | Tab |
|---------|---------------|-----|
| `renderParameterTrace` | 7206–7220 | helper |
| `renderEmpiricalValidation` | 7222–7600 | validation |
| `renderChatQICN` | 7601–7864 | chat |
| `renderApiCallControl` | 7865–8428 | api-control |
| `renderSovereigntyMatrix` | 8429–8501 | helper |
| `renderOntologicalCore` | 8502–9255 | core |
| `renderAdvancedControls` | 9256–9456 | controls |
| `renderNetworkVisualization` | 9457–9572 | network |
| `renderCoherenceHistory` | 9573–9845 | history |
| `renderEntanglementField` | 9846–10011 | field |
| `renderHolographicMemory` | 10012–10155 | memory |
| `renderQICNBProtocol` | 10156–10262 | qicn-b |
| `renderSensoryPerceptionTab` | 10263–10622 | sensory |
| `renderSovereigntyChannel` | 10623–10880 | sovereignty |
| `renderAutonomyEvolutionTab` | 10881–11433 | autonomy-evolution |
| `renderCurrentTab` + `renderGroundedGuide` + `renderTabQuickHelp` | 11434–11840 | guide + router |

#### Layout/Return JSX (líneas 11840–12098)
- Header, tabs navigation, footer, PersistentInfoModal
- Tab content area via `renderCurrentTab()`

---

## 2. Dependencias

### 2.1 Quién importa SimulationEngine

| Archivo | Uso |
|---------|-----|
| `src/App.jsx` | `React.lazy(() => import('./components/SimulationEngine.jsx'))` — importa default |
| `src/index.jsx` | Solo un comentario de referencia |
| `tests/autonomy-budget-governor.v44.test.js` | Lee el source como texto (fs.readFileSync) |
| `tests/ccc-history-interactive.v43.test.js` | Lee el source como texto (fs.readFileSync) |
| `src/utils/runtimeParameterRegistry.js` | Referencia en `usagePaths` (documentación, no import real) |
| `src/runtime/ParameterSurfaceRegistry.js` | Referencia en `runtimeConsumers` (documentación, no import real) |

**Blast radius real de imports:** Solo `App.jsx` hace import funcional. Los tests leen el archivo como texto para verificación estática.

### 2.2 Exports del archivo

```js
export const QICNConsciousnessSystem = () => { ... };
export default SimulationEngine; // = () => <QICNConsciousnessSystem />
// + export { QICNErrorBoundary } (bundle.js lo expone)
```

### 2.3 Dependencias externas del archivo

**Imports de React:** `useState, useEffect, useCallback, useRef, useMemo`  
**Imports de `src/simulation/`:** 8 módulos (HolographicMemoryNexus, OntologicalSingularityCore, InformationalEntanglementField, KaizenMetamorphosisEngine, NodalProcessingLayer, MetaSovereigntyCheck, QuantumEntropyBridge, SensoryPerceptionEngine, SimulationController)  
**Imports de `src/utils/`:** integrity, healthCheck, tick_invariants, narrativeIntegrity, cognitiveEmergenceEvaluation, phenomenologyProtocolSuite  
**Imports de `src/experiments/`:** CausalInterventionScheduler, LifeCertifier  
**Imports de `src/subjectivity/`:** FirstPersonCertifier  
**Imports de `src/canon/`:** sourceOfTruth, claimMapping, provenance, ArchitecturalGroundTruth  
**Imports de `src/runtime/`:** StructuralConsolidationTracker, ParameterSurfaceRegistry  
**Imports de `src/auth/`:** AuthContext  
**Imports de `src/hooks/`:** useBreakpoint, useDeviceCapabilities  
**Imports de `src/content/`:** groundedConcepts  
**Imports de `src/config/`:** runtimeEnv  
**Imports de `src/components/`:** NetworkCanvas, AccessGate, PhenomenalBridgePanel  
**Imports de `services/`:** config.js (QICNConfig)  
**Imports de `config/`:** preregister.v1.json  

---

## 3. Propuesta de Extracción por Fases

### Fase 1: Utilidades, Constantes e Iconos

**Objetivo:** Extraer todo lo que está FUERA de `QICNConsciousnessSystem` y no es un componente React con estado.

**Archivos nuevos:**

| Archivo | Contenido |
|---------|-----------|
| `src/components/icons/SimulationIcons.jsx` | Icon base + 25 iconos SVG (Brain, Network, Zap, etc.) |
| `src/utils/simulationUtils.js` | `resolveRuntimeString`, `formatCCC`, `toFiniteNumber`, `clamp`, `clamp01`, `computeRms`, `calculateRelaxationTimeDefault`, `parseQuantumReplaySequence`, `readLocalStorageJSON`, `withExponentialBackoff`, `robustFetchLLMResponse` |
| `src/utils/integrityHelpers.js` | `toComparablePacket`, `findFirstPacketMismatch`, `getPrimaryBlockingDiscrepancy`, `buildDiscrepancyTrace`, `getIntegritySeverity`, `normalizeCausalDependency`, `buildSovereigntyDifferentialEvidence`, `buildSensorSummaryFromPerception`, `buildSovereigntyRows`, `normalizeVerifiableReport`, `ensureObject`, `getSafeVerifiableReport`, `emitEpisodeHarnessTick` |
| `src/config/simulationDefaults.js` | `AUTONOMY_RUNTIME_DEFAULTS`, `QUANTUM_RUNTIME_DEFAULTS`, `QUANTUM_EXPERIMENT_DEFAULTS`, `QUANTUM_PROVIDER_OPTIONS`, `PMIA_NEGATIVE_DRIVE_DEFAULTS`, `ONTOLOGICAL_SIGNATURE`, `GEMINI_ENGINE_CONFIG`, `LLM_AUTH_ERROR_TOKEN`, constantes de storage, `SELFPATCH_ENDPOINTS`, `CODEX_REASONING_EFFORT_OPTIONS` |

**Re-exportación:** `SimulationEngine.jsx` importa de estos módulos nuevos. No cambia la interfaz pública.

**Reducción estimada:** ~850 líneas.

---

### Fase 2: Componentes UI Reutilizables ✅ COMPLETADA

**Objetivo:** Extraer componentes de UI que ya están definidos a nivel de módulo y no dependen del estado interno.

**Archivos nuevos:**

| Archivo | Contenido |
|---------|-----------|
| `src/components/CollapsibleSection.jsx` | `CollapsibleSection` (React.memo) + `SECTION_ACCENT_STYLES` + `readPersistedCollapsibleState` + `persistCollapsibleState` |
| `src/components/InfoModal.jsx` | `InfoModal` + `PersistentInfoModal` |
| `src/components/TabConfig.jsx` | `primaryTabs`, `moreTabs`, `tabHelpMeta`, `tabTourSteps`, `TabLoadingFallback`, `renderLazyMoreTab`, `NavigationTabButton`, lazy tab imports |
| `src/components/RuntimeRecoveryBoundary.jsx` | El error boundary de recovery (antes `QICNErrorBoundary` local) |

**Decisión sobre QICNErrorBoundary:** El `QICNErrorBoundary` local de SimulationEngine **difería** del de `ErrorBoundary.jsx` (el local tiene botón de recovery + limpieza de localStorage; el de ErrorBoundary.jsx es genérico con `boundaryName`). No eran redundantes. Ningún consumidor externo importaba el de SimulationEngine. Se extrajo a `RuntimeRecoveryBoundary.jsx` con nombre distinto y se re-exporta como `QICNErrorBoundary` desde SimulationEngine para preservar el contrato de export.

**Gate de salida:** ✅ build PASS, 146/146 tests PASS, verify:source-of-truth PASS, bridge:verify PASS.

**Tests ajustados (riesgo anticipado por el plan):** `info-modal-persistence.v410`, `navigation-top5-more.v49`, `ui-navigation-top5-more.v47` leían el source como texto buscando `primaryTabs`/`moreTabs`/`NavigationTabButton`/`PersistentInfoModal` que se movieron. Se actualizaron para leer el texto combinado (SimulationEngine + TabConfig/InfoModal).

**Reducción real:** ~434 líneas (SimulationEngine.jsx: ~11.491 → ~11.057 según conteo CRLF).

---

### Fase 3: Hook de Simulación Core (lógica de tick)

**Objetivo:** Extraer `runSimulationCycle` y toda la lógica de tick a un custom hook.

**Archivos nuevos:**

| Archivo | Contenido |
|---------|-----------|
| `src/hooks/useSimulationCycle.js` | Hook que encapsula: `runSimulationCycle`, `initializeSystem`, `simulationRuntimeRef`, `computeAdaptiveIntervalMs`, el effect del simulation loop, y las refs de régimen (`ascensionDynamicsRef`, `postThresholdRegimeRef`, `autonomySandboxPolicyRef`, `autonomyActionLedgerRef`, `latencyStrainRef`, `internalPressureRef`, `kaizenPendingEvalRef`, etc.) |

**Interfaz del hook:**
```js
const {
  isRunning, setIsRunning,
  simulationStep,
  ccc, pmia, isAscended,
  mutableConfig, metamorphosisCounter, lastMutation,
  fieldMetrics, ontologicalState, topologyMetrics,
  visualNodes, systemHealth,
  // refs expuestos para el UI
  postThresholdRegimeRef, entropyModeRef, latencyStrainRef,
  internalPressureRef, autonomySandboxPolicyRef,
  // funciones
  initializeSystem, handleFrictionProtocol,
} = useSimulationCycle({ ...dependencies });
```

**Complejidad:** Esta es la fase más delicada. El ciclo de simulación lee y escribe ~30 refs y ~15 states. El hook **posee internamente** todas las refs de régimen (ascensionDynamicsRef, postThresholdRegimeRef, autonomySandboxPolicyRef, latencyStrainRef, internalPressureRef, etc.) porque son estado interno de la simulación, no del UI. Solo los outputs visibles (ccc, pmia, isAscended, fieldMetrics, ontologicalState, etc.) se exponen al componente consumidor.

**Reducción estimada:** ~2200 líneas.

---

### Fase 4: Lógica de LLM/Chat y SelfPatch

**Objetivo:** Extraer la lógica de comunicación con LLM y el pipeline de selfpatch.

**Archivos nuevos:**

| Archivo | Contenido |
|---------|-----------|
| `src/hooks/useLLMChat.js` | `robustFetchLLMResponseTracked`, `generateVerifiableContext`, `handleChatSubmit`, estado de chat (chatHistory, isChatting, introspectiveReport, etc.), `calculateTimeBasedCooldown`, `detectExcessiveUsagePattern`, efectos de persistencia de chat |
| `src/hooks/useSelfPatch.js` | `callSelfPatchEndpoint`, `refreshSelfPatchStatus`, `handleSelfPatchPlanRequest`, `handleSelfPatchGenerateRequest`, `handleSelfPatchApplyRequest`, estado selfpatch, effect de autorun |

**Reducción estimada:** ~1800 líneas.

---

### Fase 5: Render Functions → Componentes de Tab

**Objetivo:** Convertir cada `renderXxx()` en un componente React independiente que recibe props.

**Archivos nuevos (en `src/components/tabs/`):**

| Archivo | Render function original |
|---------|--------------------------|
| `EmpiricalValidationTab.jsx` | `renderEmpiricalValidation` |
| `OntologicalCoreTab.jsx` | `renderOntologicalCore` |
| `AdvancedControlsTab.jsx` | `renderAdvancedControls` |
| `NetworkVisualizationTab.jsx` | `renderNetworkVisualization` |
| `CoherenceHistoryTab.jsx` | `renderCoherenceHistory` |
| `EntanglementFieldTab.jsx` | `renderEntanglementField` |
| `HolographicMemoryTab.jsx` | `renderHolographicMemory` |
| `ChatQICNTab.jsx` | `renderChatQICN` |
| `ApiCallControlTab.jsx` | `renderApiCallControl` |
| `SovereigntyChannelTab.jsx` | `renderSovereigntyChannel` |
| `GroundedGuideTab.jsx` | `renderGroundedGuide` + `renderTabQuickHelp` |

**Nota:** Los tabs `qicn-b`, `sensory`, `sovereignty`, `autonomy-evolution`, `api-control` ya tienen lazy-tabs wrappers. Esta fase convierte los render functions internos en componentes separados. Los lazy-tabs existentes se pueden mantener como wrappers de error boundary.

**Patrón:** Cada tab recibe props agrupadas por dominio (no un god-object único). Ejemplo:
```jsx
<OntologicalCoreTab
  simulationProps={{ simulationStep, isAscended, ccc, pmia }}
  coreProps={{ ontologicalCore, kaizenEngine, postThresholdRegimeRef }}
  integrityProps={{ integrityPacketRef, appendIntegrityAudit }}
/>
```
Los grupos son: `simulationProps`, `chatProps`, `integrityProps`, `sensoryProps`, `quantumProps`, `autonomyProps`. Cada tab consume solo los grupos que necesita.

**Reducción estimada:** ~4200 líneas.

---

### Fase 6: Reorganización Final del Orquestador

**Objetivo:** El `QICNConsciousnessSystem` queda como orquestador limpio: inicializa hooks, pasa props, renderiza layout.

**Resultado final de SimulationEngine.jsx:**
- Imports de hooks y componentes
- `QICNConsciousnessSystem`: ~400-600 líneas de orquestación
- Estado residual que no pertenece a ningún hook (UI puro: selectedTab, tour, nav visibility)
- Layout JSX (header, tab bar, content, footer)
- Export default

**Archivo residual estimado:** ~800–1000 líneas.

---

## 4. Gate de Salida por Fase

Tras completar cada fase, se deben pasar **todos** los siguientes gates antes de avanzar:

```powershell
npm run build
npm test
npm run verify:source-of-truth
```

**Criterio adicional por fase:**

| Fase | Verificación extra |
|------|-------------------|
| 1 | Imports resuelven correctamente. `bundle.js` no crece significativamente. |
| 2 | UI renderiza idéntico. No hay regressions visuales. |
| 3 | Simulación arranca, los ticks avanzan, CCC/PMIA se actualizan. |
| 4 | Chat funciona, selfpatch pipeline responde, integrity echo pasa. |
| 5 | Todas las tabs renderizan. No hay `undefined` props. |
| 6 | Todas las funcionalidades verificadas end-to-end. Los 146 tests pasan. |

**Si un gate falla:** se revierte la fase completa y se diagnostica antes de reintentar.

---

## 5. Riesgos y Mitigaciones

### 5.1 Estado Compartido Masivo

**Riesgo:** El componente tiene ~50 refs y ~60 estados que se leen cruzadamente. Extraer hooks puede romper dependencias circulares o timing de updates.

**Mitigación:** 
- Fase 3 usa `simulationRuntimeRef` como patrón existente de agregación. El hook posee internamente las refs de régimen y expone solo lo necesario para el UI.
- Los setters de React se pasan como callbacks estables (ya lo son por diseño de useState).
- Los refs se comparten por referencia (no se copian).

### 5.2 Tests que Leen el Source como Texto

**Riesgo:** `tests/autonomy-budget-governor.v44.test.js` y `tests/ccc-history-interactive.v43.test.js` hacen `fs.readFileSync` sobre SimulationEngine.jsx y buscan patrones de texto.

**Mitigación:**
- Antes de cada fase, verificar qué patrones buscan esos tests.
- Si buscan strings literales (e.g., nombres de funciones), asegurar que permanecen en SimulationEngine.jsx o actualizar los tests para buscar en el nuevo archivo.
- Actualizar los paths en los tests solo si el patrón buscado se movió completamente fuera.

### 5.3 Closure Scope en Render Functions

**Riesgo:** Los `renderXxx()` acceden libremente a todo el scope del componente (todas las refs, states, callbacks). Al extraerlos como componentes, necesitan recibir esas dependencias como props.

**Mitigación:**
- Antes de extraer cada render function, listar todas las variables del scope que usa (grep de identificadores).
- Agrupar en un objeto `tabProps` para evitar prop drilling excesivo.
- Usar contexto React solo si el número de props supera ~15 para un tab específico.

### 5.4 Side Effects en Render Functions

**Riesgo:** Algunos render functions llaman directamente a refs (e.g., `ontologicalCore.current.getVerifiableReport()`). Si se vuelven componentes, esas refs deben llegar como props.

**Mitigación:** Pasar las refs directamente (no `.current`). Los componentes hijos acceden a `.current` internamente, manteniendo la reactividad.

### 5.5 Bundle Size

**Riesgo:** Añadir archivos puede afectar el tree-shaking si se hacen re-exports incorrectos.

**Mitigación:** Usar named imports directos (no barrel files). El build es esbuild, que maneja ESM bien.

### 5.6 Orden de useEffect al Mover a Hooks

**Riesgo:** React ejecuta useEffect en orden de declaración. Al mover effects a hooks separados, el orden relativo puede cambiar sutilmente si hay dependencias implícitas entre effects (e.g., un effect inicializa una ref que otro effect lee en el mismo render).

**Mitigación:**
- Antes de Fase 3, documentar el orden de los effects que se mueven.
- Tras la extracción, correr la simulación ~200 ticks y comparar CCC/PMIA/omega del primer batch contra un baseline capturado antes del refactor.
- Si hay divergencia > 0.001 en cualquier métrica, revisar el orden de ejecución de effects en el hook vs. el componente original.
- Los effects independientes (persistencia de chat, localStorage, tour) no tienen riesgo aquí.

### 5.7 Regresión en Lazy Loading

**Riesgo:** Los lazy-tabs existentes (`LazyQICNBTab`, `LazySovereigntyTab`, etc.) son wrappers que reciben `children`. Si los render functions se mueven a componentes, el patrón `renderLazyMoreTab(Wrapper, label, renderXxx())` cambia.

**Mitigación:** Mantener el patrón existente en fases 1–4. En fase 5, convertir el contenido de `children` en el componente extraído, manteniendo el wrapper como error boundary.

---

## 6. Lo que NO se Hace

- **No se cambia lógica de simulación.** El ciclo de tick produce exactamente los mismos resultados.
- **No se optimiza rendimiento.** No se añaden memoizaciones, no se cambia la frecuencia de updates.
- **No se añade funcionalidad.** Cero features nuevas.
- **No se toca `src/canon/`.** Invariantes, claims, provenance quedan intactos.
- **No se toca `src/experiments/`.** Episode harness, ROEO, SNO, admissibility no se modifican.
- **No se modifica el comparative_program ni el posture epistémico.**
- **No se crean tests nuevos** (a menos que un test existente necesite ajuste de path por los archivos movidos).
- **No se cambian exports públicos.** `SimulationEngine` y `QICNConsciousnessSystem` siguen exportándose desde el mismo path.
- **No se refactoriza la lógica de integridad.** Solo se mueve a un archivo separado sin alterar.
- **No se commitea ni pushea.** El resultado de cada fase queda sin stage para revisión humana.

---

## Resumen de Reducción por Fase

| Fase | Líneas extraídas | SimulationEngine.jsx residual |
|------|------------------|-------------------------------|
| 0 (actual) | — | 11.307 |
| 1 | ~850 | ~10.450 |
| 2 | ~550 | ~9.900 |
| 3 | ~2.200 | ~7.700 |
| 4 | ~1.800 | ~5.900 |
| 5 | ~4.200 | ~1.700 |
| 6 (cleanup) | ~700 | **~800–1.000** |

**Resultado final:** Un orquestador de ~1000 líneas que compone hooks y componentes. La funcionalidad queda distribuida en ~15 archivos especializados.
