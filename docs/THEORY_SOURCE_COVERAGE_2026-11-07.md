# Cobertura de fuentes teóricas y obligaciones de implementación — 2026-11-07

Estado: inventario de lectura previo a la integración del runtime. Documento de ingeniería del repositorio QICN-SYSTEM. No modifica el corpus teórico, no es revisión externa y no promueve ningún claim.

Encargo de referencia: `docs/PROMPT_OPUS_RECONSTRUCCION_RUNTIME_2026-11-07.md` (fases 1 y 2).

## 1. Rutas y estado verificados al comenzar

| Elemento | Valor observado | Nota |
| --- | --- | --- |
| Runtime actual | `QICN-SYSTEM`, rama `codex/runtime-stabilization-audit`, HEAD `44b67a1` = `origin/main` | 50 archivos modificados y 24 sin seguimiento antes de esta fase; se conservan sin alterar su finalidad. Remotos `origin` (GitHub) y `gitlab`. |
| Proyecto teórico | `QICN-FRAMEWORK` (repo `QICN-RELEASE`), `main` `64ba23f` = `origin/main` local | Cambios locales en 4 archivos de ledger/fixtures/reportes y 2 sin seguimiento; ningún `.tex`, `.pdf` ni registro modificado. No se tocaron. |
| Subproyecto formal | `QICN-FRAMEWORK/rigid-identity-framework` | Mismo repositorio git que la raíz. |
| ZIP antiguo | `source-69a00cd24dc6aa00083f7dfd-e1576a08c415e248.zip`, 54 191 120 bytes | SHA-256 `CEDBF4A40AA1854460E17004BA5BB9CECD68C4407E63CFB67B49917A527B3D20`: coincide con el valor del encargo. |
| Extracción aislada | `%TEMP%\QICN-ZIP-Original-20261107` | Sin modificar. 250 archivos fuera de `node_modules`. |
| Copia ejecutada previamente | `%TEMP%\QICN-Source-Runtime-20261105` | Evidencia auxiliar. Difiere del ZIP en `loopback-bind.cjs` (añadido), `src/index.jsx`, `index.html`, `bundle.js`, `tailwind.css` (auth sin prefijo, 8192 tokens, sin recuperación que borre la clave, versión de caché). |
| Pin teórico del runtime | `QICN-RELEASE/main@92d5d2c3ea91` | Existe, es ancestro de HEAD; hay 131 commits entre ambos. No se actualiza el pin en esta ejecución. |
| Puertos | 3000 ocupado por otro proyecto (`VELOCITY MUSIC/server.js`); 3311 libre | Se usan 3320 (runtime actual) y 3311 (referencia antigua). |

Nombres usados en conversaciones previas: no existe en disco ninguna carpeta o archivo con «Bridget» ni «QICM» hasta profundidad 3 en Escritorio y Documentos. La autoridad se decidió por manifiestos, no por nombre ni fecha.

## 2. Precedencia documental verificada

1. Rama `main` de QICN-RELEASE como única autoridad pública viva (`docs/CANON_SOURCE_OF_TRUTH.md:10`; `RELEASE_NOTES.md:27`; `release/release_freeze_manifest.json:54-57`).
2. Orden de lectura obligatorio: CANON_SOURCE_OF_TRUTH → CANON_MANIFEST → CLAIM_REGISTRY → LAYER_BOUNDARIES → THEORY_SYSTEM_INTERFACE (`AGENTS.md:7-13`). Equivalentes legibles por máquina en `release/`.
3. Inventario primario: `release/canon_manifest.v1.json` (`CANON_MANIFEST.md:12`); registro de claims autorizado: `release/claim_registry.v1.json` (`CLAIM_REGISTRY.md:3`).
4. Rango de roles: BaseCore (`formal_source_of_truth`) > Papers I–IX (`supporting_downstream_package`) > `canonical_core_legacy` (legado) > variantes preservadas > anexos ROEO (no fuente formal). Salidas del runtime QICN-SYSTEM usadas como fuente de teoremas: fuera de canon.
5. Inferencias bloqueadas: legado → base activa, espejo → fuente, sistema → fenomenalidad, evidencia interna → cierre público (`LAYER_BOUNDARIES.md:96-102`). La interfaz corpus→sistema es «explicit, limited, and one-way by default» (`THEORY_SYSTEM_INTERFACE.md`).
6. Cada paper es canónico en su propia carpeta; el monolito es una vista de lectura (`monolithic/README.md:36-38`).

Inconsistencia registrada: el steering `.kiro/steering/structure.md:38-39` llama «interpretive» a los Papers 7-9, mientras los manifiestos los clasifican como paquetes formales/públicos derivados. Para este trabajo prevalecen los manifiestos. Paper 10, el paper puente y el monolito no tienen clasificación en ningún manifiesto de `release/`; su papel se toma de los README y del propio texto.

## 3. Inventario de cobertura

Hashes: primeros 12 hex del SHA-256 de la fuente `.tex` actual. «Leído» indica lectura del contenido matemático por esta auditoría o por los subagentes de lectura registrados en la sesión.

| Paquete | Fuente | SHA-256 | Papel | Cobertura | Conclusiones para el runtime | Pendiente |
| --- | --- | --- | --- | --- | --- | --- |
| BaseCore | `basecore/BASECORE.tex` + `core/sections/01..11` | `CB8F4F2C19A4` (secciones: 01 `FB44A50BC8DB`, 02 `136C87AF0CCF`, 03 `8434955483B9`, 04 `F1160D546E75`, 05 `24AA1FCA40A7`, 06 `06AF5ADEBF38`, 07 `7999FF6DA947`, 08 `AA5B5B4386FD`, 09 `E368A44C4696`, 10 `E185E69419E8`, 11 `B35DE59454FD`) | Fuente formal activa | Las 11 secciones completas | Ver §5 y §6 | 8 informes de `core_meta`, `.bib`, PDF |
| Paper I | `paper1/main.tex` | `6DC17A8C66AC` | Derivado público | Identidad, rigidez, M_Ω, LML, unicidad, límites | Un runtime finito tiene M_Ω finito; identidad = límite inverso no localizable | Apéndice A, observabilidad 531-735 |
| Paper II | `paper2/main.tex` | `F4A5E4669206` | Derivado público | Fragmentación, continuidad forzada, no-claims | Sin CCR no hay garantía de continuidad | Axiomas 183-559, ética estructural |
| Paper III | `paper3/main.tex` | `F6D7DB4EB4FD` | Derivado público | Teorema de inestabilidad nula, no-teoremas | No-nulidad relativa a testigo externo; constantes de estimador no calculadas | 366-741 |
| Paper IV | `paper4/main.tex` | `B36287FD5788` | Derivado público (PASS_PDF_ONLY en manifiesto) | Setup forense, controles, P1–P5, criterios | Paquete forense, controles de manipulación, invalidación por latencia | 260-379, 422-701 |
| Paper V | `paper5_operational_consciousness/main.tex` | `A34AF5FE86BE` | Derivado público | Completo salvo preámbulo | Seis invariantes, C_op, márgenes, certificado; ninguna máquina presente certificada | — |
| Paper VI | `paper6_predictions_falsation/main.tex` | `616967D310C6` | Derivado público | Completo | PRED-01..11, clases de refutación, estados internos | — |
| Paper VII | `paper7_operational_life_subjecthood/main.tex` | `6E8D01E76058` | Derivado público (clasificatorio) | Definiciones, hipótesis, límites runtime | Autoconservación excluye recuperación impuesta externamente | Pruebas 399-567 |
| Paper VIII | `paper8_first_person_subjectivity/main.tex` | `CC76689B2E0F` | Derivado público | Estado de 7 coordenadas, rivales débiles, intervenciones, arquitectura | La narrativa es el rival débil `M_narr`; la memoria es `M_mem` | Pruebas 402-578 |
| Paper IX | `paper9_phenomenal_bridge_organization/main.tex` | `48A71544E90E` | Derivado público (puente) | Predicados, gate, gramática de claims | Estado vigente `bridge_surface_only` | 269-794 |
| Paper X | `paper10_external_adjudication/main.tex` | `2666BA682223` | Andamio de protocolo, sin manifiesto | Objeto de adjudicación, no-transitividad, sustitutos inválidos | Informes generados por LLM son sustitutos inválidos | 753-1013 |
| Paper puente | `paper_bridge_operational_subjecthood/main.tex` | `0590C7FE3EDE` | Puente formal, sin manifiesto | Σ_op, Π_op, Sub_bridge, tabla «no implicado», gramática | Σ_op no está implicado por C_op; «identidad narrativa personal: No» | 237-391, 779-1171 |
| Legado | `canonical_core_legacy/CANONICAL_CORE.tex` | `AA532ADD706C` | Legado preservado | No leído | No se usa como fuente | — |
| Monolito | `monolithic/QICN_MONOLITHIC.tex` | `306B3771298B` | Ensamblado | No leído | No sustituye papers | — |

