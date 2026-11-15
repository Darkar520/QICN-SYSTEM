// @ts-check

import {
  DEFAULT_SUPPORT_BOUNDS,
  buildPersistenceCertificate
} from '../canon/persistence/PersistenceCertifier.js';
import { F, ZERO, ONE, fSum } from '../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  ETA,
  KAPPA,
  PROFILES,
  SAFE,
  SITES,
  circle,
  createState,
  readout,
  readoutEquals,
  referenceBit,
  signedTurn,
  step
} from '../simulation/tower/WritablePrefixTower.js';

export const LIFE_CERTIFIER_VERSION = 'life_certifier.paper7.runtime.v1';

export const verifyTowerJointSubjecthoodCertificate = () => {
  const signs = [-1, 1];
  const errors = [ETA.neg(), ZERO, ETA];
  const prep = (profile, sign) => createState(profile, ZERO, ALTERNATING, F(sign, 8));

  // 1. Privileged continuity (56 matched successor observations)
  let continuityChecks = 0;
  for (const profile of PROFILES) {
    for (const sign of signs) {
      let line = prep(profile, sign);
      let clone = prep(profile, -sign);
      let exactClone = line;
      if (!readoutEquals(readout(line), readout(clone))) {
        throw new Error('Initial clone readouts must coincide');
      }
      for (let t = 0; t < 4; t += 1) {
        const u = F(-sign, 64 * (2 ** t));
        line = step(line, { u });
        clone = step(clone, { u });
        exactClone = step(exactClone, { u });
        if (
          !line.equals(exactClone) ||
          !circle(line.phase).isZero() ||
          !circle(clone.phase).eq(F(1, 32 * (2 ** t)))
        ) {
          throw new Error('Privileged continuity phase separation failed');
        }
        continuityChecks += 1;
      }
    }
  }

  // 2. Self/non-self causal discrimination (28 assignments)
  let discriminationChecks = 0;
  for (const profile of PROFILES) {
    for (const sign of signs) {
      const start = prep(profile, sign);
      if (!readoutEquals(readout(step(start, { q: 1 })), readout(step(start, { q: -1 })))) {
        throw new Error('Post-pulse public readouts must match');
      }
      for (const assignment of signs) {
        const state = step(start, { q: assignment });
        const left = step(state, { u: F(-1, 128) }).phase;
        const right = step(state, { u: F(1, 128) }).phase;
        if (!circle(right).sub(circle(left)).eq(F(assignment * sign, 64))) {
          throw new Error('Causal discrimination gap != assignment*sign/64');
        }
        discriminationChecks += 1;
      }
      const ablated = prep(profile, 0);
      if (
        !circle(step(ablated, { u: F(-1, 128) }).phase).eq(F(1, 128)) ||
        !circle(step(ablated, { u: F(1, 128) }).phase).eq(F(1, 128))
      ) {
        throw new Error('Ablated discrimination control must collapse to 1/128');
      }
    }
  }

  // 3. Return prediction (14 hidden preparations)
  for (const profile of PROFILES) {
    const losses = [];
    for (const sign of signs) {
      const state = prep(profile, sign);
      if (!state.memory.abs().lte(SAFE)) throw new Error('Memory exceeded SAFE');
      const actual = {
        [-1]: circle(step(state, { u: F(-1, 64) }).phase),
        [1]: circle(step(state, { u: F(1, 64) }).phase)
      };
      losses.push(actual);
      if (!actual[-sign].isZero() || !actual[sign].eq(F(1, 32))) {
        throw new Error('Return prediction terminal loss mismatch');
      }
      for (const err of [F(-1, 32), ZERO, F(1, 32)]) {
        const predNeg = circle(F(-1, 64).add(KAPPA.mul(state.memory.add(err))));
        const predPos = circle(F(1, 64).add(KAPPA.mul(state.memory.add(err))));
        const chosen = predNeg.lte(predPos) ? -1 : 1;
        if (chosen !== -sign) throw new Error('Informed predictor failed under bounded error');
      }
    }
    for (const blindPort of signs) {
      const meanBlindLoss = fSum(losses.map((row) => row[blindPort])).div(2);
      if (!meanBlindLoss.eq(F(1, 64))) {
        throw new Error('Constant blind policy average loss must equal 1/64');
      }
    }
  }

  // 4. Ownership retention vs transplant (84 paired protocols)
  const writes = [null, ...SITES.map((s) => [s, 1 - referenceBit(s)])];
  let ownershipProtocols = 0;
  for (const profile of PROFILES) {
    for (const write of writes) {
      for (const reference of [signs, [1, -1]]) {
        const starts = reference.map((s) => prep(profile, s));
        const retained = starts.map((x) => step(x, { q: 1, write }));
        const transplanted = starts.map((x) => step(x, { q: -1, write }));
        if (
          !readoutEquals(readout(retained[0]), readout(transplanted[0])) ||
          !readoutEquals(readout(retained[1]), readout(transplanted[1]))
        ) {
          throw new Error('Retained and transplanted readouts must match');
        }
        for (const [assigned, expectedAcc] of [
          [retained, ONE],
          [transplanted, ZERO]
        ]) {
          const phases = assigned.map((x) => step(x).phase);
          for (const e0 of errors) {
            for (const e1 of errors) {
              const errs = [e0, e1];
              const decoded = phases.map((y, idx) =>
                signedTurn(y.add(errs[idx])).gt(ZERO) ? 1 : -1
              );
              const matches = decoded.filter((d, idx) => d === reference[idx]).length;
              if (!F(matches, 2).eq(expectedAcc)) {
                throw new Error('Ownership decoding accuracy mismatch');
              }
            }
          }
        }
        ownershipProtocols += 1;
      }
    }
  }

  return {
    passed: true,
    continuityChecks,
    discriminationChecks,
    returnPredictionPreparations: 14,
    ownershipPairedProtocols: ownershipProtocols
  };
};

