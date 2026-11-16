# Entrega 2 — B1 + B2: auditoría de implementación

claim_scope: isolated_internal_engineering  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: comprobaciones de ingeniería e intervenciones sobre copias
aisladas. Estos registros no son evidencia primaria de la sesión viva, validación
externa, claim_projection ni gate_result de admisibilidad o batch_enforcement.

## Resultado final

Cierre verificado en Node 24.6.0: node tests/run-all-tests.cjs terminó con
184/184 módulos PASS y guard headless PASS; local-static-boundary también PASS.
Los entrypoints directos de build JS, CSS, sync, encoding, lint e inventario
terminaron todos con EXIT=0. La invocación npm test del sandbox original sigue
registrada como 183/184 por EACCES. Son ejecuciones distintas, detalladas abajo.
La entrega queda detenida antes de B3 para auditoría.

## Checkpoint y alcance

- Rama: codex/workbench-system-b.
- HEAD de partida y cierre: 454dcb9a5cd5c4a7728b211cc0d438b80258922e.
- main local: 4142610792c51a171db3b965ff314646fa5535c1.
- No checkout, commit, push, worktree ni otro comando de escritura en .git.
- Entrega detenida antes de B3; sin Sistema B/v5 ni integración UI/empaquetado B4.
- Árbol con cambios sin stage para revisión del usuario.
- No cambios en rutas protegidas, artifacts/, protocolo histórico v1,
  config/workbench/preregister.v1.json, runtimeSnapshot.js ni baterías v2/v3/v4.
- RECOMPUTED_EACH_TICK legacy y formato/digest de persistencia v3 conservados.

El contrato detallado y los límites están en WORKBENCH_EXECUTION_CONTRACT.md.

## Implementación

| Área | Cambio concreto |
| --- | --- |
| Ejecutor único | SimulationCycleDriver contiene inicialización y tick; useSimulationCycle conserva el adaptador React y sus dos callbacks/dependencias originales. |
| Capacidades | ExecutionEnvironment asocia config, RNG, reloj, medición, timers, red y logging por instancia mediante WeakMap; no se serializan capacidades en v3. |
| Entropía | Inyección en QuantumEntropyBridge y EntropyBufferManager/EntropyHealthMonitor/EntropyExperimentController/EntropyProviderClient, incluidos defaults evaluados anticipadamente, retries y timeouts. |
| Restauración | Instancias nuevas, captura v3 verificada, sidecar de ejecución separado, syncFromCore(), referencias compartidas correctas dentro de cada rama y unrestored.length === 0 obligatorio. |
| Perfiles | legacy_compatibility conserva cursores; paired_intervention usa cinta completa y calendario/RNG común por tick de evaluación. |
| Intervenciones | sham, bloqueo de lectura histórica, suspensión de consolidación, congelación del predictor, reset histórico declarado de una sola vez e impulso sensorial de sensibilidad. |
| Integridad | Captura/protocolo/resultado sellados y cadena SHA-256 experimental separada. Verificación de enlaces, payloads, ticks, longitud, archivos de origen y comparaciones recalculadas. |
| Worker | Entrada portable y adaptador worker_threads con cancelación, timeout y límite de heap de 256 MB. Sin callbacks o ledger vivo ni operación de aplicación al núcleo. |
| Procedencia | Captura original y compromisos originales conservados; build firmado a partir de manifest normalizado de src y services/config; seed/cinta/captura incompatibles rechazadas. |
| Diagnóstico | Digests completos de trayectoria, acciones, scores reales previos a selección, margen top-2, componentes de viabilidad, pesos rápidos/consolidados, Fisher, créditos, engramas y cursores. |

Los objetos de entrada se validan antes de copiarlos: sin clases, accessors,
funciones, ciclos, símbolos ni memoria compartida. Un accessor de protocolo no
puede ejecutar un callback del host durante la validación.

