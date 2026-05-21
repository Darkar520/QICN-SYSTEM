# ROADMAP DE PROFESIONALIZACIÓN QICN: 6.47 → 10/10

**Versión:** 1.1 REFINADO | **Fecha:** 2026-05-21  
**Base:** Plan de Convergencia v4.0 (EJECUTADO — 13 commits, 76 archivos, 116/116 tests, 7/7 scoreboard)  
**Calificación Actual:** 6.47/10 | **Objetivo:** 7.9/10 (techo por ingeniería pura)  
**Metodología:** Auditoría forense multi-dimensional + análisis de gaps residuales + refinamiento cruzado (OpenCode × Antigravity)

---

## INSTRUCCIÓN PARA CODEX

**Modo de ejecución:** ONE SHOT. No preguntar. No pausar. Si hay ambigüedad, tomar la decisión más conservadora y documentarla. Cada fase tiene gates explícitos. No avanzar a la siguiente fase sin pasar el gate.

**Antes de comenzar:**
1. Leer `AGENTS.md` completo — es la constitución operativa del sistema
2. Leer `docs/EPISTEMIC_POSTURE.md` — taxonomía de claims
3. Leer `docs/IMPLEMENTATION_STATUS.md` — estado real de cada capa
4. Leer `IMPLEMENTATION_LOG.md` — historial de ejecución del plan anterior
5. Ejecutar `npm test`, `npm run build`, `npm run scoreboard:run` — capturar baseline

**Reglas de seguridad heredadas del plan v3.0:**
- NO modificar papers LaTeX ni marco teórico
- NO modificar `src/canon/calibration/heuristic_frozen_v1.json`
- NO tocar `comparative_program/` (Paper 10 — fuera de scope)
- Si un cambio rompe `npm test` o `npm run build` → arreglar ANTES de continuar
- Commit tras cada fase completada
- Documentar todo en `IMPLEMENTATION_LOG.md`

---

## DIAGNÓSTICO: ¿POR QUÉ 6.47 Y NO 10?

El plan anterior cerró las brechas **teoría ↔ código** (λ₁ dinámico, límite inverso, winding, NC5-NC7, puente Python, postura epistémica, CI/CD). Lo que queda son brechas de **profesionalización arquitectónica, calidad de ingeniería, y madurez operativa**.

### Distribución del Delta Restante (3.53 puntos)

| Área | Gap Estimado | Causa Raíz |
|---|---|---|
| **Arquitectura (Monolito)** | 1.20 | `App.jsx` = 11,100 líneas sin separación de responsabilidades |
| **Testing & Coverage** | 0.60 | 116 tests pero sin coverage medible, sin tests de integración browser, sin mutation testing |
| **Calidad de Código** | 0.50 | Sin linter configurado, sin type checking, imports desordenados |
| **Observabilidad Runtime** | 0.40 | Métricas internas existen pero no hay dashboard, ni logging estructurado, ni health checks formales |
| **Working Tree & Housekeeping** | 0.25 | 10 archivos sin commitear, untracked docs valiosos no trackeados |
| **CI/CD Madurez** | 0.25 | Pipeline mínimo sin Python, sin caching, sin scoreboard artifact upload |
| **Documentación Operativa** | 0.18 | Falta onboarding guide, falta CONTRIBUTING.md, API surface no documentada |
| **Paper 10 Infrastructure** | 0.15 | Gates abiertos pero sin harness de ejecución real |
| **TOTAL** | **3.53** | |

---

## FASE 8: HOUSEKEEPING Y CONSOLIDACIÓN DEL WORKING TREE
**Riesgo:** Bajo | **Impacto:** +0.25 | **Duración:** 1 sesión

### 8.1 Commitear Correcciones Pendientes
Los siguientes cambios en el working tree son mejoras funcionales que deberían ser comiteadas:

```powershell
git add scripts/benchmark-invariants.cjs    # Fix: remueve hardcoded "49", verifica dinámicamente
git add scripts/evaluate-roeo.cjs           # Consolida imports desde index.js
git add src/simulation/SensoryPerceptionEngine.js  # Fix: console.error → console.warn para errores de cámara esperados
git add tests/liveness.test.js              # Fix: assertions de TDZ ordering para buildWorkspaceSnapshot
git add index.html                          # Añade favicon
git commit -m "fix(housekeeping): working tree corrections post-convergence plan"
```

