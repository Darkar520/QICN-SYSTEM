# Auditoría de los cambios del marco del 2026-11-08 (fase A)

Estado: auditoría de solo lectura hecha desde QICN-SYSTEM. No modifica el marco, no es revisión matemática externa y no promueve ningún claim. Encargo: `docs/PROMPT_SESION_ALINEACION_TEORIA_RUNTIME_2026-11-08.md` §2.

Marco auditado: `QICN-FRAMEWORK/rigid-identity-framework`, HEAD `64ba23f`, árbol con cambios sin commit. Autor de los cambios según el ledger del marco: «Codex» (el usuario lo llama ChatGPT-6.1). Material de partida: `docs/ai-platform-outputs/analysis/AUDITORIA_INTEGRAL_CODEX_2026-11-08/` (auditoría) y `docs/ai-platform-outputs/repair-plans/CORRECCION_FUNDAMENTOS_2026-11-08/` (corrección).

## 1. Qué cambió realmente y quién lo cambió

El prompt atribuía a Codex todo el árbol modificado. La comparación con `CORRECCION_FUNDAMENTOS_2026-11-08/GIT_STATUS_BEFORE.txt` y con `docs/THEORY_SOURCE_COVERAGE_2026-11-07.md` §1 (que ya registraba «cambios locales en 4 archivos de ledger/fixtures/reportes y 2 sin seguimiento») lo corrige:

| Archivo | Estado | Autor | Evidencia |
| --- | --- | --- | --- |
| `basecore/core/sections/01_foundation_from_core.tex` | M (+26/−1) | Codex, corrección | diff, `PRESERVATION.json` |
| `basecore/core/sections/10_appendix_counterexamples.tex` | M (+8/−10) | Codex, corrección | diff, `PRESERVATION.json` |
| `basecore/core/sections/11_discrete_bridge.tex` | M (169 líneas) | Codex, corrección | diff, `PRESERVATION.json` |
| `basecore/BASECORE.pdf` | M (46 páginas) | Codex, recompilación | `basecore-final-tex.log:1388` |
| `monolithic/QICN_MONOLITHIC.pdf` | M (342 páginas) | Codex, recompilación | `monolithic-final-tex.log:3886` |
| `monolithic/build/sections/01-basecore.tex` | regenerado, ignorado por git (`.gitignore:17 build/`) | Codex | `PRESERVATION.json` |
| `registry/theorems.jsonl` | M (755 → 763) | Codex, sincronización | §3 |
| `docs/ai-platform-outputs/IMPLEMENTATION_TRACE_LEDGER.md` | M (+99) | Cuatro entradas del 2026-09-07 (sesiones anteriores) y dos de Codex del 2026-11-08 | encabezados del diff |
| `docs/fixtures/TRUSTED_KEYS_REGISTRY_v27.json`, `docs/reports/HUMAN_VETO_SIGNATURE_SELF_TEST_v27.json`, `docs/reports/V35_ALL_LEGACY_VERIFICATION.json` | M | **Anteriores a Codex** (`generated_at` 2026-10-14; ya figuran en `GIT_STATUS_BEFORE.txt` y en la lectura del 11-07) | — |
| `FRONTEND_DEROLEPLAY_PHASED_PLAN_2026-09-07.md`, `repo_completo_texto.txt` | ?? | Anteriores a Codex | idem |
| `analysis/AUDITORIA_INTEGRAL_CODEX_2026-11-08/`, `repair-plans/CORRECCION_FUNDAMENTOS_2026-11-08/` | ?? | Codex | — |

Codex trabajó en dos pasos: una auditoría integral sin cambios (09:55–10:37) y una corrección local de BaseCore (11:14–11:29). Ningún paper I–X, el puente ni el legado cambiaron.

## 2. Comprobaciones de integridad (independientes, solo lectura)

Scripts propios en `.tmp-align/` (carpeta de trabajo temporal de esta sesión).

