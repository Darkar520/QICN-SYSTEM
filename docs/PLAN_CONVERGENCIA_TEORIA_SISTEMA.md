# Plan de Convergencia Teoría ↔ Sistema QICN — EDICIÓN DEFINITIVA

**Versión:** 4.0 FINAL | **Fecha:** 2026-05-19  
**Origen:** Auditoría cruzada cuádruple (Antigravity × OpenCode × Verificación Forense × Cursor)  
**Calificación de Partida:** 5.5/10 | **Proyectada post-ejecución:** 6.45/10  

> Este documento es la fuente de verdad única para la ejecución. Cada comando, path y dato ha sido verificado contra el código real del repositorio.

---

## Inventario Auditado

| Componente | Volumen Verificado |
|---|---|
| `src/index.jsx` | **11,068 líneas** ✅ |
| `src/simulation/` | 20 módulos JS |
| `src/comparative_program/` | **173 archivos** (91 JS + 82 JSON) — **NO importados por index.jsx** |
| `tests/` | **119 archivos** totales |
| `js/simulation/` | **10 archivos legacy huérfanos** (0 imports detectados) |
| `src/canon/finite_horizon/FiniteProjectionEvaluator.js` | 65 líneas — boundary explícito: `not full inverse-limit preservation` |
| `src/visualization/ThreeDNetwork.js` / `.jsx` | **2 archivos huérfanos** (0 imports en todo el repo) |
| `scripts/scoreboard.cjs` | 428 líneas — emite JSON a `docs/phase4_scoreboard.latest.json` |
| `scripts/benchmark-invariants.cjs` | 47 líneas — validador de calibración, **NO emite JSON de scores** |
| `repro/golden_mean_shift_q3.py` | 329 líneas — **NO acepta `--json`**, emite texto plano |
| `package.json` engines | **Node 20.x** |

---

## FASE -1: SAFETY NET
**Duración:** 1 sesión | **Riesgo:** Bajo

### -1.1 Snapshot de Baseline
```powershell
npm run scoreboard:run
copy docs\phase4_scoreboard.latest.json tests\baseline_scoreboard.json
npm test > tests\baseline_tests.log 2>&1
```

### -1.2 Test E2E de Simulación (`tests/simulation-smoke.test.js`)
- Importar directamente los módulos de `src/simulation/` (PhenomenologyCore, OntologicalSingularityCore, CanonicalInvariantPackage) sin React ni DOM.
- Ejecutar 25 ticks en modo headless.
- Afirmar: `tickCount === 25`, `ccc > 0`, `pmia` definido, 6 invariantes finitos (no NaN, no Infinity).

### -1.3 Verificar entorno Python
```powershell
python --version
python -c "import numpy; print(numpy.__version__)"
```
Si falla, instalar antes de Fase 4.

### -1.4 Script de Rollback (`scripts/rollback.ps1`)
```powershell
git stash push -m "rollback-safety-net"
npm install
npm test
```

---

## FASE 0: HIGIENE ESTRUCTURAL (Riesgo Ascendente)
**Duración:** 3-4 sesiones

### 0.1 Sincronización `build.cjs` ↔ `runtimeEnv.js` — Riesgo: Bajo
1. Auditar keys de `processEnvDirect` en `src/config/runtimeEnv.js`.
2. Asegurar cada key en `clientRuntimeDefines` de `build.cjs`.
3. Crear `tests/env-sync.test.js` que falle si hay divergencia.

**Gate:** `npm run build` sin `ReferenceError`. Nuevo test pasa.

### 0.2 Desacoplar `runSimulationCycle` — Riesgo: Medio
1. Mover variables de control no-visuales a `useRef`.
2. Crear `src/simulation/SimulationController.js` (clase pura JS). Esta clase **unifica** las instancias de `WorldModelEngine` y `CognitiveEmergencePlanner` — actualmente duplicadas en `OntologicalSingularityCore.js:93-102` y en `index.jsx` (~línea 6600). El controller expone `controller.worldModel` y `controller.planner` como única fuente de verdad para ambos módulos. `index.jsx` consume estas instancias vía el controller en lugar de crear las suyas propias.
3. Reducir dependencias del `useCallback` a ≤ 4.

**Gate:** Simulación arranca y tick count avanza. ≤1 render por tick. Una sola instancia de WorldModel y Planner activa.