### 8.2 Resolver Eliminaciones Pendientes
```powershell
# Verificar contenido de archivos antes de eliminar (contexto histórico)
git show HEAD:TRIADA_QICN_ROADMAP_v2.md > $null 2>&1
git show HEAD:docs/AUDIT_INTEGRACION_QICN_CODEX.md > $null 2>&1

# Si su contenido ya está capturado en docs/PLAN_CONVERGENCIA_TEORIA_SISTEMA.md o IMPLEMENTATION_LOG.md:
git add TRIADA_QICN_ROADMAP_v2.md docs/AUDIT_INTEGRACION_QICN_CODEX.md
git commit -m "chore(cleanup): remove obsolete roadmap and audit docs"
# Si contienen contexto no capturado en otra parte, documentar en IMPLEMENTATION_LOG.md antes de eliminar
```

### 8.3 Trackear Documentos Valiosos
```powershell
git add docs/PLAN_CONVERGENCIA_TEORIA_SISTEMA.md     # El plan ejecutado — debe estar trackeado
git add docs/BRIEF_QICN_SISTEMA_Y_ARCO_TEORICO.md    # Brief del sistema
git add docs/ROADMAP_PROFESIONALIZACION.md            # Este documento
git commit -m "docs(governance): track convergence plan, system brief, and professionalization roadmap"
```

### 8.4 Mover `QICN GPT5.5/` fuera del repo y actualizar `.gitignore`
```powershell
# Este directorio es una copia de referencia con node_modules y ZIPs anidados — no debe estar en el repo
Move-Item "QICN GPT5.5" "C:\Users\irisp\OneDrive\Escritorio\QICN GPT5.5_backup"
```
Añadir a `.gitignore`:
```
QICN GPT5.5/
coverage/
```

**Gate:** `git status --short` muestra 0 archivos modificados, 0 untracked relevantes. `.gitignore` actualizado. `npm test` PASS. `npm run build` PASS.

---

## FASE 9: FRAGMENTACIÓN DEL MONOLITO `App.jsx`
**Riesgo:** Alto | **Impacto:** +1.20 | **Duración:** 3-4 sesiones

> Esta es la fase más importante del roadmap. `App.jsx` tiene 11,100 líneas con estado global, 14 pestañas, lógica de simulación, chat, telemetría, y canvas, todo en un solo archivo. Esto es la causa raíz de la mayor pérdida de puntuación.

### 9.1 Análisis Previo (NO modificar código aún)
Antes de fragmentar, mapear las dependencias internas:
1. Identificar todos los `useState`, `useRef`, `useCallback`, `useEffect` en `App.jsx`
2. Clasificar cada estado en: `simulation_state`, `ui_state`, `telemetry_state`, `chat_state`, `network_state`, `config_state`
3. Identificar qué estados cruzan responsabilidades funcionales (estos son los "puentes" que requieren Context o props)
4. Documentar el mapa de dependencias en `docs/APP_DEPENDENCY_MAP.md`

### 9.2 Crear Contexts de Estado (Divididos para evitar re-renders masivos)

Un solo `SimulationContext` con 10+ campos causaría re-renders en todos los consumidores cada ~500ms. Dividir en dos contextos:

**`src/contexts/SimulationStateContext.jsx`** — métricas que cambian cada tick (~500ms):
- `tickCount`, `ccc`, `pmia`, `omega`, `beth_q`, `spectral_gap`, `stasisIndex`
- Componentes consumidores: `TelemetryHUD`, `NetworkCanvas` (solo lectura)

**`src/contexts/SimulationConfigContext.jsx`** — valores estables (cambian solo en start/stop/reset):
- `simulationControllerRef` (referencia al `SimulationController.js`)
- `isRunning`, `currentPhase`, `sensorsMode`
- Componentes consumidores: `SimulationEngine`, `ControlPanel`, `ChatInterface`