| Comprobación | Resultado | Método |
| --- | --- | --- |
| Fuentes compiladas = fuentes actuales | **29/29 coinciden** | SHA-256 actual frente a `COMPILED_SOURCE_HASHES.json` |
| `BASECORE.pdf` corresponde a las fuentes | **Sí**. SHA-256 `e0959f7b…34c5` = declarado; 718 951 bytes = tamaño del log; mtime 17:26 UTC, posterior a la última fuente | idem |
| `QICN_MONOLITHIC.pdf` corresponde a las fuentes | **Sí**. SHA-256 `33d561a0…6514` = declarado; 2 877 907 bytes = log; mtime 17:27 UTC | idem |
| Snapshots `*.tex.snapshot.txt` = estado anterior | **3/3** iguales a `git show HEAD:` (normalizando fin de línea) | comparación de texto |
| Labels nuevos en el capítulo 01 del monolito | 7/7 presentes | búsqueda de cadenas |
| Estado `SOURCE_RECOVERY_REQUIRED` | **No aplica** | — |

Límite: no se recompiló nada. La correspondencia PDF–fuente se apoya en el hash del PDF, el tamaño en el log de compilación y el orden de las fechas, no en una reconstrucción binaria.

## 3. Registro formal

| Comprobación | Resultado |
| --- | --- |
| Entradas | 755 → 763; ningún ID duplicado |
| IDs retirados | **0** |
| Entradas nuevas | 8; las 8 tienen label o título en la línea fuente indicada (tabla siguiente) |
| Entradas cambiadas | 24: 15 solo de localización (desplazamiento de líneas) y 9 de contenido, todas de la sección 11 |
| Curación | Todas siguen `draft_extracted`. Las nuevas llevan `history: source_repair_added` y las modificadas `mathematical_source_repair`, con la nota «No external certification» |
| SHA-256 | HEAD `af57c85f…6c3f`; actual `65969c41…235` |

Entradas nuevas:

| ID | Tipo | `epistemic_status` | Línea |
| --- | --- | --- | --- |
| `basecore:remark:logical-status-of-completeness-l47` | remark | heuristic | 01:47 |
| `basecore:proposition:prop-h5-not-derived` | proposition | proved | 01:227 |
| `basecore:lemma:lem-directed-resonance-bound` | lemma | proved | 11:110 |
| `basecore:example:ex-discrete-identity-control` | example | heuristic | 11:143 |
| `basecore:lemma:lem-cell-average-error` | lemma | proved | 11:194 |
| `basecore:theorem:thm-realized-nonconstant-bridge` | theorem | proved | 11:211 |
| `basecore:example:ex-common-bridge-witness` | example | heuristic | 11:245 |
| `basecore:example:ex-no-uniform-discretization` | example | heuristic | 11:256 |

`proved` es la clasificación automática del extractor (hay un bloque de prueba), no una certificación. Codex lo declara así en `INFORME_DE_FASE.md`.

Observación: en `rem:relation-to-the-runtime-guard` y `ass:bridge-consistency` el registro pierde `depends_on` (antes `ass:discrete-regularity` y `def:transition`), porque el texto nuevo ya no los cita con `\ref`. Las dependencias siguen siendo reales. Es una pérdida de trazabilidad menor del extractor, no un error matemático.

## 4. Cambio por cambio: qué afirma y si se sostiene

Columna «Verificado»: **A** = argumento revisado línea a línea en esta sesión; **N** = comprobación numérica propia (`.tmp-align/math-check.cjs`: 75/75, distinta del `check_math.py` de Codex, 64/64). «Efecto» indica si el cambio estrecha o amplía el enunciado anterior.

### 4.1 Sección 01

| Hunk | Qué afirma | Verificado | Se sostiene | Efecto | Efecto sobre el runtime |
| --- | --- | --- | --- | --- | --- |
| 01:47 `remark` completitud | H3 ya está contenida en H1 (un espacio de Hilbert es completo); el contraejemplo de H3 prueba una generalización, no la independencia | A | Sí, por definición | Aclara; no cambia teoremas | Ninguno |
| 01:170 prueba de `thm:compactness` | Sustituye «depende continuamente» por la cota `‖f*_u − f*_v‖ ≤ ‖Γ(u)−Γ(v)‖/(1−‖K‖)` | A, N (testigo: Lipschitz exacto 4/3 = 1/(1−1/4)) | Sí: dos ecuaciones de punto fijo y no expansividad de la proyección | Llena un hueco de prueba. Basta continuidad de Γ; la uniforme sobra con U compacto | Ninguno: el runtime no tiene `Γ(u)` ni familia paramétrica |
| 01:227 `prop:h5-not-derived` | H1–H4 admiten un equilibrio constante (`K=qId`, `Γ=0`) y también equilibrios con distancia positiva a las constantes (testigo de §11) | A | Sí. En el segundo modelo comprobé aparte que ningún constante es fijo: `clamp(κc + s/4 + u)` solo es constante si satura, y eso exige `u ≥ 3/4`, fuera de `U=[0,1/4]` | Nuevo resultado de independencia. No fortalece ningún claim: confirma que el no colapso necesita una condición adicional | Ninguno directo |