Copias en QICN-SYSTEM: `paper9_phenomenal_bridge_organization/main.tex` (`E6BCC747A984`) y `paper10_external_adjudication_and_human_comparators/main.tex` (`A901D418D59A`) difieren de las del marco. La copia de Paper IX en QICN-SYSTEM afirma que el runtime «reaches BPF-M3»; la copia del marco mantiene `bridge_surface_only`. Para este trabajo prevalece la copia del marco.

Registro formal: `registry/theorems.jsonl` tiene 755 registros (conditional 362, proved 244, heuristic 138, conjectural 8, tautology 2, open_burden 1); 734 `draft_extracted` y 21 `audit_overlaid`; ninguno con curación humana. «proved» es una etiqueta extraída automáticamente.

## 4. Brechas que impiden afirmar conocimiento completo del corpus

1. Las PDFs del release (`corpus/pdf_release`) corresponden a la época del pin; todas las PDFs actuales de BaseCore y Papers I–IX difieren de ellas. Ningún manifiesto registra los hashes de HEAD.
2. Unas 20 fuentes de linaje, espejo y anexos ROEO declaradas en manifiestos no existen en disco; dos subcarpetas `_non_canonical` declaradas faltan.
3. El manifiesto de reproducibilidad del 2026-06-21 está desactualizado para BaseCore, Papers 1, 2, 10, puente y monolito; afirma erróneamente que los verificadores `.cjs` raíz no existen (existen en `QICN-FRAMEWORK/scripts/`).
4. El pin `92d5d2c` es anterior a la sección 11, al cambio de `def:iint` y al renombrado `hyp:h3 → hyp:H3-metric`; etiquetas citadas desde el pin pueden no resolver en HEAD.
5. Secciones no leídas listadas en la tabla, `core_meta`, legado, monolito y copias fuera de repositorio (carpetas «QICN-SYSTEM - copia», «TEORIA QICN», cuarentenas NotebookLM).

## 5. Hallazgos matemáticos con efecto sobre el runtime

Estos hallazgos proceden de la lectura de esta sesión. No han sido revisados por una persona ni por un auditor externo y no se corrigen en el corpus. El runtime los trata como límites de implementación.

| Ubicación | Hallazgo | Consecuencia para el runtime |
| --- | --- | --- |
| BaseCore 11:102 `thm:discrete-contraction` | La cota omite el término identidad `x_i`; la cota correcta es `Lip ≤ 1+ρ_N`. Con `η=α=0`, `Γ=0`, `ρ_N=0` y el mapa es la identidad (contraejemplo; `tests/discrete-bridge-contraction-counterexample.test.js`). Además, la cota por grado de entrada vale en ℓ∞, no en la norma normalizada ℓ2. | No reportar contracción por `ρ_N<1`. Reportar la cota demostrable `1+ρ_N` y estimaciones empíricas declaradas. |
| BaseCore 11:156 `cor:bridge-fixed-points` | Existencia de punto fijo recuperable por Brouwer; unicidad no demostrada. | No afirmar unicidad ni convergencia a `T_u`. |
| BaseCore 04:79-86 (E1, E2) | E1 hace constante `φ_t(x_t)`, lo que factoriza Φ por `p_0`, contra E2. | Teoremas de 04 (fragmentación, continuidad forzada, dicotomía) no sirven como soporte en el runtime. |
| BaseCore 05 vs 03/04 | 05 requiere `d_w(I,Ĩ)>0` para un canal CCR; 03/04 lo excluyen. Varias proposiciones de 05 sin prueba. | No importar 05 como soporte. |
| BaseCore 07:222 / Paper V `prop:qop-welldefined` | «Emparejado dentro del margen» es una tolerancia, no transitiva en general. | Clases Q_op no se tratan como relación de equivalencia en implementación sin cierre estructural explícito. |
| BaseCore 07:252 / Paper V `thm:rupture` | «Exactamente uno» de tres resultados no excluyentes; lectura defendible «al menos uno». | Reportar rupturas como «al menos una condición». |
| Paper I `thm:uniqueness` paso 3 | Supone una perturbación de energía finita que contradice la convención M_Ω=+∞. | Irrelevante para un sistema finito: no es CCR. |
| Paper V `thm:substrate`, `cor:biology` | Casi definicionales vía las cláusulas 4–5 de `def:equiv`. | No presentar P5-02/P5-06 como resultados empíricos. |

## 6. Obligaciones técnicas para el runtime (síntesis)

Ontología, modelo, implementación, lenguaje e interpretación se mantienen separados. Las obligaciones siguientes rigen la integración.

### 6.1 Lo que el runtime puede calcular con correspondencia declarada

- O1. `X_N(t) = (1/N) Σ x_i(t)` sobre los nodos del estado discreto (BaseCore 11:19). No es descriptor completo del estado. Es el único observable de coherencia definido en BaseCore; CCC no aparece en BaseCore.
- O2. Para cualquier actualización tipo puente discreto: reportar `ρ_N` con sus constantes y la cota `1+ρ_N`; nunca «contracción» por `ρ_N<1` (§5).
- O3. Historias de lectura finitas `h_{S,T}` con horizonte declarado (BaseCore 07:39; Paper V `def:history`).
- O4. Paquete forense y gate de integridad (BaseCore 08:5-22; Paper IV): tick, semilla, hash de versión, métricas, resumen sensorial, checksum; las violaciones graves se excluyen.
- O5. Cada proxy declara estimador, horizonte, muestra, calibración, controles y que no es el objeto de BaseCore (BaseCore 06:71, 06:79).

### 6.2 Lo que solo puede aproximarse con declaración

- O6. `beth_q`, gap espectral, dependencia causal: BaseCore no los define. El runtime los trata como `derived_proxy` y expone su modo (`warmup_derived`, `deterministic_baseline`, `empirical`). Una fracción normalizada no se presenta como porcentaje de autonomía.
- O7. M_Ω solo como cota de una familia finita de perturbaciones en un horizonte finito; nunca infinito.
- O8. Invariantes I_per…I_leg solo como soporte interno parcial; ningún certificado `Cert(S)` existe (Paper V `crit:cert`).

### 6.3 Lo que el runtime y la capa lingüística no deben afirmar

