# Entrega 3 — B3 / Sistema B v5: auditoría

claim_scope: optional_internal_language_verification  
evidence_scope: internal_support_only  
external_support_certified: false

interpretation_boundary: pruebas de ingeniería de hechos tipados, propuestas
abiertas y no interferencia; no validación externa, certificación fenomenal,
verdad filosófica, run_verdict ni batch_enforcement.

## Checkpoint y entrega

Rama codex/workbench-system-b; HEAD permanece en
5dfddd5b2b101865621c4d10f8177ff260b8813b; main local permanece en
4142610792c51a171db3b965ff314646fa5535c1. Árbol inicialmente limpio.
No se ejecutaron comandos de escritura en git. Los cambios quedan sin stage
para auditoría. La entrega se detiene antes de B4.

Se implementan los seis módulos evidential solicitados, tres baterías nuevas,
invariancia v5 y contrato opcional en conversationEngine. propositions y
definitionCatalog sólo añaden superficies separadas para v5. El chat sigue
solicitando free/v4; el default histórico del helper prepareTurn sigue siendo
verified/v3. No se cambian UI, transporte, scripts de empaquetado ni sw.js.

La extracción adicional de resultVerifier y trajectoryComparison evita que
evidenceRegistry importe el ejecutor/restaurador o módulos de simulación.
Conserva los algoritmos B2 y sus exports existentes. La compatibilidad recorre
el grafo transitivo y comprueba esta separación.

Contrato, tipos, límites, roles Gemini/local, evidencias, parcial y fallos:
[LANGUAGE_SYSTEM_B_CONTRACT_V5.md](LANGUAGE_SYSTEM_B_CONTRACT_V5.md).

## Pruebas y salidas registradas

Extractos crudos de las comprobaciones finales dirigidas:

~~~text
OK: factual verifier 46 checks; complete digest/tick, numbers/signs/comparisons/algebra, ledger, bound/measurement separation and module-operation-scope authority
OK: evidential contract 31 adversarial evaluations; novel argument published verbatim, 4 parts, honest absence, two poles, correction/dependency-safe graceful and verified B2 evidence
OK: frozen v2/v3(87)/v4(95), API/helper and chat defaults, v1/legacy/B4 surfaces intact; explicit v5 only; evidence registry has no executor dependency
OK: v5 preparation/publication consumes no global clock/RNG/network/timers, writes no ledger and does not freeze/mutate caller data
OK: cn4_maxAbsDiff=0, same decisions/full state/RNG/clocks for local, v3, v4 and v5 valid/rejection/correction/graceful paths
[module-inventory] up to date
~~~

Las tres preguntas/argumentos filosóficos de prueba no pertenecen a un catálogo
de respuestas. Sus textos nuevos se publican literalmente como propuestas,
con hechos insertados localmente. Una etiqueta verified de Gemini, una negación
o OPEN_FRAME no validan cifras ni atribución. El parcial retira el hecho falso,
su argumento dependiente y su dependiente transitivo; conserva las cuatro
partes y ambos polos. Un sham sin intervención declara not_recorded.

Compatibilidad ejecutada sin modificar sus baterías:

~~~text
OK: language grounded conversation v2 test passed
OK: language semantic contract v3 test passed (87 cases, 0 false accepts, 0 false rejects)
OK: language free contract v4 test passed (95 cases, 0 false accepts, 0 false rejects)
~~~

Suite completa en este sandbox, Node v24.6.0:

~~~text
[headless] OK: extracted cycle ran 5 ticks without throwing and emitted state.
[tests] Failed: 1/187
 - tests\local-static-boundary.test.js
  [cause]: Error: connect EACCES 127.0.0.1:59669
    code: 'EACCES',
NPM_TEST_EXIT=1
~~~

Resultado: 186/187 módulos aprobados; único fallo por loopback del sandbox.
local-static-boundary no se cambió ni omitió. No se etiqueta npm test como PASS.
Node 22.x canónico no se verificó en este entorno.

