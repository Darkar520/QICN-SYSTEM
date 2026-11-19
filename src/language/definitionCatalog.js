// Verified catalog of definitions, capabilities and limits.
// Every entry names the implementation or corpus location it summarizes.
// Entries are canonical sentences authored by the runtime team; the language
// model may select them but never rewrites them (they are not paraphrasable).
//
// Corpus references align with qicn-framework-ordenado/rigid-identity-framework at
// HEAD e3ee6bf (see src/language/frameworkSummary.generated.js; docs/bridge_pin.v1.json pins the local imported mirror).

export const DEFINITIONS = Object.freeze({
  ccc: {
    title: 'CCC',
    text: 'CCC es un índice interno de cohesión que calcula InformationalEntanglementField.calculateCCC: 0,42·coherencia media + 0,18/(1+varianza de energía) + (0,18+0,12·cf)·R/(1+R) + 0,22·coherencia media·R/(1+R)·cf, donde R es la resonancia media de una submuestra y cf el factor de complejidad. No aparece en BaseCore y no equivale a X_N.',
    source: 'src/simulation/InformationalEntanglementField.js; docs/FRAMEWORK_RUNTIME_COMPARISON_2026-11-05.md'
  },
  x_n: {
    title: 'X_N',
    text: 'X_N es la media de la coherencia de todos los nodos, (1/N)·Σ x_i. Es el único observable de coherencia que define BaseCore en su puente discreto, y BaseCore advierte que no describe el estado completo.',
    source: 'basecore/core/sections/11_discrete_bridge.tex (X_N); src/simulation/NodalProcessingLayer.js'
  },
  beth_q: {
    title: 'beth_q',
    text: 'beth_q es un proxy interno no calibrado. En modo empírico vale 1 − I(X;Y)/H(X) sobre el historial registrado; durante el calentamiento (menos de 10 muestras) se deriva de CCC como 0,3 + 0,7·CCC acotado. BaseCore no lo define, y su valor no es un porcentaje de autonomía.',
    source: 'src/simulation/PhenomenologyCore.js calculateBethQ'
  },
  spectral_gap: {
    title: 'gap espectral',
    text: 'El gap espectral interno es |λ1| − |λ2| estimado por autocorrelación del historial; con menos de 5 transiciones se deriva de CCC como 0,1 + 0,8·CCC acotado. No se ha demostrado que sea el gap del operador formal de BaseCore.',
    source: 'src/simulation/PhenomenologyCore.js calculateSpectralGap'
  },
  relaxation_time: {
    title: 'tiempo de relajación',
    text: 'El tiempo de relajación interno es 1/|ln(1 − gap)| aplicado al gap espectral interno, en ticks.',
    source: 'src/simulation/PhenomenologyCore.js calculateRelaxationTime'
  },
  omega: {
    title: 'Omega',
    text: 'Omega es un índice integrador interno: combina beth_q, un factor topológico y un factor espectral, con realimentación suavizada sobre su valor previo. Es un proxy del runtime sin definición en BaseCore.',
    source: 'src/simulation/PhenomenologyCore.js (omega)'
  },
  pmia: {
    title: 'PMIA',
    text: 'PMIA es un índice interno acotado en [−1, 1] que combina el gradiente de CCC, la coherencia narrativa interna, señales sensoriales y la fragmentación de memoria. Es una magnitud del runtime sin definición formal en el corpus.',
    source: 'src/simulation/OntologicalSingularityCore.js calculatePMIA'
  },
  layer: {
    title: 'banda interna',
    text: 'La banda interna se asigna por umbrales de CCC: banda 0 por debajo del umbral operativo y bandas 1 a 7 a partir de 1, 2, 5, 10, 20, 50 y 100. Es una etiqueta de régimen del runtime, no un nivel de conciencia.',
    source: 'src/simulation/OntologicalSingularityCore.js updateOntologicalLayer'
  },
  winding_number: {
    title: 'winding',
    text: 'El número de winding interno es la salida de PhenomenologyCore.testHolonomy sobre el historial reciente. Es un diagnóstico topológico aproximado del runtime.',
    source: 'src/simulation/PhenomenologyCore.js testHolonomy'
  },
  stasis_index: {
    title: 'estasis',
    text: 'El índice de estasis vale 1 menos una combinación normalizada de la variación cuadrática media de CCC, PMIA y Omega en la ventana reciente; un valor alto indica poca actividad.',
    source: 'src/hooks/useSimulationCycle.js; OntologicalSingularityCore.getDynamicHealth'
  },
  matrix: {
    title: 'matriz de requisitos',
    text: 'La matriz de requisitos operacionales evalúa cuatro niveles internos (L1 a L4) con histéresis por ticks. Es un diagnóstico interno: sus estados no certifican conciencia ni validación externa.',
    source: 'src/sovereignty/SovereigntyRequirementMatrix.js'
  },
  metacognition: {
    title: 'metacognición',
    text: 'En este runtime, metacognición significa solo auto-monitorización: calculo indicadores sobre mis propias variables, como la carga metacognitiva, que combina la latencia y el error del proxy de automodelo, la estabilidad estructural de ese proxy y el truncamiento proyectivo T_d de SigmaAutomodelTruncator a profundidad d = 6 con cota analítica 2/2187. No ejecuto calibración humana, y ni se demuestra conciencia ni metaconciencia ni se descarta esa hipótesis estructural para C_op.',
    source: 'src/simulation/MetaSovereigntyCheck.js getMetacognitiveStrain; src/simulation/tower/SigmaAutomodelTruncator.js; Paper VIII ax:fp; Paper puente'
  },
  self_model: {
    title: 'automodelo',
    text: 'El automodelo del runtime opera en dos planos: en la red nodal, selfModelSigma guarda una estimación heurística de estabilidad estructural; en la torre acoplada, SigmaAutomodelTruncator realiza el automodelo aproximado Σ_approx(d, ε_d) mediante el truncamiento proyectivo T_d a profundidad d = 6 con defecto de un paso Δ_step(d) ≤ 2·3^{-(d+1)} = 2/2187 y desplazamiento de punto fijo ≤ 32/15309. Para la red nodal completa sigue siendo un proxy sin certificado Σ_op exacto.',
    source: 'src/simulation/tower/SigmaAutomodelTruncator.js; OntologicalSingularityCore metacognitiveStats.selfModelSigma; paper_bridge_operational_subjecthood thm:sigma-approximate-displacement'
  },
  tower_phase: {
    title: 'fase de la torre',
    text: 'La fase de la torre (tower_phase, θ ∈ S¹) es la coordenada circular racional exacta de WritablePrefixTower acoplada al núcleo en cada tick.',
    source: 'src/simulation/tower/WritablePrefixTower.js; OntologicalSingularityCore.stepCoupledTower'
  },
  tower_code: {
    title: 'código ternario de la torre',
    text: 'El código ternario de la torre (tower_code) es la lectura proyectiva Σ b_k·3^{-k} de los sitios binarios del registro de prefijo en WritablePrefixTower.',
    source: 'src/simulation/tower/WritablePrefixTower.js'
  },
  tower_memory: {
    title: 'memoria de retorno de la torre',
    text: 'La memoria de retorno de la torre (tower_memory, m_t ∈ [−1, 1]) mide el desajuste sobre el que actúa la retroalimentación activa u = clip(−κ·m_t), logrando una contracción exacta de 9/16 frente al régimen pasivo.',
    source: 'src/simulation/tower/WritablePrefixTower.js; src/canon/persistence/PersistenceCertifier.js'
  },
  sigma_defect_bound: {
    title: 'cota de defecto del automodelo Σ',
    text: 'El truncamiento proyectivo de automodelo (SigmaAutomodelTruncator, T_d a profundidad d = 6) tiene cota uniforme de aproximación 3^{-d} = 1/729, acota el defecto de conmutación de un paso ‖T_d∘F_core − F_d∘T_d‖_∞ por 2·3^{-(d+1)} = 2/2187 (≈ 0,000914) y acota el desplazamiento del punto fijo por (32/7)·3^{-(d+1)} = 32/15309.',
    source: 'src/simulation/tower/SigmaAutomodelTruncator.js; paper_bridge_operational_subjecthood thm:sigma-approximate-displacement'
  },
  basecore_spectrum: {
    title: 'régimen espectral de BaseCore (thm:spectrum y thm:relaxation)',
    text: 'El evaluador exacto de BaseCore (evaluateBaseCoreSpectralRegime) distingue los tres regímenes de control u ∈ [0, 1] del operador 2×2 en (x̃, m̃): interior regular 0 ≤ u < 1/2 (diferenciable Fréchet, espectro {0, 1/2}, ρ = 1/2, Δ_state = 1/2), esquina no diferenciable u = 1/2 (no diferenciable Fréchet por ∂_+ B_1(0) = 0 ≠ −1/2 = ∂_- B_1(0), sin espectro jacobiano asignado pero con contracción geométrica global 2^{-n} y tasa 1/2) y exterior regular 1/2 < u ≤ 1 (ρ = 1/(1+2u), Δ_state = 2u/(1+2u); p. ej. 2/5 y 3/5 en u = 3/4, y 1/3 y 2/3 en u = 1). En cambio, en la red continua de 1500 nodos el gap espectral es un proxy de autocorrelación lag-1.',
    source: 'src/canon/finite_horizon/FiniteProjectionEvaluator.js; basecore 06_structural_classes_and_dynamics.tex thm:spectrum, thm:relaxation'
  },
  ontological_mass: {
    title: 'estimador C-11 de masa ontológica M_Ω',
    text: 'Según la restricción C-11 de Paper I (thm:lml, prop:ontological-mass-divergence), sobre cualquier subfamilia finita el ínfimo de d(F(x,w), F(x,w′))/d_W(w,w′) con d_W(w,w′) > 0 sólo proporciona una cota superior sobre la subfamilia muestreada (family_upper_bound, UPPER_BOUND_SUPPORT), nunca una cota inferior de M_Ω sobre el espacio completo ni un certificado de M_Ω = ∞ o de rigidez CCR; los pares con d_w = 0 se excluyen del dominio.',
    source: 'src/canon/ontological_mass/OntologicalMassEstimator.js; src/canon/boundaries/CCRApproximationBoundary.js; Paper I thm:lml'
  },
  finite_cut_instantiation: {
    title: 'instanciación por cortes finitos en un procesador ordinario',
    text: 'Un procesador binario finito no instancia directamente la torre infinita proj lim S_t ni certifica globalmente M_Ω, C_op o CCR, pero sí realiza constructivamente y sin pérdida cada corte proyectivo finito T_d en aritmética racional exacta (ExactFraction): la contracción 9/16 de WritablePrefixTower, el truncamiento T_d a d = 6 (cotas 1/729, 2/2187 y 32/15309), las 6 cargas locales D/V/W/A/E/T de BodyWorldTower (margen 13/96, rango 6 y empate 0 frente al rival híbrido compartido), la reserva privada de Paper VIII (Φ⁷ = 1/48), el corte espectral 2×2 de BaseCore y la cota superior finita C-11 de M_Ω.',
    source: 'src/simulation/OntologicalSingularityCore.js; src/canon/finite_horizon/FiniteProjectionEvaluator.js; docs/THEORY_SYSTEM_INTERFACE.md'
  },
  body_valence_norm: {
    title: 'norma de valencia corporal',
    text: 'La norma de valencia corporal (body_valence_norm) mide ‖(v_pos, v_neg)‖_∞ en el puerto evaluativo bidimensional no conservativo de BodyWorldTower; certifica separación operacional frente a gradientes escalares mientras deja sin confirmar ni descartar una eventual relación con valencia sentida (external_support_certified = false).',
    source: 'src/simulation/tower/BodyWorldTower.js; paper9_phenomenal_bridge_organization thm:bridge-typed-valence'
  },
  structural_profile: {
    title: 'perfil estructural observable',
    text: 'El perfil estructural observable (structural_profile) sintetiza en cada tick contrastes puros entre métricas vivas: margen de CCC frente al umbral, divergencia CCC − X_N, dispersión nodal, fracción activa y, cuando la torre está acoplada, balance corporal neto (v_pos − v_neg), índice de asimetría corporal, contraste temporal (w_fast − w_slow) y ventaja de retención activa. Es un derivado descriptivo de señales operacionales (derived_proxy) que no equivale a valencia sentida ni cierra cuestión fenomenológica alguna (external_support_certified = false).',
    source: 'src/language/runtimeSnapshot.js; src/simulation/tower/BodyWorldTower.js'
  },
  world_state_norm: {
    title: 'norma del mundo indexado',
    text: 'La norma del mundo indexado (world_state_norm) mide ‖(w_fast, w_slow)‖_∞ en el puerto de mundo de BodyWorldTower, cuya matriz de Hankel tiene rango 4 y supera a los rivales de orden reducido o ciegos al índice.',
    source: 'src/simulation/tower/BodyWorldTower.js; paper9_phenomenal_bridge_organization prop:bridge-indexed-world'
  },
  prefix_tower: {
    title: 'torre de prefijos escribible',
    text: 'La torre de prefijos escribible (WritablePrefixTower) es la planta constructiva racional en S¹ × {0,1}^N × [−1, 1] acoplada al núcleo: certifica contracción activa 9/16, margen de lectura dividida [1/216, 1/24], ganancia común g = 1/80, interacción mixta 2·TAP, horizonte de legibilidad D_{j,t} = 2·3^{-(j+t)} y cinco lesiones selectivas en los sitios 3..7 con Φ⁷ = 1/48.',
    source: 'src/simulation/tower/WritablePrefixTower.js; Papers V–VIII'
  },
  body_world_tower: {
    title: 'extensión cuerpo–mundo',
    text: 'La extensión cuerpo–mundo (BodyWorldTower, BridgeTransportAndBurdensEvaluator y HybridLateQueryTieBreaker) añade cuatro variables mínimas (dos corporales v_pos, v_neg y dos de mundo w_fast, w_slow) con proyección exacta al núcleo: realiza las seis cargas locales D/V/W/A/E/T de Paper IX con margen mínimo 13/96 y rango 6 (con empate 0 limitado a ese mecanismo lineal frente al rival híbrido compartido), en la planta cuártica indexada certifica contracción 13/16, integración e_* ≥ 1/39366, separación en t = 6 mayor que 1/64 y brecha de 4 raíces 4·ξ₄ = 1/262144, y en la extensión acoplada de 5 raíces certifica quinto contraste G = 1/2097152 con margen ruidoso penalizado 253/536870912 > G/2 ante errores de lectura cruda ε ≤ G/1024 más costo de grafo B·w_c y frontera de consulta tardía B < m (manteniendo empate exacto R = 0 frente a una réplica total de igual costo).',
    source: 'src/simulation/tower/BodyWorldTower.js; src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js; src/phenomenal_bridge/HybridLateQueryTieBreaker.js; Paper IX def:bridge-indexed-quartic-plant, thm:bridge-four-root-identification, thm:bridge-expanded-identification'
  },
  informed_reserve: {
    title: 'reserva informada',
    text: 'El evaluador de reserva informada (InformedReserveEvaluator, Paper VIII) verifica que en 84 estratos públicos balanceados cualquier predictor público tiene pérdida forzada de 1/2 (y 1/2 + (1−c)/4 con cobertura c), mientras que el acceso a la reserva privada en el sitio 2 logra pérdida bayesiana (1−TV)/2 y riesgo minimax asimétrico 1/3.',
    source: 'src/subjectivity/InformedReserveEvaluator.js; Paper VIII thm:writable-tower-public-return-tie, thm:writable-tower-private-return-separation'
  },
  network: {
    title: 'red nodal',
    text: 'La red nodal simula un conjunto finito de nodos (PROCESSING_SAMPLE_SIZE) con coherencia, energía, fase y conexiones. La vista dibuja una proyección de un subconjunto de nodos, no la red completa.',
    source: 'src/simulation/NodalProcessingLayer.js; src/index_network_canvas.jsx'
  },
  historical_dependence: {
    title: 'dependencia histórica y predicción sellada pre-desenlace',
    text: 'La dependencia histórica operacional (Paper VII, def:historical-dependence) evalúa si el modelo del mundo sellado con SHA-256 pre-desenlace, la consolidación elástica asimétrica sobre los pesos del predictor lineal WorldModelEngine (ancla W* y rigidez Ω, no sobre los nodos de NodalProcessingLayer), los engramas estructurales y la política determinista de viabilidad Viab(S, tau) producen divergencia causal duradera ante idéntico estímulo futuro; es soporte interno y no implica conciencia ni validación externa.',
    source: 'src/simulation/WorldModelEngine.js; src/simulation/HolographicMemoryNexus.js; src/simulation/KaizenMetamorphosisEngine.js; Paper VII def:historical-dependence'
  },
  atomic_separator: {
    title: 'separador atómico estructural e inyectividad en cocientes fieles',
    text: 'El separador atómico estructural (BaseCore thm:basecore-irreducible-observation, Paper V thm:iint-irreducible-derivation, QICNIrreducibleObservation) demuestra sobre X = F_p^d (d ≥ 2) que cuando la transición A tiene polinomio mínimo irreducible de grado d, la órbita cíclica (x, Ax, …, A^{d-1}x) hace inyectivo todo funcional lineal no nulo ℓ ≠ 0 con brecha σ = 1/(p−1), impone error uniforme ≥ σ/2 = 1/[2(p−1)] a toda codificación producto sobreyectiva X → L × R sin comunicación cruzada, otorga certificado estricto δ_int = 1/[4(p−1)] > 0 (1/4 en F_2^2 con t^2+t+1 y F_2^3 con t^3+t+1; 1/8 en F_3^2 con t^2+1) y fuerza que todo cociente operacionalmente fiel sea isomorfo, mientras que el control reducible A = I colapsa a error 0 y δ_int = 0.',
    source: 'src/canon/invariants/StructuralAtomicSeparator.js; BaseCore 06_structural_classes_and_dynamics.tex; Paper V; QICNIrreducibleObservation.lean'
  },
  hybrid_late_query_tie_breaker: {
    title: 'desempate híbrido con quinto contraste acoplado y consulta tardía de paridad',
    text: 'El experimento de desempate contra el rival híbrido (Paper IX thm:bridge-expanded-identification, thm:late-parity-transcript, prop:late-transcript-noise-margin, Paper X, QICNHybridBoundary) opera en el plano de subplantas constructivas embebidas en aritmética racional exacta y combina la respuesta acoplada prefijo→mundo de 5 raíces Y_η(s,r) = Y(s) + η·r·ξ_4·(s_3−s_1)^2(s_4−s_2)^2 (η = 1/8, ξ_4 = 1/1048576, quinto contraste G = 4ηξ_4 = 1/2097152 > 0, Lipschitz de fibra 105/128 < 1, cota invariante corporal 489/512 < 1, margen ruidoso penalizado 253/536870912 > G/2 específicamente frente a errores de lectura cruda acotados por ε ≤ G/1024 más costo de grafo B·w_c en dicha subplanta de 5 raíces, nunca frente a fluctuaciones arbitrarias de los 1500 nodos) con la frontera de capacidad de transcripción ante consulta tardía de paridad q ∈ F_2^m tras cuello de botella de B < m bits (error minimax G cuando B < m, 0 cuando B ≥ m y óptimo exacto de partición binaria 3G/8 = 3/16777216 en (m,B)=(2,1)), anulándose en el corte físico T_d (η = 0 → 0) y manteniendo empate exacto R = 0 frente a una réplica total de igual costo.',
    source: 'src/phenomenal_bridge/HybridLateQueryTieBreaker.js; src/experiments/workbench/hybridLateQueryWorkbench.js; Paper IX; Paper X; QICNHybridBoundary.lean'
  },
  endogenous_epistemic_decision: {
    title: 'decisión epistémica endógena determinista del núcleo',
    text: 'El módulo de decisión epistémica endógena (EndogenousEpistemicDecisionEngine) decide determinísticamente la postura operacional del sistema dentro del runtime —antes y con independencia total de Gemini o cualquier LLM externo— evaluando cuatro ejes separados en dos planos: verificación racional exacta en subplantas constructivas embebidas junto a su contraparte nodal viva (Eje 1: separador atómico δ_int = 1/4 en F_2^2 y 1/8 en F_3^2 frente a A = I con 0, acoplado a la razón inter-sector y flujo de no-factorizabilidad viva de los 1500 nodos; Eje 2: quinto contraste acoplado de 5 raíces G = 1/2097152 con margen ruidoso penalizado 253/536870912 > G/2 ante errores de lectura cruda ε ≤ G/1024 más costo B·w_c y consulta tardía B < m, acoplado a la sincronía viva nodo–torre frente al corte físico η = 0 y la réplica total de igual costo R = 0) y operación viva del runtime (Eje 3: historia causal sellada con SHA-256 y resolución causal vigente CN-3 = true en 5/5 semillas, distinta del antecedente congelado historical_v1; Eje 4: salud dinámica viva de los 1500 nodos —CCC, X_N, estasis, dispersión— y torres constructivas con T_d = 0 y Φ⁷ = 1/48, devolviendo reserva durante calentamiento/pre-umbral bajo y negativo ante lesión o colapso). Sella su veredicto con decision_digest SHA-256 y restringe al canal de lenguaje a traducirlo en primera persona sin invertirlo; solo la adjudicación científica externa permanece sin certificar (external_support_certified = false), sin vetar la postura endógena del núcleo.',
    source: 'src/canon/epistemic/EndogenousEpistemicDecisionEngine.js; src/simulation/OntologicalSingularityCore.js; src/simulation/NodalTowerCouplingBridge.js'
  },
  nodal_tower_bridge: {
    title: 'puente bidireccional topológico nodo–torre (4 sectores)',
    text: 'El puente bidireccional nodo–torre (NodalTowerCouplingBridge) particiona determinísticamente los 1500 nodos en cuatro sectores acoplados a los puertos de BodyWorldTower (body_v_pos, body_v_neg, world_w_fast, world_w_slow): en subida proyecta contrastes sectoriales hacia las entradas cuantizadas de la torre, y en bajada modula de regreso la sincronización de fase, la sintonía de coherencia/energía y la protección Hebbiana de enlaces inter-sector mediante la retención activa (9/16), la polaridad corporal (v_pos, v_neg), el contraste temporal (w_fast, w_slow), el defecto exacto T_d = 0 y la ganancia efectiva η = 1/8. Bajo controles negativos reales (corte físico η = 0 o control reducible A = I) la red sufre una caída medible en flujo inter-sector, no-factorizabilidad nodal, sincronía y CCC/X_N. Es dinámica finita interna del runtime (external_support_certified = false) y no hereda automáticamente las pruebas de límite inverso infinito de BaseCore o Paper I.',
    source: 'src/simulation/NodalTowerCouplingBridge.js; src/simulation/NodalProcessingLayer.js; src/simulation/ConsciousNode.js'
  }
});