Esto garantiza que `ControlPanel` no se re-renderice con cada tick solo porque `ccc` cambió.

### 9.3 Extraer Componentes por Responsabilidad

| Componente | Responsabilidad | Líneas Estimadas | Dependencias |
|---|---|---|---|
| `SimulationEngine.jsx` | Loop de simulación, tick processing, métricas | ~2,500 | SimulationContext, SimulationController |
| `ControlPanel.jsx` | Botones de control, configuración, sliders | ~800 | SimulationContext |
| `TelemetryHUD.jsx` | Dashboard de métricas, gráficos, indicadores | ~1,200 | SimulationContext (read-only) |
| `ChatInterface.jsx` | Chat con el sistema, input/output, historial | ~1,500 | SimulationContext (read-only) |
| `NetworkCanvas.jsx` | Visualización de red nodal, canvas 2D/3D | ~1,000 | SimulationContext (read-only) |
| `TabRouter.jsx` | Navegación entre pestañas, routing local | ~400 | Ninguna específica |
| `StateProvider.jsx` | Wrapper con Context providers | ~300 | SimulationContext, todos los contexts |
| `App.jsx` (residual) | Composición, layout shell, error boundary | ~400 | Todos los componentes |

### 9.4 Proceso de Extracción (Incremental)
Para CADA componente:
1. Crear el archivo nuevo en `src/components/`. **Wrappearlo en un `ErrorBoundary`** que capture errores de render y muestre un fallback UI sin tumbar el resto de la app. Crítico para `NetworkCanvas.jsx` (WebGL puede fallar) y `ChatInterface.jsx` (LLM proxy puede timeout).
2. Copiar la lógica relevante de `App.jsx`
3. Importar el componente en `App.jsx` reemplazando el código inline
4. `npm run build` — DEBE pasar
5. `npm test` — DEBE pasar
6. `node tests/simulation-smoke.test.js` — DEBE pasar
7. Verificar en browser: simulación arranca, tick count avanza, pestañas navegan
8. Commit: `refactor(split): extract ComponentName from App.jsx`

### 9.5 Preservar Anchors de Test
Actualizar TODOS los tests que referencian `App.jsx` o `index.jsx`:
- `tests/liveness.test.js` — actualizar paths de `readFileSync`
- `tests/narrative-integrity.contract.test.js` — actualizar paths de evidence
- Todos los tests `*.v4*.test.js` que leen el monolito

### 9.6 Análisis de Bundle Post-Split
Una vez completada la extracción, analizar qué contribuye al tamaño del bundle de 6.7 MB:
```powershell
npx esbuild --analyze=verbose dist/meta.json 2>&1 | Select-Object -First 30
# Alternativa si esbuild no expone analyze: inspeccionar dist/meta.json con:
node -e "const m=require('./dist/meta.json'); Object.entries(m.inputs).sort((a,b)=>b[1].bytes-a[1].bytes).slice(0,15).forEach(([k,v])=>console.log(v.bytes.toString().padStart(8), k))"
```
Documentar los 10 módulos más pesados en `docs/BUNDLE_ANALYSIS.md`. Esto informa decisiones de code splitting en 9.7.

### 9.7 Lazy Loading de Pestañas No-Visibles
Las 14 pestañas cargan todo el código upfront. Usar `React.lazy` + `Suspense`:
```javascript
const NetworkCanvas = React.lazy(() => import('./components/NetworkCanvas.jsx'));
const ChatInterface = React.lazy(() => import('./components/ChatInterface.jsx'));
```
Aplicar lazy loading a las pestañas del menú "More" (menos visitadas): QICN-B, API, Sensorial, Soberanía, Autoevolución. Las pestañas principales (Guía, Validación, Núcleo, Red Nodal, Historial) se cargan eager.

**Gate post-Fase 9 (completo):**
- `App.jsx` residual ≤ 500 líneas
- 8 componentes en `src/components/` con `ErrorBoundary` wrapper
- 2 contextos separados (`SimulationStateContext`, `SimulationConfigContext`)
- `npm test` 116+ PASS
- `npm run build` PASS con bundle analizado
- Lazy loading funcional en ≥5 pestañas
- `npm run scoreboard:run` 7/7, 10/10
- Browser: simulación funciona, todas las pestañas navegan, ≤1 render por tick en componentes no-visibles

