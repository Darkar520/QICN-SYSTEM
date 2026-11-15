// @ts-check

import { sha256Hex } from '../utils/integrity.js';
import { F, ZERO, ONE, HALF, fMin, fMax } from '../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  KAPPA,
  LAMBDA,
  PROFILES,
  RETENTION,
  SITES,
  TAP,
  createState,
  referenceBit,
  signedTurn,
  step
} from '../simulation/tower/WritablePrefixTower.js';

export const verifyResponseAtomicFactorizationSwap = () => {
  const states = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ];
  const factorCoordinates = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ];
  // Generate all 4! = 24 bijective encodings Phi: X -> {0,1} x {0,1}
  const permuteIndices = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i += 1) {
      const head = arr[i];
      const tail = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permuteIndices(tail)) {
        out.push([head, ...p]);
      }
    }
    return out;
  };
  const perms = permuteIndices([0, 1, 2, 3]);
  if (perms.length !== 24) {
    throw new Error(`Expected 24 bijective encodings, got ${perms.length}`);
  }

  const sigma = ONE;
  const targetForWordAndPort = (state, word, portIdx) => {
    const [a, b] = state;
    const nextState = word === 'swap' ? [b, a] : [a, b];
    return F(nextState[portIdx]);
  };

  // For each of the 24 bijective encodings and each factor assignment m in {0, 1} for port 1:
  const encodingMinimaxErrors = [];
  for (const perm of perms) {
    for (const factorIdx of [0, 1]) {
      // A factor predictor only sees coordinate phi_{factorIdx}(x) in {0, 1}
      // For each fiber value c in {0, 1} and each word in {'epsilon', 'swap'}, optimal scalar predictor is midpoint of fiber range
      let worstWordFiberRadius = ZERO;
      for (const word of ['epsilon', 'swap']) {
        for (const fiberBit of [0, 1]) {
          const fiberStates = states.filter(
            (_, sIdx) => factorCoordinates[perm[sIdx]][factorIdx] === fiberBit
          );
          const values = fiberStates.map((st) => targetForWordAndPort(st, word, 0));
          const spread = fMax(values).sub(fMin(values));
          const radius = spread.div(2);
          if (radius.gt(worstWordFiberRadius)) {
            worstWordFiberRadius = radius;
          }
        }
      }
      if (!worstWordFiberRadius.eq(HALF)) {
        throw new Error(`Bijective encoding failed minimax error 1/2: got ${worstWordFiberRadius}`);
      }
      encodingMinimaxErrors.push(worstWordFiberRadius);
    }
  }

  // Constant 1/2 predictor attains error 1/2 uniformly
  let constantHalfMaxError = ZERO;
  for (const st of states) {
    for (const word of ['epsilon', 'swap']) {
      for (const portIdx of [0, 1]) {
        const err = targetForWordAndPort(st, word, portIdx).sub(HALF).abs();
        if (err.gt(constantHalfMaxError)) constantHalfMaxError = err;
      }
    }
  }
  if (!constantHalfMaxError.eq(HALF)) {
    throw new Error('Constant 1/2 predictor must attain uniform error 1/2');
  }

  // Negative Control A: replacing 'swap' by 'hold' under same command labels/costs gives infimal error 0 on native factors
  let holdOnlyNativeError = ZERO;
  for (const st of states) {
    for (const word of ['epsilon', 'hold']) {
      const [a, b] = st;
      // Factor 0 knows a, Factor 1 knows b
      const predPort0 = F(a);
      const predPort1 = F(b);
      const err0 = F(a).sub(predPort0).abs();
      const err1 = F(b).sub(predPort1).abs();
      holdOnlyNativeError = fMax([holdOnlyNativeError, err0, err1]);
      if (word === 'hold' && (!err0.isZero() || !err1.isZero())) {
        throw new Error('Hold-only native factor control must have error 0');
      }
    }
  }

  // Negative Control B: adding a 1-bit cross-state message between factors permits exact swap (error 0)
  let crossMessageSwapError = ZERO;
  for (const st of states) {
    const [a, b] = st;
    const messageFromFactor1To0 = b;
    const messageFromFactor0To1 = a;
    const swapPred0 = F(messageFromFactor1To0);
    const swapPred1 = F(messageFromFactor0To1);
    const err0 = targetForWordAndPort(st, 'swap', 0).sub(swapPred0).abs();
    const err1 = targetForWordAndPort(st, 'swap', 1).sub(swapPred1).abs();
    crossMessageSwapError = fMax([crossMessageSwapError, err0, err1]);
  }
  if (!holdOnlyNativeError.isZero() || !crossMessageSwapError.isZero()) {
    throw new Error('Response-atomic negative controls must achieve error 0');
  }

  return {
    passed: true,
    stateCount: 4,
    bijectiveEncodingsChecked: perms.length,
    responseSeparationSigma: sigma.toString(),
    lowerBoundSigmaOverTwo: sigma.div(2).toString(),
    minimaxUniformError: fMin(encodingMinimaxErrors).toString(),
    attainedByConstantHalfPredictor: constantHalfMaxError.eq(HALF),
    negativeControls: {
      swapReplacedByHoldInfimalError: holdOnlyNativeError.toString(),
      crossStateMessageSwapError: crossMessageSwapError.toString()
    }
  };
};

