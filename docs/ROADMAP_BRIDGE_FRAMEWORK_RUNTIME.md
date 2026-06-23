# Roadmap: Puente Framework <-> Runtime (QICN-FRAMEWORK <-> QICN-SYSTEM)

Version: 1.0 | Fecha: 2026-06-23 | Estado: PLAN_ACTIVO
Idioma: espanol. Posture: anti-inflacion, interno != externo.

## 0. Proposito y frontera (leer primero)

Este roadmap cubre UNA sola cosa: el **puente vivo y trazable entre los dos
repositorios**:

- `QICN-FRAMEWORK/rigid-identity-framework/` — corpus teorico (LaTeX), registro
  formal (registry/), formalizacion Lean, gates de release.
- `QICN-SYSTEM/` — runtime operacional (este repo): dinamica, estimadores de
  invariantes, harness de admisibilidad, programas comparativos.

### Que NO es este documento (no redundancia)
- NO es el plan de convergencia teoria<->codigo: eso es `PLAN_CONVERGENCIA_TEORIA_SISTEMA.md` (ya ejecutado, v4.0).
- NO es el roadmap de profesionalizacion (arquitectura/testing/calidad): eso es `ROADMAP_PROFESIONALIZACION.md`.
- NO es el ledger de gaps teoria-runtime: eso es `THEORY_RUNTIME_GAP_LEDGER.md` (lo CONSUME, no lo reescribe).
- NO es el status por capa: eso es `IMPLEMENTATION_STATUS.md`.

Cuando una tarea pertenezca a esos documentos, se referencia y se defiere; aqui
solo vive lo especifico del puente inter-repo.

### Sello de gobernanza (no negociable)
- El puente NO certifica nada externamente. Mover datos del runtime al scaffold
  empirico del framework produce **datos candidatos internos**, nunca validacion
  externa ni cierre de claim.
- `external_support_certified=false` y `FULL_COP_MEMBERSHIP: NOT_YET` permanecen
  intactos en ambos lados.
- Ningun artefacto del puente eleva un estimador runtime a teorema, ni un teorema
  a evidencia externa. Separacion de capas siempre.

## 1. Estado actual del puente (medido)

| Hecho | Valor |
|---|---|
| Import framework->runtime | `qicn_imported_manifest_v39.json`: 217 archivos, content-hashed, 0 mismatches |
| Modo del import | `non_destructive_quarantine_import` (snapshot puntual 2026-06-01) |
| Direccion runtime->framework | NO existe canal sistematico |
| Deteccion de drift | manual (commits "close inter-repo drift"), NO automatizada |
| Trazabilidad teorema<->estimador | parcial, narrativa en THEORY_RUNTIME_GAP_LEDGER (no machine-checkable bidireccional) |
| Pin de canon | `QICN-RELEASE/main@92d5d2c3...` documentado en CANON_SOURCE_OF_TRUTH.md |

**Diagnostico:** el puente hoy es un snapshot unidireccional. Falta: deteccion de
drift automatica, trazabilidad bidireccional verificable, y un canal limpio para
que datos del runtime alimenten el scaffold G1.1 del framework.

## 2. Fases

Cada fase: objetivo acotado, entregables, gate de salida, y "no hace". Disciplina
de fase: inventario -> implementacion acotada -> verificacion -> entrada en
`IMPLEMENTATION_LOG.md`. No avanzar sin pasar el gate.

---

### FASE 0 — Contrato del puente (sin codigo)
Objetivo: declarar explicitamente que fluye en cada direccion y bajo que reglas.
- Entregable: `docs/BRIDGE_CONTRACT.md` — tabla de flujos (framework->runtime:
  registry, theorem IDs, macros, predicciones; runtime->framework: datos
  candidatos de coleccion admisible), con el commit del framework pineado.
- Entregable: registrar el hash del commit del framework vigente como `bridge_pin`.
- Gate: el contrato lista cada flujo con su formato, su direccion y su sello de
  capa (interno/candidato). Revisado por el autor.
- No hace: no implementa scripts; no mueve datos.

### FASE 1 — Deteccion de drift (framework -> runtime)
Objetivo: detectar automaticamente cuando los artefactos importados divergen del
framework vivo en el commit pineado.
- Entregable: `scripts/verify-framework-import-drift.cjs` — re-hashea los archivos
  bajo `qicn_imported_*` y compara contra `qicn_imported_manifest_v39.json` y
  contra el framework en `bridge_pin`. Con `--self-test`.
- Entregable: alias `npm run bridge:verify-drift`.
- Gate: drift report = 0 mismatches, o allowlist explicita y justificada de
  divergencias intencionales. EXIT 0.
- No hace: no re-importa ni sincroniza automaticamente (eso seria destructivo sin
  revision); solo reporta.

