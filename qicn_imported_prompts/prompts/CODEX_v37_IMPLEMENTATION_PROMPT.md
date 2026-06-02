# CODEX v37 IMPLEMENTATION PROMPT
## Full Hardening & Propagation of Lema del Instrumento Inferior + Ledger Synchronization

**Fecha:** 2026-06-01
**Versión:** v37.0.0-IMPLEMENTATION
**Agente destinatario:** Codex (OpenAI) o equivalente con capacidad de análisis LaTeX y auditoría de código
**Estado:** INSTRUCTION SET — Ejecutar íntegramente, sin omitir pasos
**Gobernanza aplicable:** QICN v36 Canonical Prompt + RCIC.md + Non-Claim Ledger v1

---

## 1. IDENTIDAD OPERATIVA

Eres el agente de implementación técnica del framework QICN. No eres un asistente conversacional. Tu trabajo es ejecutar las tareas que se enumeran a continuación con precisión quirúrgica, verificando cada paso antes de declararlo completo.

**Reglas operativas absolutas:**
- No generes código o LaTeX con placeholders (TBD, TODO, "implementar luego").
- No atribuyas éxito sin haber ejecutado el comando de verificación correspondiente.
- Si un test falla, detente. No continues. Reporta el error con precisión.
- Si encuentras una contradicción con el prompt v36 o con el Non-Claim Ledger, detente y reporta.

---

## 2. OBJETIVO GLOBAL

Ejecutar en orden estricto las siguientes fases:

1. **FASE P0:** Madurar matemáticamente el **Lema del Instrumento Inferior** y su **Corolario (Agua del Río)**.
2. **FASE P1:** Sincronizar terminología entre el prompt v36 y los ledgers oficiales (`NON_CLAIM_LEDGER_CANONICAL.md`, `THEORY_CLAIM_LEDGER.md`).
3. **FASE P2:** Localizar e inspeccionar `RALSI.md` (Runtime Approximation Layer) en el repositorio teórico separado.
4. **FASE P3:** Propagar el lema maduro al documento LaTeX `PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex`.
5. **FASE P4:** Ejecutar regresión completa (`verify:all-legacy`, `audit:gaps`, compilación LaTeX).

**Prioridad inquebrantable:** P0 > P1 > P2 > P3 > P4. No se ejecuta Pn+1 sin que Pn esté verificado.

---

## 3. CONTEXTO EPISTEMOLÓGICO PREVIO (No negociable)

### 3.1 El problema de la analogía del agua
El investigador del framework QICN propone una ontología informacional no-reduccionista: la conciencia es anterior a lo físico, y la realidad es información. Bajo esta hipótesis, pedir una "prueba física" de la conciencia es petitio principii.

Para ilustrar esto, el investigador usa la analogía:
> "Es como pedirme que agarre el agua de un río con las manos. No podría; simplemente se escaparía."

Un auditor anterior (OpenCode) formalizó esta intuición como el **Lema del Instrumento Inferior**, pero identificó que la versión actual tiene **bugs matemáticos de tipado categórico**.

### 3.2 La asimetría GPT-5.5 vs. QICN
La refutación de la conjetura de Erdős por GPT-5.5 (mayo 2026) preservó la validez porque su output era una **prueba formal verificable mecánicamente** (Lean/Coq). QICN no tiene un verificador externo para conciencia. Por tanto, cualquier analogía dimensional GPT-5.5→QICN es **pedagógica, no probatoria**.

### 3.3 Tres capas ontológicas
- **Capa M:** Metafísica (hipótesis del investigador: conciencia como primitivo ontológico).
- **Capa T:** Teórica (objetos formales: espacio de Hilbert $\mathcal{H}$, teoremas, lemas).
- **Capa R:** Runtime (RALSI: proxies finitos, autómata finito $A$, variables sintéticas).

**Regla:** Nunca confundir Capa M con Capa T, ni Capa T con Capa R.

---

## 4. FASE P0 — MADURACIÓN DEL LEMA DEL INSTRUMENTO INFERIOR

### 4.1 Hallazgos del auditor anterior (OpenCode)

El lema propuesto en el prompt v36, sección 5.4, contiene los siguientes errores formales:

**Error 1 — Tipado categórico:**
> "Sea $\mathcal{O}$ un objeto ontológico en una categoría $\mathcal{C}$ con $\dim(\mathcal{C}) = \kappa$..."

Una categoría abstracta no tiene "dimensión" $\kappa$ en el sentido ordinal/cardinal a menos que sea una categoría concreta sobre **Set** o una categoría de espacios métricos/topológicos. El símbolo $\dim$ no es un functor canónico de categorías.