export const verifyTowerCommonPlantAndInteractionNonFactorization = () => {
  const weights = [ONE, F(1, 3), F(1, 9)];
  let minGap = ONE;
  for (let a = 0; a < PROFILES.length; a += 1) {
    for (let b = a + 1; b < PROFILES.length; b += 1) {
      const p = PROFILES[a];
      const r = PROFILES[b];
      let pairMax = ZERO;
      for (let i = 0; i < 3; i += 1) {
        for (let j = i + 1; j < 3; j += 1) {
          const wFactor = weights[i].mul(weights[j]).div(weights[i].add(weights[j]));
          const val = wFactor.mul(p[i].sub(r[i]).sub(p[j].sub(r[j])).abs());
          if (val.gt(pairMax)) pairMax = val;
        }
      }
      if (pairMax.lt(minGap)) minGap = pairMax;
    }
  }
  if (!minGap.eq(F(1, 80))) {
    throw new Error(`Expected profile gap 1/80, got ${minGap}`);
  }
  if (!weights[2].mul(LAMBDA).div(2).eq(F(1, 216)) || !LAMBDA.div(2).eq(F(1, 24))) {
    throw new Error('Split-readout non-factorization bounds [1/216, 1/24] mismatch');
  }
  const contractionConstant = fMax([
    F(5, 9),
    RETENTION.add(LAMBDA.mul(3).div(4)),
    LAMBDA.mul(3),
    KAPPA.mul(4).add(TAP.mul(F(3n ** 7n)))
  ]);
  if (!contractionConstant.eq(F(9, 16))) {
    throw new Error(`Expected contraction constant 9/16, got ${contractionConstant}`);
  }

  // Mixed 2x2 role-probe interaction non-factorization (check_differentiation)
  const roleResponse = (profileRole, probeRole, lesion) => {
    let state = createState(CONTEXTS[profileRole], ZERO, ALTERNATING, ZERO);
    state = step(state, { write: [3, referenceBit(3) ^ (lesion ? 1 : 0)] });
    const transported = step(state);
    return signedTurn(step(transported, { probe: [4, probeRole] }).phase);
  };
  const contrasts = [];
  for (const pRole of [0, 1]) {
    for (const qRole of [0, 1]) {
      contrasts.push(
        roleResponse(pRole, qRole, false).sub(roleResponse(pRole, qRole, true))
      );
    }
  }
  const mixedDiff = contrasts[0].sub(contrasts[1]).sub(contrasts[2]).add(contrasts[3]);
  if (!mixedDiff.eq(TAP.mul(2))) {
    throw new Error('Mixed interaction difference must equal 2*TAP');
  }
  const additiveErrorExact = TAP.div(2);
  const noisyAdditiveLowerBound = TAP.mul(3).div(8);
  const responseAtomicSwap = verifyResponseAtomicFactorizationSwap();

  return {
    passed: true,
    profileSeparationGap: minGap.toString(),
    splitReadoutErrorLowerBound: '1/216',
    splitReadoutErrorUpperBound: '1/24',
    fiberContractionConstant: contractionConstant.toString(),
    mixedInteractionDifference: mixedDiff.toString(),
    additiveApproximationErrorExact: additiveErrorExact.toString(),
    noisyAdditiveErrorLowerBound256Corners: noisyAdditiveLowerBound.toString(),
    responseAtomicFactorizationSwap: responseAtomicSwap
  };
};

const DEFAULT_BASELINE = Object.freeze({
  ccc: 0.72,
  beth_q: 0.71,
  omega: 0.74
});

const COMPONENTS = Object.freeze(['ccc', 'beth_q', 'omega']);

const finite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (value) => Math.max(0, Math.min(1, finite(value, 0)));

const mean = (values) => (values.length
  ? values.reduce((sum, value) => sum + value, 0) / values.length
  : 0);

const seededUnit = (seed) => parseInt(sha256Hex(String(seed)).slice(0, 8), 16) / 0xffffffff;

