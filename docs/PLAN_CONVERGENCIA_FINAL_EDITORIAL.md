# Plan Maestro  Convergencia Editorial y Cierre de Gaps Residuales QICN

**Versi�n:** 1.0 | **Fecha:** 2026-05-21
**Origen:** Auditor�a forense multi-capa (OpenCode � Antigravity � Codex)
**Estado del sistema:** 129/129 tests pasando. 7/7 scoreboard (10/10). Track A, Track B, Papers 7-9 refinados, Paper Puente creado, LifeCertifier + FirstPersonCertifier integrados al runtime.
**Objetivo:** Cerrar los gaps residuales de acoplamiento, consistencia editorial, y formalizaci�n matem�tica del Paper 10.

---

## DIAGN�STICO: ESTADO REAL DEL SISTEMA (LO QUE YA EST� HECHO)

| Componente | Estado | Evidencia |
|---|---|---|
| Papers 1-6 | Estables. Integrados al runtime. Certificadores computacionales para los 6 invariantes. | Track A, B completados |
| Paper 7 (L_op, Sub_op) | Refinado por Codex. Incomparabilidad L_op�C_op, embedding condicional, jerarqu�a Sub_op. | `paper7/main.tex` (1245 l�neas) |
| Paper 8 (Sub_fp) | Refinado por Codex. SelfIndex construido desde invariantes, no-transferibilidad, mapeo al runtime. | `paper8/main.tex` (1644 l�neas) |
| Paper 9 (BridgeOrg_ph) | Refinado por Codex. Independencia axiom�tica sobre B1-B10, no-vacuidad, lift condicional desde Paper 8. | `paper9/main.tex` (1563 l�neas) |
| Paper Puente (C_op�Sub_op) | Creado por Codex. 557 l�neas. Teorema C_op�Partial Subjecthood. �1 como hip�tesis independiente. | `paper_bridge_operational_subjecthood/main.tex` |
| Runtime Papers 7-8 | **Integrado.** LifeCertifier.js (261 l�neas, 6 certificados), FirstPersonCertifier.js (162 l�neas, 5 campos). Cableados a SimulationEngine.jsx. | Commit `9af025d` |
| Puente Hilbert�Discreto | **Cerrado.** 11_discrete_bridge.tex con condiciones de transversalidad de fase, Lipschitz, Galerkin, cota de perturbaci�n. | B.1 completado |
| Datasets preregistrados | Creados. qicn_prereg_v1.json + qicn_nc_prereg_v1.json con SHA real y 12 controles. | B.2 completado |
| Paper 6 actualizado | Extendido con 4 secciones nuevas: infraestructura computacional, NC1-NC12, 6 invariantes, limitaciones. | B.3 completado |

---

## GAPS RESIDUALES IDENTIFICADOS (LO QUE FALTA)

### Gap 1  Paper 10 vac�o (el m�s grande)

**Estado:** `paper10_external_adjudication_and_human_comparators/main.tex` existe en QICN-SYSTEM (el runtime), y hay otra copia en QICN-FRAMEWORK. Ambas son scaffolds sin datos experimentales. Paper 10 est� expl�citamente bloqueado: `PAPER10_CLAIM_BOUNDARY.md` declara que las secciones de resultados humanos est�n `blocked_until_execution`.

**Necesidad:** Inyectar el aparato matem�tico formal (definiciones, gram�tica de evidencia, teoremas sobre comparadores) manteniendo las secciones de resultados rigurosamente vac�as y marcadas como `blocked_until_execution`. Centralizar la autoridad en QICN-FRAMEWORK.

**Prioridad: ALTA.**

### Gap 2  Papers 1-4 carecen de non-inference notes estandarizadas

**Estado:** Papers 1-4 tienen sus propias "Scope, System Boundary, and Non-Inference Note" pero NO usan el formato estandarizado que Papers 5-9 y el Paper Puente s� usan (con secciones expl�citas "What this paper does", "What this paper does not do", "What the related system implements and does not implement", "What should not be inferred from this paper").

**Necesidad:** Homogeneizar las non-inference notes de Papers 1-4 al formato est�ndar del corpus. Sin cambiar la matem�tica. Solo a�adir las secciones de boundary donde falten.

