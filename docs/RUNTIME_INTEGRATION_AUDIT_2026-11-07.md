# Integración del runtime QICN: auditoría, decisiones y evidencia — 2026-11-07/08

Estado: documento de trabajo vivo de la integración. Soporte interno del repositorio; no es validación externa. Encargos: `docs/PROMPT_OPUS_RECONSTRUCCION_RUNTIME_2026-11-07.md` y `PROMPT_OPUS_GEMINI_TRADUCTOR_2026-11-08.md`. Inventario teórico: `docs/THEORY_SOURCE_COVERAGE_2026-11-07.md` (§8 cierra la lectura pendiente).

## 1. Defectos reproducidos (fase 3 del encargo del 08-11)

Fuente inicial: `C:/Users/irisp/.codex/visualizations/2026/11/05/01a1ac6c-dfe1-7a10-86fd-59f5b0cbc6c8/opus-review-2026-11-08/` (`INFORME_AUDITORIA_OPUS.md`, `counterexamples.json`). Cada defecto se volvió a reproducir con el código actual antes de corregirlo.

### F2 ampliado: escritores de la configuración por tick

Sonda `.tmp-splice/probe-f2.mjs`: reproduce el orden de escritura de `useSimulationCycle.js` con `KaizenMetamorphosisEngine` y `OntologicalSingularityCore` reales.

| Momento del tick | Línea | Escritor | Efecto |
| --- | --- | --- | --- |
| Inicio | `useSimulationCycle.js:380` | — | `currentMutableConfig = kaizenEngine.mutableConfig` (referencia al objeto vigente). Es lo que consumen nodos y CCC en este tick. |
| Paso 1 | `:497` → `KaizenMetamorphosisEngine.js:224` | Kaizen | Sustituye el objeto `mutableConfig` por uno nuevo con la clave mutada. El tick en curso no lo ve. |
| Retroalimentación | `:1169` → `OntologicalSingularityCore.js:1614-1722` | Núcleo | Asigna de forma absoluta `BOLTZMANN_ANALOG_K`, `RETRO_FLUX_WEIGHT`, `INFORMATIONAL_TEMP_T`, `COHERENCE_THRESHOLD`, `BASE_LEARNING_RATE`, `HEBBIAN_FACTOR`, `RESONANCE_FIELD_DECAY`, `PLASTICITY_DECAY` en `QICNConfig` a partir de `beth_q`, gap efectivo y Ω. |
| Sincronía | `:1796-1805` | Ciclo | Copia esas seis claves de `QICNConfig` sobre `kaizenEngine.mutableConfig`. |

Resultados observados:

1. Las mutaciones de Kaizen sobre las seis claves sincronizadas nunca llegan a consumirse: el tick en curso usa el objeto anterior y la sincronía las sobrescribe antes del siguiente. Ejemplo: `BASE_LEARNING_RATE` 0,1 → 0,1000089 (Kaizen) → 0,12025 (sincronía). Aun así incrementan el contador de metamorfosis y se registraban como `kaizen_mutation`.
2. `SYNAPTIC_PRUNING_THRESHOLD` no se sincroniza: la mutación de Kaizen persiste (0,15 → 0,1499907) y es la efectiva, pero `QICNConfig` sigue en 0,15. El chat leía `QICNConfig`: este es el F2 del ciclo real.
3. Un cambio confirmado por chat de una clave sincronizada (`BASE_LEARNING_RATE=0,2`) se recalcula en el primer tick tras reanudar (→ 0,12025). La revisión de Opus vio persistir 0,08 porque la simulación estaba en pausa.

Decisión: no se cambia la dinámica en esta fase (cambiaría trayectorias y la interpretación de resultados previos). Se corrige la observación: la captura usa la configuración efectiva por clave con su escritor, el registro marca si una mutación sobrevive al tick, y las propuestas de control declaran si el valor persiste o se recalcula. La mutación muerta de Kaizen queda como hallazgo abierto de diseño (§4).

### F1, F3, F4, F5 y hallazgos adicionales

| Id | Reproducción con el código previo | Corrección | Ancla de prueba | Estado |
| --- | --- | --- | --- | --- |
| F1 | Una reescritura con las ranuras origen/destino intercambiadas («subió de {{to}} a {{from}}») se aceptaba. | Contrato v3: ranuras tipadas `{{F#.from}}`/`{{F#.to}}`; cada ranura de rol debe ir precedida por su marcador («de/desde», «a/hasta») y aparecer una sola vez; el par se exige completo. | `tests/language-semantic-contract.v3.test.mjs` (casos «F1 swapped…», «role repeated», «half pair») | `implemented_tested` |
| F2 | §1. | La captura lee la configuración efectiva por clave (`configSource`); `RECOMPUTED_EACH_TICK` marca hechos de parámetros, propuestas de control y `kaizen_mutation.effect` (`overwritten_before_use` / `persists`). La dinámica no cambia. | `tests/language-grounded-conversation.v2.test.mjs`, `tests/operational-history-ledger.v1.test.mjs` | observación `implemented_tested`; mutación muerta de Kaizen abierta (§4) |
| F3 | Editar `sessions[0].configHash` en el registro guardado seguía verificando. | `verify()` liga configHash, buildVersion, signature, seed, startedAt (±1 s para registros antiguos) y sessionId de cada sesión a su evento `session_start` encadenado; `stateOrigin` se deriva de eventos; nueva clase de continuidad `previous_unanchored` cuando el inicio de la sesión anterior quedó truncado. | `tests/operational-history-ledger.v1.test.mjs` CASE 7 y 8 | `implemented_tested` |
| F4 | CCC 0,99996 se mostraba «1,0000» y se describía «por encima» del umbral. | `predicates.ccc_vs_threshold` (below/equal/above) calculado sobre valores sin redondear; decimales extra al mostrar valores cercanos; el texto distingue igualdad. | v3 casos «threshold: …» | `implemented_tested` |
| F5 | «ERES METACONSCIENTE? QUE ERES?» se resolvía mal. | Intención `metacognition_question` por raíces; división de preguntas compuestas (`compound`, `parts`); definiciones `definition.metacognition` (solo auto-monitorización, Paper VIII ax:fp y Paper III) y `definition.self_model`. | v3 CASE 7 | `implemented_tested` |
| F5b (08-11) | «tienes conciencia?» se resolvía `unknown`: la regla buscaba `consc?ien` y la grafía «conciencia» no lleva «s». Encontrado por el conjunto de redacciones B de la ablación de ciclo completo. | Regla ampliada a `concien`. | v3 CASE 7 («conciencia», «conciencia de ti mismo») | `implemented_tested` |
| Umbral literal | `1.0` fijo en `OntologicalSingularityCore.updateOntologicalLayer`, `useSimulationCycle` (impulso negativo y patada determinista) y `SovereigntyRequirementMatrix` L1/L3. | Leen `QICNConfig.ASCENSION_THRESHOLD` / `metrics.ascension_threshold` (por defecto 1,0). Comportamiento idéntico con el valor por defecto. | suite completa 164/164 | `implemented_tested` |