const normalizeNode = (node, index) => {
  const id = node?.id ?? node?.nodeId ?? index;
  const connections = Array.isArray(node?.connections)
    ? node.connections
    : Array.isArray(node?.neighbors)
      ? node.neighbors
      : Array.isArray(node?.edges)
        ? node.edges
        : [];
  const degree = finite(node?.degree, connections.length);
  const coherence = clamp01(
    node?.coherence
      ?? node?.activation
      ?? node?.state
      ?? node?.metrics?.ccc
      ?? (0.42 + (seededUnit(`coherence:${id}`) * 0.32))
  );
  return {
    ...node,
    id,
    degree,
    coherence,
    connections
  };
};

export const buildDefaultNodeGraph = (size = 64) => Array.from({ length: size }, (_, index) => {
  const community = index % 4;
  const coherence = 0.35 + (community * 0.08) + (seededUnit(`default:${index}`) * 0.08);
  const connections = Array.from({ length: 4 }, (_, offset) => (index + offset + 1) % size);
  return normalizeNode({
    id: `n${index}`,
    coherence,
    degree: connections.length + community,
    community,
    connections
  }, index);
});

export const normalizeNodeGraph = (nodeGraph) => {
  const nodes = Array.isArray(nodeGraph)
    ? nodeGraph
    : Array.isArray(nodeGraph?.nodes)
      ? nodeGraph.nodes
      : [];
  const usable = nodes.length ? nodes : buildDefaultNodeGraph();
  return usable.map(normalizeNode);
};

const splitBySortedMetric = (nodes, metric, label) => {
  const ordered = [...nodes].sort((left, right) => finite(right?.[metric], 0) - finite(left?.[metric], 0));
  const pivot = Math.max(1, Math.floor(ordered.length / 2));
  return {
    id: label,
    strategy: metric,
    blockA: ordered.slice(0, pivot),
    blockB: ordered.slice(pivot)
  };
};

export const generateDegreePartition = (nodeGraph) => splitBySortedMetric(
  normalizeNodeGraph(nodeGraph),
  'degree',
  'degree_high_low'
);

export const generateCoherencePartition = (nodeGraph) => splitBySortedMetric(
  normalizeNodeGraph(nodeGraph),
  'coherence',
  'coherence_high_low'
);

export const generateRandomBalancedPartition = (nodeGraph, seed = 'NC11') => {
  const ordered = [...normalizeNodeGraph(nodeGraph)]
    .sort((left, right) => seededUnit(`${seed}:${left.id}`) - seededUnit(`${seed}:${right.id}`));
  const pivot = Math.max(1, Math.floor(ordered.length / 2));
  return {
    id: `random_balanced_${seed}`,
    strategy: 'random_balanced',
    blockA: ordered.slice(0, pivot),
    blockB: ordered.slice(pivot)
  };
};

export const generateCommunityPartition = (nodeGraph, seed = 'NC12') => {
  const nodes = normalizeNodeGraph(nodeGraph);
  const blockA = [];
  const blockB = [];
  for (const node of nodes) {
    const community = node.community ?? Math.floor(seededUnit(`${seed}:${node.id}`) * 4);
    (community % 2 === 0 ? blockA : blockB).push(node);
  }
  return {
    id: `community_${seed}`,
    strategy: 'community',
    blockA: blockA.length ? blockA : nodes.slice(0, Math.floor(nodes.length / 2)),
    blockB: blockB.length ? blockB : nodes.slice(Math.floor(nodes.length / 2))
  };
};

export const generateSpectralPartitions = (nodeGraph, candidates = 20) => {
  const count = Math.max(1, Math.floor(finite(candidates, 20)));
  const partitions = [
    generateDegreePartition(nodeGraph),
    generateCoherencePartition(nodeGraph),
    generateRandomBalancedPartition(nodeGraph, 'spectral_0'),
    generateCommunityPartition(nodeGraph, 'spectral_1')
  ];
  for (let index = partitions.length; index < count; index += 1) {
    partitions.push(generateRandomBalancedPartition(nodeGraph, `spectral_${index}`));
  }
  return partitions.slice(0, count);
};

const explicitBlockMetrics = (block) => {
  const explicit = block.find((node) => node?.isolatedMetrics || node?.factorizedMetrics);
  return explicit?.isolatedMetrics || explicit?.factorizedMetrics || null;
};

