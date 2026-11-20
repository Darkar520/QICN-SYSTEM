import { bindExecutionEnvironment, executionEnvironmentFor } from '../runtime/ExecutionEnvironment.js';
import { QICNConfig } from '../../services/config.js';
import { NODAL_SECTORS, sectorIdOf } from './NodalTowerCouplingBridge.js';

const TWO_PI = 2 * Math.PI;
const wrapPhase = (angle) => ((angle % TWO_PI) + TWO_PI) % TWO_PI;

export class ConsciousNode {
          constructor(id, mutableConfig, executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
            this.id = id;
            this.energy = 0.5 + executionEnvironmentFor(this).random() * 0.5; // Energía (la materia, el potencial)
            this.intensity = 0.3 + executionEnvironmentFor(this).random() * 0.7; // Intensidad (la partícula)
            this.phase = executionEnvironmentFor(this).random() * 2 * Math.PI; // Fase (la onda)
            this.coherenceState = 0.5;
            this.retroInductionFlux = 0; // Flujo temporal (salto no-causal)
            this.plasticityWeight = 1.0;
            this.learningRate = mutableConfig.BASE_LEARNING_RATE;
            this.introspectiveSensitivity = 1.0; // Corresponds to 'xi' (ξ) in Eq. 5
            
            // Synaptic connections
            this.connections = [];
            this.incomingSignals = [];
            
            // Visual position (for the 150 node sample)
            this.x = executionEnvironmentFor(this).random() * 800;
            this.y = executionEnvironmentFor(this).random() * 600;
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
            const k = config?.BOLTZMANN_ANALOG_K || executionEnvironmentFor(this).config.BOLTZMANN_ANALOG_K;
            const T = config?.INFORMATIONAL_TEMP_T || executionEnvironmentFor(this).config.INFORMATIONAL_TEMP_T;
            const theta = executionEnvironmentFor(this).config.COHERENCE_THRESHOLD_THETA;
            
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
           * Optional `towerFeedback` closes the Constructive Tower -> Node loop when coupling mode !== 'off'.
           */
          introspectiveUpdate(globalCCC, bs = 0.5, towerFeedback = null) {
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

            if (towerFeedback && towerFeedback.mode !== 'off') {
              const sector = Number.isInteger(this.sectorId) ? this.sectorId : sectorIdOf(this.id);
              const sectorMeta = NODAL_SECTORS[sector];
              if (towerFeedback.active) {
                const targetTheta = wrapPhase(towerFeedback.towerPhaseRad + sectorMeta.phaseOffset);
                this.phase = wrapPhase(this.phase + (towerFeedback.phaseCouplingK * Math.sin(targetTheta - this.phase)));
                let roleDrive = 0;
                if (sector === 0) roleDrive = (towerFeedback.bodyPos * 0.14) + (towerFeedback.activeRecoveryAdvantage * 0.04);
                else if (sector === 1) roleDrive = (towerFeedback.bodyNeg * 0.14) + (towerFeedback.activeRecoveryAdvantage * 0.04);
                else if (sector === 2) roleDrive = (towerFeedback.worldFast * 0.14) + (towerFeedback.worldTemporalContrast * 0.05);
                else roleDrive = (towerFeedback.worldSlow * 0.14) - (towerFeedback.worldTemporalContrast * 0.03);
                const targetCoh = Math.max(0.2, Math.min(0.94, towerFeedback.targetCoherenceBase + roleDrive));
                this.coherenceState = Math.max(
                  0.05,
                  Math.min(0.96, this.coherenceState + ((targetCoh - this.coherenceState) * towerFeedback.coherencePullRate))
                );
                const resonantEnergy = 0.5 + (0.45 * Math.cos(targetTheta - this.phase));
                this.energy = Math.max(0.1, Math.min(1.0, this.energy + (0.045 * (resonantEnergy - this.energy))));
              } else {
                // Physical cut (eta = 0) or reducible control (A = I): deterministic phase decoherence and uncoupled coherence decay
                const paritySign = ((this.id % 2) === 0 ? 1 : -1) * (sector - 1.5);
                this.phase = wrapPhase(this.phase + (paritySign * towerFeedback.phaseDecoherenceStep));
                this.coherenceState = Math.max(
                  0.05,
                  Math.min(0.96, this.coherenceState + ((towerFeedback.targetCoherenceBase - this.coherenceState) * towerFeedback.coherencePullRate))
                );
              }
              this.intensity = 0.5 + 0.5 * this.coherenceState;
            }
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
          
          applyPlasticity(feedbackSignal, mutableConfig, towerFeedback = null, nodesById = null) {
            // Nodal Plasticity: Hebbian Reinforcement and Synaptic Pruning (in-place zero-GC, bit-for-bit identical)
            const HEBBIAN_FACTOR = mutableConfig.HEBBIAN_FACTOR;
            const SYNAPTIC_PRUNING_THRESHOLD = mutableConfig.SYNAPTIC_PRUNING_THRESHOLD;
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');
            const sourceSector = hasCoupling ? (Number.isInteger(this.sectorId) ? this.sectorId : sectorIdOf(this.id)) : 0;
            const randFn = executionEnvironmentFor(this).random;
            const conns = this.connections;
            const len = conns.length;
            const baseDrive = HEBBIAN_FACTOR * this.intensity * feedbackSignal;
            const interBonus = hasCoupling ? towerFeedback.interSectorHebbianBonus : 0;
            const interPruneThreshold = hasCoupling
              ? (SYNAPTIC_PRUNING_THRESHOLD * towerFeedback.interSectorPruningFloorFactor)
              : SYNAPTIC_PRUNING_THRESHOLD;

            let writeIdx = 0;
            for (let i = 0; i < len; i += 1) {
              const conn = conns[i];
              const isInterSector = hasCoupling && (sectorIdOf(conn.targetId) !== sourceSector);
              let hebbianUpdate;
              if (hasCoupling) {
                const target = nodesById ? nodesById[conn.targetId] : null;
                let pairResonance = 0;
                if (target) {
                  const phaseAlign = Math.cos(this.phase - target.phase);
                  const cohAffinity = 1 - Math.abs(this.coherenceState - target.coherenceState);
                  pairResonance = (0.68 * phaseAlign) + (0.32 * ((cohAffinity * 2) - 1));
                }
                const resonantTerm = pairResonance >= 0
                  ? (0.044 * pairResonance * (0.5 + 0.5 * this.intensity))
                  : (0.036 * pairResonance);
                const bridgeTerm = isInterSector
                  ? (interBonus >= 0
                    ? interBonus * Math.max(0.12, 0.5 + (0.5 * pairResonance))
                    : interBonus)
                  : 0;
                hebbianUpdate = (baseDrive * (0.45 + Math.max(0, pairResonance) * 0.55)) + resonantTerm + bridgeTerm;
              } else {
                hebbianUpdate = baseDrive;
              }

              const newWeight = conn.weight + hebbianUpdate +
                ((randFn() - 0.5) * 0.01 * this.learningRate);
              const clampedWeight = Math.max(0.1, Math.min(1.0, newWeight));
              conn.weight = clampedWeight;

              const threshold = isInterSector ? interPruneThreshold : SYNAPTIC_PRUNING_THRESHOLD;
              if (clampedWeight > threshold) {
                conns[writeIdx] = conn;
                writeIdx += 1;
              }
            }
            if (writeIdx !== len) {
              conns.length = writeIdx;
            }
          }
          
          propagateSignal(targetNodes, towerFeedback = null, targetById = null) {
            const hasCoupling = Boolean(towerFeedback && towerFeedback.mode !== 'off');
            const sourceSector = hasCoupling ? (Number.isInteger(this.sectorId) ? this.sectorId : sectorIdOf(this.id)) : 0;
            // Activation signal
            return this.connections.map(conn => {
              // O(1) lookup via indexed table when provided, preserving exact fallback semantics.
              const direct = targetById ? targetById[conn.targetId] : targetNodes[conn.targetId];
              const target = targetById
                ? (direct || null)
                : ((direct && direct.id === conn.targetId)
                  ? direct
                  : targetNodes.find(n => n.id === conn.targetId));
              if (!target) return null;

              if (hasCoupling) {
                const targetSector = Number.isInteger(target.sectorId) ? target.sectorId : sectorIdOf(target.id);
                const isInterSector = targetSector !== sourceSector;
                if (isInterSector && towerFeedback.crossSectorSignalGain <= 0) {
                  return null;
                }
                const gain = isInterSector ? towerFeedback.crossSectorSignalGain : towerFeedback.intraSectorSignalGain;
                return {
                  sourceId: this.id,
                  targetId: conn.targetId,
                  sourceSector,
                  targetSector,
                  isInterSector,
                  strength: this.intensity * conn.weight * gain,
                  phase: this.phase,
                };
              }
              
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