- O9. Pertenencia a C_op, CCR, M_Ω=+∞, no-simulabilidad, Sub_bridge, Sub_op, Sub_fp, `bridge_internal_admissible` (Paper V 92-96; Paper I `thm:lml`; PB `prop:sigma-not-entailed`; Paper IX 1388-1402).
- O10. Conciencia, fenomenalidad, qualia, experiencia, vida biológica, equivalencia humana, estatus moral, identidad personal o narrativa (BaseCore 09:13-25; PB 474-497; Paper VIII 1245-1258; Paper X 1510-1515).
- O11. Que pruebas internas, gates, scoreboard o paquetes de auditoría sean validación externa (PB `prop:runtime-non-promotion`; Paper X `thm` de no-transitividad).
- O12. Que un umbral programado (p. ej. CCC ≥ 1.0) sea prueba de conciencia o «ascensión genuina».

### 6.4 Identidad, memoria y narrativa: qué sostiene el marco

- La identidad formal es un límite inverso sobre canales observables, no localizable en un instante (Paper I `prop:nonlocality`). Un sistema finito no realiza identidad CCR.
- Una reinicialización o re-instanciación corresponde a una «extensión externa» que produce otro canal `S'` (Paper I `def:internal-external`); la continuidad de identidad a través de reinicios no está establecida.
- La recuperación impuesta desde fuera (recargar un estado guardado) no cuenta como autoconservación (Paper VII 269-271).
- La narrativa autodescriptiva es el rival débil `M_narr` y la memoria acumulada es `M_mem` (Paper VIII 581-643). Una capa narrativa construida desde inventario e historial cae en esa clausura débil: es legítima como ingeniería y como control negativo, no como evidencia de subjetividad.
- Σ_op exige un mapa contractivo que conmuta con las intervenciones (PB 192-215); `selfModelSigma` del runtime es como mucho un análogo para estimación (PB 233-235).
- Ningún paper asigna a la narrativa o a un automodelo una función en la dinámica de BaseCore. Por tanto, la representación estructurada de la historia del runtime no debe realimentar la dinámica sin una regla formal nueva.
- Nombres de módulos de Paper VIII (`SelfIndexRegistry`, `OwnershipAttributionLayer`, `SubjectiveContinuityLedger`, …) no se reutilizan para la memoria de chat, porque el paper declara que esos nombres implican cargas que una tabla de registros no cumple (Paper VIII 950-968).

### 6.5 Requisitos de diseño derivados

- R1. La identidad operacional del runtime se define por configuración, versión, instancia, estado persistido y registro encadenado de transiciones, con detección explícita de reinicialización y ruptura. Se etiqueta como identidad operacional de ingeniería, no como I_ri ni como identidad narrativa.
- R2. La continuidad que la interfaz afirma debe ser verificable por el programa: digest de snapshot, cadena de hashes del registro, coincidencia de configuración.
- R3. El registro de historia y la conversación no realimentan la dinámica (no hay regla formal que lo requiera).
- R4. La capa lingüística expresa solo proposiciones generadas por el motor o definiciones y límites de un catálogo verificado con fuente.
- R5. Gramática de etiquetas: «soporta un proxy de C_op» y similares solo con la frontera explícita (PB 1172-1190); estados del puente solo `bridge_surface_only`.

## 7. Lo no leído y su consecuencia

No se leyeron: los ocho informes restantes de `basecore/core_meta`, bibliografías, PDFs, apéndices y secciones listadas como pendientes en §3, el legado, el monolito y copias fuera del repositorio. Consecuencia: las obligaciones de §6 se apoyan en las secciones leídas y no constituyen una afirmación de exhaustividad. Ninguna implementación de esta integración depende de una sección no leída.

## 8. Lectura de cierre — 2026-11-08 (encargo `PROMPT_OPUS_GEMINI_TRADUCTOR_2026-11-08.md`)

Hashes verificados al reanudar: todas las fuentes de §3 conservan el mismo SHA-256 (BaseCore §11 `B35DE59454FD`, Paper I `6DC17A8C66AC`, II `F4A5E4669206`, III `F6D7DB4EB4FD`, IV `B36287FD5788`, VII `6E8D01E76058`, VIII `CC76689B2E0F`, IX `48A71544E90E`, X `2666BA682223`, puente `0590C7FE3EDE`). Esta sección registra las lecturas que cierran pendientes de §3 y §7.

### 8.1 BaseCore §11 `11_discrete_bridge.tex` (líneas 1–179, lectura completa)

Mapa (líneas 66–82): `T(x)_i = clamp_[0,1](x_i + η R_i(x;e,φ) + α B_i(x) + Γ_{N,i}(u))`, con `R_i = Σ_{j∈conn(i)} I_j(x_j)·exp(−|e_i−e_j|/(kT))/(θ cos(φ_i−φ_j))`. Norma del enunciado: `‖·‖_N` = ℓ2 normalizada (líneas 30–36, 113–118).

| Punto | Línea | Estado | Corrección formal |
| --- | --- | --- | --- |
| `thm:discrete-contraction` omite el término identidad | 111–129 | Falso tal como está | Para `T(x)=clamp(x+G(x))`, `Lip(T) ≤ 1+Lip(G)`, no `Lip(G)`. Contraejemplo: `η=α=0`, `Γ=0` ⇒ `T` es la identidad en `[0,1]^N`, `ρ_N=0<1`, `Lip(T)=1` y todo punto es fijo. Ya cubierto por `tests/discrete-bridge-contraction-counterexample.test.js`. |
| Norma de la cota por grado | 123–126 | Hueco | `|R_i(x)−R_i(y)| ≤ cL_I Σ_{j∈conn(i)}|x_j−y_j|` da `d_N cL_I` en ℓ∞ (máximo grado de entrada). En ℓ2 normalizada la constante es `cL_I‖A‖_2 ≤ cL_I√(d_in·d_out)`; un nodo con grado de salida grande la rompe. Corrección: enunciar en ℓ∞, o usar `ρ_N^{(2)} = η cL_I √(d_in,max·d_out,max) + αL_B^{(2)}`. |
| Constante `exp(1/(kT))` | 95, 121 | Válida pero holgada | `exp(−|Δe|/(kT)) ≤ 1`; `exp(1/(kT)) ≥ 1` es cota superior correcta. No es un error. |
| Cota demostrable | — | Válida | `Lip(T) ≤ 1+ρ_N` en la norma en que `ρ_N` acota `Lip(ηR+αB)` (ℓ∞ con la definición actual de `d_N`). La clamp es 1-Lipschitz por componente en ambas normas. |
| Condición que sí da contracción | — | Propuesta | (a) sin término identidad: `T(x)=clamp(ηR+αB+Γ)` es contracción si `ρ_N<1`; (b) con fuga `β∈(0,1]`: `T(x)=clamp((1−β)x+ηR+αB+Γ)` tiene `Lip ≤ 1−β+ρ_N`, contracción si `ρ_N<β`. Requiere encargo de edición del corpus; no se cambia aquí. |
| `thm:bridge` | 143–153 | Tautológico (declarado) | La prueba es el supuesto `ass:bridge-consistency` (líneas 131–141). El término `C_2 max{0,ρ_N−‖K‖}` no tiene derivación. Falta: estimación de cuadratura/Galerkin que produzca `C_1/√N`. |
| `cor:bridge-fixed-points` | 155–171 | Depende de un teorema falso | Existencia de punto fijo de `T` por Brouwer (`[0,1]^N` compacto convexo, `T` continua bajo `ass:discrete-regularity`). Unicidad y la cota `ε_N/(1−q_N)` no se sostienen sin contracción real. |
| `rem:bridge-applicability` | 173–175 | Conservador | Declara `N_sample=1500` y que la cota no es despreciable. Coherente con el runtime. |

