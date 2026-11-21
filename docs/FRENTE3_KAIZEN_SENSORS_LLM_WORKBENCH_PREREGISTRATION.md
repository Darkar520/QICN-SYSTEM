# Frente 3 — Preregistro Etapa 0: Dinámica Kaizen (6/6), Sensores/Observador, Capa LLM Remota (C2) y Workbench P/H/E

- **Repositorio**: `QICN-SYSTEM` (runtime de software; **separado** de `qicn-framework-ordenado`).
- **Commit base congelado**: `64d0937` (`main`).
- **Alcance de evidencia (`evidence_scope`)**: `internal_support_only`.
- **Certificación externa (`external_support_certified`)**: `false` (límite científico deliberado; ninguna prueba de software, ablación interna o copia del Workbench certifica teoremas teóricos ni validación externa).
- **Restricción explícita de modelos**: **sin LLM locales** (sin WebLLM/Ollama). La capa LLM trabaja únicamente contra endpoints remotos (`/.netlify/functions/llm-proxy` y BYOK Gemini) más el canal determinista local `Solo motor` (Sistema B v5).

---

## 1. Objetivos y alcance (4 pilares)

### Pilar A — Activación real de Kaizen (6/6 claves) + acoplamiento acotado de sensores/observador y latencia
1. Preservar **100 % equivalencia bit-a-bit B0** en modo headless por defecto (`services/config.js`: `KAIZEN_ADJUSTMENT_MODE = 'legacy'`, `NODAL_TOWER_COUPLING_MODE = 'off'`, `SENSOR_OBSERVER_DYNAMICS_ENABLED = false`) verificada por `tests/simulation-cycle-driver-equivalence.v1.test.mjs` y `tests/kaizen-learned-adjustment.v1.test.mjs`.
2. Introducir el módulo puro `src/simulation/SensorObserverDynamicsBridge.js` y el interruptor explícito `SENSOR_OBSERVER_DYNAMICS_ENABLED` (`false` por defecto en `config.js`, **`true` por defecto en la UI interactiva** junto con `kaizenMode = 'learned'` por defecto):
   - **6.ª clave Kaizen (`PLASTICITY_DECAY`)**: lectora real y acotada en `ConsciousNode.applyPlasticity` (relajación homeostática de pesos sinápticos hacia `0.5` cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === true`), habilitando el aprendizaje de las **6/6** claves recomputadas (`KAIZEN_LEARNABLE_KEYS_ALL`) sin alterar las 5 claves B0 cuando el interruptor está desactivado.
   - **Presencia sensorial del observador (`observerImpact` / `observer_resonance`)**: decaimiento exponencial determinista por tick (`× 0.96`, corte `< 1e-4`) para evitar saturación permanente en `1.0`, y modulación acotada (`[0.85, 1.15]`) de `BASE_LEARNING_RATE`, `HEBBIAN_FACTOR`, `INFORMATIONAL_TEMP_T`, `RETRO_FLUX_WEIGHT` y atracción suave de estabilidad nodal.
   - **Tensión por latencia acoplada (`latencyStrain`)**: freno homeostático acotado sobre temperatura informacional $T$, flujo retroinductivo y plasticidad (manteniendo el canal de chat **estrictamente desacoplado**: `dynamicsCoupling = false`, `observerChannelChangesTrajectory = false`).
3. Exponer en la UI interactiva (`SimulationEngine.jsx`): modo Kaizen `'learned'` por defecto, interruptor `Dinámica Sensor/Observador + 6/6 Kaizen`, factores aprendidos 6/6 y telemetría viva de `observerImpact`, `latencyStrain` y multiplicadores activos.

### Pilar B — Robustecimiento de la capa LLM remota (C2 extremo a extremo + resiliencia + Sistema B v5)
1. Corregir la incompatibilidad real detectada en Etapa 0 cuando `INTEGRITY_THREAT_MODEL = 'C2'` está activo junto con respuestas JSON de Sistema B v5 (`responseMimeType: 'application/json'`):
   - Exportar `stripC2EchoBlock(text)` en `netlify/functions/lib/integrity-c2.js` y espejo seguro de navegador en `src/utils/llmTransport.js`.
   - En `netlify/functions/llm-proxy.js`: al operar en `C2`, remover `responseMimeType: 'application/json'` del request upstream a Gemini (manteniendo la instrucción de emitir JSON válido seguido del bloque C2), verificar el eco HMAC con `verifyC2Echo`, conservar `content` completo por compatibilidad con `tests/integrity-c2-proxy.v56.test.js`, y retornar `cleanContent` + `integrityVerification` (`verified: true`, `signaturePrefix`, `nonce`, `requestId`).
   - En modo no estricto (`GEMINI_STRICT_MODEL=false`), permitir paso al siguiente modelo en `modelChain` también ante `503` upstream (preservando estrictamente `GEMINI_STRICT_MODEL=true`).
2. En `src/utils/llmTransport.js` y `src/components/SimulationEngine.jsx`:
   - Propagar `cleanContent`, `integrityThreatModel`, `integrityVerification` y `c2Verified` en `qicnInference` y en la traza del turno de chat sin romper `parseEvidentialRealization`.
   - Exportar `classifyLlmError(error)` y añadir mensajes guía precisos para errores C2 (`C2_INTEGRITY_REJECTED`, `C2_SECRET_MISSING`, `C2_INTEGRITY_ENVELOPE_MISSING`, `UPSTREAM_EMPTY_RESPONSE`, `ALL_MODELS_UNAVAILABLE`).
   - Incluir `threatModelRequested: 'C2'` en `chatIntegrityEnvelope` manteniendo invariante `dynamicsCoupling: false` y `writeCycleLog: prepared.contract !== 'evidential'`.
3. En Sistema B v5 (`src/language/evidential/evidenceRegistry.js`, `factualVerifier.js`, `realization.js`, `reasoningPlan.js`):
   - **Nota aclaratoria de contrato congelado (`[M-4]`)**: `src/language/runtimeSnapshot.js` se mantiene **100 % congelado verbatim** (preservando el ancla de compatibilidad `tests/language-system-b-compatibility.v1.test.mjs` y el digest dorado `GOLDEN_RUNTIME = ef504d77fcb0e33236b12123b7ae5567ff673822440c33fd420b1755bf2d03f4` en `tests/runtime-snapshot-observational.v1.test.mjs`). Por ello, el estado efectivo `sensorObserverDynamicsEnabled` (y la distinción exacta entre Kaizen `6/6 incluyendo PLASTICITY_DECAY` cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === true` frente a `5/6 excluyendo PLASTICITY_DECAY` cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED === false`) y la telemetría viva de Nivel 2 (`level2Telemetry`) se suministran por canal evidencial opt-in a través de `prepareTurn` -> `buildEvidentialProseContext` / `createReasoningPlan`.
   - Incorporar resúmenes verificados de la nueva campaña `P / H / E` + trasplante sellado del Workbench en `formatLocalWorkbenchSummary` y contexto evidencial de Sistema B v5 sin admitir sobreafirmaciones de validación externa.

### Pilar C — Completar elementos pendientes del Workbench de micro-experimentos (`src/experiments/workbench/`)
1. Extender `INTERVENTIONS` (conservando íntegras las 6 originales y la invariancia `sham`) con 5 controles aislados de configuración/entorno (`physicalDigestBefore === physicalDigestAfter`):
   - `kaizen_learned_mode`, `kaizen_legacy_mode`, `sensor_observer_dynamics`, `td_cut_eta_zero`, `reducible_control`.
2. Añadir `src/experiments/workbench/pheTransplantCampaign.js` (ESM 100 % compatible con navegador/Worker, sin imports de Node ni acceso a `Date.now`/`Math.random` globales):
   - **Brazo `P`**: planta acoplada viva (`bidirectional`, $\eta = 1/8$) sobre copia aislada.
   - **Brazo `H`**: barrido de cuello de botella de transcripción ($m = 4$, $B \in \{0, 1, 2, 4\}$) sobre palabra de estado retenida derivada del digest vivo del brazo `P` ($B < m \implies R_{\text{uniform}} = 1/2097152 > 0$; $B = m \implies R = 0$).
   - **Brazo `E`**: réplica total independiente de igual costo verificando identidad bit-a-bit (`maxAbsDiff === 0`, `replicaSeparationR === '0'`).
   - **Trasplante sellado de estado**: captura en punto medio de `P`, verificación SHA-256 (`verifyStoredState`), restauración en sesión destino limpia y continuación pareada (`transplantedVsSourceMaxAbsDiff === 0` frente a control no trasplantado `untransplantedVsSourceMaxAbsDiff > 0`).
   - **Separador atómico dinámico en copia viva**: comparación en vivo de flujo inter-sector entre `bidirectional`, corte físico `td_cut_eta_zero` ($\eta = 0$) y control reducible `reducible_control` ($A = I$), vinculado al certificado algebraico $\delta_{\text{int}}(\mathbb{F}_2^2) = 1/4$ vs $0$.
   - **Exportación sellada JSON (`qicn.workbench_export_bundle.v1`)**: botón en `MicroExperimentWorkbench.jsx` que descarga el paquete `{ capture, protocol, result }` sellado con SHA-256.

---

## 2. Métricas, criterios de decisión y controles negativos obligatorios

| Componente | Métrica / Observación | Criterio de éxito | Control negativo obligatorio |
| :--- | :--- | :--- | :--- |
| Paridad B0 | `maxAbsDiff`, captura `v3`, cursores RNG/reloj/sensor | `0` exacto en `seed ∈ {11, 23} × {legacy, learned}` | `tests/simulation-cycle-driver-equivalence.v1.test.mjs` |
| Kaizen 6/6 (`PLASTICITY_DECAY`) | Factores aprendidos y divergencia de pesos/trayectoria | `PLASTICITY_DECAY` probado y leído cuando `SENSOR_OBSERVER_DYNAMICS_ENABLED=true` | Con flag `false`, `tried.size === 5` y `!tried.has('PLASTICITY_DECAY')` (`tests/kaizen-learned-adjustment.v1.test.mjs`) |
| Observador sensorial + latencia | `maxAbsDiff(ON, OFF)` y decaimiento de `observerImpact` | `maxAbsDiff > 0`, acotado en `[0.85, 1.15]`, decaimiento monótono sin pulso | Flag `false` ⇒ `maxAbsDiff === 0`; chat (`dynamicsCoupling=false`) ⇒ `0` impacto en trayectoria |
| Proxy LLM C2 + JSON Sistema B | Verificación HMAC + `parseEvidentialRealization(cleanContent)` | HTTP `200`, `c2Verified=true`, JSON parsea y verifica en Sistema B v5 | Eco manipulado + SHA-256 forjado ⇒ HTTP `422 C2_INTEGRITY_REJECTED`; secreto ausente ⇒ `500 C2_SECRET_MISSING` |
| Workbench `P / H / E` + trasplante | `armE.maxAbsDiff`, `transplantedDiff`, `untransplantedDiff`, `reducibleInterSectorFluxShare` | `armE.maxAbsDiff === 0`, `R_E === '0'`, `transplantedDiff === 0`, `untransplantedDiff > 0`, `H(B<m) > 0`, `H(B=m) === 0`, `reducibleFlux === 0` | `sham` idéntico (`0`), corte $T_d$ (`0` contraste), réplica `E` (`R=0`), control `A=I` (`0` flujo inter-sector), tamper en `pheTransplantCampaign` rechazado por `verifyWorkbenchResult` |
| Aislamiento y no regresión | ESLint `src/`, `verify:source-of-truth`, suite completa `npm test`, build producción + `/browser` | `0` errores ESLint, `100 %` tests PASS, `0` errores consola/página en `http://127.0.0.1:3325/` | Cualquier fallo detiene el cierre; `external_support_certified` permanece `false` |

---

## 3. Reglas de parada

- Detener y diagnosticar si cualquier test existente (en particular `simulation-cycle-driver-equivalence.v1.test.mjs`, `kaizen-learned-adjustment.v1.test.mjs`, `runtime-snapshot-observational.v1.test.mjs`, `workbench-preregistration.v1.test.mjs`, `browser-workbench.v1.test.mjs` o `network-scene-3d-coupled.v1.test.mjs`) falla.
- Prohibido añadir propiedades enumerables a instancias serializadas por `captureDynamicState` (usar helpers puros o `WeakMap`).
- Prohibido introducir inferencia LLM local o afirmar validación externa.
