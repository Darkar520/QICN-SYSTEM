const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));

export const EXOGENOUS_REGIMES = Object.freeze([
  'calm_drift',
  'volatile_burst',
  'oscillatory_shear',
  'adversarial_step'
]);

export const EXOGENOUS_MODES = Object.freeze([
  'off',
  'non_stationary_regime',
  'stationary_iid_sham'
]);

/**
 * Deterministic, seed-reproducible external perturbation generator.
 * Explicitly separates structured non-stationary regime shifts/shocks from an
 * empirical variance-matched stationary i.i.d. sham control (CN-1).
 * Never touches global Math.random() or Date.now(); full state is serializable
 * inside Dynamic State v3.
 */
export class ExogenousPerturbationDriver {
  constructor({ mode = 'off', seed = 0x42A1 } = {}) {
    this.reset({ mode, seed });
  }

  reset({ mode = 'off', seed = 0x42A1 } = {}) {
    const validMode = EXOGENOUS_MODES.includes(String(mode)) ? String(mode) : 'off';
    const intSeed = (Math.floor(Number(seed)) || 0x42A1) >>> 0;
    this.mode = validMode;
    this.seed = intSeed;
    this.rngState = (intSeed ^ 0x9E3779B9) >>> 0;
    this.stepCount = 0;
    this.regimeIndex = 0;
    this.regimeName = validMode === 'non_stationary_regime'
      ? EXOGENOUS_REGIMES[0]
      : (validMode === 'stationary_iid_sham' ? 'stationary_iid' : 'quiescent');
    this.regimeDwellElapsed = 0;
    this.regimeDwellTarget = 32;
    this.regimeTransitions = 0;
    this.currentStepSign = 1;
    this.lastSignal = 0;
    this.lastOutput = {
      active: false,
      mode: validMode,
      tick: 0,
      regimeIndex: 0,
      regimeName: this.regimeName,
      signal: 0,
      shockDelta: 0,
      sensoryPerturbation: 0,
      nodalVarianceDrive: 0,
      strainDrive: 0,
      stasisDrive: 0,
      shockImpulse: false,
      optimalPolicyHint: 'none'
    };
    this.stats = {
      sampleCount: 0,
      sum: 0,
      sumSq: 0,
      mean: 0,
      variance: 0,
      regimeCounts: {
        calm_drift: 0,
        volatile_burst: 0,
        oscillatory_shear: 0,
        adversarial_step: 0,
        stationary_iid: 0,
        quiescent: 0
      }
    };
  }

  _nextUniform() {
    let t = (this.rngState = (this.rngState + 0x6D2B79F5) >>> 0);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  }

  _nextBipolar() {
    // Triangular / zero-mean bounded variate in [-1, 1] with std = 1/sqrt(6) ≈ 0.408
    return this._nextUniform() - this._nextUniform();
  }

  setMode(mode) {
    const normalized = EXOGENOUS_MODES.includes(String(mode)) ? String(mode) : 'off';
    if (normalized === this.mode) return;
    this.mode = normalized;
    if (normalized === 'off') {
      this.regimeName = 'quiescent';
    } else if (normalized === 'stationary_iid_sham') {
      this.regimeName = 'stationary_iid';
    } else {
      this.regimeName = EXOGENOUS_REGIMES[this.regimeIndex % EXOGENOUS_REGIMES.length];
    }
  }

