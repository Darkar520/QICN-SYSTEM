# Frente 3 — Auditoría y Cierre Operacional: Dinámica Kaizen (6/6), Sensores/Observador, Capa LLM Remota (C2) y Workbench P/H/E

- **Repositorio**: `QICN-SYSTEM` (`main`, basado en `64d0937`; `qicn-framework-ordenado` sin modificar).
- **Preregistro**: [FRENTE3_KAIZEN_SENSORS_LLM_WORKBENCH_PREREGISTRATION.md](FRENTE3_KAIZEN_SENSORS_LLM_WORKBENCH_PREREGISTRATION.md).
- **Alcance de evidencia (`evidence_scope`)**: `internal_support_only`.
- **Certificación externa (`external_support_certified`)**: `false`.
- **Política LLM**: únicamente endpoints remotos (`/.netlify/functions/llm-proxy` y BYOK Gemini) más el canal determinista `Solo motor` (Sistema B v5); **cero modelos LLM locales**.

---

## 1. Cambios implementados por pilar

### Pilar A — Kaizen 6/6 + Dinámica acotada de observador sensorial y latencia acoplada
- **Nuevo módulo puro**: [SensorObserverDynamicsBridge.js](../src/simulation/SensorObserverDynamicsBridge.js)
  - Implementa `computeSensorObserverDynamicsModulation` y `applySensorObserverConfigModulation`: modulación multiplicativa acotada en `[0.85, 1.15]` sobre `BASE_LEARNING_RATE`, `HEBBIAN_FACTOR`, `INFORMATIONAL_TEMP_T`, `RETRO_FLUX_WEIGHT` y atracción de estabilización nodal, más decaimiento exponencial determinista (`× 0.96`, corte `< 1e-4`) para `observerImpact`.
  - Cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === false` (default en [config.js](../services/config.js) para conservar equivalencia B0 bit-a-bit), devuelve identidad exacta (`×1.00`, `coherenceStabilizationPull = 0`).
- **Activación real de la 6.ª clave Kaizen (`PLASTICITY_DECAY`)**:
  - [ConsciousNode.js](../src/simulation/ConsciousNode.js): `applyPlasticity` consume `mutableConfig.PLASTICITY_DECAY` (relajación homeostática acotada de pesos sinápticos hacia `0.5`) cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === true`, y `introspectiveUpdate` aplica la atracción acotada de estabilidad nodal.
  - [KaizenMetamorphosisEngine.js](../src/simulation/KaizenMetamorphosisEngine.js): expone `KAIZEN_LEARNABLE_KEYS_ALL` (6/6 claves recomputadas) y `getActiveLearnableKeys()` (5/6 en modo B0 `false`, 6/6 en modo activo `true`).
  - [OntologicalSingularityCore.js](../src/simulation/OntologicalSingularityCore.js): añade `stepSensorObserverDecay()` y etiqueta honesta `sensory_coupled` vs `telemetría artifact_only`.
  - [SimulationCycleDriver.js](../src/runtime/SimulationCycleDriver.js) y [HeadlessRuntimeSession.js](../src/runtime/HeadlessRuntimeSession.js): aplican la modulación en el ciclo únicamente cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === true` y soportan `observerLatencyProbe` determinista para ablaciones del Workbench.
- **UI interactiva ([SimulationEngine.jsx](../src/components/SimulationEngine.jsx))**:
  - Activa por defecto `Modo Kaizen = 'learned'` (`QICN_KAIZEN_ADJUSTMENT_MODE_V2`) y `Sensor/Observador + 6/6 Kaizen = Activo` (`QICN_SENSOR_OBSERVER_DYNAMICS_ENABLED`) al abrir el navegador, mostrando en vivo `observerImpact (ι)`, `latencyStrain`, los 4 multiplicadores acotados (`LR`, `Hebb`, `T`, `Retro`) y los 6 factores aprendidos.
  - El canal de chat permanece estrictamente desacoplado (`dynamicsCoupling = false`, `observerChannelChangesTrajectory = false`).

### Pilar B — Robustecimiento de la capa LLM remota (C2 extremo a extremo + resiliencia + Sistema B v5)
- **Corrección crítica C2 + JSON Sistema B v5**:
  - [integrity-c2.js](../netlify/functions/lib/integrity-c2.js): exporta `stripC2EchoBlock(text)`.
  - [llm-proxy.js](../netlify/functions/llm-proxy.js): al activar `INTEGRITY_THREAT_MODEL=C2` junto con `responseMimeType: 'application/json'`, omite `responseMimeType` en la llamada upstream a Gemini para que el modelo pueda emitir el objeto JSON seguido del bloque obligatorio `[C2_INTEGRITY_ECHO_BEGIN]...[C2_INTEGRITY_ECHO_END]`, verifica el HMAC con `verifyC2Echo`, preserva `content` completo y devuelve `cleanContent` + `integrityVerification` (`verified: true`, `signaturePrefix`, `nonce`, `requestId`). Además, en modo no estricto (`GEMINI_STRICT_MODEL=false`), habilita fallback al siguiente modelo de `modelChain` también ante `503` upstream (manteniendo `GEMINI_STRICT_MODEL=true` estrictamente fijado).
  - [llmTransport.js](../src/utils/llmTransport.js) y [SimulationEngine.jsx](../src/components/SimulationEngine.jsx): propagan `cleanContent`, `integrityThreatModel`, `integrityVerification` y `c2Verified` en `qicnInference` y traza del chat; incorporan `threatModelRequested: 'C2'` en `chatIntegrityEnvelope`, `classifyLlmError(error)` y guías explícitas en español para códigos C2 y upstream.
- **Sistema B v5**:
  - [evidenceRegistry.js](../src/language/evidential/evidenceRegistry.js), [factualVerifier.js](../src/language/evidential/factualVerifier.js) y [realization.js](../src/language/evidential/realization.js) integran resúmenes verificados de la campaña `P/H/E` + trasplante sellado del Workbench y contexto Kaizen 6/6, manteniendo intacto el contrato congelado [runtimeSnapshot.js](../src/language/runtimeSnapshot.js).

### Pilar C — Completado del Workbench de micro-experimentos (`src/experiments/workbench/`)
- **5 nuevas intervenciones aisladas** ([contracts.js](../src/experiments/workbench/contracts.js), [interventions.js](../src/experiments/workbench/interventions.js)): `kaizen_learned_mode`, `kaizen_legacy_mode`, `sensor_observer_dynamics`, `td_cut_eta_zero`, `reducible_control` (todas conservando `physicalDigestBefore === physicalDigestAfter` en $t=0$).
- **Campaña comparativa `P / H / E` + Trasplante sellado + Separador atómico dinámico** ([pheTransplantCampaign.js](../src/experiments/workbench/pheTransplantCampaign.js), [runner.js](../src/experiments/workbench/runner.js), [resultVerifier.js](../src/experiments/workbench/resultVerifier.js)):
  - Brazo `P` (`bidirectional`, $\eta=1/8$), Brazo `H` (barrido $m=4, B \in \{0,1,2,4\}$: $B<m \Rightarrow 1/2097152$, $B=4 \Rightarrow 0$), Brazo `E` (réplica total igual costo: `maxAbsDiff = 0`, `R = 0`, identidad bit-a-bit).
  - Trasplante sellado de punto medio (`captureSession` + `verifyStoredState` + `restoreWorkbenchCapture`): continuación idéntica bit-a-bit (`transplantedVsSourceMaxAbsDiff = 0`, `transplantedFullStateIdentical = true`) frente a control sin trasplante (`untransplantedVsSourceMaxAbsDiff > 0`).
  - Separador atómico dinámico en copia viva (`bidirectional` vs `td_cut_eta_zero` vs `reducible_control` $A=I$: flujo inter-sector $A=I = 0$, contraste integrativo positivo).
  - Exportación de paquete sellado SHA-256 (`qicn.workbench_export_bundle.v1`) desde [MicroExperimentWorkbench.jsx](../src/components/MicroExperimentWorkbench.jsx).

---

## 2. Verificación ejecutada y resultados brutos

| Verificador / Comando | Resultado | Controles negativos verificados |
| :--- | :--- | :--- |
| `npx eslint src/ --max-warnings=50` | `exit 0` (`0` errores) | Reglas `no-undef` y ES modules en `src/` |
| `npm run verify:source-of-truth` | `PASS` | Fuente única `src/` preservada |
| `BUILD_MODE=production NODE_ENV=production npm run build` | `PASS` (`dist/bundle.js` `2.1 MB` minificado + UTF-8 check OK) | `microExperiment.worker.js` sincronizado root/dist |
| `npm test` (`tests/run-all-tests.cjs` + smoke headless) | **`197/197 passed`** | B0 bit-a-bit (`simulation-cycle-driver-equivalence.v1`), `kaizen-learned-adjustment.v1` (5/6 en B0), `runtime-snapshot-observational.v1` (digest dorado `ef504d77…`), `language-system-b-compatibility.v1` (archivos congelados intactos), `browser-workbench.v1` (worker ESM real) |
| `tests/frente3-kaizen-sensor-dynamics.v1.test.mjs` | `PASS` | Flag `false` ⇒ `0` diff; chat `dynamicsCoupling=false` ⇒ `0` diff; decaimiento reversible de `observerImpact` |
| `tests/frente3-llm-c2-resilience.v1.test.mjs` | `PASS` | Eco C2 forjado ⇒ `422 C2_INTEGRITY_REJECTED`; modo estricto bloquea fallback `503`; cuota diaria no reintentable |
| `tests/frente3-workbench-phe-transplant.v1.test.mjs` | `PASS` | `sham` `maxAbsDiff=0`; Arm `E` `R=0`; control sin trasplante diverge (`>0`); `A=I` flujo `0`; manipulación de `pheTransplantCampaign` rechazada |
| Navegador vivo (`http://127.0.0.1:3325/`) | `0` errores consola/página | Ejecución real en Worker (`Estado: completed · evidencia: verified_internal_copy`), Brazo `E` `maxAbsDiff = 0, R = 0`, Trasplante sellado `maxAbsDiff = 0` vs sin trasplante `0.094567`, flujo `A=I = 0`, chat `Solo motor` OK |

---

## 3. Deuda residual y fronteras científicas

- `external_support_certified = false` y `evidence_scope = internal_support_only`: ninguna métrica de Kaizen 6/6, acoplamiento de observador/latencia, verificación C2 ni campaña `P/H/E` en copia aislada certifica conciencia, fenomenalidad, equivalencia humana ni cierre teórico.
- La captura de replay con proveedor de entropía cuántica externo habilitado en vivo sigue siendo `partial_runtime_path` (el Workbench rechaza honestamente capturas con polling externo activo).
- La cobertura semántica arbitraria de prosa libre en Sistema B v5 más allá de hechos, cotas, alcances de módulos, procedencia B2 y barreras anti-certificación permanece acotada al contrato verificable.