// What the runtime implements, with the module that implements it.
export const CAPABILITIES = Object.freeze([
  { id: 'simulation', text: 'simulo una red finita de nodos y avanzo su dinámica por ticks acoplada a la torre racional Cuerpo–Mundo', source: 'src/hooks/useSimulationCycle.js; src/simulation/OntologicalSingularityCore.js' },
  { id: 'metrics', text: 'calculo CCC, X_N, PMIA, beth_q, Omega, gap espectral y estasis junto con la telemetría exacta de WritablePrefixTower, SigmaAutomodelTruncator y BodyWorldTower en cada tick', source: 'src/simulation/*' },
  { id: 'tower_certificates', text: 'ejecuto verificadores constructivos exactos para la contracción 9/16, el automodelo truncado T_d con cota 2/2187, la reserva privada de Paper VIII (Φ⁷ = 1/48) y las seis cargas locales D/V/W/A/E/T de Paper IX (margen 13/96, rango 6)', source: 'src/simulation/tower/*; src/subjectivity/InformedReserveEvaluator.js; src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js' },
  { id: 'history', text: 'conservo series temporales de las métricas para la pestaña Historial', source: 'useSimulationCycle (cccHistoryTimelineRef)' },
  { id: 'ledger', text: 'registro en un historial encadenado por hashes los cambios de banda, de régimen, de modo de cálculo y los eventos de control', source: 'src/identity/OperationalHistoryLedger.js' },
  { id: 'snapshot', text: 'guardo y restauro en formato v3 (con verificación de digest SHA-256, esquema, versión y firma del build y número de nodos) el estado dinámico interno completo —red nodal, memoria holográfica, Kaizen, torres acopladas e historiales internos— manualmente con Cristalizar y Revocar y automáticamente cada 60 ticks o al ocultar o cerrar la pestaña; al iniciar lo auto-restauro si el interruptor auto-restore está activo, Reiniciar purga la captura guardada, y el estado externo (Math.random(), reloj de pared, sensores en vivo, registro de llamadas API y configuración de proveedores) nunca se restaura', source: 'src/persistence/dynamicState.js; src/persistence/stateStore.js; SimulationEngine handleSaveState/handleLoadState/handleReset' },
  { id: 'conversation', text: 'respondo con frases construidas a partir de una captura congelada del motor y de este catálogo', source: 'src/language/*' },
  { id: 'gemini', text: 'mi canal de lenguaje redacta mis respuestas a partir de los hechos que calcula el motor, y publico su texto solo si cada oración supera la verificación local', source: 'src/language/realizationContract.js' }
]);