  _advanceNonStationary(tick) {
    this.regimeDwellElapsed += 1;
    let shockImpulse = false;

    if (this.regimeDwellElapsed >= this.regimeDwellTarget) {
      const nextOffset = 1 + Math.floor(this._nextUniform() * (EXOGENOUS_REGIMES.length - 1));
      this.regimeIndex = (this.regimeIndex + nextOffset) % EXOGENOUS_REGIMES.length;
      this.regimeName = EXOGENOUS_REGIMES[this.regimeIndex];
      this.regimeDwellElapsed = 0;
      this.regimeDwellTarget = 26 + Math.floor(this._nextUniform() * 34); // [26, 59] ticks
      this.regimeTransitions += 1;
      this.currentStepSign = this._nextUniform() >= 0.5 ? 1 : -1;
      shockImpulse = true;
    }

    const u = this._nextBipolar();
    const k = this.stepCount;
    let signal = 0;
    let sensoryPerturbation = 0;
    let nodalVarianceDrive = 0;
    let strainDrive = 0;
    let stasisDrive = 0;
    let optimalPolicyHint = 'stabilize_learning';

    if (this.regimeName === 'calm_drift') {
      // Quasi-periodic slow drift: low immediate noise, elevated stasis pressure if unmitigated
      signal = clamp(
        (0.16 * Math.sin(0.071 * k)) + (0.11 * Math.cos(0.113 * k)) + (0.04 * u),
        -1,
        1
      );
      sensoryPerturbation = signal * 0.12;
      nodalVarianceDrive = 0.02;
      strainDrive = 0.04;
      stasisDrive = 0.46;
      optimalPolicyHint = 'anti_stasis_boost';
    } else if (this.regimeName === 'volatile_burst') {
      // High-amplitude unpredictable bursts & dispersal stress
      const burstGate = (k % 7 === 0 || Math.abs(u) > 0.52) ? 1.45 : 0.85;
      if (k % 9 === 0) shockImpulse = true;
      signal = clamp((0.68 * u * burstGate) + (0.18 * Math.sin(0.37 * k)), -1, 1);
      sensoryPerturbation = signal * 0.20;
      nodalVarianceDrive = 0.36 + (0.24 * Math.abs(signal));
      strainDrive = 0.14;
      stasisDrive = 0;
      optimalPolicyHint = 'stabilize_learning';
    } else if (this.regimeName === 'oscillatory_shear') {
      // Rapid alternating shear wave flooding sensory delta
      signal = clamp(
        (0.58 * Math.sin(0.83 * k + (this.seed % 13))) + (0.22 * u),
        -1,
        1
      );
      sensoryPerturbation = clamp(Math.sign(signal || 1) * (0.28 + (0.16 * Math.abs(signal))), -0.48, 0.48);
      nodalVarianceDrive = 0.18;
      strainDrive = 0.36;
      stasisDrive = 0.02;
      optimalPolicyHint = 'sensor_load_shed';
    } else {
      // adversarial_step: sustained offset shift pushing strain & threshold excursion
      signal = clamp(
        (0.52 * this.currentStepSign) + (0.19 * u) + (0.08 * Math.cos(0.19 * k)),
        -1,
        1
      );
      sensoryPerturbation = signal * 0.24;
      nodalVarianceDrive = 0.18;
      strainDrive = 0.44;
      stasisDrive = 0.04;
      optimalPolicyHint = 'llm_pressure_relief';
    }

    const shockDelta = Math.abs(signal - this.lastSignal);
    this.lastSignal = signal;

    return {
      active: true,
      mode: 'non_stationary_regime',
      tick,
      regimeIndex: this.regimeIndex,
      regimeName: this.regimeName,
      signal,
      shockDelta,
      sensoryPerturbation,
      nodalVarianceDrive,
      strainDrive,
      stasisDrive,
      shockImpulse,
      optimalPolicyHint
    };
  }

  _advanceStationarySham(tick) {
    // Variance-matched i.i.d. zero-mean white noise (std ~ 0.415, no regime autocorrelation)
    const u = this._nextBipolar();
    const signal = clamp(u * 1.02, -1, 1);
    const shockDelta = Math.abs(signal - this.lastSignal);
    this.lastSignal = signal;
    this.regimeName = 'stationary_iid';

    return {
      active: true,
      mode: 'stationary_iid_sham',
      tick,
      regimeIndex: 0,
      regimeName: 'stationary_iid',
      signal,
      shockDelta,
      sensoryPerturbation: signal * 0.2,
      nodalVarianceDrive: 0.12 * Math.abs(signal),
      strainDrive: 0.08 * Math.abs(signal),
      stasisDrive: 0.02,
      shockImpulse: false,
      optimalPolicyHint: 'none'
    };
  }

  step(tick = 0, { modeOverride = null } = {}) {
    if (modeOverride !== null && modeOverride !== undefined) {
      this.setMode(modeOverride);
    }
    this.stepCount += 1;

    let out;
    if (this.mode === 'non_stationary_regime') {
      out = this._advanceNonStationary(tick);
    } else if (this.mode === 'stationary_iid_sham') {
      out = this._advanceStationarySham(tick);
    } else {
      this.regimeName = 'quiescent';
      this.lastSignal = 0;
      out = {
        active: false,
        mode: 'off',
        tick,
        regimeIndex: 0,
        regimeName: 'quiescent',
        signal: 0,
        shockDelta: 0,
        sensoryPerturbation: 0,
        nodalVarianceDrive: 0,
        strainDrive: 0,
        stasisDrive: 0,
        shockImpulse: false,
        optimalPolicyHint: 'none'
      };
    }

    this.lastOutput = out;
    if (out.active) {
      this.stats.sampleCount += 1;
      this.stats.sum += out.signal;
      this.stats.sumSq += out.signal * out.signal;
      const n = this.stats.sampleCount;
      this.stats.mean = this.stats.sum / n;
      this.stats.variance = Math.max(0, (this.stats.sumSq / n) - (this.stats.mean * this.stats.mean));
    }
    if (this.stats.regimeCounts && out.regimeName in this.stats.regimeCounts) {
      this.stats.regimeCounts[out.regimeName] += 1;
    }
    return out;
  }

  getDiagnostics() {
    return {
      mode: this.mode,
      seed: this.seed,
      stepCount: this.stepCount,
      regimeIndex: this.regimeIndex,
      regimeName: this.regimeName,
      regimeTransitions: this.regimeTransitions,
      lastSignal: Number((this.lastSignal || 0).toFixed(6)),
      empiricalMean: Number((this.stats.mean || 0).toFixed(6)),
      empiricalVariance: Number((this.stats.variance || 0).toFixed(6)),
      empiricalStd: Number(Math.sqrt(this.stats.variance || 0).toFixed(6)),
      sampleCount: this.stats.sampleCount,
      regimeCounts: { ...this.stats.regimeCounts }
    };
  }
}

export default ExogenousPerturbationDriver;
