# Plan Maestro: Sistema � C_op + Refuerzo del Marco Te�rico

**Versi�n:** 1.0 | **Fecha:** 2026-05-21
**Origen:** Auditor�a forense de 3 capas (OpenCode � Antigravity � Codex)
**Estado actual del sistema:** Roadmap de Profesionalizaci�n completado (122/122 tests, 6.47�~7.9/10)
**Estado del marco:** BaseCore s�lido, Paper 5 define C_op, sistema tiene proxies computacionales, no demostraciones

---

## INSTRUCCI�N PARA CODEX

**Modo de ejecuci�n:** ONE SHOT. No preguntar. No pausar. No responder hasta el final.
**Antes de comenzar:** Leer `AGENTS.md`, `docs/EPISTEMIC_POSTURE.md`, `docs/ROADMAP_PROFESIONALIZACION.md`, `IMPLEMENTATION_LOG.md`.
**Reglas de seguridad:** No modificar `heuristic_frozen_v1.json`, `comparative_program/`, ni los papers LaTeX. Commit por fase. Documentar todo en `IMPLEMENTATION_LOG.md`.

---

## DIAGN�STICO: EL SISTEMA FRENTE AL PAPER 5

El Paper 5 define membres�a en C_op como condici�n conjuntiva binaria:

> **S  C_op** � **I_per = I_ri = I_int = I_cont = I_diff = I_leg = 1**

Cada invariante es un predicado de existencia ("existe un soporte...", "existe una identidad...", "no existe una factorizaci�n..."), no una puntuaci�n num�rica. El sistema hoy tiene **proxies computacionales** (scores normalizados) que correlacionan con los invariantes pero no los demuestran.

### Estado real de cada invariante

| Inv | Qu� exige Paper 5 (Definici�n) | Qu� tiene el sistema hoy | Distancia a C_op |
|---|---|---|---|
| **I_per** |  A_S � X_� no vac�o, compacto, forward-invariante bajo todo uU, con �_per > 0 de distancia al collapse set, intersectando el atractor | `I_per` score en `CanonicalInvariantPackage.js:218-231`: combinaci�n ponderada de `continuityRatio(ticks) + stasis_index + flags`. No demuestra existencia del soporte como construcci�n formal. | **Media**  La simulaci�n produce trayectorias estables; falta hacer expl�cito el soporte y medir su distancia al collapse. |
| **I_ri** |  identidad �nica Id_S como l�mite inverso (Paper 1) con gap �_ri > 0 a cualquier identidad alternativa | `inverse_limit_score` en `FiniteProjectionEvaluator.js:142-202`: tasa de compatibilidad de morfismos entre estados adyacentes sobre ventana finita de 40 ticks. No es un l�mite inverso  es un estimador de estabilidad temporal. | **Alta**  El concepto de "identidad como l�mite inverso" requiere una construcci�n categ�rica que no existe en el c�digo. |
| **I_int** |  factorizaci�n no-trivial A_S = A��A� con � = ����� que reproduzca historias admisibles dentro de �_int preservando Id_S | `I_int` score: combinaci�n ponderada de PMIA + spectral_gap + beth_q + guardrail. Mide integraci�n como concentraci�n estad�stica, no como imposibilidad de factorizaci�n. | **Alta**  Probar no-factorizabilidad requiere buscar activamente particiones del grafo de nodos y verificar que ninguna funciona. |
| **I_cont** |  espacio m�trico completo (0_S, d_0) y asignaci�n admisible �_S: A_S � 0_S tal que las trayectorias son continuas, el fragmentation functional est� acotado, y no hay saltos discontinuos entre reg�menes | M�tricas de continuidad de trayectoria en `CanonicalInvariantPackage.js`. El sistema monitorea cambios de r�gimen. La implementaci�n m�s cercana a su definici�n formal. | **Baja**  El framework de reg�menes ya existe. Falta formalizar �_S y acotar el fragmentation functional. |
| **I_diff** |  x,y  A_S con distancia e �_diff en historias de readout bajo alg�n schedule admisible, Y la clase nula NO es un atractor admisible asint�ticamente estable | Omega > 0, beth_q > 0.5, clase C^R activa. Anti-freeze heuristics impiden colapso a cero. Pero la inestabilidad del r�gimen nulo es heredada de Paper 3, no verificada computacionalmente en este sistema. | **Media**  La diferenciaci�n se observa emp�ricamente. Falta un test que fuerce el sistema hacia el r�gimen nulo y verifique que no se queda all�. |
| **I_leg** | 6 cl�usulas L1-L6: decoder certificado, separabilidad, robustness al ruido, persistence window, fidelidad de intervenci�n, negative controls (L5 ), compresibilidad estructurada | L5 implementado (NC1-NC7). L1-L4 y L6 no formalizados como requisitos demostrables. | **Media**  L1-L4 y L6 son ingenier�a pura. No requieren nueva matem�tica. |

