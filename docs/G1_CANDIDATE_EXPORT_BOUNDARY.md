# G1 Candidate Export Boundary (Bridge Phase 3)

Version: 1.0 | Fecha: 2026-06-23 | Estado: BOUNDARY_ACTIVO
Sello: NON_CANONICAL | CANDIDATE_INTERNAL | NOT_EXTERNAL_VALIDATION
external_support_certified = false | FULL_COP_MEMBERSHIP: NOT_YET

## 1. Que es esto

El canal runtime -> framework para el gap G1.1. `scripts/build-g1-candidate-export.cjs`
toma artefactos de una corrida de episodio del runtime (`run_summary.json`,
`run_header.json`, `admissibility.json`) y los moldea en la forma
`measurement_points` que espera el scaffold empirico externo del framework
(`EXTERNAL_SESSION_ZERO_MANIFEST_SCAFFOLD_G1.1.json`).

## 2. Que NO es (frontera dura, anti-inflacion)

Este export **no es evidencia externa** y **nunca puede serlo por construccion**:

- **El runtime no es sujeto valido.** Por `INSTRUCCIONES.md` 6.1 y el protocolo
  G1.1, el runtime QICN / cualquier backend LLM no puede ser el sujeto bajo
  estudio NI el juez. Auto-evaluarse es circular. Por eso el export se etiqueta
  `INTERNAL_RUNTIME_SELF_MEASUREMENT` y `admissible_as_external: false`.
- **observed_delta es una auto-medicion interna**, no un observable externo (no es
  la distancia TV bajo perturbacion targeted/sham que pide PRED-EXT-01). Lleva el
  valor real del invariante runtime, claramente marcado como interno.
- **Las predicciones y sigma nunca se fabrican.** `qicn_prediction`,
  `rival_prediction` y `measurement_sigma` quedan como placeholders de preregistro.
  Rellenarlos aqui seria calibracion circular (lo que el adjudicador v30/v31
  bloquea).
- **Status = NOT_EVALUABLE_RUNTIME_SELF_MEASUREMENT**, `dataset_origin =
  runtime_internal_self_measurement` (el caso excluido por gobernanza).

## 3. Prueba de honestidad: auto-rechazo

El script verifica `adjudicatorWouldReject(export) === true`: si el export se
pasara al adjudicador external-session-zero, seria RECHAZADO (no es
`external_dataset`, no tiene predicciones preregistradas congeladas). Esto es el
control negativo del canal: el pipe existe, pero lo que transporta es, por diseno,
inadmisible como evidencia externa. Si el export dejara de auto-rechazarse, el
script aborta con error.

## 4. Para que sirve entonces

- **Plumbing probado:** cuando un tercero ejecute un experimento externo real
  sobre un sustrato declarado, la herramienta de moldeado a `measurement_points`
  ya existe y esta testeada.
- **Mapeo trazable:** conecta los 6 invariantes canonicos (def-cop) con la forma
  de medicion del framework, extendiendo la trazabilidad de la Fase 2 al formato
  empirico.
- **Frontera ejecutable:** hace explicito y verificable por que el runtime no
  puede cerrar G1.1 por si mismo.

## 5. Mapeo de los 6 invariantes -> measurement_points

| invariant_id | nombre | metrica runtime (observed_delta_source) |
|---|---|---|
| I_per | structural_persistence | stasis_index |
| I_ri | rigid_identity | identity_stability_score |
| I_int | causal_integration | pmia |
| I_cont | operational_continuity | predictive_consistency |
| I_diff | non_null_differentiation | beth_q |
| I_leg | operational_legibility | operational_determinism_score |

## 6. Uso

```powershell
node scripts/run-episode.cjs --duration=8 --deterministic=true --tag=g1_probe
node scripts/build-g1-candidate-export.cjs --run-dir=artifacts/<run_dir>
# Output: artifacts/bridge/g1_candidate_export.v1.json (gitignored: diagnostico)
```

## 7. Deuda abierta (no cerrable por el runtime)

Poblar `measurement_points` con datos EXTERNOS reales, predicciones preregistradas
y congeladas, sigma caracterizada independientemente, y firma de un adjudicador
independiente. Eso es trabajo humano/tercero (G1.1 / G1.3), fuera del runtime.