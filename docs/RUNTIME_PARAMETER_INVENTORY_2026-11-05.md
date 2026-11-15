# Inventario de parámetros del runtime — revisión literal

Este inventario es una búsqueda estática de nombres, no una prueba de que los parámetros funcionen ni de que los tests que los mencionan comprueben su efecto. Los nombres pueden convertirse en alias; ausencia literal en el archivo propietario no demuestra desconexión. Se excluye la prueba que solo enumera el propio registro. Estado: revisión funcional individual incompleta.

De 37 entradas, 13 no aparecieron por su nombre literal en otros tests durante esta búsqueda; algunas pueden estar cubiertas mediante alias. En cuatro opciones de entropía se reprodujo y corrigió la sustitución incorrecta del valor cero, con un test de propagación y controles de comportamiento. El resto requiere trazado e intervenciones específicas.

| Parámetro | Categoría | Archivo propietario registrado | Clave literal en archivo | Menciones literales en tests distintos del registro |
| --- | --- | --- | --- | --- |
| `BASE_LEARNING_RATE` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/generate-real-audit-log.js`, `tests/life-first-person-certifiers.v1.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `HEBBIAN_FACTOR` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/generate-real-audit-log.js`, `tests/life-first-person-certifiers.v1.test.js`, `tests/parameter-surface-registry.v1.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `SYNAPTIC_PRUNING_THRESHOLD` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `PLASTICITY_DECAY` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `RETRO_FLUX_WEIGHT` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/generate-real-audit-log.js`, `tests/life-first-person-certifiers.v1.test.js`, `tests/parameter-surface-registry.v1.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `BOLTZMANN_ANALOG_K` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/critical-observables-determinism.v41a.test.js`, `tests/generate-real-audit-log.js`, `tests/parameter-surface-registry.v1.test.js`, `tests/post-ascension-dynamics.v42.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/simulation-cycle-headless.smoke.mjs`, `tests/simulation-smoke.test.js` |
| `INFORMATIONAL_TEMP_T` | `core-mutable` | `src/simulation/KaizenMetamorphosisEngine.js` | sí | `tests/autonomy-sandbox-runtime.v44.test.js`, `tests/critical-observables-determinism.v41a.test.js`, `tests/generate-real-audit-log.js`, `tests/parameter-surface-registry.v1.test.js`, `tests/post-ascension-dynamics.v42.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/sensory-dynamics-coupling.v52.test.js`, `tests/simulation-cycle-headless.smoke.mjs`, `tests/simulation-smoke.test.js` |
| `COHERENCE_THRESHOLD` | `core-threshold` | `src/simulation/InformationalEntanglementField.js` | sí | `tests/parameter-surface-registry.v1.test.js` |
| `ASCENSION_THRESHOLD` | `core-threshold` | `src/simulation/OntologicalSingularityCore.js` | no; seguir alias | `tests/post-ascension-dynamics.v42.test.js` |
| `PROCESSING_SAMPLE_SIZE` | `core-threshold` | `src/simulation/NodalProcessingLayer.js` | sí | ninguna por nombre literal |
| `NODE_CONNECTION_MIN` | `core-threshold` | `src/simulation/NodalProcessingLayer.js` | sí | ninguna por nombre literal |
| `NODE_CONNECTION_MAX` | `core-threshold` | `src/simulation/NodalProcessingLayer.js` | sí | ninguna por nombre literal |
| `SIMULATION_FREQUENCY` | `core-threshold` | `src/components/SimulationEngine.jsx` | sí | ninguna por nombre literal |
| `FRICTION_CYCLE_LENGTH` | `core-threshold` | `src/simulation/OntologicalSingularityCore.js` | sí | ninguna por nombre literal |
| `targetFPS` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/phenomenological-narrative.v392.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/sensory-sovereignty.v381.test.js` |
| `minFPS` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/phenomenological-narrative.v392.test.js`, `tests/runtime-parameter-functional.v400.test.js`, `tests/sensory-sovereignty.v381.test.js` |
| `faceDetectMinIntervalMs` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/phenomenological-narrative.v392.test.js`, `tests/runtime-parameter-functional.v400.test.js` |
| `faceDetectMaxIntervalMs` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/phenomenological-narrative.v392.test.js`, `tests/runtime-parameter-functional.v400.test.js` |
| `activationDelayMs` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/sensory-sovereignty.v381.test.js` |
| `tickIntervalMs` | `sensory-runtime` | `src/simulation/SensoryPerceptionEngine.js` | sí | `tests/sensory-sovereignty.v381.test.js` |
| `LATENCY_STRAIN_ALPHA` | `metacognitive-runtime` | `src/components/SimulationEngine.jsx` | sí | `tests/autonomy-budget-governor.v44.test.js` |
| `LATENCY_STRAIN_BASELINE_MS` | `metacognitive-runtime` | `src/components/SimulationEngine.jsx` | sí | `tests/autonomy-budget-governor.v44.test.js` |
| `LATENCY_STRAIN_SATURATION_MS` | `metacognitive-runtime` | `src/components/SimulationEngine.jsx` | sí | `tests/autonomy-budget-governor.v44.test.js` |
| `AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR` | `metacognitive-runtime` | `src/components/SimulationEngine.jsx` | sí | `tests/autonomy-budget-governor.v44.test.js`, `tests/simulation-cycle-headless.smoke.mjs` |
| `AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS` | `metacognitive-runtime` | `src/components/SimulationEngine.jsx` | sí | `tests/simulation-cycle-headless.smoke.mjs` |
| `QUANTUM_ENTROPY_TTL_MS` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_POLL_INTERVAL_MS` | `quantum-runtime` | `src/components/SimulationEngine.jsx` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_REQUIRED_QUALITY_MIN` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | `tests/quantum-zero-configuration.test.js` |
| `QUANTUM_ENTROPY_ENABLED` | `quantum-runtime` | `src/config/runtimeEnv.js` | sí | ninguna por nombre literal |
| `QUANTUM_BUFFER_CAPACITY_CHUNKS` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | `tests/quantum-zero-configuration.test.js` |
| `QUANTUM_BUFFER_REFILL_TARGET_CHUNKS` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_PROVIDER_TIMEOUT_MS` | `quantum-runtime` | `src/simulation/EntropyProviderClient.js` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_PROVIDER_RETRY_COUNT` | `quantum-runtime` | `src/simulation/EntropyProviderClient.js` | no; seguir alias | `tests/quantum-zero-configuration.test.js` |
| `QUANTUM_PROVIDER_RETRY_BACKOFF_MS` | `quantum-runtime` | `src/simulation/EntropyProviderClient.js` | no; seguir alias | `tests/quantum-zero-configuration.test.js` |
| `QUANTUM_PROVIDER_FALLBACK_ENABLED` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | ninguna por nombre literal |
| `QUANTUM_LOG_LEVEL` | `quantum-runtime` | `src/simulation/QuantumEntropyBridge.js` | no; seguir alias | ninguna por nombre literal |

Para cada fila aún se requiere: ruta efectiva de configuración a consumo, valor inicial y mutaciones, intervención en límites y valor intermedio, control negativo, repetición con semilla fijada y observables registrados. Los campos `verificationTestId` del registro no prueban por sí solos que exista una prueba funcional dedicada. Ver `RUNTIME_LANGUAGE_BOUNDARY_AUDIT_2026-11-05.md` para los fallos reproducidos y las correcciones acotadas.
