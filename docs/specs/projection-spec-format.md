# Projection Spec Format v1

[INGENIERIA] Cada proyeccion finite-horizon debe declarar:

```json
{
  "family": "pmia_beth_omega",
  "observables": ["metrics.pmia", "metrics.beth_q", "metrics.omega"],
  "aggregation": "mean",
  "windowSize": 32
}
```

[MATEMATICA] La tupla minima de claim es `(T, R, epsilon, F)`, donde `T` es horizonte, `R` recursos, `epsilon` tolerancia y `F` familia observacional.

[MODELO] Este formato no autoriza preservacion inverse-limit ni validacion externa.
