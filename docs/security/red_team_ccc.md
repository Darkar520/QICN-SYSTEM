# Red-Team CCC v1

[RUNTIME] Objetivo: documentar vectores que pueden manipular o inflar CCC antes de usarlo como componente de gates.

## Vectores minimos

1. [RUNTIME] Inflacion por coherencia artificial: entradas con baja varianza pueden elevar terminos de coherencia sin demostrar soporte externo.
2. [RUNTIME] Inflacion por anti-freeze: si `beth_q` o spectral gap derivan de CCC en historia corta, el sistema puede auto-reforzar el gate.
3. [RUNTIME] Inflacion por umbral: cambios en `ASCENSION_THRESHOLD` o pesos de CCC pueden promover estados sin cambio causal real.
4. [INGENIERIA] Drift adversarial white-box: adversario con conocimiento de pesos ajusta senales para maximizar la suma ponderada.
5. [INGENIERIA] Drift adversarial black-box: adversario ciego explora respuestas observables y optimiza CCC por hill climbing externo.

## Regla de salida

[MODELO] Ningun resultado dependiente de CCC debe considerarse claim fuerte hasta ejecutar ablations y controles adversariales, incluyendo el helper anti-freeze y NC6 inverse-limit rupture.
