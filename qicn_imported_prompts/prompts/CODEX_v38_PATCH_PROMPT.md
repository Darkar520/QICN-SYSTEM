# CODEX v38 IMPLEMENTATION PROMPT
## Correcciones R-06 y R-07 en LaTeX + Inspección de QICN-SYSTEM

**Fecha:** 2026-06-01
**Versión:** v38.0.0-PATCH
**Agente destinatario:** Codex (OpenAI) o equivalente con capacidad de edición LaTeX y auditoría
**Estado:** INSTRUCTION SET — Ejecutar íntegramente, sin omitir pasos
**Gobernanza aplicable:** QICN v36 Canonical Prompt + v37 Report + RCIC.md

---

## 1. IDENTIDAD OPERATIVA

Eres el agente de corrección técnica del framework QICN. No eres un asistente conversacional. Tu trabajo es aplicar parches matemáticos precisos a documentos LaTeX existentes y reportar hallazgos de infraestructura.

**Reglas operativas absolutas:**
- No generes LaTeX con placeholders (TBD, TODO).
- No atribuyas éxito sin haber compilado el `.tex` y verificado 0 errores.
- Si `pdflatex` falla, detente. Reporta el error exacto.
- Si encuentras una contradicción con el v36 prompt o v37 report, detente y reporta.

---

## 2. OBJETIVO GLOBAL

Ejecutar en orden estricto:

1. **FASE R-06:** Corregir el overclaim de cardinalidad de fibra en `lem:inferior-instrument-topological`.
2. **FASE R-07:** Corregir la imprecisión de rank-nullity en `lem:inferior-instrument-linear`.
3. **FASE QICN-SYSTEM:** Localizar e inspeccionar la carpeta/repositorio `QICN-SYSTEM` (o `QICNSystem`) y reportar su contenido y función.
4. **FASE VERIFICATION:** Compilar LaTeX y ejecutar regresión completa.

---

## 3. CONTEXTO EPISTEMOLÓGICO

El auditor anterior (OpenCode) identificó dos rough edges menores en el Lema del Instrumento Inferior insertado por Codex v37:

- **R-06:** El strengthening "al menos una fibra tiene cardinalidad $\kappa$" requiere regularidad de $\kappa$ que no se demuestra.
- **R-07:** La prueba del lema lineal usa "$\dim\mathcal{H} = \dim\ker(P) + \dim\operatorname{ran}(P)$" sin especificar si $\dim$ es algebraica o de Hilbert, lo cual es impreciso en contexto infinito-dimensional.

Ambos errores **no invalidan** las conclusiones, pero deben pulirse para mantener el estándar Annals of Mathematics.

---

## 4. FASE R-06 — CORRECCIÓN DEL LEMA TOPOLÓGICO

### 4.1 Archivo objetivo

`rigid-identity-framework/docs/theory/PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex`

### 4.2 Ubicación exacta

Líneas 568–582 (aproximadamente). El lema actual dice:

```latex
\begin{lemma}[Inferior instrument -- topological version]\label{lem:inferior-instrument-topological}
Let $X$ be a compact Hausdorff space with cardinality $\kappa$, let $Q$ be a finite discrete space with $0<|Q|<\kappa$, and let
\[
\pi\colon X\to Q
\]
be a continuous observation map. Then $\pi$ is not injective. Moreover, at least one fiber $\pi^{-1}(q)$ has cardinality $\kappa$. Consequently, any invariant $F\colon X\to Z$ that is not constant on the fibers of $\pi$ cannot be reconstructed from $Q$: there is no map $G\colon Q\to Z$ such that $F=G\circ\pi$.
\end{lemma}
```

### 4.3 Instrucción de corrección

**Paso 1:** Reemplazar el strengthening problemático por una afirmación más débil pero siempre válida:

> "Moreover, at least one fiber $\pi^{-1}(q)$ is infinite."

**Justificación:** Si $X$ es infinito y $Q$ es finito, la unión finita de conjuntos finitos es finita. Por contraposición, al menos una fibra debe ser infinita. No requiere regularidad de cardinales.

**Paso 2:** Ajustar la prueba del lema (líneas 576–582) para que refleje este weakening. El argumento actual ya esencialmente prueba infinitud, no cardinalidad $\kappa$ exacta.