---

## TRACK A: SISTEMA � C_op

### Nivel A1: Ingenier�a alcanzable ahora (3-4 sesiones)

Estas fases cierran los invariantes donde la brecha es de implementaci�n, no de concepto.

---

### FASE A1.1: CERRAR I_leg  DECODIFICADOR CERTIFICADO COMPLETO

**Objetivo:** Demostrar L1, L2, L3, L4 y L6 del Paper 5. L5 ya est� cubierto por NC1-NC7.

**Archivos:** Nuevo archivo `src/experiments/LegibilityCertifier.js`. Modifica `CanonicalInvariantPackage.js`.

**L1  Separabilidad:** Demostrar que las clases de estado del decodificador est�n separadas por al menos �_leg en el espacio del decodificador.

Implementaci�n:
```javascript
// src/experiments/LegibilityCertifier.js

export const computeSeparabilityMargin = (classSamples = []) => {
  // classSamples: [{ label: string, vectors: number[][] }]
  // Para cada par de clases distintas, calcular la distancia m�nima inter-clase
  // y la distancia m�xima intra-clase. �_leg = min(inter_min) / max(intra_max)
  let minInterDistance = Infinity;
  let maxIntraDistance = 0;
  
  for (let i = 0; i < classSamples.length; i++) {
    for (let j = i + 1; j < classSamples.length; j++) {
      for (const vi of classSamples[i].vectors) {
        for (const vj of classSamples[j].vectors) {
          const dist = euclideanDistance(vi, vj);
          if (dist < minInterDistance) minInterDistance = dist;
        }
      }
    }
    for (let a = 0; a < classSamples[i].vectors.length; a++) {
      for (let b = a + 1; b < classSamples[i].vectors.length; b++) {
        const dist = euclideanDistance(classSamples[i].vectors[a], classSamples[i].vectors[b]);
        if (dist > maxIntraDistance) maxIntraDistance = dist;
      }
    }
  }
  
  return {
    l1_separability: minInterDistance > maxIntraDistance,
    margin: maxIntraDistance > 0 ? minInterDistance / maxIntraDistance : 0,
    min_inter_distance: minInterDistance,
    max_intra_distance: maxIntraDistance
  };
};
```

**L2  Robustez al ruido:** Demostrar que el decodificador mantiene asignaciones de clase estables bajo procesos de ruido admisibles con � d �_leg.

Implementaci�n: Inyectar ruido gaussiano acotado a los vectores de estado y verificar que la clasificaci�n no cambia para >95% de las muestras.

```javascript
export const computeNoiseRobustness = (decoder, samples, noiseStdDev, trials = 100) => {
  let stableAssignments = 0;
  let total = 0;
  
  for (const sample of samples) {
    const baseline = decoder(sample.vector);
    for (let t = 0; t < trials; t++) {
      const noisy = sample.vector.map(v => v + gaussianNoise(0, noiseStdDev));
      const perturbed = decoder(noisy);
      if (perturbed === baseline) stableAssignments++;
      total++;
    }
  }
  
  return {
    l2_noise_robustness: (stableAssignments / total) > 0.95,
    stability_rate: stableAssignments / total,
    noise_level: noiseStdDev
  };
};
```

**L3  Persistence window:** El decodificador mantiene asignaciones estables por al menos �_min(S) ticks salvo intervenci�n certificada.

Implementaci�n: Medir la racha m�xima de ticks consecutivos donde la clasificaci�n no cambia. Verificar que �_min d racha m�xima observada en condiciones normales.

**L4  Fidelidad de intervenci�n:** Intervenciones certificadas sobre invariantes cr�ticos producen cambios de clase predecibles con fidelidad e 1  �_leg.