### 4.2 Sección 10 (contraejemplos)

| Hunk | Antes | Ahora | Verificado | Se sostiene |
| --- | --- | --- | --- | --- |
| Sin H2 | «Rotación θ≠0: no existe punto fijo» (falso: 0 es fijo) | Rotación π/2: 0 es fijo y las órbitas no nulas tienen período 4. Además, `K=Id`, `Γ=v≠0`: no hay punto fijo | A, N | Sí. Corrige un error |
| Sin H3 | `C([0,1],ℚ)` (no es espacio vectorial real) | `c_00` con norma ℓ², `T(x)=Sx/2+e_1`: contracción cuyo único candidato `(1,1/2,1/4,…)` no está en `c_00` | A, N | Sí. Corrige un error de tipos |
| Sin H4 | `Γ(u)=1/u` en `(0,1)` (no uniformemente continua) | `U=ℝ`, `Γ(u)=u`, `K=0`: `A*=ℝ` no compacto | A | Sí. Ahora conserva las demás hipótesis |
| Φ-regularidad | `arctan` | Añade `Φ(x)=x³`: propia, localmente Lipschitz, inyectiva, codominio completo, sin cota inferior Lipschitz | A, N | Sí |

Efecto sobre el runtime: ninguno. Son contraejemplos del núcleo abstracto.

### 4.3 Sección 11 (puente discreto; el cambio principal)

