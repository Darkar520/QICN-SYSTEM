# Entrega B4 + B5 — auditoría técnica, 2026-11-16

Base: `codex/workbench-system-b`, `88dfd5cea71ad66845b50c5981df24febeba5eed`.
`main` conserva `4142610792c51a171db3b965ff314646fa5535c1`.
No se ejecutaron escrituras en `.git`, commits, merge ni push.

Todo soporte de esta entrega es `evidence_scope: internal_support_only`,
`external_support_certified = false`. Los resultados de copia no son evidencia
primaria de ejecución viva, `claim_projection`, `gate_result` ni validación externa.

## Comportamiento implementado y límites

El panel toma una captura v3 en una frontera de tick completado y confirmado
por React. La copia del grafo ocurre síncronamente antes del primer `await`;
el sellado SHA-256 sólo recibe datos desacoplados. No congela el grafo original.
Entropía externa habilitada o en polling rechaza la captura, con aviso explícito;
no se desactiva el proveedor para conseguir una captura.

El navegador no ofrece cursores serializables de `Math.random`, reloj de pared,
performance ni sensores físicos. La captura conserva el estado dinámico, pero
declara un contexto futuro sintético nuevo: semilla diagnóstica 11, epoch virtual
1800000000000 y cinta futura común. Esto se muestra en UI. `legacy_compatibility`
conserva las fórmulas legacy, sin prometer continuación exacta de los cursores
externos de la sesión viva. No se cambió `RECOMPUTED_EACH_TICK`.

Un Worker ESM real recibe únicamente captura, protocolo e identidad esperada.
El handler es el de B2. La firma compilada del Worker debe coincidir con la
captura; el cliente verifica identidad de respuesta, resultado, cadena y
comparaciones antes de publicar un bundle inmutable. Cancelación, sustitución,
desmontaje y timeout invalidan la operación y terminan el Worker. No hay apply-back.
Los controles históricos permanecen separados y conservan procedencia original.
El panel muestra digests completos, trayectoria, objetivos, márgenes, pesos,
Fisher, engramas y alcance. Sham es obligatorio y por sí solo deja `not_recorded`.

El chat conserva `free/v4` por defecto y `prepareTurn` conserva `verified/v3`.
Sistema B se selecciona expresamente. Sólo recibe un `ledgerRecord` clonado,
sin invocar escritores del ledger. La casilla de evidencia vincula consentimiento
al digest exacto; cambiar/cancelar el resultado invalida la selección incluso
antes del reset del efecto React. Los hechos se insertan localmente y las
propuestas abiertas se distinguen en cuatro partes. La concordancia v5 usa
átomo/tipo/insertado/fuente/estado; la tabla legacy permanece disponible.
Graceful muestra premisas, dependencias retiradas y motivos detallados.

v5 no ingresa texto en el canal sensorial/observador legacy, no consume el RNG
del motor para nonces/auditoría y no escribe eventos de rechazo/error/recuperación
en el ledger vivo. Su transporte usa `dynamicsCoupling:false` y no escribe ni
trunca el log API de 50 muestras del ciclo; expulsar muestras acopladas habría
introducido una vía indirecta de influencia. La UI conserva fecha de última
llamada y trazas de proveedor. Las rutas v3/v4 conservan su comportamiento.

`inspectOpenProseDetails` añade token normalizado y patrón a los mismos rechazos
de B3; no relaja aceptación ni concede privilegios a OPEN_FRAME, condicionales,
negaciones o etiquetas del modelo. La corrección pide JSON puro, incluye hasta
16 diagnósticos y acota la salida anterior a 16000 caracteres. La propuesta de
Gemini sigue siendo abierta; sus premisas verificadas no certifican su conclusión.

`build.cjs` emite `dist/microExperiment.worker.js` ESM con firma compartida con
el bundle principal. Sync lo copia a raíz. Ambos outputs son assets generados
ignorados por git. `sw.js` sólo recibió comentarios: borra caches, se desregistra
y no intercepta fetch. No se añadió cache del Worker.

## Estado de verificación post-corrección B4+B5

Entorno observado: Windows, Node **v24.6.0** (el proyecto declara Node **22.x**;
la repetición en Node 22 y la auditoría final del usuario quedan para revisión).
Todos los JSON/logs de corridas fueron a `$env:TEMP`, mediante `QICN_REPORT_DIR`
y/o `--out`; no se generaron reportes en `artifacts/`, `docs/` ni `docs/visual-evidence/`.