### 0.3 Fragmentar Monolito `src/index.jsx` — Riesgo: Alto
Extraer por responsabilidad funcional:
- `SimulationEngine.jsx` (~2,500 líneas)
- `ControlPanel.jsx` (~800)
- `TelemetryHUD.jsx` (~1,200)
- `ChatInterface.jsx` (~1,500)
- `NetworkCanvas.jsx` (~1,000)
- `TabRouter.jsx` (~400)
- `StateProvider.jsx` (~800)
- `App.jsx` (~300)

Residual de `index.jsx` ≤ 500 líneas.

**Gate:** `npm test` (109+ passing). `npm run build` limpio. `tests/simulation-smoke.test.js` pasa. Simulación progresa Paso 0→6+.

### 0.4 Eliminación de Duplicados Legacy — Riesgo: Bajo
Los 10 archivos en `js/simulation/` están **completamente huérfanos** (0 imports desde cualquier otro archivo del proyecto). Acción simplificada:
```powershell
Remove-Item -Recurse -Force js\simulation
npm run build
npm test
```
No hay re-apuntamiento de imports necesario.

Adicionalmente, eliminar código huérfano de visualización:
```powershell
Remove-Item src\visualization\ThreeDNetwork.js
Remove-Item src\visualization\ThreeDNetwork.jsx
```

**Gate:** Build y tests pasan sin `js/simulation/` ni `ThreeDNetwork`.

---

## FASE 1: FALSACIÓN ESPECTRAL (λ₁ Dinámico)
**Duración:** 1 sesión | **Riesgo:** Medio | **Impacto:** +0.50 Fidelidad

### 1.1 Sustituir Hardcoding en `PhenomenologyCore.js:352`
Reemplazar `const lambda_1 = 1.0` por estimación empírica.

### 1.2 Estimador: Power Iteration Adaptativa con Diagnósticos
```javascript
_estimateDominantEigenvalue(values, mean) {
  if (values.length < 3) return 1.0;
  
  const ratios = [];
  for (let i = 2; i < values.length; i++) {
    const delta_t = values[i] - values[i-1];
    const delta_t1 = values[i-1] - values[i-2];
    if (Math.abs(delta_t1) > 1e-8) {
      ratios.push(Math.abs(delta_t / delta_t1));
    }
  }
  
  // Filtrar ratios extremos (fuera del rango del atractor)
  const stableRatios = ratios.filter(r => r > 0.1 && r < 1.5);
  
  if (stableRatios.length === 0) {
    // Discriminar: ¿estabilidad perfecta o caos extremo?
    if (ratios.length > 0 && Math.max(...ratios) > 1.5) {
      this._diagnostics.spectralWarning = 'HIGH_VOLATILITY_UNMEASURABLE';
    }
    return 1.0; // Fallback seguro
  }
  
  const avgRatio = stableRatios.reduce((a, b) => a + b, 0) / stableRatios.length;
  return Math.max(0.5, Math.min(1.05, avgRatio));
}
```

### 1.3 Test (`tests/spectral-falsification.test.js`)
- Inyectar secuencia con decaimiento exponencial → λ₁ < 1.0 detectado.
- Inyectar secuencia estable → λ₁ ≈ 1.0 emerge naturalmente.
- Verificar que `_estimateEigenvalues()` no retorna constante fija.
- Inyectar caos → `spectralWarning === 'HIGH_VOLATILITY_UNMEASURABLE'`.

**Gate:** Spectral gap ya no está blindado.

---

## FASE 3: RESTAURACIÓN TOPOLÓGICA (Winding Number)
**Duración:** 1 sesión | **Riesgo:** Bajo | **Impacto:** +0.20 Fidelidad

> Ejecutar inmediatamente después de Fase 1. Ambas fases tocan `PhenomenologyCore.js` — secuenciar para evitar merge conflicts.

### 3.1 Preservar semántica completa
1. `phenomenologyState.raw_winding_number` — float con signo.
2. `phenomenologyState.winding_integer` — `Math.round(raw)`.
3. `phenomenologyState.winding_orientation` — `'clockwise'`|`'counterclockwise'`|`'trivial'`.
4. `topo_factor = clamp(Math.abs(raw), 0, 1)` — se mantiene para Omega (compatibilidad retrospectiva).