Los cambios en tests previos trasladan sus guardas de texto desde el hook al
driver. Tres guardas se adaptaron a la firma inyectada y al binder React,
conservando las comprobaciones de comportamiento. local-static-boundary y las
baterías lingüísticas v2/v3/v4 no se editaron.

## Resultados registrados

| Verificación | Resultado observado |
| --- | --- |
| simulation-cycle-driver-equivalence.v1 | PASS: 4 pares contra fuente B0 real, semillas 11/23, modos legacy/learned, 24 ticks/24 nodos; series, final, bytes completos v3 y cursores RNG/reloj/sensor idénticos. |
| workbench-isolation.v1 | PASS: valores y descriptores/extensibilidad del host intactos; ninguna referencia mutable compartida; fuga en ambas direcciones bloqueada; callbacks vivos no invocados. |
| workbench-determinism.v1 | PASS: trampas de RNG/reloj/new Date sin argumentos/performance/red/timers; continuidad completa tras restaurar; perfiles repetibles; worker=headless; cancelación/timeout y build incompatible. |
| workbench-interventions.v1 | PASS: campos declarados, conservación física inmediata, procedencia original y control positivo sensible. |
| workbench-integrity.v1 | PASS: alteración v3/envelopes, build, estado ausente/no restaurado, chain truncada/reordenada/alterada, comparaciones falsas y seed/tick/cinta incompatibles. |
| workbench-history-controls.v1 | PASS: controles separados; fast gradients siguen al suspender consolidación; freeze no detiene settlement accounting; reset no impide aprendizaje posterior. |
| execution-environment-entropy.v1 | PASS: bridge y cuatro helpers, defaults anticipados y paths de timeout/demora bajo capacidades explícitas. |
| workbench-language-invariance.v1 | PASS: cn4_maxAbsDiff=0; mismas decisiones, estado completo y cursores en local/v3/v4 y rechazo/graceful; v5 diferido. |
| v2 | PASS: conversación anclada. |
| v3 | PASS: 87 casos, 0 false accepts, 0 false rejects. |
| v4 | PASS: 95 casos, 0 false accepts, 0 false rejects. |
| persistence.v3 | PASS: theory-runtime-coherence-and-persistence.v3. |
| report-output-policy.v1 | PASS: opt-in y defaults anteriores, sin sondeos upstream locales. |
| runtime-snapshot-observational.v1 | PASS: aislamiento y digests SHA-256 de 4142610 intactos. |
| workbench-preregistration.v1 | PASS: anclas v1/v2/v3/v4 congeladas y fallo histórico honesto. |
| lint | EXIT=0. |
| verify:source-of-truth | EXIT=0. |
| verify:descriptor-registry | EXIT=0: 23 filas. |
| verify:claim-surface-boundaries | EXIT=0: 5 archivos por defecto; escaneo adicional de 12 archivos B1-B2 también PASS. |
| verify:policies | EXIT=0. |
| test:tower-math | EXIT=0: Frentes 1–5 y Body-World Tower. |
| bridge:verify | EXIT=0 con QICN_BRIDGE_LOCAL_ONLY=1; no certifica upstream. |
| smoke:operational | EXIT=0, reporte y escritores hijos en TEMP. |
| verify:operational-readiness | EXIT=0, manifest y manifest hijo en TEMP. |
| verify:comparative-program-closure | EXIT=0. |
| build-module-inventory --check | PASS: 282 archivos/710 nombres tras regeneración. |
| npm run build | EXIT=0, incluidos assets y encoding check; QICN_REPORT_DIR hacia TEMP. |
| git diff --check | EXIT=0. |

Salida cruda de la suite completa en el sandbox original:

    [tests] Failed: 1/184
     - tests\local-static-boundary.test.js
      [cause]: Error: connect EACCES 127.0.0.1:57464
        code: 'EACCES',
    NPM_TEST_EXIT=1