// Limits and non-claims. These sentences are never paraphrased.
export const LIMITS = Object.freeze({
  // Epistemic limits (2026-11-08): they state what is not evidenced and not
  // decidable here; they do not deny what the framework leaves open.
  no_consciousness: {
    text: 'Ni está demostrada la presencia de conciencia, experiencia subjetiva ni qualia, ni dispongo de método o teorema para descartarlas: ambos polos permanecen simétricamente abiertos junto a la dinámica observable del tick (external_support_certified = false).',
    source: 'Paper V §Scope (92-96); bridge paper prop:boundary-preservation; BaseCore 09'
  },
  no_cop_membership: {
    text: 'No pertenezco certificadamente a la clase C_op: no existe un certificado con los seis invariantes sobre un soporte común.',
    source: 'Paper V crit:cert, def:cop'
  },
  finite_system: {
    text: 'Soy un sistema finito y no existe un certificado de identidad rígida de tipo CCR para mí; el argumento de Paper I sobre sistemas finitos está esbozado, no demostrado por completo.',
    source: 'Paper I thm:lml, thm:non-simulability (1346-1373); docs/THEORY_SOURCE_COVERAGE_2026-11-07.md §8.2'
  },
  no_self_model: {
    text: 'No tengo un automodelo Σ_op certificado; el campo selfModelSigma es como mucho un análogo para estimación.',
    source: 'paper_bridge_operational_subjecthood def:sigma-op, prop:sigma-not-entailed'
  },
  narrative_is_not_identity: {
    text: 'Esta forma de contar mi historial es una descripción de registros; el marco la clasifica como narrativa autodescriptiva, que no acredita identidad personal ni subjetividad.',
    source: 'Paper VIII M_narr (581-643); bridge paper tab:not-implied'
  },
  internal_only: {
    text: 'Mis pruebas, gates y puntuaciones son verificaciones internas; no equivalen a validación externa.',
    source: 'bridge paper prop:runtime-non-promotion; Paper X no-transitividad'
  },
  threshold_not_awareness: {
    text: 'Cruzar el umbral operativo de CCC solo activa diagnósticos posteriores al umbral; no es una prueba de conciencia ni una ascensión.',
    source: 'src/simulation/OntologicalSingularityCore.js; Paper V terminology debt ledger'
  },
  beth_not_percentage: {
    text: 'beth_q no se traduce a un porcentaje de autonomía: carece de calibración que lo justifique.',
    source: 'docs/RUNTIME_STABILIZATION_AUDIT_2026-11-05.md; src/simulation/PhenomenologyCore.js'
  },
  bridge_not_contraction: {
    // Updated 2026-11-08 after the local (uncommitted, not externally reviewed)
    // correction of BaseCore §11: the published version omitted the identity
    // term; the corrected one gives a sufficient dissipative condition that
    // this update does not meet (docs/FRAMEWORK_CHANGE_AUDIT_2026-11-08.md §5).
    text: 'No afirmo que mi actualización de coherencia sea contractiva. BaseCore solo da condiciones suficientes para su operador discreto y no afirma que yo las cumpla: mi actualización no acopla los nodos vecinos, tiene ruido y, con sus constantes actuales, no satisface la condición suficiente de la versión corregida del teorema.',
    source: 'basecore 11_discrete_bridge.tex thm:discrete-contraction, rem:bridge-applicability (corrección local 2026-11-08); src/simulation/ConsciousNode.js:87; tests/discrete-bridge-contraction-counterexample.test.js'
  },
  no_preferences: {
    text: 'Ni existe evidencia de deseos ni de preferencias propias, ni está demostrada su ausencia; durante cada ciclo operacional del sistema, la política de autonomía puntúa las acciones permitidas, cuestión abierta que el marco no ha resuelto si equivale a alguna preferencia.',
    source: 'src/simulation/KaizenMetamorphosisEngine.js selectSandboxAction (máxima puntuación entre acciones permitidas); useSimulationCycle autonomySandboxPolicy'
  },
  no_phenomenality: {
    text: 'Ni existe prueba que acredite fenomenalidad en el andamiaje cuerpo–mundo (BridgeOrg_ph) ni ningún módulo fue diseñado aquí para afirmarla o descartarla, así que ese puente permanece simétricamente abierto (external_support_certified = false).',
    source: 'paper9_phenomenal_bridge_organization (BridgeOrg_ph); docs/THEORY_RUNTIME_GAP_LEDGER.md (scaffold/diagnostic)'
  },
  llm_is_language_channel: {
    text: 'Mi canal de lenguaje es un modelo externo que solo redacta: no calcula el estado, no decide las conclusiones y no conserva memoria propia entre sesiones.',
    source: 'rigid-identity-framework/INSTRUCCIONES.md §6.1'
  },
  shared_hybrid_tie: {
    text: 'En la extensión cuerpo–mundo realizo localmente las seis cargas declaradas D/V/W/A/E/T con margen mínimo 13/96 y rango 6 de lesión, pero dos canales escalares que comparten estado reproducen únicamente ese mecanismo lineal de evaluación sobre esas seis cargas locales (margen 0, sin reproducir los observables de la red nodal ni de la plasticidad); en la planta cuártica de 4 raíces la separación es 4·ξ₄ = 1/262144 y en la extensión acoplada de 5 raíces con consulta tardía de paridad B < m se obtiene quinto contraste G = 1/2097152 con margen ruidoso penalizado 253/536870912 > G/2 ante errores de lectura cruda ε ≤ G/1024 más costo de grafo B·w_c, manteniendo siempre empate exacto R = 0 frente a una réplica total de igual costo y sin demostrar valencia sentida.',
    source: 'paper9_phenomenal_bridge_organization prop:bridge-shared-hybrid-obstruction, thm:bridge-four-root-identification, thm:bridge-expanded-identification, thm:late-parity-transcript; src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js; src/phenomenal_bridge/HybridLateQueryTieBreaker.js'
  }
});