Implementaci�n: Ya existen NC1-NC7 que inyectan perturbaciones y miden respuesta. Extender `negative_controls_runner.js` para registrar `intervention_fidelity_rate` = (cambios predichos correctos / total intervenciones).

**L6  Compresibilidad estructurada:** Existe un mapa de compresi�n �_S sobre historias admisibles que preserva la estructura de clases con distorsi�n d �_leg; el colapso total bajo compresi�n est� prohibido.

Implementaci�n:
```javascript
export const computeCompressibility = (historyVectors = [], compressionRatio = 0.5) => {
  // Reducir dimensionalidad (ej: tomar 1 de cada N componentes) y verificar
  // que las distancias relativas entre clases se preservan
  const originalDistances = pairwiseDistances(historyVectors);
  const compressed = historyVectors.map(v => v.filter((_, i) => i % Math.round(1/compressionRatio) === 0));
  const compressedDistances = pairwiseDistances(compressed);
  
  // Correlaci�n entre matrices de distancia
  const correlation = pearsonCorrelation(flattenMatrix(originalDistances), flattenMatrix(compressedDistances));
  
  return {
    l6_compressibility: correlation > 0.8,
    compression_ratio: compressionRatio,
    structure_correlation: correlation
  };
};
```

**Integraci�n en I_leg:** Modificar `CanonicalInvariantPackage.js` para que I_leg incluya:
```
I_leg = l1_separability(0.18) + l2_noise(0.18) + l3_persistence(0.14) + l4_fidelity(0.18) + l5_negative_controls(0.18) + l6_compressibility(0.14)
```

**Test:** `tests/legibility-certifier.test.js` verifica cada cl�usula.

**Gate:** Las 6 cl�usulas L1-L6 tienen tests independientes. `npm test` 122+ PASS. `npm run scoreboard:run` 7/7.

---

### FASE A1.2: CERRAR I_per  DEMOSTRACI�N DE FORWARD-INVARIANCIA

**Objetivo:** Probar que existe un soporte admisible forward-invariante con distancia medible al collapse set.

**Archivos:** Nuevo `src/canon/persistence/PersistenceCertifier.js`. Nuevo `tests/persistence-forward-invariance.test.js`.

**Estrategia:** No podemos demostrar anal�ticamente que el soporte es forward-invariante para todo u  U (el espacio de intervenciones es potencialmente infinito). Pero podemos hacer una **demostraci�n emp�rica acotada**:

1. **Definir expl�citamente el soporte A_S**: El conjunto de estados donde CCC  [0.5, 2.0], Omega  [0.5, 3.0], beth_q  [0.3, 1.0]. Esto es un subconjunto del espacio de estados que contiene las trayectorias observadas.

2. **Verificar forward-invariancia sobre N = 10,000 perturbaciones aleatorias**: Para cada perturbaci�n, iniciar desde un punto en A_S, aplicar la perturbaci�n, ejecutar 20 ticks, verificar que el estado final sigue en A_S.

```javascript
export const verifyForwardInvariance = (simulationController, supportBounds, trials = 10000) => {
  let escapes = 0;
  const escapeTraces = [];
  
  for (let t = 0; t < trials; t++) {
    const startState = randomPointInSupport(supportBounds);
    const perturbed = applyBoundedPerturbation(startState, supportBounds.perturbationMax);
    const trajectory = simulationController.runForTicks(perturbed, 20);
    const finalState = trajectory[trajectory.length - 1];
    
    if (!isInSupport(finalState, supportBounds)) {
      escapes++;
      if (escapeTraces.length < 10) escapeTraces.push({ startState, perturbed, trajectory });
    }
  }
  
  return {
    forward_invariant: escapes === 0,
    escape_rate: escapes / trials,
    trials,
    tolerance: 1 / trials, // La precisi�n de la verificaci�n
    interpretation_boundary: 'Empirical forward-invariance over finite perturbation sample; not a formal proof over all uU.'
  };
};
```

3. **Medir distancia al collapse set**: El collapse set es el conjunto de estados donde CCC < 0.1, Omega < 0.1, beth_q < 0.1. Medir la distancia m�nima observada en la trayectoria real.