Correcciones aplicadas antes del cierre:
1. **Identidad de clases bajo minificación (`build.cjs` + `src/persistence/dynamicState.js`)**: `keepNames: true` en los tres builds esbuild (`bundle.js`, `network_canvas_worker.js`, `microExperiment.worker.js`) y registro explícito por constructor (`CANONICAL_CLASS_NAMES = new WeakMap(...)`) en `dynamicState.js` (preservando `qicn.dynamic_state.v3` binario/SHA-256 exacto en Node y rechazo de clases desconocidas como `UnknownRuntimeClass` en `workbench-integrity.v1`). Validado en `BUILD_MODE=dev` y `BUILD_MODE=production`, además de un bundle extra compilado con `keepNames: false` en `workbench-worker-packaging.v1`.
2. **Decoupling C2 (`tests/engine-language-decoupling.v1.test.mjs`)**: actualizada la aserción de `CASE 3` para mantener íntegramente `integrityEnvelope: chatIntegrityEnvelope`, `dynamicsCoupling: false` y `timeoutMs: CHAT_REQUEST_TIMEOUT_MS`, exigiendo además explícitamente `writeCycleLog: prepared.contract !== 'evidential'` y su guarda `requestOptions?.writeCycleLog !== false` en `robustFetchLLMResponseTracked`.
3. **UX y tasa de éxito `Sistema B (v5)` (`SimulationEngine.jsx`, `claimGrammar.js`, `factualVerifier.js`, `realization.js`, `reasoningPlan.js`)**: añadidos rótulos en español en `ROUTE_LABELS` (`local_evidential`, `gemini_evidential_checked`, `gemini_evidential_partial`, `gemini_evidential_rejected`, `gemini_evidential_unavailable`), mantenida intacta la cuarentena de `epistemicPolicy.js`, detallados campos permitidos/prohibidos y ejemplos JSON en `buildEvidentialPrompt`, regla estricta de colocación (`kind:"open"` prohibido en `measured_observation`/`symmetric_epistemic_scope`), y diagnósticos estructurados (`unexpectedKeys`, `missingKeys`, `allowedKeys`) en `v5_invalid_fields` y `buildEvidentialCorrectionPrompt`.