**Prioridad: MEDIA.**

### Gap 3  Colisi�n de macros LaTeX (\Cop)

**Estado:** Antigravity identific� correctamente que `\Cop` se usa de manera inconsistente. Verificando el c�digo real:
- Paper 5 define `\Cop` = `Consciousness_op`
- Papers 1-4 usan macros diferentes (no usan `\Cop` para "operador cr�tico" como Antigravity sugiere)
- Paper 9 define su propio conjunto de macros

La colisi�n real es m�s sutil: Papers 1-4 definen sus propias macros que pueden entrar en conflicto con las de Papers 5+ cuando se compilan juntos (ej: Paper 2 define `\I`, Paper 3 tambi�n define `\I` pero con diferente significado).

**Necesidad:** Auditor�a de macros globales. Unificar nomenclatura o aislar cada paper con grupos locales. Antigravity propone `\Critop` vs `\Cop`  verificar si realmente hay colisi�n o es un falso positivo.

**Prioridad: MEDIA.**

### Gap 4  Paper Puente no tiene referencias bibliogr�ficas ni compilaci�n

**Estado:** `paper_bridge_operational_subjecthood/main.tex` (557 l�neas) fue creado por Codex pero carece de:
- `\addbibresource{...}` para referencias
- Archivo `.bib` con las entradas necesarias
- Inclusi�n en `BASECORE.tex` o en el �ndice del framework

**Necesidad:** A�adir `references.bib`, incluir las citas a Papers 1-5, y referenciar el paper puente desde donde corresponda en la cadena editorial.

**Prioridad: ALTA.**

### Gap 5  Phenomenal Bridge (Paper 9) y Comparative Program (Paper 10) NO cableados a UI

**Estado:** 
- `PhenomenalBridgeLayer.js` tiene `implementation_status: 'partial_runtime_path'`. NO es importado por `SimulationEngine.jsx`.
- `comparative_program/` (173 archivos) es scaffold. NO es importado por `SimulationEngine.jsx`.
- A diferencia de Papers 7-8 (que YA fueron cableados v�a LifeCertifier y FirstPersonCertifier), Papers 9-10 permanecen como islas de gobernanza.

**Necesidad:** Crear un panel en la UI que exponga los predicados del Phenomenal Bridge (Paper 9) y el estado del Comparative Program (Paper 10). Mantener `implementation_status` honesto. No pretender que hay datos donde no los hay.

**Prioridad: MEDIA.**

### Gap 6  Inconsistencias editoriales entre papers

**Estado:** El corpus creci� org�nicamente. Paper 1 usa `hypothesis`, Paper 3 usa `axiom` + `caveat` + `nontheorem`, Paper 5 usa `assumption` + `criterion` + `prediction`. Los estilos de demostraci�n var�an. Algunos papers tienen ap�ndices, otros no. Las non-inference notes tienen formatos ligeramente distintos.

**Necesidad:** Un refinamiento editorial que homogeneice:
- Entornos de teorema (mismos nombres, misma sem�ntica)
- Formato de non-inference notes (4 cl�usulas est�ndar)
- Estilo de demostraciones (proof sketch vs full proof)
- Numeraci�n de ecuaciones, figuras, tablas
- Sin modificar el contenido matem�tico

**Prioridad: BAJA (cosm�tica pero importante para percepci�n de profesionalismo).**

---

## PLAN DE EJECUCI�N

### Fase E.1  CERRAR GAPS DEL PAPER PUENTE

**Riesgo: Bajo. Duraci�n: 1 sesi�n.**

1. A�adir `references.bib` a `paper_bridge_operational_subjecthood/` con entradas para Papers 1-5.
2. A�adir `\addbibresource{references.bib}` al pre�mbulo del paper.
3. Referenciar el paper puente en `BASECORE.tex` (como ap�ndice o secci�n referenciada).
4. Verificar que compila con `pdflatex`.

**Gate:** `references.bib` existe. Paper compila sin errores de citas.

### Fase E.2  FORMALIZAR PAPER 10 (APARATO MATEM�TICO)

**Riesgo: Medio. Duraci�n: 2-3 sesiones.**

