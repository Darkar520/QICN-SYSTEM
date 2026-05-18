# Intervention Family v1

[INGENIERIA] Familia minima preregistrable para F3/F5:

| ID | Familia | Parametros |
|---|---|---|
| `ccc_jitter_small` | `bounded_metric_perturbation` | metric=`ccc`, amplitude=`0.01` |
| `threshold_shift_small` | `config_threshold_shift` | target=`ASCENSION_THRESHOLD`, delta=`0.02` |
| `temporal_permutation` | `series_permutation` | target=`metrics.omega` |
| `metric_shuffle` | `batch_metric_shuffle` | target=`eo.SUBJ` |
| `adversarial_drift_black_box` | `black_box_drift` | amplitude preregistrada |

[MODELO] La familia es operacional y finita. No define perturbaciones admisibles ontologicas completas.