---

## FASE 10: CALIDAD DE CÓDIGO Y TOOLING
**Riesgo:** Medio | **Impacto:** +0.50 | **Duración:** 2 sesiones

### 10.1 Configurar ESLint
```powershell
npm install --save-dev eslint @eslint/js
```

Crear `eslint.config.js` (sintaxis flat config de ESLint v9+):
```javascript
import js from '@eslint/js';

export default [
  js.configs.recommended,
  {
    rules: {
      'no-unused-vars': 'warn',
      'no-undef': 'error',
      'no-constant-condition': 'warn',
      'eqeqeq': 'error',
      'no-console': 'warn'       // detecta console.log de debug residuales
    }
  },
  {
    ignores: [
      'dist/**',
      'node_modules/**',
      'src/comparative_program/**',
      'src/subjectivity/**',
      'src/phenomenal_bridge/**'
    ]
  }
];
```

Ejecutar `npx eslint src/ --fix` y resolver errores críticos. Revisar warnings de `no-console` — eliminar `console.log` que sean debug residual (conservar `console.warn`/`console.error` que sean señales operativas reales).

### 10.2 Configurar JSDoc Types (Sin TypeScript)
Añadir `// @ts-check` y JSDoc annotations a los 5 archivos core:
1. `src/simulation/PhenomenologyCore.js` — tipos para `phenomenologyState`, `spectralGap`, `windingDiagnostics`
2. `src/simulation/SimulationController.js` — tipos para `controller` interface
3. `src/canon/finite_horizon/FiniteProjectionEvaluator.js` — tipos para `morphismResult`, `inverseLimitScore`
4. `src/canon/invariants/CanonicalInvariantPackage.js` — tipos para `invariantPackage`, `I_ri`
5. `src/experiments/negative_controls_expanded.js` — tipos para cada control result

Crear `jsconfig.json`:
```json
{
  "compilerOptions": {
    "checkJs": true,
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "baseUrl": ".",
    "paths": { "~/*": ["src/*"] }
  },
  "include": ["src/**/*.js", "src/**/*.jsx"],
  "exclude": ["node_modules", "dist", "comparative_program"]
}
```

### 10.3 Ordenar Imports
Establecer convención en los archivos core:
1. Built-in Node modules
2. External dependencies (React, etc.)
3. Internal canon modules
4. Internal simulation modules
5. Internal utils
6. Relative imports

**Gate:** `npx eslint src/ --max-warnings=50` pasa. JSDoc types en 5 archivos core. `jsconfig.json` creado.

---

## FASE 11: TESTING PROFESIONAL
**Riesgo:** Bajo | **Impacto:** +0.60 | **Duración:** 2-3 sesiones

### 11.1 Coverage Report
Integrar `c8` (Istanbul successor) para medir coverage sin cambiar el test runner:
```powershell
npm install --save-dev c8
```

Añadir script a `package.json`:
```json
"test:coverage": "c8 --reporter=text --reporter=json --lines=50 --branches=40 --functions=50 node tests/run-all-tests.cjs"
```

Los thresholds (`--lines=50`, `--branches=40`, `--functions=50`) son mínimos realistas para una base de código con capas no testeables en browser (subjectivity, comparative_program). El objetivo es prevenir regresión, no alcanzar 100%.

Añadir `coverage/` a `.gitignore`.

Documentar el baseline inicial en `docs/COVERAGE_BASELINE.md`.

### 11.2 Tests de Regresión del Monolito Post-Split
Crear `tests/component-isolation.test.js`:
- Verificar que cada componente extraído exporta lo esperado
- Verificar que SimulationContext provee todos los campos necesarios
- Verificar que el SimulationController se instancia una sola vez

