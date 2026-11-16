import { bindExecutionEnvironment, executionEnvironmentFor } from '../runtime/ExecutionEnvironment.js';
import { QICNConfig } from '../../services/config.js';

// Learned adjustment mode (C-6b, user decision 2026-11-08). The six keys the
// core recomputes every tick get a multiplicative factor that Kaizen learns.
export const KAIZEN_ADJUSTABLE_KEYS = Object.freeze([
  'BASE_LEARNING_RATE', 'HEBBIAN_FACTOR', 'PLASTICITY_DECAY',
  'RETRO_FLUX_WEIGHT', 'BOLTZMANN_ANALOG_K', 'INFORMATIONAL_TEMP_T'
]);
// Design parameters, not theoretical constants.
export const KAIZEN_LEARNING_DEFAULTS = Object.freeze({
  factorMin: 0.8,        // ±20 % around the core's base value
  factorMax: 1.2,
  step: 0.02,            // factor change per learning trial
  sandboxStep: 0.02,     // factor change per autonomy action
  windowTicks: 24,       // ticks per baseline or trial window
  margin: 0.02,          // minimum improvement for a trial to be kept
  noiseK: 2,             // ...and at least noiseK × the measured baseline-to-baseline noise
  warmupBaselines: 2,    // baselines measured before the first trial (noise estimate)
  oscTarget: 0.005,      // target RMS of tick-to-tick CCC change (2× the core stasis threshold 0.0025)
  stasisWeight: 0.5,
  strainWeight: 0.25
});
export const isKaizenLearned = (config = QICNConfig) => config.KAIZEN_ADJUSTMENT_MODE === 'learned';
// Keys the window learner tries. PLASTICITY_DECAY is excluded: no active code
// path reads it from the Kaizen config (only the legacy Node.js class reads
// QICNConfig.PLASTICITY_DECAY), so any "improvement" on it would be noise
// (kaizen mode ablation 2026-11-08: it was kept at ×1.20 in 5/5 seeds).
// It still receives a factor (×1 unless an autonomy action moves it).
export const KAIZEN_LEARNABLE_KEYS = Object.freeze(KAIZEN_ADJUSTABLE_KEYS.filter((k) => k !== 'PLASTICITY_DECAY'));

/**
 * Window score: rewards a CCC that moves at the target rate (neither frozen
 * nor oscillating) and penalises stasis and strain. The CCC level does not
 * enter, so the learner has no incentive to push CCC across the threshold.
 */
export function kaizenWindowScore(samples, cfg = KAIZEN_LEARNING_DEFAULTS) {
  if (!Array.isArray(samples) || samples.length < 3) return null;
  let sq = 0;
  for (let i = 1; i < samples.length; i += 1) sq += (samples[i].ccc - samples[i - 1].ccc) ** 2;
  const osc = Math.sqrt(sq / (samples.length - 1));
  const mean = (k) => samples.reduce((s, x) => s + (Number.isFinite(x[k]) ? x[k] : 0), 0) / samples.length;
  const stasis = Math.max(0, Math.min(1, mean('stasis')));
  const strain = Math.max(0, Math.min(1, mean('strain')));
  const rate = -Math.abs(Math.log((osc + 1e-4) / cfg.oscTarget));
  return { score: rate - cfg.stasisWeight * stasis - cfg.strainWeight * strain, osc, stasis, strain };
}

export class KaizenMetamorphosisEngine {
          constructor(initialConfig, executionEnvironment) {
    bindExecutionEnvironment(this, executionEnvironment);
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
            this.resetLearning();
            this.resetViabilityHistory();
          }

          resetViabilityHistory() {
            const actionIds = this.strategyCatalog.map((entry) => entry.id);
            const clusters = ['high_dispersion', 'high_stasis', 'high_sensory', 'high_strain', 'balanced'];
            const createActionStats = () => Object.fromEntries(
              actionIds.map((id) => [
                id,
                {
                  attempts: 0,
                  viabilityMaintainedCount: 0,
                  efficacyEma: 0.5,
                  meanViabilityDelta: 0,
                  lastSelectedTick: -1
                }
              ])
            );
            this.viabilityPolicyState = {
              actionStats: createActionStats(),
              clusterActionEfficacy: Object.fromEntries(
                clusters.map((c) => [c, Object.fromEntries(actionIds.map((id) => [id, 0.5]))])
              ),
              clusterActionAttempts: Object.fromEntries(
                clusters.map((c) => [c, Object.fromEntries(actionIds.map((id) => [id, 0]))])
              ),
              pendingCreditQueue: [],
              viabilityStats: {
                totalTicksEvaluated: 0,
                inTubeTicks: 0,
                inTubeRate: 1,
                lastObjectiveScore: 1,
                lastInTube: true,
                lastCluster: 'balanced',
                lastSelectedPolicyAction: 'none'
              },
              creditHorizonTicks: 2
            };
          }

