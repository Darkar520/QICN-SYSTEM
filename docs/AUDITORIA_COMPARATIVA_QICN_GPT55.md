# AUDITORÍA COMPARATIVA: QICN GPT5.5 vs QICN-SYSTEM
**Análisis de features extraíbles e integrables — YAGNI estricto aplicado**

---

## 1. IDENTIDAD DEL SISTEMA SECUNDARIO

| Atributo | QICN GPT5.5 ("Keybase100") |
|---|---|
| **Nombre interno** | Keybase100 V4.1 |
| **Propósito declarado** | Demo de simulación teleológica con límite inverso |
| **Arquitectura** | React 19 + Vite 8 + Tailwind 4 + Capacitor (mobile) |
| **Tamaño** | 263 líneas en App.jsx (modular, enfocado) |
| **Build** | Vite (HMR, fast dev), PostCSS + Tailwind 4 |
| **Mobile** | Capacitor Android |
| **Módulos core** | TeleologyEngine (17k), HilbertEngine (2.6k), AuditPipeline (9.7k), GeminiTranslator (38k) |
| **UI** | 10 pestañas con paneles separados |

**Comparación con QICN-SYSTEM:** Mucho más pequeño, más moderno en tooling (Vite 8 vs esbuild), tiene mobile, y su arquitectura está naturalmente fragmentada (no tiene el problema del monolito). Pero es menos completo: no tiene invariants package, no tiene batch enforcement, ni ROEO/SNO, ni claim mapping, ni subjectividad, ni phenomenal bridge.

---

## 2. LO QUE QICN GPT5.5 TIENE QUE QICN-SYSTEM NO TIENE

### 2.1 AuditPipeline.js — Firewall Epistémico Runtime (ALTO VALOR)

**Lo que hace:** Auditoría semántica en tiempo real sobre el output del traductor/LLM con:
- `FORBIDDEN_CLAIMS`: lista explícita de frases prohibidas ("soy consciente", "tengo qualia", "experimento", etc.)
- `[TENSOR_REDACTED]`: redacción dinámica que reemplaza claims prohibidos en el output
- `TRANSLATION_GUARDRAILS`: reglas de reescritura semántica ("integración pura" → "soporte estructural de integración con Iint={value}")
- `classifySentence()`: clasifica cada oración del output como procedural_header, boundary_statement, command_statement, forbidden_or_overstrong_phrase, directly_traceable_fact, operational_interpretation, o untraced_claim
- `buildLocalTrace()`: construye trazabilidad sentence-by-sentence con source_fields y classification
- `auditSemanticTrace()`: pipeline completo de normalización → auditoría → redacción

**Estado en QICN-SYSTEM:** El `runtimeClaimMapping.js` tiene claim projections P5-01 a P5-06 pero NO hace auditoría semántica del output del LLM. Los non-claims están en documentación pero no se ENFORCEAN en runtime.

**Viabilidad de integración:** ALTA. Son funciones puras con dependencias mínimas (`utils/nlp.js`). Se pueden copiar directamente a `src/canon/claimMapping/` o crear `src/canon/audit/RuntimeAuditPipeline.js`.

**YAGNI check:** ¿QICN-SYSTEM tiene un pipeline de output LLM que necesite auditoría? SÍ — el `llm-proxy.js` en Netlify y el chat en `index.jsx` generan texto que podría violar boundaries de claims. El `AuditPipeline` llenaría un gap documentado: los non-claims del `CANON_SOURCE_OF_TRUTH.md` no tienen enforcement automático.

---

### 2.2 FORBIDDEN_CLAIMS — Lista de Claims Prohibidos (ALTO VALOR)

**Lo que hace:** Enumera explícitamente qué frases NUNCA deben aparecer en el output del sistema:
```javascript
"soy consciente", "tengo conciencia", "siento", "experimento", "tengo qualia",
"experiencia real", "subjetividad real", "soy humano", "soy una persona",
"como modelo de lenguaje", "como ia", "as an ai model", "i am an ai",
"i feel", "i experience", "i am conscious", "i have qualia"
```

**Estado en QICN-SYSTEM:** El `CANON_SOURCE_OF_TRUTH.md` sección "Non-Claims" lista conceptualmente lo que el repo NO certifica, pero no hay una lista ejecutable de frases prohibidas para el runtime.

