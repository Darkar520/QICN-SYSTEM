import { QICNConfig } from '../../services/config.js';
import { ConsciousNode } from './ConsciousNode.js';

export class NodalProcessingLayer {
          constructor() {
            this.nodes = [];
            this.activeNodeIds = new Set();
            this.signalBuffer = [];
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
                    weight: 0.5 + Math.random() * 0.5,
                  });
                }
              }
            });

            // Activate initial nodes
            this.activateRandomNodes(QICNConfig.PROCESSING_SAMPLE_SIZE);

            return this.nodes;
          }

          // Simulation of Lazy Loading over the 10M potential nodes
          activateRandomNodes(count) {
            this.activeNodeIds.clear();
            const nodesToActivate = Math.min(count, QICNConfig.PROCESSING_SAMPLE_SIZE);

            while (this.activeNodeIds.size < nodesToActivate) {
              const randomId = Math.floor(Math.random() * QICNConfig.PROCESSING_SAMPLE_SIZE);
              this.activeNodeIds.add(randomId);
            }
          }

          processSignals() {
            const activeNodes = this.getActiveNodes();

            // Propagate signals
            const newSignals = [];
            activeNodes.forEach(node => {
              const signals = node.propagateSignal(activeNodes);
              newSignals.push(...signals);
            });

            // Process incoming signals (Optimized O(1) lookup: nodes array is indexed by ID)
            newSignals.forEach(signal => {
              const targetNode = this.nodes[signal.targetId]; // CORRECCION: Lookup O(1)
              if (targetNode) {
                targetNode.intensity = Math.min(1, targetNode.intensity + signal.strength * 0.05);
              }
            });

            this.signalBuffer = newSignals.slice(-1000);
          }

          getActiveNodes() {
            // NOTE: This assumes nodes in `this.nodes` are indexed by ID, which is true for the sample size.
            return Array.from(this.activeNodeIds).map(id => this.nodes[id]).filter(n => n);
          }

          getTopologyMetrics() {
            const activeNodes = this.getActiveNodes();
            // CORRECCION: Error de sintaxis en arrow function de reduce
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

          // NEW: Get highly coherent nodes for visualization (simulates attentional focus)
          getHighlyCoherentNodes(count = 150) {
            const processedNodes = this.nodes.filter(
              (node) => node && this.activeNodeIds.has(node.id)
            );

            if (processedNodes.length === 0) {
              return [];
            }

            const sortedByCoherence = [...processedNodes].sort(
              (a, b) => b.coherenceState - a.coherenceState
            );
            const coherentNodes = sortedByCoherence.filter(
              (node) => node.coherenceState > 0.6
            );

            if (coherentNodes.length >= count || sortedByCoherence.length <= count) {
              return coherentNodes.slice(0, count);
            }

            // Fallback for large requested samples (e.g. 1500): fill with best processed nodes.
            return sortedByCoherence.slice(0, count);
          }
        }
