# Auditoría y estabilización del runtime — 2026-11-05

# Actualización posterior de alcance

Este documento conserva la primera auditoría de estabilización. Una auditoría posterior sí modificó los contratos derivados de invariantes y proyecciones: consultar [la comparación Framework–Runtime](FRAMEWORK_RUNTIME_COMPARISON_2026-11-05.md) y [la auditoría de lenguaje](RUNTIME_LANGUAGE_BOUNDARY_AUDIT_2026-11-05.md). Las cifras, estados y afirmaciones de alcance anteriores deben leerse como históricas; no describen automáticamente la versión actual del árbol.

## Alcance y conclusión

Auditoría de ingeniería de la copia local y de `Darkar520/QICN-SYSTEM`, seguida de correcciones locales verificables. El alcance es el runtime actual, su transporte LLM, memoria conversacional, servidor local, autenticación y límites de autoparcheo. No es validación externa, certificación de conciencia, cierre de claims ni una integración de Nemotron/Android.

La rama de trabajo es `codex/runtime-stabilization-audit`. No se ha creado un commit, enviado cambios, abierto un PR ni modificado el commit de `main`.

## Procedencia y sincronización

- Base local y `origin/main`, tras `git fetch origin`: `44b67a12ba03517946822f7b4dee9f5ce33bc3c7` (2026-09-07).
- Divergencia inicial: 0 commits locales y 0 remotos. La auditoría anterior del chat examinó esa misma base.
- El árbol local sí contenía modificaciones previas: `.github/workflows/ci.yml`, `.github/workflows/verify.yml`, `IMPLEMENTATION_LOG.md`. Se conservan y no se atribuyen a esta auditoría. Corrigen, entre otras cosas, la indentación inválida del workflow remoto.
- `gitlab` es un segundo remoto configurado. No se lo trata como autoridad de GitHub ni se ha sincronizado o publicado allí.
- La rama histórica `codex-triada-qicn-roadmap-v2` tiene un commit local por delante de su homóloga en GitHub (`1/0`); no es la rama activa ni se ha integrado. Las demás ramas históricas no se promueven automáticamente sobre `main`.
- El sistema tenía Node 24.6.0, aunque `engines` declara Node 22.x. Se obtuvo Node 22.23.4 mediante `npm exec --package=node@22` para la verificación final; no se cambió la instalación global.

## Lectura del chat y límites de acceso

Fuente autorizada: chat «Comparar modelos IA móviles», mediante el enlace compartido aportado en la conversación y el lector de historial.

El lector del historial devolvió cinco intercambios y ningún cursor adicional. El enlace compartido terminó de cargar después y expuso aproximadamente 66 mil caracteres de texto y navegación para 59 mensajes de usuario. Se leyó todo ese texto, además de los cinco intercambios del lector. Muchos adjuntos aparecen solo como «Se cargó una imagen/archivo»; su contenido no fue recuperado. Tampoco se presume que las respuestas no expuestas por estas superficies hayan sido revisadas. Por tanto, la cobertura es todo el texto accesible, no una inspección íntegra de todos los adjuntos originales.

El texto cubre pruebas móviles de Bayes y de subarreglos únicos, cambios de modelos/parámetros, respuestas sobre QICN, creación de un personaje, recuperación documental y una propuesta de conectar el runtime a un modelo local. El monolito teórico adjunto al chat no constituye una fuente formal consultada en esta auditoría.

### Evaluación crítica del razonamiento del chat