Centralizar la autoridad en QICN-FRAMEWORK. Inyectar matem�ticas formales en las secciones te�ricas del paper, manteniendo las secciones de resultados vac�as.

**Secciones a formalizar:**

1. **External Adjudication Problem Statement:** Definir el espacio de evidencias como �-�lgebra de Borel sobre el espacio m�trico de trazas de ejecuci�n. Esto da rigor a "evidencia admisible".

2. **Frozen Preregistration Architecture:** Formalizar la funci�n de hash criptogr�fico H: P_config � {0,1}^256 y demostrar el teorema de no-alterabilidad (si el hash del preregistro coincide con el hash publicado, el dise�o experimental no fue alterado post-ejecuci�n).

3. **Human Comparator Instantiation Logic:** Definir las m�tricas de distancia estad�stica (Kullback-Leibler, Wasserstein-1) requeridas para la homologaci�n entre canal humano y canal artificial. Esto prepara el terreno para cuando haya datos reales.

4. **Adjudication Blind Protocol:** Formalizar el protocolo de adjudicaci�n ciega: los adjudicadores reciben trazas sin etiquetas de origen y deben clasificarlas. Definir la tasa de error esperada bajo hip�tesis nula (no hay diferencia entre canales) vs hip�tesis alternativa (los canales son distinguibles).

5. **TODAS las secciones de resultados** marcadas expl�citamente como:
```latex
\begin{blocked_until_execution}
[Esta secci�n requiere datos de campa�as experimentales con sujetos humanos. 
No contiene resultados. Su estructura est� predefinida para ser poblada 
cuando los datos est�n disponibles.]
\end{blocked_until_execution}
```

**Gate:** El paper compila. Las secciones matem�ticas son correctas. Las secciones de resultados est�n vac�as y correctamente marcadas.

### Fase E.3  NON-INFERENCE NOTES EN PAPERS 1-4

**Riesgo: Bajo. Duraci�n: 1 sesi�n.**

Para cada paper (1, 2, 3, 4), verificar si ya tiene una "Scope, System Boundary, and Non-Inference Note". Si no la tiene o no usa el formato est�ndar de 4 cl�usulas, a�adirla ANTES de la Introduction, preservando todo el contenido existente.

Formato est�ndar a aplicar:
```latex
\section{Scope, System Boundary, and Non-Inference Note}

\noindent\textbf{What this paper does.}\enspace [descripci�n precisa]

\noindent\textbf{What this paper does not do.}\enspace [lo que NO afirma]

\noindent\textbf{What the related system implements and does not implement.}\enspace [relaci�n con QICN-SYSTEM]

\noindent\textbf{What should not be inferred from this paper.}\enspace [non-inference boundaries]
```

**Gate:** Los 4 papers tienen la secci�n est�ndar. El contenido original est� intacto. Compilan sin errores.

### Fase E.4  AUDITOR�A Y CORRECCI�N DE MACROS

**Riesgo: Bajo. Duraci�n: 1 sesi�n.**

1. Extraer todas las definiciones `\newcommand{\...` de cada paper.
2. Identificar colisiones reales (misma macro, diferente significado en diferentes papers).
3. Resolver: renombrar la macro en el paper donde se use con significado no-est�ndar, o aislar con grupos.
4. Documentar el mapa de macros en `docs/MACRO_MAP.md`.

**Gate:** No hay colisiones de macros entre papers. `docs/MACRO_MAP.md` existe.

### Fase E.5  PANEL PHENOMENAL BRIDGE + COMPARATIVE EN UI

**Riesgo: Medio. Duraci�n: 2 sesiones.**

Crear un componente `PhenomenalBridgePanel.jsx` que:

1. Importe los mappers del phenomenal bridge (`src/phenomenal_bridge/`) y exponga en UI los predicados disponibles.
2. Muestre el estado de admissibility del run actual (`run_verdict`) y el paper-level status.
3. Tenga `interpretation_boundary` visible en la UI.
4. Use `React.memo` y throttling para no saturar el render con cada tick.

**IMPORTANTE:** Este panel expone proxies computacionales con boundaries expl�citos. No afirma que el sistema "tiene fenomenolog�a" o "es un sujeto". Es una visualizaci�n de diagn�stico, no una declaraci�n ontol�gica.