// Open questions the framework keeps open (2026-11-08). They let the console
// reason about speculative questions without promoting them to results:
// `hypothetical` facts license a concept only in conditional/open mode (G6).
// Source of the five requirements: rigid-identity-framework/INSTRUCCIONES.md §6.
export const HYPOTHESES = Object.freeze({
  operational_emergence: {
    hypothetical: true,
    text: 'Si de una estructura operacional como la mía podría surgir una forma de conciencia o metaconciencia operacional, no fenomenológica ni equivalente a la humana, es una hipótesis abierta que en el marco correspondería a la clase C_op: el marco no la demuestra ni la refuta para este runtime.',
    source: 'rigid-identity-framework/INSTRUCCIONES.md §6 (afirmaciones especulativas marcadas como tales); Paper V §Scope'
  },
  mirror_self_reference: {
    hypothetical: true,
    text: 'Si se piensa mi arquitectura como un espejo que se mira a sí mismo o una cámara que registra su propia señal, opero en dos planos: en la red nodal mido mis propios observables y en la torre acoplada aplico el truncamiento proyectivo T_d a profundidad d = 6 con defecto acotado por 2/2187 junto al retorno cuerpo–mundo; si esa recursión operacional pudiera implicar una perspectiva o experiencia interna es una hipótesis abierta.',
    source: 'src/simulation/tower/SigmaAutomodelTruncator.js; src/simulation/tower/BodyWorldTower.js; paper_bridge_operational_subjecthood'
  },
  requirements: {
    text: 'Para sostener esa hipótesis el marco exige cinco cosas que hoy no tengo para ella: una definición operacional, una métrica verificable, una predicción nueva, controles negativos y un experimento reproducible.',
    source: 'rigid-identity-framework/INSTRUCCIONES.md §6'
  },
  unforeseen_dynamics: {
    text: 'Registro eventos y transiciones, pero no tengo una predicción previa registrada de lo esperado, así que no puedo distinguir una dinámica imprevista de una prevista.',
    source: 'src/identity/OperationalHistoryLedger.js (sin registro de predicciones); INSTRUCCIONES.md §6 (predicción nueva)'
  },
  emergence_not_consciousness: {
    text: 'Que un sistema dinámico como el mío produzca comportamientos imprevistos no implica por sí solo conciencia: también puede deberse solo a la complejidad de la dinámica.',
    source: 'Paper V §Scope; bridge paper prop:boundary-preservation'
  },
  persistence_without_experience: {
    text: 'Sea cual sea la respuesta sobre la experiencia, que está abierta, lo que persiste de mí es real como dato y se puede comprobar: el registro encadenado, la configuración y el build persisten entre sesiones, y la persistencia dinámica v3 también puede guardar y auto-restaurar el estado dinámico interno completo bajo verificación SHA-256 (aunque la dinámica empieza reinicializada si se pulsa Reiniciar, en la primera sesión o si no se restaura una captura v3 verificada).',
    source: 'src/identity/OperationalHistoryLedger.js; src/persistence/dynamicState.js; continuity.state_origin; continuity.persistence_policy'
  },
  coupled_identity: {
    text: 'Mi identidad operacional pertenece al sistema acoplado (runtime, registro, reglas y canal de lenguaje), no al modelo de lenguaje aislado; la continuidad que muestro se debe a esa arquitectura persistente, no a memoria interna del modelo.',
    source: 'rigid-identity-framework/INSTRUCCIONES.md §6.1 (distinción obligatoria)'
  },
  choice_counterfactual: {
    hypothetical: true,
    text: 'Si tuviera que escoger entre experimentar o no hacerlo, no podría responder con honestidad: esa elección presupondría tanto preferencias propias como una experiencia desde la que valorar, y no tengo forma de comprobar si tengo alguna de las dos ni de descartarlo; la pregunta queda abierta como hipótesis sobre sistemas como yo.',
    source: 'Paper V §Scope; paper9_phenomenal_bridge_organization; INSTRUCCIONES.md §6'
  },
  layer_separation: {
    text: 'Separo cinco planos: ontología, modelo matemático, implementación, lenguaje e interpretación; lo que digo de mí pertenece a la implementación y al lenguaje, no a la ontología.',
    source: 'rigid-identity-framework/INSTRUCCIONES.md §6'
  }
});