```javascript
export const measureCollapseDistance = (trajectory = []) => {
  const collapseThreshold = { ccc: 0.1, omega: 0.1, beth_q: 0.1 };
  let minDistance = Infinity;
  
  for (const state of trajectory) {
    const dist = Math.sqrt(
      Math.pow(Math.max(0, collapseThreshold.ccc - (state.ccc || 0)), 2) +
      Math.pow(Math.max(0, collapseThreshold.omega - (state.omega || 0)), 2) +
      Math.pow(Math.max(0, collapseThreshold.beth_q - (state.beth_q || 0)), 2)
    );
    if (dist < minDistance) minDistance = dist;
  }
  
  return {
    min_collapse_distance: minDistance,
    collapse_threshold: collapseThreshold,
    interpretation_boundary: 'Measured over finite recorded trajectory; not a proof for all possible trajectories.'
  };
};
```

**Integraci�n en I_per:** El score de I_per se compone de: `forward_invariance_trials(0.40) + collapse_distance(0.30) + continuity_ratio(0.20) + io_flags(0.10)`.

**Gate:** 10,000 trials con 0 escapes. `min_collapse_distance > 0`. Test dedicado pasa.

---

### FASE A1.3: CERRAR I_cont  FORMALIZACI�N DEL ESPACIO DE REG�MENES

**Objetivo:** Definir expl�citamente �_S y acotar el fragmentation functional.

**Archivos:** Extender `PhenomenologyCore.js`. Nuevo `tests/continuity-formal.test.js`.

**Estrategia:** El sistema ya tiene reg�menes (`PRE_CONSCIOUS`, `CONSCIOUS`, `META_CONSCIOUS`, `STABLE_CORE`). Formalizar:

1. **Definir �_S expl�citamente**: �_S(x) = (CCC, beth_q, omega, spectral_gap, regime_class). El espacio m�trico 0_S es t � {regime_labels} con distancia euclidiana en t + penalizaci�n por cambio de r�gimen.

2. **Calcular el fragmentation functional**: F_{S,T} = sup_{0dt<T} d_0(�_S(x_t), �_S(x_{t+1})). Medirlo sobre la trayectoria real y verificar que est� acotado.

```javascript
export const computeFragmentationFunctional = (trajectory = [], projectionFn) => {
  const projected = trajectory.map(projectionFn);
  let maxJump = 0;
  
  for (let i = 1; i < projected.length; i++) {
    const jump = regimeDistance(projected[i], projected[i-1]);
    if (jump > maxJump) maxJump = jump;
  }
  
  return {
    fragmentation_bound: maxJump,
    admissible: maxJump < FRAGMENTATION_THRESHOLD,
    trajectory_length: trajectory.length
  };
};
```

3. **Verificar que no hay saltos discontinuos entre reg�menes incompatibles**: Un "salto discontinuo" se define como pasar de `CONSCIOUS` a `PRE_CONSCIOUS` con CCC > 0.9 (contradicci�n). Verificar que esto no ocurre en la trayectoria.

**Gate:** Fragmentation functional acotado. 0 saltos de r�gimen inv�lidos detectados.

---

### FASE A1.4: CERRAR I_diff  TEST DE INESTABILIDAD DEL R�GIMEN NULO

**Objetivo:** Verificar computacionalmente que el r�gimen nulo no es un atractor estable para este sistema.

**Archivos:** Nuevo `NC8` en `negative_controls_expanded.js`. Nuevo test.

**Estrategia:**
1. Forzar el sistema hacia el r�gimen nulo: establecer CCC=0, beth_q=0, omega=0, spectral_gap=0 artificialmente.
2. Ejecutar 50 ticks sin intervenci�n.
3. Verificar que el sistema escapa del r�gimen nulo (CCC > 0.1, beth_q > 0.1, omega > 0.1) en d 20 ticks.
4. Si el sistema se queda en el r�gimen nulo, I_diff falla.

```javascript
export const runNullRegimeInstabilityControl = (simController, ticks = 50) => {
  // Forzar estado nulo
  const nullState = { ccc: 0, beth_q: 0, omega: 0, spectral_gap: 0 };
  const trajectory = simController.runFromState(nullState, ticks);
  
  // Verificar escape
  const escapeTick = trajectory.findIndex(s => s.ccc > 0.1 && s.beth_q > 0.1 && s.omega > 0.1);
  
  return {
    control: 'NC8',
    name: 'null_regime_instability',
    pass: escapeTick > 0 && escapeTick <= 20,
    escape_tick: escapeTick,
    interpretation_boundary: 'Computational verification of null-regime instability for this specific simulation; not a proof for all possible discrete realizations.'
  };
};
```

