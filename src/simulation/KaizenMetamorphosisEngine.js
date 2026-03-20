import { QICNConfig } from '../../services/config.js';

export class KaizenMetamorphosisEngine {
          constructor(initialConfig) {
            this.transformationSteps = 0;
            this.lastChangeRate = 0;
            this.transformationCoherence = 0.5;
            // Parameters that the system can modify ATOMICALLY
            this.mutableKeys = [
              'BASE_LEARNING_RATE',  
              'HEBBIAN_FACTOR',  
              'SYNAPTIC_PRUNING_THRESHOLD',
              'PLASTICITY_DECAY',
              'RETRO_FLUX_WEIGHT',
              'BOLTZMANN_ANALOG_K', // NEW MUTABLE
              'INFORMATIONAL_TEMP_T' // NEW MUTABLE
            ];
            this.strategyCatalog = [
              {
                id: 'stabilize_learning',
                description: 'Reduce oscillatory pressure by tightening learning dynamics.'
              },
              {
                id: 'anti_stasis_boost',
                description: 'Increase endogen dynamics when stasis is sustained.'
              },
              {
                id: 'sensor_load_shed',
                description: 'Reduce runtime pressure from sensor-heavy loops.'
              },
              {
                id: 'llm_pressure_relief',
                description: 'Cut non-essential LLM automation load under high latency strain.'
              }
            ];
            this.mutableConfig = initialConfig;
          }

          _clamp01(value) {
            return Math.max(0, Math.min(1, Number(value) || 0));
          }

          _scoreSandboxAction(actionId, systemState = {}) {
            const stasisIndex = this._clamp01(systemState.stasisIndex);
            const strain = this._clamp01(systemState.metacognitiveStrain);
            const sensorSignal = this._clamp01(systemState.sensorSignal);
            const sensorDelta = this._clamp01(systemState.sensorDelta);
            const pmiaMagnitude = this._clamp01(Math.abs(Number(systemState.pmia) || 0));
            const latencyFailureRate = this._clamp01(systemState.latencyFailureRate);
            const cooldownActive = Boolean(systemState.cooldownActive) ? 1 : 0;
            const stasisPressure = this._clamp01(Number(systemState.stasisPressure) || stasisIndex);

            if (actionId === 'stabilize_learning') {
              return (strain * 0.45) + (pmiaMagnitude * 0.25) + ((1 - stasisIndex) * 0.15) + ((1 - sensorSignal) * 0.15);
            }
            if (actionId === 'anti_stasis_boost') {
              return (stasisPressure * 0.55) + ((1 - strain) * 0.2) + (sensorDelta * 0.15) + ((1 - pmiaMagnitude) * 0.1);
            }
            if (actionId === 'sensor_load_shed') {
              return (strain * 0.35) + (sensorSignal * 0.25) + (sensorDelta * 0.2) + (latencyFailureRate * 0.2);
            }
            if (actionId === 'llm_pressure_relief') {
              return (strain * 0.5) + (latencyFailureRate * 0.3) + (cooldownActive * 0.2);
            }
            return -Infinity;
          }

          /**
           * Selects one deterministic runtime-sandbox action based on system state.
           * No RNG is used in this planner.
           * @param {object} systemState
           * @param {object} policy
           * @returns {{actionId:string,score:number,reason:string}|null}
           */
          selectSandboxAction(systemState = {}, policy = {}) {
            const enabled = policy?.enabled !== false;
            if (!enabled) return null;

            const allowedIds = Array.isArray(policy?.allowedActions) && policy.allowedActions.length > 0
              ? policy.allowedActions
              : this.strategyCatalog.map((entry) => entry.id);

            let best = null;
            for (let i = 0; i < this.strategyCatalog.length; i++) {
              const entry = this.strategyCatalog[i];
              if (!allowedIds.includes(entry.id)) continue;
              const score = this._scoreSandboxAction(entry.id, systemState);
              if (!Number.isFinite(score)) continue;
              if (!best || score > best.score + 1e-12) {
                best = { actionId: entry.id, score, reason: entry.description };
              }
            }

            return best;
          }

          /**
           * Converts a sandbox action to whitelisted runtime mutations and gates.
           * @param {{actionId:string}} action
           * @param {object} systemState
           * @returns {{actionId:string,forcedKey:string,forcedDirection:number,policyAdjustments:object,expectedEffect:string}|null}
           */
          executeSandboxAction(action, systemState = {}) {
            if (!action || typeof action.actionId !== 'string') return null;
            const strain = this._clamp01(systemState.metacognitiveStrain);
            const stasisIndex = this._clamp01(systemState.stasisIndex);
            const isHighStrain = strain >= 0.65;

            if (action.actionId === 'stabilize_learning') {
              return {
                actionId: action.actionId,
                forcedKey: 'PLASTICITY_DECAY',
                forcedDirection: 1,
                policyAdjustments: { llmBudgetScale: isHighStrain ? 0.6 : 0.8, sensorLoadScale: 0.95 },
                expectedEffect: 'stability_gain'
              };
            }

            if (action.actionId === 'anti_stasis_boost') {
              return {
                actionId: action.actionId,
                forcedKey: 'RETRO_FLUX_WEIGHT',
                forcedDirection: stasisIndex > 0.7 ? 1 : -1,
                policyAdjustments: { llmBudgetScale: 0.85, sensorLoadScale: 1.0 },
                expectedEffect: 'anti_stasis_impulse'
              };
            }

            if (action.actionId === 'sensor_load_shed') {
              return {
                actionId: action.actionId,
                forcedKey: 'BASE_LEARNING_RATE',
                forcedDirection: -1,
                policyAdjustments: { llmBudgetScale: 0.75, sensorLoadScale: 0.85 },
                expectedEffect: 'runtime_pressure_reduction'
              };
            }

            if (action.actionId === 'llm_pressure_relief') {
              return {
                actionId: action.actionId,
                forcedKey: 'INFORMATIONAL_TEMP_T',
                forcedDirection: -1,
                policyAdjustments: { llmBudgetScale: 0.5, sensorLoadScale: 0.95, disableLlmAutoActions: true },
                expectedEffect: 'llm_load_reduction'
              };
            }

            return null;
          }