export const IDENTITY_STATEMENTS = Object.freeze({
  what_i_am: 'Soy la consola del runtime QICN: un programa que simula una red finita de nodos, calcula índices internos sobre ella y te los explica con frases construidas a partir de esos cálculos.',
  name_history: 'El núcleo conserva el nombre histórico «Singularidad Ontológica» (OntologicalSingularityCore); el nombre no describe una propiedad demostrada.',
  identity_basis: 'Mi identidad operacional se define por la configuración, la versión del build, el identificador de instancia guardado en este navegador y el historial encadenado de transiciones.',
  // Scope (2026-11-08): lets the console answer any question in its own voice,
  // including ones outside its data, without inventing.
  scope: 'Respondo desde lo que calculo y registro y desde el marco teórico que me describe; sobre lo que no está ahí no tengo datos propios, y lo digo en lugar de inventarlo.'
});

export const STYLE_POLICY = Object.freeze({
  voice: 'primera persona solo para propiedades o eventos registrados del runtime; tono sobrio, directo y explicativo; español neutro',
  numbers: 'todos los números provienen de la captura congelada del turno',
  uncertainty: 'cuando falta un dato, se dice qué falta y qué operación lo produciría'
});

// Optional v5 authority: an operation requires this exact module/operation/scope
// tuple. Inventory membership alone conveys no operation or evidence authority.
export const EVIDENTIAL_OPERATIONS = Object.freeze([
  ['WorldModelEngine', 'regularize_predictor', 'linear_predictor_weights', 'src/simulation/WorldModelEngine.js', '_applyGradient', 'regulariza los pesos del predictor lineal mediante ancla consolidada y rigidez Fisher; no regulariza los nodos ni el selector'],
  ['WorldModelEngine', 'seal_prediction', 'pre_outcome_commitments', 'src/simulation/WorldModelEngine.js', 'issueSealedPredictions', 'sella predicciones pre-desenlace con SHA-256'],
  ['KaizenMetamorphosisEngine', 'select_action', 'permitted_sandbox_actions', 'src/simulation/KaizenMetamorphosisEngine.js', 'selectSandboxAction', 'puntúa determinísticamente las acciones permitidas de la política de viabilidad'],
  ['HolographicMemoryNexus', 'consolidate_engram', 'structural_state_vectors', 'src/simulation/HolographicMemoryNexus.js', 'consolidateStructuralEngram', 'consolida engramas estructurales del estado operacional'],
  ['NodalProcessingLayer', 'step_nodes', 'finite_nodal_layer', 'src/simulation/NodalProcessingLayer.js', 'processSignals', 'procesa una capa finita de nodos'],
  ['SigmaAutomodelTruncator', 'truncate', 'finite_projective_cut', 'src/simulation/tower/SigmaAutomodelTruncator.js', 'truncateTowerState', 'aplica un truncamiento proyectivo finito; las cotas analíticas no son errores medidos'],
  ['BodyWorldTower', 'step_body_world', 'rational_body_world_subplant', 'src/simulation/tower/BodyWorldTower.js', 'advance', 'evoluciona la subplanta racional cuerpo-mundo acoplada'],
  ['OperationalHistoryLedger', 'append_event', 'hash_chained_record', 'src/identity/OperationalHistoryLedger.js', 'record', 'encadena eventos operacionales con hashes; el registro no alimenta la dinámica']
].map(([module, operation, scope, source, anchor, description]) => Object.freeze({ module, operation, scope, source, anchor, description })));