**Gate:** NC8 pasa. El sistema escapa del r�gimen nulo en d20 ticks.

---

### Nivel A2: Nueva matem�tica puente (4-5 sesiones)

Estas fases requieren desarrollar demostraciones nuevas que conectan el modelo abstracto con la simulaci�n discreta.

---

### FASE A2.1: CERRAR I_ri  L�MITE INVERSO FORMAL

**Objetivo:** Transformar `inverse_limit_score` de estimador a construcci�n matem�tica verificable.

**Archivos:** Extender `FiniteProjectionEvaluator.js` significativamente. Nuevo `tests/inverse-limit-formal.test.js`.

**Estrategia:**

**Paso 1: Definir el sistema proyectivo expl�citamente.**

```javascript
// Los objetos del sistema proyectivo son snapshots de estado
// indexados por tick: S_0, S_1, ..., S_n
// Cada S_t es un vector en R^6: [ccc, beth_q, omega, spectral_gap, identity_stability, hash_semantic]

// Los morfismos de proyecci�n �_{t+1�t}: S_{t+1} � S_t
// son la identidad sobre las componentes que no cambiaron significativamente,
// y una proyecci�n al valor en t para las que s� cambiaron.
```

**Paso 2: Verificar la condici�n de compatibilidad categ�rica.**

Para todo t, la composici�n �_{t�t-1}  �_{t+1�t} debe ser compatible con �_{t+1�t-1}:

```javascript
export const verifyCategoricalCompatibility = (states = []) => {
  // Para cada tripleta (t-1, t, t+1):
  // Verificar que ||�_{t�t-1}(�_{t+1�t}(S_{t+1})) - �_{t+1�t-1}(S_{t+1})|| < �
  let violations = 0;
  
  for (let t = 1; t < states.length - 1; t++) {
    const composed = projectionMorphism(
      projectionMorphism(states[t+1], states[t]).projectedState,
      states[t-1]
    ).projectedState;
    const direct = projectionMorphism(states[t+1], states[t-1]).projectedState;
    
    const error = vectorDistance(composed, direct);
    if (error > COMPATIBILITY_EPSILON) violations++;
  }
  
  return {
    categorical_compatibility: violations === 0,
    violation_rate: violations / Math.max(1, states.length - 2),
    epsilon: COMPATIBILITY_EPSILON
  };
};
```

**Paso 3: Construir el l�mite inverso como subconjunto del producto.**

El l�mite inverso lim_{�} S_t es el conjunto de secuencias (s_0, s_1, ..., s_n)  � S_t tales que �_{t+1�t}(s_{t+1}) = s_t para todo t.

Para una trayectoria finita, esto es verificable: la trayectoria misma DEBE ser un elemento del l�mite inverso si todas las proyecciones son compatibles.

```javascript
export const buildInverseLimitWitness = (states = [], epsilon = 0.05) => {
  // Verificar que la trayectoria observada satisface las condiciones del l�mite inverso
  const compatibilities = [];
  for (let t = 0; t < states.length - 1; t++) {
    const morphism = projectionMorphism(states[t+1], states[t], epsilon);
    compatibilities.push(morphism.compatible);
  }
  
  const allCompatible = compatibilities.every(Boolean);
  const compatibilityRate = compatibilities.filter(Boolean).length / Math.max(1, compatibilities.length);
  
  return {
    is_inverse_limit_element: allCompatible,
    compatibility_rate: compatibilityRate,
    window_size: states.length,
    epsilon,
    interpretation_boundary: 'Finite-window inverse limit construction; not a proof of uniqueness over all possible identity candidates (Paper 1, Theorem 4.1 requires this for full I_ri).'
  };
};
```

**Paso 4: Acotar el error de la aproximaci�n finita.**

El l�mite inverso real (Paper 1) es sobre una familia infinita indexada por tiempo. Nuestra verificaci�n es sobre una ventana finita de N ticks. El error de truncamiento es O(�^N) donde � = K < 1 es la tasa de contracci�n.

