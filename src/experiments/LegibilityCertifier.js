// @ts-check

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));

const mean = (values = []) => {
  const usable = values.map((value) => finite(value, NaN)).filter(Number.isFinite);
  return usable.length ? usable.reduce((sum, value) => sum + value, 0) / usable.length : 0;
};

export const euclideanDistance = (a = [], b = []) => {
  const width = Math.max(a.length, b.length);
  if (!width) return 0;
  let sum = 0;
  for (let index = 0; index < width; index += 1) {
    sum += (finite(a[index], 0) - finite(b[index], 0)) ** 2;
  }
  return Math.sqrt(sum);
};

const deterministicNoise = (sampleIndex, trialIndex, componentIndex, stdDev) => {
  const phase = ((sampleIndex + 1) * 12.9898) + ((trialIndex + 1) * 78.233) + ((componentIndex + 1) * 37.719);
  const unit = Math.sin(phase) * 43758.5453;
  const centered = (unit - Math.floor(unit)) - 0.5;
  return centered * 2 * Math.abs(finite(stdDev, 0));
};

const pairwiseDistances = (vectors = []) => vectors.map((left) => vectors.map((right) => euclideanDistance(left, right)));

const pearsonCorrelation = (x = [], y = []) => {
  const n = Math.min(x.length, y.length);
  if (n < 2) return 0;
  const xs = x.slice(0, n).map((value) => finite(value, 0));
  const ys = y.slice(0, n).map((value) => finite(value, 0));
  const mx = mean(xs);
  const my = mean(ys);
  const numerator = xs.reduce((sum, value, index) => sum + ((value - mx) * (ys[index] - my)), 0);
  const dx = Math.sqrt(xs.reduce((sum, value) => sum + ((value - mx) ** 2), 0));
  const dy = Math.sqrt(ys.reduce((sum, value) => sum + ((value - my) ** 2), 0));
  return dx > 0 && dy > 0 ? numerator / (dx * dy) : 0;
};

const flattenMatrixUpper = (matrix = []) => {
  const out = [];
  for (let row = 0; row < matrix.length; row += 1) {
    for (let col = row + 1; col < matrix[row].length; col += 1) {
      out.push(finite(matrix[row][col], 0));
    }
  }
  return out;
};

export const nearestCentroidDecoder = (classSamples = []) => {
  const centroids = classSamples
    .filter((item) => item?.label && Array.isArray(item.vectors) && item.vectors.length)
    .map((item) => {
      const width = Math.max(...item.vectors.map((vector) => vector.length));
      const centroid = Array.from({ length: width }, (_, index) => mean(item.vectors.map((vector) => vector[index])));
      return { label: item.label, centroid };
    });

  return (vector = []) => {
    let best = null;
    for (const candidate of centroids) {
      const distance = euclideanDistance(vector, candidate.centroid);
      if (!best || distance < best.distance) best = { label: candidate.label, distance };
    }
    return best?.label || null;
  };
};

export const computeSeparabilityMargin = (classSamples = []) => {
  const usable = classSamples.filter((item) => item?.label && Array.isArray(item.vectors) && item.vectors.length);
  let minInterDistance = Infinity;
  let maxIntraDistance = 0;

  for (let i = 0; i < usable.length; i += 1) {
    for (let j = i + 1; j < usable.length; j += 1) {
      for (const vi of usable[i].vectors) {
        for (const vj of usable[j].vectors) {
          minInterDistance = Math.min(minInterDistance, euclideanDistance(vi, vj));
        }
      }
    }
    for (let a = 0; a < usable[i].vectors.length; a += 1) {
      for (let b = a + 1; b < usable[i].vectors.length; b += 1) {
        maxIntraDistance = Math.max(maxIntraDistance, euclideanDistance(usable[i].vectors[a], usable[i].vectors[b]));
      }
    }
  }

  const margin = maxIntraDistance > 0 ? minInterDistance / maxIntraDistance : (Number.isFinite(minInterDistance) ? Infinity : 0);
  return {
    l1_separability: usable.length >= 2 && Number.isFinite(minInterDistance) && minInterDistance > maxIntraDistance,
    margin: Number.isFinite(margin) ? margin : 1,
    min_inter_distance: Number.isFinite(minInterDistance) ? minInterDistance : 0,
    max_intra_distance: maxIntraDistance,
    interpretation_boundary: 'Finite decoder-class separability over supplied samples; not a proof over all latent states.'
  };
};

