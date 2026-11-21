# Arena Competitiva Pareada — Nivel 1 (Base) vs Nivel 2 (Plasticidad Estructural + Watchdog de Invariantes)

- **Esquema**: `qicn.nivel1_vs_nivel2_arena.v1`
- **Digest SHA-256 del reporte**: `5cd2cdf69a7027611b4cc502abedd7fa63d25940d278cb723c06f7f0b26970b8`
- **Comando reproducible**: `node scripts/run-nivel1-vs-nivel2-arena.mjs`
- **Configuración experimental**: `seeds = [11, 23, 37, 41, 53]` (`5` semillas), `nodes = 120`, `warmupTicks = 30`, `evalTicks = 60`, modo `bidirectional`, Kaizen `learned`, `SENSOR_OBSERVER_DYNAMICS_ENABLED = true`, mismo snapshot sellado de partida y misma cinta de entrada sintética pareada.
- **Alcance científico**: `evidence_scope = internal_support_only`, `external_support_certified = false`.
- **Restricción verificada**: **cero hiperparámetros numéricos configurables nuevos** en `services/config.js` (únicamente el conmutador booleano `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: false` para paridad B0 bit-a-bit; las constantes estructurales internas son deterministas y se derivan de `K = NODAL_SECTORS.length = 4`, `NODE_CONNECTION_MIN = 3`, `TEMPORAL_HORIZON = 10` y cotas de dominio del núcleo).

---

## 1. Marcador bruto por escenario (promedio sobre 5 semillas)

| Escenario | Métrica clave | Nivel 1 (Base) | Nivel 2 (Estructural + Watchdog) | Resultado objetivo |
| :--- | :--- | ---: | ---: | :--- |
| **S0 — Sano (control negativo)** | `meanObjectiveScore` / `finalMeanDegree` / `regenerated` / `invariantRepairs` | `0.884857` / `4.8917` / — / — | `0.884868` / `4.9000` / **`0`** / **`0`** | **Sin degradación y `0` falsos positivos** (`0` migraciones, `0` regenerados por apoptosis/neurogénesis, `0` reparaciones, `5` refuerzos locales de piso `0 < deg < 3`) |
| **S1 — Amputación sector 0 (25 %)** | Sectores poblados / Nodos activos / `sectorCohMin` / `nonFactFlux` / `bridgeSync` / `objScore` | `3/4` / `90` / `0.0000` / `0.5003` / `0.8600` / `0.8637` | **`4/4`** / **`120`** / **`0.8466`** / **`0.8105`** (**+62.0 %**) / **`0.9380`** / **`0.8920`** | **Victoria clara Nivel 2 (5/5 semillas)** (`60` migraciones + `152` regenerados por apoptosis/neurogénesis + `54` recableados de piso) |
| **S2 — Tormenta de poda (85 %)** | `finalMeanDegree` / `inTubeRate` / `nonFactFlux` / `crossSectorFlux` / `objScore` | `2.1733` / `1.0000` / `0.8806` / `0.9384` / `0.8903` | **`3.0000`** (**+38.0 %**) / **`1.0000`** / **`0.8918`** / **`0.9556`** / **`0.8916`** | **Victoria clara Nivel 2 (5/5 semillas)** (`46` huérfanos grado 0 rescatados + `450` nodos recableados al piso exacto `NODE_CONNECTION_MIN=3`) |
| **S3 — Corrupción `NaN`/`Infinity` (10 % + config)** | `finiteTickRate` / `inTubeRate` / `objScore` / `finalOrphans` / `finalMeanDegree` | `0.0000` / `0.0000` / `0.0000` / `12` / `1.8000` | **`1.0000`** / **`0.9967`** / **`0.8881`** / **`0`** / **`4.9000`** | **Supervivencia total Nivel 2 (5/5 semillas)** frente a colapso total en Nivel 1 (`75` reparaciones quirúrgicas W1/W4) |
| **S4 — Bloqueo cinemático sostenido (12 ticks, ruido `1e-12`)** | `kinematicUnfreezes` / `inTubeRate` / `sectorCohMin` / `objScore` | `0` / `0.7833` / `0.5641` / `0.8728` | **`60`** (`12`/semilla) / **`0.9967`** (**+27.2 %**) / **`0.7113`** (**+26.1 %**) / **`0.8883`** | **Victoria clara Nivel 2 (5/5 semillas)**: `W3` ($\varepsilon = 10^{-9}$) detecta el colapso con ruido `1e-12` y mantiene la red en el tubo de viabilidad durante los 12 ticks del bloqueo |
| **S5a — Control negativo `reducible_control` ($A=I$)** | `crossSectorFluxShare` / `bridgeSync` / eventos Nivel 2 | `0` / `0` / — | **`0`** / **`0`** / **`0` eventos** | **Honestidad científica 100 %** (idéntico bit-a-bit a Nivel 1; no viola $A=I$) |
| **S5b — Control negativo `td_cut_eta_zero` ($\eta=0$)** | `effective_eta` / `bridgeSync` / eventos Nivel 2 | `0` / `0` / — | **`0`** / **`0`** / **`0` eventos** | **Honestidad científica 100 %** (idéntico bit-a-bit a Nivel 1; no viola $\eta=0$) |

---

## 2. Conclusión empírica (solo soporte interno)

- **Nivel 2 supera decisivamente a Nivel 1 en los 4 escenarios de lesión/fallo (`S1`–`S4`)**:
  - Resiliencia a lesiones focales (`S1`: recupera `4/4` sectores y `+62.0 %` de flujo no factorizable frente a amputación permanente en Nivel 1).
  - Recuperación topológica tras poda masiva (`S2`: rescata `46` huérfanos reales de grado `0` y refuerza `450` nodos subconectados hasta el piso exacto `NODE_CONNECTION_MIN = 3.00` frente a `2.17`).
  - Autorreparación quirúrgica ante corrupción numérica imprevista (`S3`: `100 %` ticks finitos frente a `0 %` en Nivel 1).
  - Desbloqueo cinemático ante colapso sostenido con ruido sub-epsilon `1e-12` (`S4`: `inTubeRate = 0.9967` vs `0.7833` y `meanObjectiveScore = 0.8883` vs `0.8728`).
- **Sin falsos positivos en sano ni trampa en controles**: en `S0` produce `0` reparaciones falsas, `0` migraciones espurias y `0` regeneraciones por apoptosis/neurogénesis; en `S5a`/`S5b` la plasticidad topológica permanece estrictamente inerte; y con `STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false`, la equivalencia B0 (`tests/simulation-cycle-driver-equivalence.v1.test.mjs`) permanece `100 %` bit-a-bit idéntica.
- **Límite explícito**: estos resultados demuestran mejor homeostasis, adaptabilidad topológica y tolerancia a fallos internos del software runtime (`internal_support_only`), pero **no** implican validación externa (`external_support_certified = false`), conciencia ni equivalencia biológica.