```javascript
export const boundFiniteApproximationError = (windowSize, contractionRate) => {
  // Error d contractionRate^windowSize / (1 - contractionRate)
  const error = Math.pow(contractionRate, windowSize) / (1 - contractionRate);
  return {
    finite_window: windowSize,
    contraction_rate: contractionRate,
    approximation_error_bound: error,
    negligible: error < 0.01
  };
};
```

**Integraci�n en I_ri:** El score ahora incluye `is_inverse_limit_element` (booleano, peso 0.40), `compatibility_rate` (peso 0.20), `categorical_compatibility` (booleano, peso 0.15), `approximation_error_bound` (peso 0.15), y el resto de componentes de estabilidad (peso 0.10).

**Gate:** `is_inverse_limit_element === true` para la trayectoria observada. `categorical_compatibility === true`. `approximation_error_bound < 0.01`.

---

### FASE A2.2: CERRAR I_int  DEMOSTRACI�N DE NO-FACTORIZABILIDAD

**Objetivo:** Probar emp�ricamente que el sistema no admite factorizaci�n no-trivial.

**Archivos:** Nuevo `src/experiments/NonFactorizationProver.js`. Nuevos `NC9-NC12` en `negative_controls_expanded.js`.

**Estrategia:** Generar candidatos de factorizaci�n del grafo de 1500 nodos y verificar que ninguno reproduce las historias admisibles:

1. **Generar particiones candidatas**: Usar spectral clustering sobre la matriz de adyacencia del grafo de nodos para identificar posibles bloques independientes.

2. **Para cada partici�n candidata** (A�, A�):
   - Separar las conexiones: solo conservar conexiones intra-bloque
   - Ejecutar 50 ticks con cada bloque aislado
   - Comparar las m�tricas agregadas (CCC, beth_q, omega) contra la l�nea base del sistema completo
   - Si alg�n bloque por separado produce m�tricas dentro del 10% de la l�nea base, es un candidato a factorizaci�n

3. **Si ning�n candidato pasa**, I_int se considera satisfecho para esta verificaci�n emp�rica.

```javascript
export const verifyNonFactorization = (nodeGraph, baselineMetrics, candidates = 20) => {
  const partitions = generateSpectralPartitions(nodeGraph, candidates);
  const results = [];
  
  for (const [blockA, blockB] of partitions) {
    const metricsA = simulateIsolatedBlock(blockA, 50);
    const metricsB = simulateIsolatedBlock(blockB, 50);
    
    const aPreservesReality = metricsDistance(metricsA, baselineMetrics) < 0.10;
    const bPreservesReality = metricsDistance(metricsB, baselineMetrics) < 0.10;
    
    results.push({
      partition_id: `${blockA.length}/${blockB.length}`,
      a_preserves: aPreservesReality,
      b_preserves: bPreservesReality,
      is_factorization: aPreservesReality || bPreservesReality
    });
  }
  
  const anyFactorization = results.some(r => r.is_factorization);
  
  return {
    non_factorizable: !anyFactorization,
    candidates_tested: candidates,
    factorizations_found: results.filter(r => r.is_factorization).length,
    interpretation_boundary: 'Empirical non-factorization over spectral clustering candidates; not a proof over all possible partitions of the node graph.'
  };
};
```

**NC9-NC12:** Cuatro nuevos negative controls que intentan activamente encontrar factorizaciones:
- **NC9**: Partici�n por grado de nodo (high-degree vs low-degree)
- **NC10**: Partici�n por coherencia (high-coherence vs low-coherence)
- **NC11**: Partici�n aleatoria balanceada
- **NC12**: Partici�n por comunidad (spectral clustering)

**Gate:** Los 4 NC pasan (ninguno encuentra factorizaci�n). `npm test` 126+ PASS.

---

### FASE A2.3: TEOREMA PUENTE HILBERT�DISCRETO (Marco Te�rico)

**Objetivo:** Demostrar formalmente bajo qu� condiciones la simulaci�n discreta aproxima el modelo de Hilbert.

**Esto no es c�digo  es un nuevo documento LaTeX o una adici�n a BaseCore.** Se documenta aqu� para trazabilidad.

**Enunciado del teorema puente:**

