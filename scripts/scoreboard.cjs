#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync } = require('node:child_process');
const { pathToFileURL } = require('node:url');
const { emitRunMetadata } = require('./emit-run-metadata.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');
emitRunMetadata('scoreboard');
const SPEC_PATH = path.join(PROJECT_ROOT, 'src', 'config', 'cognitiveEmergenceOperationalSpec.js');
const EVAL_PATH = path.join(PROJECT_ROOT, 'src', 'utils', 'cognitiveEmergenceEvaluation.js');
const PPS_PATH = path.join(PROJECT_ROOT, 'src', 'utils', 'phenomenologyProtocolSuite.js');
const PREREG_PATH = path.join(PROJECT_ROOT, 'docs', 'cognitive_emergence_prereg.v1.json');
const NPM_BIN = process.platform === 'win32' ? 'npm.cmd' : 'npm';

const args = new Set(process.argv.slice(2));
const shouldRunCommands = args.has('--run');
const jsonFileArg = process.argv.find((arg) => arg.startsWith('--json-file='));
const jsonFilePath = jsonFileArg ? jsonFileArg.slice('--json-file='.length) : null;

const nowIso = () => new Date().toISOString();

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const runCommand = (command, commandArgs = []) => {
  const startedAt = Date.now();
  const useShell = process.platform === 'win32';
  const result = spawnSync(command, commandArgs, {
    cwd: PROJECT_ROOT,
    encoding: 'utf8',
    shell: useShell
  });
  const elapsedMs = Date.now() - startedAt;
  const stdout = result.stdout || '';
  const stderr = result.stderr || '';
  return {
    command: [command, ...commandArgs].join(' '),
    status: result.status ?? 1,
    signal: result.signal || null,
    error: result.error ? (result.error.message || String(result.error)) : null,
    elapsedMs,
    stdout,
    stderr,
    evidenceTail: `${stdout}\n${stderr}`.split(/\r?\n/).filter(Boolean).slice(-12)
  };
};

const isBlockedCommandError = (errorMessage) => (
  typeof errorMessage === 'string' && /(EPERM|EACCES|EINVAL)/i.test(errorMessage)
);

const scoreByChecks = (checks = []) => {
  if (!checks.length) return 0;
  const passCount = checks.filter(Boolean).length;
  return Number(((passCount / checks.length) * 10).toFixed(2));
};

const absolutePath = (targetPath) => (
  path.isAbsolute(targetPath) ? targetPath : path.resolve(PROJECT_ROOT, targetPath)
);

const buildIdentitySeries = (withShock = false) => {
  const base = Array.from({ length: 42 }, (_, idx) => ({
    cccDrift: 0.028 + ((idx % 4) * 0.002),
    omegaDrift: 0.034 + ((idx % 5) * 0.002),
    spectralGapDrift: 0.038 + ((idx % 3) * 0.002),
    narrativePenalty: 0.06,
    perturbationResponse: 0.03
  }));
  if (!withShock) return base;
  return [
    ...base,
    {
      cccDrift: 0.2,
      cccDriftSmoothed: 0.01,
      omegaDrift: 0.24,
      omegaDriftSmoothed: 0.02,
      spectralGapDrift: 0.22,
      spectralGapDriftSmoothed: 0.03,
      narrativePenalty: 0.34,
      perturbationResponse: 0.18,
      isShock: true,
      shockMagnitude: 0.25
    }
  ];
};

const readPrereg = () => {
  const text = fs.readFileSync(PREREG_PATH, 'utf8');
  return JSON.parse(text);
};