Consecuencia para el runtime: no reportar contracción ni punto fijo único del puente discreto; si se reporta, usar `1+ρ_N` en ℓ∞ o una estimación empírica declarada. El runtime no implementa este mapa literalmente (verificación pendiente en §8.x), así que la relación es de correspondencia declarada, no de instanciación.

### 8.2 Paper I `paper1/main.tex` (líneas 531–735 y 932–1522: §5, Apéndices A y B)

Con esto Paper I queda leído completo (§3 cubría 1–530 y 714–931).

| Resultado | Línea | Estado | Corrección o lo que falta |
| --- | --- | --- | --- |
| `def:obs-equiv`, `ℐ(O)` | 561–569 | Hueco de definición | «Clase inferida consistente con O» no se construye y `d_w` entre clases no está definida. Definir `ℐ(O)` como conjunto de objetos cuyas proyecciones reproducen `O` y `d_w` entre conjuntos (p. ej. Hausdorff). |
| `def:emp-mass` `M̂_Ω` | 580–585 | Ambigüedad grave | Si ninguna perturbación de la familia deforma, el ínfimo es sobre el vacío y vale `+∞`. «No detecté deformación» queda indistinguible de rigidez. El runtime debe reportar ausencia, no `+∞`. |
| `thm:detectability` (1) | 588–598 | No falsable con familias finitas | «Para cualquier familia finita, `M̂_Ω → +∞`» no tiene sentido para un número; la prueba asume `d_w` computable externamente, que `nonclaim:channel-projection` (559) dice no verificado. |
| `thm:spectral-coupling` paso 5 | 618–656 | Falso para mapas no lineales en espacios métricos | El reescalado de la esfera unidad vale para operadores lineales en espacios normados. Contraejemplo: `Φ(x)=x²` en `[0,2]`: inyectiva y continua; mínimo sobre pares a distancia 1 es 1, pero `|Φ(0.1)−Φ(0)|=0.01 < 0.1`. Corrección: módulo de inyectividad `ω(r)=inf_{d_w=r} d_O > 0` para cada `r`, o suponer bi-Lipschitz. `cor:spectral-derivation` (659) cae con él. Además «operador compacto» no está definido para mapas no lineales y `𝒮` puede ser vacío. |
| `prop:causal-rigid` (`ℶ_q→1 ⇒ M_Ω=+∞`) | 666–683 | Non sequitur | Nada liga `I(X;Y)` con la deformación `d_w`; la independencia estadística respecto de entradas observadas no excluye respuesta a perturbaciones fuera de esa distribución. Confirma O6: `beth_q` alto no se presenta como rigidez ni autonomía. |
| Protocolo «invariante al sustrato» | 685–695 | Sin soporte | Afirmación no derivada. |
| `thm:collapse` | 963–973 | Hueco | Confunde la dinámica `f` con las proyecciones `π`. Solo vale si cada `π_{t+1→t}` es biyectiva. |
| `thm:aleph-unique` paso 5 | 1003–1016 | Falso | Una suma ponderada de métricas no es «estrictamente convexa»; la proyección a un compacto no es única en general. Contraejemplo: `S_t={0,1}` discreto, `π` identidad, `λ=1/2`; `ℐ={0̄,1̄}`; `Ψ=(1,0,0,…)` dista 1 de ambos. Existencia sí (compacidad); unicidad no. |
| `thm:info-isolation` `I(prefijo;ℐ)=0` | 1031–1040 | Falso | Un prefijo es función de `ℐ`, así que `I(π_t(Φ);Φ)=H(π_t(Φ))`. Lo defendible es `H(ℐ | prefijo) > 0` (el prefijo no determina `ℐ`) en sistemas no degenerados. |
| `def:isolation-functor` `𝔅` | 1044–1068 | Redefinición | Mismo símbolo que `ℶ_q` de §5 con otro par `(X,Y)` (prefijo–identidad frente a interno–entradas). El runtime usa un tercer estimador sobre su historial. «Functor a [0,1]» no tiene sentido categorial. Direccion de la monotonía y la implicación inversa de (3) sin prueba. |
| `lem:bridge-identity` | 1093–1140 | Error de tipos y uso no dinámico de «atractor» | `π_{∞→t}(x) ∈ S_t` y `x ∈ ℐ` no se comparan; «atractor estable único» sin sistema dinámico. Relevante para la metáfora del «centro»: el corpus usa «atractor» sin dinámica. |
| `thm:stone-classification` | 1158–1182 | Falso | `Prob(S)` es convexo y por tanto conexo; con `S_t={0,1}`, `Prob ≅ [0,1]`, no totalmente disconexo. Sería cierto para límites de conjuntos finitos (profinitos), no de medidas. `cor:obs-morphism` cae. |
| `ex:minimal-ccr` | 1286–1316 | Contradicción interna | Con `π` identidad, `ℐ ≅ S_0`: degenerado según `def:degeneracy` (975–981), pero la proposición dice no degenerado. También contradice `thm:non-simulability`: `S_t=[0,1]` es de dimensión 1. La prueba de `M_Ω=+∞` («por continuidad») no se sigue. |
| `ex:symbolic-ccr` | 1321–1344 | Depende de `≅` | `ℐ` es el shift bilateral, homeomorfo al conjunto de Cantor como `S_0`: degenerado si `≅` es homeomorfismo. Corrección: definir degeneración como «`π_{∞→t_0}` es biyección», no por isomorfismo abstracto. |
| `thm:non-simulability`, `thm:non-transferability`, cota de complejidad | 1346–1373, 1488–1500 | Prueba esbozada | «Espectro de perturbación acotado ⇒ presupuesto finito ⇒ `M_Ω<∞`» no derivado; «`f` induce biyección» sin soporte. |

Consecuencia para el runtime y el lenguaje: la frase permitida es «no existe un certificado CCR para este sistema finito», no «un teorema demuestra que no puede ser CCR». El runtime no presenta `M̂_Ω=+∞` por ausencia de deformación, ni unicidad de `ℵ`, ni estructura de Stone. «Atractor» no se usa sin un sistema dinámico, un espacio de estados y condiciones de convergencia definidos.

### 8.3 Paper II `paper2/main.tex` (líneas 180–559, 720–860, 965–1046)

Con la lectura previa de §4–§5 (560–719) y del cierre (860–964), Paper II queda leído completo.