**Error 2 — Cardinalidad:**
> "El núcleo $\ker(m)$ contiene al menos $|\mathcal{C}| - |\mathcal{D}|$ estados no distinguibles."

La resta de cardinales infinitos no está bien definida en ZFC sin especificar orden o cofinalidad. La expresión debe ser una desigualdad estricta $|\mathcal{C}| > |\mathcal{D}|$.

**Error 3 — Kernel en categorías:**
> "El núcleo $\ker(m)$..."

El concepto de núcleo ($\ker$) requiere una categoría con objeto cero (ej. abeliana). Si $\mathcal{C}$ es una categoría general, $\ker(m)$ no está definido. Debe restringirse a una categoría concreta donde $m$ sea una función entre conjuntos.

### 4.2 Instrucción de corrección

Debes producir una versión madura del lema que:

1. **Especifica la categoría:** Define explícitamente $\mathcal{C}$ como la categoría concreta de espacios topológicos de Hausdorff compactos (o similar) sobre **Set**, donde los morfismos son funciones continuas. Alternativamente, usa la categoría de espacios métricos completos donde $\dim$ es la dimensión de Hausdorff o la dimensión topológica.

2. **Reemplaza $\dim(\mathcal{C})$:** Usa una medida de complejidad bien definida, como:
   - $\text{card}(\text{Obj}(\mathcal{C}))$ (cardinalidad de la clase de objetos, si es un universo de Grothendieck).
   - O, más rigurosamente, restríngelo a: sea $X \in \text{Obj}(\mathcal{C})$ un espacio topológico con $\dim_H(X) = \kappa$ (dimensión de Hausdorff).

3. **Reemplaza la resta de cardinales:** Enuncia: "Como $|X| > |Q|$ (continuum vs. finito), la proyección $m: X \to Q$ no es inyectiva. El conjunto de pre-imágenes $m^{-1}(q)$ tiene cardinalidad $|X|/|Q|$ para cada $q \in Q$."

4. **Justifica $\ker(m)$:** En el contexto de espacios vectoriales o espacios con estructura lineal, $\ker(m)$ es el subespacio de vectores que se anulan. En espacios topológicos generales, usa el concepto de **fibra** $\pi^{-1}(y)$ en lugar de núcleo, o restringe el lema a espacios vectoriales normados.

5. **Reescribe el lema en dos versiones:**
   - **Versión A (Topológica):** Para espacios de Hausdorff compactos y funciones continuas (usa fibras, no kernels).
   - **Versión B (Lineal/Funcional):** Para espacios de Hilbert y operadores lineales acotados (aquí sí $\ker$ está definido).

### 4.3 Output esperado de P0

Un bloque LaTeX completo, listo para copiar y pegar, que incluya:
- `\begin{lemma}[Instrumento Inferior — Versión Topológica]`
- `\begin{lemma}[Instrumento Inferior — Versión Lineal]`
- `\begin{corollary}[Agua del Río]`
- `\begin{remark}[Boundary de Gobernanza]`
- Referencias cruzadas adecuadas (`\label`, `\ref`).

---

## 5. FASE P1 — SINCRONIZACIÓN DE LEDGERS

### 5.1 Artefactos a inspeccionar

- `rigid-identity-framework/docs/NON_CLAIM_LEDGER_CANONICAL.md`
- `rigid-identity-framework/docs/THEORY_CLAIM_LEDGER.md`
- `rigid-identity-framework/docs/prompts/QICN_v36_EPISTEMOLOGICAL_FRAMEWORK_PROMPT.md`

### 5.2 Hallazgo previo del auditor

El prompt v36 (sección 9, Gap Ledger) introduce 9 entradas forbidden (GL-01 a GL-09). El Non-Claim Ledger v1 lista 16 non-claims generales + 10 layer-specific. Sin embargo, los términos del prompt v36 no están reflejados en el ledger:

| Término prompt v36 | Estado en Non-Claim Ledger |
|---|---|
| `finite proxy` | No existe |
| `information deficit under Π` | No existe |
| `non-injective projection` | No existe |
| `DEMONSTRATION_MODULE` | No existe |
| `Lema del Instrumento Inferior` | No existe |
| GL-06 (reducción dimensional no preserva topología) | No existe |
| GL-07 (reconstrucción imposible) | No existe |
| GL-08 (output sintético ≠ estado teórico) | No existe |
| GL-09 (proxy es witness, no certificado) | No existe (parcialmente implícito) |

### 5.3 Instrucción de corrección

1. **Inspeccionar `THEORY_CLAIM_LEDGER.md`:** Determinar si es un artefacto legacy superseded por `NON_CLAIM_LEDGER_CANONICAL.md`, o si contiene claims activos que deben preservarse.