          classifyViabilityCluster(systemState = {}) {
            const dispersion = Number(systemState.xDispersion ?? systemState.nodalDispersion ?? 0);
            const stasis = this._clamp01(systemState.stasisIndex);
            const strain = this._clamp01(systemState.metacognitiveStrain);
            const sensorDelta = this._clamp01(systemState.sensorDelta);
            if (dispersion >= 0.068) return 'high_dispersion';
            if (stasis >= 0.35) return 'high_stasis';
            if (sensorDelta >= 0.14) return 'high_sensory';
            if (strain >= 0.35) return 'high_strain';
            return 'balanced';
          }

          /**
           * Pure non-circular objective operational viability criterion Viab(S, tau).
           * Uses strictly physical/dynamical observables (X_N, dispersion, stasis,
           * strain, safe CCC homeostasis) and never references predictor error/maturation.
           */
          evaluateObjectiveViability(observableHealth = {}) {
            const xN = Number(observableHealth.x_n ?? observableHealth.xN ?? 0.5);
            const xDisp = Number(observableHealth.x_dispersion ?? observableHealth.xDispersion ?? 0);
            const stasis = this._clamp01(observableHealth.stasisIndex);
            const strain = this._clamp01(observableHealth.metacognitiveStrain);
            const ccc = Number(observableHealth.ccc ?? 0.7);
            const upperSafeCcc = Number(observableHealth.cccUpperSafe ?? 1.16);

            const nodalHealthy = xN >= 0.25 && xN <= 0.995 && xDisp <= 0.088;
            const antiStasisOk = stasis < 0.65;
            const strainOk = strain < 0.42;
            const homeostaticCccOk = ccc >= 0.35 && ccc <= upperSafeCcc;
            const inTube = nodalHealthy && antiStasisOk && strainOk && homeostaticCccOk;

            const dispScore = Math.max(0, 1 - (xDisp / 0.13));
            const xnMargin = xN >= 0.25 && xN <= 0.995 ? 1 : Math.max(0, 1 - (Math.abs(xN - 0.62) / 0.4));
            const antiStasisScore = Math.max(0, 1 - (stasis / 0.80));
            const strainScore = Math.max(0, 1 - (strain / 0.65));
            const cccScore = homeostaticCccOk ? 1 : Math.max(0, 1 - (Math.max(0.35 - ccc, ccc - upperSafeCcc, 0) * 3));
            const objectiveScore = Math.max(
              0,
              Math.min(
                1,
                (0.28 * dispScore) + (0.16 * xnMargin) + (0.20 * antiStasisScore) + (0.26 * strainScore) + (0.10 * cccScore)
              )
            );
            return {
              inTube,
              objectiveScore: Number(objectiveScore.toFixed(6)),
              components: { nodalHealthy, antiStasisOk, strainOk, homeostaticCccOk }
            };
          }