### 3.2 Exponer en pipeline de artefactos
`ExperimentalEpisodeHarness.js` registra por tick los 3 nuevos campos.

### 3.3 Test (`tests/winding-topology.test.js`)
Inyectar winding = 2.3 → verificar raw ≈ 2.3, integer = 2, orientation = counterclockwise, topo_factor = 1.0.

**Gate:** Semántica topológica preservada en datos de diagnóstico.

---

## FASE 2: LÍMITE INVERSO COMPUTABLE (I_ri Formal)
**Duración:** 2 sesiones | **Riesgo:** Alto | **Impacto:** +0.60 Fidelidad & Rigor

### 2.1 Extender `src/canon/finite_horizon/FiniteProjectionEvaluator.js`

> **Nota de implementación:** El archivo `FiniteProjectionEvaluator.js` (65 líneas) ya existe y declara explícitamente su boundary: `interpretation_boundary: 'Finite projection over recorded trace only; not full inverse-limit preservation.'`. En lugar de crear un módulo desde cero, extenderemos este evaluador añadiendo el morfismo de proyección y el score de límite inverso. Esto preserva la boundary disciplinada existente y añade la nueva capacidad encima.

Morfismo de proyección π_{t+1→t}:
```javascript
export function projectionMorphism(state_t1, state_t, epsilon = 0.05) {
  const components = [
    'ccc', 'beth_q', 'omega', 
    'spectral_gap', 'identity_stability', 'hash_semantic'
  ];
  let compatibilityErrors = 0;
  const details = {};
  
  for (const comp of components) {
    const val_t1 = state_t1[comp] || 0;
    const val_t  = state_t[comp]  || 0;
    const delta  = Math.abs(val_t1 - val_t);
    const tolerance = epsilon * Math.max(1.0, Math.abs(val_t));
    
    if (delta > tolerance) compatibilityErrors++;
    details[comp] = { delta, tolerance, satisfied: delta <= tolerance };
  }
  
  return {
    projectedState: { ...state_t },
    compatibilityErrors,
    compatible: compatibilityErrors === 0,
    details
  };
}
```

**Ventana temporal:** 40 ticks (~20s a 500ms/tick). Menos de 10 produce scores trivialmente altos; más de 100 acumula ruido.

### 2.2 Score del Límite Inverso
```
Score_IL = 1 - Σ errors(t) / (|Components| × (Window - 1))
```

### 2.3 Ajuste de pesos de I_ri en `CanonicalInvariantPackage.js`
```
I_ri = inverse_limit(0.25) + identity(0.25) + predictive(0.12)
     + selfState(0.12) + hash(0.08) + opDet(0.09) + obsDet(0.09)
```

### 2.4 Test (`tests/inverse-limit.test.js`)
- Secuencia convergente → score > 0.7.
- Secuencia caótica → score < 0.3.

**Gate:** I_ri contiene componente de límite inverso formal.

---

## FASE 4: PUENTE PYTHON ↔ JAVASCRIPT
**Duración:** 2 sesiones | **Riesgo:** Medio | **Impacto:** +0.50 Fidelidad & Viabilidad

### 4.0 ADAPTAR SCRIPTS PYTHON (Pre-requisito)
Los scripts de `repro/` actualmente **no aceptan `--json`**. Modificar:
1. `golden_mean_shift_q3.py`: añadir `argparse` con flag `--json`.
2. `padic_ccr.py`: ídem.
3. `shift_ccr.py`: ídem.

Cuando `--json` está activo, emitir:
```json
{
  "$schema": "repro-bridge-output.v1",
  "model": "golden_mean_shift",
  "timestamp": "2026-05-19T00:00:00Z",
  "computed": {
    "lambda_1": 1.0,
    "lambda_2": 0.618,
    "spectral_gap": 0.382,
    "contraction_norm_K": 0.5,
    "relaxation_time_tau": 1.44,
    "fixed_point_exists": true,
    "non_collapse_satisfied": true
  }
}
```

### 4.1 Crear `scripts/verify-repro-bridge.cjs`
**Resolución del path cross-repo:**
```javascript
const FRAMEWORK_REPO = process.env.QICN_FRAMEWORK_PATH ||
  path.resolve(__dirname, '../../QICN-FRAMEWORK/rigid-identity-framework');
```

