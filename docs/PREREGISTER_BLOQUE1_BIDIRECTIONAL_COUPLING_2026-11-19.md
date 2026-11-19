# Prerregistro Arquitectónico — Bloque 1: Acoplamiento Bidireccional Nodo–Torre y Evaluación Endógena Viva

- **Fecha:** 2026-11-19
- **Repositorio runtime:** `QICN-SYSTEM` (base: `main` = `9fe8069a053977c81383c855112b9ac07754b6f8`)
- **Marco teórico de referencia (solo lectura):** `qicn-framework-ordenado` (`main` = `e3ee6bf4e533138b179c6caeee679509a57e13f5`, `929` entradas, `383` macros, `42` módulos Lean `4.31.0` / `367` teoremas públicos)
- **Alcance epistémico:** `evidence_scope: internal_support_only` · `external_support_certified = false`. Ningún mecanismo de acoplamiento finito en la red de `1500` nodos hereda automáticamente las pruebas de límite inverso infinito de `BaseCore` o `Paper I`, ni cierra los cinco requisitos externos del puente fenomenal.

---

## 1. Diagnóstico de partida que resuelve el Bloque 1

1. **Unidireccionalidad previa:** `NodalProcessingLayer` (`1500` nodos) alimentaba escalares hacia `OntologicalSingularityCore.stepCoupledTower`, pero las torres constructivas (`WritablePrefixTower`, `BodyWorldTower`, `SigmaAutomodelTruncator` `T_d`) no ejercían retroalimentación real de regreso sobre `ConsciousNode`, `NodalProcessingLayer` ni `InformationalEntanglementField`.
2. **Desconexión de Ejes 1 y 2 respecto a la red viva:** `EndogenousEpistemicDecisionEngine` evaluaba los Ejes 1 y 2 únicamente con constantes exactas de los módulos algebraicos embebidos ($\mathbb{F}_2^2, \mathbb{F}_2^3, \mathbb{F}_3^2$ y `Bool^5`), sin acoplar una contraparte viva y continua sobre las cohortes reales de los `1500` nodos.
3. **Eje 4 insensible a la degradación nodal:** `axis4Passed` solo comprobaba `sigmaExactDefect === '0'`, `sigmaDefectBound === '2/2187'` y `activeRetention > 0`, emitiendo `AFFIRMATIVE_STRUCTURAL_PRESENCE` con `score = 1` incluso en `PRE_CONSCIOUS` (`CCC < 1`) o ante colapso/estasis de la red nodal.

---

## 2. Decisiones arquitectónicas y preservación estricta de candados

### 2.1 Preservación bit a bit del candado B0 (`454dcb9`)
- `tests/simulation-cycle-driver-equivalence.v1.test.mjs` intercepta todos los archivos de `src/` y `services/` contra `454dcb9` y exige igualdad exacta de `series`, `final` y bytes completos de captura v3 (`captureDynamicState`, que serializa todas las propiedades enumerables propias de `nodalLayer`, `ontologicalCore`, `entanglementField` y `ConsciousNode`).
- **Solución limpia:** introducir `QICNConfig.NODAL_TOWER_COUPLING_MODE` con 4 modos explícitos (`'off'`, `'bidirectional'`, `'td_cut_eta_zero'`, `'reducible_control'`):
  - En `services/config.js`, el valor base permanece en `'off'` para que tanto el runner histórico B0 (`run-full-cycle-language-ablation.mjs`) como la ablación preregistrada `scripts/run-historical-dependence-ablation.mjs` (`CN-1..CN-4` `5/5` semillas) ejecuten **exactamente la misma trayectoria, RNG y conjunto de propiedades enumerables** (cero propiedades nuevas en modo `'off'`, cero lecturas RNG extra).
  - En la interfaz interactiva (`src/components/SimulationEngine.jsx`), el runtime inicia activamente en **`'bidirectional'`** por defecto y expone un selector explícito en la barra lateral para conmutar en vivo entre `Bidireccional (activo)`, `Corte físico (η = 0)`, `Control reducible (A = I)` y `Off (compatibilidad B0)`.
- **Preservación de contratos congelados (`v2/v3/v4` y `runtimeSnapshot.js`):** no se modifica ninguno de los 9 archivos congelados (`runtimeSnapshot.js`, `freeRealization.js`, `realizationContract.js`, etc.). La telemetría del puente vivo `nodal_tower_bridge` viaja dentro de `constructiveFiniteCuts` únicamente cuando `NODAL_TOWER_COUPLING_MODE !== 'off'`, heredando automáticamente el sellado SHA-256 del snapshot congelado (`runtimeSnapshot.js:242`) sin alterar los hashes dorados `GOLDEN_RUNTIME` / `GOLDEN_TOWER` de `4142610`.

### 2.2 Topología de 4 sectores y puente bidireccional (`src/simulation/NodalTowerCouplingBridge.js`)
- **Asignación topológica determinista (0 consumo RNG):** cada nodo `id` pertenece al sector `sectorId = ((id % 4) + 4) % 4`:
  - Sector `0` (`body_v_pos`): cohorte acoplada al puerto corporal positivo `v_pos`.
  - Sector `1` (`body_v_neg`): cohorte acoplada al puerto corporal negativo `v_neg`.
  - Sector `2` (`world_w_fast`): cohorte acoplada al canal rápido del mundo `w_fast`.
  - Sector `3` (`world_w_slow`): cohorte acoplada al canal lento del mundo `w_slow`.