          recordTickViability({
            tick = 0,
            observableHealth = {},
            activeActionId = 'none',
            cluster = 'balanced',
            plasticityEnabled = true
          } = {}) {
            const vp = this.viabilityPolicyState;
            const evalRes = this.evaluateObjectiveViability(observableHealth);
            const vs = vp.viabilityStats;
            vs.totalTicksEvaluated += 1;
            if (evalRes.inTube) vs.inTubeTicks += 1;
            vs.inTubeRate = Number((vs.inTubeTicks / Math.max(1, vs.totalTicksEvaluated)).toFixed(6));
            vs.lastObjectiveScore = evalRes.objectiveScore;
            vs.lastInTube = evalRes.inTube;
            vs.lastCluster = cluster;
            vs.lastSelectedPolicyAction = activeActionId;

            const settled = [];
            const remaining = [];
            for (const entry of vp.pendingCreditQueue) {
              if (executionEnvironmentFor(this).controls.consolidation === false) {
                remaining.push(entry);
              } else if (tick >= entry.dueTick) {
                const gain = evalRes.objectiveScore - entry.baselineObjectiveScore;
                const outcomeTarget = Math.max(
                  0,
                  Math.min(1, 0.25 + (evalRes.objectiveScore * 0.45) + (gain * 3.5) + (evalRes.inTube ? 0.22 : -0.22))
                );
                const stat = vp.actionStats[entry.actionId];
                if (stat) {
                  stat.attempts += 1;
                  if (evalRes.inTube) stat.viabilityMaintainedCount += 1;
                  stat.meanViabilityDelta = Number(((0.85 * stat.meanViabilityDelta) + (0.15 * gain)).toFixed(6));
                  stat.efficacyEma = Number(((0.90 * stat.efficacyEma) + (0.10 * outcomeTarget)).toFixed(6));
                }
                const cMap = vp.clusterActionEfficacy[entry.cluster];
                if (cMap && entry.actionId in cMap) {
                  cMap[entry.actionId] = Number(((0.82 * cMap[entry.actionId]) + (0.18 * outcomeTarget)).toFixed(6));
                }
                const aMap = vp.clusterActionAttempts?.[entry.cluster];
                if (aMap && entry.actionId in aMap) {
                  aMap[entry.actionId] += 1;
                }
                settled.push({
                  actionId: entry.actionId,
                  cluster: entry.cluster,
                  objectiveViabilityGain: gain,
                  inTubeAfter: evalRes.inTube
                });
              } else {
                remaining.push(entry);
              }
            }
            vp.pendingCreditQueue = remaining;

            if (plasticityEnabled && executionEnvironmentFor(this).controls.consolidation !== false && activeActionId && activeActionId !== 'none') {
              vp.pendingCreditQueue.push({
                issuedTick: tick,
                dueTick: tick + vp.creditHorizonTicks,
                actionId: activeActionId,
                cluster,
                baselineObjectiveScore: evalRes.objectiveScore
              });
              if (vp.pendingCreditQueue.length > 32) {
                vp.pendingCreditQueue = vp.pendingCreditQueue.slice(-32);
              }
              if (vp.actionStats[activeActionId]) {
                vp.actionStats[activeActionId].lastSelectedTick = tick;
              }
            }

            // Very slow asymmetric relaxation across unselected actions
            if (plasticityEnabled && executionEnvironmentFor(this).controls.consolidation !== false) {
              for (const stat of Object.values(vp.actionStats)) {
                stat.efficacyEma = Number(((0.9992 * stat.efficacyEma) + (0.0008 * 0.5)).toFixed(6));
              }
            }

            return { evaluation: evalRes, settledCredits: settled };
          }

          // --- Learned adjustment mode (C-6b) -------------------------------
          resetLearning(adjustments = null) {
            this.adjustments = Object.fromEntries(KAIZEN_ADJUSTABLE_KEYS.map((k) => [k, Number.isFinite(adjustments?.[k]) ? adjustments[k] : 1]));
            this.learning = { phase: 'baseline', samples: [], baseline: null, baselines: [], trial: null, cursor: 0, direction: Object.fromEntries(KAIZEN_ADJUSTABLE_KEYS.map((k) => [k, 1])), history: [] };
          }

          getAdjustments() {
            return { ...this.adjustments };
          }

          /** Restore factors (autonomy rollback). */
          restoreAdjustments(adjustments) {
            if (!adjustments || typeof adjustments !== 'object') return;
            for (const k of KAIZEN_ADJUSTABLE_KEYS) if (Number.isFinite(adjustments[k])) this.adjustments[k] = adjustments[k];
          }

          _boundValue(key, value) {
            if (key.includes('RATE') || key.includes('FACTOR') || key.includes('WEIGHT')) return Math.max(0.0001, Math.min(0.5, value));
            if (key.includes('THRESHOLD') || key.includes('DECAY')) return Math.max(0.01, Math.min(0.99, value));
            if (key === 'BOLTZMANN_ANALOG_K' || key === 'INFORMATIONAL_TEMP_T') return Math.max(0.1, Math.min(5.0, value));
            return value;
          }

          _clampFactor(f, cfg = KAIZEN_LEARNING_DEFAULTS) {
            return Math.round(Math.max(cfg.factorMin, Math.min(cfg.factorMax, f)) * 1e6) / 1e6;
          }

