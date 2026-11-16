#!/usr/bin/env node
// Preregistered Historical Dependence & Negative-Control Ablation (DTS-PVS).
// Reuses the canonical full-cycle worker (useSimulationCycle + Persistence v3)
// across all 5 preregistered seeds [11, 23, 37, 41, 53], reporting raw per-seed
// outcomes without exclusions and evaluating CN-1..CN-4.
//
// Usage: node scripts/run-historical-dependence-ablation.mjs [--warmup=420] [--eval=180]
//        [--seeds=11,23,37,41,53] [--nodes=250] [--out="$env:TEMP\qicn-hist-dep.json"]
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...r] = a.replace(/^--/, '').split('=');
  return [k, r.length ? r.join('=') : 'true'];
}));

const WARMUP = Number(args.warmup || 420);
const EVAL_TICKS = Number(args.eval || 180);
const SEEDS = String(args.seeds || '11,23,37,41,53').split(',').map(Number).filter(Number.isFinite);
const NODES = Number(args.nodes || 250);
const OUT = args.out || path.join(os.tmpdir(), 'qicn_historical_dependence_ablation.json');
const WORKER = path.resolve('scripts/run-full-cycle-language-ablation.mjs');
const MARK = '@@QICN_RESULT@@';

const runWorker = (extraArgs) => {
  const r = spawnSync(
    process.execPath,
    ['--import', './tests/lib/headless-register.mjs', WORKER, '--worker', ...extraArgs],
    { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 256 * 1024 * 1024, timeout: 20 * 60 * 1000 }
  );
  const line = String(r.stdout || '').split('\n').find((l) => l.startsWith(MARK));
  if (!line) {
    throw new Error(`worker failed (exit ${r.status}): ${String(r.stderr || '').slice(-1500)}`);
  }
  const parsed = JSON.parse(line.slice(MARK.length));
  if (parsed.threw) {
    throw new Error(`worker threw: ${parsed.threw.message}\n${parsed.threw.stack || ''}`);
  }
  return parsed;
};

const l2Dist = (a = [], b = []) => {
  const len = Math.max(a.length, b.length);
  let sum = 0;
  for (let i = 0; i < len; i += 1) {
    const d = (Number(a[i]) || 0) - (Number(b[i]) || 0);
    sum += d * d;
  }
  return Math.sqrt(sum);
};

const mean = (xs) => (xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : 0);

const rateDiff = (arrA = [], arrB = []) => {
  const n = Math.min(arrA.length, arrB.length);
  if (n <= 0) return 0;
  let diffs = 0;
  for (let i = 0; i < n; i += 1) {
    if (arrA[i] !== arrB[i]) diffs += 1;
  }
  return diffs / n;
};

const evalViabilityStats = (series = []) => {
  if (!series.length) return { inTubeRate: 0, meanObjectiveScore: 0, actions: [] };
  const inTubeCount = series.filter((p) => p.viabilityInTube === true).length;
  const meanScore = mean(series.map((p) => Number(p.viabilityObjectiveScore) || 0));
  return {
    inTubeRate: inTubeCount / series.length,
    meanObjectiveScore: meanScore,
    actions: series.map((p) => p.viabilityPolicyAction)
  };
};

const started = Date.now();
const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-hist-dep-'));
const rows = [];

