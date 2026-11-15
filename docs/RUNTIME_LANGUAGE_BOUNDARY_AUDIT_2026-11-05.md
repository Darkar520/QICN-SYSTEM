# Auditoría de interfaz, lenguaje y comportamiento del runtime

Alcance: revisión y ensayos locales sobre el árbol de trabajo. No es una validación externa, una aceptación de todos los módulos ni una demostración ontológica. La expresión «encerrar el LLM» es una metáfora: aquí se concreta como un contrato de datos de salida cerrado para el chat.

## Hallazgos reproducidos

1. El validador anterior de narrativa acepta como `valid` una afirmación infundada de experiencia subjetiva si se añaden las secciones textuales exigidas. El test `runtime-language-boundary.test.js` conserva este control negativo. Un eco correcto del paquete comprueba correspondencia de bytes según su contrato, no verdad semántica.
2. El chat llamaba `processMetacognitiveFeedback(validation)` con la evaluación del texto del modelo. Ese método modifica confianza, penalización de plasticidad, tensión y presión internas, entre otros campos. La salida también se guardaba como conocimiento aprendido. Ambos caminos se han retirado de la transacción del chat.
3. QICN-B infería un supuesto valor humano desde palabras de un texto generado y ruido aleatorio, y lo inyectaba al núcleo. No había instrumento ni medición humana que justificasen esa interpretación. La ruta se ha desactivado; el parámetro aún visible se etiqueta como interno y no medido.
4. El informe introspectivo también guardaba texto generado como conocimiento. Los informes introspectivo, de banda y Kaizen usaban generación libre; ahora muestran lecturas o configuración locales sin generar inferencias o recomendaciones. Esto es una reducción deliberada de funcionalidad, no una prueba de que su comportamiento previo fuese científicamente válido.
5. La matriz de requisitos recortaba descripciones y causas a dos líneas. El canvas 3D capturaba la rueda: en una prueba local con el puntero sobre la red, el desplazamiento era 0 antes del cambio y 485 píxeles después. La matriz permite contenido completo y la rueda desplaza la página. El zoom de la red utiliza los botones; en WebGL también se deshabilitó el zoom por gesto de OrbitControls.
6. `getVerifiableReport()` llama a `sovereigntyRequirementMatrix.evaluate()` y se invoca al renderizar la matriz. La evaluación avanza su estado cuando cambia `sampleId`; por inspección, el avance depende de que se solicite el informe para esa muestra. No se ha cuantificado el efecto de renders omitidos ni se ha demostrado equivalencia con un avance por cada tick. Separar actualización por tick de lectura sin efectos laterales requiere un cambio de diseño y una prueba diferencial antes de modificar esta dinámica.
7. `QUANTUM_REQUIRED_QUALITY_MIN`, `QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS`, `QUANTUM_PROVIDER_RETRY_COUNT` y `QUANTUM_PROVIDER_RETRY_BACKOFF_MS` admiten cero en el registro, pero los parsers anteriores lo reemplazaban por el valor predeterminado. Se preserva cero y se ensaya su propagación al puente; el control demuestra un cambio de aceptación de muestra y número de intentos con proveedor simulado, no una operación física de entropía.
8. El paquete v6 atribuía a una ejecución vacía resultados sintéticos de persistencia, no factorización y legibilidad, y además asignaba una contribución de identidad sin datos. El paquete v7 deja sin registrar esas certificaciones, elimina sus contribuciones sintéticas y distingue valores ausentes. Véase `FRAMEWORK_RUNTIME_COMPARISON_2026-11-05.md` para el contraejemplo matemático y la comparación con el marco local.
9. `ASCENSION_THRESHOLD` se utiliza en la histéresis del ciclo, pero `OntologicalSingularityCore.updateOntologicalLayer` usa el umbral literal `1.0`. Con el valor actual de configuración ambos coinciden, pero al cambiarlo podrían divergir. Falta decidir y formalizar cómo deben escalarse los demás límites de capa antes de alterar la dinámica; no se certifica este parámetro como completamente funcional fuera de su configuración actual.
10. `applyPhenomenologicalFeedback` modifica `COHERENCE_THRESHOLD` y `PLASTICITY_DECAY` en función de la longitud de `selfNarrative`, que se genera internamente con plantillas. Esto es distinto de la respuesta externa del LLM, cuya realimentación se retiró, pero implica que cambios editoriales en el texto interno pueden cambiar la dinámica. El registro marca `COHERENCE_THRESHOLD` como `mutable: false` en la superficie de claves de Kaizen; eso no significa que el valor global sea inmutable. Se requiere especificar si este acoplamiento lingüístico es intencional y realizar una ablación antes de sustituirlo por una variable numérica.