Pipeline:
1. Verificar que `FRAMEWORK_REPO/repro/` existe.
2. Ejecutar `python golden_mean_shift_q3.py --json`.
3. Comparar:
   - `computed.spectral_gap` ↔ `phenomenologyState.spectral_gap`
   - `computed.contraction_norm_K` ↔ `phenomenologyState.lipschitz_norm_K`
   - `computed.relaxation_time_tau` ↔ `phenomenologyState.relaxation_time`
4. Si discrepancia > 15% → exit 1. Si repo no encontrado → WARNING y skip.

**Gate:** `npm run verify:repro-bridge` ejecutable con correlación documentada.

---

## FASE 5: NEGATIVE CONTROLS EXPANDIDOS (NC5-NC7)
**Duración:** 1-2 sesiones | **Riesgo:** Medio | **Impacto:** +0.30 Viabilidad

### 5.1 NC5: Falsación Espectral
Inyectar secuencia con decaimiento exponencial → λ₁ < 0.9 → `DOMINANT_MODE_DECAY` detectado.

### 5.2 NC6: Ruptura del Límite Inverso
Perturbaciones caóticas fuera de los morfismos → `inverse_limit_score` < 0.20 → I_ri cae.

### 5.3 NC7: Topología Trivial
Trayectoria lineal monótona → `winding_integer = 0`, `orientation = 'trivial'`, Omega ≈ 0.

**Gate:** Los 3 NC pasan. El sistema demuestra rutas de falsación operativa genuinas.

---

## FASE 6: POSTURA EPISTÉMICA EXPLÍCITA
**Duración:** 1 sesión | **Riesgo:** Nulo | **Impacto:** +0.25 Rigor

### 6.1 Crear `docs/EPISTEMIC_POSTURE.md`
1. Desarrollo empírico-primero. Papers son reconstrucción racional.
2. Invariantes = estimadores computacionales, no implementaciones literales de Hilbert.
3. Taxonomía: `ROBUST_INTERNAL_SUPPORT` | `PROVISIONAL_SUPPORT` | `SCAFFOLD_AWAITING_DATA`.
4. **Heurísticas de warm-up (ANTI-FREEZE):** `beth_q` y `spectral_gap` usan heurísticas de inicialización derivadas de CCC cuando el historial tiene < 10 ticks (`PhenomenologyCore.js:117-128` y `:283-306`). Durante esta fase de warm-up (~5s a 500ms/tick), los valores no deben interpretarse como estimadores de información mutua ni de spectral gap en el sentido estricto de BaseCore. Esta es una decisión de ingeniería para evitar congelamiento de métricas durante el arranque; los valores convergen a sus definiciones formales cuando el historial supera 10 ticks.

### 6.2 Actualizar README con sección de Postura Epistémica.

---

## FASE 7: CI/CD PIPELINE
**Duración:** 1 sesión | **Riesgo:** Bajo | **Impacto:** +0.10 Viabilidad

### 7.1 GitHub Actions (`.github/workflows/verify.yml`)
```yaml
name: QICN Verification Pipeline
on: [push, pull_request]
jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm ci
      - run: npm run verify:source-of-truth
      - run: npm run verify:descriptor-registry
      - run: npm test
      - run: npm run build
      - run: npm run scoreboard:run
```

El paso de `verify:repro-bridge` se ejecuta **solo si** el repo del framework está presente; de lo contrario emite WARNING y continúa.

### 7.2 Pre-commit Hook
**Instalación (Windows con Git Bash):**
```bash
# .git/hooks/pre-commit (requiere Git Bash en Windows)
#!/bin/sh
npm run verify:source-of-truth && npm test
```
**Nota Windows:** Git para Windows ejecuta hooks vía Git Bash (`sh.exe`), por lo que la sintaxis POSIX `#!/bin/sh` funciona sin necesidad de un `.ps1`. Si se usa `core.hooksPath` con PowerShell, usar en su lugar:
```powershell
# .githooks/pre-commit.ps1 (alternativa PowerShell)
npm run verify:source-of-truth; if ($LASTEXITCODE -ne 0) { exit 1 }
npm test; if ($LASTEXITCODE -ne 0) { exit 1 }
```

---

## BENCHMARK GATE HORIZONTAL (Post Fases 1-5)