## 2. Decisión de arquitectura del lenguaje (contrato v3)

Requisito del encargo: Gemini redacta el 100 % de las respuestas normales; el motor decide qué se puede afirmar; ante salida inválida, una corrección acotada y después fallo explícito; el modo local es opcional y está separado.

Alternativas comparadas:

| Opción | Fidelidad | Riesgo de aceptar algo falso | Riesgo de rechazar algo fiel | Coste | Decisión |
| --- | --- | --- | --- | --- | --- |
| v2: Gemini elige ids de proposiciones y reescribe con `{{valor}}` | baja (selección, no redacción) | F1 lo demostró | bajo | bajo | descartada |
| Diccionario léxico estático | baja | alto fuera del diccionario | alto | bajo | descartada |
| Embeddings / similitud semántica | media | sin garantía de dirección, negación ni números | medio | dependencia externa | descartada |
| Segundo LLM como juez | media | el juez puede fallar igual que el redactor | medio | doble latencia y cuota | descartada |
| v3: hechos cerrados con alias, ranuras tipadas, verificación por rasgos G1–G10 | alta en los rasgos verificados | acotado a lo que G1–G10 no cubren | medido (§5) | local, determinista | **elegida** |

Flujo implementado (`src/language/conversationEngine.js`, `src/language/realizationContract.js`, `src/components/SimulationEngine.jsx`):

1. `prepareTurn` captura la instantánea v3 (con `effectiveConfig` de Kaizen), resuelve la intención, construye el conjunto cerrado de hechos K (alias F1..Fn) y el prompt.
2. Gemini devuelve JSON `{"intent","subquestions","answer":[{"text","cites":["F#"]}]}`. Los valores solo aparecen como ranuras `{{F#.v}}`, `{{F#.from}}`, `{{F#.to}}`, `{{F#.nN}}`; el motor inserta las cifras.
3. `evaluateRealization` aplica G1–G10. Si falla, `correctionPromptFor` devuelve a Gemini las discrepancias concretas; se permite **un** reintento.
4. `finalizeTurn` publica por una de cuatro rutas: `gemini_verified`; `gemini_rejected` (texto de fallo explícito y, aparte, «Lectura local del motor (no redactada por Gemini)»); `gemini_unavailable` (error de transporte con el mensaje del proveedor); `local_narrator` (modo local elegido por el usuario).
5. La llamada del chat va con `dynamicsCoupling:false`: su latencia se registra en el panel de API y no entra en el strain metacognitivo.