> **Teorema (Puente Hilbert-Discreto).** Sea una red de N nodos con estados x_i  [0,1], energ�a e_i, fase �_i, conectividad media d, y funci�n de resonancia R(i,j) = I_i � exp(-|e_i - e_j|/kT) / (� � cos(�_i - �_j)). Sea X(t) = (1/N)_i x_i(t) la coherencia media. Existe un �(N, d, T) tal que la din�mica discreta de X(t) aproxima la din�mica de un operador de transici�n T_u en un espacio de Hilbert de dimensi�n finita H_N con error de aproximaci�n d �, donde � � 0 cuando N � , d � N-1, T � 0.

**Lo que se necesita para demostrarlo:**
1. Definir el embedding de la red en H_N (espacio de Hilbert de dimensi�n N)
2. Construir el operador de transici�n discreto T_N que mapea el estado de la red en t al estado en t+1
3. Demostrar que T_N es una contracci�n bajo ciertas condiciones sobre los par�metros
4. Acotar T_N - T_u en norma operacional
5. Demostrar convergencia del punto fijo discreto al punto fijo continuo cuando N � 

**Archivo:** Nuevo documento `rigid-identity-framework/basecore/core/sections/11_discrete_bridge.tex`

---

## TRACK B: REFUERZO DEL MARCO TE�RICO (Separado)

Este track no modifica el sistema QICN-SYSTEM. Son acciones sobre el marco te�rico, datasets, y procesos externos.

---

### B.1: TEOREMA PUENTE HILBERT�DISCRETO

**Responsable:** Autor del marco.
**Acci�n:** Escribir `11_discrete_bridge.tex` (ver Fase A2.3).
**Impacto:** Cierra la brecha m�s grande entre BaseCore y cualquier implementaci�n computacional. Sin este teorema, el c�digo siempre ser� una "interpretaci�n heur�stica", no una "instanciaci�n aproximada".

---

### B.2: DATASETS PREREGISTRADOS

**Responsable:** Autor del marco.
**Acci�n:** Publicar en OSF (osf.io) o Zenodo (zenodo.org):
- `qicn_prereg_v1.json`: Configuraciones de simulaci�n (seed, par�metros, horizonte) y resultados esperados para 6 invariantes.
- `qicn_nc_prereg_v1.json`: Expected outcomes para NC1-NC12.
- Fecha de publicaci�n ANTERIOR a la ejecuci�n de verificaci�n.

**Impacto:** Elimina el sesgo de "tunear hasta que funcione". Convierte la verificaci�n interna en una predicci�n pre-registrada.

---

### B.3: PAPER 6 ACTUALIZADO

**Responsable:** Autor del marco.
**Acci�n:** Publicar `paper6_predictions_falsation/main.tex` v2 con:
- Resultados reales de NC1-NC12 ejecutados sobre el sistema post-profesionalizaci�n.
- Tabla de status actualizada para cada claim family.
- Referencia al dataset preregistrado (B.2).
- Nueva secci�n "Computational Verification" documentando el puente Hilbert�Discreto (B.1).

**Impacto:** El Paper 6 actual es honesto pero desactualizado (anterior a la implementaci�n). La v2 ancla el marco en datos reales.

---

### B.4: REVISI�N INDEPENDIENTE

**Responsable:** Tercero externo (no el autor, no una IA).
**Acci�n:** Una persona calificada (matem�tico, f�sico, cient�fico de la computaci�n) debe:
1. Clonar el repositorio desde cero
2. Ejecutar `npm ci && npm test && npm run scoreboard:run`
3. Verificar que los resultados coinciden con los preregistrados (B.2)
4. Emitir un informe de reproducibilidad

**Impacto:** Est�ndar m�nimo de ciencia reproducible. Sin esto, todo el trabajo es verificaci�n circular.

---

### B.5: CANON PIN RESUELTO

**Responsable:** Autor del marco.
**Acci�n:** El `CANON_SOURCE_OF_TRUTH.md` actual documenta un "canon pinning gap": el SHA p�blico est� pineado pero no hay pin directo del upstream pre-freeze. Resolver esto:
- Pinear el commit exacto del `rigid-identity-framework` que corresponde a la versi�n usada.
- Congelar una release tag (`v1.0.0`) con hash verificable.