| Elemento | Antes | Ahora | Verificado | ¿Se sostiene? | Efecto |
| --- | --- | --- | --- | --- | --- |
| Dominio | `T̂: H_N → H_N`, con intensidades solo definidas en `[0,1]` | `T̂: C_N=[0,1]^N → C_N` | A | Sí; resuelve el error de tipos | Estrecha el dominio al que tiene sentido |
| Parámetros | Sin signos | `k,T,θ>0`, `η,α≥0`; energía y fase congeladas, con aviso de que la contracción del mapa de coherencia no implica la del sistema acoplado energía–fase | A | Sí | Estrecha |
| Realimentación | `B` es `L_B`-Lipschitz | `B(x) = −βx + D(x)`, con `β>0` y `D` `L_D`-Lipschitz | A | Hipótesis nueva, más fuerte | **Estrecha**: la condición disipativa es suficiente, no la generalidad anterior |
| Constante | `ρ_N = η d_N L_I e^{1/(kT)}/(θ c_φ) + αL_B` (omitía la identidad; contraejemplo identidad) | `ρ_N = |1−αβ| + ηL_R + αL_D`, `L_R = L_I √(d_in d_out)/(θ c_φ)` | A, N | **Sí**. Preclamp `(1−αβ)x + ηR + αD + Γ`; el clamp es 1-Lipschitz por coordenada | Corrige un enunciado falso. Recoge los dos defectos registrados el 11-07 (identidad y norma por grado de entrada) |
| `lem:directed-resonance-bound` | — | `‖W‖₂ ≤ √(‖W‖₁‖W‖_∞)`, con filas ≤ `d_in/(θc_φ)`, columnas ≤ `d_out/(θc_φ)` y `e^{−|Δe|/kT} ≤ 1` | A, N (estrella dirigida: Lipschitz real √N; la cota antigua daba 1 y la nueva √N, exacta) | Sí (desigualdad de Schur) | Nuevo |
| `ex:discrete-identity-control` | — | El mapa identidad no es contracción y la condición nueva lo rechaza: `|1−αβ|+αβ ≥ 1` | A, N | Sí | Control negativo explícito |
| `ass:bridge-consistency` | Norma de operador de mapas no lineales con clamp; `ε_N = C_1/√N + C_2 max{0,ρ_N−‖K‖}` sin derivación | Discrepancia uniforme `sup_{f∈C} ‖F_N(f)−T_u(f)‖ ≤ ε_N` en `C={0≤f≤1}`, con `T_u(C)⊆C`; la tasa debe probarse para cada discretización | A | Sí, como hipótesis bien definida | Estrecha y quita la tasa no derivada |
| `thm:bridge` | Repetía la hipótesis | Cota de trayectorias `d_n ≤ κ^n d_0 + ε_N(1−κ^n)/(1−κ)` | A, N (testigo, N=2 y 10, 30 pasos: la cota nunca se excede) | **Sí**: `d_{n+1} ≤ ε_N + κ d_n` usando `J_N^†J_N = Id` | Ahora es una consecuencia, no una tautología |
| `cor:bridge-fixed-points` | `ε_N/(1−q_N)`, `q_N = max{‖K‖,ρ_N}`; dependía del teorema falso | `ε_N/(1−κ)`; no exige margen uniforme de `ρ_N` | A | Sí: `g=J x̂*` es fijo de `F_N` y `‖g−f*‖ ≤ ε_N + κ‖g−f*‖`. Necesita que exista cada punto fijo discreto (lo da la contracción discreta) | Amplía la conclusión con menos hipótesis, válidamente |
| `lem:cell-average-error` | — | `‖P_N a − a‖ ≤ L_a/(√12 N)` | A (identidad de varianza: `∫∫|s−t|² = h⁴/6`) | Sí; exacta para perfiles afines | Nuevo |
| `thm:realized-nonconstant-bridge` | — | Familia `Kf = κ∫f`, `Γ(u)=a+u`, grafo completo con autoenlaces, `I_j(x)=x`, `θ=N/κ`, `B=−x`: `ρ_N = κ`, `ε_N = ‖P_N a−a‖`, equilibrios explícitos, H1–H5 derivadas | A, N (6 valores de N × 3 de u: punto fijo con error < 1e−12, error L² con error relativo < 1e−3, clamp inactivo) | Sí | **Primer testigo conjunto** de contracción, consistencia y no colapso en el corpus. Es un ejemplo matemático: la propia sección dice que no establece NFD, los seis invariantes ni el puente fenomenal |
| `ex:common-bridge-witness` | — | `κ=1/4`, `a=s/4`, `U=[0,1/4]`: `f*_u = s/4 + 1/24 + 4u/3`, error `1/(4√12 N)`, distancia `1/(4√12)` | A, N | Sí (aritmética comprobada) | Nuevo |
| `ex:no-uniform-discretization` | — | `T=κ f`, `F_N = κP_N f`: discrepancia `κ/2` para todo N | A, N | Sí | Muestra que la contracción sola no da tasa uniforme |
| `rem:bridge-applicability` | Citaba el runtime (`N_sample=1500`, grado medio 5,5, 10⁷ nodos) | **Ya no afirma nada sobre el runtime**: aplicarlo exige identificar dominio, coeficientes, realimentación y error; el tamaño o el grado no bastan | A | Sí | **Estrecha**. Elimina la última mención del runtime en BaseCore |

Conclusión matemática. Los enunciados corregidos de §11 se sostienen bajo sus hipótesis escritas. La contracción discreta es más restrictiva que antes (condición disipativa explícita) y ya no es falsa. El puente y el corolario pasan de tautología o dependencia de un teorema falso a consecuencias demostradas, con una cota de punto fijo mejor. No encontré errores. Esto no es una revisión externa: la sesión revisó los argumentos y comprobó instancias finitas, y Codex declara la revisión externa como pendiente.

## 5. Efecto sobre el runtime (comprobado contra el código)