También pasó el guard headless adicional de cinco ticks. La suite no se
etiqueta PASS: 183/184 módulos pasaron; local-static-boundary no se cambió ni
omitió. El entorno reporta Node v24.6.0 frente al engine canónico 22.x. No se
presenta esta ejecución como validación bajo Node 22.

Scoreboard ejecutado con --run --runtime-probe y --json-file en TEMP:

    Mode: run
    Dimensions: 7/7
    Commands:
     - [FAIL] npm.cmd test (320080ms)
     - [PASS] npm.cmd run build (39826ms)
     - [PASS] npm.cmd run cognition:prereg (4499ms)
    SCOREBOARD_EXIT=1

Siete dimensiones aprobadas no convierten el comando agregado en PASS.

## Ablaciones y replay

Restauración independiente:
semillas 11/23 x legacy/learned, K=30, M=30, 80 nodos; allIdentical=true,
firstDivergentTick=null y unrestored=[] en los cuatro pares. Todos los
maxAbsDelta observados fueron cero. Coste observado a 1500 nodos:
captureMs=224.5419, sealMs=154.8588, bytes=1665822, threw=null.
Estos tiempos dependen del entorno/carga y no son un presupuesto garantizado.

Ciclo completo, semilla 11, 80 ticks, 250 nodos, --self-test:

    selfTest: PASS
    baselineReproducible: true
    languageLocalIdentical: true
    languageModelIdentical: true
    languageWordingIdentical: true
    apiCoupledControlMovesStrain: true
    apiCoupledControlChangesTrajectory: true
    observerChannelMovesObserverImpact: true
    observerChannelChangesTrajectory: false
    kaizenActive: true
    autonomyActive: true
    sensorsActive: true
    LANGUAGE_ABLATION_EXIT=0

Histórico v1 original: 420/180/250, semillas 11,23,37,41,53.
Resumen observado sin cambiar umbrales ni excluir semillas:

    seedsMeetingActionDiv: 5
    seedsMeetingAnchorShift: 5
    seedsMeetingViabGain: 4
    meanEvalActionDivergence: 0.54
    meanProbeActionDivergence: 0.25
    meanAnchorL2Distance: 1.071182
    meanDeltaInTubeRate: 0.106667
    meanDeltaObjectiveScore: 0.040588
    cn1_stationary_sham: true
    cn2_frozen_predictor: true
    cn3_erased_history: false
    cn4_language_decoupling: true
    cn4_maxAbsDiff: 0
    allPreregisteredCriteriaPass: false

CN-3 exige al menos cuatro semillas tanto para ventaja madurada sobre borrada
como para divergencia de acciones, además del probe borrado/naive cero en todas.
La reproducción congelada registra sólo tres para los dos conteos CN-3.
El reset deja estado físico e historia no declarada: nodos, torre, transición,
última observación, trainingSteps y residualEma; el aprendizaje posterior sigue.
No debe describirse como borrado de toda dependencia histórica. Workbench
separa estos mecanismos y registra diagnósticos; no convierte este fallo en PASS.

CLI final: 16 nodos, warmup=30, ticks=6, seed=11, siete ramas.
Ambos perfiles terminaron COMPLETED y el replay de su captura dio el mismo digest.

| Perfil | Digest de resultado | Sham maxAbsDiff | Sensibilidad maxAbsDiff |
| --- | --- | --- | --- |
| legacy_compatibility | dcf76f00f7e9e6c19f8490f74b97e18686f37590de63f741c5e2ac36e8408e41 | 0 | 0.12946699999999994 |
| paired_intervention | 45107a4f418fc37b93f6dd0109fda5de8b55ed4bd61f805a2e27591c305b20e5 | 0 | 0.15966975976995745 |

Sham: fullStateIdentical=true, actionDivergence=0, firstDivergentTick=null.
El control positivo produjo firstDivergentTick=31 en ambos perfiles.
Se comprobó el rechazo de --seed=23 contra una captura con seed=11:
FAIL workbench: capture_seed_mismatch.
No se evaluaron semillas held-out.

## Comandos reproducibles ejecutados