| Comprobación ejecutada | Resultado observado |
| --- | --- |
| `npm test` (`run-all-tests.cjs`) | EXIT=0; **191/191 PASS** reales (`browser-workbench.v1`, `engine-language-decoupling.v1` y `local-static-boundary.test.js` todos en verde) |
| `language-grounded-conversation.v2` | EXIT=0 |
| `language-semantic-contract.v3` | EXIT=0; 87 casos |
| `language-free-contract.v4` | EXIT=0; 95 casos |
| `persistence.v3` | EXIT=0 |
| Seis suites B1-B2 requeridas | EXIT=0 |
| Suites B3 + UI v5 | EXIT=0; `factual`: 46 checks; `evidential`: 31 evaluaciones + diagnósticos `v5_invalid_fields`; compatibilidad congelada intacta; `language-system-b-ui.v1` + recuperación por reintento |
| `workbench-language-invariance.v1` | EXIT=0; `cn4_maxAbsDiff=0` |
| `workbench-browser-client.v1` | EXIT=0 |
| `workbench-worker-packaging.v1` | EXIT=0; incluye Worker ESM compilado y prueba adicional `minify:true, keepNames:false` |
| `browser-workbench.v1` (Edge CDP headless) | EXIT=0; PASS real tanto con `BUILD_MODE=dev` como con `BUILD_MODE=production` |
| `lint` | EXIT=0 |
| `verify:source-of-truth` | EXIT=0; salida TEMP (`scannedFiles: 301`, `violations: []`, `status: PASS`) |
| `verify:descriptor-registry` | EXIT=0; 25 filas |
| `verify:claim-surface-boundaries` | EXIT=0 |
| `verify:policies` | EXIT=0 |
| `test:tower-math` | EXIT=0 |
| `bridge:verify` | EXIT=0; `QICN_BRIDGE_LOCAL_ONLY=1` |
| `verify:operational-readiness` | EXIT=0; salida TEMP |
| `smoke:operational` | EXIT=0; salida TEMP |
| `verify:comparative-program-closure` | EXIT=0 |
| `build-module-inventory --check` | EXIT=0; `[module-inventory] up to date` |
| `npm run build` (`BUILD_MODE=dev` y `BUILD_MODE=production`) | EXIT=0; `keepNames: true`, Worker y root sincronizados, UTF-8 OK |
| `scoreboard --json-file=TEMP` | EXIT=0; inspect, 7/7 dimensiones (`10/10`) |
| Ablación histórica v1 420/180/250, cinco semillas | EXIT=0; `allPreregisteredCriteriaPass=false`, `seedsMeetingActionDiv=5/5`, `seedsMeetingAnchorShift=5/5`, `seedsMeetingViabGain=4/5`, `cn1=true`, `cn2=true`, `cn3_erased_history=false` preservado, `cn4=true (cn4_maxAbsDiff=0)` |
| Ablación de lenguaje 80 ticks/250 nodos/semilla 11 | EXIT=0; `selfTest=PASS`, `observerChannelChangesTrajectory=false` |
| Restauración v3 K=30/M=30/80 nodos/semilla 11 | EXIT=0; `allIdentical=true`, `legacy` y `learned` `unrestored=0`, coste 1500 nodos medido (`captureMs=70.636`, `sealMs=64.327`, `bytes=1665822`) |
| Workbench CLI paired, 24 nodos/40 warmup/12 ticks | EXIT=0; `COMPLETED`, `sham maxAbsDiff=0`, sensibilidad positiva (`0.079315`) |
| Prueba en vivo en navegador contra `local-sandbox-server.mjs` + `gemini-3-flash-preview` | Workbench `paired_intervention` + cancelación limpia + 0 mutación viva; en `Graceful` (3 preguntas adversariales) y en `Strict` tras refinar `reasoningPlan.js` (pregunta reduccionista/fenomenalidad con Workbench adjunto: `"Sistema B · átomos verificados y propuesta abierta"`, 0 discrepancias, 4 secciones, 5 filas en concordancia sin celdas vacías, `external_support_certified = false`) |
| `git diff --check` | EXIT=0 |

Extractos crudos post-corrección observados:

```text
[tests] OK: 191/191 passed
OK: actual browser ESM worker, headless/worker agreement, hook/panel, cancellation/timeout, v5 four parts/concordance/evidence, no live mutation and private paths blocked
OK: engine language decoupling v1 test passed
[descriptor-registry] OK: 25 rows validated from docs\descriptor_registry.v1.json
[module-inventory] up to date
[QICN] Root runtime synced: bundle.js, tailwind.css, network_canvas_worker.js, microExperiment.worker.js
[encoding-check] OK: UTF-8 integrity validated for dist artifacts.
```

```json
{
  "allPreregisteredCriteriaPass": false,
  "observed": {
    "seedsMeetingActionDiv": 5,
    "seedsMeetingAnchorShift": 5,
    "seedsMeetingViabGain": 4,
    "meanEvalActionDivergence": 0.54,
    "meanProbeActionDivergence": 0.25,
    "meanAnchorL2Distance": 1.071182,
    "meanDeltaInTubeRate": 0.106667,
    "meanDeltaObjectiveScore": 0.040588
  },
  "negativeControlsPass": {
    "cn1_stationary_sham": true,
    "cn2_frozen_predictor": true,
    "cn3_erased_history": false,
    "cn4_language_decoupling": true,
    "cn4_maxAbsDiff": 0
  },
  "fullCycle": {
    "baselineReproducible": true,
    "languageLocalIdentical": true,
    "languageModelIdentical": true,
    "languageWordingIdentical": true,
    "observerChannelChangesTrajectory": false
  },
  "restore": {"allIdentical": true, "legacyUnrestored": 0, "learnedUnrestored": 0}
}
```

## Auditoría de escritores anidados

No se añadió routing parcial a estas familias. Cambiar sólo el escritor de un
verificador deja builders, loaders y consumidores leyendo rutas canónicas o
regenerando artefactos allí. No sería un routing TEMP completo y limpio. Las
rutas por defecto de todos estos scripts permanecen idénticas. Ninguno quedó
declarado cubierto ni fue invocado para esta entrega.

