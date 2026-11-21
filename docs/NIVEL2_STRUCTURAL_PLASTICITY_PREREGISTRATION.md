# Nivel 2 — Preregistro Etapa 0: Plasticidad Estructural Sin Parámetros Arbitrarios, Watchdog de Invariantes y Arena Competitiva (Nivel 1 vs Nivel 2)

- **Repositorio**: `QICN-SYSTEM` (commit base congelado: `117bf2a` en `main`; `qicn-framework-ordenado` intacto).
- **Alcance de evidencia (`evidence_scope`)**: `internal_support_only`.
- **Certificación externa (`external_support_certified`)**: `false`.
- **Restricción estricta de diseño**:
  1. **Cero parámetros numéricos heurísticos o arbitrarios nuevos** en `services/config.js` o en la UI (solo un interruptor booleano `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false` para preservar paridad B0 bit-a-bit).
  2. **Cero inferencia LLM local o externa** en los bucles de detección/reparación.
  3. **Cero trampa en controles negativos**: bajo `reducible_control` ($A = I$) y `td_cut_eta_zero` ($\eta = 0$), Nivel 2 no reconstruye puentes inter-sector ni migra sectores.

---

## 1. Mecanismos preregistrados (derivados únicamente de invariantes existentes)

1. **Roles dinámicos de sector**: `annotateNodesWithSectors`, `computeNodalSectorMetrics`, `recoverInterSectorConnections` y `ConsciousNode.applyPlasticity` leen el `sectorId` dinámico del nodo destino (en lugar de `id % 4` fijo), preservando migraciones a través de ticks y `dynamicState.v3`.
2. **Watchdog pre-tick W1 y W4 (`sanitizeAndRepairPreTickInvariants`)**:
   - **W4**: verifica las 7 claves de `mutableConfig` contra el dominio exacto `_boundValue` de Kaizen; restaura cualquier clave no finita o fuera de dominio.
   - **W1**: detecta campos no finitos (`!Number.isFinite`) o fuera de dominio en nodos/pesos activos y reconstruye únicamente los elementos dañados desde la mediana exacta de vecinos/nodos finitos supervivientes.
3. **Mecanismo 2 — Apoptosis por grado 0 y Neurogénesis homeostática**:
   - Todo nodo activo con grado `0` (`connections.length === 0`) o slot inactivo (`activeNodeIds.size < nodes.length`) tras una lesión se recablea o recluta determinísticamente en el sector más deficitario $s_{\min} = \arg\min_s n_s$, heredando media exacta de coherencia/energía y mediana exacta de pesos sinápticos supervivientes con grado exacto `NODE_CONNECTION_MIN` (`3`).
4. **Mecanismo 1 — Migración funcional de sector**:
   - Cuando $\max_s n_s - \min_s n_s \ge 2$ bajo acoplamiento `bidirectional`, migra 1 nodo por sector deficitario por tick desde $s_{\max}$ hacia $s_{\min}$ eligiendo $i^* = \arg\max_{i \in s_{\max}} \cos(\phi_i - (\theta_{\text{tower}} + \Delta\theta_{s_{\min}}))$ (desempate por menor `node.id`).
5. **Watchdog W3 — Ruptura de bloqueo cinemático exacto**:
   - Si `dispersion === 0` o variación total de `CCC` exactamente `0` durante `TEMPORAL_HORIZON` (`10`) ticks consecutivos, rompe simetría determinísticamente usando las 4 fases exactas `NODAL_SECTORS[s].phaseOffset`.

---

## 2. Protocolo de la Arena Competitiva Pareada (`Nivel 1 vs Nivel 2`)

- **Semillas**: `[11, 23, 37, 41, 53]` (`N = 120` nodos, `warmup = 30` ticks, `evalTicks = 60` ticks, modo `bidirectional`, Kaizen `learned`, `SENSOR_OBSERVER_DYNAMICS_ENABLED = true`).
- **Mismo punto de partida exacto**: ambos brazos parten del mismo snapshot sellado (`captureSession` / `restoreWorkbenchCapture`) con cinta de entrada determinista idéntica.

| Escenario | Perturbación / Lesión | Criterio objetivo de éxito |
| :--- | :--- | :--- |
| **S0 — Sano (control negativo)** | Ninguna | `watchdogRepairs === 0` en 5/5 semillas; sin degradación homeostática |
| **S1 — Amputación sector 0 (25 %)** | Silencia y desconecta 100 % de `body_v_pos` en tick 1 | Nivel 2 recupera 4/4 sectores poblados y supera a Nivel 1 en `sectorCoherenceMin`, `nodalNonFactorizabilityFlux` y `bridgeNodalSyncIndex` en ≥ 4/5 semillas |
| **S2 — Tormenta de poda (85 %)** | Elimina 85 % de las aristas sinápticas en tick 1 | Nivel 2 lleva nodos huérfanos (`degree === 0`) a `0` y supera a Nivel 1 en recuperación de conectividad e integración en ≥ 4/5 semillas |
| **S3 — Corrupción `NaN`/`Infinity`** | Inyecta `NaN`/`Infinity` en 10 % de nodos y 2 claves de `mutableConfig` en tick 1 | Nivel 2 mantiene `finiteTickRate === 1.0` (`0` ticks con `NaN`, `0` crashes) en 5/5 semillas frente a colapso/envenenamiento en Nivel 1 |
| **S4 — Bloqueo cinemático pre-umbral** | Fija coherencia/fase/flujo de toda la red a constante plana en tick 1 | Nivel 2 detecta el bloqueo (`kinematicUnfreezes >= 1`) y recupera dinámica y dispersión más rápido que Nivel 1 en ≥ 4/5 semillas |
| **S5 — Control negativo (`A=I` y $T_d$)** | Modos `reducible_control` y `td_cut_eta_zero` | `reducibleInterSectorFluxShare === 0` y `tdCutEffectiveEta === '0'` en 5/5 semillas |

---

## 3. Reglas de parada

- Parar si `tests/simulation-cycle-driver-equivalence.v1.test.mjs` deja de pasar bit a bit.
- Parar si se introduce cualquier parámetro numérico heurístico en `services/config.js` o si S0 produce falsos positivos o S5 viola controles negativos.
- Solo promover Nivel 2 a default en la UI si aprueba S0–S5 con margen claro y el usuario lo confirma.