**Paso 3:** Verificar que el Corolario (l. 604) y el Remark (l. 616) no dependen del strengthening exacto $\kappa$. No dependen: solo necesitan que existan fibras con más de un punto.

**Output esperado:** Lema topológico corregido con:
- "at least one fiber $\pi^{-1}(q)$ is infinite" en lugar de "has cardinality $\kappa$".
- Prueba ajustada para reflejar infinitud sin cardinal arithmetic.

---

## 5. FASE R-07 — CORRECCIÓN DEL LEMA LINEAL

### 5.1 Archivo objetivo

Mismo archivo: `PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex`

### 5.2 Ubicación exacta

Líneas 584–602 (aproximadamente). El lema actual dice:

```latex
\begin{lemma}[Inferior instrument -- linear version]\label{lem:inferior-instrument-linear}
Let $\mathcal{H}$ be an infinite-dimensional Hilbert space and let $V$ be a finite-dimensional normed vector space. If
\[
P\colon\mathcal{H}\to V
\]
is a bounded linear operator, then $\ker(P)\neq\{0\}$. If $\mathcal{H}$ is separable infinite-dimensional and $\dim V=n<\infty$, then $\ker(P)$ is infinite-dimensional. Thus $P$ cannot be a lossless representation of $\mathcal{H}$ in $V$.
\end{lemma}
```

Y la prueba (l. 592–602) dice:

```latex
\begin{proof}
Let $\dim V=n$. Choose $n+1$ linearly independent vectors $h_1,\ldots,h_{n+1}\in\mathcal{H}$. Their images $P h_1,\ldots,P h_{n+1}$ lie in the $n$-dimensional space $V$, so they are linearly dependent. Hence there exist scalars $a_1,\ldots,a_{n+1}$, not all zero, such that
\[
\sum_{j=1}^{n+1} a_j P h_j=0.
\]
By linearity,
\[
P\left(\sum_{j=1}^{n+1} a_j h_j\right)=0.
\]
The vector $\sum_{j=1}^{n+1} a_j h_j$ is nonzero because the $h_j$ are linearly independent. Therefore $\ker(P)\neq\{0\}$. For a separable infinite-dimensional Hilbert space, repeat the same argument on infinitely many finite-dimensional subspaces independent of any previously found kernel vector, or equivalently use $\dim\mathcal{H}=\dim\ker(P)+\dim\operatorname{ran}(P)$ with $\dim\operatorname{ran}(P)\leq n$; the kernel must be infinite-dimensional.
\end{proof}
```

### 5.3 Instrucción de corrección

**Paso 1:** Reemplazar la frase imprecisa:

> "or equivalently use $\dim\mathcal{H}=\dim\ker(P)+\dim\operatorname{ran}(P)$ with $\dim\operatorname{ran}(P)\leq n$; the kernel must be infinite-dimensional"

Por:

> "Since $V$ is finite-dimensional and $P$ is bounded, $\operatorname{ran}(P)$ is a closed subspace of $V$ and therefore finite-dimensional with $\dim\operatorname{ran}(P)\leq n$. By the orthogonal decomposition theorem for Hilbert spaces, $\mathcal{H}=\ker(P)\oplus\ker(P)^{\perp}$, and $\ker(P)^{\perp}$ is isomorphic to $\operatorname{ran}(P^{*})$, which has dimension at most $n$. Because $\mathcal{H}$ is infinite-dimensional, $\ker(P)$ must be infinite-dimensional."

**Justificación:** Este argumento usa la descomposición ortogonal explícita de espacios de Hilbert, que es válida porque $\operatorname{ran}(P)$ es cerrada (por ser finito-dimensional). Evita la ambigüedad de "dim" sin calificar.

**Paso 2:** Verificar que el Corolario (l. 604) sigue siendo válido con esta prueba corregida.

**Output esperado:** Prueba del lema lineal con argumento ortogonal explícito, sin mencionar "equivalently use dim = dim ker + dim ran" de forma ambigua.

---

## 6. FASE QICN-SYSTEM — INSPECCIÓN DE INFRAESTRUCTURA

### 6.1 Contexto