try {
  for (const seed of SEEDS) {
    process.stderr.write(`[historical-ablation] seed=${seed}\n`);
    const capMatured = path.join(tmpDir, `matured-${seed}.json`);
    const capYoung = path.join(tmpDir, `young-${seed}.json`);
    const evalExoSeed = seed + 7919;
    const evalRngSeed = seed + 9973;

    // 1. Warmup: Matured instance traversing non-stationary regime shifts
    const maturedWarm = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${WARMUP}`,
      `--nodes=${NODES}`,
      '--exogenous-mode=non_stationary_regime',
      `--exogenous-seed=${seed}`,
      `--capture-at=${WARMUP}`,
      `--capture-out=${capMatured}`
    ]);

    // 2. Young hour-0 instance (brief neutral warmup, zero shock/maturation history)
    const youngWarm = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      '--ticks=12',
      `--nodes=${NODES}`,
      '--exogenous-mode=off',
      '--capture-at=12',
      `--capture-out=${capYoung}`
    ]);

    // Pure zero-history baseline (--plasticity=false) for CN-3 probe identity check
    const naiveZeroWarm = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      '--ticks=12',
      `--nodes=${NODES}`,
      '--exogenous-mode=off',
      '--plasticity=false'
    ]);

    // 3. Paired identical future evaluation under non-stationary regime
    const maturedEval = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${EVAL_TICKS}`,
      `--nodes=${NODES}`,
      `--restore-from=${capMatured}`,
      '--post-restore-exo-mode=non_stationary_regime',
      `--post-restore-exo-seed=${evalExoSeed}`,
      `--eval-rng-seed=${evalRngSeed}`
    ]);

    const youngEval = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${EVAL_TICKS}`,
      `--nodes=${NODES}`,
      `--restore-from=${capYoung}`,
      '--post-restore-exo-mode=non_stationary_regime',
      `--post-restore-exo-seed=${evalExoSeed}`,
      `--eval-rng-seed=${evalRngSeed}`
    ]);

    // 4. CN-3: Erased History (identical instantaneous state to matured, historical trace cleared & kept erased)
    const erasedEval = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${EVAL_TICKS}`,
      `--nodes=${NODES}`,
      `--restore-from=${capMatured}`,
      '--erase-history=true',
      '--plasticity=false',
      '--post-restore-exo-mode=non_stationary_regime',
      `--post-restore-exo-seed=${evalExoSeed}`,
      `--eval-rng-seed=${evalRngSeed}`
    ]);

    // 5. CN-1: Stationary i.i.d. sham noise matched in variance
    const shamWarm = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${WARMUP}`,
      `--nodes=${NODES}`,
      '--exogenous-mode=stationary_iid_sham',
      `--exogenous-seed=${seed ^ 0x2222}`
    ]);

    // 6. CN-2: Frozen predictor & disabled consolidation under non-stationary shock
    const frozenWarm = runWorker([
      '--condition=current',
      `--seed=${seed}`,
      `--ticks=${WARMUP}`,
      `--nodes=${NODES}`,
      '--exogenous-mode=non_stationary_regime',
      `--exogenous-seed=${seed}`,
      '--freeze-weights=true'
    ]);

    const matViab = evalViabilityStats(maturedEval.series);
    const yngViab = evalViabilityStats(youngEval.series);
    const ersViab = evalViabilityStats(erasedEval.series);

    const warmAnchorDist = l2Dist(
      maturedWarm.final.consolidatedAnchorVector,
      youngWarm.final.consolidatedAnchorVector
    );
    const warmProbeActionDiv = rateDiff(
      maturedWarm.final.probeDecisions,
      youngWarm.final.probeDecisions
    );
    const evalSeriesActionDiv = rateDiff(matViab.actions, yngViab.actions);
    const erasedVsYoungProbeDiv = rateDiff(
      erasedEval.final.probeDecisions,
      youngWarm.final.probeDecisions
    );
    const erasedVsNaiveZeroProbeDiv = rateDiff(
      erasedEval.final.probeDecisions,
      naiveZeroWarm.final.probeDecisions
    );
    const deltaInTubeRate = matViab.inTubeRate - yngViab.inTubeRate;
    const deltaObjectiveScore = matViab.meanObjectiveScore - yngViab.meanObjectiveScore;
    const deltaErasedInTubeRate = matViab.inTubeRate - ersViab.inTubeRate;

    const varNonStat = Number(maturedWarm.final.exogenous?.empiricalVariance || 0);
    const varSham = Number(shamWarm.final.exogenous?.empiricalVariance || 0);
    const shamVarRatio = varNonStat > 1e-6 ? (varSham / varNonStat) : 0;

    rows.push({
      seed,
      warmup: {
        maturedMaturationIndex: maturedWarm.final.plasticity?.maturationIndex ?? 0,
        maturedSurprisalEma: maturedWarm.final.plasticity?.surprisalEma ?? 0,
        maturedSealedCommits: maturedWarm.final.plasticity?.sealedCommitCount ?? 0,
        maturedVerifiedPredictions: maturedWarm.final.plasticity?.verifiedPredictionCount ?? 0,
        maturedUnforeseenEvents: maturedWarm.final.plasticity?.unforeseenEventCount ?? 0,
        maturedTamperViolations: maturedWarm.final.plasticity?.tamperViolationCount ?? 0,
        maturedEngrams: maturedWarm.final.engramCount ?? 0,
        maturedExogenousTransitions: maturedWarm.final.exogenous?.regimeTransitions ?? 0,
        youngMaturationIndex: youngWarm.final.plasticity?.maturationIndex ?? 0,
        anchorL2Distance: Number(warmAnchorDist.toFixed(6)),
        matchedProbeActionDivergence: Number(warmProbeActionDiv.toFixed(6))
      },
      pairedEvaluation: {
        evalSeriesActionDivergence: Number(evalSeriesActionDiv.toFixed(6)),
        maturedInTubeRate: Number(matViab.inTubeRate.toFixed(6)),
        youngInTubeRate: Number(yngViab.inTubeRate.toFixed(6)),
        deltaInTubeRate: Number(deltaInTubeRate.toFixed(6)),
        maturedObjectiveScore: Number(matViab.meanObjectiveScore.toFixed(6)),
        youngObjectiveScore: Number(yngViab.meanObjectiveScore.toFixed(6)),
        deltaObjectiveScore: Number(deltaObjectiveScore.toFixed(6)),
        maturedEvalSurprisal: maturedEval.final.plasticity?.surprisalEma ?? 0,
        youngEvalSurprisal: youngEval.final.plasticity?.surprisalEma ?? 0
      },
      negativeControls: {
        cn1_sham: {
          varianceNonStationary: varNonStat,
          varianceSham: varSham,
          varianceRatio: Number(shamVarRatio.toFixed(4)),
          shamRegimeTransitions: shamWarm.final.exogenous?.regimeTransitions ?? 0,
          shamEngrams: shamWarm.final.engramCount ?? 0,
          shamMaturationIndex: shamWarm.final.plasticity?.maturationIndex ?? 0,
          shamHorizon5Mae: shamWarm.final.plasticity?.sealedHorizonMae5 ?? -1,
          nonStatHorizon5Mae: maturedWarm.final.plasticity?.sealedHorizonMae5 ?? -1
        },
        cn2_frozen: {
          maturationIndex: frozenWarm.final.plasticity?.maturationIndex ?? 0,
          anchorShiftL2: frozenWarm.final.plasticity?.anchorShiftL2 ?? 0,
          meanFisherStiffness: frozenWarm.final.plasticity?.meanFisherStiffness ?? 0,
          trainingSteps: frozenWarm.final.plasticity?.verifiedPredictionCount ?? 0
        },
        cn3_erased: {
          erasedInTubeRate: Number(ersViab.inTubeRate.toFixed(6)),
          deltaMaturedMinusErased: Number(deltaErasedInTubeRate.toFixed(6)),
          erasedActionDivergenceVsMatured: Number(rateDiff(matViab.actions, ersViab.actions).toFixed(6)),
          erasedVsNaiveZeroProbeDivergence: Number(erasedVsNaiveZeroProbeDiv.toFixed(6)),
          erasedVsYoungProbeDivergence: Number(erasedVsYoungProbeDiv.toFixed(6))
        }
      }
    });
  }

  // CN-4: Language decoupling under non-stationary regime + active plasticity
  const cn4Seed = SEEDS[0];
  const cn4Base = runWorker([
    '--condition=current',
    `--seed=${cn4Seed}`,
    '--ticks=80',
    `--nodes=${NODES}`,
    '--exogenous-mode=non_stationary_regime',
    `--exogenous-seed=${cn4Seed}`
  ]);
  const cn4Lang = runWorker([
    '--condition=language_local',
    `--seed=${cn4Seed}`,
    '--ticks=80',
    `--nodes=${NODES}`,
    '--exogenous-mode=non_stationary_regime',
    `--exogenous-seed=${cn4Seed}`
  ]);
  let cn4MaxDiff = 0;
  for (let i = 0; i < Math.min(cn4Base.series.length, cn4Lang.series.length); i += 1) {
    for (const k of ['ccc', 'pmia', 'omega', 'x_n', 'maturationIndex', 'surprisalEma', 'sealedCommits', 'viabilityObjectiveScore']) {
      cn4MaxDiff = Math.max(cn4MaxDiff, Math.abs((cn4Base.series[i][k] || 0) - (cn4Lang.series[i][k] || 0)));
    }
    if (cn4Base.series[i].viabilityPolicyAction !== cn4Lang.series[i].viabilityPolicyAction) cn4MaxDiff += 1;
  }

  const seedsMeetingActionDiv = rows.filter((r) => Math.max(r.warmup.matchedProbeActionDivergence, r.pairedEvaluation.evalSeriesActionDivergence) >= 0.20).length;
  const seedsMeetingAnchorShift = rows.filter((r) => r.warmup.anchorL2Distance >= 0.08).length;
  const seedsMeetingViabGain = rows.filter((r) => (r.pairedEvaluation.deltaInTubeRate >= 0.03) || (r.pairedEvaluation.deltaObjectiveScore >= 0.03)).length;
  const cn1Pass = rows.every((r) => r.negativeControls.cn1_sham.varianceRatio >= 0.65 && r.negativeControls.cn1_sham.varianceRatio <= 1.5 && r.negativeControls.cn1_sham.shamRegimeTransitions === 0);
  const cn2Pass = rows.every((r) => r.negativeControls.cn2_frozen.maturationIndex === 0 && r.negativeControls.cn2_frozen.anchorShiftL2 === 0 && r.negativeControls.cn2_frozen.meanFisherStiffness === 0);
  const cn3SeedsAdvantage = rows.filter((r) => r.negativeControls.cn3_erased.deltaMaturedMinusErased >= 0.03).length;
  const cn3SeedsActionDiv = rows.filter((r) => r.negativeControls.cn3_erased.erasedActionDivergenceVsMatured >= 0.20).length;
  const cn3Pass = cn3SeedsAdvantage >= 4
    && cn3SeedsActionDiv >= 4
    && rows.every((r) => r.negativeControls.cn3_erased.erasedVsNaiveZeroProbeDivergence === 0);
  const cn4Pass = cn4MaxDiff === 0 && cn4Lang.language?.turns > 0;

  const summary = {
    schema: 'qicn.historical_dependence_ablation.v1',
    generatedAt: new Date().toISOString(),
    evidenceScope: 'internal_support_only',
    boundary: 'Controlled internal ablation over full useSimulationCycle with non-circular objective operational viability bounds, SHA-256 pre-outcome sealed predictions, and mandatory negative controls (CN-1..CN-4). Not external validation or proof of phenomenal consciousness.',
    parameters: { warmupTicks: WARMUP, evalTicks: EVAL_TICKS, seeds: SEEDS, nodes: NODES },
    preregisteredAcceptance: {
      actionDivergenceMin: 0.20,
      anchorL2Min: 0.08,
      deltaViabilityMin: 0.03,
      requiredSeedsMin: 4,
      totalSeeds: SEEDS.length,
      observed: {
        seedsMeetingActionDiv,
        seedsMeetingAnchorShift,
        seedsMeetingViabGain,
        meanEvalActionDivergence: Number(mean(rows.map((r) => r.pairedEvaluation.evalSeriesActionDivergence)).toFixed(6)),
        meanProbeActionDivergence: Number(mean(rows.map((r) => r.warmup.matchedProbeActionDivergence)).toFixed(6)),
        meanAnchorL2Distance: Number(mean(rows.map((r) => r.warmup.anchorL2Distance)).toFixed(6)),
        meanDeltaInTubeRate: Number(mean(rows.map((r) => r.pairedEvaluation.deltaInTubeRate)).toFixed(6)),
        meanDeltaObjectiveScore: Number(mean(rows.map((r) => r.pairedEvaluation.deltaObjectiveScore)).toFixed(6))
      }
    },
    negativeControlsPass: {
      cn1_stationary_sham: cn1Pass,
      cn2_frozen_predictor: cn2Pass,
      cn3_erased_history: cn3Pass,
      cn4_language_decoupling: cn4Pass,
      cn4_maxAbsDiff: cn4MaxDiff
    },
    allPreregisteredCriteriaPass:
      seedsMeetingActionDiv >= 4
      && seedsMeetingAnchorShift >= 4
      && seedsMeetingViabGain >= 4
      && cn1Pass && cn2Pass && cn3Pass && cn4Pass,
    rows,
    wallMs: Date.now() - started
  };

  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(summary, null, 2)}\n`);
  console.log(JSON.stringify({ out: OUT, allPreregisteredCriteriaPass: summary.allPreregisteredCriteriaPass, preregisteredAcceptance: summary.preregisteredAcceptance, negativeControlsPass: summary.negativeControlsPass, wallMs: summary.wallMs }, null, 2));
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
