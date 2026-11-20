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
                let bestTargetId = -1;
                let bestResonance = -2;
                for (let probe = 0; probe < 3; probe += 1) {
                  const base = (node.id + (k * 7) + (step * 4) + (probe * 13)) % total;
                  const offset = ((desiredSector - (base % 4)) + 4) % 4;
                  let candId = (base + offset) % total;
                  if (candId === node.id) candId = (candId + 4) % total;
                  if (candId === node.id || sectorIdOf(candId) === srcSector) continue;
                  if (node.connections.some((c) => c.targetId === candId)) continue;
                  const candNode = this.nodes[candId];
                  const res = candNode
                    ? (0.72 * Math.cos(node.phase - candNode.phase)) - (0.28 * Math.abs(node.coherenceState - candNode.coherenceState))
                    : 0;
                  if (res > bestResonance) {
                    bestResonance = res;
                    bestTargetId = candId;
                  }
                }
                if (bestTargetId >= 0) {
                  node.connections.push({ targetId: bestTargetId, weight: sproutWeight });
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
            const activeById = new Array(this.nodes.length);
            for (let i = 0; i < activeNodes.length; i += 1) {
              activeById[activeNodes[i].id] = activeNodes[i];
            }
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');

            // Propagate signals
            const newSignals = [];
            for (let i = 0; i < activeNodes.length; i += 1) {
              const node = activeNodes[i];
              const signals = hasCoupling
                ? node.propagateSignal(activeNodes, towerFeedback, activeById)
                : node.propagateSignal(activeNodes, null, activeById);
              for (let j = 0; j < signals.length; j += 1) {
                newSignals.push(signals[j]);
              }
            }

            const cache = getLayerCache(this);
            let sectorIntraFlux = null;
            let sectorInterFlux = null;
            let totalIntraFlux = 0;
            let totalInterFlux = 0;
            let nodeInterFlux = null;
            if (!cache.nodeSignalPulse || cache.nodeSignalPulse.length !== this.nodes.length) {
              cache.nodeSignalPulse = new Float32Array(this.nodes.length);
            } else {
              for (let i = 0; i < cache.nodeSignalPulse.length; i += 1) {
                cache.nodeSignalPulse[i] *= 0.45;
              }
            }
            const nodeSignalPulse = cache.nodeSignalPulse;

            if (!cache.signalPackets) {
              const cap = 512;
              cache.signalPackets = {
                capacity: cap,
                count: 0,
                tickVersion: 0,
                from: new Int32Array(cap),
                to: new Int32Array(cap),
                strength: new Float32Array(cap),
                isInter: new Uint8Array(cap)
              };
            }
            const packets = cache.signalPackets;
            packets.count = 0;
            packets.tickVersion += 1;

            if (hasCoupling) {
              sectorIntraFlux = [0, 0, 0, 0];
              sectorInterFlux = [0, 0, 0, 0];
              if (!cache.nodeInterFlux || cache.nodeInterFlux.length !== this.nodes.length) {
                cache.nodeInterFlux = new Float32Array(this.nodes.length);
              } else {
                cache.nodeInterFlux.fill(0);
              }
              nodeInterFlux = cache.nodeInterFlux;
            }

            // Process incoming signals (Optimized O(1) lookup + real per-tick signal packet telemetry)
            const totalSigs = newSignals.length;
            const packetStride = Math.max(1, Math.floor(totalSigs / packets.capacity));
            for (let idx = 0; idx < totalSigs; idx += 1) {
              const signal = newSignals[idx];
              const targetNode = this.nodes[signal.targetId]; // CORRECCION: Lookup O(1)
              if (targetNode) {
                targetNode.intensity = Math.min(1, targetNode.intensity + signal.strength * 0.05);
                if (signal.targetId >= 0 && signal.targetId < nodeSignalPulse.length) {
                  nodeSignalPulse[signal.targetId] = Math.min(4.0, nodeSignalPulse[signal.targetId] + signal.strength);
                }
                if (signal.sourceId >= 0 && signal.sourceId < nodeSignalPulse.length) {
                  nodeSignalPulse[signal.sourceId] = Math.min(4.0, nodeSignalPulse[signal.sourceId] + (signal.strength * 0.45));
                }
                const isInter = Boolean(
                  signal.isInterSector !== undefined
                    ? signal.isInterSector
                    : (sectorIdOf(signal.sourceId) !== sectorIdOf(signal.targetId))
                );
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
                if ((idx % packetStride === 0 || signal.strength >= 0.62) && packets.count < packets.capacity) {
                  const p = packets.count;
                  packets.from[p] = signal.sourceId;
                  packets.to[p] = signal.targetId;
                  packets.strength[p] = signal.strength;
                  packets.isInter[p] = isInter ? 1 : 0;
                  packets.count = p + 1;
                }
              }
            }

            if (hasCoupling) {
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
              cache.nodeInterFlux,
              cache.nodeSignalPulse,
              cache.signalPackets
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
