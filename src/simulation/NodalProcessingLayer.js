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
            const nNodes = this.nodes.length;
            const nActive = activeNodes.length;
            const cache = getLayerCache(this);

            if (!cache.activeById || cache.activeById.length !== nNodes) {
              cache.activeById = new Array(nNodes);
            } else {
              cache.activeById.fill(undefined);
            }
            const activeById = cache.activeById;

            if (!cache.intensitySnapshot || cache.intensitySnapshot.length !== nNodes) {
              cache.intensitySnapshot = new Float64Array(nNodes);
            }
            const origIntensity = cache.intensitySnapshot;

            for (let i = 0; i < nActive; i += 1) {
              const node = activeNodes[i];
              activeById[node.id] = node;
              origIntensity[node.id] = node.intensity;
            }
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');
            const crossGain = hasCoupling ? towerFeedback.crossSectorSignalGain : 1;
            const intraGain = hasCoupling ? towerFeedback.intraSectorSignalGain : 1;

            // Pass 1: count valid emitted signals (zero allocations, exact stride & exact 1000-tail window)
            let totalSigs = 0;
            for (let i = 0; i < nActive; i += 1) {
              const node = activeNodes[i];
              const conns = node.connections;
              const cLen = conns.length;
              const sourceSector = hasCoupling ? (Number.isInteger(node.sectorId) ? node.sectorId : sectorIdOf(node.id)) : 0;
              for (let j = 0; j < cLen; j += 1) {
                const target = activeById[conns[j].targetId];
                if (!target) continue;
                if (hasCoupling) {
                  const targetSector = Number.isInteger(target.sectorId) ? target.sectorId : sectorIdOf(target.id);
                  if (targetSector !== sourceSector && crossGain <= 0) continue;
                }
                totalSigs += 1;
              }
            }

            let sectorIntraFlux = null;
            let sectorInterFlux = null;
            let totalIntraFlux = 0;
            let totalInterFlux = 0;
            let nodeInterFlux = null;
            if (!cache.nodeSignalPulse || cache.nodeSignalPulse.length !== nNodes) {
              cache.nodeSignalPulse = new Float32Array(nNodes);
            } else {
              for (let i = 0; i < cache.nodeSignalPulse.length; i += 1) {
                cache.nodeSignalPulse[i] *= 0.62;
              }
            }
            if (!cache.rawTickSignalLoad || cache.rawTickSignalLoad.length !== nNodes) {
              cache.rawTickSignalLoad = new Float32Array(nNodes);
            } else {
              cache.rawTickSignalLoad.fill(0);
            }
            const nodeSignalPulse = cache.nodeSignalPulse;
            const rawTickLoad = cache.rawTickSignalLoad;

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
              if (!cache.nodeInterFlux || cache.nodeInterFlux.length !== nNodes) {
                cache.nodeInterFlux = new Float32Array(nNodes);
              } else {
                cache.nodeInterFlux.fill(0);
              }
              nodeInterFlux = cache.nodeInterFlux;
            }

            // Pass 2: apply incoming signals directly using exact pre-tick intensities (zero throwaway GC objects!)
            const packetStride = Math.max(1, Math.floor(totalSigs / packets.capacity));
            const tailStart = totalSigs > 1000 ? (totalSigs - 1000) : 0;
            const tailSignals = [];
            let sigIdx = 0;
            for (let i = 0; i < nActive; i += 1) {
              const node = activeNodes[i];
              const srcId = node.id;
              const srcIntensity = origIntensity[srcId];
              const srcPhase = node.phase;
              const sourceSector = hasCoupling
                ? (Number.isInteger(node.sectorId) ? node.sectorId : sectorIdOf(srcId))
                : sectorIdOf(srcId);
              const conns = node.connections;
              const cLen = conns.length;

              for (let j = 0; j < cLen; j += 1) {
                const conn = conns[j];
                const targetId = conn.targetId;
                const targetActive = activeById[targetId];
                if (!targetActive) continue;

                const targetSector = hasCoupling
                  ? (Number.isInteger(targetActive.sectorId) ? targetActive.sectorId : sectorIdOf(targetActive.id))
                  : sectorIdOf(targetId);
                const isInter = targetSector !== sourceSector;
                if (hasCoupling && isInter && crossGain <= 0) continue;

                const strength = hasCoupling
                  ? (srcIntensity * conn.weight * (isInter ? crossGain : intraGain))
                  : (srcIntensity * conn.weight);

                const targetNode = this.nodes[targetId];
                if (targetNode) {
                  targetNode.intensity = Math.min(1, targetNode.intensity + strength * 0.05);
                  if (targetId >= 0 && targetId < rawTickLoad.length) {
                    rawTickLoad[targetId] += strength;
                  }
                  if (srcId >= 0 && srcId < rawTickLoad.length) {
                    rawTickLoad[srcId] += strength * 0.35;
                  }
                  if (hasCoupling) {
                    const targetS = Number.isInteger(targetSector) ? targetSector : ((targetId % 4) + 4) % 4;
                    if (isInter) {
                      sectorInterFlux[targetS] += strength;
                      totalInterFlux += strength;
                      if (targetId >= 0 && targetId < nodeInterFlux.length) {
                        nodeInterFlux[targetId] += strength;
                      }
                    } else {
                      sectorIntraFlux[targetS] += strength;
                      totalIntraFlux += strength;
                    }
                  }
                  if ((sigIdx % packetStride === 0 || strength >= 0.62) && packets.count < packets.capacity) {
                    const p = packets.count;
                    packets.from[p] = srcId;
                    packets.to[p] = targetId;
                    packets.strength[p] = strength;
                    packets.isInter[p] = isInter ? 1 : 0;
                    packets.count = p + 1;
                  }
                }

                if (sigIdx >= tailStart) {
                  if (hasCoupling) {
                    tailSignals.push({
                      sourceId: srcId,
                      targetId,
                      sourceSector,
                      targetSector,
                      isInterSector: isInter,
                      strength,
                      phase: srcPhase
                    });
                  } else {
                    tailSignals.push({
                      sourceId: srcId,
                      targetId,
                      strength,
                      phase: srcPhase
                    });
                  }
                }
                sigIdx += 1;
              }
            }

            // Compute contrast-normalized dynamic signal pulse in [0, 2.0] (prevents global saturation at 4.000)
            let loadSum = 0;
            let loadActiveCount = 0;
            for (let i = 0; i < rawTickLoad.length; i += 1) {
              const v = rawTickLoad[i];
              if (v > 0) {
                loadSum += v;
                loadActiveCount += 1;
              }
            }
            if (loadActiveCount > 0) {
              const meanLoad = loadSum / loadActiveCount;
              const invScale = 1 / Math.max(0.35, meanLoad * 1.45);
              for (let i = 0; i < rawTickLoad.length; i += 1) {
                const v = rawTickLoad[i];
                if (v <= 0) continue;
                const rel = v * invScale;
                const burst = Math.min(0.88, rel * rel * 0.46);
                nodeSignalPulse[i] = Math.min(2.0, nodeSignalPulse[i] + burst);
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

            this.signalBuffer = tailSignals;
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
            const out = [];
            const nodes = this.nodes;
            for (const id of this.activeNodeIds) {
              const n = nodes[id];
              if (n) out.push(n);
            }
            return out;
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