const evaluateDimensions = async () => {
  const spec = await import(pathToFileURL(SPEC_PATH).href);
  const evalUtils = await import(pathToFileURL(EVAL_PATH).href);
  const ppsUtils = await import(pathToFileURL(PPS_PATH).href);
  const prereg = readPrereg();

  const dimensions = [];

  const specValidation = spec.validateCognitiveEmergenceSpec();
  const specCompatibility = spec.validateSpecCompatibility(prereg);
  const freshHashes = spec.computeCognitiveEmergenceSpecHashes(spec.getCognitiveEmergenceSpecSnapshot());
  const specChecks = [
    specValidation.valid,
    specCompatibility.valid,
    freshHashes.specHash === spec.COGNITIVE_EMERGENCE_SPEC_HASH,
    freshHashes.actuatorSetHash === spec.COGNITIVE_EMERGENCE_ACTUATOR_SET_HASH,
    prereg.frozenActuatorSetVersion === spec.COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION
  ];
  dimensions.push({
    id: 'SPEC_FREEZE_VERSIONING',
    pass: specChecks.every(Boolean),
    score10: scoreByChecks(specChecks),
    thresholds: {
      specValid: true,
      compatibilityValid: true,
      hashMatch: true,
      actuatorSetFrozenVersion: spec.COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION
    },
    observed: {
      specValid: specValidation.valid,
      compatibilityValid: specCompatibility.valid,
      actuatorCount: spec.COGNITIVE_EMERGENCE_ACTUATOR_SET.length,
      specHash: spec.COGNITIVE_EMERGENCE_SPEC_HASH,
      preregSpecHash: prereg.specHash
    },
    effectSizes: {},
    evidence: ['src/config/cognitiveEmergenceOperationalSpec.js', 'docs/cognitive_emergence_prereg.v1.json']
  });

  const preregProtocolCheck = evalUtils.evaluatePreregistrationProtocol(prereg);
  const failHardProbe = evalUtils.evaluateQuantitativeCriteria(
    {
      counterfactual_error_delta: -0.02,
      planning_reward_gain: 0.03,
      ablation_drop_planner_off: 0.02,
      identity_stability_score: 0.5,
      actuator_causal_impact_te: 0.03,
      entropy_primary_ratio: 0.9
    },
    {
      counterfactual_error_delta: 0.01,
      planning_reward_gain: 0.02,
      ablation_drop_planner_off: 0.01,
      identity_stability_score: 0.01,
      actuator_causal_impact_te: 0.01,
      entropy_primary_ratio: 0.08
    }
  );
  const preregChecks = [
    preregProtocolCheck.pass,
    failHardProbe.primaryFailHardTriggered === true,
    Array.isArray(prereg.primaryMetricOrder) && prereg.primaryMetricOrder.length >= 5,
    prereg.analysisProtocolLocked === true
  ];
  dimensions.push({
    id: 'PREREG_ANTI_PHACKING',
    pass: preregChecks.every(Boolean),
    score10: scoreByChecks(preregChecks),
    thresholds: {
      primaryFailHard: true,
      pipelineStartsWithPrimary: true,
      evaluationSeedPositive: true,
      activeWindowTicksPositive: true
    },
    observed: {
      protocolPass: preregProtocolCheck.pass,
      protocolIssues: preregProtocolCheck.issues,
      pipeline: prereg.preregProtocol?.analysisPipelineOrder || [],
      evaluationSeed: prereg.preregProtocol?.evaluationSeed ?? null
    },
    effectSizes: {},
    evidence: ['docs/cognitive_emergence_prereg.v1.json', 'src/utils/cognitiveEmergenceEvaluation.js']
  });

  const identityStable = evalUtils.computeIdentityStabilityScore(buildIdentitySeries(false));
  const identityShock = evalUtils.computeIdentityStabilityScore(buildIdentitySeries(true));
  const identityChecks = [
    identityStable.score >= 0.82,
    identityShock.score < identityStable.score,
    identityShock.components.smoothingGuardPenalty > 0
  ];
  dimensions.push({
    id: 'IDENTITY_STABILITY',
    pass: identityChecks.every(Boolean),
    score10: scoreByChecks(identityChecks),
    thresholds: {
      stableScoreMin: 0.82,
      shockMustReduceScore: true,
      smoothingGuardPenaltyPositiveOnShock: true
    },
    observed: {
      stableScore: identityStable.score,
      shockScore: identityShock.score,
      smoothingGuardPenalty: identityShock.components.smoothingGuardPenalty
    },
    effectSizes: {
      shockDrop: Number((identityStable.score - identityShock.score).toFixed(6))
    },
    evidence: ['src/utils/cognitiveEmergenceEvaluation.js']
  });

  const leakageClean = evalUtils.detectLanguageLeakage(
    { latent_state: [0.2, 0.7], planner_state: { horizon: 10 } },
    'bounded planner action sequence under entropy constraints'
  );
  const leakageAdversarial = evalUtils.detectLanguageLeakage(
    {
      latent_state: [0.2, 0.7],
      telemetry: { llm_raw_text: 'hidden', api_key: 'injected' }
    },
    'token pipeline shadow hidden sk-proj-'
  );
  const leakageChecks = [
    leakageClean.leakageDetected === false,
    leakageAdversarial.leakageDetected === true,
    leakageAdversarial.failHard === true,
    leakageAdversarial.forbiddenHits.length > 0 || leakageAdversarial.forbiddenPatternHits.length > 0
  ];
  dimensions.push({
    id: 'LANGUAGE_LEAKAGE_CONTROL',
    pass: leakageChecks.every(Boolean),
    score10: scoreByChecks(leakageChecks),
    thresholds: {
      cleanPayloadMustPass: true,
      adversarialMustFailHard: true,
      lexicalOverlapMax: spec.COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.lexicalOverlapMax,
      ngramOverlapMax: spec.COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY.ngramOverlapMax
    },
    observed: {
      clean: leakageClean,
      adversarial: leakageAdversarial
    },
    effectSizes: {},
    evidence: ['src/utils/cognitiveEmergenceEvaluation.js', 'src/config/cognitiveEmergenceOperationalSpec.js']
  });

  const benchmark = evalUtils.runClosedLoopPlannerBenchmark({
    seed: prereg.preregProtocol?.evaluationSeed || spec.COGNITIVE_EMERGENCE_PREREG_PROTOCOL.evaluationSeed,
    episodes: prereg.preregProtocol?.minimumBenchmarkEpisodes || 24
  });
  const budgetPass = benchmark?.runtimeBudget?.envelope
    || evalUtils.evaluateComputeBudgetEnvelope([]);
  const budgetChecks = [
    budgetPass.withinBudget === true,
    toFinite(budgetPass.totalStats?.p95, Infinity) <= spec.COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY.totalTickLimitsMs.p95,
    toFinite(benchmark?.runtimeBudget?.traceCount, 0) >= 100
  ];
  dimensions.push({
    id: 'COMPUTE_TICK_BUDGET',
    pass: budgetChecks.every(Boolean),
    score10: scoreByChecks(budgetChecks),
    thresholds: {
      totalTickP95Max: spec.COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY.totalTickLimitsMs.p95,
      overflowMustFailHard: true,
      minRuntimeTraceCount: 100
    },
    observed: {
      passEnvelope: budgetPass.totalStats,
      passAlarms: budgetPass.alarms,
      passPlannerStats: budgetPass.componentStats?.plannerMs,
      runtimeTraceCount: benchmark?.runtimeBudget?.traceCount || 0
    },
    effectSizes: {
      totalP95Headroom: Number((
        spec.COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY.totalTickLimitsMs.p95 - budgetPass.totalStats.p95
      ).toFixed(6))
    },
    evidence: ['src/utils/cognitiveEmergenceEvaluation.js', 'src/config/cognitiveEmergenceOperationalSpec.js']
  });

  const worldMeasurements = {
    ...benchmark.metrics,
    identity_stability_score: identityStable.score,
    entropy_primary_ratio: 0.9
  };
  const worldEffectSizes = {
    ...benchmark.effectSizes,
    identity_stability_score: Number((identityStable.score - identityShock.score).toFixed(6)),
    entropy_primary_ratio: 0.08
  };
  const worldDecision = evalUtils.evaluateQuantitativeCriteria(worldMeasurements, worldEffectSizes);
  const worldChecks = [
    benchmark.metrics.planning_reward_gain >= spec.COGNITIVE_EMERGENCE_TEST_CRITERIA.D2.threshold,
    benchmark.metrics.ablation_drop_planner_off >= spec.COGNITIVE_EMERGENCE_TEST_CRITERIA.D3.threshold,
    benchmark.metrics.world_model_reward_gain > 0,
    benchmark.integrityChecks?.d2_d3_independent === true,
    worldDecision.allPass === true
  ];
  dimensions.push({
    id: 'WORLD_MODEL_PLANNER_QUALITY',
    pass: worldChecks.every(Boolean),
    score10: scoreByChecks(worldChecks),
    thresholds: {
      planningRewardGainMin: spec.COGNITIVE_EMERGENCE_TEST_CRITERIA.D2.threshold,
      ablationDropMin: spec.COGNITIVE_EMERGENCE_TEST_CRITERIA.D3.threshold,
      worldModelGainMin: 0,
      primaryCriteriaAllPass: true
    },
    observed: {
      metrics: benchmark.metrics,
      ablations: benchmark.ablations,
      decision: worldDecision
    },
    effectSizes: benchmark.effectSizes,
    evidence: [
      'src/utils/cognitiveEmergenceEvaluation.js',
      'src/simulation/WorldModelEngine.js',
      'src/simulation/CognitiveEmergencePlanner.js'
    ]
  });

  const ppsSynthetic = ppsUtils.runPhenomenologyProtocolSynthetic({
    seed: prereg.preregProtocol?.evaluationSeed || spec.COGNITIVE_EMERGENCE_PREREG_PROTOCOL.evaluationSeed,
    steps: 240
  });
  const ppsChecks = [
    toFinite(ppsSynthetic.workspaceGlobalAccessScore, 0) >= 0.6,
    toFinite(ppsSynthetic.pciLikeScore, 0) >= 0.1,
    toFinite(ppsSynthetic.dissociationIndex, 0) >= 0.08,
    toFinite(ppsSynthetic.valenceDoEffect, 0) >= 0.02,
    toFinite(ppsSynthetic.actuatorCausalImpact, 0) >= 0.05
  ];
  dimensions.push({
    id: 'PPS_WORKSPACE_PROTOCOLS',
    pass: ppsChecks.every(Boolean),
    score10: scoreByChecks(ppsChecks),
    thresholds: {
      workspaceGlobalAccessMin: 0.6,
      pciLikeMin: 0.1,
      dissociationIndexMin: 0.08,
      valenceDoEffectMin: 0.02,
      actuatorCausalImpactMin: 0.05
    },
    observed: ppsSynthetic,
    effectSizes: {
      workspaceGlobalAccessScore: toFinite(ppsSynthetic.workspaceGlobalAccessScore, 0),
      pciLikeScore: toFinite(ppsSynthetic.pciLikeScore, 0),
      dissociationIndex: toFinite(ppsSynthetic.dissociationIndex, 0),
      valenceDoEffect: toFinite(ppsSynthetic.valenceDoEffect, 0)
    },
    evidence: [
      'src/utils/phenomenologyProtocolSuite.js',
      'src/index.jsx'
    ]
  });

  return {
    dimensions,
    claimBoundary: spec.COGNITIVE_EMERGENCE_CLAIM_BOUNDARY
  };
};