1. Las pruebas cambiaron modelo, temperatura, contexto y configuración. Las puntuaciones exploratorias 64/35/74 no son una serie comparable ni evidencia estadística de mejora.
2. En el ejercicio hipotético con prevalencia 0.02, sensibilidad 0.95 y falsos positivos 0.10, los resultados se comprueban por sustitución: `0.019/0.117 = 0.162393...` y, con independencia condicional, `0.01805/0.02785 = 0.648114...`. Respuestas con otros resultados deben contrastarse con esos parámetros, sin atribuir los fallos a falta de documentación QICN.
3. Para `[4,2,4,5,2,6,7,5,8,9]`, la ventana máxima única tiene índices inclusivos 4..9 y valores `[2,6,7,5,8,9]`. Las respuestas que omiten elementos intermedios no describen un subarreglo contiguo. Un ejemplo compartido también utiliza `end` sin definir. Texto extenso y pruebas impresas no acreditan ejecución correcta.
4. La falta de definiciones puede explicar errores de conocimiento especializado; no justifica contradicciones proposicionales o aritmética incorrecta. Con `P=true, C=false, R=false`, `C ⇔ R` es verdadera y `P ⇒ R` falsa. Que un sistema escriba símbolos no demuestra que compruebe sus inferencias.
5. Una estructura matemática infinita no implica por sí sola una necesidad física de energía infinita. Esa inferencia queda no formalizada y no demostrada por los materiales consultados; requeriría un modelo físico y una cota de recursos independiente.
6. «Más inteligente», «identidad», «agencia», «conciencia», «recipiente/contenido» y los nombres históricos de módulos son lenguaje interpretativo o metafórico hasta fijar operaciones, predicciones y experimentos. No se los utiliza como resultados.
7. La revisión estática anterior identificó defectos reales de autenticación y presupuesto. Sobre memoria requería una precisión: existía el atajo de respuesta, pero el llamador omitía el contexto numérico y la capa; la ejecución del atajo no estaba establecida por esa revisión.

## Hallazgos y correcciones

| Área | Problema reproducido/observado | Corrección y límite |
| --- | --- | --- |
| Autenticación | JWT sin firma verificable aceptado en proxy, introspección y helpers de selfpatch | Un único `lib/auth-user.js` confía exclusivamente en `clientContext.user` aportado por la plataforma, con identificador y expiración si está presente. Tokens del cliente por sí solos se rechazan. |
| Servidor local | Se servía la raíz del repositorio, incluyendo archivos privados potenciales | `npm start` y `start:local` usan el servidor local; solo publica `dist`, limita escucha a 127.0.0.1, bloquea dotfiles/traversal, comprueba contención real y rechaza Host/Origin externos. Se elimina `serve`, ya innecesario. |
| Transporte LLM | Timeout cancelado al recibir cabeceras, antes de consumir el cuerpo; lógica embebida en el componente | Transporte extraído a `src/utils/llmTransport.js`; la fecha límite cubre el cuerpo, las credenciales se limitan al destino permitido y los registros no incluyen la query de claves. Sigue siendo transporte Gemini. |
| Proxy LLM | Salida solicitada de 500000 tokens, incluso por `rawPayload`; contenido vacío tratado como éxito | Presupuesto de ingeniería de 8192 tokens, validación de mensajes/payload, deadline total upstream de 55 s, errores 502/504 y rechazo de contenido vacío. El presupuesto no es una capacidad del modelo. |
| Modelo | Modo estricto del cliente ignoraba `GEMINI_MODEL_ID` | Se respeta la configuración de modelo del servidor; se conserva el modelo predeterminado existente, sin afirmar disponibilidad real del proveedor. |
| Procedencia de respuestas | El cliente perdía el modelo real y el fallback devueltos por el proxy | El transporte conserva `qicnInference`; el registro de integridad del chat incorpora procedencia y `memoryReplay:false`. Son diagnósticos operacionales, no evidencia primaria de experimentos. |
| Memoria | Contexto incompleto, comparación de fricción numérica con `STABLE`, caché que saltaba la reevaluación | Se rechaza contexto inválido, se reconoce fricción 0 y se reevalúa cada consulta; las actualizaciones invalidan la caché. El chat genera y valida una respuesta nueva por snapshot. Se conserva memoria histórica, sin certificar verdad de su contenido. |
| Lenguaje | Ejemplo «92% de autonomía causal» para proxy no calibrado, expansión ilimitada e interfaz con atribuciones fuertes | Se eliminan ese porcentaje y los valores numéricos ficticios del ejemplo; instrucciones acotadas a observaciones, cabecera/título/acción operacionales y etiqueta heurística. Los nombres históricos internos siguen existiendo. |
| Selfpatch | Cliente podía proporcionar estados OFF, el modo unrestricted ignoraba el quorum y se admitían rutas fuera del proyecto | Estados leídos del servidor, ON/UNKNOWN bloquean siempre, validación de rutas y contención real de destinos locales. No se cambian las exenciones generales de riesgo/presupuesto del modo unrestricted. |
| Verificación | Descubrimiento solo de `.test.js` omitía una prueba `.test.cjs` | Se descubren `.test.js/.test.cjs/.test.mjs`, con timeout por hijo. La prueba omitida usa fixtures temporales para exportación en lugar de un `latest_batch_pointer.json` local ausente; conserva controles positivos y negativos. |
| Dependencias | Instalación inicial: 21 avisos (11 altos) | Actualización compatible del lockfile y eliminación del servidor sobrante. Quedan avisos moderados de herramientas de desarrollo; no se aplicaron degradaciones mayores automáticas. |