          /** Effective config: core base value × learned factor, within Kaizen bounds. */
          applyLearnedAdjustments(baseConfig) {
            const next = { ...this.mutableConfig };
            for (const key of KAIZEN_ADJUSTABLE_KEYS) {
              const base = Number(baseConfig?.[key]);
              if (Number.isFinite(base)) next[key] = this._boundValue(key, base * this.adjustments[key]);
            }
            this.mutableConfig = next;
            return next;
          }

          /** Autonomy actions in learned mode: one bounded factor step on the action's key. */
          applyFactorStep(key, direction, cfg = KAIZEN_LEARNING_DEFAULTS) {
            if (!KAIZEN_ADJUSTABLE_KEYS.includes(key) || (direction !== 1 && direction !== -1)) return { changeApplied: false };
            const before = this.adjustments[key];
            const after = this._clampFactor(before + direction * cfg.sandboxStep, cfg);
            if (after === before) return { changeApplied: false, reason: 'factor_at_bound' };
            this.adjustments[key] = after;
            this.transformationSteps++;
            this.lastChangeRate = after - before;
            return { changeApplied: true, mutatedKey: key, newValue: after, direction, kind: 'learned_factor' };
          }

          /**
           * One learning tick: alternate a baseline window and a trial window.
           * A trial changes one factor by ±step; it is kept only if its window
           * score beats the preceding baseline by `margin`, otherwise reverted
           * and the next trial on that key goes the other way. Deterministic:
           * no RNG and no clock.
           */
          observeLearningTick(signal, cfg = KAIZEN_LEARNING_DEFAULTS) {
            const L = this.learning;
            if (!signal || !Number.isFinite(signal.ccc)) return null;
            L.samples.push({ ccc: signal.ccc, stasis: Number(signal.stasis) || 0, strain: Number(signal.strain) || 0 });
            if (L.samples.length < cfg.windowTicks) return null;
            const score = kaizenWindowScore(L.samples, cfg);
            L.samples = [];
            if (L.phase === 'baseline') {
              L.baseline = score;
              L.baselines.push(score.score);
              if (L.baselines.length > 16) L.baselines.shift();
              if (L.baselines.length < cfg.warmupBaselines) return { event: 'baseline_measured', baselineScore: score.score };
              // Pick the next key whose factor can move in its preferred direction.
              for (let tries = 0; tries < KAIZEN_LEARNABLE_KEYS.length * 2; tries += 1) {
                const key = KAIZEN_LEARNABLE_KEYS[L.cursor % KAIZEN_LEARNABLE_KEYS.length];
                const from = this.adjustments[key];
                const to = this._clampFactor(from + L.direction[key] * cfg.step, cfg);
                if (to !== from) {
                  this.adjustments[key] = to;
                  L.trial = { key, from, to };
                  L.phase = 'trial';
                  this.transformationSteps++;
                  this.lastChangeRate = to - from;
                  return { event: 'trial_started', key, from, to, baselineScore: score.score };
                }
                L.direction[key] = -L.direction[key];
                if (tries % 2 === 1) L.cursor += 1;
              }
              return { event: 'no_trial_possible' };
            }
            const { key, from, to } = L.trial;
            // Noise: mean absolute change between consecutive baselines (same
            // factors, so only noise). A trial must beat it by noiseK.
            const diffs = L.baselines.slice(1).map((s, i) => Math.abs(s - L.baselines[i]));
            const noise = diffs.length ? diffs.reduce((a, b) => a + b, 0) / diffs.length : 0;
            const requiredGain = Math.max(cfg.margin, cfg.noiseK * noise);
            const kept = score.score > L.baseline.score + requiredGain;
            if (!kept) {
              this.adjustments[key] = from;
              L.direction[key] = -L.direction[key];
            }
            L.cursor += 1;
            L.phase = 'baseline';
            L.trial = null;
            const record = { key, from, to, kept, baselineScore: L.baseline.score, trialScore: score.score, requiredGain, noise, trialOsc: score.osc, trialStasis: score.stasis };
            L.history.push(record);
            if (L.history.length > 64) L.history.shift();
            return { event: kept ? 'trial_kept' : 'trial_reverted', ...record };
          }

          _clamp01(value) {
            return Math.max(0, Math.min(1, Number(value) || 0));
          }