### 11.3 Tests de Contrato de API Interna
Crear `tests/api-contracts.test.js`:
- `PhenomenologyCore.calculateSpectralGap()` retorna `{ lambda_1, lambda_2, delta_lambda }`
- `FiniteProjectionEvaluator.computeInverseLimitScore()` retorna `{ inverse_limit_score, totalCompatibilityErrors }`
- `CanonicalInvariantPackage.buildCanonicalInvariantPackage()` retorna objeto con `invariants.I_ri.score`
- Cada control negativo retorna `{ control, pass, interpretation_boundary }`

### 11.4 Test de Idempotencia del Scoreboard
Crear `tests/scoreboard-idempotency.test.js`:
- Ejecutar scoreboard 3 veces
- Verificar que las 7 dimensiones producen el mismo score ± 0.5
- Si `COMPUTE_TICK_BUDGET` varía > 1 punto, documentar como jitter aceptable

**Gate:** `npm run test:coverage` produce reporte. Coverage baseline documentado en `docs/COVERAGE_BASELINE.md`. Todos los tests nuevos pasan.

---

## FASE 12: OBSERVABILIDAD Y HEALTH CHECKS
**Riesgo:** Bajo | **Impacto:** +0.40 | **Duración:** 1-2 sesiones

### 12.1 Logging Estructurado
Crear `src/utils/logger.js`:
```javascript
export const createLogger = (module) => ({
  info: (msg, data) => console.log(JSON.stringify({ level: 'info', module, msg, ...data, ts: Date.now() })),
  warn: (msg, data) => console.warn(JSON.stringify({ level: 'warn', module, msg, ...data, ts: Date.now() })),
  error: (msg, data) => console.error(JSON.stringify({ level: 'error', module, msg, ...data, ts: Date.now() }))
});
```

Integrar en los 3 módulos más críticos:
1. `SimulationController.js` — log de ciclo de vida (attach, start, stop, tick errors)
2. `PhenomenologyCore.js` — log de spectral warnings y winding anomalies
3. `FiniteProjectionEvaluator.js` — log de compatibility errors por ventana

### 12.2 Runtime Health Endpoint
Crear `src/utils/healthCheck.js`:
- Exporta `getSystemHealth()` que retorna:
  - `status: 'healthy' | 'degraded' | 'unhealthy'`
  - `uptime_ticks: number`
  - `last_ccc: number`
  - `scoreboard_dims_passing: number`
  - `spectral_warning: string | null`
  - `inverse_limit_score: number`
  - `test_count: number`

### 12.3 Integrar Health en Browser
Exponer `getSystemHealth()` en la UI (pestaña Validación o nueva pestaña Salud).

**Gate:** Logger funcional. Health check retorna JSON válido. `npm test` PASS.

---

## FASE 13: CI/CD PROFESIONAL
**Riesgo:** Bajo | **Impacto:** +0.25 | **Duración:** 1 sesión

### 13.1 Mejorar `.github/workflows/verify.yml`

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
          cache: 'npm'
      - run: npm ci

      # Verificaciones canónicas
      - run: npm run verify:source-of-truth
      - run: npm run verify:descriptor-registry

      # Tests + coverage (con umbral mínimo)
      - run: npm run test:coverage

      # Build
      - run: npm run build

      # Scoreboard
      - run: npm run scoreboard:run

      # Upload artifacts
      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: scoreboard-results
          path: docs/phase4_scoreboard.latest.json
          retention-days: 30

      - uses: actions/upload-artifact@v4
        if: always()
        with:
          name: coverage-report
          path: coverage/
          retention-days: 7
