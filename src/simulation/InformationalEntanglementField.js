import { QICNConfig } from '../../services/config.js';

export class InformationalEntanglementField {
          constructor() {
            this.resonanceField = { globalEnergy: 0, globalPhase: 0, coherenceVariance: 0, normalizedResonance: 0 };
            this.entanglementMatrix = [];  
          }

          /**
           * Core architectural calculation. CCC can exceed 1.0 to trigger Ascension.
           */
          calculateCCC(nodes, cf, mutableConfig) {
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

          applyNodalPlasticity(nodes, ccc, mutableConfig) {
            const feedbackSignal = ccc > QICNConfig.COHERENCE_THRESHOLD ? 0.1 : -0.05;
            return nodes.map(node => {
              node.applyPlasticity(feedbackSignal, mutableConfig);
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