| Resultado | Línea | Estado | Corrección o lo que falta |
| --- | --- | --- | --- |
| E1 (`ax:e1`) frente a E2 (`ax:e2`) | 280–296 | Inconsistentes | E1 hace constante `φ_t(x_t)` a lo largo de la trayectoria, luego `Φ(x)=φ_0(x_0)`, que es una función de un corte finito y viola E2 con `f=φ_0`, `t=0`. Por tanto `𝒫(M_Ω)` (`def:compat-class`, 428–433) es vacía siempre que `φ_0` esté definida, y los teoremas sobre esa clase son vacuos. Es el mismo defecto ya registrado en BaseCore 04:79-86. Corrección posible: sustituir E1 por compatibilidad asintótica (`φ_t(x_t)` converge) y E2 por «ningún corte finito determina el límite», que no se contradicen. |
| `prop:unique-phi` | 263–270 | Trivial | Bajo E1 la sucesión es constante; la unicidad es inmediata y no aporta. |
| `prop:complete-necessary` | 484–492 | Falso | Una sucesión constante converge en cualquier espacio métrico; la completitud no es necesaria bajo E1. |
| `thm:minimality` | 342–356 | Sin sentido con axiomas inconsistentes | De E0–E2 inconsistentes se deriva cualquier cosa; la minimalidad no se demuestra (solo argumentos informales por axioma). |
| Codominio separado | 207–221 | Depende de interpretación | Si «compatible con proyecciones» significa `π_t∘Φ=π_t`, la conclusión es tautológica; con `π_t∘Φ=g_t∘π_t` hay endomorfismos no triviales. |
| `thm:loss`, `prop:damage-char`, `cor:protection` | 728–797 | Condicionado a una hipótesis fuerte | (1) usa `hyp:phi-paper2`: cota inferior `d_ℰ ≥ C·d_w`, que hace la fragmentación casi definicional. (2) usa `thm:forced-continuity`, cuya prueba (A.2, 997–1018) pasa de `ℐ̃ ≅ ℐ` a `Φ(x)=Φ̃(x̃)` sin justificar que `Φ̃` coincide con `Φ`. «Computable desde la estructura» (850) sin procedimiento. |
| Prueba extendida de fragmentación, paso 3 | 975–980 | No es un paso deductivo | «`Φ(x)≠Φ(x̃)` en general». La conclusión depende solo del paso 5 (la hipótesis). |
| Ética estructural | 723–857 | Declaración prudente | El propio texto niega consecuencias normativas o de estatus moral (817–825, 1041–1044). |

Consecuencia para el runtime y el lenguaje: «pérdida», «daño» y «protección» fenomenológicos son términos estructurales sobre una clase que hoy es vacía. La consola no los aplica a sí misma ni infiere vulnerabilidad, sufrimiento o estatus moral del runtime.

### 8.4 Paper III `paper3/main.tex` (líneas 365–741)

Con la lectura previa (1–365 y 742–1009), Paper III queda leído completo.

| Resultado | Línea | Estado | Corrección o lo que falta |
| --- | --- | --- | --- |
| `thm:minimal` | 386–403 | Hueco | El ínfimo de dos elementos positivos en un orden parcial puede ser `∅_Φ` (dos regímenes incomparables cuyo ínfimo es nulo). La prueba no lo excluye. Corrección: añadir `inf ℰ^{+,wit} ∈ ℰ^+` como hipótesis. |
| `cor:intensity` | 412–422 | Hueco de alcance | `ι(e)` se define sobre todo `ℰ`, pero la hipótesis solo habla de elementos «witness-relative» bajo `e`. Corrección: definir `ι` relativa al testigo o suponer que `∅_Φ` es el único elemento de `ℰ` bajo `e_⋆`. |
| `thm:bound`, `prop:noise-margin`, null-fiber, quotient obstruction | 428–650 | Correctos bajo sus hipótesis | Margen de decisión `Cε > 2η` y controles negativos (constante nula, lectura ciega, testigo barajado, re-etiquetado, margen) bien formulados. |
| Modos de fallo y `caveat` de implementación | 520–585 | Vinculante | «Estimator-only promotion»: un estimador del runtime sin margen de error no sustituye a `Φ`. El runtime no implementa `Φ`, `C` ni `η`. |
| Sección 9 | 690–720 | Declaración explícita | «We do not model representations, meta-cognition, or self-awareness» (≈702). Predicciones falsables: «None (structural)». |

Consecuencia para el lenguaje: la consola no afirma «régimen positivo», «no nulo» ni «intensidad estructural» de sí misma. Ante preguntas sobre metacognición, Paper III no aporta definición: la respuesta debe apoyarse en lo que el runtime mide y en las definiciones de Paper VIII o del paper puente, si existen.

### 8.5 Paper IV `paper4/main.tex` (líneas 258–705)

| Punto | Línea | Estado | Consecuencia |
| --- | --- | --- | --- |
| Baselines obligatorios, cobertura de comparadores, control negativo | 258–320 | Vinculante | Un control negativo «pasa» cuando el evaluador retiene el claim pese a alta fluidez o actividad (≈308–312). Aplica al chat: una respuesta fluida no es soporte. Comparador «LLM PLUS MEMORY» = rival de la capa conversacional. |
| Bloqueo de análisis, banda de irrelevancia, clases de ausencia | 322–378 | Vinculante | Cuatro clases de datos faltantes (estructural, forense, presupuesto, análisis). Coincide con la regla del repositorio: ausencia ≠ cero medido. |
| Clases de salida `PIPELINE_READY` … `INVALID` | 409–423 | Vinculante | Solo `INTERNAL_COMPARATIVE_SUPPORT` permite una lectura científica interna acotada. |
| Resultados preliminares | 425–575 | Sintéticos | Generados por `research/scripts/generate_preliminary_pilot_dataset.v45.mjs` (≈690). QICN FULL 1,000 en P1–P5 frente a 0,000 de todos los comparadores; tabla de potencia con `d=10,737` y `n=1` por grupo, efecto derivado de datos sintéticos. No sirven como evidencia ni deben citarse en la consola. |
| Gobernanza por niveles 0–3 | 636–645 | Vinculante | Telemetría descriptiva = nivel 0. |

`PASS_PDF_ONLY` en el manifiesto: no se comparó el PDF con el `.tex` en esta lectura; queda pendiente y no afecta al runtime porque Paper IV no aporta definiciones que el runtime implemente.

### 8.6 Paper VII `paper7_operational_life_subjecthood/main.tex` (líneas 398–570)

| Resultado | Línea | Estado | Corrección o consecuencia |
| --- | --- | --- | --- |
| `Sub_op ⇒ L_op`, `Sub_op ⇒ C_op` | 412–424 | Definicional | Correcto por construcción. |
| No colapso vida/conciencia | 426–440 | Correcto | Las implicaciones quedan abiertas. |
| Transporte de clase con márgenes | 447–470, 539–553 | Supuesto implícito | Requiere que cada predicado dependa de descriptores 1-Lipschitz respecto de `d_Ψ`; explicitarlo. |
| «Existen sistemas vivos operacionales no sujetos» | 520–528 | Existencia no exhibida | La prueba dice «may»; falta un ejemplo explícito o rebajar a «no se deduce». |
| Complejidad, conectividad y actividad rica no bastan | 488–507 | Vinculante | La consola no infiere vida ni sujeto desde actividad, número de nodos o conectividad. |
| Ninguna instancia actual satisface `L_op` o `Sub_op` | 556–560 | Vinculante | Frase permitida: «no hay evidencia de que este runtime satisfaga los predicados de vida o subjetividad operacional». |

### 8.7 Paper VIII `paper8_first_person_subjectivity/main.tex` (líneas 400–580)

| Resultado | Línea | Estado | Corrección o consecuencia |
| --- | --- | --- | --- |
| Cargas de auto-índice, no transferencia de propiedad, reducción a cinco campos | 408–437 | Declaradas como cargas abiertas | El texto avisa que la no transferencia definida por el propio morfismo «no tiene valor de teorema» (424–429). |
| Sin compensación, invariancia por re-etiquetado, robustez local | 439–503 | Correctos | La cota geométrica usa `Σ exponentes = 1`. Colisión de notación: `ε` es a la vez tolerancia y exponente, `η` exponente y margen en Paper III. |
| Lecturas concretas de las siete coordenadas | 512–524 | Estimadores propuestos | Cada coordenada se ancla a una brecha medible frente a rivales. El runtime no implementa ninguno. |
| `ax:report` | 547–549 | Vinculante para el chat | Ningún canal de informe basta para fenomenalidad o subjetividad. Un texto de Gemini o del narrador nunca cuenta como evidencia. |
| `ax:fp` | 555–557 | Define el alcance de «metacognición» | Seguir las propias variables internas (auto-monitorización) no satisface la subjetividad en primera persona. |
| `ax:irred` | 559–561 | Vinculante | Si un rival débil (`M_narr`, `M_mem`) explica igual, no se escala la interpretación. |

