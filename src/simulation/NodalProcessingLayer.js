import { bindExecutionEnvironment, executionEnvironmentFor } from '../runtime/ExecutionEnvironment.js';
import { QICNConfig } from '../../services/config.js';
import { ConsciousNode } from './ConsciousNode.js';
import {
  annotateNodesWithSectors,
  computeNodalSectorMetrics,
  normalizeCouplingMode,
  populate3DTelemetryView,
  sectorIdOf
} from './NodalTowerCouplingBridge.js';

// Non-enumerable per-instance telemetry cache so B0 ('off') mode and v3 captures
// stay 100% clean while 60 FPS Bloque 2 WebGL views reuse pre-allocated TypedArrays.
const LAYER_TELEMETRY_CACHE = new WeakMap();
const getLayerCache = (layer) => {
  let entry = LAYER_TELEMETRY_CACHE.get(layer);
  if (!entry) {
    entry = { signalStats: null, nodeInterFlux: null, bridgeMetrics: null, buffers: null };
    LAYER_TELEMETRY_CACHE.set(layer, entry);
  }
  return entry;
};

export class NodalProcessingLayer {
          constructor(executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
            this.nodes = [];
            this.activeNodeIds = new Set();
            this.signalBuffer = [];
          }

          initializeNodes(mutableConfig) {
            // Only initialize a small sample (PROCESSING_SAMPLE_SIZE)
            this.nodes = Array.from({ length: executionEnvironmentFor(this).config.PROCESSING_SAMPLE_SIZE }, (_, i) =>
              new ConsciousNode(i, mutableConfig, executionEnvironmentFor(this))
            );

            // Create connections
            this.nodes.forEach(node => {
              const numConnections = executionEnvironmentFor(this).config.NODE_CONNECTION_MIN +
                Math.floor(executionEnvironmentFor(this).random() * (executionEnvironmentFor(this).config.NODE_CONNECTION_MAX - executionEnvironmentFor(this).config.NODE_CONNECTION_MIN));

              for (let i = 0; i < numConnections; i++) {
                const targetId = Math.floor(executionEnvironmentFor(this).random() * executionEnvironmentFor(this).config.PROCESSING_SAMPLE_SIZE);
                if (targetId !== node.id &&
                    !node.connections.find(c => c.targetId === targetId)) {
                  node.connections.push({
                    targetId: targetId,
                    weight: 0.5 + executionEnvironmentFor(this).random() * 0.5,
                  });
                }
              }
            });

            // Activate initial nodes
            this.activateRandomNodes(executionEnvironmentFor(this).config.PROCESSING_SAMPLE_SIZE);

            const couplingMode = normalizeCouplingMode(executionEnvironmentFor(this).config?.NODAL_TOWER_COUPLING_MODE);
            if (couplingMode !== 'off') {
              annotateNodesWithSectors(this.nodes, couplingMode);
            }

            return this.nodes;
          }

          ensureSectorAnnotations(mode = null) {
            const couplingMode = normalizeCouplingMode(mode ?? executionEnvironmentFor(this).config?.NODAL_TOWER_COUPLING_MODE);
            if (couplingMode !== 'off') {
              annotateNodesWithSectors(this.nodes, couplingMode);
            }
          }

          /**
           * Deterministic synaptic recovery of cross-sector bridges when active
           * bidirectional tower coupling resumes after a lesion (e.g., live toggle
           * reducible_control -> bidirectional without hard reset). Zero RNG draws;
           * never executed in B0 ('off') or lesioned modes.
           */
          recoverInterSectorConnections(towerFeedback, step = 0) {
            if (!towerFeedback || !towerFeedback.active) return 0;
            const total = this.nodes.length;
            if (total < 4) return 0;
            const activeNodes = this.getActiveNodes();
            const sproutWeight = Math.min(0.65, 0.28 + (0.14 * (towerFeedback.activeRetention ?? (9 / 16))));
            let sprouted = 0;
            for (let i = 0; i < activeNodes.length; i += 1) {
              const node = activeNodes[i];
              if (!node || !Array.isArray(node.connections)) continue;
              const srcSector = Number.isInteger(node.sectorId) ? node.sectorId : sectorIdOf(node.id);
              let interCount = 0;
              for (let j = 0; j < node.connections.length; j += 1) {
                if (sectorIdOf(node.connections[j].targetId) !== srcSector) interCount += 1;
              }
              if (interCount >= 2) continue;
              for (let k = 1; k <= 3 && interCount < 2; k += 1) {
                const desiredSector = (srcSector + k) % 4;
                const base = (node.id + (k * 7) + (step * 4)) % total;
                const offset = ((desiredSector - (base % 4)) + 4) % 4;
                let targetId = (base + offset) % total;
                if (targetId === node.id) targetId = (targetId + 4) % total;
                if (targetId !== node.id
                  && sectorIdOf(targetId) !== srcSector
                  && !node.connections.some((c) => c.targetId === targetId)) {
                  node.connections.push({ targetId, weight: sproutWeight });
                  interCount += 1;
                  sprouted += 1;
                }
              }
            }
            return sprouted;
          }

