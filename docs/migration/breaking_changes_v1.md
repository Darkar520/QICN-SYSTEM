# Breaking Changes v1 - Triada Roadmap

[INGENIERIA] Este documento lista cambios introducidos por el cierre v2.0.0 y su impacto esperado.

| Cambio | Tipo | Impacto |
|---|---|---|
| `NC3_placebo` deja de ser efecto fijo cero | Output shape compatible con campos extra | Consumidores que ignoran campos nuevos no se rompen. |
| `verify-claim-surface-boundaries.cjs` | Nuevo script | No cambia runtime; agrega verificacion de superficie gobernada. |
| `DimensionalRegistry.js` | Nuevo modulo | No modifica formulas existentes hasta integracion futura. |
| `FiniteProjectionEvaluator.js` | Nuevo modulo | No cambia claim mapping existente hasta integracion futura. |
| `BehavioralPseudometric.js` | Nuevo modulo | No reemplaza `I_ri` todavia; prepara fase de integracion. |
| `InvariantWeightCalibration.js` | Nuevo modulo | Congela pesos como heuristica si no hay dataset preregistrado. |

[RUNTIME] Estado: los cambios productivos directos se limitan a `negative_controls_runner.js` y al script de verificacion. Los demas modulos son fundacionales y autocontenidos.