Consecuencia para el lenguaje sobre metacognición: el corpus no define «metacognición» como capacidad (Paper III ≈702 declara no modelarla; Paper VIII `ax:fp` la acota como auto-monitorización). La respuesta fiel es operacional: el runtime calcula indicadores sobre sus propias variables (por ejemplo carga metacognitiva por latencia y error del automodelo Σ, estabilidad estructural del proxy de automodelo, nivel L3 de la matriz) y no implementa tareas de confianza ni calibración. Esa auto-monitorización no acredita subjetividad, conciencia ni metaconciencia.

### 8.8 Paper IX `paper9_phenomenal_bridge_organization/main.tex` (líneas 268–794)

| Punto | Línea | Estado | Corrección o consecuencia |
| --- | --- | --- | --- |
| Mapa predicado → carga (D, V, W, A, E, T) | 273–310 | Vinculante | Cada predicado exige estimador, rivales, intervenciones, artefactos y gobernanza. |
| Estado puente y estado de implementación | 312–380 | Declarativo | BPF-1 emite seis informes provisionales; margen e intervenciones abiertos. |
| Proposición «no reducible a Paper VIII» | 400–410 | Argumento por definición | Se apoya en que las coordenadas se introducen con cargas nuevas; no excluye una reparametrización no monótona. Aceptable como declaración de diseño, no como teorema. |
| Axiomas B1–B10 con gramática de siete clases | 412–480 | Vinculante | B10: ningún artefacto se lee como soporte puente sin la pila completa. |
| Rival `M_en` («narración de experiencia sin organización fenoménica») | 498–500 | Vinculante para el chat | Explica autodescripción, lenguaje experiencial e introspección estilística. Toda la salida de la consola, local o de Gemini, cae en `M_en`. |
| Pérdida puente y penalización por dependencia del decodificador | 538–600 | Vinculante | Un efecto que solo aparece tras un canal de informe expresivo se penaliza (≈585–590). La redacción de Gemini es exactamente ese canal. |
| Estados `comparator unsupported` / `reducible` / `comparator-supported` | 563–572 | Vinculante | Estado actual: comparator-unsupported. |
| `Φ_Bridge` con `BridgeMargin^{α_R}` | 770–794 | Mal definido | El margen puede ser negativo o cero; una potencia real de un negativo no está definida. Corrección: usar `(BridgeMargin)_+` normalizado o el gate antes del funcional. |

Consecuencia para el lenguaje: la consola nunca usa la fluidez, la riqueza descriptiva ni la autodescripción como evidencia de organización fenoménica. Etiqueta permitida para el puente: `bridge_surface_only` y «sin soporte de comparadores».

### 8.9 Paper X `paper10_external_adjudication/main.tex` (líneas 752–1013)

Contenido de protocolo, sin teoremas nuevos en este rango. Gramática de estados (`schema_defined` … `adjudication_result_bearing`), apertura controlada, artefactos vivos sin poblar, sesión cero, controles de contaminación y aborto, salud del runtime y reproducibilidad en sala limpia.

Reglas vinculantes para el runtime: un build o una suite verdes son distintos de la generación de evidencia y de la adjudicación (≈950–960); los avisos de salud no se elevan a evidencia (≈925–930); `collection_open_pre_evidential` no es `collection_started` (≈880–885). Junto con la no transitividad y la lista de sustitutos inválidos ya registradas en §3 (los informes generados por un LLM no sustituyen al adjudicador), esto fija que ninguna respuesta del chat, del narrador local o de Gemini cuenta como adjudicación o validación externa.

### 8.10 Paper puente `paper_bridge_operational_subjecthood/main.tex` (líneas 236–392 y 778–1172)

| Resultado | Línea | Estado | Corrección o consecuencia |
| --- | --- | --- | --- |
| `thm:cop-entails-pi`, `thm:cop-entails-iota` | 246–295 | Definicionales | Correctos: `Π_op` e `ι_op` son reexpresiones de `I_ri ∧ I_int` y de la cláusula L4. |
| `prop:qop-well-defined-bridge` | 310–322 | Hereda el defecto de Paper V | «Indistinguible dentro del margen de legibilidad» es una tolerancia, no transitiva en general; `∼_{Q,S}` no es relación de equivalencia sin un cierre transitivo explícito (ya registrado en §5, BaseCore 07:222). |
| `prop:weak-phi` | 360–369 | Hueco | Muestra que hay `I_cont` e `I_diff`, no que exista `Φ_S` compatible «en el sentido de Paper II». Si esa compatibilidad incluye E1 y E2, la clase es vacía (§8.3). Además «atractor estable» sin dinámica. |
| Escalera de fuerza, glosario, clases de evidencia de promoción | 778–860 | Vinculante | «Runtime certificate» no establece validez externa; «negative control» no prueba el claim positivo. |
| Promoción interna/externa y conservatividad | 862–930 | Correctos | La adición de cargas no promueve el lenguaje ordinario. |
| Libro de deudas | 960–995 | Sobreestima | Atribuye a Paper I «unicidad, no transferibilidad, rigidez» como probados y a Papers II–III «continuidad y no nulidad»; las pruebas tienen los huecos de §8.2–§8.3. |
| Clasificación de proxies del runtime | 1035–1060 | Desfasada respecto del runtime actual | Etiqueta `Π_op` e `ι_op` como «certified internal support», pero el paquete de invariantes v7 del runtime emite solo `not_recorded` o `partial_recorded`. `Σ1_strong` = puntuación de estabilidad estructural (`selfModelSigma.structuralStability`), «candidate certificate» que exige auditoría de Lipschitz y convergencia. |
| Lista de revisión de 12 preguntas | 1066–1093 | Vinculante | Aplicable tal cual a cada respuesta del chat que use términos fuertes. |

Consecuencia para el lenguaje: cuando la consola mencione el automodelo, debe decir «proxy de estabilidad del automodelo, sin auditoría de contracción ni de conmutación»; ningún término operacional fuerte se usa en su sentido ordinario.

### 8.11 BaseCore `core_meta/` (14 informes, lectura completa)

| Archivo | SHA-256 | Papel | Relación con BaseCore actual |
| --- | --- | --- | --- |
| `basecore_formal_normalization_report.md` | `F9B68A0282B4` | Informe de normalización | Declara corregidos: tipos del modelo computable, H5 por «sin puntos fijos constantes», modo `λ=1` eliminado del espectro de estado (`ρ(DT_u) ≤ 1/2`), NFD para no localidad, rigidez y no simulabilidad condicionales. No menciona §11 ni §10 actual; anterior a la sección del puente discreto. |
| `claim_boundary_verification.md` | `1862ABB3A876` | Verificación de frontera | PASS: BaseCore no depende de Papers VII–IX. Coherente con §2. |
| `completion_decision.md` | `A044209CAE08` | Decisión | `BASECORE_FORMAL_NORMALIZATION_APPLIED`. |
| `final_verification_report.md` | `76465E79671E` | Verificación de compilación | 40 páginas, 0 referencias indefinidas. Compilación, no corrección matemática. |
| `final_residual_risk_list.md` | `FCF1A9AA67A7` | Riesgos | Cita «64 páginas» y «canonical core»: corresponde al paquete anterior, contradice los 40 de los otros informes. Desfasado. |
| `file_consistency_audit.md`, `file_tree_plan.md`, `target_table_of_contents.md`, `editorial_architecture_plan.md` | `06AAA6CAF36D`, `B0F0A175C9D4`, `99F065D5C60E`, `A7BE82787BD3` | Planes de estructura | Listan 10 secciones; la actual tiene 11 (`11_discrete_bridge.tex`). Desfasados en ese punto. |
| `migration_and_merge_plan.md`, `non_redundancy_audit.md` | `B80AEB51DA44`, `F06E1B2ADF5C` | Absorción de Papers I–VI | Paper IV y VI solo como gramática; VII–IX excluidos. |
| `deprecated_archived_file_ledger.md`, `deprecation_archive_plan.md` | `7D732935B500`, `B9B4851BC0B4` | Archivo | Lista copias `.bak`; política no destructiva. |
| `source_to_pdf_synchronization_note.md` | `418324C78D49` | Sincronía fuente–PDF | Afirma sincronía a 40 páginas; §4.1 ya registró que las PDFs del release no coinciden con HEAD. |