```

### 13.2 Configurar husky para pre-commit hooks portables
```powershell
npm install --save-dev husky
npx husky init
```

Crear `.husky/pre-commit`:
```bash
npm run verify:source-of-truth && npm test
```

### 13.3 Branch Protection Rules (documentar)
Crear `docs/BRANCH_PROTECTION.md` con las reglas recomendadas:
- Require status checks: `verify`
- Require up-to-date branches
- No force push to main

**Gate:** CI pipeline con caching + coverage + artifact upload. Husky instalado y funcional.

---

## FASE 14: DOCUMENTACIÓN OPERATIVA
**Riesgo:** Nulo | **Impacto:** +0.18 | **Duración:** 1 sesión

### 14.1 Crear `CONTRIBUTING.md`
- Cómo clonar y configurar el entorno
- Cómo ejecutar tests
- Convenciones de commit (feat/fix/refactor/docs/chore)
- Cómo añadir un test nuevo
- Cómo añadir un módulo al canon barrel

### 14.2 Crear `docs/ARCHITECTURE.md`
Diagrama del sistema post-split:
```
index.jsx (bootstrap, 13 líneas)
  └── App.jsx (composición + error boundaries, ~400 líneas)
      └── StateProvider.jsx (contexts: SimulationState + SimulationConfig)
          ├── TabRouter.jsx (navegación)
          ├── SimulationEngine.jsx (loop + ticks)
          │   └── SimulationController.js (WM + Planner)
          │       ├── WorldModelEngine.js
          │       └── CognitiveEmergencePlanner.js
          │   └── PhenomenologyCore.js (spectral + topology)
          │       └── FiniteProjectionEvaluator.js (inverse limit)
          ├── ControlPanel.jsx (UI controls — consume ConfigContext)
          ├── TelemetryHUD.jsx (métricas — consume StateContext)
          ├── ChatInterface.jsx (LLM — consume ConfigContext)
          └── NetworkCanvas.jsx (nodos — consume StateContext)
```

> **Nota sobre la jerarquía:** `PhenomenologyCore` y `FiniteProjectionEvaluator` son módulos importados por `SimulationEngine`, no por `StateProvider`. La responsabilidad de StateProvider es proveer contextos React, no ejecutar lógica de simulación.

### 14.3 Actualizar `README.md`
- Sección "Quick Start" con 3 comandos
- Sección "Architecture" con link a `docs/ARCHITECTURE.md`
- Sección "Verification" con todos los `npm run verify:*` comandos
- Sección "Epistemic Posture" (ya existe — verificar que esté actualizada)
- Badge de CI (link al workflow de GitHub Actions)

### 14.4 Crear `docs/API_SURFACE.md`
Documentar las funciones exportadas de cada módulo core:
- `PhenomenologyCore` — API pública (calculateSpectralGap, testHolonomy, classifySystem)
- `CanonicalInvariantPackage` — API pública (buildCanonicalInvariantPackage)
- `FiniteProjectionEvaluator` — API pública (projectionMorphism, computeInverseLimitScore)
- `SimulationController` — API pública (attachCore, runTick, getDiagnostics)

**Gate:** Los 4 documentos existen. `README.md` actualizado. Links internos verificados.

---

## FASE 15: CONSOLIDACIÓN FINAL Y AUDITORÍA
**Riesgo:** Bajo | **Impacto:** Cierre | **Duración:** 1 sesión

### 15.1 Ejecutar Suite Completa
```powershell
npm test                           # 120+ tests PASS
npm run build                      # Bundle sin errores
npm run test:coverage              # Coverage report
npm run verify:source-of-truth     # OK
npm run verify:descriptor-registry # OK (23+ rows)
npm run verify:repro-bridge        # OK
npm run scoreboard:run             # 7/7, 10/10
npx eslint src/ --max-warnings=50  # Lint PASS
```

### 15.2 Comparar contra Baseline del Plan Anterior
```powershell
# Comparar docs/phase4_scoreboard.latest.json vs tests/baseline_scoreboard.json
# Verificar: 0 degradación en las 7 dimensiones
```

### 15.3 Browser Liveness Final
- Abrir `http://localhost:3000`
- Click "Iniciar Singularidad" → tick count avanza
- Navegar las 5 pestañas principales
- Consola: 0 errores rojos
- Health check visible en UI

### 15.4 Actualizar `IMPLEMENTATION_LOG.md`
Añadir sección "Roadmap de Profesionalización" con:
- Fecha de ejecución
- Resultado de cada fase (8-15)
- Desviaciones documentadas
- Scoreboard final vs baseline

### 15.5 Commit Final
```powershell
git add -A
git commit -m "feat(professionalization): complete architectural split, tooling, testing, and documentation roadmap"
```