          _scoreSandboxAction(actionId, systemState = {}, historicalContext = null) {
            const stasisIndex = this._clamp01(systemState.stasisIndex);
            const strain = this._clamp01(systemState.metacognitiveStrain);
            const sensorSignal = this._clamp01(systemState.sensorSignal);
            const sensorDelta = this._clamp01(systemState.sensorDelta);
            const pmiaMagnitude = this._clamp01(Math.abs(Number(systemState.pmia) || 0));
            const latencyFailureRate = this._clamp01(systemState.latencyFailureRate);
            const cooldownActive = Boolean(systemState.cooldownActive) ? 1 : 0;
            const stasisPressure = this._clamp01(Number(systemState.stasisPressure) || stasisIndex);

            let baseScore = -Infinity;
            const dispersionNorm = this._clamp01((Number(systemState.xDispersion) || 0) * 8);
            if (actionId === 'stabilize_learning') {
              baseScore = (strain * 0.34) + (dispersionNorm * 0.24) + (pmiaMagnitude * 0.08) + ((1 - stasisIndex) * 0.08);
            } else if (actionId === 'anti_stasis_boost') {
              baseScore = (stasisPressure * 0.56) + ((1 - dispersionNorm) * 0.10) + ((1 - strain) * 0.10);
            } else if (actionId === 'sensor_load_shed') {
              baseScore = (strain * 0.22) + (sensorSignal * 0.18) + (sensorDelta * 0.24) + (latencyFailureRate * 0.22);
            } else if (actionId === 'llm_pressure_relief') {
              baseScore = (strain * 0.32) + (latencyFailureRate * 0.28) + (cooldownActive * 0.26);
            }
            if (!Number.isFinite(baseScore)) return -Infinity;

            if (!historicalContext || historicalContext.plasticityEnabled === false) {
              return baseScore;
            }

            const maturation = this._clamp01(historicalContext.maturationIndex);
            const surprisal = Math.max(0, Math.min(2, Number(historicalContext.surprisalEma) || 0));
            const unforeseenRate = this._clamp01(historicalContext.unforeseenEventRate);
            const cluster = typeof historicalContext.cluster === 'string'
              ? historicalContext.cluster
              : this.classifyViabilityCluster(systemState);

            const vp = this.viabilityPolicyState;
            const stat = vp?.actionStats?.[actionId];
            const globalEff = Number.isFinite(stat?.efficacyEma) ? stat.efficacyEma : 0.5;
            const clusterEff = Number.isFinite(vp?.clusterActionEfficacy?.[cluster]?.[actionId])
              ? vp.clusterActionEfficacy[cluster][actionId]
              : 0.5;
            const clusterAttempts = Number(vp?.clusterActionAttempts?.[cluster]?.[actionId] || 0);
            const clusterExp = Math.min(1, clusterAttempts / 3);
            const globalExp = stat ? Math.min(1, stat.attempts / 8) : 0;
            const learnedEffBonus = ((0.75 * (clusterEff - 0.5) * clusterExp) + (0.25 * (globalEff - 0.5) * globalExp))
              * (0.65 + (1.10 * maturation));

            const engramBiasMap = historicalContext.engramContext?.engramActionBiasMap || {};
            const engramPref = Number.isFinite(Number(engramBiasMap[actionId])) ? Number(engramBiasMap[actionId]) : 0;
            const engramConf = this._clamp01(historicalContext.engramContext?.preferredActionConfidence);
            const engramBonus = engramPref * (0.35 + (0.75 * maturation)) * Math.max(engramConf, clusterExp * 0.5);

            // Deterministic block-held structured exploration during active adaptation when cluster trials < 4
            let explorationBonus = 0;
            if (historicalContext.allowExploration === true) {
              const tickNow = Math.max(0, Math.floor(Number(historicalContext.tick) || 0));
              const blockIdx = Math.floor(tickNow / 3) % this.strategyCatalog.length;
              const preferredTrialId = this.strategyCatalog[blockIdx]?.id;
              if (actionId === preferredTrialId && clusterAttempts < 4) {
                explorationBonus = 0.85;
              } else if (clusterAttempts < 3) {
                explorationBonus = 0.25 * (1 - (clusterAttempts / 3));
              }
            }

            // Surprise / unforeseen dynamic hazard gating: shifts protective policy once matured
            const hazardDrive = Math.min(1, (0.45 * surprisal) + (0.55 * unforeseenRate));
            let hazardGate = 0;
            if (actionId === 'stabilize_learning') {
              hazardGate = hazardDrive * (cluster === 'high_dispersion' ? 0.36 : 0.02);
            } else if (actionId === 'sensor_load_shed') {
              hazardGate = hazardDrive * (cluster === 'high_sensory' ? 0.42 : 0.04);
            } else if (actionId === 'llm_pressure_relief') {
              hazardGate = hazardDrive * (cluster === 'high_strain' || cluster === 'balanced' ? 0.38 : 0.05);
            } else if (actionId === 'anti_stasis_boost') {
              hazardGate = (cluster === 'high_stasis' ? 0.44 : -0.08) * hazardDrive;
            }
            const predictiveBonus = hazardGate * maturation;

            return baseScore + learnedEffBonus + engramBonus + predictiveBonus + explorationBonus;
          }

