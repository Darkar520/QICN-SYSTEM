const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const clamp01 = (value) => clamp(value, 0, 1);

const finite = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};

export const STRUCTURAL_CONSOLIDATION_BOUNDARY =
  'Internal slow-timescale proxy. Consolidation can support bounded CCC/C^R coupling only under sustained dynamic evidence; elapsed time alone is not evidence.';

export class StructuralConsolidationTracker {
  constructor(options = {}) {
    this.value = clamp01(options.initialValue ?? 0);
    this.evidenceTicks = 0;
    this.regressionTicks = 0;
    this.lastDiagnostics = null;
    this.options = {
      growthRate: clamp(options.growthRate ?? 0.012, 0.001, 0.05),
      decayRate: clamp(options.decayRate ?? 0.020, 0.001, 0.08),
      maxBias: clamp(options.maxBias ?? 0.018, 0, 0.05),
      cccFloor: finite(options.cccFloor, 0.98),
      omegaFloor: finite(options.omegaFloor, 1.02),
      spectralFloor: finite(options.spectralFloor, 0.12),
      stasisCeiling: finite(options.stasisCeiling, 0.78),
      minimumDynamics: finite(options.minimumDynamics, 0.0035)
    };
  }

  reset() {
    this.value = 0;
    this.evidenceTicks = 0;
    this.regressionTicks = 0;
    this.lastDiagnostics = null;
  }

  update(input = {}) {
    const ccc = finite(input.ccc, 0);
    const omega = finite(input.omega, 0);
    const spectralGap = finite(input.spectralGap, 0);
    const stasisIndex = clamp01(input.stasisIndex ?? 0);
    const cccDeltaRms = Math.abs(finite(input.cccDeltaRms, 0));
    const omegaDeltaRms = Math.abs(finite(input.omegaDeltaRms, 0));
    const pmiaDeltaRms = Math.abs(finite(input.pmiaDeltaRms, 0));
    const bifurcationDetected = input.bifurcationDetected === true;
    const dynamicEnergy = (cccDeltaRms * 0.45) + (omegaDeltaRms * 0.35) + (pmiaDeltaRms * 0.2);
    const dynamicSupport = dynamicEnergy >= this.options.minimumDynamics;
    const stableSupport = ccc >= this.options.cccFloor
      && omega >= this.options.omegaFloor
      && spectralGap >= this.options.spectralFloor
      && stasisIndex < this.options.stasisCeiling
      && !bifurcationDetected;
    const positiveEvidence = stableSupport && dynamicSupport;
    const hardRegression = ccc < 0.94 || omega < 0.90 || bifurcationDetected;

    if (positiveEvidence) {
      this.evidenceTicks += 1;
      this.regressionTicks = 0;
      const evidenceStrength = clamp01(
        ((ccc - this.options.cccFloor) / 0.16 * 0.30)
        + ((omega - this.options.omegaFloor) / 0.34 * 0.35)
        + (spectralGap * 0.20)
        + ((1 - stasisIndex) * 0.15)
      );
      this.value = clamp01(this.value + (this.options.growthRate * (0.35 + evidenceStrength)));
    } else {
      this.evidenceTicks = 0;
      this.regressionTicks += 1;
      const regressionPressure = hardRegression
        ? 1
        : clamp01((stasisIndex - 0.55) / 0.45) * 0.55 + (dynamicSupport ? 0 : 0.35);
      this.value = clamp01(this.value - (this.options.decayRate * Math.max(0.15, regressionPressure)));
    }

    const bias = positiveEvidence ? this.value * this.options.maxBias : 0;
    this.lastDiagnostics = {
      value: Number(this.value.toFixed(6)),
      bias: Number(bias.toFixed(6)),
      status: positiveEvidence ? 'consolidating' : hardRegression ? 'regressing' : 'holding_or_decaying',
      evidence_ticks: this.evidenceTicks,
      regression_ticks: this.regressionTicks,
      dynamic_support: dynamicSupport,
      stable_support: stableSupport,
      dynamic_energy: Number(dynamicEnergy.toFixed(6)),
      interpretation_boundary: STRUCTURAL_CONSOLIDATION_BOUNDARY
    };
    return this.lastDiagnostics;
  }

  getDiagnostics() {
    return this.lastDiagnostics || {
      value: this.value,
      bias: 0,
      status: 'uninitialized',
      evidence_ticks: this.evidenceTicks,
      regression_ticks: this.regressionTicks,
      dynamic_support: false,
      stable_support: false,
      dynamic_energy: 0,
      interpretation_boundary: STRUCTURAL_CONSOLIDATION_BOUNDARY
    };
  }
}

export default StructuralConsolidationTracker;