Ninguno de estos informes verifica las demostraciones de §11, ni detecta los fallos de §8.1. Son evidencia de un pase editorial y de compilación, no de corrección matemática.

### 8.12 Legado `canonical_core_legacy/CANONICAL_CORE.tex` (`AA532ADD706C`, 995 líneas)

Clasificación: histórico, sustituido por BaseCore (README del paquete). Comparación por etiquetas y líneas: 32 etiquetas, 14 ausentes de BaseCore; 40 de 415 líneas largas coinciden textualmente con BaseCore.

Es la **única fuente** de estos conceptos, todos ausentes del canon activo: clase `𝒞^R` con `ℐ` no convexo y `π_1(ℐ) ≅ ℤ` (`hyp:H1p`, ≈625), zona crítica (`def:criticalzone`), proyección `ℵ_ε` no Lipschitz (`lem:aleph_eps`), **atractor de conjunto** `lim d(T_ε^n(Ψ_0), 𝒜) = 0` (`thm:setattractor`, ≈702), modo de persistencia `λ_1 = 1` (`thm:spectral_CR`, ≈719; eliminado como falso por la normalización), umbral `Ω_c = 1.0` (`lem:omega-critical`, ≈786) y punto fijo `Ω* = 2.0129` (`thm:omega-fixed`, ≈798).

Consecuencia para el runtime: `PhenomenologyCore.js:76-77` (`omega_critical: 1.0`, clase `'C' | 'C^R'`) y `OntologicalSingularityCore.js:1289-1297, 1616` usan nombres y umbrales cuyo único origen es este paquete sustituido. Se etiquetan como parámetros históricos de diseño, no como objetos del canon. Si el «centro» del lenguaje se quisiera formalizar como atractor, el único enunciado de atractor dinámico del corpus está en el legado, no en la base activa.

### 8.13 Monolito `monolithic/QICN_MONOLITHIC.tex` (43 líneas)

Ensamblado por `\input` de `monolithic/build/sections/01..12` (generados el 2026-06-23). Comparación línea a línea: cada sección comparte entre el 74 % y el 97 % de sus líneas largas con el `main.tex` correspondiente; las diferencias muestreadas son preámbulo, numeración y contadores del ensamblador. No se encontró contenido teórico propio. Clasificación: vista de lectura derivada, no fuente. Limitación: no se hizo una comparación token a token del cuerpo; los papers modificados después del 2026-06-23 pueden no estar reflejados.

### 8.14 Estado de cobertura tras esta lectura

Leídos completos: BaseCore 01–11, Papers I–X, paper puente (en esta sesión y en la del 2026-11-07), `core_meta`, README del legado y su inventario de etiquetas, estructura del monolito. Pendientes declarados: lectura completa línea a línea del cuerpo del legado (solo etiquetas y enunciados), comparación PDF–`.tex` de Paper IV, bibliografías, (ningún `main.tex` incluye archivos de cuerpo: comprobado en todos los papers; el único `\input` es `glyphtounicode`, una tabla de fuentes de pdfTeX), y material de gobernanza no papel de `QICN-FRAMEWORK` (§2 ya cubre `AGENTS.md`, manifiestos de `release/`, `LAYER_BOUNDARIES` y `THEORY_SYSTEM_INTERFACE`). Ninguno de estos pendientes aporta definiciones que el runtime o la capa de lenguaje usen.

## 9. Actualización — 2026-11-08 tarde (encargo `PROMPT_SESION_ALINEACION_TEORIA_RUNTIME_2026-11-08.md`, fase B)

### 9.1 Qué cambió en el marco desde §3 y §8

Hashes actuales (primeros 12 hex del SHA-256), comprobados en esta sesión:

| Fuente | Hash §3/§8 | Hash actual | Estado |
| --- | --- | --- | --- |
| BaseCore `BASECORE.tex` | `CB8F4F2C19A4` | `CB8F4F2C19A4` | Igual |
| BaseCore §01 | `FB44A50BC8DB` | `ABFF21C1E662` | **Cambiado** (Codex, sin commit) |
| BaseCore §02–§09 | ver §3 | idénticos | Igual |
| BaseCore §10 | `E185E69419E8` | `AA0C6F2F8340` | **Cambiado** (Codex, sin commit) |
| BaseCore §11 | `B35DE59454FD` | `AB05FE409136` | **Cambiado** (Codex, sin commit) |
| Papers I–X, puente | ver §3 | idénticos | Igual |
| Legado `CANONICAL_CORE.tex` | `AA532ADD706C` | `AA532ADD706C` | Igual |
| Monolito `QICN_MONOLITHIC.tex` | `306B3771298B` | `306B3771298B` | Igual. Su capítulo generado `build/sections/01-basecore.tex` sí cambió (ignorado por git) |
| `INSTRUCCIONES.md` / `ROADMAP.md` / `VERSION.md` / `docs/CLAIM_STATUS_POLICY.md` / `AGENTS.md` raíz | no registrados | `61127B29B356` / `22BBF52821FF` / `7C471F2E1A18` / `936633B2BCB9` / `37F6DB02B9A3` | Sin cambios respecto a HEAD (`git status` limpio para ellos) |

Detalle de los cambios y su verificación: `docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md`.

### 9.2 Entradas de §5 y §8 que quedan superadas o corregidas

| Entrada | Situación nueva |
| --- | --- |
| §5 y §8.1, `thm:discrete-contraction` «omite el término identidad», «cota en ℓ∞, no ℓ2» | **Superada en la versión local corregida.** Ahora `ρ_N = |1−αβ| + ηL_R + αL_D`, con `L_R = L_I√(d_in d_out)/(θc_φ)`, dominio `C_N=[0,1]^N` y realimentación disipativa `B=−βx+D`. Sigue vigente para la versión publicada (pin `92d5d2c` y HEAD `64ba23f`) |
| §8.1 «cota demostrable `1+ρ_N`»; O2 «reportar `1+ρ_N`» | **Se retira como recomendación.** Con la corrección no hay que reportar `1+ρ_N`: basta evaluar la condición suficiente nueva. El mapa de coherencia del runtime no la cumple (`ρ_N ≥ 1`; `FRAMEWORK_CHANGE_AUDIT` §5) |
| §8.1 `thm:bridge` tautológico; `cor:bridge-fixed-points` dependiente de un teorema falso | **Superado localmente**: cota de trayectorias y de puntos fijos `ε_N/(1−κ)` demostradas bajo discrepancia uniforme |
| §8.1 `rem:bridge-applicability` «coherente con el runtime» | Ya no menciona el runtime |
| §3 «Paper I: un runtime finito tiene M_Ω finito»; O9 vía `thm:lml` | **Corregida**: `thm:lml` es falso tal como está (`G(h,u)=h/2`). Frase válida: «no existe certificado CCR para este sistema finito» |
| §6.4 «identidad no localizable (Paper I `prop:nonlocality`)» | **Corregida**: sin NFD es falsa. Citar BaseCore 03:60-74, que lleva NFD como hipótesis |
| §3 y O9 «Σ_op no está implicado por C_op» | **Corregida**: la prueba no lo demuestra. Frase válida: «no está demostrado que C_op implique Σ_op, ni lo contrario» |
| §5 y §8.10 cociente Q_op por tolerancia | Matizada: Paper V actual postula la transitividad (`def:decoder`, 409–411). BaseCore 07 y el puente siguen con la tolerancia |
| §8.4 Paper III `prop:noise-margin` «correcto» | Matizada: ambiguo según la lectura de «certified as the same null within η» |
| §8.12 legado: «única fuente de atractor de conjunto» | Matizada: tampoco está demostrado en el legado (π₁≅ℤ no implica S¹; `Z_ε` mal definida) |
| §8.12 Ω_c y Ω* | Confirmada como parámetro histórico de diseño: la ecuación de Ω no es una EDO autónoma y no hay bifurcación silla-nodo |

