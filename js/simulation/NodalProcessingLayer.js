class NodalProcessingLayer {
  constructor() {
    this.nodes = [];
    this.activeNodeIds = new Set();
    this.signalBuffer = [];
    this.initialized = false;
  }

  initializeNodes(mutableConfig) {
    // Only initialize a small sample (PROCESSING_SAMPLE_SIZE)
    this.nodes = Array.from({ length: QICNConfig.PROCESSING_SAMPLE_SIZE }, (_, i) =>
      new ConsciousNode(i, mutableConfig)
    );

    // Create connections
    this.nodes.forEach(node => {
      const numConnections = QICNConfig.NODE_CONNECTION_MIN +
        Math.floor(Math.random() * (QICNConfig.NODE_CONNECTION_MAX - QICNConfig.NODE_CONNECTION_MIN));

      for (let i = 0; i < numConnections; i++) {
        const targetId = Math.floor(Math.random() * QICNConfig.PROCESSING_SAMPLE_SIZE);
        if (targetId !== node.id &&
          !node.connections.find(c => c.targetId === targetId)) {
          node.connections.push({
            targetId: targetId,
            weight: 0.3 + Math.random() * 0.7, // Peso más diverso
          });
        }
      }
    });

    // Activate ALL nodes initially for visibility
    this.activateRandomNodes(QICNConfig.PROCESSING_SAMPLE_SIZE);

    this.initialized = true;
    console.log(`[NODAL] Red nodal inicializada: ${this.nodes.length} nodos, ${this.activeNodeIds.size} activos`);

    return this.nodes;
  }

  // Simulation of Lazy Loading over the 10M potential nodes
  activateRandomNodes(count) {
    this.activeNodeIds.clear();
    const nodesToActivate = Math.min(count, QICNConfig.PROCESSING_SAMPLE_SIZE);

    for (let i = 0; i < nodesToActivate; i++) {
      this.activeNodeIds.add(i); // Activar los primeros N nodos
    }
  }

  processSignals() {
    if (!this.initialized || this.nodes.length === 0) return;

    const activeNodes = this.getActiveNodes();
    if (activeNodes.length === 0) {
      // Si no hay nodos activos, activar algunos
      this.activateRandomNodes(50);
    }

    // Propagate signals
    const newSignals = [];
    activeNodes.forEach(node => {
      const signals = node.propagateSignal(activeNodes);
      newSignals.push(...signals);
    });

    // processSignals - RESONANT PROPAGATION (ULTRATHINK)
    // La transferencia de intensidad ahora considera la fase cuántica (phi)
    newSignals.forEach(signal => {
      const targetNode = this.nodes[signal.targetId];
      if (targetNode) {
        // ULTRATHINK: Solo hay resonancia si las fases están alineadas (constructivo)
        const phaseDiff = Math.abs(signal.phase - targetNode.phase);
        const coherenceAlignment = Math.cos(phaseDiff);

        if (coherenceAlignment > 0) {
          targetNode.intensity = Math.min(1, targetNode.intensity + signal.strength * 0.05 * coherenceAlignment);
        }
      }
    });

    this.signalBuffer = newSignals.slice(-1000);

    // ULTRATHINK: Actualizar coherencia de nodos basada en señales recibidas
    // Esto asegura que los nodos mantengan coherencia visible
    activeNodes.forEach(node => {
      if (node.intensity > 0.1) {
        node.coherenceState = Math.min(1, node.coherenceState + node.intensity * 0.01);
      }
    });
  }

  getActiveNodes() {
    if (!this.initialized || this.nodes.length === 0) return [];
    return Array.from(this.activeNodeIds).map(id => this.nodes[id]).filter(n => n);
  }

  getTopologyMetrics() {
    const activeNodes = this.getActiveNodes();
    const totalConnections = activeNodes.reduce((sum, node) => sum + node.connections.length, 0);

    return {
      activeNodes: activeNodes.length,
      totalNodes: QICNConfig.TOTAL_NODES,
      activeLimit: QICNConfig.ACTIVE_NODES_LIMIT,
      averageConnections: totalConnections / (activeNodes.length || 1),
      signalBufferSize: this.signalBuffer.length,
      activationDensity: this.activeNodeIds.size / QICNConfig.TOTAL_NODES
    };
  }

  // ULTRATHINK: Get coherent nodes for visualization with adaptive threshold
  getHighlyCoherentNodes(count = 150) {
    console.log(`[NODAL LAYER] getHighlyCoherentNodes llamado - initialized: ${this.initialized}, totalNodes: ${this.nodes.length}, activeNodes: ${this.activeNodeIds.size}`);

    if (!this.initialized || this.nodes.length === 0) {
      // Retornar nodos vacíos con estructura válida si no está inicializado
      console.log('[NODAL LAYER] No inicializado o sin nodos, retornando array vacío');
      return [];
    }

    // Filter to only include nodes currently being processed
    const processedNodes = this.nodes.filter(node => this.activeNodeIds.has(node.id));
    console.log(`[NODAL LAYER] Nodos procesados: ${processedNodes.length}`);

    if (processedNodes.length === 0) {
      // Si no hay nodos activos, retornar todos los nodos
      console.log('[NODAL LAYER] No hay nodos activos, retornando todos los nodos');
      return this.nodes.slice(0, count);
    }

    // ULTRATHINK: Umbral adaptativo basado en cuántos nodos hay disponibles
    // Si hay pocos nodos coherentes, reducimos el umbral
    const highCoherenceNodes = processedNodes
      .filter(node => node && node.coherenceState > 0.4) // Reducido a 0.4 para más visibilidad
      .sort((a, b) => b.coherenceState - a.coherenceState);

    console.log(`[NODAL LAYER] Nodos coherentes (>0.4): ${highCoherenceNodes.length}`);

    if (highCoherenceNodes.length < 10) {
      // Si hay muy pocos nodos coherentes, incluir nodos de menor coherencia
      const result = processedNodes
        .sort((a, b) => b.coherenceState - a.coherenceState)
        .slice(0, Math.min(count, processedNodes.length));
      console.log(`[NODAL LAYER] Pocos nodos coherentes, retornando ${result.length} nodos procesados`);
      return result;
    }

    const result = highCoherenceNodes.slice(0, count);
    console.log(`[NODAL LAYER] Retornando ${result.length} nodos coherentes`);

    // ULTRATHINK: Validar que los nodos tengan posiciones x, y
    result.forEach((node, idx) => {
      if (typeof node.x !== 'number' || typeof node.y !== 'number') {
        console.error(`[NODAL LAYER] Nodo ${idx} sin posición válida:`, node);
      }
    });

    return result;
  }
}