          /**
           * Selects one deterministic runtime-sandbox action based on system state
           * and optional historical maturation/viability context.
           * No RNG is used in this planner.
           * @param {object} systemState
           * @param {object} policy
           * @param {object|null} historicalContext
           * @returns {{actionId:string,score:number,reason:string,cluster?:string}|null}
           */
          selectSandboxAction(systemState = {}, policy = {}, historicalContext = null) {
            const enabled = policy?.enabled !== false;
            if (!enabled) return null;

            const allowedIds = Array.isArray(policy?.allowedActions) && policy.allowedActions.length > 0
              ? policy.allowedActions
              : this.strategyCatalog.map((entry) => entry.id);
            const cluster = this.classifyViabilityCluster(systemState);

            let best = null;
            const diagnosticScores = [];
            for (let i = 0; i < this.strategyCatalog.length; i++) {
              const entry = this.strategyCatalog[i];
              if (!allowedIds.includes(entry.id)) continue;
              const score = this._scoreSandboxAction(entry.id, systemState, historicalContext);
              diagnosticScores.push({ actionId: entry.id, score });
              if (!Number.isFinite(score)) continue;
              if (!best || score > best.score + 1e-12) {
                best = { actionId: entry.id, score, reason: entry.description, cluster };
              }
            }

            if (executionEnvironmentFor(this).diagnostics) {
              const ranked = diagnosticScores.filter(e => Number.isFinite(e.score)).sort((a,b) => b.score-a.score);
              executionEnvironmentFor(this).diagnostics.policy = {
                state: structuredClone(systemState), cluster,
                scores: ranked, topTwoMargin: ranked.length > 1 ? ranked[0].score-ranked[1].score : null,
                historicalReadEnabled: Boolean(historicalContext && historicalContext.plasticityEnabled !== false)
              };
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
            // Learned mode: the six recomputed keys move only through factors.
            // Forced (autonomy) steps on them become factor steps; the window
            // learner replaces random and reinforcement mutations on them.
            // SYNAPTIC_PRUNING_THRESHOLD keeps the legacy atomic mutation.
            if (isKaizenLearned(executionEnvironmentFor(this).config)) {
              const forced = forcedKey && (forcedDirection === 1 || forcedDirection === -1);
              if (forced && KAIZEN_ADJUSTABLE_KEYS.includes(forcedKey)) return this.applyFactorStep(forcedKey, forcedDirection);
              if (!forced) {
                this.lastChangeRate = 0;
                return { changeApplied: false, reason: 'learned_mode_window_learner' };
              }
            }
            
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
            let direction = executionEnvironmentFor(this).random() > 0.5 ? 1 : -1;
            
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
            } else if (ccc >= THRESHOLD_CCC_ASCEND && ccc < executionEnvironmentFor(this).config.ASCENSION_THRESHOLD) {
                // PRIORITY: FORCE Ascensión (Architectural Preference)
                const ascentKeys = ['HEBBIAN_FACTOR', 'BASE_LEARNING_RATE', 'RETRO_FLUX_WEIGHT'];
                keyToMutate = ascentKeys[Math.floor(executionEnvironmentFor(this).random() * ascentKeys.length)];
                direction = 1; // Force positive change to increase CCC push
            } else {
                // Normal random mutation
                keyToMutate = this.mutableKeys[Math.floor(executionEnvironmentFor(this).random() * this.mutableKeys.length)];
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
              : METAMORPHOSIS_MAGNITUDE * (executionEnvironmentFor(this).random() * 0.5 + 0.5);
            
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