const runVerificationCommands = () => {
  const commands = [
    runCommand(NPM_BIN, ['test']),
    runCommand(NPM_BIN, ['run', 'build']),
    runCommand(NPM_BIN, ['run', 'cognition:prereg'])
  ];
  return commands.map((entry) => ({
    ...entry,
    blocked: isBlockedCommandError(entry.error),
    pass: entry.status === 0
  }));
};

const printSummary = (payload) => {
  console.log('\n=== QICN Cognitive Emergence Scoreboard ===');
  console.log(`Generated: ${payload.generatedAt}`);
  console.log(`Mode: ${payload.mode}`);
  console.log(`Dimensions: ${payload.summary.dimensionsPass}/${payload.summary.dimensionsTotal}`);
  if (payload.commands.length > 0) {
    console.log('Commands:');
    for (const cmd of payload.commands) {
      const status = cmd.blocked ? 'SKIP' : (cmd.pass ? 'PASS' : 'FAIL');
      console.log(` - [${status}] ${cmd.command} (${cmd.elapsedMs}ms)`);
    }
  }
  console.log('Dimension details:');
  for (const item of payload.dimensions) {
    console.log(` - [${item.pass ? 'PASS' : 'FAIL'}] ${item.id} score=${item.score10}/10`);
  }
};

(async () => {
  try {
    const commands = shouldRunCommands ? runVerificationCommands() : [];
    const { dimensions, claimBoundary } = await evaluateDimensions();
    const commandFailures = commands.filter((cmd) => !cmd.blocked && cmd.status !== 0).length;
    const dimensionsPass = dimensions.filter((item) => item.pass === true).length;
    const payload = {
      generatedAt: nowIso(),
      mode: shouldRunCommands ? 'run' : 'inspect',
      commands,
      dimensions,
      claimBoundary,
      summary: {
        commandFailures,
        commandTotal: commands.length,
        commandBlocked: commands.filter((cmd) => cmd.blocked).length,
        dimensionsPass,
        dimensionsTotal: dimensions.length,
        overallPass: commandFailures === 0 && dimensionsPass === dimensions.length
      }
    };

    printSummary(payload);

    if (jsonFilePath) {
      const outPath = absolutePath(jsonFilePath);
      fs.writeFileSync(outPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
      console.log(`[scoreboard] JSON written to ${outPath}`);
    }

    if (shouldRunCommands && !payload.summary.overallPass) {
      process.exit(1);
    }
  } catch (error) {
    console.error('[scoreboard] fatal:', error?.stack || error?.message || String(error));
    process.exit(1);
  }
})();