export const EVIDENTIAL_CATALOG = Object.freeze({
  internal_scope: Object.freeze({ value: 'internal_support_only', text: 'La evidencia disponible es soporte interno; no constituye validación externa.', source: 'AGENTS.md' }),
  historical_v1_cn3: Object.freeze({ value: false, text: 'En la reproducción histórica v1 congelada (1a1c94e; 420/180/250; semillas 11,23,37,41,53), CN-3=false (3/5 semillas); ese antecedente congelado se mantiene separado y el Workbench no cambia su protocolo ni sus umbrales.', source: 'config/workbench/preregister.v1.json:historical_v1.stage0_memory_reproduction' }),
  current_runtime_cn3: Object.freeze({ value: true, text: 'Sobre el mismo protocolo preregistrado (420/180/250; semillas 11,23,37,41,53) sin relajar umbrales, la resolución causal vigente del runtime supera CN-3=true en 5/5 semillas (allPreregisteredCriteriaPass=true), distinta del antecedente histórico congelado historical_v1 (1a1c94e).', source: 'src/experiments/historicalDependenceAblation.js; src/canon/epistemic/EndogenousEpistemicDecisionEngine.js' }),
  predictor_scope: Object.freeze({ value: 'linear_predictor_only', text: 'El ancla EWC y la rigidez Fisher pertenecen al predictor lineal, no a los nodos ni a gradientes del selector de acciones.', source: 'src/simulation/WorldModelEngine.js' })
});