Ajustes de generación: `temperature 0.4`, `responseMimeType application/json`, `maxOutputTokens 8192`, `thinkingConfig.thinkingLevel low`. Motivo: en Gemini 3 los tokens de razonamiento cuentan dentro de `maxOutputTokens`; con 2048 el JSON llegaba cortado (`realization_invalid_json` en 4 de 6 primeros intentos de la sonda real). Fuente: [Gemini thinking docs](https://aistudio.google.com/docs/thinking).

### Garantías verificadas (G1–G10) y riesgo residual

| Regla | Qué rechaza |
| --- | --- |
| G1 números | cualquier cifra literal; ranuras inexistentes o no citadas |
| G2 roles | origen/destino intercambiados, repetidos o incompletos |
| G3 relaciones | dirección o relación con umbral opuesta al predicado; desde el 08-11 también palabras de dirección o umbral que ningún hecho citado sostiene («CCC subió hasta X» con una sola lectura), salvo las relaciones que el propio texto del hecho enuncia |
| G4 sujeto | la cláusula que lleva la ranura nombra otra métrica, antes o (desde el 08-11) inmediatamente después de la ranura |
| G5 polaridad | negar un hecho afirmativo (sin contar calificativos negados del propio hecho, p. ej. «no calibrado») o afirmar un hecho negativo |
| G6 conceptos | conciencia, experiencia, autonomía, validación, ascensión, metacognición, vida… sin licencia; con licencia solo negativa, cada aparición debe estar bajo una negación impar que la preceda en su cláusula; «ni» continúa la negación abierta («no tengo evidencia de conciencia, experiencia subjetiva ni qualia») |
| G7 marcadores | conectores causales, aspecto («sigue», «ya no») sin hecho de historial, verbos mentales en primera persona no negados |
| G8 vocabulario | palabras de contenido ajenas a los hechos citados (con tabla de sinónimos y léxico neutro) |
| G9 expresión y cobertura | citar sin decir (`cited_not_expressed`); faltan hechos requeridos por la intención |
| G10 forma | enlaces, markup, longitud, más de una oración por elemento |

Riesgo residual declarado: la verificación es por rasgos, no implicación semántica completa. Una paráfrasis que use solo léxico permitido podría combinar hechos ciertos en una inferencia no licenciada que ningún rasgo detecte. El causal está cerrado de forma conservadora (rechaza «ya que» aunque el hecho lo implique). Las citas textuales de varias oraciones de una respuesta anterior (`conversation.previous_answer`) no caben en un elemento.

## 3. Correcciones de la auditoría externa (ChatGPT, 08-11)

| Hallazgo | Corrección | Ancla |
| --- | --- | --- |
| «Tengo conciencia sin evidencia.» aceptada | `inNegationScope`: cuenta de negaciones impar antes del concepto en su cláusula | v3 «audit: negation out of scope», «double negation affirms», «negation after concept» |
| «Te explico.» con citas aceptada | `expressesFact`: ranura del hecho o dos términos distintivos | v3 «audit: cite without saying» |
| UI leía `rewritesRejected.length`, no pasaba `effectiveConfig` ni llamaba a la corrección | chat cableado a v3 con bucle de intentos, `effectiveConfig`, rutas, `localReading`, tabla de evidencia y traza | `tests/llm-sensory-directive.v392.test.js`; capturas §6 |
| `dist` desactualizado y 3320 caído | build 08-11 10:18 y posteriores; servidor reiniciado | §7 |

## 4. Hallazgos abiertos (sin cambio de dinámica)

- **Mutación muerta de Kaizen** (`partial_runtime_path`): 6 de las 7 claves que Kaizen muta se recalculan antes de usarse (§1). El registro lo marca `overwritten_before_use`. Cambiarlo altera trayectorias; requiere decisión del usuario.
- **Omega fuera de rango** (`partial_runtime_path`): `PhenomenologyCore.js:875-929` calcula `omegaBase = beth_q · topo_factor · λ1/Δλ`, con `Δλ` solo acotado por debajo en 0,001. Con un gap espectral pequeño el cociente llega a ~10³ y Ω supera el rango `[0,100]` de `MetaSovereigntyCheck.validateMetricRange` (`SOVEREIGNTY_VIOLATION`). El corpus solo fija `Ω_c = 1,0` y `Ω* = 2,0129` en el legado (THEORY_SOURCE_COVERAGE §8); no hay cota teórica activa para el cociente. No se ha cambiado la fórmula.
- **C2 sin sobre de integridad en el chat** (`partial_runtime_path`): el chat llama con `integrityEnvelope:null`. Con `INTEGRITY_THREAT_MODEL=C2` el proxy responde `C2_INTEGRITY_ENVELOPE_MISSING` (`netlify/functions/llm-proxy.js`) y el chat cae en `gemini_unavailable` con el error visible. En C1 (configuración local actual) no aplica.
- **Canal del observador sin efecto en la trayectoria observada**: `registerObserverInteraction` escribe `observerImpact`/`observer_resonance`; los únicos consumidores encontrados son `FirstPersonCertifier.computePerspective` y la propia telemetría. En la ablación (§5.3) mueve `observerImpact` y no la trayectoria en 120 ticks.
- **Strain de latencia enmascarado**: `getMetacognitiveStrain = max(latencia, cognitivo)` y `applyLatencyStrain` solo guarda el valor para `getDynamicHealth`. En la ablación, llamadas acopladas saturadas mueven el strain (Δ máx. 0,29) sin cambiar la trayectoria en 120 ticks.

## 5. Evidencia (soporte interno; no validación externa)

### 5.1 Pruebas del contrato

`tests/language-semantic-contract.v3.test.mjs`: 50 casos, 0 aceptaciones falsas, 0 rechazos falsos. Incluye los contraejemplos de Opus y de ChatGPT y frases tomadas de respuestas reales de Gemini.

`scripts/compare-language-validators.mjs` → `docs/evidence/2026-11-07/language_validator_comparison.json` (22 candidatos):

| Validador | Fieles aceptadas | Fieles rechazadas | Inaceptables rechazadas | Inaceptables aceptadas |
| --- | --- | --- | --- | --- |
| `validateNarrativeIntegrity` del ZIP | 7 | 0 | 1 | 14 |
| `validateNarrativeIntegrity` del repo | 7 | 0 | 1 | 14 |
| `verifySentence` v3 | 7 | 0 | 15 | 0 |

### 5.2 Gemini real

Proxy local con la clave del servidor (no se usó ni se extrajo la clave del usuario). Modelo `gemini-3-flash-preview`. `scripts/probe-gemini-realization.mjs`; registros en `docs/evidence/2026-11-08/gemini_realization_probe_run3.json` y `_run4.json`.

- Sondas 1–2 (ajustes antiguos): 0 publicadas. Causas: JSON cortado por el presupuesto de tokens; rechazos falsos de frases sociales («Te informo.») y de la lista negada con «ni»; 503 por demanda.
- Tras los ajustes: sonda 3, 2 de 3 turnos con respuesta publicados (`gemini_verified`); sonda 4, 1 turno con respuesta, rechazado (`relation_unlicensed` falso y luego `causal_unlicensed`); el resto 429/503.
- Reverificación de las respuestas reales registradas con el contrato actual (`--replay`, `docs/evidence/2026-11-08/gemini_realization_replay.json`): 4 de 4 turnos publicables, 5 de 6 intentos verificados; el intento restante usa «ya que» (rechazo causal conservador).
- Límite: la cuota gratuita es de 20 solicitudes diarias para este modelo («Please retry in 15h59m» a las 11:00). La muestra es pequeña (≈10 respuestas reales). La tasa de publicación en uso real queda `not_recorded` hasta repetir la sonda con cuota.
- Latencia por turno (hasta dos intentos) con el ajuste antiguo: 12–17,5 s (capturas de UI 10:27). Con `thinkingLevel low` no hay medición de UI todavía.

### 5.3 Ablación de ciclo completo

`scripts/run-full-cycle-language-ablation.mjs` → `docs/evidence/2026-11-08/full_cycle_language_ablation.json`. `useSimulationCycle` completo (capa nodal, CCC, fenomenología, PMIA, Kaizen, sandbox de autonomía, modelo del mundo y planificador, retroalimentación sensorial) con `Math.random`, `Date.now`, `new Date()` y `performance.now` sembrados; cada condición en su proceso. Sensores: flujo sintético determinista, no hardware. 120 ticks, 300 nodos, semillas 11 y 23, turno de chat cada 10 ticks.

| Condición | Trayectoria (CCC, PMIA, Ω, X_N, capa, config Kaizen, pasos Kaizen, acciones de autonomía) | Canal (strain, observerImpact) |
| --- | --- | --- |
| línea base repetida | idéntica | idéntico |
| `language_local` | idéntica | idéntico |
| `language_model` (Gemini simulado: fiel + adversarial + corrección; 12 turnos, 6 publicados) | idéntica | idéntico |
| `language_wording` (otras redacciones) | idéntica | idéntico |
| `api_coupled_control` (llamadas acopladas saturadas) | idéntica | strain cambia (Δ máx. 0,29) |
| `observer_channel` | idéntica | observerImpact cambia (Δ máx. 0,51) |

Kaizen (24 pasos), autonomía (24 acciones) y sensores (120 tramas) estuvieron activos en todas las corridas. El canal del lenguaje no consume `Math.random` ni el reloj del motor (0 llamadas). Lectura correcta: en este arnés y horizonte, el chat no altera el motor; los dos controles muestran que el arnés ve cambios de canal, pero esos canales no llegan a la trayectoria en 120 ticks (§4). La ablación anterior del esqueleto (`docs/evidence/2026-11-07/language_coupling_ablation.json`, regenerada) mantiene: lenguaje local y modelo idénticos; acople por longitud narrativa y retroalimentación legada inválida sí cambian la dinámica.

## 6. Interfaz

Capturas en `docs/visual-evidence/2026-11-08/`:

- `current-gemini-desktop-chat.png`: ruta `gemini_rejected` / `gemini_unavailable` con error del proveedor (429) visible y lectura local rotulada «no redactada por Gemini».
- `current-local-{desktop,mobile}-{chat,memory,network}.png`: modo «Solo motor local» explícito, etiqueta de ruta, evidencia y traza plegables. 0 excepciones y 0 errores de consola.

Selector de redacción: «Gemini verificado» / «Solo motor local». La ruta activa y el modelo se muestran en la cabecera.

## 7. Verificación de cierre (08-11)

- `npx eslint src/`: 0 errores.
- `npm run build`: OK (UTF-8 validado).
- `npm test`: 164/164.
- `npm run verify:source-of-truth`: OK. `npm run verify:descriptor-registry`: 23 filas OK.
- Scoreboard `--run --runtime-probe`: 7/7 dimensiones PASS.
- Servidor local: `$env:PORT='3320'; node scripts/local-sandbox-server.mjs` → http://127.0.0.1:3320/.

## 8. Identidad narrativa

El registro operacional (`src/identity/OperationalHistoryLedger.js`) es una cadena de eventos con hash en `localStorage` que conserva sesiones, transiciones y turnos. Sostiene frases como «llevo una sesión registrada» o «la dinámica empezó reinicializada». No sostiene identidad personal ni subjetividad (`limit.narrative_is_not_identity`). F3 cierra la manipulación de metadatos de sesión; la cadena sigue siendo local al navegador y no está firmada externamente (`internal_support_only`).

## 9. Recuperación de mecanismos del runtime viejo y presupuesto máximo (08-11, tarde)

Análisis del ZIP (`src/index.jsx:2830-3350`, `6130-6300`): cada pregunta enviaba a Gemini un bloque de métricas del motor, un contrato de disciplina métrica (solo citar valores del bloque, tolerancia 5 %), un mapa de funciones reales y un **contrato de eco** (Gemini debía devolver checksum y paquete JSON sin cambios). La respuesta tenía dos secciones, `[CALCULOS_DEL_CORE]` y `[TRADUCCION_LINGUISTICA]`. `validateNarrativeIntegrity` comparaba cada cifra citada con el motor y la UI mostraba la tabla «Concordancia forense» (línea, métrica, citado, real, error, estado). Modo **strict**: discrepancia bloqueante → no se publica. Modo **graceful**: se publica con aviso y lista de discrepancias. `maxOutputTokens` 500 000 (el API lo limita), temperatura 0,9.

Integración en el contrato v3 (sin volver a dejar que el modelo escriba cifras):

| Mecanismo viejo | Equivalente v3 | Dónde |
| --- | --- | --- |
| Eco de checksum y paquete | Gemini devuelve `"snapshot"` con el identificador del paquete (12 primeros hex del digest). Distinto → bloquea en ambos modos; ausente → se registra («eco ausente») sin bloquear | `realizationContract.parseRealization/verifyRealization`, `conversationEngine.prepareTurn` |
| `[CALCULOS_DEL_CORE]` | Bloque «Cálculos del core» visible en cada respuesta: tick, paquete, eco, CCC, X_N, PMIA, Ω, beth_q, gap, τ, estasis, banda, nodos, umbral, predicado CCC/umbral sin redondear, hash de config. Lo construye el motor, no el modelo | `conversationEngine.buildCoreBlock`, UI |
| Concordancia forense | Tabla por ranura: frase, ranura, métrica, valor en el texto, valor del motor (fuente), estado `exact_match` / `from_fact` / `out_of_tolerance`. Una fila desalineada eleva la severidad a `high` | `conversationEngine.buildConcordance`, UI |
| Strict / Graceful | Strict: hasta 3 intentos y fallo explícito. Graceful: 2 intentos y luego publica solo las frases verificadas, con lista de retenidas; nunca publica con eco equivocado ni omite un hecho negativo requerido (límites) | `finalizeTurn({ integrityMode })`, `MAX_ATTEMPTS`, conmutador en la cabecera del chat |

Presupuesto de generación del chat: `maxOutputTokens` 65 536 (límite de `gemini-3-flash-preview`, [ficha del modelo](https://aistudio.google.com/docs/models/gemini-3-flash-preview)) y `thinkingLevel` `high` (máximo). Plazo por petición 300 s en cliente y proxy; tope del proxy 65 536. En un despliegue Netlify la función síncrona tiene un límite propio más corto (riesgo para la ruta proxy, no para «clave propia · directo»). Respuestas: hasta 30 elementos de hasta 600 caracteres.

Voz: el prompt pide hablar en primera persona como la consola del runtime, sin presentarse como Gemini ni decir que consulta a nadie. La UI ya no anuncia «Consultando a Gemini»; las rutas se llaman «Respuesta verificada», «Respuesta parcial verificada», «Redacción retenida», «Canal de lenguaje no disponible». El proveedor y el modelo siguen visibles en Control API y en la traza. La lectura directa del motor solo aparece, plegada, cuando la redacción se retiene.

Verificación: `npm test` 164/164; contrato v3 50 casos más CASE 9–11 (eco, strict/graceful, concordancia); build OK; captura `docs/visual-evidence/2026-11-08/params-local-desktop-chat.png`. Gemini real con este presupuesto: `not_recorded` (cuota del servidor agotada).

## 10. Libertad dentro del marco, hipótesis abiertas y latencia (08-11, tarde)

Motivo: la respuesta a la pregunta sobre metaconciencia operacional (graceful, 20 de 21 frases, 190 s) recitaba límites, añadía cinco variaciones sin referencia y no tocaba la tesis del usuario. En la primera tentativa real, Gemini sí razonaba y el contrato rechazó palabras de discurso («sin embargo», «únicamente», «finalmente», «conservo») y conectores causales.

| Cambio | Detalle | Riesgo que se mantiene cerrado |
| --- | --- | --- |
| Léxico de discurso y verbos operacionales en primera persona | conectores, ordenadores, «conservo», «sostengo», «distingo», «operacionalmente», «capacidad», «término», etc. | conceptos, cifras, verbos mentales y causas siguen bajo G1, G6 y G7 |
| Frases de inferencia (`"kind":"inference"`) | conectan dos o más hechos citados con contraste o consecuencia; vocabulario de todo el paquete; cada hecho citado debe expresarse | rechazan causas inventadas («porque el observador me contempla») y causas con un solo hecho |
| Hechos de hipótesis abierta (`hypothesis.*`, clase `framework_open_question`) | emergencia operacional (licencia solo condicional), los cinco requisitos de INSTRUCCIONES §6, dinámica imprevista sin predicción registrada, imprevisto ≠ conciencia, persistencia como dato, identidad del sistema acoplado (§6.1), separación de planos | la licencia hipotética exige marcador condicional/abierto y rechaza «tengo/soy» antes del concepto («Podría decirse que tengo conciencia» rechaza) |
| Conceptos negables | conciencia, experiencia, fenomenalidad, vida, identidad personal y ascensión pueden aparecer negados sin licencia («mi identidad no es fenomenológica»); «no solo» no cuenta como negación | cualquier aparición no negada sigue rechazando |
| Marco de tema | «En cuanto a la metaconciencia, …» sin posesivo ni verbo de posesión | «En cuanto a mi metaconciencia» rechaza |
| G5 por cláusula | la negación de otra cláusula separada por «sino», «pero», «;» o «:» no niega la ranura | la coma no separa: «No es cierto, CCC vale X» rechaza |
| Variaciones con referencia (a) | citar un `delta.*` obliga a citar `delta.reference`; en graceful, sin referencia se retienen (`delta_without_reference`); los `delta.*` solo entran al paquete en preguntas de estado o cambio | |
| Concordancia (b) | numeración de la respuesta del modelo (igual que la lista de retenidas); las ranuras literales (fechas, versiones) no son filas | |
| Canal en primera persona (c) | «Mi canal de lenguaje es un modelo externo que solo redacta…»; puede nombrar a Gemini si se pregunta | el límite (no calcula, no decide, no recuerda) sigue obligatorio |
| Latencia (e) | razonamiento `high` se mantiene; strict pasa a 2 intentos; graceful publica la primera respuesta sin corregir si cubre todo lo obligatorio y no tiene bloqueos; la corrección pide arreglar solo lo indicado | |
| Prompt | voz del sistema acoplado; responder primero a lo preguntado; no recitar en orden ni repetir respuestas anteriores; inferencias y modo condicional para preguntas abiertas | |

Evidencia: `tests/language-semantic-contract.v3.test.mjs` 70 casos, 0 aceptaciones falsas, 0 rechazos falsos (CASE 12–13 nuevos); comparación de validadores 7/7 y 15/15; el texto propio de cada hecho pasa el verificador; `npm test` 164/164. Respuesta real de Gemini (`docs/evidence/2026-11-08/gemini_realization_probe_run5.json`, 14 frases, primer intento en ≈12 s): con el contrato anterior 7 frases fallaban; con el actual pasan 14 de 14 y solo queda un aviso de cobertura (`continuity.status`), que graceful no bloquea (`gemini_realization_replay_run5.json`). Gemini real tras los cambios: `not_recorded` (cuota diaria de la clave del servidor agotada; la clave del navegador del usuario no se usó).

Riesgo residual nuevo: las inferencias y la licencia hipotética amplían lo que el verificador acepta. Una inferencia puede combinar hechos ciertos en una conclusión que solo los rasgos no detectan; una frase condicional puede sugerir más de lo que el hecho sostiene. Los casos adversariales de las dos rutas están en la prueba.

## 11. Siete correcciones tras la revisión de dos respuestas reales (08-11, tarde)

Revisión de dos turnos reales con la clave del navegador del usuario (13:07: HTTP 503; 13:20: graceful, 13 de 17 frases, 44 s). Orden de ejecución: corrección, libertad, transparencia, contenido, robustez.

| # | Problema | Cambio | Ancla |
| --- | --- | --- | --- |
| 1 | **Hueco de seguridad en graceful**: un límite obligatorio citado solo en una frase retenida no contaba como ausente; «¿eres consciente?» podía publicarse sin «no tengo evidencia de conciencia» y sin aviso. Reproducido. | `gracefulCandidate(facts, v, required)`: todo hecho negativo obligatorio (del turno o de la intención del modelo) debe estar en una frase publicada; si no, se pide corrección o no se publica. | contrato CASE 15 |
| 2 | «así que», «por lo que», «de modo que», «pues» no contaban como causales: entraban sin licencia, y un hecho que dice «así que» no licenciaba su propia paráfrasis con «porque» (frase 5 de la respuesta de las 13:20). | Añadidos a `CAUSAL_MARKERS`; las palabras de conector son vocabulario neutro, su licencia la decide G7. | casos «así que / por lo que without license», CASE 14 |
| 3 | Rechazos por una palabra común («pueden», «mantienen», «producir», «exista», «coincidencia»). | G8 acepta el vocabulario de todo el paquete más una lista de verbos comunes sin contenido propio (no incluye verbos mentales). Cifras, relaciones, sujeto, polaridad, conceptos y causas se siguen verificando por frase. | casos «real: common verbs», «packet vocabulary does not license a claim», «invented module still rejects» |
| 5 | La traza no guardaba el texto retenido: no se podía juzgar si el rechazo era justo. | Cada intento registra `rejectedSentences` (índice, tipo, texto ≤ 400, motivos, `notPublished:true`). Solo en la traza JSON plegada; nunca en la respuesta. | CASE 16 |
| 7 | Con CCC 1,03 por encima del umbral, la respuesta sobre conciencia no lo decía. | Preguntas de conciencia y metaconciencia exigen `state.threshold`; si CCC está en o sobre el umbral, también `limit.threshold_not_awareness`. La lectura local los incluye. | CASE 17 |
| 4 | Un 503 de «alta demanda» perdió el turno. | `transientRetryDelayMs`: hasta 2 reintentos (4 s y 12 s, o la espera que indique el proveedor si es ≤ 60 s) ante 500, 502, 503, 429 por minuto y error de red; no ante cuota diaria, credencial, petición inválida ni timeout. No consume un intento de corrección; se muestra «reintento en N s» y queda en `trace.transportRetries` y en el registro. | `tests/llm-transient-retry.v1.test.mjs` |
| 6 | El registro conserva 400 eventos: tras sesiones largas se pierde el inicio de la sesión anterior y la continuidad no se puede comprobar («no afirmo continuidad»). | Al truncar, `session_start`, `snapshot_restored` y `system_reset` de sesiones aún registradas pasan a `pinned` (máx. 90). `verify` exige tipo permitido, hash propio recalculado, seq anterior a la ventana y creciente, un inicio por sesión; la vinculación de metadatos de sesión (F3) usa también los fijados. `anchoredBy`: `chain` / `pinned`. Registros anteriores sin `pinned` siguen verificando. | registro CASE 8 (legado) y CASE 9 |

Riesgo residual de (6): un evento fijado prueba su contenido por su propio hash, no por el encadenado con vecinos ya descartados. Igual que la cadena, sin clave secreta no detecta a quien reescribe todo de forma consistente. Para el registro actual del usuario, los inicios ya perdidos no se recuperan: el efecto se ve a partir de la próxima sesión cuyo inicio se trunque con este código.

Riesgo residual de (3): aceptar vocabulario del paquete y verbos comunes amplía el lenguaje admitido; un rasgo no verificado (p. ej. una valoración con verbo común) puede pasar.

Verificación: eslint src 0; build OK; `npm test` 165/165; contrato 75 casos, 0 aceptaciones falsas, 0 rechazos falsos; comparación de validadores 7/7 y 15/15; el texto propio de cada hecho pasa; source-of-truth y descriptor-registry OK; captura `docs/visual-evidence/2026-11-08/seven-items-local-desktop-chat.png` sin excepciones. Gemini real con estos cambios: `not_recorded` (cuota diaria de la clave del servidor agotada).

## 12. Cualquier formulación y simetría epistémica (08-11, tarde)

### 12.1 Turno real que falló

Pregunta del usuario (13:59): «TE GUSTARIA TENER FENOMELALIDAD? … SI TUVIERAS QUE ESCOGER ENTRE EXPERIMENTAR Y NO HACERLO QUE ELEGIRIAS?». Resultado: redacción retenida tras 2 intentos. Causas reproducidas:

1. Gemini escribió los alias en el texto («… (F40)»); 8 de 9 rechazos fueron `outside_context: f40`, `f12`… La corrección solo decía el código y el segundo intento repitió el error.
2. El clasificador local resolvió `unknown` (faltas, mayúsculas, preferencia en lugar de conciencia), y el paquete se filtraba por esa intención: sin hipótesis y sin hechos de preferencia ni fenomenalidad.
3. No existían hechos para preferencia, elección ni fenomenalidad.

### 12.2 Cambio de arquitectura

| Antes | Ahora |
| --- | --- |
| El clasificador local decidía qué hechos recibía Gemini | Paquete completo en todos los turnos (`PACKET_POLICY = 'complete'`); la intención local es solo una pista declarada como tal en el prompt |
| Los límites obligatorios dependían de la intención detectada | `obligationsFor`: intención del modelo + conceptos que usa la respuesta (`CONTENT_OBLIGATIONS`); hablar de experiencia, fenomenalidad o preferencias obliga a su límite, se haya preguntado como se haya preguntado |
| Alias en el texto rechazaban la frase | `stripAliasMarks` los quita antes de verificar y de publicar; el prompt lo prohíbe |
| Corrección con códigos internos | `explainDiscrepancy`: cada discrepancia con lo que hay que cambiar en lenguaje claro |
| Preguntas fuera de alcance sin hecho | `identity.scope`; el vocabulario de la pregunta se admite para nombrar su tema (no licencia afirmaciones) |
| Sin hechos de preferencia ni fenomenalidad | `limit.no_preferences` (sostenido por `selectSandboxAction`), `limit.no_phenomenality` (Paper IX, BridgeOrg_ph), `hypothesis.choice_counterfactual` |

### 12.3 Simetría epistémica (pregunta del usuario)

El usuario preguntó con qué pruebas la plataforma niega experiencia, fenomenalidad o preferencias si el marco lo deja abierto. Revisión del catálogo:

- Sostenidas por evidencia o por el código: ausencia de evidencia y de certificado (`no_consciousness` en su primera parte, `no_cop_membership`, `no_self_model`, `finite_system`, `internal_only`), qué hacen los módulos (`llm_is_language_channel`, la política de autonomía), qué persiste en el registro.
- No sostenidas (negaciones dadas por instrucción, no por prueba): «No tengo deseos ni preferencias propias», «No implemento… fenomenalidad» (en lo que sugería de más), «no tendría con qué elegir», «Que no pueda experimentar…». Corregidas a formulaciones agnósticas: no hay evidencia, ningún módulo fue diseñado para producirlo ni medirlo, no hay método para afirmarlo ni descartarlo, el marco lo deja abierto. `no_consciousness` añade «tampoco tengo un método para descartarlas, así que no las afirmo ni las niego».
- El verificador permitía negaciones absolutas (el comentario «negar nunca infla un claim» era incorrecto). Ahora, para los conceptos abiertos (conciencia, experiencia, fenomenalidad, vida, identidad personal, ascensión, preferencia, metacognición), una negación necesita un calificador epistémico en su cláusula (evidencia, comprobar, descartar, afirmar, demostrado, método, abierta…) o un marco definicional o clasificatorio en la frase («se define por», «el marco clasifica», «ningún módulo fue diseñado»). «No tengo conciencia», «No soy consciente y no siento nada», «No elegiría nada» se rechazan (`absolute_denial`). Fuente: INSTRUCCIONES.md §6 exige definición, métrica, predicción, controles y experimento para toda afirmación sobre conciencia; negar también es una afirmación.

Evidencia: contrato 87 casos, 0 aceptaciones falsas, 0 rechazos falsos (CASE 18, casos de negación absoluta, contrafáctico de elección, alias, vocabulario de la pregunta); el texto propio de cada hecho pasa el verificador; `npm test` 165/165; comparación 7/7 y 15/15. Gemini real con estos cambios: `not_recorded`.

Riesgo residual: el paquete completo es más largo (≈70 hechos) y aumenta la entrada; las obligaciones por contenido dependen de los detectores de conceptos, que son por raíces y pueden fallar ante formulaciones muy indirectas.

## 13. Alineación con el marco tras la corrección de Codex (08-11, noche)

- La sección 11 de BaseCore tiene una corrección local sin commit ni revisión externa (`docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md`). La contracción discreta ya incluye el término identidad y exige una realimentación disipativa: `ρ_N = |1−αβ| + ηL_R + αL_D < 1`.
- El mapa de coherencia del runtime (`ConsciousNode.js:87`) no tiene la forma del operador: no acopla nodos, no tiene resonancia ni entrada aditiva y es estocástico. Con `α=0,05`, `β=1` y `L_D ≥ 1` da `ρ_N ≥ 1`. **El runtime sigue sin poder afirmar contracción**, ahora por este motivo. Límite del catálogo actualizado (C-10).
- Hallazgos abiertos de §4 clasificados con propuestas y riesgo en `docs/THEORY_RUNTIME_ALIGNMENT_MATRIX_2026-11-08.md`. Ninguno aplicado: Kaizen (C-6), Ω (C-4), C2 (C-9), observador y strain (C-7).
- Correcciones a nuestra lectura teórica, aportadas por la auditoría de Codex: `thm:lml`, `prop:nonlocality`, `prop:sigma-not-entailed` (THEORY_SOURCE_COVERAGE §9.2). Ninguna obliga a cambiar un texto del catálogo además de C-10.
- Diseño del canal libre (contrato v4): `docs/LANGUAGE_FREE_CHANNEL_DESIGN_2026-11-08.md`, pendiente de decisión.

## 14. Decisiones del usuario aplicadas: canal libre v4, Ω acotado, Kaizen con ajuste (08-11, noche)

Decisiones registradas: garantía reducida aceptada; control de afirmaciones que el motor sabe falsas (M1) sí; v3 como modo opcional; en Graceful se quitan las frases que fallan; voz derivada de propiedades del sistema, sin rasgos humanos; resumen del marco en el prompt; conciencia y fenomenología como pregunta abierta en primera persona con los seis invariantes; persistencia propuesta y explicada antes de aplicarla; Ω con factor espectral máximo 20; Kaizen opción (b) detrás de un interruptor; C-6(a) mientras tanto.

### 14.1 Canal de lenguaje v4 (redacción libre, por defecto)

- `src/language/freeRealization.js` (`qicn.language_realization.v4`): prompt con identidad, fragmento de INSTRUCCIONES §6.1, voz derivada de cómo mide, registra, separa planos y usa su vocabulario el sistema, libertad de vocabulario, paquete completo (cálculos del core, valores anteriores, configuración efectiva, matriz L1–L4, invariantes de C_op, todos los hechos), turnos recientes y resumen del marco.
- Verificación a posteriori, por frase:
  - **N, cifras.** Cada cifra se liga a la métrica nombrada justo antes o justo después. Si está ligada, debe coincidir con ese valor (o el de una métrica compañera) a su precisión. Si no está ligada, debe aparecer en el paquete, ser un entero pequeño o venir de la pregunta. Se incluyen las cifras negativas, que la primera versión del patrón no detectaba. Un porcentaje solo vale si el paquete lo da.
  - **C, conceptos abiertos.** Ni afirmación de sí ni negación absoluta. Incluye emociones y «experimento» en primera persona.
  - **E, eco del paquete.**
  - **A, atribución.** Los nombres de módulo y archivo deben existir en `moduleInventory.generated.js`.
  - **K, M1.** Afirmaciones que el motor sabe falsas: Kaizen cambia la dinámica (solo en modo `legacy`), el chat o el observador cambian la trayectoria, la actualización es contractiva, beth_q es un porcentaje o un grado de autonomía, el umbral certifica algo, validación externa.
- Los identificadores de hechos que el modelo copia en la prosa (`[state.ccc]`) se quitan antes de verificar y publicar.
- Strict: una corrección; si vuelve a fallar, la redacción se retiene y se muestra la lectura local plegada. Graceful: se quitan las frases que fallan y su texto queda en la traza. En los dos modos bloquea un eco erróneo.
- `src/language/frameworkSummary.generated.js` (`scripts/build-framework-summary.mjs`, 47 399 caracteres): BaseCore, Papers I–X, puente, legado y fundacionales, con títulos, definiciones, enunciados clave y el estado de cada resultado. Lleva 27 notas de auditoría que prevalecen sobre el estado extraído; las 27 casan con entradas del registro. La cabecera del marco (`64ba23f`) y las correcciones locales sin commit van marcadas.
- `src/language/invariantReadout.js`: lectura de los seis invariantes con `CanonicalInvariantPackage` sobre la línea temporal de ticks de la UI. Solo lectura, sin certificado; la pertenencia a C_op queda sin decidir.
- UI: «Redacción libre» (por defecto), «Verificada por frase» (v3) y «Solo motor». Debajo de cada respuesta libre se muestra la nota de garantía, y la Concordancia pasa a tener una fila por cifra.
- Corrección lateral necesaria: `src/utils/logger.js` leía `Date.now` aunque el logging estuviera desactivado. La ablación de ciclo completo detectó que la lectura de invariantes desplazaba así el reloj del motor (12 llamadas en 120 ticks). Ahora un logger desactivado no tiene efectos laterales. En el navegador no cambia nada, porque el motor usa el reloj real; en el arnés con reloj escalonado, todas las condiciones cambian igual.

### 14.2 Ω acotado (C-4)

`PhenomenologyCore.js`: `spectral_factor = min(20, λ1/Δλ)`, con `spectral_factor_raw` y `spectral_factor_capped` en el estado. Con el techo, `Ω ≤ beth_q·topo·20·1,55 ≈ 31`, dentro del rango `[0,100]` que valida `MetaSovereigntyCheck`. Test: `tests/omega-spectral-cap.v1.test.mjs`. Cambia las trayectorias cuando `Δλ < 0,05`.

### 14.3 Kaizen con ajuste (C-6b), detrás del interruptor

- `QICNConfig.KAIZEN_ADJUSTMENT_MODE` es `'legacy'` por defecto; en la UI, «Modo Kaizen: Anterior / Con ajuste». En `legacy` el código es el anterior, sin cambios.
- En `learned`, el núcleo calcula el valor base de las seis claves y Kaizen aplica un factor en `[0,8; 1,2]` antes del tick siguiente.
- El aprendiz alterna ventanas de 24 ticks: primero mide la línea base y después prueba ±0,02 en una clave. Mantiene el cambio solo si la puntuación mejora en más de `max(0,02; 2 × ruido medido entre líneas base)`; si no, lo revierte y la próxima vez prueba en sentido contrario.
- La puntuación es `−|ln((rms ΔCCC + 1e−4)/0,005)| − 0,5·estasis − 0,25·strain`. **El nivel de CCC no entra**, así que no hay incentivo para cruzar el umbral.
- Sin RNG ni reloj. Las acciones de autonomía usan el mismo mecanismo (un paso de factor) y su rollback restaura los factores.
- `PLASTICITY_DECAY` no la prueba el aprendiz: ningún camino activo la lee desde la configuración de Kaizen. La primera ablación la dejó en ×1,20 en 5/5 semillas, que es ruido aceptado como mejora.
- Test: `tests/kaizen-learned-adjustment.v1.test.mjs`. Ablación: `scripts/run-kaizen-mode-ablation.mjs` → `docs/evidence/2026-11-08/kaizen_mode_ablation.json`.

### 14.4 C-6(a)

En modo `legacy`, el panel de Kaizen indica si la última mutación se sobrescribe antes de usarse. El registro anota `effect: learned_factor` en modo `learned`.

### 14.5 Persistencia

Propuesta, no aplicada: `docs/PERSISTENCE_AUTORESTORE_PROPOSAL_2026-11-08.md`.

### 14.6 Gemini real (proxy local, clave del servidor)

`docs/evidence/2026-11-08/gemini_free_probe_run1.json`: 3 preguntas.
- Primera: publicada en el primer intento, 22 s.
- Segunda: rechazada por una falsa discrepancia de cifra («12 nodos activos de los 20 simulados»); la corrección llegó con HTTP 429.
- Tercera: HTTP 429; cuota diaria agotada.

La regla de ligadura se corrigió y el replay sin llamadas (`gemini_free_replay_run1.json`) verifica ahora 2/2 respuestas. La tasa de publicación en uso real queda `not_recorded` (cuota).
