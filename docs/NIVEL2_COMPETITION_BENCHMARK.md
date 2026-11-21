# Arena Competitiva Pareada — Nivel 1 (Actual) vs Nivel 2 (Plasticidad Estructural + Watchdog sin parámetros arbitrarios)

- **Esquema**: `qicn.nivel1_vs_nivel2_arena.v1`
- **Digest SHA-256 del reporte**: `32f94f2ab77175c1be2646a52314acecee20e37a6fcc1acaa355444aa7485266`
- **Comando reproducible**: `node scripts/run-nivel1-vs-nivel2-arena.mjs`
- **Configuración experimental**: `seeds = [11, 23, 37, 41, 53]` (`5` semillas), `nodes = 120`, `warmupTicks = 30`, `evalTicks = 60`, modo `bidirectional`, Kaizen `learned`, `SENSOR_OBSERVER_DYNAMICS_ENABLED = true`, mismo snapshot sellado de partida y misma cinta de entrada sintética pareada.
- **Alcance científico**: `evidence_scope = internal_support_only`, `external_support_certified = false`.
- **Restricción verificada**: **cero parámetros numéricos heurísticos o arbitrarios nuevos** en `services/config.js` (únicamente el booleano `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false` para paridad B0 bit-a-bit).

---

## 1. Marcador bruto por escenario (promedio sobre 5 semillas)

| Escenario | Métrica clave | Nivel 1 (Base) | Nivel 2 (Estructural + Watchdog) | Resultado objetivo |
| :--- | :--- | ---: | ---: | :--- |
| **S0 — Sano (control negativo)** | `meanObjectiveScore` / `finalMeanDegree` / `invariantRepairs` | `0.884857` / `4.8917` / — | `0.884868` / `4.9000` / **`0`** | **Sin degradación y `0` falsos positivos** (`0` migraciones, `0` reparaciones, `5` ajustes locales a `NODE_CONNECTION_MIN=3`) |
| **S1 — Amputación sector 0 (25 %)** | Sectores poblados / Nodos activos / `sectorCohMin` / `nonFactFlux` / `bridgeSync` / `objScore` | `3/4` / `90` / `0.0000` / `0.5003` / `0.8600` / `0.8637` | **`4/4`** / **`120`** / **`0.8467`** / **`0.8094`** (**+61.8 %**) / **`0.9380`** / **`0.8914`** | **Victoria clara Nivel 2 (5/5 semillas)** (`60` migraciones + `205` regeneraciones/recableos) |
| **S2 — Tormenta de poda (85 %)** | `finalMeanDegree` / `nonFactFlux` / `crossSectorFlux` / `objScore` | `2.1733` / `0.8806` / `0.9384` / `0.8903` | **`3.0000`** (**+38.0 %**) / **`0.8918`** / **`0.9556`** / **`0.8918`** | **Victoria clara Nivel 2 (5/5 semillas)** (`496` nodos recableados al piso exacto `NODE_CONNECTION_MIN=3`) |
| **S3 — Corrupción `NaN`/`Infinity` (10 % + config)** | `finiteTickRate` / `inTubeRate` / `objScore` / `finalOrphans` / `finalMeanDegree` | `0.0000` / `0.0000` / `0.0000` / `12` / `1.8000` | **`1.0000`** / **`0.9967`** / **`0.8881`** / **`0`** / **`4.9000`** | **Supervivencia total Nivel 2 (5/5 semillas)** frente a colapso total en Nivel 1 (`75` reparaciones quirúrgicas W1/W4) |
| **S4 — Bloqueo cinemático** | `kinematicUnfreezes` / `inTubeRate` / `finalMeanDegree` / `objScore` | `0` / `1.0000` / `4.8917` / `0.8994` | **`5`** (`1`/semilla) / `1.0000` / `4.9000` / `0.8949` | **Empate funcional / detección inmediata W3**: Nivel 2 detecta y rompe el bloqueo en tick 1 en 5/5 semillas; en modo `bidirectional`, `towerFeedback` también descongela suavemente a Nivel 1 (diferencia de `0.0045` en `objScore`) |
| **S5a — Control negativo `reducible_control` ($A=I$)** | `crossSectorFluxShare` / `bridgeSync` / eventos Nivel 2 | `0` / `0` / — | **`0`** / **`0`** / **`0` eventos** | **Honestidad científica 100 %** (idéntico bit-a-bit a Nivel 1; no viola $A=I$) |
| **S5b — Control negativo `td_cut_eta_zero` ($\eta=0$)** | `effective_eta` / `bridgeSync` / eventos Nivel 2 | `0` / `0` / — | **`0`** / **`0`** / **`0` eventos** | **Honestidad científica 100 %** (idéntico bit-a-bit a Nivel 1; no viola $\eta=0$) |

---

## 2. Conclusión empírica (solo soporte interno)

- **Nivel 2 supera decisivamente a Nivel 1** en resiliencia a lesiones focales (`S1`: recupera 4/4 sectores y +61.8 % de flujo no factorizable frente a amputación permanente en Nivel 1), recuperación topológica tras poda masiva (`S2`: recupera el piso exacto `NODE_CONNECTION_MIN = 3.00` frente a `2.17`), y autorreparación ante corrupción numérica imprevista (`S3`: `100 %` ticks finitos frente a `0 %` en Nivel 1).
- **Sin coste en sano ni trampa en controles**: en `S0` produce `0` reparaciones falsas y `0` migraciones espurias; en `S5a`/`S5b` permanece estrictamente inerte; y con `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false`, la equivalencia B0 (`tests/simulation-cycle-driver-equivalence.v1.test.mjs`) permanece `100 %` bit-a-bit idéntica.
- **Límite explícito**: estos resultados demuestran mejor homeostasis, adaptabilidad topológica y tolerancia a fallos internos del software runtime (`internal_support_only`), pero **no** implican validación externa (`external_support_certified = false`), conciencia ni equivalencia biológica.
