# Nivel 2 — Preregistro Etapa 0: Plasticidad Estructural Sin Hiperparámetros Configurables Nuevos, Watchdog de Invariantes y Arena Competitiva (Nivel 1 vs Nivel 2)

- **Repositorio**: `QICN-SYSTEM` (commit base congelado: `117bf2a` en `main`; `qicn-framework-ordenado` intacto).
- **Alcance de evidencia (`evidence_scope`)**: `internal_support_only`.
- **Certificación externa (`external_support_certified`)**: `false`.
- **Restricción estricta de diseño**:
  1. **Cero hiperparámetros numéricos configurables nuevos** en `services/config.js` o en la UI (solo el interruptor booleano `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false` para preservar paridad B0 bit-a-bit; las constantes estructurales internas son deterministas y se derivan de `K = NODAL_SECTORS.length = 4`, `NODE_CONNECTION_MIN = 3`, `TEMPORAL_HORIZON = 10` y cotas de dominio del núcleo).
  2. **Cero inferencia LLM local o externa** en los bucles de detección/reparación.
  3. **Separación explícita de fronteras bajo controles negativos (`S5`)**: bajo `off`, `reducible_control` ($A = I$) y `td_cut_eta_zero` ($\eta = 0$), la plasticidad topológica y ruptura de simetría (`M1`/`M2`/`W3`) permanece estrictamente inerte (`skippedByNegativeControl = true`), mientras que la higiene de dominio/finitud (`W1`/`W4`) es un escaneo read-only sin asignaciones que jamás altera trayectorias finitas en dominio.

---

## 1. Mecanismos preregistrados (derivados de invariantes existentes del núcleo)

1. **Roles dinámicos de sector y persistencia v3 determinista**: `annotateNodesWithSectors`, `computeNodalSectorMetrics`, `recoverInterSectorConnections` y `ConsciousNode.applyPlasticity` leen el `sectorId` dinámico del nodo destino (en lugar de `id % 4` fijo). El estado acumulado de Nivel 2 (`nodalLayer.level2StructuralState`, incluyendo `recentCcc` y contadores) se serializa y restaura limpiamente en `qicn.dynamic_state.v3` cuando Nivel 2 opera en modo `bidirectional` o registra reparaciones, sin añadir ni un byte a capturas B0 (`STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false`).
2. **Watchdog pre-tick W1 y W4 (`sanitizeAndRepairPreTickInvariants`)**:
   - **W4**: verifica las 7 claves de `mutableConfig` contra el dominio exacto `_boundValue` de Kaizen y la finitud de `kaizenEngine.adjustments`; restaura cualquier clave no finita o fuera de dominio.
   - **W1**: detecta campos no finitos (`!Number.isFinite`) o fuera de dominio en nodos/pesos activos, poda aristas hacia nodos inactivos (`!activeNodeIds.has(targetId)`), deduplica `targetId` repetidos por nodo, reconstruye los campos dañados desde la mediana exacta de vecinos/nodos finitos supervivientes, y sanea coeficientes no finitos en `WorldModelEngine.weights` / `multiWeights` desde el ancla EWC `W*` (o `0`).
3. **Mecanismo 2 — Separación entre Apoptosis/Neurogénesis (`regeneratedNodes`) y Recableado de Piso (`degreeFloorRewires`)**:
   - **2A (`regeneratedNodes`)**: todo nodo activo huérfano real con grado `0` (`connections.length === 0`) o slot dormante (`!activeNodeIds.has(id)`) tras una lesión se rescata o recluta determinísticamente en el sector más deficitario $s_{\min} = \arg\min_s n_s$, heredando media exacta de coherencia/energía y mediana exacta de pesos sinápticos supervivientes con grado `NODE_CONNECTION_MIN` (`3`). En red sana `S0`, `regeneratedNodes === 0`.
   - **2B (`degreeFloorRewires`)**: todo nodo vivo subconectado con `0 < connections.length < NODE_CONNECTION_MIN` (`3`) refuerza localmente sus enlaces faltantes hasta `NODE_CONNECTION_MIN` sin contabilizarse como nodo regenerado.
4. **Mecanismo 1 — Migración funcional de sector (`migrations`)**:
   - Cuando $\max_s n_s - \min_s n_s \ge 2$ bajo acoplamiento `bidirectional`, migra nodos desde $s_{\max}$ hacia $s_{\min}$ eligiendo $i^* = \arg\max_{i \in s_{\max}} \cos(\phi_i - (\theta_{\text{tower}} + \Delta\theta_{s_{\min}}))$ (desempate por menor `node.id`).
5. **Watchdog W3 — Ruptura de bloqueo cinemático y rescate de suelo de viabilidad (`kinematicUnfreezes`)**:
   - Si el rango de dispersión nodal o variación de `CCC` durante `TEMPORAL_HORIZON` (`10`) ticks consecutivos cae por debajo de la tolerancia explícita `KINEMATIC_FREEZE_EPSILON = 1e-9` (capturando bloqueos con ruido sub-epsilon `1e-12` sin falsos positivos en `S0`), rompe simetría determinísticamente usando las 4 fases `NODAL_SECTORS[s].phaseOffset` y desplazamientos `(s - 1.5) / K^3` alrededor de `clamp(node.coherenceState, 0.5, 0.96 - 1.5 / K^3)` (combinando rescate al punto medio nodal `0.5` cuando la red colapsa por debajo de `0.5` con techo derivado `0.9365625` para que `baseCoh + (s - 1.5)/K^3 <= 0.96` sin recortar asimétricamente la dispersión entre sectores).

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