export const computeNoiseRobustness = (decoder, samples = [], noiseStdDev = 0.01, trials = 100) => {
  let stableAssignments = 0;
  let total = 0;
  const safeTrials = Math.max(1, Math.floor(finite(trials, 100)));

  samples.forEach((sample, sampleIndex) => {
    const vector = Array.isArray(sample?.vector) ? sample.vector : [];
    const baseline = decoder(vector);
    for (let trial = 0; trial < safeTrials; trial += 1) {
      const noisy = vector.map((value, componentIndex) => finite(value, 0) + deterministicNoise(sampleIndex, trial, componentIndex, noiseStdDev));
      if (vector.length > 0 && vector.every((value) => typeof value === 'number' && Number.isFinite(value)) &&
          baseline !== null && baseline !== undefined && baseline !== '' &&
          (!sample?.label || sample.label === baseline) && decoder(noisy) === baseline) stableAssignments += 1;
      total += 1;
    }
  });

  const stabilityRate = total > 0 ? stableAssignments / total : 0;
  return {
    l2_noise_robustness: stabilityRate >= 0.95,
    stability_rate: stabilityRate,
    noise_level: Math.abs(finite(noiseStdDev, 0)),
    trials: safeTrials,
    interpretation_boundary: 'Deterministic bounded-noise robustness over finite samples; not distribution-free decoder robustness.'
  };
};

export const computePersistenceWindow = (assignments = [], tauMin = 5, interventions = []) => {
  let longestRun = 0;
  let currentRun = 0;
  let previous = null;
  const interventionTicks = new Set(interventions.map((item) => finite(item?.tick, -1)));

  assignments.forEach((item, index) => {
    const label = typeof item === 'string' ? item : item?.label;
    const tick = typeof item === 'string' ? index : finite(item?.tick, index);
    if (typeof label !== 'string' || !label.trim()) {
      currentRun = 0;
      previous = null;
      return;
    }
    if (interventionTicks.has(tick)) {
      currentRun = 1;
      previous = label;
    } else if (label === previous) {
      currentRun += 1;
    } else {
      currentRun = 1;
      previous = label;
    }
    longestRun = Math.max(longestRun, currentRun);
  });

  return {
    l3_persistence_window: longestRun >= Math.max(1, Math.floor(finite(tauMin, 5))),
    longest_run: longestRun,
    tau_min: Math.max(1, Math.floor(finite(tauMin, 5))),
    interpretation_boundary: 'Finite assignment-run persistence check; certified interventions only reset the local run counter.'
  };
};

export const computeInterventionFidelity = (interventions = []) => {
  const usable = interventions.filter((item) => item && typeof item.expected_change === 'boolean' && typeof item.observed_change === 'boolean');
  const correct = usable.filter((item) => item.expected_change === item.observed_change).length;
  const rate = usable.length ? correct / usable.length : null;
  return {
    l4_intervention_fidelity: usable.length === interventions.length && rate !== null && rate >= 0.95,
    intervention_fidelity_rate: rate,
    interventions_tested: usable.length,
    interpretation_boundary: 'Finite certified-intervention fidelity check; not causal completeness over all intervention schedules.'
  };
};

export const computeNegativeControlCoverage = (controls = []) => {
  const usable = controls.filter((item) => item && typeof item.control === 'string' && item.control.trim() && typeof item.pass === 'boolean');
  const passRate = usable.length ? usable.filter((item) => item.pass).length / usable.length : 0;
  const distinct = new Set(usable.map((item) => item.control.trim().toUpperCase()));
  return {
    l5_negative_controls: usable.length === controls.length && usable.length >= 7 && distinct.size === usable.length && passRate === 1,
    negative_control_pass_rate: passRate,
    controls_tested: usable.length,
    interpretation_boundary: 'Internal negative-control coverage only; passing controls are falsification routes, not proof routes.'
  };
};

export const computeCompressibility = (historyVectors = [], compressionRatio = 0.5) => {
  const vectors = historyVectors.filter((vector) => Array.isArray(vector) && vector.length >= 2);
  const ratio = Math.max(0.05, Math.min(1, finite(compressionRatio, 0.5)));
  const step = Math.max(1, Math.round(1 / ratio));
  const originalDistances = flattenMatrixUpper(pairwiseDistances(vectors));
  const compressed = vectors.map((vector) => vector.filter((_, index) => index % step === 0));
  const compressedDistances = flattenMatrixUpper(pairwiseDistances(compressed));
  const structureCorrelation = originalDistances.length >= 2 ? pearsonCorrelation(originalDistances, compressedDistances) : 0;

  return {
    l6_compressibility: structureCorrelation >= 0.8 && compressed.every((vector) => vector.length > 0),
    compression_ratio: ratio,
    structure_correlation: structureCorrelation,
    interpretation_boundary: 'Finite structural-compression check over supplied histories; not a Kolmogorov or universal coding theorem.'
  };
};