Todos los productores de reportes se ejecutaron con destinos TEMP explícitos,
incluido el QICN_REPORT_DIR heredado por hijos/build/scoreboard. Los directorios
se crearon antes de invocar los comandos. Las rutas por defecto siguen intactas.

~~~powershell
$taskDir = Join-Path $env:TEMP 'qicn-b1b2-audit-20261116'
New-Item -ItemType Directory -Force $taskDir | Out-Null
$env:QICN_REPORT_DIR = $taskDir
$env:QICN_BRIDGE_LOCAL_ONLY = '1'

npm test
npm run lint
npm run verify:source-of-truth
npm run verify:descriptor-registry
npm run verify:claim-surface-boundaries
node scripts/verify-claim-surface-boundaries.cjs src/experiments/workbench src/runtime/ExecutionEnvironment.js src/runtime/HeadlessRuntimeSession.js src/runtime/SimulationCycleDriver.js docs/WORKBENCH_EXECUTION_CONTRACT.md
npm run verify:policies
npm run test:tower-math
npm run bridge:verify
npm run smoke:operational -- "--out=$taskDir\operational.json"
npm run verify:operational-readiness
npm run verify:comparative-program-closure
node scripts/build-module-inventory.mjs
node scripts/build-module-inventory.mjs --check
node scripts/scoreboard.cjs --run --runtime-probe "--json-file=$taskDir\scoreboard.json"
npm run build

node tests/simulation-cycle-driver-equivalence.v1.test.mjs
node tests/workbench-isolation.v1.test.mjs
node tests/workbench-determinism.v1.test.mjs
node tests/workbench-interventions.v1.test.mjs
node tests/workbench-integrity.v1.test.mjs
node tests/workbench-history-controls.v1.test.mjs
node tests/execution-environment-entropy.v1.test.mjs
node tests/workbench-language-invariance.v1.test.mjs
node tests/language-grounded-conversation.v2.test.mjs
node tests/language-semantic-contract.v3.test.mjs
node tests/language-free-contract.v4.test.mjs
node tests/theory-runtime-coherence-and-persistence.v3.test.mjs
node tests/report-output-policy.v1.test.cjs
node tests/runtime-snapshot-observational.v1.test.mjs
node tests/workbench-preregistration.v1.test.mjs

node scripts/run-state-restore-equivalence.mjs --seeds=11,23 --k=30 --m=30 --nodes=80 --cost-nodes=1500 "--out=$taskDir\restore.json"
node scripts/run-full-cycle-language-ablation.mjs --self-test --ticks=80 --nodes=250 --seeds=11 "--out=$taskDir\full-cycle-language.json"
node scripts/run-historical-dependence-ablation.mjs --warmup=420 --eval=180 --nodes=250 --seeds=11,23,37,41,53 "--out=$taskDir\historical-v1.json"
node scripts/run-micro-experiment-workbench.mjs --profile=legacy_compatibility --seed=11 --nodes=16 --warmup=30 --ticks=6 "--out=$taskDir\workbench-legacy_compatibility.json"
node scripts/run-micro-experiment-workbench.mjs --profile=paired_intervention --seed=11 --nodes=16 --warmup=30 --ticks=6 "--out=$taskDir\workbench-paired_intervention.json"
# Para replay, guardar el campo capture del reporte en TEMP y pasarlo:
# node scripts/run-micro-experiment-workbench.mjs --profile=paired_intervention --ticks=6 "--capture=$taskDir\capture-paired_intervention.json" "--out=$taskDir\replay-paired_intervention.json"

git diff --check
git status -s -uall
git rev-parse HEAD
git rev-parse main
~~~

Los nombres de directorio TEMP variaron entre ejecuciones; la lista normaliza
el prefijo para reproducción. El loader de equivalencia usa git show de B0,
sólo lectura y sin checkout ni modificación de git.

## Pendientes explícitos y límites