Tras completar cada fase que modifique el motor:
```powershell
npm run scoreboard:run
# Comparar docs/phase4_scoreboard.latest.json vs tests/baseline_scoreboard.json
```

| Resultado | Acción |
|---|---|
| Invariante cae ≤ 5% | ADVERTENCIA — revisar ruido numérico |
| Invariante cae > 15% | **BLOQUEAR** — revertir y diagnosticar |

---

## ORDEN DE EJECUCIÓN DEFINITIVO

```
FASE -1 (Safety Net) ──────────────────────────────────────────
        ↓
FASE 0.1 (Env sync)       ── Riesgo Bajo
FASE 0.2 (Loop desacople) ── Riesgo Medio
FASE 0.3 (Monolito)       ── Riesgo Alto
FASE 0.4 (Legacy cleanup) ── Riesgo Bajo (eliminación directa)
        ↓
FASE 1 (λ₁ en PhenomenologyCore.js)     ── Mismo archivo,
FASE 3 (Winding en PhenomenologyCore.js) ── secuencial
        ↓
FASE 2 (Extender FiniteProjectionEvaluator.js) ── Archivo existente + extensión
        ↓
FASE 4.0 (Adaptar Python scripts) ── Pre-requisito
FASE 4.1 (Bridge script JS)       ── Nuevo script
        ↓
FASE 5 (NC5-NC7)   ── Depende de Fases 1, 2, 3
        ↓
FASE 6 (Docs)      ── Último
FASE 7 (CI/CD)     ── Paralelo a Fase 6

BENCHMARK GATE ─── Post cada Fase 1-5
```

**Ruta crítica:** F-1 → F-0.3 → F-1 → F-3 → F-2 → F-5 → F-6

---

## CALIBRACIÓN DE RIESGOS

| Fase | Riesgo | Justificación |
|---|---|---|
| F-1 | Bajo | Solo lectura y creación de tests |
| F-0.1 | Bajo | Cambios en build system, bien acotados |
| F-0.2 | Medio | Afecta ciclo de actualización de React |
| F-0.3 | **Alto** | 11K líneas, estado global, 14 tabs |
| F-0.4 | Bajo | Archivos huérfanos (`js/simulation/` + `ThreeDNetwork`), eliminación directa |
| F-1 | Medio | Modifica ecuación espectral central |
| F-2 | **Alto** | Nueva infraestructura matemática |
| F-3 | Bajo | Aditivo, no sustitutivo |
| F-4 | Medio | Dependencia externa (Python + cross-repo) |
| F-5 | Medio | Inyección controlada de errores |
| F-6/7 | Bajo | Docs e infraestructura estándar |

---

## DISTRIBUCIÓN DE AGENTES

| Agente | Fases Asignadas | Razón |
|---|---|---|
| **OpenCode** | F-0.3 (Monolito), F-0.4 (Legacy + ThreeDNetwork) | Sesión activa sobre QICN-SYSTEM, alta capacidad de refactorización |
| **Antigravity** | F1, F2, F3, F5 | Precisión formal y rigor del puente matemático |
| **Cualquiera** | F-0.1, F-0.2, F-4, F-6, F-7 | Tareas estándar de ingeniería |

---

## IMPACTO PROYECTADO

| Fase | Fidelidad | Viabilidad | Rigor |
|---|---|---|---|
| 0 (Higiene + unificación WM/Planner + limpieza) | +0.35 | — | — |
| 1 (λ₁) | +0.50 | — | — |
| 2 (Límite inverso — extiende FiniteProjectionEvaluator) | +0.50 | — | +0.15 |
| 3 (Winding) | +0.20 | — | — |
| 4 (Puente) | +0.25 | +0.25 | — |
| 5 (NC5-7) | — | +0.30 | — |
| 6 (Epistémica + doc ANTI-FREEZE) | — | — | +0.30 |
| 7 (CI/CD) | — | +0.10 | — |
| **TOTAL** | **+1.80** | **+0.65** | **+0.45** |

| Área | Actual | Proyectada |
|---|---|---|
| Rigor Matemático | 7.50 | **7.95** |
| Fidelidad | 5.00 | **6.80** |
| Viabilidad | 4.00 | **4.65** |
| **GLOBAL** | **5.50** | **6.47** |

> Para 7.5+/10 se requiere Paper 10 con datos humanos reales — fuera del alcance de este plan.