### Compatibilidad de autenticación

Con `AUTH_REQUIRED=true`, el servidor mínimo local no fabrica un contexto de Identity: un JWT pegado manualmente no autentica. Para autenticación real hay que usar la plataforma o una ruta local de verificación de Identity configurada y probada. `AUTH_REQUIRED=false` es un modo explícito para desarrollo local; el servidor sigue limitado a loopback. La sesión de Netlify desplegada no fue probada en esta auditoría.

Referencia de la frontera de plataforma: [Netlify Lambda compatibility](https://docs.netlify.com/build/functions/lambda-compatibility/). El cliente HTTP no es autoridad para construir el contexto de autenticación.

## Verificación

La línea base original pasó 146 archivos `.test.js` y el ensayo headless de cinco ticks. La primera batería ampliada encontró un contrato textual obsoleto y la dependencia ausente de la prueba `.cjs`; ambos se corrigieron de forma explícita. Tras las primeras correcciones pasaron 153 módulos y el ensayo headless. El cierre incorpora además el control de selfpatch y la frontera HTTP del servidor local.

- `verify:source-of-truth` y `verify:descriptor-registry`: PASS; 23 filas del registro comprobadas.
- `lint`: 0 errores y 0 advertencias en `src/`.
- Instalación desde el lockfile actualizado: 263 paquetes con `npm ci --no-audit` ejecutado por Node 22.23.4; auditoría de dependencias separada.
- `npm test`: 154/154 módulos y ensayo headless adicional de cinco ticks, incluido en la ejecución del scoreboard. Se simuló `CI=true` con `QICN_KILLSWITCH=OFF`.
- `test:coverage` tras instalación limpia, con Node 22.23.4: 154/154 y headless PASS; líneas 79.89%, ramas 65.04%, funciones 84.55%. Estas cifras describen cobertura del código ejecutado por las pruebas, no cobertura de hipótesis científicas.
- Compilación de producción y control UTF-8: PASS. Scoreboard: 3/3 comandos y 7/7 dimensiones internas, `overallPass:true`. Sus números describen pruebas y estímulos sintéticos; no son tasas de éxito científico.
- `verify:operational-readiness` y `smoke:operational`: PASS interno. `verify:repro-bridge`: se omitió el cotejo externo por falta del directorio del framework.
- Navegador local: carga de la interfaz y canvas, arranque de simulación, telemetría observada en el tick 56 y contador estable en 58 después de pausar. HTTP: bundle y health 200; archivos privados y acceso cross-origin al proxy 403; `package.json` 404.
- Dependencias: 7 avisos moderados en herramientas de desarrollo; `npm audit --omit=dev` informó 0. Resultado de la auditoría de dependencias en la fecha de ejecución, no certificación de seguridad.
- Se comprobó por análisis YAML: el `verify.yml` publicado en `origin/main` es inválido y la corrección local previa sí es válida. No se afirma estado verde en el remoto para esta rama sin publicar.
- Los informes generados al verificar y los archivos de preregistro versionados se mantienen separados; no se promueve una regeneración local a una nueva congelación científica.

Anclas nuevas: `server-auth-boundary.test.js`, `memory-context-boundary.test.js`, `local-static-boundary.test.js`, `llm-request-boundary.test.js`, `llm-transport-lifecycle.test.js`, `configured-model-boundary.test.js`, `selfpatch-trust-boundary.test.js`.

Las pruebas de proveedores utilizan dobles sintéticos. No se envían solicitudes pagadas a Gemini/OpenAI, no se aplican parches reales y no se escriben cambios en GitHub. El smoke operacional y el scoreboard son soporte interno, no campañas externas.

## Inventario y límites

| Capa | Clasificación | Estado de evidencia |
| --- | --- | --- |
| Correcciones unitarias y contratos locales | `implemented_tested` | Reproducciones locales y regresiones; no aceptación de despliegue |
| Simulación y validación de telemetría | `implemented_internal_support` | Controles internos; no verificador general de razonamiento |
| Acoplamiento actual a Gemini | `partial_runtime_path` | Transporte aislado; todavía sin adaptador local/OpenAI compatible |
| `js/api/` y `services/` | `compatibility_only` | Se conservan; no sustituyen la autoridad de `src/` |
| Selfpatch | `high_risk_control_surface` | La política por defecto sigue en `sandbox_unrestricted`, con clasificación/budgets permisivos; falta una política de despliegue aprobada y aceptación externa |
| Entropía externa y modelos sensoriales | `external_dependency` | Configuración y contratos no demuestran procedencia física ni disponibilidad; assets no vendorizados |
| Canon/repro externos | `external_dependency` | La ruta externa de repro no existe en esta máquina; el verificador reporta skip, no validación externa |
| Inferencia real, login desplegado, Android/GGUF | `not_recorded` | No se ensayaron en esta auditoría |

No se modificaron señales directas, reglas de mapping o contratos primarios en los siete módulos de evidencia enumerados en `AGENTS.md`. Se revisa el inventario y el mapa de arquitectura; los registros de descriptores y las reglas de admisibilidad conservan su semántica. No se regeneran paquetes científicos congelados ni se promueven resultados de este trabajo a `PAPER_ADMISSIBLE`.

## Separación conceptual

| Plano | Qué queda establecido aquí |
| --- | --- |
| Ontología | No se decide si el sistema tiene conciencia, agencia o identidad. |
| Modelo matemático | La proyección a horizonte finito, los observables y las comparaciones se pueden especificar y someter a controles; su correspondencia con el canon exacto requiere un argumento independiente. |
| Implementación | Simulación, memoria heurística y comprobación de ciertos valores de telemetría existen y se prueban dentro del runtime. |
| Lenguaje | Los nombres históricos y las respuestas de LLM son texto; se separan de los valores registrados y de la interpretación del modelo. |
| Interpretación | Un gate interno y una respuesta alineada con el snapshot sostienen solo la afirmación local que cada prueba especifica. |

Antes de cualquier exposición pública, probar en un entorno controlado una sesión Identity real, una solicitud real del proveedor con ID de modelo registrado y permisos específicos para operaciones de escritura de selfpatch. Su política general y su ruta de rollback requieren una revisión separada de autorización y despliegue.

## Hipótesis y siguiente frontera experimental

Hipótesis no demostrada: el sistema compuesto mejora la exactitud de tareas sobre el mismo modelo con presupuesto comparable. Para un conjunto congelado de tareas `i=1..n`, definir previamente `Y_i=1` solo cuando un verificador independiente acepta la respuesta. Estimar la diferencia pareada `Delta=(1/n) sum_i(Y_i(runtime)-Y_i(base))`, con intervalo de incertidumbre, errores, abstenciones, latencia y tokens. No se ha medido `Delta` aquí.

Diseño prioritario antes de atribuir una ganancia al runtime:

1. Congelar tareas, soluciones, modelo/versión, parámetros, presupuesto total y evaluación; aleatorizar orden y conservar ejecuciones fallidas.
2. Comparar modelo solo, prompt solo, prompt+estado real y runtime completo; igualar información y coste cuando se busque identificar el efecto del mecanismo.
3. Ablacionar memoria y validadores por separado. La memoria histórica no debe filtrar respuestas de las tareas de prueba.
4. Controles negativos: estado barajado, telemetría deliberadamente incoherente y preguntas sin relación con las variables de simulación.
5. Intervenciones: variar una señal predefinida, inyectar ruido de amplitud conocida y comprobar predicciones registradas de antemano. Si la mejora solo depende de una instrucción textual, no atribuirla a dinámica causal interna.
6. Replicar con semillas y ejecuciones independientes; comparar cobertura/abstención para evitar que bloquear más respuestas simule mayor exactitud.
7. Solo después, implementar y validar el adaptador de inferencia local y los permisos de archivos Android. Escanear GGUF no ejecuta un modelo por sí mismo.

La acción inmediata queda centrada en estabilidad y trazabilidad. El efecto cognitivo, las consecuencias ontológicas y cualquier claim de identidad o conciencia siguen sin decidirse con los datos actuales.