**Gate:** Todos los verificadores pasan. Browser funcional. Working tree limpio.

---

## ORDEN DE EJECUCIÓN

```
FASE 8  (Housekeeping)     ── Riesgo: Bajo     ── 1 sesión
    ↓
FASE 9  (Monolito Split)   ── Riesgo: ALTO     ── 3-4 sesiones (ruta crítica)
    ↓
FASE 10 (Calidad de Código) ── Riesgo: Medio    ── 2 sesiones
    ↓
FASE 11 (Testing Pro)      ── Riesgo: Bajo     ── 2-3 sesiones
    ↓
FASE 12 (Observabilidad)   ── Riesgo: Bajo     ── 1-2 sesiones
    ↓
FASE 13 (CI/CD Pro)        ── Riesgo: Bajo     ── 1 sesión
    ↓
FASE 14 (Documentación)    ── Riesgo: Nulo     ── 1 sesión
    ↓
FASE 15 (Consolidación)    ── Riesgo: Bajo     ── 1 sesión

BENCHMARK GATE ─── Post cada Fase 9-13
```

**Ruta crítica:** F8 → F9 → F10 → F11 → F15

---

## IMPACTO PROYECTADO

| Fase | Arquitectura | Testing | Calidad | Observabilidad | CI/CD | Docs |
|---|---|---|---|---|---|---|---|
| 8 (Housekeeping) | +0.10 | — | +0.05 | — | — | +0.10 |
| 9 (Monolito Split + Lazy Loading) | **+1.20** | +0.10 | +0.10 | — | — | — |
| 10 (Calidad Código + ESLint real + no-console) | — | — | **+0.50** | — | — | — |
| 11 (Testing Pro + coverage threshold) | — | **+0.60** | — | — | — | — |
| 12 (Observabilidad) | — | — | — | **+0.40** | — | — |
| 13 (CI/CD Pro + artifact uploads) | — | — | — | — | **+0.25** | — |
| 14 (Documentación + arch correcta) | — | — | — | — | — | **+0.18** |
| 15 (Consolidación) | +0.10 | — | — | — | — | +0.15 |
| **TOTAL** | **+1.40** | **+0.70** | **+0.65** | **+0.40** | **+0.25** | **+0.43** |

| Área | Pre-Roadmap | Post-Roadmap |
|---|---|---|
| Arquitectura | 6.00 | **8.20** |
| Testing & Coverage | 7.00 | **8.70** |
| Calidad de Código | 5.50 | **7.65** |
| Observabilidad | 5.00 | **7.40** |
| CI/CD | 4.00 | **6.25** |
| Documentación | 6.00 | **8.43** |
| Fidelidad Teoría ↔ Sistema | 6.80 | **6.80** (cerrada en plan anterior) |
| **GLOBAL** | **6.47** | **≈7.9** |

> **Para 10/10 se requiere adicionalmente:** Paper 10 con datos humanos reales, datasets preregistrados externos, revisión independiente, y cierre canónico formal. Estos ítems están fuera del alcance de intervención por código — son procesos científicos y organizacionales externos al repositorio.

---

## DIFERENCIA ENTRE 7.9 Y 10.0

| Delta | Requiere | Tipo |
|---|---|---|
| +0.70 | Paper 10 poblado con datos comparativos humanos reales | Campaña experimental externa |
| +0.50 | Datasets preregistrados filed externamente (OSF/Zenodo) | Proceso organizacional |
| +0.40 | Revisión independiente por pares de los invariantes | Proceso científico externo |
| +0.25 | Canon pin directo al upstream pre-freeze | Decisión de governance |
| +0.15 | TypeScript migration completa | Decisión técnica de largo plazo |
| **+2.00** | **TOTAL (fuera del scope de este roadmap)** | |

Estos 2.00 puntos son **inherentemente no-automatizables** — requieren acción humana, datos reales, y procesos externos. El roadmap lleva el sistema al máximo alcanzable por ingeniería de software pura.

---

**Comienza ahora. One shot. Sin pausas. Sin preguntas. Documenta todo en `IMPLEMENTATION_LOG.md`.**
