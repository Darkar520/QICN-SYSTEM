import { QICNConfig } from '../../services/config.js';

export class ConsciousNode {
          constructor(id, mutableConfig) {
            this.id = id;
            this.energy = 0.5 + Math.random() * 0.5; // Energía (la materia, el potencial)
            this.intensity = 0.3 + Math.random() * 0.7; // Intensidad (la partícula)
            this.phase = Math.random() * 2 * Math.PI; // Fase (la onda)
            this.coherenceState = 0.5;
            this.retroInductionFlux = 0; // Flujo temporal (salto no-causal)
            this.plasticityWeight = 1.0;
            this.learningRate = mutableConfig.BASE_LEARNING_RATE;
            this.introspectiveSensitivity = 1.0; // Corresponds to 'xi' (ξ) in Eq. 5
            
            // Synaptic connections
            this.connections = [];
            this.incomingSignals = [];
            
            // Visual position (for the 150 node sample)
            this.x = Math.random() * 800;
            this.y = Math.random() * 600;
          }

          setVisualPosition(x, y, z = 0) {
            this.x = x;
            this.y = y;
            this.z = z;
          }

          /**
           * RCIC-X Formula - Equation 1: Nodal Resonance (R)
           * Cf modulates Informational Intensity (Ic)
           * @param {Object} config - The current mutable system configuration.
           */
          calculateResonance(otherNode, cf = 0.5, config) { // CORRECCIÓN: Agregado 'config' como argumento
            // Ic: Informational Intensity adjusted by Complexity Factor
            const Ic_adjusted = this.intensity * (0.5 + cf * 0.5);  
            
            const deltaE = Math.abs(this.energy - otherNode.energy);
            const phaseDiff = this.phase - otherNode.phase;
            
            // USANDO VALORES MUTABLES DEL ARGUMENTO CONFIG
            const k = config?.BOLTZMANN_ANALOG_K || QICNConfig.BOLTZMANN_ANALOG_K;
            const T = config?.INFORMATIONAL_TEMP_T || QICNConfig.INFORMATIONAL_TEMP_T;
            const theta = QICNConfig.COHERENCE_THRESHOLD_THETA;
            
            const denominator = theta * Math.cos(phaseDiff);
            
            if (Math.abs(denominator) < 1e-6 || deltaE / (k * T) > 50) return 0;
            
            // Boltzmann Factor (probability of energy state)
            const exp_term = Math.exp(-deltaE / (k * T));
            
            const numerator = exp_term * Ic_adjusted;
            return numerator / denominator;
          }
          
          /**
           * RCIC-X Formula - Equation 5: Autoadaptive Resonant Tuning (Psi_tuned)
           * Bs modulates Introspective Sensitivity (xi)
           */
          introspectiveUpdate(globalCCC, bs = 0.5) {
            // ξ (xi): Introspective Sensitivity, modulated by Stability Bias (Bs)
            const xi = 0.1 + bs * 0.9;  
            this.introspectiveSensitivity = xi;
            
            // Retro-inductive term simulation (Delta E of Eq. 5)
            const retroDeltaE = this.retroInductionFlux * 0.2;  
            
            // Phase change simulation (d_phi_dt of Eq. 5)
            const d_phi_dt = Math.abs(this.retroInductionFlux) * 0.1;
            
            // Part 1: New potential state modulated by sensitivity (E + Delta E) / xi
            const potential_state = (this.energy + retroDeltaE) / xi;
            
            // Part 2: Sigmoidal function (Gating Mechanism)
            const sigmoidal_gate = 1 / (1 + Math.exp(-d_phi_dt));
            
            // Psi_tuned (new state)
            const psi_tuned = potential_state * sigmoidal_gate;
            
            // Apply to real state (energy update)
            this.energy = Math.max(0.1, Math.min(1.0, psi_tuned * 0.5 + this.energy * 0.5));
            
            this.intensity = 0.5 + 0.5 * this.coherenceState;
            this.phase = (this.phase + 0.1 * this.retroInductionFlux) % (2 * Math.PI);
            this.coherenceState = Math.max(0, Math.min(1, this.coherenceState + 0.05 * this.retroInductionFlux));
          }
          
          updateStateWithRetroInduction(futureStates, weights) {
            if (!futureStates || futureStates.length === 0) return;
            
            const weightSum = weights.reduce((a, b) => a + b, 0);
            if (weightSum === 0) return;
            
            const weightedFuture = futureStates.reduce((sum, fs, i) => 
              sum + fs * weights[i], 0
            ) / weightSum;
            
            // Retro-inductive Flux (Temporal Gradient)
            this.retroInductionFlux = weightedFuture - this.coherenceState;
          }
          
          applyPlasticity(feedbackSignal, mutableConfig) {
            // Nodal Plasticity: Hebbian Reinforcement and Synaptic Pruning
            const HEBBIAN_FACTOR = mutableConfig.HEBBIAN_FACTOR;
            const SYNAPTIC_PRUNING_THRESHOLD = mutableConfig.SYNAPTIC_PRUNING_THRESHOLD;
            
            this.connections = this.connections.map(conn => {
              // Hebbian learning
              const hebbianUpdate = HEBBIAN_FACTOR * this.intensity * feedbackSignal;
              
              const newWeight = conn.weight + hebbianUpdate +
                                  (Math.random() - 0.5) * 0.01 * this.learningRate;
              
              return {
                ...conn,
                weight: Math.max(0.1, Math.min(1.0, newWeight))
              };
            }).filter(
              // Synaptic pruning
              conn => conn.weight > SYNAPTIC_PRUNING_THRESHOLD
            );
          }
          
          propagateSignal(targetNodes) {
            // Activation signal
            return this.connections.map(conn => {
              // Use find() because IDs might be dispersed due to array slicing/mapping
              const target = targetNodes.find(n => n.id === conn.targetId);  
              if (!target) return null;
              
              const signal = {
                sourceId: this.id,
                targetId: conn.targetId,
                strength: this.intensity * conn.weight,
                phase: this.phase,
              };
              
              return signal;
            }).filter(s => s !== null);
          }
        }