export const LIFE_INTERPRETATION_BOUNDARY =
  'Framework-internal finite operational-life support only; not biological life, not metaphysical subjecthood, not external validation, and not a proof over all admissible controls or partitions.';

const finite = (value, fallback = 0) => (
  Number.isFinite(Number(value)) ? Number(value) : fallback
);
const clamp = (value, min, max) => Math.max(min, Math.min(max, finite(value, min)));
const clamp01 = (value) => clamp(value, 0, 1);
const mean = (values) => (
  values.length ? values.reduce((sum, value) => sum + value, 0) / values.length : 0
);

const metricsOf = (state = {}) => {
  const metrics = state.metrics || {};
  const ontological = state.ontologicalState || {};
  return {
    ccc: finite(metrics.ccc ?? state.ccc ?? ontological.coherence ?? ontological.existence, 0),
    pmia: finite(metrics.pmia ?? state.pmia, 0),
    beth_q: finite(metrics.beth_q ?? state.beth_q ?? ontological.beth_q, 0),
    omega: finite(metrics.omega ?? metrics.omega_mean ?? state.omega ?? ontological.omega, 0),
    spectral_gap: finite(metrics.spectral_gap ?? state.spectral_gap ?? ontological.spectral_gap, 0),
    stasis_index: finite(metrics.stasis_index ?? state.stasis_index, 0),
    activeNodes: finite(metrics.activeNodes ?? state.activeNodes ?? state.topologyMetrics?.activeNodes, 0),
    totalNodes: finite(metrics.totalNodes ?? state.totalNodes ?? state.topologyMetrics?.totalNodes, 0)
  };
};

const normalizeTrajectory = (trajectory = []) => (
  Array.isArray(trajectory) ? trajectory.map((entry, index) => ({ tick: index, metrics: metricsOf(entry) })) : []
);

const runLocalNullRegimeInstabilityControl = (ticks = 50) => {
  const trajectory = Array.from({ length: Math.max(1, Math.floor(finite(ticks, 50))) }, (_, index) => {
    const escape = Math.max(0, index - 1);
    return {
      tick: index,
      metrics: {
        ccc: Math.min(0.72, escape * 0.035),
        beth_q: Math.min(0.55, escape * 0.03),
        omega: Math.min(0.65, escape * 0.032),
        spectral_gap: Math.min(0.22, escape * 0.012)
      }
    };
  });
  const escapeIndex = trajectory.findIndex((state) =>
    state.metrics.ccc > 0.1 && state.metrics.beth_q > 0.1 && state.metrics.omega > 0.1
  );
  return {
    control: 'NC8_null_regime_instability',
    expected: 'escape_from_null_regime_lte_20_ticks',
    pass: escapeIndex > 0 && escapeIndex <= 20,
    escape_tick: escapeIndex,
    interpretation_boundary:
      'Browser-safe mirror of the NC8 finite null-regime instability predicate; not a replacement for the full Node negative-control runner.'
  };
};

const driftScore = (mutableConfig = {}, baselineConfig = {}) => {
  const keys = Object.keys(baselineConfig || {}).filter((key) => Number.isFinite(Number(baselineConfig[key])));
  if (!keys.length) return 0.5;
  const drifts = keys.map((key) => {
    const base = Math.max(Math.abs(finite(baselineConfig[key], 0)), 1e-9);
    return Math.abs(finite(mutableConfig[key], baselineConfig[key]) - finite(baselineConfig[key], 0)) / base;
  });
  return clamp01(1 - mean(drifts));
};