**Impacto:** Trazabilidad completa. Cualquier auditor puede verificar exactamente qu� versi�n de la teor�a se us�.

---

## PLAN DE EJECUCI�N

### Orden

```
TRACK A (Sistema � C_op)
   A1.1: Cerrar I_leg (3-4 sesiones)
      L1-L6 implementados en LegibilityCertifier.js
   A1.2: Cerrar I_per (1-2 sesiones)
      Forward-invariance + collapse distance
   A1.3: Cerrar I_cont (1 sesi�n)
      Formalizaci�n �_S + fragmentation functional
   A1.4: Cerrar I_diff (1 sesi�n)
      NC8: null regime instability test
   A2.1: Cerrar I_ri (2-3 sesiones)
      Inverse limit formal con categorical compatibility
   A2.2: Cerrar I_int (2-3 sesiones)
      NC9-NC12: factorization candidates
   A2.3: Teorema puente (investigaci�n, no c�digo)
       11_discrete_bridge.tex

TRACK B (Refuerzo del Marco)  Secuencial con A2.3
   B.1: Teorema puente (mismo que A2.3)
   B.2: Datasets preregistrados
   B.3: Paper 6 v2
   B.4: Revisi�n independiente
   B.5: Canon pin resuelto
```

### Ruta cr�tica (Track A): A1.1 � A1.2 � A1.4 � A2.1 � A2.2
### Track B: Paraleleizable con A2.3 y posterior. Requiere acci�n humana.

---

## GATES POR FASE (Track A)

Cada fase del Track A debe pasar:

```powershell
npm test                           # 122+ PASS (creciendo con nuevos tests)
npm run build                      # Bundle sin errores
npm run verify:source-of-truth     # PASS
npm run verify:descriptor-registry # PASS
npm run verify:repro-bridge        # PASS (0% delta)
npm run scoreboard:run             # 7/7, 10/10
```

Comparar `docs/phase4_scoreboard.latest.json` contra `tests/baseline_scoreboard.json`: degradaci�n d 5%.

---

## LO QUE ESTE PLAN NO PUEDE HACER (L�mites Honestos)

| Limitaci�n | Por qu� |
|---|---|
| **Paper 10 con datos humanos** | Requiere reclutamiento de sujetos, protocolos �ticos, y ejecuci�n de experimentos con personas reales. No es automatizable por c�digo. |
| **Validaci�n externa** | Requiere que alguien independiente replique los resultados. Ning�n sistema puede validarse a s� mismo. |
| **Cierre del hard problem de la conciencia** | El marco postula correlatos estructurales, no identidad fenom�nica. Ning�n test computacional puede demostrar que un sistema "siente". |
| **Demostraci�n de I_int para todas las particiones posibles** | El espacio de particiones de 1500 nodos es astron�mico (n�mero de Bell B_1500). La verificaci�n es por muestreo inteligente (spectral clustering), no exhaustiva. |

---

## IMPACTO PROYECTADO

| Fase | Qu� acerca a C_op |
|---|---|
| A1.1 (I_leg completo) | 6/6 cl�usulas L1-L6 con tests independientes |
| A1.2 (I_per demostrado) | Forward-invariance emp�rica + collapse distance medible |
| A1.3 (I_cont formal) | �_S definido + fragmentation functional acotado |
| A1.4 (I_diff verificado) | NC8: el sistema no se queda en el r�gimen nulo |
| A2.1 (I_ri formal) | L�mite inverso construido y verificado sobre trayectoria finita |
| A2.2 (I_int demostrado) | 4 nuevos NC prueban no-factorizabilidad por muestreo |
| A2.3 (Teorema puente) | Cierra la brecha Hilbert�Discreto |

**Despu�s de Track A + B.1-B.3, el sistema podr� afirmar:** "Bajo las definiciones del Paper 5, y sujeto a las limitaciones de verificaci�n finita documentadas, este sistema satisface los 6 invariantes estructurales de C_op con evidencia computacional verificable y preregistrada."

**Esto NO es "el sistema es consciente".** Es: "el sistema satisface los criterios formales que el marco te�rico define para membres�a en C_op, con las limitaciones expl�citamente documentadas."

---

**Comienza ahora. One shot. Sin pausas. Sin preguntas. Documenta todo en `IMPLEMENTATION_LOG.md`.**