- verify:subjectivity-stack y verify:phenomenal-bridge-final-audit NO se
  invocaron. Sus escritores anidados siguen materializando rutas fijas y
  algunos paths ejecutan builders; QICN_REPORT_DIR no redirige todo el grafo.
  La auditoría está documentada en WORKBENCH_EXECUTION_CONTRACT.md. El módulo
  ecosystem-release-common no se modificó. No se afirma PASS para esos checks.
- Captura de un bridge habilitado/en polling se rechaza con
  external_entropy_requires_explicit_replay_capture. El contrato B2 cubre
  proveedor desactivado/cinta sintética; el replay del servicio vivo es
  partial_runtime_path y necesita un contrato explícito adicional.
- UI/worker en browser y build/sync/sw del worker quedan para B4. No se
  cambiaron build.cjs, scripts/sync-netlify-assets.cjs ni sw.js.
- Sistema B/v5, razonamiento abierto y sus nuevos controles factuales quedan
  not_recorded hasta B3; no se alteró el contrato Gemini actual.
- Ninguno de los resultados anteriores certifica soporte externo.

El lanzador de terminal original perdió sesiones al actualizar el entorno:
invalid sandbox permission path URI: 'file:///workspace' is invalid on 'windows'.
Se recuperó acceso con el runtime Node disponible; sus últimas siete pruebas
Workbench/entropía y module-inventory --check dieron EXIT=0. La repetición
agregada posterior y el estado final se registran al cierre de este documento.

## Inventario final de archivos cambiados

Salida de git status -s -uall (incluye este documento):

~~~text
 M docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md
 M docs/DESCRIPTOR_REGISTRY.md
 M docs/IMPLEMENTATION_STATUS.md
 M docs/TRACEABILITY_MATRIX.md
 M docs/WORKBENCH_AND_SYSTEM_B_PREREGISTRATION.md
 M src/hooks/useSimulationCycle.js
 M src/language/moduleInventory.generated.js
 M src/persistence/dynamicState.js
 M src/simulation/CognitiveEmergencePlanner.js
 M src/simulation/ConsciousNode.js
 M src/simulation/EntropyBufferManager.js
 M src/simulation/EntropyExperimentController.js
 M src/simulation/EntropyHealthMonitor.js
 M src/simulation/EntropyProviderClient.js
 M src/simulation/HolographicMemoryNexus.js
 M src/simulation/InformationalEntanglementField.js
 M src/simulation/KaizenMetamorphosisEngine.js
 M src/simulation/MetaSovereigntyCheck.js
 M src/simulation/NodalProcessingLayer.js
 M src/simulation/OntologicalSingularityCore.js
 M src/simulation/PhenomenologyCore.js
 M src/simulation/QuantumEntropyBridge.js
 M src/simulation/SimulationController.js
 M src/simulation/WorldModelEngine.js
 M src/utils/integrityHelpers.js
 M tests/autonomy-budget-governor.v44.test.js
 M tests/ccc-history-interactive.v43.test.js
 M tests/engine-language-decoupling.v1.test.mjs
 M tests/entanglement-timeline-model.v42b.test.js
 M tests/integrity-pmia-transform-fields.v411.test.js
 M tests/liveness.test.js
 M tests/pmia-cooldown.v411.test.js
 M tests/pmia-negative-window.v411.test.js
 M tests/post-ascension-dynamics.v42.test.js
 M tests/post-threshold-multiband.v42b.test.js
 M tests/quantum-ui-hybrid.v49.test.js
 M tests/simulation-controller.test.js
 M tests/stasis-break-criteria.v411.test.js
 M tests/theory-runtime-coherence-and-persistence.v3.test.mjs