| Comando | Resultado |
| --- | --- |
| npm run lint | EXIT=0 |
| npm run build | EXIT=0; JS/CSS/sync/encoding |
| node scripts/build-module-inventory.mjs --check | PASS; regenerado, 290 archivos / 730 nombres |
| verify:source-of-truth | EXIT=0 |
| verify:descriptor-registry | EXIT=0, 23 filas |
| verify:claim-surface-boundaries | EXIT=0; también escaneo dirigido de los módulos/documentos nuevos |
| verify:policies | EXIT=0 |
| test:tower-math | EXIT=0; digest de acoplamiento conservado |
| bridge:verify | EXIT=0 con QICN_BRIDGE_LOCAL_ONLY=1; upstream no certificado |
| verify:operational-readiness | EXIT=0, incluidos escritores hijos en TEMP |
| verify:comparative-program-closure | EXIT=0 |
| smoke:operational | EXIT=0 |
| scoreboard (inspect) | EXIT=0, 7/7 dimensiones; no sustituye tests/build |
| git diff --check | EXIT=0 |

Digest observado en test:tower-math:

    2e6560af1a0c455d32df4eeec250f38beaeeff18cd854269712afc1835487922

## Ablaciones conservadas

Histórico v1 original, 420/180/250, semillas 11,23,37,41,53, reporte TEMP:

~~~json
{
  "seedsMeetingActionDiv": 5,
  "seedsMeetingAnchorShift": 5,
  "seedsMeetingViabGain": 4,
  "meanEvalActionDivergence": 0.54,
  "meanProbeActionDivergence": 0.25,
  "meanAnchorL2Distance": 1.071182,
  "meanDeltaInTubeRate": 0.106667,
  "meanDeltaObjectiveScore": 0.040588,
  "cn1_stationary_sham": true,
  "cn2_frozen_predictor": true,
  "cn3_erased_history": false,
  "cn4_language_decoupling": true,
  "cn4_maxAbsDiff": 0,
  "allPreregisteredCriteriaPass": false
}
~~~

HISTORICAL_EXIT=0 indica ejecución completada, no éxito de la hipótesis:
CN-3 y allPreregisteredCriteriaPass siguen false. No se modificaron umbrales,
semillas, script ni protocolo. No se evaluaron semillas held-out.

Ciclo completo, seed=11, 80 ticks/250 nodos, --self-test:

~~~text
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
FULL_CYCLE_EXIT=0
~~~

La ablación anterior comprueba los canales existentes. El test Workbench
ampliado comprueba separadamente v5 válido/rechazado/corregido/parcial, con
cn4_maxAbsDiff=0, decisiones/estado completo y cursores idénticos.

## Reproducción y outputs

Se crearon los directorios de cada ejecución antes de invocar sus escritores.
QICN_REPORT_DIR y --out apuntaron siempre a TEMP; QICN_BRIDGE_LOCAL_ONLY=1 evitó
sondeos upstream. Ningún reporte JSON de ejecución se guardó en artifacts/ o docs/.
Los prefijos TEMP de los comandos siguientes están normalizados; variaron entre
invocaciones del sandbox.

~~~powershell
$taskDir = Join-Path $env:TEMP 'qicn-b3-audit'
New-Item -ItemType Directory -Force $taskDir | Out-Null
$env:QICN_REPORT_DIR = $taskDir
$env:QICN_BRIDGE_LOCAL_ONLY = '1'

node scripts/build-module-inventory.mjs
node scripts/build-module-inventory.mjs --check
node tests/language-factual-verifier.v1.test.mjs
node tests/language-evidential-contract.v1.test.mjs
node tests/language-system-b-compatibility.v1.test.mjs
node tests/workbench-language-invariance.v1.test.mjs
node tests/language-grounded-conversation.v2.test.mjs
node tests/language-semantic-contract.v3.test.mjs
node tests/language-free-contract.v4.test.mjs
npm test
npm run lint
npm run build
npm run verify:source-of-truth
npm run verify:descriptor-registry
npm run verify:claim-surface-boundaries
node scripts/verify-claim-surface-boundaries.cjs src/language/evidential src/experiments/workbench/resultVerifier.js src/experiments/workbench/trajectoryComparison.js docs/LANGUAGE_SYSTEM_B_CONTRACT_V5.md docs/LANGUAGE_SYSTEM_B_B3_DELIVERY_AUDIT.md
npm run verify:policies
npm run test:tower-math
npm run bridge:verify
npm run verify:operational-readiness
npm run verify:comparative-program-closure
npm run smoke:operational
node scripts/scoreboard.cjs --runtime-probe "--json-file=$taskDir\scoreboard.json"
node scripts/run-full-cycle-language-ablation.mjs --self-test --ticks=80 --nodes=250 --seeds=11 "--out=$taskDir\language.json"
node scripts/run-historical-dependence-ablation.mjs --warmup=420 --eval=180 --nodes=250 --seeds=11,23,37,41,53 "--out=$taskDir\historical-v1.json"
git --no-optional-locks diff --check
git --no-optional-locks status -s -uall
git --no-optional-locks rev-parse HEAD main
~~~