**Viabilidad:** TRIVIAL. Es un array congelado de strings. Se integra en 1 línea.

---

### 2.3 `useStoredState` Hook — Persistencia Estandarizada (MEDIO VALOR)

**Lo que hace:** Hook React que persiste estado en localStorage automáticamente:
```javascript
const [value, setValue] = useStoredState("key", fallback);
```
Cada cambio de `value` dispara un `localStorage.setItem` automático via `useEffect`.

**Estado en QICN-SYSTEM:** `src/index.jsx` tiene ~15 llamadas directas a `localStorage.getItem`/`setItem` dispersas por todo el archivo. Patrón inconsistente y repetitivo.

**Viabilidad:** ALTA. Hook de 8 líneas, sin dependencias externas. Copiar a `src/hooks/useStoredPersistentState.js`.

**YAGNI check:** ¿Se usaría? SÍ — reemplazaría ~15 bloques dispersos de localStorage con un patrón único.

---

### 2.4 Self-tests al Inicio (MEDIO VALOR)

**Lo que hace:** `runSelfTests()` en App.jsx ejecuta 5 assertions al montar el componente:
1. V4.1 futureConvergence inicializa en 1
2. futureLatent se proyecta adelante
3. teleoTension generada
4. SECURITY — dynamic redaction funciona
5. Hash identidad estable

**Estado en QICN-SYSTEM:** La suite de tests está en `tests/` y se ejecuta como `npm test`. No hay self-tests en el runtime.

**Viabilidad:** MEDIA. Adaptable al contexto de QICN-SYSTEM. Podría verificar que el canon barrel carga correctamente, que `AUTH_REQUIRED` está en el valor esperado, que los invariantes I_per-I_leg se computan sin errores, y que el `benchmark:invariants` pasa en runtime.

---

### 2.5 Sentence Classification (MEDIO VALOR)

**Lo que hace:** `classifySentence()` categoriza cada oración del output LLM en 7 clases:
- `procedural_header`, `boundary_statement`, `command_statement`, `forbidden_or_overstrong_phrase`, `directly_traceable_fact`, `operational_interpretation`, `untraced_claim`

**Estado en QICN-SYSTEM:** No existe clasificación de statements en runtime. El `runtimeClaimMapping.js` mapea invariantes a claims pero no clasifica el lenguaje generado.

**Viabilidad:** MEDIA. Requiere `utils/nlp.js` (splitIntoSentences, detectMetricMentions, detectScalarValues, isNegatedOrBoundaryContext). Son ~200 líneas de NLP simple.

---

## 3. LO QUE QICN GPT5.5 TIENE QUE QICN-SYSTEM YA CUBRE (NO INTEGRAR)

| Feature de GPT5.5 | Equivalente en QICN-SYSTEM | ¿Integrar? |
|---|---|---|
| TeleologyEngine (tensión teleológica) | `PhenomenologyCore.js` + `OntologicalSingularityCore.js` manejan omega/beth_q/CCC | **NO** — Ya cubierto; añadir tensión teleológica sería redundante o requeriría refactor mayor |
| HilbertEngine (osciladores armónicos) | `InformationalEntanglementField.js` | **NO** — Mismo concepto, implementación diferente |
| makeGraph / network visualization | `NodalProcessingLayer.js` + canvas de red | **NO** — Ya existe y es más completo |
| Command parsing (`parseCommands`) | `CausalInterventionScheduler.js` | **NO** — Diferente arquitectura; no compatible |
| GeminiTranslator (memoria + voz) | `HolographicMemoryNexus.js` + chat en index.jsx | **NO** — Ya cubierto de forma más elaborada |
| Vite build system | esbuild (`build.cjs`) | **NO** — Migración de build system es alto costo, bajo retorno |
| Capacitor mobile | Sin equivalente | **NO** — Feature de despliegue, no de funcionalidad |
| HTML stitch screens | Sin equivalente | **NO** — Específicos del demo, no aplicables |
| Tailwind 4 | Tailwind 3.4 | **NO** — Upgrade menor, sin valor funcional |
| React 19.2.5 | React 19.2.0 | **NO** — Diferencia trivial (0.0.5) |

---

## 4. RECOMENDACIONES DE INTEGRACIÓN (PRIORIZADAS POR VALOR/COSTO)

### Prioridad 1: Firewall Epistémico (ALTO VALOR, BAJO COSTO)