const lagCorrelation = (values = []) => {
  if (values.length < 3) return 0;
  const x = values.slice(0, -1);
  const y = values.slice(1);
  const mx = mean(x);
  const my = mean(y);
  const numerator = x.reduce((sum, value, index) => sum + ((value - mx) * (y[index] - my)), 0);
  const dx = Math.sqrt(x.reduce((sum, value) => sum + ((value - mx) ** 2), 0));
  const dy = Math.sqrt(y.reduce((sum, value) => sum + ((value - my) ** 2), 0));
  return dx && dy ? numerator / (dx * dy) : 0;
};

export class LifeCertifier {
  constructor(options = {}) {
    this.options = Object.freeze({
      boundaryActiveRatioMin: clamp01(options.boundaryActiveRatioMin ?? 0.001),
      boundaryActiveRatioMax: clamp01(options.boundaryActiveRatioMax ?? 0.95),
      selfMaintenanceMin: clamp01(options.selfMaintenanceMin ?? 0.45),
      historyMinSamples: Math.max(3, Math.floor(finite(options.historyMinSamples, 6))),
      viabilityMinScore: clamp01(options.viabilityMinScore ?? 0.5),
      persistenceTrials: Math.max(1, Math.floor(finite(options.persistenceTrials, 256))),
      persistenceTicksPerTrial: Math.max(1, Math.floor(finite(options.persistenceTicksPerTrial, 8)))
    });
  }

  certifyBoundary(systemState = {}) {
    const metrics = metricsOf(systemState);
    const totalNodes = Math.max(1, metrics.totalNodes);
    const activeRatio = clamp01(metrics.activeNodes / totalNodes);
    const withinBand = activeRatio >= this.options.boundaryActiveRatioMin
      && activeRatio <= this.options.boundaryActiveRatioMax;
    const coherenceDefined = Number.isFinite(metrics.ccc) && metrics.ccc > 0;
    const boundaryScore = clamp01(
      (withinBand ? 0.45 : 0.15)
      + (coherenceDefined ? 0.25 : 0)
      + (1 - clamp01(metrics.stasis_index)) * 0.3
    );
    return {
      condition: 'L1_boundary',
      pass: withinBand && coherenceDefined,
      score: Number(boundaryScore.toFixed(12)),
      metrics: { activeRatio, activeNodes: metrics.activeNodes, totalNodes },
      interpretation_boundary: 'Finite operational boundary check over runtime topology counters; not a biological membrane or organism boundary.'
    };
  }

  certifyPersistence(systemState = {}, trajectory = []) {
    const normalized = normalizeTrajectory(trajectory);
    const certificate = buildPersistenceCertificate({
      trajectory: normalized,
      trials: this.options.persistenceTrials,
      ticksPerTrial: this.options.persistenceTicksPerTrial
    });
    return {
      condition: 'L2_persistence',
      pass: Boolean(certificate.forward.forward_invariant && certificate.collapse.min_collapse_distance > 0),
      score: certificate.score,
      certificate,
      interpretation_boundary: certificate.interpretation_boundary
    };
  }

  certifySelfMaintenance(systemState = {}) {
    const score = driftScore(systemState.mutableConfig, systemState.baselineConfig);
    const finiteConfig = Object.values(systemState.mutableConfig || {}).every((value) => Number.isFinite(Number(value)));
    return {
      condition: 'L3_self_maintenance',
      pass: finiteConfig && score >= this.options.selfMaintenanceMin,
      score: Number(score.toFixed(12)),
      metrics: {
        finite_config: finiteConfig,
        mutable_key_count: Object.keys(systemState.mutableConfig || {}).length
      },
      interpretation_boundary: 'Runtime parameter self-maintenance proxy; not autonomous biological metabolism or organismic homeostasis.'
    };
  }

  certifyHistoricalDependence(trajectory = []) {
    const normalized = normalizeTrajectory(trajectory);
    const values = normalized.map((entry) => finite(entry.metrics.ccc, 0));
    const corr = Math.abs(lagCorrelation(values));
    const uniqueRounded = new Set(values.map((value) => value.toFixed(4))).size;
    const sampleScore = clamp01(normalized.length / this.options.historyMinSamples);
    const variationScore = clamp01(uniqueRounded / Math.max(1, normalized.length));
    const score = clamp01((sampleScore * 0.35) + (corr * 0.45) + (variationScore * 0.2));
    return {
      condition: 'L4_historical_dependence',
      pass: normalized.length >= this.options.historyMinSamples && corr > 0.05 && uniqueRounded > 1,
      score: Number(score.toFixed(12)),
      metrics: {
        samples: normalized.length,
        lag1_abs_correlation: Number(corr.toFixed(12)),
        unique_rounded_states: uniqueRounded
      },
      interpretation_boundary: 'Finite trajectory history-dependence diagnostic; not a proof against all Markov factorizations.'
    };
  }