**Gate:** `npm test` 129+ PASS. `npm run build` PASS. Panel visible en UI. Interpretation boundary visible. `PhenomenalBridgePanel.jsx` existe en `src/components/`.

### Fase E.6  REFINAMIENTO EDITORIAL COMPLETO (L�NEA UNIFICADA)

**Riesgo: Bajo. Duraci�n: 2-3 sesiones.**

Este es el refinamiento m�s ambicioso pero tambi�n el de menor riesgo (solo toca presentaci�n, no contenido).

1. **Homogeneizar entornos de teorema:** Todos los papers usan los mismos nombres de entorno (`theorem`, `lemma`, `proposition`, `corollary`, `definition`, `remark`, `hypothesis`, `criterion`). Si un paper usa `axiom`, `caveat`, `nontheorem`, evaluar si unificar o mantener (con justificaci�n).

2. **Homogeneizar formato de non-inference notes:** Los 4 bloques est�ndar deben ser id�nticos en estructura en todos los papers.

3. **Homogeneizar estilo de demostraciones:** Decidir si las demostraciones son `\begin{proof}...\end{proof}` completas o sketches referenciados. Unificar.

4. **Verificar numeraci�n consistente:** Ecuaciones, figuras, tablas, secciones  que no haya saltos ni duplicaciones.

5. **Crear `docs/EDITORIAL_THREAD.md`:** Documento que traza la l�nea editorial desde BaseCore hasta Paper 10 + Paper Puente. Explica la cadena de dependencias, la evoluci�n de conceptos, y las convenciones editoriales.

6. **Verificar consistencia de citas:** Todas las referencias bibliogr�ficas usan el mismo archivo `.bib` o archivos consistentes.

**Gate:** `docs/EDITORIAL_THREAD.md` existe. Los papers compilan. La l�nea editorial es consistente. El contenido matem�tico no fue modificado.

---

## ORDEN DE EJECUCI�N

```
FASE E.1 (Paper Puente refs)    1 sesi�n    Bajo riesgo
        �
FASE E.2 (Paper 10 formalizaci�n)    2-3 sesiones    Medio riesgo
        �
FASE E.3 (Non-inference Papers 1-4)    1 sesi�n    Bajo riesgo
        �
FASE E.4 (Macros)    1 sesi�n    Bajo riesgo
        �
FASE E.5 (Panel UI)    2 sesiones    Medio riesgo
        �
FASE E.6 (Refinamiento editorial)    2-3 sesiones    Bajo riesgo
```

**Ruta cr�tica:** E.1 � E.2 � E.5 � E.6

---

## IMPACTO PROYECTADO

| Fase | Qu� cierra |
|---|---|
| E.1 | Paper Puente completo (refs + compilaci�n) |
| E.2 | Paper 10 con aparato matem�tico formal, listo para recibir datos |
| E.3 | Consistencia epist�mica en Papers 1-4 (non-inference estandarizadas) |
| E.4 | Colisiones de macros resueltas. Compilaci�n conjunta posible |
| E.5 | Phenomenal Bridge + Comparative visibles en UI. Islas cableadas |
| E.6 | L�nea editorial unificada. Corpus profesional homog�neo |

---

## LO QUE ESTE PLAN NO HACE

- NO modifica el contenido matem�tico de Papers 1-6 (solo a�ade non-inference notes)
- NO recluta sujetos humanos para Paper 10
- NO afirma validaci�n externa
- NO modifica `QICN-SYSTEM` excepto para E.5 (panel UI) y posibles ajustes de compilaci�n
- NO elimina contenido existente

---

## REGLAS PARA CODEX

- **One shot.** No preguntar. No pausar.
- **Mejora permitida:** Si encuentras una mejor implementaci�n que lo especificado, justif�cala y apl�cala.
- **NO modificar** contenido matem�tico existente. Solo a�adir o refinar presentaci�n.
- **NO eliminar** secciones. Solo a�adir non-inference notes donde falten.
- **Commit** tras cada fase completada.
- **Verificar:** `npm test` (QICN-SYSTEM), compilaci�n LaTeX (framework), `git diff --check`.

---

**Comienza ahora. One shot. Sin pausas. Sin preguntas.**