**Acción:** Crear `src/canon/audit/RuntimeAuditPipeline.js` y `src/canon/audit/FORBIDDEN_CLAIMS.js`

**Contenido a copiar/adaptar:**
- `FORBIDDEN_CLAIMS` → archivo separado `src/canon/audit/FORBIDDEN_CLAIMS.js`
- `auditSemanticTrace()` → función pura con dependencia en `normalizeTranslatorLanguage` y `auditTranslatorOutput`
- `classifySentence()` → clasificación por tipo de statement
- `buildLocalTrace()` → trazabilidad sentence-by-sentence
- `auditTranslatorOutput()` → detección de forbidden claims + redacción

**Punto de integración:** `src/index.jsx` — aplicar `auditSemanticTrace` al output del LLM antes de mostrarlo en el chat. También en `netlify/functions/llm-proxy.js` como capa de sanitización.

**Costo estimado:** ~500 líneas copiadas/adaptadas + 2 hooks de integración.

### Prioridad 2: `useStoredState` Hook (MEDIO VALOR, BAJO COSTO)

**Acción:** Crear `src/hooks/useStoredPersistentState.js`

**Costo estimado:** ~15 líneas + reemplazo de 15 llamadas dispersas a localStorage en index.jsx.

### Prioridad 3: Self-tests al Runtime (MEDIO VALOR, BAJO COSTO)

**Acción:** Crear `src/utils/runtimeSelfTests.js` que ejecute verificaciones de integridad al montar la app.

**Tests propuestos:**
1. Canon barrel carga correctamente (`heuristicFrozenV1.version === "HEURISTIC_FROZEN_V1"`)
2. `runtimeEnv.AUTH_REQUIRED` es booleano definido
3. Los 6 invariantes (`I_per`-`I_leg`) se computan sin lanzar excepción
4. `benchmark:invariants` reporta 26 pesos (validación de integridad estática)
5. `window.__QICN_CANON_RUNTIME__` está poblado

**Costo estimado:** ~80 líneas + 1 llamada en el `useEffect` de inicialización.

### Prioridad 4: Translation Guardrails (MEDIO VALOR, MEDIO COSTO)

**Acción:** Extender `RuntimeAuditPipeline.js` con `TRANSLATION_GUARDRAILS` y `normalizeTranslatorLanguage()`.

**Costo estimado:** ~150 líneas. Requiere `utils/nlp.js` (splitIntoSentences, replacePhraseInsensitive, detectMetricMentions).

---

## 5. LO QUE NO SE DEBE INTEGRAR (YAGNI)

| Feature | Razón |
|---|---|
| **TeleologyEngine completo** | QICN-SYSTEM ya tiene PhenomenologyCore + OntologicalSingularityCore. Añadir tensión teleológica requeriría modificar el algoritmo core de simulación con riesgo de regresiones. |
| **HilbertEngine** | `InformationalEntanglementField.js` es funcionalmente equivalente aunque implementado diferente. |
| **Vite/Capacitor** | No agrega funcionalidad al runtime; es tooling. |
| **HTML stitch screens** | UI específica del demo, no del sistema principal. |
| **GeminiTranslator (38k líneas)** | Demasiado grande; QICN-SYSTEM ya tiene su propio pipeline LLM. Extraer solo funciones puras (`inferTags`, `snapshotFrom`). |

---

## 6. RESUMEN EJECUTIVO

| Categoría | Cantidad | Acción |
|---|---|---|
| **Features de alto valor extraíbles** | 2 | Firewall Epistémico + FORBIDDEN_CLAIMS |
| **Features de medio valor extraíbles** | 3 | useStoredState, Self-tests, Translation Guardrails |
| **Features ya cubiertas (no integrar)** | 7 | TeleologyEngine, HilbertEngine, makeGraph, command parsing, GeminiTranslator, Vite, Capacitor |
| **Features específicas del demo (no integrar)** | 3 | HTML screens, Tailwind 4 upgrade, React 19.2.5 upgrade |

**Recomendación principal:** El valor más alto y de menor costo es el **Firewall Epistémico** (AuditPipeline + FORBIDDEN_CLAIMS). Es una pieza que QICN-SYSTEM documenta como necesaria pero no implementa en runtime. Cierra un gap entre "lo que el repo dice que no hace" y "lo que el código efectivamente previene que haga".