## Límites y pendientes explícitos

- implemented_tested: gramática soportada, verificación factual, integración
  opcional, dependencias, pruebas y no interferencia.
- partial_runtime_path: reconocimiento semántico de prosa arbitraria; el filtro
  conservador puede rechazar formulaciones inocuas y no prueba exhaustividad
  sobre cualquier paráfrasis. Sólo los átomos factuales son autoridad verificada.
- external_dependency: Gemini como canal real. Publicación y calidad con
  proveedor real son not_recorded; las pruebas usan respuestas sintéticas
  con la forma de salida del modelo, no una campaña externa.
- not_recorded: B4, selector UI/worker en navegador y su empaquetado. No se
  tocaron build.cjs, sync-netlify-assets.cjs ni sw.js.
- verify:subjectivity-stack y verify:phenomenal-bridge-final-audit siguen
  pendientes por escritores anidados con rutas fijas sin routing TEMP completo.
  No se invocaron ni se modificó ecosystem-release-common.cjs.

No cambian implementación dinámica, RECOMPUTED_EACH_TICK legacy, persistencia
v3, SHA de snapshots/ledger, protocolos históricos ni canon externo. Las
superficies de registro y gates existentes se revisaron documentalmente; no
se añadieron filas al mínimo descriptor_registry.v1.json ni se cambiaron sus
contratos. Todas las rutas protegidas permanecen fuera del diff.

## Estado final del árbol

Salida de git status -s -uall (incluye esta auditoría):

~~~text
 M docs/ADMISSIBILITY_GATES_AND_NEGATIVE_CONTROLS.md
 M docs/DESCRIPTOR_REGISTRY.md
 M docs/IMPLEMENTATION_STATUS.md
 M docs/TRACEABILITY_MATRIX.md
 M docs/WORKBENCH_AND_SYSTEM_B_PREREGISTRATION.md
 M src/experiments/workbench/metrics.js
 M src/experiments/workbench/runner.js
 M src/language/conversationEngine.js
 M src/language/definitionCatalog.js
 M src/language/moduleInventory.generated.js
 M src/language/propositions.js
 M tests/workbench-language-invariance.v1.test.mjs
?? docs/LANGUAGE_SYSTEM_B_B3_DELIVERY_AUDIT.md
?? docs/LANGUAGE_SYSTEM_B_CONTRACT_V5.md
?? src/experiments/workbench/resultVerifier.js
?? src/experiments/workbench/trajectoryComparison.js
?? src/language/evidential/claimGrammar.js
?? src/language/evidential/epistemicPolicy.js
?? src/language/evidential/evidenceRegistry.js
?? src/language/evidential/factualVerifier.js
?? src/language/evidential/realization.js
?? src/language/evidential/reasoningPlan.js
?? tests/fixtures/evidentialFixtures.mjs
?? tests/language-evidential-contract.v1.test.mjs
?? tests/language-factual-verifier.v1.test.mjs
?? tests/language-system-b-compatibility.v1.test.mjs
~~~

12 archivos modificados y 14 nuevos; todos sin stage. No se hizo commit ni push.

Cierre sobre el código final: npm test terminó nuevamente con EXIT=1 y el único fallo local-static-boundary (EACCES 127.0.0.1:59669); npm run build terminó EXIT=0. El inventario quedó up to date, lint EXIT=0, escaneo ampliado de claim boundaries PASS (10 archivos) y git diff --check EXIT=0. La rama/HEAD/main se verificaron sin escribir metadatos git.