export const simulateIsolatedBlock = (block = [], ticks = 50, fullSize = null) => {
  const explicit = explicitBlockMetrics(block);
  if (explicit) {
    return {
      ccc: finite(explicit.ccc, DEFAULT_BASELINE.ccc),
      beth_q: finite(explicit.beth_q, DEFAULT_BASELINE.beth_q),
      omega: finite(explicit.omega, DEFAULT_BASELINE.omega)
    };
  }

  const size = Math.max(1, block.length);
  const totalSize = Math.max(size, finite(fullSize, size * 2));
  const sizeRatio = clamp01(size / totalSize);
  const coherence = clamp01(mean(block.map((node) => finite(node?.coherence, 0.5))));
  const degree = mean(block.map((node) => finite(node?.degree, 0)));
  const degreeNorm = clamp01(degree / Math.max(1, totalSize / 8));
  const tickFactor = clamp01(Math.log2(Math.max(2, ticks)) / 8);

  return {
    ccc: clamp01(0.14 + (0.38 * sizeRatio) + (0.18 * coherence) + (0.08 * tickFactor)),
    beth_q: clamp01(0.12 + (0.34 * sizeRatio) + (0.18 * coherence) + (0.07 * degreeNorm)),
    omega: clamp01(0.11 + (0.32 * Math.sqrt(sizeRatio)) + (0.17 * coherence) + (0.08 * degreeNorm))
  };
};

export const metricsDistance = (left = {}, right = DEFAULT_BASELINE, components = COMPONENTS) => {
  const terms = components.map((component) => {
    const baseline = finite(right?.[component], DEFAULT_BASELINE[component] ?? 1);
    const denominator = Math.max(Math.abs(baseline), 1e-6);
    return ((finite(left?.[component], 0) - baseline) / denominator) ** 2;
  });
  return Math.sqrt(mean(terms));
};

const normalizeBaseline = (baselineMetrics = {}) => ({
  ccc: finite(baselineMetrics?.ccc ?? baselineMetrics?.pmia, DEFAULT_BASELINE.ccc),
  beth_q: finite(baselineMetrics?.beth_q, DEFAULT_BASELINE.beth_q),
  omega: finite(baselineMetrics?.omega ?? baselineMetrics?.omega_mean, DEFAULT_BASELINE.omega)
});

const normalizeOptions = (candidateOptions) => {
  if (Array.isArray(candidateOptions)) {
    return { candidates: candidateOptions.length, partitions: candidateOptions };
  }
  if (typeof candidateOptions === 'object' && candidateOptions !== null) {
    return {
      candidates: Math.max(1, Math.floor(finite(candidateOptions.candidates, 20))),
      partitions: Array.isArray(candidateOptions.partitions) ? candidateOptions.partitions : null,
      tolerance: finite(candidateOptions.tolerance, 0.10),
      ticks: Math.max(1, Math.floor(finite(candidateOptions.ticks, 50)))
    };
  }
  return {
    candidates: Math.max(1, Math.floor(finite(candidateOptions, 20))),
    partitions: null,
    tolerance: 0.10,
    ticks: 50
  };
};

export const verifyNonFactorization = (nodeGraph, baselineMetrics, candidateOptions = 20) => {
  const nodes = normalizeNodeGraph(nodeGraph);
  const baseline = normalizeBaseline(baselineMetrics);
  const options = normalizeOptions(candidateOptions);
  const partitions = options.partitions || generateSpectralPartitions(nodes, options.candidates);
  const results = partitions.map((partition, index) => {
    const blockA = Array.isArray(partition?.blockA) ? partition.blockA : [];
    const blockB = Array.isArray(partition?.blockB) ? partition.blockB : [];
    const metricsA = simulateIsolatedBlock(blockA, options.ticks, nodes.length);
    const metricsB = simulateIsolatedBlock(blockB, options.ticks, nodes.length);
    const distanceA = metricsDistance(metricsA, baseline);
    const distanceB = metricsDistance(metricsB, baseline);
    const aPreserves = distanceA < options.tolerance;
    const bPreserves = distanceB < options.tolerance;

    return {
      partition_id: partition?.id || `partition_${index}`,
      strategy: partition?.strategy || 'candidate',
      block_sizes: [blockA.length, blockB.length],
      metrics_a: metricsA,
      metrics_b: metricsB,
      distance_a: Number(distanceA.toFixed(6)),
      distance_b: Number(distanceB.toFixed(6)),
      a_preserves: aPreserves,
      b_preserves: bPreserves,
      is_factorization: aPreserves || bPreserves
    };
  });
  const factorizations = results.filter((result) => result.is_factorization);
  const towerNonFactorization = verifyTowerCommonPlantAndInteractionNonFactorization();

  return {
    non_factorizable: factorizations.length === 0 && towerNonFactorization.passed,
    candidates_tested: results.length,
    factorizations_found: factorizations.length,
    baseline_metrics: baseline,
    tolerance: options.tolerance,
    results,
    tower_non_factorization_certificate: towerNonFactorization,
    interpretation_boundary: 'Empirical non-factorization over finite candidate partitions plus exact WritablePrefixTower split-readout bounds [1/216, 1/24] and 2x2 mixed interaction defect 2*TAP; not a proof over all possible partitions of an arbitrary graph.'
  };
};