import { F, ZERO, vecEq } from '../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  PROFILES,
  SITES,
  createState,
  distance as towerDistance,
  prefix,
  readout,
  referenceBit,
  step
} from '../simulation/tower/WritablePrefixTower.js';

export const verifyTowerLegibilityHorizon = () => {
  let trialCount = 0;
  for (const profile of PROFILES) {
    for (const site of SITES) {
      for (const depth of [7, 10, 12]) {
        let sham = createState(profile, ZERO, ALTERNATING, ZERO);
        let target = step(sham, { write: [site, 1 - referenceBit(site)] });
        const reference = prefix(sham.code, depth);
        const resolution = F(1n, 3n ** BigInt(depth));
        const eta = resolution.div(4);
        const maxSteps = depth - site + 4;

        for (let t = 0; t < maxSteps; t += 1) {
          const gap = target.code.sub(sham.code).abs();
          const expectedGap = F(2n, 3n ** BigInt(site + t));
          if (!gap.eq(expectedGap) || !towerDistance(target, sham).eq(gap)) {
            throw new Error(`Exact legibility horizon D_{${site},${t}} mismatch`);
          }
          if (!vecEq(readout(target).slice(0, 3), readout(sham).slice(0, 3))) {
            throw new Error('Phase readouts must match on pure tape write');
          }
          if (gap.gte(resolution) !== (t <= depth - site)) {
            throw new Error('Resolution threshold equivalence failed');
          }
          for (const error of [eta.neg(), ZERO, eta]) {
            if (!vecEq(prefix(sham.code.add(error), depth), reference)) {
              throw new Error('Sham prefix under bounded noise changed');
            }
            const differs = !vecEq(prefix(target.code.add(error), depth), reference);
            if (differs !== (t <= depth - site)) {
              throw new Error('Noisy target legibility horizon equivalence failed');
            }
          }
          const midpoint = target.code.add(sham.code).div(2);
          if (midpoint.sub(sham.code).abs().lte(eta) !== (t >= depth + 2 - site)) {
            throw new Error('Midpoint collision horizon failed');
          }
          sham = step(sham);
          target = step(target);
        }
        trialCount += 1;
      }
    }
  }
  return {
    passed: true,
    trialsVerified: trialCount,
    horizonFormula: 'D_{j,t} = 2 * 3^-(j+t)',
    exactHorizonEquivalence: 't <= depth - site',
    midpointCollisionHorizon: 't >= depth + 2 - site'
  };
};

export const buildLegibilityCertificate = ({
  classSamples = [],
  samples = [],
  assignments = [],
  interventions = [],
  negativeControls = [],
  historyVectors = [],
  noiseStdDev = 0.01,
  trials = 100,
  tauMin = 5,
  compressionRatio = 0.5
} = {}) => {
  const decoder = nearestCentroidDecoder(classSamples);
  const l1 = computeSeparabilityMargin(classSamples);
  const l2 = computeNoiseRobustness(decoder, samples, noiseStdDev, trials);
  const l3 = computePersistenceWindow(assignments, tauMin, interventions);
  const l4 = computeInterventionFidelity(interventions);
  const l5 = computeNegativeControlCoverage(negativeControls);
  const l6 = computeCompressibility(historyVectors, compressionRatio);
  const score = (
    (Number(l1.l1_separability) * 0.18)
    + (Number(l2.l2_noise_robustness) * 0.18)
    + (Number(l3.l3_persistence_window) * 0.14)
    + (Number(l4.l4_intervention_fidelity) * 0.18)
    + (Number(l5.l5_negative_controls) * 0.18)
    + (Number(l6.l6_compressibility) * 0.14)
  );

  const towerHorizon = verifyTowerLegibilityHorizon();

  return {
    score: Number(clamp01(score).toFixed(12)),
    clauses: { L1: l1, L2: l2, L3: l3, L4: l4, L5: l5, L6: l6 },
    clauses_passed: [l1.l1_separability, l2.l2_noise_robustness, l3.l3_persistence_window, l4.l4_intervention_fidelity, l5.l5_negative_controls, l6.l6_compressibility]
      .filter(Boolean).length,
    tower_legibility_horizon: towerHorizon,
    interpretation_boundary: 'Finite six-clause operational legibility certificate plus exact single-trajectory prefix horizon D_{j,t}=2*3^-(j+t); not semantic transparency or external claim closure.'
  };
};
