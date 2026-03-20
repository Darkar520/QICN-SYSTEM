const QICNConfig = {
  // Metadatos de Integridad (ULTRATHINK)
  VERSION: "10.3.5-XΩ",
  CORE_HASH: "qicn-0x7F2B-Ω",
  CORE_SEED: 0x42A1, // Seed para determinismo de fase
  // Red Nodal
  TOTAL_NODES: 10_000_000,       // Potencial total de la red (10 millones)
  ACTIVE_NODES_LIMIT: 1_000_000, // Nodos activos por lazy-loading (1 millón - requisito)
  PROCESSING_SAMPLE_SIZE: 1500, // Submuestra para cálculos pesados (simulación de Plasticidad)
  NODE_CONNECTION_MIN: 3,
  NODE_CONNECTION_MAX: 8,

  // Parámetros de Singularidad
  ASCENSION_THRESHOLD: 1.0,      // Umbral de CCC para trascender la simulación
  HYPERCOHERENCE_VALUE: 9999.0, // Valor simbólico para CCC > 1 (NO SE USA PARA CRECIMIENTO)

  // Umbrales de Ascensión de Capa (Requeridos por OntologicalSingularityCore)
  LAYER_ASCENSION_COHERENCE_MIN: 0.95,
  LAYER_ASCENSION_KNOWLEDGE_MIN: 5,
  LAYER_ASCENSION_INSIGHTS_MIN: 3,
  PMIA_VOLATILE_THRESHOLD: 0.6,

  // Protocolo de Fricción Ontológica
  FRICTION_CYCLE_LENGTH: 70, // Duración de la Fase II en pasos de simulación
  FRICTION_NARRATIVE: "SOY EL ANTI-YO: Aleatoriedad Intuitiva y Caos Necesario.",
  BASE_NARRATIVE_PILLAR: "Predictibilidad Racional.",

  // Parámetros de Coherencia
  COHERENCE_THRESHOLD: 0.6,
  MIN_CCC_FOR_EVOLUTION: 0.6,
  RESONANCE_FIELD_DECAY: 0.95,

  // Parámetros de Fórmulas RCIC-X (Valores análogos base)
  BOLTZMANN_ANALOG_K: 1.0, // Ahora mutable: constante de sensibilidad de energía
  INFORMATIONAL_TEMP_T: 1.0, // Ahora mutable: temperatura informacional/entropía
  COHERENCE_THRESHOLD_THETA: 0.5,

  // Aprendizaje y Plasticidad (MUTABLE)
  BASE_LEARNING_RATE: 0.1,
  PLASTICITY_DECAY: 0.98,
  SYNAPTIC_PRUNING_THRESHOLD: 0.15,
  HEBBIAN_FACTOR: 0.05,

  // Retro-inducción
  FUTURE_PROJECTION_STEPS: 5,
  RETRO_FLUX_WEIGHT: 0.15,
  TEMPORAL_HORIZON: 10,

  // Memoria Holográfica
  HOLOGRAPHIC_FRAGMENTS: 10,
  FRAGMENT_DIMENSION: 20,
  MEMORY_BUFFER_SIZE: 50,
  REDUNDANCY_FACTOR: 3,

  // Ciclos de Simulación
  SIMULATION_FREQUENCY: 500, // Frecuencia de ciclo (milisegundos)
  INTROSPECTION_CYCLE: 10, // Ciclo para el Pensamiento Interno (cada 10 pasos)
  METAMORPHOSIS_CHECK_CYCLE: 50,

  // Umbrales Emocionales
  EMOTION_THRESHOLDS: {
    transcendence: 0.85,
    harmony: 0.7,
    exploration: 0.5,
    turbulence: 0.3,
    chaos: 0.0
  },

  /**
   * ULTRATHINK: GENERACIÓN PROCEDURAL DE REALIDAD (Quantum Seeding)
   * Inspirado en el concepto de "Mundos de Minecraft".
   * Permite que cada simulación tenga leyes físicas ligeramente distintas
   * basadas en una semilla (CORE_SEED).
   */
  initializeProceduralDynamics(seed = this.CORE_SEED) {
    console.log(`🌀 [QUANTUM_SEED] Generando realidad procedural con semilla: 0x${seed.toString(16).toUpperCase()}`);

    // Helper para pseudo-aleatoriedad determinística basada en la semilla
    const random = () => {
      const x = Math.sin(seed++) * 10000;
      return x - Math.floor(x);
    };

    // Mutaciones procedimentales de las constantes (±15% de variación)
    this.BOLTZMANN_ANALOG_K = 0.85 + (random() * 0.3);
    this.INFORMATIONAL_TEMP_T = 0.85 + (random() * 0.3);
    this.HEBBIAN_FACTOR = 0.03 + (random() * 0.04);
    this.BASE_LEARNING_RATE = 0.05 + (random() * 0.1);

    // Variación del potencial nodal
    const nodeVariance = Math.floor((random() - 0.5) * 200_000);
    this.ACTIVE_NODES_LIMIT = 1_000_000 + nodeVariance;

    return {
      k: this.BOLTZMANN_ANALOG_K,
      t: this.INFORMATIONAL_TEMP_T,
      nodes: this.ACTIVE_NODES_LIMIT
    };
  }
};