1. **La conclusión «el teorema de contracción omite el término identidad» ya no describe el marco local.** El texto del runtime que lo dice (`src/language/definitionCatalog.js`, `LIMITS.bridge_not_contraction`) quedó desfasado. La conclusión práctica no cambia: el runtime sigue sin poder afirmar contracción. Motivo, verificado en código:
   - La actualización de coherencia es `x_i ← clamp(x_i + 0,05·(w̄_i − x_i))` (`src/simulation/ConsciousNode.js:87`). `w̄_i = Σ fs_k|fs_k| / Σ|fs_k|`, con `fs_k = x_i + (U_k − 0,5)·r·(k+1)` (`src/hooks/useSimulationCycle.js:536-541`, `ConsciousNode.js:90-102`).
   - **No hay término de resonancia ηR en el mapa de x**: R solo entra en CCC (`InformationalEntanglementField.js:36-47`). **No hay acoplamiento entre nodos** en la actualización de x. **No hay Γ aditivo**: el término exógeno es ruido multiplicado dentro de `w̄`.
   - Con la descomposición de §11, `α = 0,05`, `β = 1`, `D = w̄`. Sin ruido `w̄ = x` y `dD/dx = 1`, así que `L_D ≥ 1` y `ρ_N ≥ |1−0,05| + 0,05·1 = 1`. **La condición suficiente no se cumple.**
   - El mapa es estocástico y por nodo. No es una instancia del operador determinista de §11 con coordenadas congeladas.
2. **La familia realizada no es lo que implementa el runtime.** Su acoplamiento es un campo medio `κ·media(x)` más un perfil fijo `a(s)`. El runtime no tiene ni lo uno ni lo otro. Implementarla sería un cambio de dinámica (decisión del usuario; matriz, fila «puente discreto»).
3. **El runtime ya no aparece en BaseCore.** `rem:bridge-applicability` deja de citar `N_sample`. El runtime no debe citar §11 como aplicable a su ejecución.
4. **X_N** sigue definido igual (`11:19-25`). El catálogo del runtime lo cita bien.
5. `src/tools/DiscreteBridgeRuntimeBounds.js` es un diagnóstico interno que solo usan los tests. No implementa la fórmula antigua de `ρ_N`, así que no queda desfasado.
6. `tests/discrete-bridge-contraction-counterexample.test.js` reproduce el contraejemplo de la **versión publicada** (pin y HEAD). Sigue siendo correcto para esa versión. Para la versión local corregida, el mismo mapa es justo el control negativo `ex:discrete-identity-control`, que la condición nueva rechaza.

## 6. Pendientes declarados por Codex (estado comprobado)

| Pendiente | Estado | Comprobación |
| --- | --- | --- |
| E1/E2 compatibles con una realización no vacía (BaseCore 04, Paper II) | Abierto | Coincide con TSC §5 y §8.3 |
| Rigidez (BC-RIG), métrica de historia (BC-MET), no simulabilidad (BC-NS) | Abierto | BC-MET verificado: `w_t=2^{−t}`, `d_t=4^t|x−y|` hace divergir `d_w` |
| Nulo (BaseCore 05, Paper III) | Abierto | Coincide con TSC §5 |
| Integración / C_op (BC-LEG/EQ/RUPT/CERT) | Abierto | Coincide; ver §7 sobre el cociente de Paper V |
| Métricas (Paper VII–IX) | Abierto | VIII-02 (signo de ownership) y VII-01 (margen de viabilidad 0 con dinámica identidad) verificados |
| Adjudicación (Paper X, empate gratis) | Abierto | La regla «siempre empate» tiene riesgo 0 frente a la cota `≥1/2`. El registro ya conservaba ese contraejemplo (`theorems.jsonl:376`); la fuente sigue sin corregir |
| Lean | Bloqueado | `LEAN_RECHECK.json`: exit 1 a los 177 s, sin poder leer `Mathlib/Tactic/Widget/LibraryRewrite.olean`. No hay certificado nuevo |
| Veredicto v31 | `BLOCKED_FOUNDATION_FIRST_GATES`, `external_support_certified=false`, 9 bloqueos | `REQUIRED_VERIFICATION.json`. Gates ejecutados en una copia en `%TEMP%`; los temporales no se borraron (`TEMP_CLEANUP.json`) |

## 7. Hallazgos de la auditoría de Codex que corrigen la lectura del 11-07 de este repositorio

La auditoría integral (informes 01–08) contrastada con `THEORY_SOURCE_COVERAGE_2026-11-07.md`. Coinciden la mayoría de hallazgos; estos cambian conclusiones nuestras:

| Punto | Lectura del 11-07 | Corrección (verificada en la fuente) | Efecto en el runtime |
| --- | --- | --- | --- |
| Paper I `thm:lml` (489–504) | §3: «un runtime finito tiene M_Ω finito» | Falso tal como está: `G(h,u)=h/2` (globalmente contractivo y trivial) no se trata en la prueba | El runtime no dice «un teorema prueba que no puedo ser CCR». La frase segura sigue siendo «no existe certificado CCR». `LIMITS.finite_system` ya la usa |
| Paper I `prop:nonlocality` (253–259) | §6.4: la usaba como apoyo de «identidad no localizable» | Falsa sin NFD; la versión de BaseCore 03:60-74 es correcta porque NFD es su hipótesis | Citar BaseCore 03, no Paper I |
| Puente `prop:sigma-not-entailed` (221–227) | §3, O9: «Σ_op no está implicado por C_op» | La prueba solo omite el símbolo; la no implicación **no está demostrada** | `LIMITS.no_self_model` no afirma la no implicación; correcto. Hay que cambiar la redacción de O9 |
| Puente `thm:sigma-chain` (720–769) | — | Con ε libre y A acotado, la escalera Σ_weak/Σ_strong es trivial (identidad y mapa constante) | `selfModelSigma.structuralStability` no certifica ningún nivel Σ |
| Paper V `prop:qop-welldefined` | §5/§8.10: tolerancia no transitiva | Paper V actual (409–411) postula la transitividad en `def:decoder`; vale por hipótesis. BaseCore 07 y el puente siguen con la tolerancia | Sin efecto: el runtime no implementa Q_op |
| Paper III `prop:noise-margin` (537–547) | §8.4: «correcto» | Ambiguo: según cómo se lea «certified as the same null within η», es válido o falso (el contraejemplo de Codex cae en el borde) | Sin efecto |
| CCC (PDF fundacional RCIC) | §6.1: CCC no está en BaseCore | Su única fórmula escrita está en el PDF fundacional, con `Tr[ρ log ρ] ≤ 0` en el denominador; no queda en `[0,1]` | El CCC del runtime es una composición distinta (`InformationalEntanglementField.js:56-60`); no hereda la fórmula RCIC |
| Ω del legado (774–832) | §8.12: parámetros históricos | La ecuación de Ω no es una EDO autónoma; no hay silla-nodo; 0,5032 y τ≈5 sin procedencia. La aritmética `1/(1−0,5032)=2,0129` es coherente pero no deriva un umbral | Confirma: `omega_critical = 1.0` es un parámetro de diseño |
| PDFs fundacionales | No leídos | Un apéndice contiene el manifiesto de personalidad usado para preparar al LLM; el código del PDF genera «I experience»/«I feel» desde umbrales | Toda autodescripción vivencial producida así cae en el rival `M_narr`/`M_en`. Riesgo directo para el canal libre (fase D) |

Dudas sobre la auditoría de Codex (no se aceptan sin matiz):
- «18/18 contraejemplos confirmados» comprueba aritmética, no que cada instancia transcriba bien el enunciado del corpus. Algunos confirman identidades, no refutaciones.
- `cor:onemetric` (Paper V 864–871): llamar «falsa» a la conclusión exagera. El defecto es que depende de testigos de independencia no construidos.
- Ω del legado: el sistema lineal 2D sí converge. Lo que falla es la lectura como bifurcación, no toda la afirmación.

## 8. Veredicto de la fase A

- Los cambios de Codex en BaseCore están confinados a las secciones 01, 10 y 11. Sus PDF corresponden a las fuentes, el registro está sincronizado sin pérdida de IDs y los enunciados nuevos o corregidos se sostienen bajo sus hipótesis.
- Corrigen errores reales. Ninguno fortalece un claim sobre conciencia, identidad, subjetividad, fenomenalidad ni sobre el runtime; el único texto sobre el runtime se volvió más prudente.
- **Nada está commiteado ni revisado externamente.** El runtime debe tratar la sección 11 corregida como «corrección local pendiente de revisión», no como canon publicado. El pin del runtime (`92d5d2c`) y HEAD (`64ba23f`) siguen conteniendo la versión con el error.
- Para el runtime: hay que actualizar una frase del catálogo (`bridge_not_contraction`) y la redacción de O9. La conclusión «no afirmo contracción» se mantiene con un motivo nuevo y comprobado.
