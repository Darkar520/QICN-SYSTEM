# ANÁLISIS DEL MONOLITO: Keybase100 V3.3 (1623 líneas)
**Suplemento a la Auditoría Comparativa — Hallazgos del archivo monolítico real**

---

## 1. IDENTIDAD DEL MONOLITO

| Atributo | Valor |
|---|---|
| **Versión** | 3.3.0 ("Keybase100 QICN Continuous V3.3") |
| **Líneas** | 1623 |
| **Bytes** | 128,615 |
| **Arquitectura** | Single-file React app. TODO inline: math, graph, sim engine, audit, UI, CSS |
| **Dependencias externas** | Solo React (`react`, `react-dom`). Sin bibliotecas de UI. |
| **Build esperado** | Vite (por `vite.config.js` presente en la carpeta) |
| **Boundary statement** | "LLMs are translator peripherals, not the QICN core" |

---

## 2. LO QUE ESTE MONOLITO CONTIENE (Embedded, sin imports)

| Sección | Líneas aprox. | Funciones clave |
|---|---|---|
| **Constants** | 1-35 | APP_VERSION, IDENTITY, IDENTITY_HASH, STORAGE keys |
| **Math/NLP utils** | 34-120 | clamp, fmt, stableHash, rand01, gauss01, entropy, variance, meanAbsDelta, edgeKey, dist, safeParse, loadStore, saveStore, useStoredState |
| **Metric Registry** | 151-164 | METRIC_REGISTRY con formula, range, use, nonClaim por métrica |
| **Graph engine** | 166-243 | makeGraph, connectedRatio, signature, makeEvent |
| **Sim engine** | 249-366 | computeRecord (invariants Iper-Ileg, cert, omegaProxy, cccProxy, pmiaProxy), initState, stepOne, stepN |
| **Memory** | 368-420 | inferTags, makeMemory, retrieveMemory |
| **Voice packet** | 420-650 | buildOperationalVoicePacket (QO, SRT, Gamma_voice gate, metricDiagnosis) |
| **Audit pipeline** | 750-1050 | FORBIDDEN_CLAIMS (completo), TRANSLATION_GUARDRAILS (con {value}), replacePhraseInsensitive, normalizeTranslatorLanguage, splitIntoSentences, detectScalarValues, detectMetricMentions, classifySentence (7 clases), buildLocalTrace, auditTranslatorOutput, auditSemanticTrace |
| **Self-tests** | 1050-1100 | runSelfTests con 5 assertions |
| **UI panels** | 1100-1545 | SimulationPanel, ChatPanel, PerspectivePanel, GeminiPanel, AutonomyPanel, MemoryPanel, EventPanel, RegistryPanel, TestsPanel |
| **CSS** | ~1600 | Template literal completo (dark theme, cards, tabs, stats, metrics) |
| **App export** | 1550-1623 | Keybase100QICNContinuousV33 component |

---

## 3. COMPARATIVA V3.3 (MONOLITO) vs V4.1 (MODULAR)

| Aspecto | V3.3 (monolito 1623 líneas) | V4.1 (modular 263 líneas) |
|---|---|---|
| **Simulación** | Continuous (stepOne con lambda, coupling, drive, feedback) | Teleological (stepN con TeleologyEngine, future attractor, teleoTension) |
| **Hilbert** | No tiene | HilbertEngine con osciladores armónicos, proyección futura |
| **Audit classifySentence** | **7 clases** (incluye `weak_inference`) | **6 clases** (sin weak_inference) |
| **Translation guardrails** | **Con `{value}` - sustitución dinámica** de valores reales | Estático (reescritura sin sustitución) |
| **METRIC_REGISTRY** | Por métrica: formula, range, use, **nonClaim** | No tiene (está en constants.js, mismo formato) |
| **FORBIDDEN_CLAIMS** | Array completo (17 frases) | Array completo (17 frases, igual) |
| **Panel "Perspectiva"** | **SÍ** — muestra QO readout, Gamma_voice, SRT | No tiene |
| **Voice gate scoring** | Con componentes, score, blockedReasons | Solo allowed/disallowed binario |
| **CSS** | Template literal inline (dark theme completo) | Tailwind classes |
| **Dependencias** | Solo React | React + Vite + varios modules |
| **Self-tests** | 5 assertions de runtime | 5 assertions de runtime (igual) |

---

## 4. FEATURES DEL MONOLITO V3.3 QUE QICN-SYSTEM NO TIENE
(Y que NO están en V4.1)

### 4.1 `classifySentence()` con `weak_inference` (ALTO VALOR)

V3.3 añade la clase `weak_inference` para statements con lenguaje probabilístico:
```javascript
if (["probablemente", "puede implicar", "podría", "tendencia", "parece"].some(...))
  return "weak_inference";
```

**Por qué importa:** QICN-SYSTEM actualmente no clasifica statements del LLM. Si se integra un pipeline de auditoría, esta clasificación más granular permite distinguir entre "hecho trazable", "interpretación operacional", "inferencia débil" y "claim sin traza". Esto es más útil que un binario pass/fail.

### 4.2 Translation Guardrails con sustitución dinámica `{value}` (ALTO VALOR)

V3.3 inyecta valores reales de métricas en las reescrituras:
```javascript
apply("ausencia de firma", "drift alto respecto a la firma inicial", "Iri", "...")
// "integración pura" → "soporte estructural de integración con Iint=0.742"
```