- **Subida (`Nodos -> Torre Constructiva`):** los 4 sectores proyectan contrastes acotados de coherencia/energía (`bodyBalance`, `worldContrast`, `interSectorSignalFlux`, `phaseCoherence`) sobre las entradas cuantizadas (`F(num, 64)`) de `stepCoupledTower`, preservando exactitud racional total en `WritablePrefixTower`, `BodyWorldTower` y `SigmaAutomodelTruncator` (`T_d`, $d = 6$).
- **Bajada (`Torre Constructiva -> Nodos`):**
  1. `processSignals`: registra flujo intra-sector e inter-sector real (`interSectorSignalFlux`); en `'bidirectional'` refuerza acotadamente la transmisión cruzada con `activeRetention * (8 * eta_eff)`; en `'reducible_control'` ($A = I$) bloquea físicamente la propagación inter-sector (`factor = 0`); en `'td_cut_eta_zero'` ($\eta = 0$) elimina el refuerzo constructivo (`factor = 0.35`).
  2. `ConsciousNode.introspectiveUpdate` / `applyTowerFeedbackToNodes`: acoplamiento acotado de fase tipo Kuramoto hacia fases objetivo ligadas a `tower_phase` y el rol del sector, más modulación acotada de energía y coherencia por polaridad corporal `(v_pos - v_neg)`, contraste temporal `(w_fast - w_slow)` y retención activa (`9/16`) cuando `sigmaExactDefect === '0'` y `eta_eff > 0`. En `'td_cut_eta_zero'` o `'reducible_control'` se retira esta sincronización y se induce desacoplo real observable.
  3. `InformationalEntanglementField.applyNodalPlasticity`: refuerzo Hebbiano diferencial y protección del umbral de poda para aristas inter-sector en modo `'bidirectional'`; retirada de protección (y decaimiento de aristas cruzadas en `'reducible_control'`) al lesionar el acoplamiento.
- **Métricas vivas calculadas en $O(N + E)$:**
  - `couplingMatrix` (4×4), `interSectorCouplingRatio`, `interSectorSignalFlux`, `phaseOrderBySector`, `meanCoherenceBySector`, `nodalNonFactorizabilityFlux` $\in [0, 1]$ y `bridgeNodalSyncIndex` $\in [0, 1]$.
- **Superficie de telemetría 60 FPS para Bloque 2 (WebGL 3D):** `NodalProcessingLayer.get3DTelemetryView(towerTelemetry, endogenousDecision)` respaldada por `TypedArray`s reutilizables en un `WeakMap` (cero clonaciones por frame, cero impacto en serialización v3).

### 2.3 Condiciones dinámicas reales en `EndogenousEpistemicDecisionEngine.js`
- **Eje 1 (plano exacto + no-factorizabilidad viva):** conserva `δ_int = 1/4` ($\mathbb{F}_2^2$), `1/8` ($\mathbb{F}_3^2$) frente a `A = I` (`0`); cuando hay puente vivo, exige además `!reducible_control_active`, `inter_sector_coupling_ratio >= 0.25` y `nodal_non_factorizability_flux >= 0.18`. Si falla -> `NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS`.
- **Eje 2 (plano exacto 5 raíces + sincronía viva nodo–torre):** conserva `G = 1/2097152`, `253/536870912 > G/2` ($\varepsilon \le G/1024 + B w_c$), `(2,1) = 3/16777216`, `R = 0`; cuando hay puente vivo, exige además `!td_cut_active`, `effective_eta !== '0'` y `bridge_nodal_sync_index >= 0.22`. Si falla -> `NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS`.
- **Eje 4 (coherencia acoplada viva verdaderamente sensible):**
  - **Fallo / lesión (`NEGATIVE`):** `sigma_exact_defect !== '0'`, `sigma_defect_bound !== '2/2187'`, `!(active_retention > 0)`, colapso nodal (`ccc < 0.45` o `x_n < 0.30`), estasis severa (`stasis_index > 0.85`), fragmentación severa (`node_coherence_dispersion > 0.35` o `active_node_fraction < 0.50`) o puente lesionado (`td_cut_active || reducible_control_active || bridge_nodal_sync_index < 0.22`).
  - **Reserva / warmup (`RESERVE`):** no colapsado, pero por debajo del piso operacional acoplado (`ccc < 0.78` o `x_n < 0.56` o `bridge_nodal_sync_index < 0.45` o `inter_sector_signal_flux < 0.05` con puente vivo; `ccc < 0.72` o `x_n < 0.52` sin puente vivo), o estasis elevada (`0.72 < stasis_index <= 0.85`), o Eje 3 aún en `ACTIVE_INITIAL_WARMUP` sin consolidar.
  - **Afirmativo (`AFFIRMATIVE_STRUCTURAL_PRESENCE`):** convergencia simultánea de los 4 ejes por encima del piso operacional acoplado y consolidación histórica. En régimen sub-umbral (`ccc < 1.0`, `PRE_CONSCIOUS`), `axis4.score` se acota estrictamente por debajo de `1.0` (`<= 0.94`), de modo que `overall_score = 1.0` **nunca** se emite en `PRE_CONSCIOUS` y queda reservado a operación post-umbral consolidada (`ccc >= 1.0`).

### 2.4 Estado documentado de `docs/bridge_pin.v1.json`
- El pin local `docs/bridge_pin.v1.json` y el manifiesto cuarentenado `qicn_imported_manifest_v39.json` (`193` archivos) siguen anclados a la importación verificada `5769ecf` (`local_drift = 0`, `upstream_drift = 4` en reportes/registro no bloqueantes), mientras que `src/language/frameworkSummary.generated.js` está sincronizado directamente con `e3ee6bf`. Re-importar los 193 archivos queda fuera del alcance del Bloque 1 para no alterar hashes de cuarentena sin fase dedicada de re-importación.