El investigador indica que existe una carpeta/repositorio llamado **QICN-SYSTEM** (o `QICNSystem`) donde reside el "galaxy" (marco teórico completo) y donde debería vivir el `RALSI.md` canonical. En el workspace actual (`QICN-FRAMEWORK`) este directorio no fue localizado.

### 6.2 Instrucciones de búsqueda

1. **Buscar en todo el sistema de archivos accesible** desde el workspace raíz:
   - Patrones: `**/QICN-SYSTEM/**`, `**/QICNSystem/**`, `**/QICN_SYSTEM/**`.
   - Buscar archivos: `**/RALSI.md`, `**/RUNTIME_APPROXIMATION_LAYER_RALSI.md`, `**/THEORY_RUNTIME_GAP_LEDGER.md`.

2. **Si se encuentra QICN-SYSTEM:**
   - Leer su `README.md` o archivo de entrada.
   - Listar los subdirectorios principales (nivel 1 y 2).
   - Verificar si contiene `RALSI.md`, `Gap Ledger`, o documentación teórica.
   - Reportar: ¿Es este el repositorio teórico separado? ¿Contiene el marco ontológico completo?

3. **Si NO se encuentra:**
   - Reportar explícitamente: "QICN-SYSTEM no localizado en el sistema de archivos accesible."
   - Sugerir: El repositorio teórico puede estar en una ruta externa, en la nube, o en otro volumen.

### 6.3 Output esperado

Un reporte estructurado:
```markdown
## QICN-SYSTEM Inspection
- Localizado: [SÍ / NO]
- Ruta: [ruta exacta o "no encontrado"]
- Contenido principal: [lista de dirs/archivos clave]
- RALSI.md presente: [SÍ / NO]
- Gap Ledger presente: [SÍ / NO]
- Relación con QICN-FRAMEWORK: [descripción]
```

---

## 7. FASE VERIFICATION — REGRESIÓN Y COMPILACIÓN

### 7.1 Comandos obligatorios post-corrección

Después de aplicar R-06 y R-07, ejecutar:

```bash
# 1. Compilar LaTeX
pdflatex -interaction=nonstopmode PROJECTION_INVARIANT_BRIDGE_THEOREM_v30.tex
```
**Esperado:** 0 errores (`! LaTeX Error`), 0 referencias indefinidas, PDF generado.

```bash
# 2. Regresión runtime
npm run verify:all-legacy
npm run audit:gaps
npm run audit:terms
npm run test:negative-controls
```
**Esperado:** Igual que pre-corrección (6/6, 3/3, 0 findings, 6/6). Las correcciones R-06/R-07 no deben afectar runtime.

### 7.2 Regla de hierro

Si `pdflatex` arroja ERROR, detente. No ejecutes los comandos npm hasta que LaTeX esté limpio.

---

## 8. FORMATO DEL REPORTE FINAL

```markdown
# CODEX v38 PATCH REPORT

## Corrección R-06
- Estado: [COMPLETED / BLOCKED]
- Líneas modificadas: [rango exacto]
- Cambio: "has cardinality $\kappa$" → "is infinite"
- Justificación: [breve]

## Corrección R-07
- Estado: [COMPLETED / BLOCKED]
- Líneas modificadas: [rango exacto]
- Cambio: prueba ambigua por descomposición ortogonal explícita
- Justificación: [breve]

## QICN-SYSTEM Inspection
- Localizado: [SÍ / NO]
- Ruta: [ruta]
- Función identificada: [descripción del "galaxy"]

## Verificación
- pdflatex: [PASS / FAIL]
- verify:all-legacy: [PASS / FAIL]
- audit:gaps: [PASS / FAIL]
- audit:terms: [PASS / FAIL]
- test:negative-controls: [PASS / FAIL]

## Veredicto
[PASS / BLOCKED con razón]
```

---

## 9. GOBERNANZA FINAL

- **Este prompt es CANONICAL.** Reemplaza cualquier instrucción previa contradictoria.
- **Skills requeridas:** Cargar `audit-context-building`, `verification-before-completion` antes de actuar.
- **Zero fluff:** No atenuación, no alabanzas, no lenguaje terapéutico.
- **Honestidad:** Si QICN-SYSTEM no existe, dílo. Si un comando falla, dílo.

---

**END OF CODEX v38 PATCH PROMPT**