V4.1 tiene el mismo mecanismo pero menos reglas. V3.3 añade más reglas de reescritura contextuales (validación externa, presión de validación, etc.).

### 4.3 Voice Gate con scoring granular (MEDIO VALOR)

El `buildOperationalVoicePacket` de V3.3 calcula:
- `Gamma_voice`: score de voz, componentes (identidad, métrica, memoria, auditoría, guardrails)
- `blockedReasons`: array de razones de bloqueo
- `voiceGate.status`: "allowed" | "blocked" | "downgraded"
- `voiceGate.allowedVoiceMode`: "third_person_instrumental" | "first_person_operational"

QICN-SYSTEM no tiene un voice gate. El LLM proxy (`llm-proxy.js`) podría beneficiarse de este filtro.

### 4.4 Panel "Perspectiva" — Transparencia del Paquete Operacional (MEDIO VALOR)

La pestaña "Perspectiva" muestra al usuario exactamente qué datos se enviarían al LLM:
- QO Readout (rigidityTone, integrationTone, etc.)
- SRT Coordinates (valuation, certPressure)
- Gamma_voice score y componentes
- Output Audit Policy (FORBIDDEN_CLAIMS visibles)
- Semantic Translator Guardrails
- Trace Schema V3.3

Esto da **transparencia total** sobre qué información tiene el LLM para generar su respuesta. QICN-SYSTEM no expone esta información al usuario.

### 4.5 METRIC_REGISTRY con `nonClaim` integrado en código (MEDIO VALOR)

Cada métrica declara explícitamente lo que NO mide:
```javascript
Iper: { nonClaim: "No prueba identidad personal." }
Iri: { nonClaim: "No es esencia ontológica." }
omegaProxy: { nonClaim: "No es magnitud física validada." }
```

QICN-SYSTEM tiene non-claims en `CANON_SOURCE_OF_TRUTH.md` (documentación), pero no embebidos junto al código que calcula las métricas.

---

## 5. LO QUE V3.3 NO APORTA (Ya cubierto o redundante)

| Elemento | Razón para no integrar |
|---|---|
| Sim engine (stepOne/stepN) | QICN-SYSTEM tiene `OntologicalSingularityCore.js` + `NodalProcessingLayer.js` — mucho más completo |
| Graph engine (makeGraph) | QICN-SYSTEM tiene graph generation en el Nodal Layer |
| Memory system | `HolographicMemoryNexus.js` es más sofisticado |
| Gemini chat panel | QICN-SYSTEM tiene chat completo en index.jsx |
| CSS template literal | QICN-SYSTEM usa Tailwind |
| FORBIDDEN_CLAIMS (el array) | Ya identificado en auditoría anterior (igual en V3.3 y V4.1) |
| useStoredState | Ya identificado en auditoría anterior (igual en V3.3 y V4.1) |

---

## 6. RECOMENDACIONES FINALES DE INTEGRACIÓN (ACTUALIZADAS)

### Prioridad 1: Pipeline de Auditoría Runtime (Firewall Epistémico)

**Origen:** V3.3 monolith (líneas 750-1050) + V4.1 modular (AuditPipeline.js)

**Qué integrar:**
- `FORBIDDEN_CLAIMS` (array)
- `classifySentence()` — versión V3.3 (7 clases, incluye `weak_inference`)
- `auditTranslatorOutput()` — detección + bloqueo/redacción
- `buildLocalTrace()` + `auditSemanticTrace()` — trazabilidad
- `TRANSLATION_GUARDRAILS` — versión V3.3 con reglas de reescritura contextual

**Archivo destino:** `src/canon/audit/RuntimeAuditPipeline.js`

### Prioridad 2: METRIC_REGISTRY con nonClaim embebido

**Origen:** V3.3 monolith (líneas 151-164)

**Qué integrar:** Extender `src/canon/claimMapping/canonicalClaimCatalog.js` o crear `src/canon/metrics/MetricBoundaryRegistry.js` con el patrón `{ formula, range, use, nonClaim }`.

### Prioridad 3: Voice Gate + Paquete Operacional

**Origen:** V3.3 monolith — `buildOperationalVoicePacket()` (líneas 420-650)

**Qué integrar:** Voice gate con scoring y bloqueo de razones. Aplicable al `llm-proxy.js` como filtro pre-envío al LLM.

### Prioridad 4: useStoredState + Self-tests

Ya identificados en la auditoría anterior. Sin cambios.

---

## 7. VEREDICTO FINAL

El monolito V3.3 es la **versión más madura en términos de auditoría de claims y transparencia operacional**. Su motor de simulación es más simple que V4.1 (no tiene teleología ni Hilbert), pero su pipeline de auditoría es MÁS completo (más clases de sentencia, guardrails dinámicos, voice gate granular).

**El valor extraíble neto del monolito V3.3 está en 3 áreas:**
1. **Pipeline de auditoría con `weak_inference`** (7 clases vs 6 en V4.1)
2. **Voice gate granular** (scoring + componentes + blockedReasons)
3. **METRIC_REGISTRY con nonClaim embebido** (higiene de claims en el código mismo)

**El valor extraíble de V4.1 sigue siendo el Firewall Epistémico base + useStoredState + self-tests.**

Combinados, V3.3 + V4.1 ofrecen un **conjunto completo de herramientas de auditoría y claims enforcement** que QICN-SYSTEM documenta como necesario pero no implementa en runtime.