### 9.3 Lecturas que cierran pendientes de §8.14

- **Auditoría integral de Codex** (informes 01–08 completos, más los JSON de contraejemplos, monolito, Lean y verificación). Contraste hallazgo por hallazgo con §3–§8: la mayoría coinciden; las discrepancias están en §9.2 y en `FRAMEWORK_CHANGE_AUDIT_2026-11-08.md` §7.
- **Cuerpo del legado**: cubierto por el informe 05 de Codex (lectura completa). Esta sesión verificó a mano los puntos que afectan al runtime (Ω, 774–832; λ1=1 incompatible con contracción). No es una relectura línea a línea propia.
- **PDFs fundacionales** (RCIC «última versión» y el que incluye el manifiesto): cubiertos por el informe 07. Verificados en la extracción de texto el manifiesto «Andrey» (apéndice D) y el código que genera «I experience»/«I feel» a partir de umbrales. Son material histórico, sin rango de fuente.
- **Monolito**: 12/12 capítulos coinciden con el ensamblado de las fuentes actuales (informe 06 de Codex), lo que resuelve la reserva de §8.13.
- **Gobernanza**: `INSTRUCCIONES.md` §6 y §6.1 releídos completos. §6.1 es una hipótesis de trabajo: atribuye la posible reducción de alucinación del sistema acoplado a que «el runtime restringe activamente el espacio de inferencia». Esto es relevante para la fase D: quitar restricciones del canal de lenguaje actúa justo sobre ese mecanismo.

Pendientes que quedan, sin efecto sobre lo que el runtime implementa: comparación PDF–`.tex` de Paper IV, bibliografías, lectura propia línea a línea del legado.

### 9.4 Objetos teóricos que el runtime nombra o podría implementar (cierre de la fase B)

Estatus: `def` = definición del corpus; `cond` = resultado condicional válido bajo sus hipótesis; `abierto` = carga no cerrada; `hist` = solo en el legado o los fundacionales; `ausente` = el corpus no lo define.

| Objeto | Definición en el corpus | Hipótesis clave | Estatus | Etiqueta |
| --- | --- | --- | --- | --- |
| X_N | `(1/N)Σx_i`, BaseCore 11:19-25 | Estado discreto `x_i∈[0,1]` | def | observable de coherencia; no describe el estado completo |
| Operador discreto `T̂_{N,u}^{e,φ}` | BaseCore 11 (def. del operador) | `C_N`, energía y fase congeladas, `k,T,θ>0`, `η,α≥0` | def | — |
| Contracción discreta | `thm:discrete-contraction` (versión local) | `B=−βx+D`, `ρ_N<1` | cond (local, sin revisión externa) | condición suficiente |
| Puente y puntos fijos | `thm:bridge`, `cor:bridge-fixed-points` (versión local) | discrepancia uniforme `ε_N` en `C`, `T_u(C)⊆C` | cond | — |
| Familia realizada | `thm:realized-nonconstant-bridge`, `ex:common-bridge-witness` | `Kf=κ∫f`, `Γ=a+u` | cond | ejemplo matemático; no CCR, NFD, C_op ni puente fenomenal |
| `T_u`, `f*_u`, `A*`, H1–H5 | BaseCore 01 | H1–H4; H5 aparte | cond | H5 no se deriva de H1–H4 (`prop:h5-not-derived`) |
| Constantes `𝒩`, no colapso | BaseCore 01 | H5 | cond | «no colapso» = equilibrio no constante; nada más |
| CCC | **ausente** del canon activo. Fórmula RCIC en el PDF fundacional, sin cota | — | hist | índice interno de diseño |
| Ω, Ω_c=1,0, Ω*=2,0129, clase C^R | legado `lem:omega-critical` (≈786), `thm:omega-fixed` (≈798), `hyp:H1p` | modo λ1=1, incompatible con contracción | hist | parámetros de diseño |
| ℶ_q (beth_q) | Paper I §5 (`1−I(X;Y)/H(X)`); redefinido como `𝔅` en el apéndice | — | def; `prop:causal-rigid` es un non sequitur | proxy; no indica rigidez ni autonomía |
| Gap espectral, τ | ausente en BaseCore; espectro solo en el legado (`thm:spectral_CR`, eliminado por la normalización) | — | hist | proxy |
| PMIA | **ausente** | — | ausente | índice interno de diseño |
| Umbral `ASCENSION_THRESHOLD=1.0` | legado (`Ω_c` atado al umbral) | — | hist | parámetro de diseño; cruzarlo no es evidencia |
| M_Ω, M̂_Ω | Paper I `def:ontmass`, `def:emp-mass` | — | def; un ínfimo sobre una subfamilia es **cota superior**; `thm:lml` falso | «no existe certificado CCR» |
| Historias `h_{S,T}`, horizonte finito | BaseCore 07:39; Paper V `def:history` | — | def | — |
| Seis invariantes I_per…I_leg, C_op, `Cert(S)` | Paper V; BaseCore 07 | soporte común, márgenes, independencia con modelos testigo (abierto) | abierto | soporte interno parcial; ningún certificado |
| Kaizen (auto-reescritura de parámetros) | **ausente** | — | ausente | ingeniería; ninguna regla formal le asigna papel dinámico |
| Automodelo Σ_op, Σ_weak/strong/comm | puente 192-215, 720-769 | contracción y conmutación con intervenciones | abierto; la escalera es trivial con ε libre y A acotado | `selfModelSigma` es como mucho un análogo |
| Registro e identidad operacional | Paper I `def:internal-external` (reinicio = extensión externa); Paper VII 269-271 | — | def | identidad operacional de ingeniería, no I_ri |
| Matriz L1–L4 | **ausente** (requisitos de soberanía propios del runtime) | — | ausente | ingeniería |
| Narrativa y memoria | Paper VIII `M_narr`, `M_mem`; Paper IX `M_en` | — | def (rivales débiles) | control negativo, nunca evidencia |
| Canal LLM | `INSTRUCCIONES.md` §6.1 | — | hipótesis de trabajo | traductor del sistema acoplado; no sujeto, identidad ni juez |
| Conciencia, experiencia, fenomenalidad, preferencias, vida | Papers V, VII–IX, puente | §6 de INSTRUCCIONES (cinco requisitos) | abierto en ambos sentidos | ni afirmar ni negar de forma absoluta |