          // Simulation of Lazy Loading over the 10M potential nodes
          activateRandomNodes(count) {
            this.activeNodeIds.clear();
            const nodesToActivate = Math.min(count, executionEnvironmentFor(this).config.PROCESSING_SAMPLE_SIZE);

            while (this.activeNodeIds.size < nodesToActivate) {
              const randomId = Math.floor(executionEnvironmentFor(this).random() * executionEnvironmentFor(this).config.PROCESSING_SAMPLE_SIZE);
              this.activeNodeIds.add(randomId);
            }
          }

          processSignals(towerFeedback = null) {
            const activeNodes = this.getActiveNodes();
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');

            // Propagate signals
            const newSignals = [];
            activeNodes.forEach(node => {
              const signals = hasCoupling
                ? node.propagateSignal(activeNodes, towerFeedback)
                : node.propagateSignal(activeNodes);
              newSignals.push(...signals);
            });

            let sectorIntraFlux = null;
            let sectorInterFlux = null;
            let totalIntraFlux = 0;
            let totalInterFlux = 0;
            let nodeInterFlux = null;
            if (hasCoupling) {
              sectorIntraFlux = [0, 0, 0, 0];
              sectorInterFlux = [0, 0, 0, 0];
              const cache = getLayerCache(this);
              if (!cache.nodeInterFlux || cache.nodeInterFlux.length !== this.nodes.length) {
                cache.nodeInterFlux = new Float32Array(this.nodes.length);
              } else {
                cache.nodeInterFlux.fill(0);
              }
              nodeInterFlux = cache.nodeInterFlux;
            }

            // Process incoming signals (Optimized O(1) lookup: nodes array is indexed by ID)
            newSignals.forEach(signal => {
              const targetNode = this.nodes[signal.targetId]; // CORRECCION: Lookup O(1)
              if (targetNode) {
                targetNode.intensity = Math.min(1, targetNode.intensity + signal.strength * 0.05);
                if (hasCoupling) {
                  const targetS = Number.isInteger(signal.targetSector) ? signal.targetSector : ((signal.targetId % 4) + 4) % 4;
                  if (signal.isInterSector) {
                    sectorInterFlux[targetS] += signal.strength;
                    totalInterFlux += signal.strength;
                    if (signal.targetId >= 0 && signal.targetId < nodeInterFlux.length) {
                      nodeInterFlux[signal.targetId] += signal.strength;
                    }
                  } else {
                    sectorIntraFlux[targetS] += signal.strength;
                    totalIntraFlux += signal.strength;
                  }
                }
              }
            });

            if (hasCoupling) {
              const cache = getLayerCache(this);
              cache.signalStats = {
                sectorIntraFlux,
                sectorInterFlux,
                totalIntraFlux,
                totalInterFlux
              };
            }

            this.signalBuffer = newSignals.slice(-1000);
          }

          computeBridgeMetrics(towerTelemetry = null, mode = null) {
            const couplingMode = normalizeCouplingMode(mode ?? executionEnvironmentFor(this).config?.NODAL_TOWER_COUPLING_MODE);
            const cache = getLayerCache(this);
            const metrics = computeNodalSectorMetrics(
              this.getActiveNodes(),
              cache.signalStats,
              towerTelemetry,
              couplingMode
            );
            cache.bridgeMetrics = metrics;
            if (couplingMode !== 'off') {
              this.lastBridgeMetrics = metrics;
            }
            return metrics;
          }

          getBridgeMetrics() {
            return getLayerCache(this).bridgeMetrics || this.lastBridgeMetrics || null;
          }

          get3DTelemetryView(towerTelemetry = null, endogenousDecision = null) {
            const cache = getLayerCache(this);
            return populate3DTelemetryView(
              this.nodes,
              this.activeNodeIds,
              cache.bridgeMetrics || this.lastBridgeMetrics || null,
              towerTelemetry,
              endogenousDecision,
              cache,
              cache.nodeInterFlux
            );
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
              totalNodes: executionEnvironmentFor(this).config.TOTAL_NODES,
              activeLimit: executionEnvironmentFor(this).config.ACTIVE_NODES_LIMIT,
              averageConnections: totalConnections / (activeNodes.length || 1),
              signalBufferSize: this.signalBuffer.length,
              activationDensity: this.activeNodeIds.size / executionEnvironmentFor(this).config.TOTAL_NODES
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