| Scripts auditados | Escrituras/dependencias actuales | Cobertura TEMP |
| --- | --- | --- |
| verify-subjectivity-scaffolding | artifacts/subjectivity/subjectivity_scaffolding_check.json | no |
| verify-subjectivity-selfindex-ownership | srt1: self_index_state, ownership y check JSON | no |
| verify-subjectivity-continuity-perspective | srt2: continuidad/perspectiva y check JSON | no |
| verify-subjectivity-valuation-intervention | srt3: valoración/intervenciones y check JSON | no |
| verify-subjectivity-reducibility | lee srt3, escribe srt4 | no |
| verify-subjectivity-gate | lee srt3/srt4, escribe srt5 | no |
| verify-subjectivity-ecosystem | build-subjectivity-ecosystem, reportes srt5/srt6 y exports | no |
| verify-subjectivity-stack | regeneración/reescritura/restauración de timestamps; importa evaluateEcosystem del common protegido | no; no ejecutado |
| verify-subjectivity-consolidation | escritor propio, importa evaluateEcosystem/SYSTEM_ROOT/RELEASE_ROOT del common; superficie git ajena a esta entrega | no; no ejecutado |
| verify-phenomenal-bridge-scaffolding | comprobaciones de lectura; no escritor propio encontrado | lectura; no cubre cadena |
| verify-phenomenal-bridge-surfaces | crea/borra artifacts/phenomenal_bridge/_synthetic_verify; materializa reportes con harness/loader | no |
| verify-phenomenal-bridge-interventions | invoca scaffolding/surfaces y, si faltan outputs o --write, builder adversarial | no |
| verify-phenomenal-bridge-reducibility | invoca interventions y consume outputs canónicos | no |
| verify-phenomenal-bridge-gate | invoca reducibility y, si hace falta, build-phenomenal-bridge-root | no |
| verify-phenomenal-bridge-ecosystem | invoca gate | no |
| verify-phenomenal-bridge-final-audit | invoca ecosystem y cadena anterior | no; no ejecutado |

La familia phenomenal usa adicionalmente
`src/phenomenal_bridge/PhenomenalBridgeInputBundleLoader.js` y builders/harnesses con
`ensurePhenomenalBridgeBaselineReports`/outputDir por defecto; una migración
completa debe pasar rutas explícitas por todo ese grafo de productores y lectores.
La dependencia directa de `ecosystem-release-common.cjs` está en stack y
consolidation de subjectivity. No se leyó ni modificó ese archivo protegido.
Los escritores cubiertos siguen siendo los opt-in de B0; sus pruebas de política
de salida pasan dentro de npm test. Los dos final audits quedan `not_recorded`,
conforme a la condición de ejecutarlos sólo si la cadena completa va a TEMP.

## Reproducción de comandos

Antes de cada lote se fijó un directorio TEMP; cada invocación del sandbox puede
tener un TEMP distinto. Los assets de build en dist/raíz son outputs operacionales
necesarios; no son reportes JSON experimentales.

```powershell
$env:QICN_REPORT_DIR = Join-Path $env:TEMP 'qicn-b4-b5-audit'
New-Item -ItemType Directory -Force $env:QICN_REPORT_DIR | Out-Null
$env:QICN_BRIDGE_LOCAL_ONLY = '1'
$env:BUILD_MODE = 'production'
npm run build
npm test
npm run lint
npm run verify:source-of-truth -- --out="$env:QICN_REPORT_DIR\source-of-truth.json"
npm run verify:descriptor-registry
npm run verify:claim-surface-boundaries
npm run verify:policies
npm run test:tower-math
npm run bridge:verify
npm run verify:operational-readiness -- --out="$env:QICN_REPORT_DIR\readiness.json"
npm run smoke:operational -- --out="$env:QICN_REPORT_DIR\smoke.json"
npm run verify:comparative-program-closure
node scripts/build-module-inventory.mjs --check
node scripts/scoreboard.cjs --json-file="$env:QICN_REPORT_DIR\scoreboard.json"
node scripts/run-full-cycle-language-ablation.mjs --ticks=80 --nodes=250 --seeds=11 --self-test --out="$env:QICN_REPORT_DIR\full-cycle.json"
node scripts/run-historical-dependence-ablation.mjs --out="$env:QICN_REPORT_DIR\historical.json"
node scripts/run-state-restore-equivalence.mjs --seeds=11 --k=30 --m=30 --nodes=80 --cost-nodes=1500 --out="$env:QICN_REPORT_DIR\restore.json"
node scripts/run-micro-experiment-workbench.mjs --profile=paired_intervention --seed=11 --nodes=24 --warmup=40 --ticks=12 --out="$env:QICN_REPORT_DIR\workbench.json"
git --no-optional-locks diff --check
git --no-optional-locks status -s -uall
```