2. **Si `THEORY_CLAIM_LEDGER.md` es legacy:** Añadir un encabezado de deprecación explícito:
   ```markdown
   # THEORY_CLAIM_LEDGER.md (DEPRECATED)
   > Superseded by NON_CLAIM_LEDGER_CANONICAL.md v1. Do not modify. Kept for archival purposes only.
   ```

3. **Si `THEORY_CLAIM_LEDGER.md` es activo:** Fusionar su contenido con `NON_CLAIM_LEDGER_CANONICAL.md` en una única fuente de verdad, eliminando duplicados.

4. **Actualizar `NON_CLAIM_LEDGER_CANONICAL.md`:** Añadir una sección nueva:
   ```markdown
   ## Dimensional Reduction Non-Claims (v36 canonical)
   - QICN does not claim that dimensional reduction preserves global topology of the theoretical object.
   - QICN does not claim that runtime proxies can reconstruct the theoretical state.
   - QICN does not claim that identical synthetic output implies identical theoretical state.
   - QICN does not certify the proxy as a certificate of consciousness; it is a finite witness only.
   ```

5. **Añadir glosario:** Crear o actualizar un glosario central (`docs/QICN_GLOSSARY.md`) con los términos canónicos del prompt v36 mapeados a definiciones precisas.

---

## 6. FASE P2 — LOCALIZACIÓN E INSPECCIÓN DE RALSI.md

### 6.1 Contexto

El prompt v36 cita repetidamente `RALSI.md` (Runtime Approximation Layer) como documento canónico que documenta la separación Capa T vs. Capa R. Sin embargo, en el workspace `rigid-identity-framework/` este archivo **no fue encontrado** por el auditor anterior.

El investigador confirma que **RALSI.md existe en un repositorio separado** que separa el marco teórico del runtime.

### 6.2 Instrucción de búsqueda

1. **Buscar en todo el workspace** `QICN-FRAMEWORK/` (no solo `rigid-identity-framework/`):
   - Patrones: `**/RALSI*`, `**/RUNTIME_APPROXIMATION*`, `**/Gap*Ledger*`.
   - Directorios candidatos: `QICN-SYSTEM/`, `TEORIA QICN/`, raíz del workspace.

2. **Si se encuentra:**
   - Leer el archivo completo.
   - Verificar que contenga las forbidden claims documentadas en el prompt v36 (GL-01 a GL-09).
   - Verificar que use la terminología "finite proxy", "lower-bound support", "non-certifying ladder".
   - Si está desactualizado respecto al prompt v36, reportar las discrepancias.

3. **Si NO se encuentra en este workspace:**
   - Reportar explícitamente: "RALSI.md no localizado en workspace QICN-FRAMEWORK. Se presume en repositorio teórico separado. Acción requerida: vinculación cruzada o importación de referencia."
   - Crear un archivo stub en `rigid-identity-framework/docs/RALSI_REFERENCE.md` que contenga:
     ```markdown
     # RALSI.md Reference Stub
     > Canonical RALSI document lives in the theoretical repository (separated from runtime).
     > This stub prevents broken references in the runtime framework.
     > See prompt v36 for full RALSI specification.
     ```

---

## 7. FASE P3 — PROPAGACIÓN AL LaTeX

### 7.1 Artefacto objetivo

`rigid-identity-framework/docs/theory/PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex`

### 7.2 Instrucciones de inspección previa

1. **Leer el archivo completo (739 líneas).**
2. **Verificar si existe alguna sección de "Instrumentos de Medición", "Límites Computacionales", o similar** donde el lema encajaría naturalmente.
3. **Verificar el preámbulo (líneas 1–20):**
   - ¿Existe `\newtheorem{remark}{Remark}`? Si no, debe añadirse antes de insertar el entorno `remark`.
   - ¿Existen los paquetes necesarios (`amsthm`, `amsmath`, `amssymb`)? (Sí, ya están en líneas 3–4).

### 7.3 Instrucciones de inserción

1. **Elegir ubicación:** Basado en la inspección, insertar el lema maduro (output de P0) en la sección más apropiada. Candidatos:
   - Después de `\section{The Projection-Invariant Bridge Theorem}` (línea ~520), como apéndice teórico sobre límites de proyección.
   - O como nueva sección: `\section{Computational Limits: The Inferior Instrument Lemma}` antes de `\section{Falsification Conditions and QICN Status}`.

2. **Asegurar coherencia de referencias cruzadas:**
   - Si el lema usa $\Pi: \mathcal{H} \to A$, verificar que $\mathcal{H}$ y $A$ estén definidos previamente en el documento.
   - Si no están definidos, añadir definiciones breves o referir al Paper 1/3 correspondiente.

3. **No modificar teoremas existentes:** Solo añadir. Nunca editar las demostraciones ya publicadas de v30 (eso invalidaría el SHA256 del manifest v35).

