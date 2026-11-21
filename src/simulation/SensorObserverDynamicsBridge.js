// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Bounded sensory observer presence and coupled latency strain feedback into nodal dynamics; chat language channel remains strictly decoupled (dynamicsCoupling=false). Never implies consciousness or external validation.

export const SENSOR_OBSERVER_DYNAMICS_BOUNDS = Object.freeze({
  scaleMin: 0.85,
  scaleMax: 1.15,
  observerDecayPerTick: 0.96,
  observerSnapZeroThreshold: 1e-4,
  coherencePullMax: 0.025,
  plasticityDecayMin: 0.85,
  plasticityDecayMax: 0.999
});

const clamp = (value, min, max) => {
  const n = Number(value);
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
};

const clamp01 = (value) => clamp(value, 0, 1);

const round6 = (value) => Math.round(value * 1e6) / 1e6;

export const isSensorObserverDynamicsEnabled = (config = null) => config?.SENSOR_OBSERVER_DYNAMICS_ENABLED === true;

/**
 * Pure deterministic coupling law mapping live sensory observer presence
 * (`observerImpact` in [0,1], fed exclusively by vision/audio awareness — never
 * chat prose) and coupled runtime latency/metacognitive strain (`latencyStrain`
 * in [0,1], excluding dynamicsCoupled:false chat calls) into bounded
 * multiplicative factors inside [0.85, 1.15].
 *
 * When `enabled` is false (default in headless B0), returns exact identity
 * multipliers so frozen-B0 trajectories remain bit-for-bit identical.
 */
export function computeSensorObserverDynamicsModulation({
  observerImpact = 0,
  latencyStrain = 0,
  enabled = false
} = {}) {
  const obs = clamp01(observerImpact);
  const strain = clamp01(latencyStrain);
  if (!enabled) {
    return {
      active: false,
      observerImpact: obs,
      latencyStrain: strain,
      observerImpactNext: obs,
      learningRateScale: 1,
      hebbianScale: 1,
      temperatureScale: 1,
      retroFluxScale: 1,
      coherenceStabilizationPull: 0,
      plasticityDecayEnabled: false
    };
  }

  const { scaleMin, scaleMax, observerDecayPerTick, observerSnapZeroThreshold, coherencePullMax } = SENSOR_OBSERVER_DYNAMICS_BOUNDS;
  const decayed = obs * observerDecayPerTick;
  const observerImpactNext = decayed < observerSnapZeroThreshold ? 0 : round6(decayed);

  // Observer sensory presence gently sharpens learning/plasticity and cools T slightly;
  // coupled runtime/cognitive strain acts as a homeostatic brake (raises T, dampens
  // aggressive learning/Hebbian/retro-flux drift).
  const learningRateScale = round6(clamp(1 + (0.12 * obs) - (0.12 * strain), scaleMin, scaleMax));
  const hebbianScale = round6(clamp(1 + (0.10 * obs) - (0.14 * strain), scaleMin, scaleMax));
  const temperatureScale = round6(clamp(1 + (0.15 * strain) - (0.06 * obs), scaleMin, scaleMax));
  const retroFluxScale = round6(clamp(1 - (0.12 * strain) + (0.05 * obs), scaleMin, scaleMax));
  const coherenceStabilizationPull = round6(clamp(0.018 * obs, 0, coherencePullMax));

  return {
    active: true,
    observerImpact: obs,
    latencyStrain: strain,
    observerImpactNext,
    learningRateScale,
    hebbianScale,
    temperatureScale,
    retroFluxScale,
    coherenceStabilizationPull,
    plasticityDecayEnabled: true
  };
}

/**
 * Produces a fresh derived per-tick config object without mutating `baseConfig`
 * or `QICNConfig`. Respects Kaizen key bounds.
 */
export function applySensorObserverConfigModulation(baseConfig, modulation) {
  if (!baseConfig || typeof baseConfig !== 'object' || !modulation?.active) {
    return baseConfig;
  }
  const lr = Number(baseConfig.BASE_LEARNING_RATE);
  const heb = Number(baseConfig.HEBBIAN_FACTOR);
  const temp = Number(baseConfig.INFORMATIONAL_TEMP_T);
  const retro = Number(baseConfig.RETRO_FLUX_WEIGHT);
  return {
    ...baseConfig,
    ...(Number.isFinite(lr) ? { BASE_LEARNING_RATE: clamp(lr * modulation.learningRateScale, 0.0001, 0.5) } : {}),
    ...(Number.isFinite(heb) ? { HEBBIAN_FACTOR: clamp(heb * modulation.hebbianScale, 0.0001, 0.5) } : {}),
    ...(Number.isFinite(temp) ? { INFORMATIONAL_TEMP_T: clamp(temp * modulation.temperatureScale, 0.1, 5.0) } : {}),
    ...(Number.isFinite(retro) ? { RETRO_FLUX_WEIGHT: clamp(retro * modulation.retroFluxScale, 0.0001, 0.5) } : {})
  };
}