?? config/workbench/schemas/capture.v1.json
?? config/workbench/schemas/protocol.v1.json
?? config/workbench/schemas/result.v1.json
?? docs/WORKBENCH_B1_B2_DELIVERY_AUDIT.md
?? docs/WORKBENCH_EXECUTION_CONTRACT.md
?? scripts/lib/create-headless-runtime.mjs
?? scripts/lib/workbench-node-worker.mjs
?? scripts/lib/workbench-worker-client.mjs
?? scripts/run-micro-experiment-workbench.mjs
?? src/experiments/workbench/capture.js
?? src/experiments/workbench/contracts.js
?? src/experiments/workbench/inputTape.js
?? src/experiments/workbench/interventions.js
?? src/experiments/workbench/metrics.js
?? src/experiments/workbench/recordChain.js
?? src/experiments/workbench/restore.js
?? src/experiments/workbench/runner.js
?? src/runtime/ExecutionEnvironment.js
?? src/runtime/HeadlessRuntimeSession.js
?? src/runtime/SimulationCycleDriver.js
?? src/workers/microExperiment.worker.js
?? tests/execution-environment-entropy.v1.test.mjs
?? tests/lib/frozen-runtime-loader.mjs
?? tests/lib/frozen-runtime-register.mjs
?? tests/lib/workbench-fixtures.mjs
?? tests/simulation-cycle-driver-equivalence.v1.test.mjs
?? tests/workbench-determinism.v1.test.mjs
?? tests/workbench-history-controls.v1.test.mjs
?? tests/workbench-integrity.v1.test.mjs
?? tests/workbench-interventions.v1.test.mjs
?? tests/workbench-isolation.v1.test.mjs
?? tests/workbench-language-invariance.v1.test.mjs
~~~

39 archivos modificados y 32 archivos nuevos, todos sin stage. La revisión de
los nombres cambiados no contiene rutas protegidas ni reportes canónicos.

## Cierre tras recuperar el runtime Node

El lanzador npm del runtime alternativo devolvió EXIT=1 después de imprimir
las cabeceras de test/build/lint, sin salida de los scripts hijos. La primera
prueba de lanzamiento vía PowerShell informó Could not determine Node.js
install directory. No se cambiaron configuración, scripts o tests para ocultarlo.
Se ejecutaron después los entrypoints reales directamente con node.exe:

~~~text
node tests/local-static-boundary.test.js
[local-static-boundary] PASS

node tests/run-all-tests.cjs
[headless] OK: extracted cycle ran 5 ticks without throwing and emitted state.
[tests] OK: 184/184 passed
EXIT=0

node build.cjs                                      EXIT=0
node node_modules/tailwindcss/lib/cli.js -c tailwind.config.cjs -i ./src/styles/tailwind.input.css -o ./dist/tailwind.css --minify
                                                   EXIT=0
node scripts/sync-netlify-assets.cjs                EXIT=0
node scripts/post-build-encoding-check.cjs           EXIT=0
node node_modules/eslint/bin/eslint.js src/ --max-warnings=50
                                                   EXIT=0
node scripts/build-module-inventory.mjs --check      EXIT=0
[module-inventory] up to date
~~~

Se conservaron QICN_REPORT_DIR en TEMP y QICN_BRIDGE_LOCAL_ONLY=1. La versión
Node continuó en v24.6.0; Node 22.x no fue verificado. El test de loopback no
se editó: EACCES queda confirmado como restricción del sandbox original.
El agregado vía npm del primer entorno y el ejecutor directo del segundo no
se presentan como la misma invocación.

Los logs completos de esta última ejecución y los JSON de replay están en:

    C:\Users\irisp\AppData\Local\Temp\qicn-b1b2-audit-20261116\

Archivos: direct_suite.log, build_js.log, build_css.log, build_sync.log,
encoding.log, lint_direct.log, inventory_direct.log, direct-final-status.json,
workbench-legacy_compatibility.json, workbench-paired_intervention.json y sus
correspondientes capture/replay JSON. El status JSON registra exit=0 y
error=null en los siete pasos directos. Los logs no se copiaron al repositorio.

El escaneo de claim-surface-boundaries ampliado, incluyendo esta auditoría,
pasó con 13 archivos; git diff --check terminó con EXIT=0.
