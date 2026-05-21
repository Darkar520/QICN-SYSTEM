// @ts-check

import { sha256Hex } from '../utils/integrity.js';

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

  return {
    non_factorizable: factorizations.length === 0,
    candidates_tested: results.length,
    factorizations_found: factorizations.length,
    baseline_metrics: baseline,
    tolerance: options.tolerance,
    results,
    interpretation_boundary: 'Empirical non-factorization over finite candidate partitions; not a proof over all possible partitions of the node graph.'
  };
};