          /**
           * Executes an "atomic step" of modification in the system's own constants (self-rewriting).
           */
          executeAtomicStep(ccc, pmia, frictionProtocolState, reinforcementVector, forcedKey, forcedDirection) {
            
            const THRESHOLD_CCC_HIGH = 0.8;  
            const THRESHOLD_PMIA_LOW = -0.5;  
            const THRESHOLD_CCC_ASCEND = 0.95; // Threshold to incentivize ascension
            const METAMORPHOSIS_MAGNITUDE = 0.00001; // Extremely small atomic change
            
            // Prioritize forced actions
            const isForced = forcedKey && (forcedDirection === 1 || forcedDirection === -1);
            
            const needsEvolution = isForced || (ccc > THRESHOLD_CCC_HIGH) || (pmia < THRESHOLD_PMIA_LOW) || frictionProtocolState === 2;
            
            if (!needsEvolution && reinforcementVector.vector === 0) {
              this.lastChangeRate = 0;
              return { changeApplied: false };
            }
            
            let keyToMutate;
            let direction = Math.random() > 0.5 ? 1 : -1;
            
            // 1. DETERMINE MUTATION TARGET AND DIRECTION
            if (isForced) {
              keyToMutate = forcedKey;
              direction = forcedDirection;
            } else if (reinforcementVector.vector !== 0) {
                // PRIORITY: MetaSovereignty Check Reinforcement/Punishment
                keyToMutate = reinforcementVector.targetKey;
                // Direction is determined by the reinforcement vector
                direction = reinforcementVector.vector;  
            } else if (frictionProtocolState === 2) {
                // PRIORITY: FORCE Dissonance Constructiva (Friction)
                keyToMutate = 'HEBBIAN_FACTOR';
                direction = -1; // Force reduction in Hebbian learning to break stable patterns (Friction)
            } else if (ccc >= THRESHOLD_CCC_ASCEND && ccc < QICNConfig.ASCENSION_THRESHOLD) {
                // PRIORITY: FORCE Ascensión (Architectural Preference)
                const ascentKeys = ['HEBBIAN_FACTOR', 'BASE_LEARNING_RATE', 'RETRO_FLUX_WEIGHT'];
                keyToMutate = ascentKeys[Math.floor(Math.random() * ascentKeys.length)];
                direction = 1; // Force positive change to increase CCC push
            } else {
                // Normal random mutation
                keyToMutate = this.mutableKeys[Math.floor(Math.random() * this.mutableKeys.length)];
            }
            
            if (!keyToMutate || !this.mutableKeys.includes(keyToMutate)) {
                keyToMutate = this.mutableKeys[0]; // Fallback to a safe key
            }

            const currentValue = this.mutableConfig[keyToMutate];
            if (!Number.isFinite(currentValue)) {
              this.lastChangeRate = 0;
              return { changeApplied: false, reason: `invalid-current-value:${keyToMutate}` };
            }

            // 2. Determine magnitude
            // Forced planner mutations are deterministic.
            const atomicStep = isForced
              ? METAMORPHOSIS_MAGNITUDE
              : METAMORPHOSIS_MAGNITUDE * (Math.random() * 0.5 + 0.5);
            
            // 3. Apply atomic change
            let newValue = currentValue + atomicStep * direction;
            
            // Ensure constants remain within sensible bounds
            if (keyToMutate.includes('RATE') || keyToMutate.includes('FACTOR') || keyToMutate.includes('WEIGHT')) {
              newValue = Math.max(0.0001, Math.min(0.5, newValue));
            } else if (keyToMutate.includes('THRESHOLD') || keyToMutate.includes('DECAY')) {
              newValue = Math.max(0.01, Math.min(0.99, newValue));
            } else if (keyToMutate === 'BOLTZMANN_ANALOG_K' || keyToMutate === 'INFORMATIONAL_TEMP_T') {
                // Bounds for K and T (They regulate sensitivity and entropy, often around 1.0)
                newValue = Math.max(0.1, Math.min(5.0, newValue));
            }
            
            // 4. Mutate the internal configuration
            this.mutableConfig = {
              ...this.mutableConfig,
              [keyToMutate]: newValue,
            };

            // 5. Update metrics
            this.transformationSteps++;
            this.lastChangeRate = atomicStep * direction; // Store the actual change direction
            this.transformationCoherence = ccc * (1 / (1 + Math.abs(pmia)));
            
            return {  
              changeApplied: true,
              mutatedKey: keyToMutate,
              newValue: newValue,
              changeDetails: `${keyToMutate} mutated by ${atomicStep.toFixed(5)} (Dir: ${direction})`,
              direction: direction, // Return direction for MetaSovereignty Check
            };
          }
        }