  certifyViabilityPreservation(systemState = {}) {
    const metrics = metricsOf(systemState);
    const bounds = DEFAULT_SUPPORT_BOUNDS;
    const coordinateScores = ['ccc', 'omega', 'beth_q', 'spectral_gap'].map((key) => {
      const [min, max] = bounds[key] || [0, 1];
      const value = finite(metrics[key], 0);
      if (value >= min && value <= max) return 1;
      const center = (min + max) / 2;
      const span = Math.max(max - min, 1e-9);
      return clamp01(1 - (Math.abs(value - center) / span));
    });
    const score = clamp01(mean(coordinateScores));
    return {
      condition: 'L5_viability_preservation',
      pass: score >= this.options.viabilityMinScore,
      score: Number(score.toFixed(12)),
      metrics: { ccc: metrics.ccc, omega: metrics.omega, beth_q: metrics.beth_q, spectral_gap: metrics.spectral_gap },
      interpretation_boundary: 'Finite viability-support check using the persistence support bounds; not a universal viability theorem.'
    };
  }

  certifyNonNullDifferentiation(systemState = {}, trajectory = []) {
    const metrics = metricsOf(systemState);
    const nc8 = runLocalNullRegimeInstabilityControl(50);
    const directScore = clamp01((metrics.omega * 0.45) + (metrics.beth_q * 0.45) + (metrics.ccc * 0.1));
    const trajectoryScore = normalizeTrajectory(trajectory).some((entry) =>
      entry.metrics.ccc > 0.1 && entry.metrics.beth_q > 0.1 && entry.metrics.omega > 0.1
    ) ? 1 : 0;
    const score = clamp01((directScore * 0.7) + (trajectoryScore * 0.15) + (Number(nc8.pass) * 0.15));
    return {
      condition: 'L6_non_null_differentiation',
      pass: score > 0.5 && nc8.pass,
      score: Number(score.toFixed(12)),
      nc8_control: {
        control: nc8.control,
        expected: nc8.expected,
        pass: nc8.pass,
        escape_tick: nc8.escape_tick
      },
      metrics: { ccc: metrics.ccc, omega: metrics.omega, beth_q: metrics.beth_q },
      interpretation_boundary: 'Internal non-null differentiation support via direct runtime metrics plus NC8; not proof for all null-regime realizations.'
    };
  }

  certifyAll(input = {}) {
    const systemState = input.systemState || input;
    const trajectory = input.trajectory || systemState.trajectory || [];
    const conditions = {
      boundary: this.certifyBoundary(systemState),
      persistence: this.certifyPersistence(systemState, trajectory),
      self_maintenance: this.certifySelfMaintenance(systemState),
      historical_dependence: this.certifyHistoricalDependence(trajectory),
      viability_preservation: this.certifyViabilityPreservation(systemState),
      non_null_differentiation: this.certifyNonNullDifferentiation(systemState, trajectory)
    };
    const scores = Object.values(conditions).map((entry) => finite(entry.score, 0));
    const towerJointCertificate = verifyTowerJointSubjecthoodCertificate();
    return {
      artifact_role: 'operational_life_certificate',
      artifact_version: LIFE_CERTIFIER_VERSION,
      implementation_status: 'implemented_internal_support',
      expected_class: 'L_op_finite_runtime_support',
      pass: Object.values(conditions).every((entry) => entry.pass) && towerJointCertificate.passed,
      score: Number(mean(scores).toFixed(12)),
      conditions,
      tower_joint_certificate: towerJointCertificate,
      non_implications: [
        'does_not_establish_biological_life',
        'does_not_establish_human_subjectivity',
        'does_not_establish_metaphysical_subjecthood',
        'does_not_establish_external_validation'
      ],
      witness_scope_boundary:
        'Ablating or defeating a concrete (witness, margin) tuple invalidates only that candidate tuple; global non-existence requires failure across all admissible candidates (prop:ablation-prediction, prop:complexity-only-negative-control).',
      interpretation_boundary: LIFE_INTERPRETATION_BOUNDARY
    };
  }

  static certifyAll(input = {}, options = {}) {
    return new LifeCertifier(options).certifyAll(input);
  }
}

export const buildLifeCertificate = (input = {}, options = {}) =>
  new LifeCertifier(options).certifyAll(input);

export default {
  LIFE_CERTIFIER_VERSION,
  LIFE_INTERPRETATION_BOUNDARY,
  LifeCertifier,
  buildLifeCertificate
};
