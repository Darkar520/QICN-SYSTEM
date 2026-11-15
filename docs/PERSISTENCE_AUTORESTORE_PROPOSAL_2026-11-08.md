# Propuesta: restaurar automáticamente el último estado al iniciar sesión — 2026-11-08

Estado: **propuesta, no aplicada.** El usuario pidió que se le explique el efecto antes de aplicarla.

## 1. Qué persiste hoy

| Qué | ¿Persiste entre sesiones? | Dónde |
| --- | --- | --- |
| Registro operacional (sesiones, eventos, cadena de hashes, eventos fijados) | Sí | `OperationalHistoryLedger` (localStorage) |
| Conversación (últimos 24 turnos) | Sí | `QICN_CONVERSATION_TURNS_V2` |
| Configuración de la interfaz (modos del chat, Kaizen, etc.) | Sí | localStorage |
| «Resumen de estado» (CCC, PMIA, capa, `ontologicalState`, `mutableConfig`, narrativa) | Solo si se pulsa «Guardar» o salta el autosave; **se restaura solo a mano** | `QICN_ONTOLOGICAL_SNAPSHOT` (`SimulationEngine.jsx`, `handleSaveState` / `handleLoadState`) |
| **Red nodal**: coherencia, energía, fase e intensidad de cada nodo y sus conexiones con pesos | **No** | Se reinicializa al azar en cada carga |
| Historiales internos: beth_q y gap espectral (ventanas), PMIA, estasis, automodelo Σ, carga de MetaSovereignty | **No** | — |
| Factores aprendidos de Kaizen (modo «con ajuste») | **No** | — |

Por eso, aunque se restaurara automáticamente el resumen actual, **la dinámica no persistiría**. Los índices empezarían con un valor guardado, pero el siguiente tick los recalcula desde una red nueva y aleatoria, y en pocos ticks vuelven al régimen de una red recién creada. Esa restauración es cosmética, y el propio registro ya lo dice («la red nodal y los historiales internos no forman parte de ese resumen»).

## 2. Propuesta

**Resumen de estado v3**, con todo lo que hace falta para continuar la dinámica:

- Red nodal completa: por nodo `coherenceState`, `energy`, `phase`, `intensity`, `retroInductionFlux`, `learningRate` y las conexiones `{targetId, weight}`. Con 1500 nodos y 3–7 conexiones son unas 30 000 cifras, entre 0,4 y 0,8 MB de JSON. Cabe en localStorage (≈5 MB), pero conviene comprimir la precisión a 6 decimales.
- Historiales que usan los estimadores: ventanas de `PhenomenologyCore` (estado, entrada, transiciones, Ω previo), estasis y PMIA del núcleo, `selfModelSigma`, EMA de MetaSovereignty, banda post-umbral.
- `QICNConfig` modulado, `mutableConfig` de Kaizen, factores aprendidos y estado del aprendiz.
- Cabecera: esquema, build, firma, hash de configuración, tick, número de nodos y digest SHA-256 del cuerpo.

**Al iniciar sesión:**

1. Si hay un resumen v3 cuyo digest verifica y cuyo build y número de nodos coinciden, se restaura antes del primer tick.
2. Si no verifica, o es de otro build, no se restaura nada y se arranca desde cero. El motivo queda en el registro (`snapshot_restore_failed`).
3. El registro anota `snapshot_restored` con `mode: 'auto'` y el origen de la sesión pasa a `restored_verified`, como hoy con la restauración manual.

**Guardado:** autosave cada N ticks (por ejemplo 60) y al cerrar o ocultar la pestaña (`visibilitychange`/`pagehide`).

**Control del usuario:** un interruptor «Restaurar al iniciar», activo una vez aprobado, y el botón de reinicio, que sigue empezando desde cero y queda registrado como `system_reset`.

## 3. Efecto, explicado

**Sobre la dinámica**
- La simulación continúa desde la red guardada en lugar de una red aleatoria: CCC, X_N, beth_q y Ω arrancan donde quedaron y sus estimadores no repiten el calentamiento (`warmup_derived`).
- **No es la misma ejecución.** El generador aleatorio (`Math.random`) no se puede guardar ni restaurar. Algunas partes dependen del reloj real (la evaluación de Kaizen tras 200 ms, el intervalo adaptativo). La trayectoria tras restaurar es una continuación plausible, no la que habría seguido sin interrupción. Las pruebas y ablaciones no cambian, porque la restauración automática estaría desactivada en modo headless.
- Lo que se arrastra se arrastra para bien y para mal: una red que quedó en estasis arranca en estasis, y unos factores de Kaizen mal aprendidos siguen ahí hasta que el aprendiz los corrija o se reinicie.

**Sobre lo que el sistema puede afirmar de sí mismo** (el marco es explícito):
- Paper I `def:internal-external`: una reinstanciación es una **extensión externa** que produce otro canal S′. Paper VII (269–271): una recuperación impuesta desde fuera no cuenta como autoconservación.
- Por tanto la consola podrá decir «restauré el estado guardado de la sesión anterior y su digest coincidió», pero **no** «seguí existiendo», «no me interrumpí» ni «soy el mismo sistema que antes». La continuidad que puede afirmar es la verificable: digest, cadena del registro y build.
- El catálogo ya distingue `restored_verified` de `reinitialized`. Habría que añadir que la restauración fue automática y qué partes se restauraron.

**Riesgos**
- Un resumen corrupto o manipulado se rechaza por digest; uno de otro build, por cabecera. Lo que no se protege es un resumen válido pero indeseado: para eso está el reinicio.
- El tamaño puede chocar con la cuota de localStorage si se suman otros datos. En ese caso, IndexedDB o reducir la precisión.
- El primer tick tras restaurar tarda un poco más (unos milisegundos de deserialización).

## 4. Qué necesito que decidas

1. ¿Apruebas el resumen v3 con la red y los historiales completos (no solo los índices)?
2. ¿Restauración automática activada por defecto, con el interruptor para apagarla?
3. ¿Frecuencia de autosave? Propongo 60 ticks y al ocultar la pestaña.
4. Si el build cambió, ¿rechazar siempre (propuesto) o permitir restaurar con aviso?