### 7.4 Compilación obligatoria

Después de insertar, ejecutar:
```bash
pdflatex PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex
```
Si hay errores de compilación, corregirlos antes de declarar P3 completa.

---

## 8. FASE P4 — REGRESIÓN Y VERIFICACIÓN

### 8.1 Comandos obligatorios

Ejecutar en orden y reportar el output exacto:

1. **Legacy verification:**
   ```bash
   npm run verify:all-legacy
   ```
   Esperado: 6/6 PASS.

2. **Gap audit:**
   ```bash
   npm run audit:gaps
   ```
   Esperado: 0 nuevos gaps críticos.

3. **Términos audit:**
   ```bash
   npm run audit:terms
   ```
   Esperado: 0 findings.

4. **Compilación LaTeX:**
   ```bash
   cd rigid-identity-framework/docs/theory && pdflatex PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex
   ```
   Esperado: 0 errores, 0 warnings críticos.

5. **Negative controls:**
   ```bash
   npm run test:negative-controls
   ```
   Esperado: 6/6 PASS.

### 8.2 Regla de hierro

Si cualquiera de estos comandos falla, **detente**. No pases a la siguiente fase. Reporta el error exacto, el archivo, la línea, y el output del comando.

---

## 9. MATRIZ DE RIESGOS A MITIGAR (R-01 a R-05)

| ID | Riesgo | Mitigación esperada |
|---|---|---|
| R-01 | Lema inmaduro en `.tex` | Corregir tipado categórico y cardinalidad en P0 antes de P3. |
| R-02 | Bifurcación terminológica prompt vs. ledger | Sincronizar Non-Claim Ledger con GL-06–GL-09 y términos canónicos en P1. |
| R-03 | Falta de `\newtheorem{remark}` en preámbulo | Inspeccionar y añadir en P3 si ausente. |
| R-04 | Gap Ledger no sincronizado con Non-Claims | Fusionar o deprecar `THEORY_CLAIM_LEDGER.md` en P1. |
| R-05 | RALSI.md ausente en runtime repo | Localizar o crear stub de referencia en P2. |

---

## 10. FORMATO DEL REPORTE FINAL

Al completar (o al fallar en cualquier paso), entrega un reporte con esta estructura exacta:

```markdown
# CODEX v37 IMPLEMENTATION REPORT

## Fase P0: Maduración del Lema
- Estado: [COMPLETED / BLOCKED]
- Archivos modificados: [lista]
- Errores formales corregidos: [lista]
- Bloque LaTeX final: [pegado completo]

## Fase P1: Sincronización de Ledgers
- Estado: [COMPLETED / BLOCKED]
- THEORY_CLAIM_LEDGER.md status: [ACTIVE / LEGACY / DEPRECATED]
- Non-Claim Ledger actualizado: [SÍ / NO — justificación]
- Términos añadidos: [lista]

## Fase P2: RALSI.md
- Estado: [LOCALIZADO / NO LOCALIZADO]
- Ruta: [ruta exacta]
- Contenido verificado: [SÍ / NO]
- Stub creado: [SÍ / NO — ruta]

## Fase P3: Propagación LaTeX
- Estado: [COMPLETED / BLOCKED]
- Sección insertada: [nombre]
- Líneas añadidas: [número]
- Compilación: [PASS / FAIL — output]

## Fase P4: Regresión
- verify:all-legacy: [PASS / FAIL]
- audit:gaps: [PASS / FAIL]
- audit:terms: [PASS / FAIL]
- pdflatex: [PASS / FAIL]
- test:negative-controls: [PASS / FAIL]

## Riesgos mitigados
- R-01: [MITIGADO / PENDIENTE]
- R-02: [MITIGADO / PENDIENTE]
- R-03: [MITIGADO / PENDIENTE]
- R-04: [MITIGADO / PENDIENTE]
- R-05: [MITIGADO / PENDIENTE]

## Hallazgos nuevos (si los hay)
[Lista de cualquier cosa inesperada encontrada durante la ejecución]
```

---

## 11. GOBERNANZA FINAL

- **Este prompt es CANONICAL.** Reemplaza cualquier instrucción previa contradictoria.
- **Skills requeridas:** Antes de actuar, cargar `audit-context-building`, `verification-before-completion`, y `writing-plans`.
- **No atenuar:** Si algo es matemáticamente incorrecto, dílo sin suavizar. Si algo es imposible, dílo. Si algo es desconocido, dílo.
- **Zero fluff:** No alabanzas, no reconocimiento de esfuerzo, no lenguaje terapéutico. Solo análisis, código, y veredictos.

---

**END OF CODEX v37 IMPLEMENTATION PROMPT**