Las suites individuales se ejecutaron con `node tests/<nombre>.test.mjs`:
language-grounded-conversation.v2, language-semantic-contract.v3,
language-free-contract.v4, theory-runtime-coherence-and-persistence.v3, simulation-cycle-driver-equivalence.v1,
workbench-isolation.v1, workbench-determinism.v1, workbench-interventions.v1,
workbench-integrity.v1, workbench-history-controls.v1,
language-factual-verifier.v1, language-evidential-contract.v1,
language-system-b-compatibility.v1, workbench-language-invariance.v1,
language-system-b-ui.v1, workbench-browser-client.v1,
workbench-worker-packaging.v1 y browser-workbench.v1.

## Archivos y trazabilidad

Se añadieron dos filas **artifact_only** al registro: AO_browser_workbench y
AO_system_b_chat_ui. No alimentan gates ni claim projections. El enum de alcance
admite internal_support_only sin reclasificar las filas existentes. Se revisaron
registro, trazabilidad, inventario de implementación, controles y contratos.
No cambiaron señales primarias, evaluadores canónicos ni contratos históricos.

Estado de archivos de la entrega (M: modificado; ??: nuevo), sin staging:

```text
 M .gitignore
 M build.cjs
 M docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md
 M docs/DESCRIPTOR_REGISTRY.md
 M docs/IMPLEMENTATION_STATUS.md
 M docs/LANGUAGE_SYSTEM_B_CONTRACT_V5.md
 M docs/TRACEABILITY_MATRIX.md
 M docs/WORKBENCH_AND_SYSTEM_B_PREREGISTRATION.md
 M docs/WORKBENCH_EXECUTION_CONTRACT.md
 M docs/descriptor_registry.v1.json
 M scripts/sync-netlify-assets.cjs
 M scripts/validate-descriptor-registry.cjs
 M src/components/SimulationEngine.jsx
 M src/language/evidential/claimGrammar.js
 M src/language/evidential/epistemicPolicy.js
 M src/language/evidential/factualVerifier.js
 M src/language/evidential/realization.js
 M src/language/evidential/reasoningPlan.js
 M src/language/moduleInventory.generated.js
 M src/persistence/dynamicState.js
 M src/workers/microExperiment.worker.js
 M sw.js
 M tests/engine-language-decoupling.v1.test.mjs
 M tests/language-evidential-contract.v1.test.mjs
 M tests/language-system-b-compatibility.v1.test.mjs
?? docs/WORKBENCH_SYSTEM_B_B4_B5_DELIVERY_AUDIT.md
?? src/components/EvidentialConversation.jsx
?? src/components/MicroExperimentWorkbench.jsx
?? src/experiments/workbench/browserClient.js
?? src/experiments/workbench/liveCapture.js
?? src/hooks/useMicroExperimentWorkbench.js
?? tests/browser-workbench.v1.test.mjs
?? tests/browser/workbenchHarness.jsx
?? tests/language-system-b-ui.v1.test.mjs
?? tests/workbench-browser-client.v1.test.mjs
?? tests/workbench-worker-packaging.v1.test.mjs
```

Sólo se añadieron/actualizaron las pruebas directamente implicadas y sus guardas
explícitas; la guarda de compatibilidad en `tests/language-system-b-compatibility.v1.test.mjs`
conserva congelados `v1/v2/v3/v4`, `freeRealization`, `realizationContract`,
`runtimeSnapshot` y preregistros JSON sin cambios.
Los directorios/archivos excluidos por el usuario no se tocaron.

## Pendiente para revisión final del usuario

Estado general: `implemented_internal_support`; la superficie de navegador y la prueba
en vivo contra `local-sandbox-server.mjs` ya quedaron ejercitadas localmente en esta
máquina (Windows / Edge CDP y proxy `gemini-3-flash-preview`), manteniendo
`external_support_certified = false` y la repetición en Node 22 + revisión final
humana listas antes de hacer commit en `codex/workbench-system-b`.