### FASE 2 — Trazabilidad bidireccional (teorema <-> estimador <-> test)
Objetivo: hacer machine-checkable el mapeo que hoy es narrativo.
- Entregable: `docs/bridge_traceability_map.v1.json` — cada fila liga: ID de
  teorema/registry de BaseCore (o nombre de teorema Lean) <-> estimador runtime
  (modulo en `src/canon/` o `src/experiments/`) <-> test(s) <-> estatus del
  THEORY_RUNTIME_GAP_LEDGER.
- Entregable: `scripts/verify-bridge-traceability.cjs` (+ `npm run bridge:verify-traceability`).
- Gate: (a) todo estimador de invariante runtime referencia un ID del framework;
  (b) todo objeto teorico con fila en el gap-ledger tiene estatus runtime; (c) sin
  filas huerfanas. EXIT 0.
- No hace: no cambia los estimadores ni reabre el gap-ledger; solo lo formaliza y
  verifica.
### FASE 3 — Canal runtime -> framework (datos candidatos para G1.1)
Objetivo: definir el formato por el que corridas de coleccion admisible del
runtime producen datos consumibles por el scaffold empirico G1.1 del framework
(`EXTERNAL_SESSION_ZERO_MANIFEST_SCAFFOLD_G1.1`), SIN inflar estatus.
- Entregable: `scripts/build-g1-candidate-export.cjs` — toma artefactos de
  admisibilidad (`run_verdict.json`, `ticks.ndjson`, invariant package) y emite
  un export etiquetado `CANDIDATE_INTERNAL` que valida contra el esquema de
  prediccion/preregistro del framework (`registry/prediction-schema.json`).
- Entregable: `docs/G1_CANDIDATE_EXPORT_BOUNDARY.md` — sello: estos datos son
  candidatos internos para poblar `measurement_points` del scaffold; NO son datos
  externos, NO cierran G1.1, NO certifican el bridge.
- Gate: un export de muestra valida contra el esquema del framework; el sello
  anti-inflacion esta presente; `external_support_certified` sin cambios.
- No hace: NO ejecuta una campana real (eso requiere sujetos/protocolo/adjudicacion
  externa); NO escribe dentro del repo framework (export queda en este repo, listo
  para que el autor lo lleve al framework bajo gobernanza de ese repo).

### FASE 4 — Pulido del runtime relevante al puente (acotado)
Objetivo: solo lo que sirve al puente; lo demas se defiere a ROADMAP_PROFESIONALIZACION.
- Entregable: superficie publica limpia del puente — exports explicitos en
  `src/canon/index.js` para los estimadores referenciados por la trazabilidad.
- Entregable: namespace `npm run bridge:*` consolidando drift + traceability +
  g1-export bajo `bridge:verify` (agregador).
- Gate: `npm run bridge:verify` corre las 3 verificaciones; tests siguen 146+/146+;
  `npm run build` y `verify:source-of-truth` EXIT 0.
- No hace: NO refactoriza App.jsx ni arquitectura general (eso es
  ROADMAP_PROFESIONALIZACION); NO toca `comparative_program/` ni canon calibrado.

### FASE 5 — Gate continuo del puente (CI)
Objetivo: que el puente no se degrade silenciosamente.
- Entregable: job en CI (`.github/workflows/`) que corre `npm run bridge:verify`,
  primero no-bloqueante (warn), luego bloqueante una vez estable.
- Entregable: entrada en `IMPLEMENTATION_LOG.md` cerrando cada fase.
- Gate: pipeline verde con el job del puente activo; drift y trazabilidad
  verificados en cada push.
- No hace: NO sincroniza repos automaticamente; el re-import sigue siendo accion
  manual revisada (no destructiva por defecto).

## 3. Frontera honesta (fuera de alcance del puente)

Ningun trabajo de este roadmap cierra, ni puede cerrar internamente:
- Validacion externa / revision por pares (G1.3).
- Datos empiricos reales de G1.1 (sujetos, protocolo, adjudicacion externa).
- Instancia C_op certificada, no-vacuidad de CCR, H5 general — frontera del
  framework, no del runtime.
- Equivalencia humana / Paper 10 (requiere canal humano real).

El puente mejora **trazabilidad y reproducibilidad internas** entre teoria e
implementacion. No promueve interno a externo en ningun punto.

## 4. Secuencia recomendada

0 -> 1 -> 2 son prerequisito de 3. La Fase 3 es la de mayor valor cientifico
(conecta runtime con el gap empirico abierto del framework). La Fase 4 es pulido
acotado; la 5 es sostenibilidad. No saltar la Fase 0 (el contrato evita
ambiguedad de alcance en las demas).

## 5. Trazabilidad

Cada fase cerrada se registra en `IMPLEMENTATION_LOG.md` (fecha, archivos,
comandos+resultados, gate, regresiones buscadas/encontradas, sello de gobernanza).
Commits acotados con rutas explicitas; no `git add -A`. Push tras gate verde.