import { bindExecutionEnvironment, executionEnvironmentFor } from '../runtime/ExecutionEnvironment.js';
import { QICNConfig } from '../../services/config.js';
import { sectorIdOf } from './NodalTowerCouplingBridge.js';

export class InformationalEntanglementField {
          constructor(executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
            this.resonanceField = { globalEnergy: 0, globalPhase: 0, coherenceVariance: 0, normalizedResonance: 0 };
            this.entanglementMatrix = [];  
          }

          /**
           * Core architectural calculation. CCC can exceed 1.0 to trigger Ascension.
           */
          calculateCCC(nodes, cf, mutableConfig, _sensoryVector = null, towerFeedback = null) {
            if (!nodes || nodes.length === 0) return 0.5;
            const nLen = nodes.length;
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');

            // 1 & 2. Average Nodal Coherence, Energy Variance & O(1) id lookup table (exact IEEE-754 order, zero O(N^2) .find())
            let cohSum = 0;
            let energySum = 0;
            let maxId = nLen - 1;
            for (let i = 0; i < nLen; i += 1) {
              const node = nodes[i];
              cohSum += node.coherenceState;
              energySum += node.energy;
              if (node.id > maxId) maxId = node.id;
            }
            const avgCoherence = cohSum / nLen;
            const avgEnergy = energySum / nLen;
            let energyVarSum = 0;
            const nodesById = new Array(maxId + 1);
            for (let i = 0; i < nLen; i += 1) {
              const node = nodes[i];
              const diff = node.energy - avgEnergy;
              energyVarSum += diff * diff;
              nodesById[node.id] = node;
            }
            const energyVariance = nLen > 1 ? energyVarSum / (nLen - 1) : 0;
            const coherenceFromVariance = 1.0 / (1.0 + energyVariance);

            // 3. Field Resonance (modulated by Cf)
            let totalResonance = 0;
            let resonanceCount = 0;

            const nodeMutableConfig = {
              BOLTZMANN_ANALOG_K: mutableConfig.BOLTZMANN_ANALOG_K,
              INFORMATIONAL_TEMP_T: mutableConfig.INFORMATIONAL_TEMP_T,
            };

            const sampledNodes = this.sampleNodes(nodes, 100);
            const sampledLen = sampledNodes.length;
            for (let si = 0; si < sampledLen; si += 1) {
              const node1 = sampledNodes[si];
              const s1 = hasCoupling ? (Number.isInteger(node1.sectorId) ? node1.sectorId : sectorIdOf(node1.id)) : 0;
              const conns = node1.connections;
              const cLim = conns.length < 3 ? conns.length : 3;
              for (let ci = 0; ci < cLim; ci += 1) {
                const conn = conns[ci];
                const node2 = nodesById[conn.targetId];
                if (!node2) continue;
                if (hasCoupling) {
                  const s2 = Number.isInteger(node2.sectorId) ? node2.sectorId : sectorIdOf(node2.id);
                  const isInterSector = s1 !== s2;
                  if (isInterSector && towerFeedback.crossSectorSignalGain <= 0) {
                    continue;
                  }
                  const gain = isInterSector ? towerFeedback.crossSectorSignalGain : towerFeedback.intraSectorSignalGain;
                  const resonance = node1.calculateResonance(node2, cf, nodeMutableConfig) * gain;
                  totalResonance += Math.abs(resonance);
                  resonanceCount += 1;
                } else {
                  const resonance = node1.calculateResonance(node2, cf, nodeMutableConfig);
                  totalResonance += Math.abs(resonance);
                  resonanceCount += 1;
                }
              }
            }
            
            const avgResonance = resonanceCount > 0 ? totalResonance / resonanceCount : 0;
            // Normalización suave para evitar saturación rígida temprana en post-umbral.
            const normalizedResonance = avgResonance > 0
              ? avgResonance / (1 + avgResonance)
              : 0;
            const normalizedComplexity = Math.max(0, Math.min(1, Number(cf) || 0));

            // Composición determinista acotada: permite ascensión genuina sin empuje fijo.
            const coherenceTerm = 0.42 * avgCoherence;
            const varianceTerm = 0.18 * coherenceFromVariance;
            const resonanceWeight = 0.18 + (normalizedComplexity * 0.12);
            const resonanceTerm = resonanceWeight * normalizedResonance;
            const couplingTerm = 0.22 * avgCoherence * normalizedResonance * normalizedComplexity;

            let ccc = coherenceTerm + varianceTerm + resonanceTerm + couplingTerm;
            
            // Update resonance field
            this.resonanceField = {
              globalEnergy: avgEnergy,
              coherenceVariance: energyVariance,
              normalizedResonance: normalizedResonance
            };
            
            return Math.max(0, ccc); // Allows CCC > 1.0 for Ascension check
          }

          applyNodalPlasticity(nodes, ccc, mutableConfig, _core = null, towerFeedback = null) {
            const feedbackSignal = ccc > executionEnvironmentFor(this).config.COHERENCE_THRESHOLD ? 0.1 : -0.05;
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');
            const nLen = nodes.length;
            let nodesById = null;
            if (hasCoupling) {
              nodesById = new Array(nLen);
              for (let i = 0; i < nLen; i += 1) {
                const n = nodes[i];
                if (n) nodesById[n.id] = n;
              }
            }
            for (let i = 0; i < nLen; i += 1) {
              const node = nodes[i];
              if (hasCoupling) {
                node.applyPlasticity(feedbackSignal, mutableConfig, towerFeedback, nodesById);
              } else {
                node.applyPlasticity(feedbackSignal, mutableConfig);
              }
            }
            return nodes;
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
