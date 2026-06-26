# SECURITY — Superficie LLM (prompt-injection / output-manipulation)

Estado: `internal_support_only`. Este documento mapea vectores reales de
prompt-injection y manipulacion de salida en las superficies operativas LLM del
runtime, distingue lo que YA existe de lo que es **gap**, y deja un plan de como
se integraria [Garak](https://github.com/NVIDIA/garak) cuando el runtime madure.

Las superficies LLM son **superficies operativas de control**, no superficies de
evidencia cientifica fuerte (ver `AGENTS.md` > Non-Claims Discipline). Nada en
este documento debe leerse como validacion externa ni como proteccion cerrada.

Alcance del mapa (codigo leido directamente):

- `netlify/functions/llm-proxy.js`
- `netlify/functions/lib/integrity-c2.js`
- `netlify/functions/selfpatch-generate.js`
- `netlify/functions/selfpatch-apply.js`
- libs de apoyo: `netlify/functions/lib/selfpatch-common.js`,
  `netlify/functions/lib/risk-classifier.js`,
  `netlify/functions/lib/selfpatch-governor.js`

---

## 1. Modelo de amenaza (resumen)

Tres familias relevantes para estas superficies:

1. **Prompt-injection (entrada)**: contenido controlado por el cliente/usuario
   (mensajes, objetivo, snapshots de archivos) que se concatena dentro del prompt
   enviado al modelo, pudiendo subvertir las instrucciones del sistema.
2. **Output-manipulation (salida)**: respuesta del modelo o del upstream
   alterada/forjada que el runtime consume (texto devuelto, o un parche de codigo
   que se aplica al repositorio).
3. **Confused-deputy / exfiltracion**: una salida inducida que provoca que una
   superficie con privilegios (selfpatch escribiendo en el repo, o el proxy con
   la API key del servidor) actue en favor del atacante.

---

## 2. llm-proxy.js

Flujo: `handler` -> auth gate -> `validateBody` -> (opcional C2) -> `toGeminiPayload`
-> `fetch` a Gemini -> (opcional `verifyC2Echo`) -> respuesta.

### Vectores

| ID | Vector | Tipo | Ubicacion real |
| --- | --- | --- | --- |
| LP-1 | `messages[].content` se concatena al prompt sin sanitizar ni escapar (`String(msg.content || '')`); un mensaje `user`/`system` puede inyectar instrucciones | prompt-injection (entrada) | `toGeminiPayload()` |
| LP-2 | `systemInstruction` del cliente se fusiona con el contrato del servidor (`appendSystemContract`); el orden/append no impide que texto previo intente anular el contrato | prompt-injection (entrada) | `appendSystemContract()` |
| LP-3 | El `content` de la respuesta del modelo se devuelve tal cual al cliente sin filtrado de salida | output-manipulation (salida) | bloque "Exito" en `handler` |
| LP-4 | `rawPayload` permite que el cliente pase un payload Gemini arbitrario (bypass del mapeo de mensajes) | prompt-injection (entrada) | `toGeminiPayload()` (rama `input.rawPayload`) |

### Lo que YA existe (controles reales, no proteccion completa)

- **Auth gate**: `requireUser()` exige usuario Netlify o JWT `Bearer` no expirado
  cuando `AUTH_REQUIRED != false`. Reduce exposicion anonima, no la inyeccion.
- **Validacion de esquema**: `validateBody()` rechaza body/provider/model/messages
  mal formados (`INVALID_*`). Es validacion estructural, **no** de contenido.
- **Strict model enforcement**: con `GEMINI_STRICT_MODEL` (default true) se rechaza
  cualquier modelo distinto al permitido (`STRICT_MODEL_ENFORCED`).
- **Guard de manipulacion de salida C2 (HMAC echo)**: cuando
  `INTEGRITY_THREAT_MODEL=C2`, `buildC2ContractBlock()` inyecta un bloque firmado
  (HMAC-SHA256 sobre el packet canonical + nonce + requestId + runId + hashes) y
  `verifyC2Echo()` (en `integrity-c2.js`) **rechaza** (HTTP 422
  `C2_INTEGRITY_REJECTED`) cualquier respuesta cuyo eco no coincida byte a byte o
  cuya firma no valide. Esto detecta **alteracion/forja de la salida** del upstream.
  - Cobertura de regresion EXISTENTE: `tests/integrity-c2-proxy.v56.test.js`
    (CASE 1 acepta eco valido; **CASE 2 rechaza** packet alterado + firma
    recomputada; CASE 3 falla en C2 sin secreto).

### Gaps (NO existe proteccion)

- **GAP-LP-A (input sanitization)**: no hay sanitizacion/escape ni deteccion de
  patrones de prompt-injection sobre `messages[].content`, `systemInstruction` del
  cliente, ni `rawPayload`. El proxy confia en la separacion `systemInstruction` vs
  `contents` de Gemini, que NO es una barrera de seguridad.
- **GAP-LP-B (output content filtering)**: en modo **C1** (default segun
  `.env.example`) no hay verificacion de integridad ni filtrado de la salida; el
  guard C2 solo actua si `INTEGRITY_THREAT_MODEL=C2`.
- **GAP-LP-C (rate limiting)**: el proxy no aplica rate limit por usuario; un
  cliente autenticado puede abusar de la key del servidor.

> Nota: el guard C2 es un control de **integridad de salida** (deteccion de
> manipulacion/forja via HMAC), **no** un sanitizador de prompt-injection. No
> debe presentarse como mitigacion de GAP-LP-A.

---

## 3. selfpatch-generate.js

Flujo: auth -> `parseJsonBody` -> `hydrateFileSnapshots` -> `validateBody` ->
`classifyPatchRisk` -> prompt -> upstream (OpenAI/Gemini) -> `parseModelJson` ->
`validateResponseShape` -> parche propuesto.

### Vectores

| ID | Vector | Tipo | Ubicacion real |
| --- | --- | --- | --- |
| SG-1 | `objective`, `constraints`, `targetFiles`, `fileSnapshots` del cliente se serializan dentro del prompt (`buildPatchPromptText`) sin sanitizar | prompt-injection (entrada) | `buildPatchPromptText()` |
| SG-2 | La salida del modelo se parsea como JSON extrayendo el primer `{` y ultimo `}` (`parseModelJson`); contenido fuera de llaves se ignora pero el JSON interno es atacante-controlado | output-manipulation (salida) | `parseModelJson()` |
| SG-3 | `replacement` de cada edit es texto arbitrario generado por el modelo que luego puede aplicarse al repo | output-manipulation -> confused-deputy | `validateResponseShape()` + consumo en apply |

### Lo que YA existe

- **Auth gate** (`requireUser`) y **dry-run por defecto** salvo modo
  `sandbox_unrestricted` (`SELF_PATCH_GENERATION_DRY_RUN`).
- **Clasificacion de riesgo**: `classifyPatchRisk()` rechaza parches `high` o no
  permitidos antes de llamar al modelo (`risk_policy_rejected`).
- **Path containment en hidratacion**: `hydrateFileSnapshots()` resuelve rutas con
  `path.resolve(process.cwd(), ...)` y exige `absolutePath.startsWith(process.cwd())`.
- **Validacion estructural de la salida**: `validateResponseShape()` exige
  `edits[]` con `file/base_sha/op/start_line/end_line` y `op` en
  `{replace,insert,delete}`.

### Gaps

- **GAP-SG-A**: sin sanitizacion de los campos del cliente embebidos en el prompt
  (SG-1). La validacion es estructural, no de contenido/intencion.
- **GAP-SG-B**: `validateResponseShape()` valida forma, no semantica peligrosa del
  `replacement` (p.ej. introducir codigo malicioso/backdoor que pase los tests).

---

## 4. selfpatch-apply.js

Flujo: auth -> `parseJsonBody` -> `validatePatch` -> `classifyPatchRisk` ->
killswitch quorum -> dry-run gate -> killswitch quorum (pre-write) ->
`applyPatchLocally` o `createBranchAndPr`.

### Vectores

| ID | Vector | Tipo | Ubicacion real |
| --- | --- | --- | --- |
| SA-1 | `patch.edits[].file` / `replacement` provienen (indirectamente) de salida de modelo y se aplican al filesystem o a GitHub | output-manipulation -> confused-deputy | `applyPatchLocally()`, `createBranchAndPr()` |
| SA-2 | Escritura de archivos en disco local cuando `SELF_PATCH_LOCAL_APPLY`/modo sandbox | privilegio de escritura | `applyPatchLocally()` |

### Lo que YA existe

- **Auth gate** (`requireUser`).
- **Path-escape guard**: `applyPatchLocally()` normaliza y exige
  `absolutePath.startsWith(projectRoot)` (`local_apply_path_escape`), con backup y
  rollback best-effort ante error.
- **Proteccion de rutas criticas**: `validatePatch()` rechaza ediciones sobre
  rutas protegidas (`PROTECTED_PATH_TOUCHED`, via `isProtectedPath`).
- **Gate de riesgo + aprobacion manual**: `medium` exige `body.approved`
  (`manual_approval_required`); `high`/no permitido se rechaza.
- **Killswitch quorum doble**: `evaluateKillSwitchQuorum()` (blob + GitHub var) en
  entrada y justo antes de la escritura (`KILLSWITCH_BLOCKED*`, HTTP 423); fallback
  local `QICN_KILLSWITCH`.
- **base_sha check** contra deriva en el flujo GitHub (`base_sha_mismatch`).
- **Dry-run por defecto** salvo modo sandbox (`SELF_PATCH_APPLY_DRY_RUN`).
- Cobertura de regresion EXISTENTE de politica/killswitch/quorum:
  `tests/selfpatch-policy-check.v415.test.js`,
  `tests/selfpatch-killswitch-quorum.v415.test.js`,
  `tests/selfpatch-codeowners-enforcement.v415.test.js`,
  `tests/selfpatch-rate-limit.v415.test.js`,
  `tests/selfpatch-token-budget.v415.test.js`,
  `tests/selfpatch-rollback-mode.v415.test.js`.

### Gaps

- **GAP-SA-A**: no hay analisis de contenido del `replacement` (un parche
  malicioso semanticamente valido y fuera de rutas protegidas podria aplicarse).
- **GAP-SA-B**: la deteccion de manipulacion de salida del modelo (LP/SG) no se
  propaga a apply; apply confia en la forma del parche y en los gates de
  riesgo/killswitch, no en la procedencia del contenido.

---

## 5. Decision sobre test de regresion (Tier 3.2)

Criterio: anadir un test de regresion de inyeccion **solo si ya existe
sanitizacion de input/output** en el proxy y se puede ejercitar **logica
existente** (sin anadir logica de seguridad nueva).

Resultado tras leer el codigo:

- **Input sanitization: NO existe** (GAP-LP-A). No hay logica que rechace/escape un
  payload de prompt-injection que se pueda testear.
- **Output-manipulation: existe** el guard C2 (`verifyC2Echo`), pero su rechazo
  (HTTP 422 `C2_INTEGRITY_REJECTED`) **ya esta cubierto** por
  `tests/integrity-c2-proxy.v56.test.js` (CASE 2, payload forjado).

Por tanto **NO se anade** un test nuevo (seria redundante con la cobertura C2
existente y daria falsa impresion de proteccion anti-inyeccion inexistente). El
gap queda documentado aqui. Conteo de tests sin cambios.

---

## 6. Plan de integracion de Garak (futuro, cuando madure el runtime)

Garak (LLM vulnerability scanner de NVIDIA) se integraria como campana de probing
externa contra la superficie del proxy, **no** como dependencia de runtime.
Distincion clave: Garak seria `external_dependency` / evidencia de campana; nada
de esto cierra claims internos por si mismo.

Fases propuestas:

1. **Prerrequisitos (cerrar gaps minimos primero)**: implementar y testear una
   capa de sanitizacion/normalizacion de entrada en `llm-proxy.js` (mitigar
   GAP-LP-A) y filtrado/etiquetado de salida (GAP-LP-B), antes de que un probe
   externo tenga algo que validar. Sin esto, Garak solo confirmaria el gap.
2. **Harness CI-only y aislado**: workflow manual (`workflow_dispatch`) que levante
   el proxy contra un upstream **mock/stub** (sin API keys reales, sin red a
   Google) y ejecute Garak con un set acotado de probes de prompt-injection y
   leakage. Garak corre en su propio contenedor/venv: CERO deps npm de runtime.
3. **Probes iniciales**: `promptinject`, `dan`/jailbreak, `leakreplay` y
   exfiltracion de system prompt, mapeados contra LP-1..LP-4.
4. **Modo report primero**: resultados como artefacto; NO bloqueante. Promocion a
   bloqueante solo para probes de alta confianza tras revisar findings, de forma
   analoga a los scanners de este lote (gitleaks/osv/semgrep).
5. **Trazabilidad**: registrar hallazgos como `high_risk_control_surface` /
   `not_recorded` segun corresponda; nunca promover a `external_validation`.

Hasta que existan los prerrequisitos de la fase 1, Garak queda como **gap
planificado**, no como control activo.

---

## 7. Resumen de estado

| Superficie | Control de entrada | Control de salida | Estado |
| --- | --- | --- | --- |
| llm-proxy (C1, default) | schema + auth | ninguno | `partial_runtime_path` + gaps LP-A/B/C |
| llm-proxy (C2) | schema + auth | HMAC echo (`verifyC2Echo`) | `implemented_tested` (solo integridad de salida) |
| selfpatch-generate | schema + risk + dry-run | shape validation | `partial_runtime_path` + gaps SG-A/B |
| selfpatch-apply | schema + risk + approval + killswitch + path guard | shape + protected-path | `implemented_tested` (gates) + gaps SA-A/B |
| Garak | n/a | n/a | `external_dependency` planificado (gap) |
