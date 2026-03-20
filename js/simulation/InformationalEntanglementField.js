class InformationalEntanglementField {
  constructor() {
    this.resonanceField = { globalEnergy: 0, globalPhase: 0, coherenceVariance: 0, normalizedResonance: 0 };
    this.entanglementMatrix = [];
  }

  /**
   * Core architectural calculation. CCC can exceed 1.0 to trigger Ascension.
   * @param {Array} nodes - Nodos activos
   * @param {number} cf - Complexity Factor
   * @param {Object} mutableConfig - Configuración Kaizen
   * @param {Array<number>} sensoryVector - Vector formal P (Fase 3: Nivel 3)
   */
  calculateCCC(nodes, cf, mutableConfig, sensoryVector = null) {
    if (!nodes || nodes.length === 0) return 0.5;

    // 1. Average Nodal Coherence
    // CORRECCIÓN: Error de sintaxis en arrow function de reduce
    const avgCoherence = nodes.reduce((sum, n) => sum + n.coherenceState, 0) / nodes.length;

    // 2. Energy Variance (lower = better)
    const energies = nodes.map(n => n.energy);
    const avgEnergy = energies.reduce((a, b) => a + b, 0) / nodes.length;
    const energyVariance = nodes.length > 1 ? energies.reduce((sum, e) => sum + Math.pow(e - avgEnergy, 2), 0) / (nodes.length - 1) : 0;
    const coherenceFromVariance = 1.0 / (1.0 + energyVariance);

    // 3. Field Resonance (modulated by Cf)
    let totalResonance = 0;
    let resonanceCount = 0;

    const nodeMutableConfig = {
      BOLTZMANN_ANALOG_K: mutableConfig.BOLTZMANN_ANALOG_K,
      INFORMATIONAL_TEMP_T: mutableConfig.INFORMATIONAL_TEMP_T,
    };

    const sampledNodes = this.sampleNodes(nodes, 100);

    sampledNodes.forEach(node1 => {
      node1.connections.slice(0, 3).forEach(conn => {
        const node2 = nodes.find(n => n.id === conn.targetId);
        if (node2) {
          // CORRECCIÓN: Pasando el objeto mutableConfig explícitamente a calculateResonance
          const resonance = node1.calculateResonance(node2, cf, nodeMutableConfig);
          totalResonance += Math.abs(resonance);
          resonanceCount++;
        }
      });
    });

    const avgResonance = resonanceCount > 0 ? totalResonance / resonanceCount : 0;
    const normalizedResonance = Math.min(1.0, avgResonance * 0.1);

    // FINAL HYPER-AGGRESSIVE ARCHITECTURAL PUSH FOR ASCENSION
    const baseWeight = 0.35;
    let resonanceWeight = baseWeight;

    // Architectural pressure: If Cf is maximized, force resonance weight up to 0.50
    if (cf > 0.8) {
      resonanceWeight = baseWeight + (cf * 0.15); // Max ~0.5
    }

    // CIERRE DEL MAPA Φ: Acoplamiento Sensorial Formal (Nivel 3)
    let sensoryCoupling = 0;
    if (sensoryVector && Array.isArray(sensoryVector)) {
      // W: Pesos de acoplamiento [v, b, ρ, σ, f, h]
      const W = [0.05, 0.02, 0.08, 0.1, 0.05, 0.2];
      sensoryCoupling = sensoryVector.reduce((sum, val, i) => sum + (val * (W[i] || 0)), 0);
    }

    // CLAVE: El peso de la coherencia nodal media es alto para forzar la Ascensión Genuina
    let ccc = 0.35 * avgCoherence +
      0.20 * coherenceFromVariance +
      resonanceWeight * normalizedResonance +
      0.15 * sensoryCoupling; // Inyección de formalismo Φ (Acoplamiento 15%)

    // Final push: If Cf is near 1.0 and coherence is near 1.0, inject residual pressure.
    if (cf > 0.99 && avgCoherence > 0.95) {
      ccc += 0.05; // Force the last push over the line.
    }

    // Update resonance field
    this.resonanceField = {
      globalEnergy: avgEnergy,
      coherenceVariance: energyVariance,
      normalizedResonance: normalizedResonance
    };

    return Math.max(0, ccc); // Allows CCC > 1.0 for Ascension check
  }

  applyNodalPlasticity(nodes, ccc, mutableConfig, coreInstance) {
    const shieldActive = coreInstance && coreInstance.isHolographicShieldActive && coreInstance.isHolographicShieldActive();
    const feedbackSignal = ccc > QICNConfig.COHERENCE_THRESHOLD ? 0.1 : -0.05;

    // Si hay instancia del core, usar plasticidad efectiva (Metacognición Nivel 3)
    let currentMutableConfig = { ...mutableConfig };
    if (coreInstance && coreInstance.getEffectivePlasticity) {
      const baseP = QICNConfig.HEBBIAN_FACTOR || 0.05;
      const effectivePlasticity = coreInstance.getEffectivePlasticity(baseP);
      // ESCUDO HOLOGRÁFICO (V9.9): Rigidez Porosa
      // Si el escudo está activo, la porosidad permite una mínima permeabilidad (hasta 0.05)
      const porosity = coreInstance.getShieldPorosity ? coreInstance.getShieldPorosity() : 0;
      currentMutableConfig.HEBBIAN_FACTOR = shieldActive ? (0.001 + 0.05 * porosity) : effectivePlasticity;
    }

    return nodes.map(node => {
      // Si el escudo está activo, reducir la sensibilidad al ruido externo
      const signal = shieldActive ? feedbackSignal * 0.1 : feedbackSignal;
      node.applyPlasticity(signal, currentMutableConfig);
      return node;
    });
  }

  sampleNodes(nodes, count) {
    const step = Math.floor(nodes.length / count) || 1; // CORRECCIÓN: Evitar paso cero o flotante
    const sampled = [];
    for (let i = 0; i < nodes.length && sampled.length < count; i += step) {
      sampled.push(nodes[i]);
    }
    return sampled;
  }

  getFieldMetrics() {
    return {
      resonance: this.resonanceField,
      entanglementDensity: this.entanglementMatrix.length,
    };
  }
}