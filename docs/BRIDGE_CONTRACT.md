# Bridge Contract: QICN-FRAMEWORK <-> QICN-SYSTEM

Version: 1.0 | Fecha: 2026-06-23 | Fase: 0 (Roadmap del puente, sin codigo)
Estado: CONTRATO_ACTIVO | Posture: anti-inflacion, interno != externo.
Referencia: `docs/ROADMAP_BRIDGE_FRAMEWORK_RUNTIME.md`.

## 1. Que declara este contrato

Define explicitamente que artefactos fluyen entre los dos repositorios, en que
direccion, en que formato, y bajo que sello de capa. Es el prerequisito de las
fases 1-5 (drift, trazabilidad, canal G1.1). No implementa scripts.

## 2. Repositorios y pin

| Rol | Ruta | Repo git |
|---|---|---|
| Framework (fuente teorica) | `QICN-FRAMEWORK/rigid-identity-framework/` | parent `QICN-FRAMEWORK` (origin `Darkar520/QICN-RELEASE`) |
| Runtime (implementacion) | `QICN-SYSTEM/` (este repo) | origin `Darkar520/QICN-SYSTEM` + gitlab `qicn-group/QICN-SYSTEM` |

**bridge_pin** (commit del framework que el runtime declara seguir):
ver `docs/bridge_pin.v1.json`. Pin vigente: `64ba23f` (2026-06-23).

**Estado del import actual:** `qicn_imported_manifest_v39.json` fue generado el
2026-06-01 (217 archivos, content-hashed, 0 mismatches EN SU MOMENTO). Es
ANTERIOR al pin vigente -> existe **drift conocido** (el framework avanzo desde
entonces: cierre H5, decision de modelado, refresco referee, limpieza editorial,
y eliminacion de `theorems.delta.json`). Reconciliar este drift es objeto de la
Fase 1; este contrato solo lo declara.

## 3. Flujo Framework -> Runtime (import, no destructivo)

Importacion en modo `quarantine` a carpetas `qicn_imported_*`. El runtime CONSUME
estos artefactos; no los edita en su lugar de origen.

| Artefacto framework | Destino runtime | Formato | Sello de capa |
|---|---|---|---|
| `registry/theorems.jsonl` | `qicn_imported_registry/` | JSONL | canon machine-extracted |
| `registry/macros.jsonl` | `qicn_imported_registry/` | JSONL | canon machine-extracted |
| `registry/schema.json` | `qicn_imported_registry/` | JSON Schema | contrato |
| `registry/prediction-schema.json` | `qicn_imported_registry/` | JSON Schema | contrato |
| `registry/prediction-canon-map.json` | `qicn_imported_registry/` | JSON | mapping |
| Fixtures Session-Zero sinteticas | `qicn_imported_fixtures/` (11) | JSON | sintetico/interno (NO datos reales) |
| Scripts de verificacion/audit | `qicn_imported_scripts/` (74) | JS | tooling de referencia |
| Reportes de corpus | `qicn_imported_reports/` (122) | MD/JSON | interno documentado |
| Prompts de implementacion | `qicn_imported_prompts/` (4) | MD | historico |

Nota: `qicn_imported_registry/theorems.delta.json` existe en el import pero fue
ELIMINADO del framework (artefacto de migracion one-time). Es un mismatch
esperado, a marcar en la allowlist de la Fase 1.

## 4. Flujo Runtime -> Framework (planificado, aun NO existe)

| Artefacto runtime | Destino framework | Formato | Sello de capa |
|---|---|---|---|
| Export de coleccion admisible (G1.1) | scaffold `EXTERNAL_SESSION_ZERO_MANIFEST` del framework | JSON validado contra `prediction-schema.json` | **CANDIDATE_INTERNAL** (NO datos externos, NO cierra G1.1) |

Este flujo se construye en la Fase 3. Hoy esta vacio. Regla: el export NUNCA se
escribe directamente dentro del repo framework por el runtime; queda en este repo
listo para que el autor lo lleve al framework bajo la gobernanza de ESE repo.

## 5. Sellos de gobernanza (invariantes del puente)

- El puente NO certifica nada externamente. Ningun flujo eleva interno a externo.
- `external_support_certified=false` y `FULL_COP_MEMBERSHIP: NOT_YET` permanecen
  intactos en ambos lados, antes y despues de cualquier sincronizacion.
- Las fixtures importadas son SINTETICAS; no son evidencia empirica.
- El import es no destructivo; el re-import y la reconciliacion de drift son
  acciones manuales revisadas (Fase 1), nunca automaticas.
- Separacion de capas: canon (framework) y runtime (estimadores) no se mezclan;
  el runtime referencia IDs del canon, no los redefine.

## 6. Que cierra la Fase 0

- [x] Flujos declarados en ambas direcciones con formato y sello.
- [x] Pin del framework registrado (`docs/bridge_pin.v1.json`).
- [x] Drift conocido del import v39 declarado explicitamente.
- [ ] (Fase 1) deteccion de drift automatizada.
- [ ] (Fase 2) trazabilidad bidireccional machine-checkable.
- [ ] (Fase 3) canal runtime->framework G1.1.