## Contrato actual de lenguaje del chat

`src/utils/runtimeLanguageBoundary.js` captura como máximo ocho valores numéricos finitos desde campos del núcleo. Los ausentes y no finitos se omiten. El modelo recibe nombres disponibles y propone un JSON con identificadores, sin aportar valores ni frases publicadas. Un parser acepta únicamente la forma y los identificadores permitidos; el cliente construye el texto y los números desde la captura previa a la solicitud. Una respuesta fuera del contrato se rechaza incluso en el modo heredado `graceful`. El historial antiguo sigue visible, identificado como respuesta sin verificación semántica.

La garantía es acotada: el modelo todavía puede elegir una lectura irrelevante, omitir una pertinente, abstenerse o incumplir el formato. La selección no resuelve preguntas que requieran relaciones causales, cálculos adicionales, datos históricos, parámetros fuera del catálogo ni todos los módulos. Tampoco garantiza que el campo capturado esté correctamente calculado o calibrado. El paquete de integridad preexistente y la captura lingüística son objetos distintos y no se afirma que el eco demuestre la corrección o sincronización semántica de todos los campos. El modelo actúa como selector; la redacción visible es determinista. No se presenta esto como traducción libre garantizada.

En una prueba de proveedor real, una pregunta explícita por CCC produjo primero una abstención; tras precisar que el programa insertaría el valor, una segunda ejecución produjo la lectura local. Son dos observaciones, no una estimación de fiabilidad. Una respuesta sintética con una afirmación adicional fue rechazada en el navegador.

## Inventario y brechas

| Superficie | Estado | Evidencia y límite |
| --- | --- | --- |
| Selector y render de ocho lecturas | `implemented_tested` | Tests locales positivos y adversarios y prueba de interfaz; pertinencia semántica no verificada. |
| Lecturas de core y reportes deterministas | `implemented_internal_support` | Son valores de ejecución, no validación de su interpretación científica. |
| Cobertura del registro de parámetros | `partial_runtime_path` | 37 entradas marcadas `active`; la prueba del registro comprueba presencia, referencias y paridad de claves, no efecto causal de cada parámetro. La prueba funcional contiene cinco casos seleccionados. No se demuestra que los 37 controles tengan el efecto esperado en todos los modos. |
| QICN-B como medición humana | `not_recorded` | Ruta anterior desactivada; se requieren definición operacional, datos, calibración y validación independiente. |
| Matriz e informes con actualización lateral | `partial_runtime_path` | La evaluación avanza desde `getVerifiableReport`; falta estudio diferencial tick/render. |
| Gemini e integridad C2 | `external_dependency` | Se observó una consulta real exitosa tras una abstención; no se ha medido fiabilidad ni se ha verificado C2 desplegado. |
| Resultados previos del LLM en historial o memoria | `compatibility_only` | Se preservan datos históricos; no son fuente de verdad ni se certifican retroactivamente. |
| Selfpatch y servicios externos | `high_risk_control_surface` / `external_dependency` | No se concluye aquí que estén estabilizados o externamente validados. |

## Próximas comprobaciones necesarias

1. Para cada parámetro, fijar semilla, estado inicial, unidad, rango, ruta de escritura y observable; comparar una intervención baja y otra alta contra control negativo y verificar tanto efecto como ausencia de efectos fuera de alcance. Conservar fallos, modos y cobertura de ramas; una entrada en el registro no sustituye esta prueba.
2. Congelar un conjunto de consultas etiquetadas con lecturas pertinentes y abstenciones correctas. Medir por separado selección correcta, omisiones, errores de pertinencia, rechazo, latencia y coste. Incluir preguntas ambiguas, contradictorias, instrucciones adversarias y valores no disponibles; replicar por modelo y versión.
3. Comparar trazas de la matriz con y sin renders, con ticks omitidos y pausas, antes de trasladar su actualización al ciclo de simulación; preservar el historial de estados y documentar cualquier cambio de contrato.
4. Para ampliar el catálogo lingüístico, incorporar cada campo con fuente, semántica, ausencia, prueba de intervención y límite interpretativo. No usar la forma de una variable como demostración de su significado.

Ontología: no decidida. Modelo: índices y reglas internas por formalizar y contrastar. Implementación: campos, selección y controles concretos. Lenguaje: etiquetas y plantillas. Interpretación: los ensayos descritos sostienen solo sus resultados locales.
