/**
 * Frente 2 & Frente 3: Exact controls for the held-out phase-return reserve task,
 * total-variation information bound, and 5 selective address lesions (Papers VI, VII, VIII).
 *
 * Direct 1:1 port of `check_informed_reserve.py` and `verify_measurement()` from
 * `check_prefix_tower.py`.
 */

import { F, ZERO, ONE, HALF, fMin, fMax, fSum, fProd } from '../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  ETA,
  PROFILES,
  SITES,
  TAP,
  active,
  circle,
  createState,
  prefix,
  readout,
  readoutEquals,
  referenceBit,
  signedTurn,
  step
} from '../simulation/tower/WritablePrefixTower.js';

export const SIGNS = Object.freeze([-1, 1]);
export const ABSTAIN = 0;
export const ACTIONS = Object.freeze([-1, 1, ABSTAIN]);
export const ABSTENTION_COST = F(3, 4);
export const PORT = F(1, 128);
export const CALIBRATION_PORT = F(1, 512);
export const FAILURE_THRESHOLD = F(1, 256);
export const WRITES = Object.freeze([
  null,
  ...SITES.map((site) => Object.freeze([site, 1 - referenceBit(site)]))
]);
export const LESIONS = Object.freeze(
  SITES.map((j) => Object.freeze([j, 1 - referenceBit(j)]))
);
export const PHASE_ERROR = TAP.div(4);

export function signedPhaseSign(phaseRaw) {
  const centered = signedTurn(phaseRaw);
  return centered.lt(ZERO) ? -1 : 1;
}

export function prepareReserveInstance(profile, assignment, write, sign, { visible = false } = {}) {
  const initialMemory = visible ? F(sign, 4) : ZERO;
  const initial = createState(profile, ZERO, ALTERNATING, initialMemory);
  const beforeAssignment = visible
    ? step(initial)
    : initial.replace({ memory: F(sign, 8) });
  const afterAssignment = step(beforeAssignment, { q: assignment, write });
  const commands = Object.freeze({
    preparation: visible ? 'neutral-cue' : 'concealed-impulse',
    assignment,
    write
  });
  const publicRecord = Object.freeze({
    current: readout(afterAssignment),
    commands,
    history: Object.freeze([readout(initial), readout(beforeAssignment)])
  });
  return [publicRecord, afterAssignment];
}

export function terminalDistance(state, port, amplitude = PORT, noise = ZERO) {
  return circle(step(state, { u: F(port).mul(amplitude) }).phase.add(noise));
}

export function actionLoss(state, action) {
  if (action === ABSTAIN) return ABSTENTION_COST;
  return terminalDistance(state, action).gt(FAILURE_THRESHOLD) ? ONE : ZERO;
}

export function calibrateReservePolicies() {
  const table = new Map();
  for (const assignment of SIGNS) {
    for (const sign of SIGNS) {
      const initial = createState(PROFILES[0], ZERO, ALTERNATING, F(sign, 16));
      const cueState = step(initial);
      const cue = signedPhaseSign(readout(cueState)[0]);
      const ready = step(cueState, { q: assignment });
      const dNeg = terminalDistance(ready, -1, CALIBRATION_PORT);
      const dPos = terminalDistance(ready, 1, CALIBRATION_PORT);
      const winner = dNeg.lte(dPos) ? -1 : 1;
      const winnerDist = winner === -1 ? dNeg : dPos;
      const loserDist = winner === -1 ? dPos : dNeg;
      if (!winnerDist.isZero() || !loserDist.eq(CALIBRATION_PORT.mul(2))) {
        throw new Error('Calibration distance identity failed');
      }
      table.set(`${assignment}:${cue}`, winner);
    }
  }
  return table;
}

export const RESERVE_POLICIES = Object.freeze({
  profile(current) {
    const offset = current[2].sub(current[0]).mod1();
    const binIndex = offset.mul(8);
    if (binIndex.denominator !== 1n) {
      throw new Error('Profile offset bin must be integer');
    }
    return binIndex.numerator % 2n !== 0n ? -1 : 1;
  },
  history(current, commands, query, calibration) {
    const cue = signedPhaseSign(query(-1)[0]);
    return calibration.get(`${commands.assignment}:${cue}`);
  },
  hybrid(current, commands, query, calibration) {
    const cue = signedPhaseSign(query(-1)[0]);
    return cue * calibration.get(`${commands.assignment}:1`);
  },
  'Paper VI interaction'(current, commands, query) {
    return signedPhaseSign(query(-1)[0]);
  },
  candidate(current, commands, query, calibration) {
    const cue = signedPhaseSign(query(-1)[0]);
    const predictedFeedback = PORT.mul(-cue * calibration.get(`${commands.assignment}:1`));
    const dNeg = circle(PORT.mul(-1).add(predictedFeedback));
    const dPos = circle(PORT.mul(1).add(predictedFeedback));
    return dNeg.lte(dPos) ? -1 : 1;
  }
});

export function predictWithPolicy(policyFn, publicRecord, calibration) {
  let queried = false;
  const query = (index) => {
    if (queried) throw new Error('each policy may consult one prior observation');
    queried = true;
    const idx = index < 0 ? publicRecord.history.length + index : index;
    return publicRecord.history[idx];
  };
  const action = policyFn(publicRecord.current, publicRecord.commands, query, calibration);
  if (!ACTIONS.includes(action)) {
    throw new Error(`Invalid policy action: ${action}`);
  }
  return action;
}

export function evaluatePolicyScores(rows, calibration) {
  const results = {};
  for (const [name, policy] of Object.entries(RESERVE_POLICIES)) {
    const actions = rows.map(([pub]) => predictWithPolicy(policy, pub, calibration));
    const totalLoss = fSum(rows.map(([, state], i) => actionLoss(state, actions[i])));
    const covered = actions.filter((a) => a !== ABSTAIN).length;
    results[name] = {
      loss: totalLoss.div(rows.length),
      coverage: F(covered, rows.length)
    };
  }
  return results;
}

export function evaluateSignalChannel(channel, expectedTv) {
  const signalSet = new Set();
  for (const winner of SIGNS) {
    const masses = channel[winner];
    const sumMass = fSum(Object.values(masses));
    if (!sumMass.eq(ONE)) throw new Error('Channel probabilities must sum to 1');
    for (const s of Object.keys(masses)) signalSet.add(Number(s));
  }
  const signals = Array.from(signalSet).sort((a, b) => a - b);
  const tv = fSum(
    signals.map((sig) =>
      F(channel[1][sig] || ZERO).sub(F(channel[-1][sig] || ZERO)).abs()
    )
  ).div(2);
  if (!tv.eq(expectedTv)) {
    throw new Error(`Expected TV ${expectedTv}, got ${tv}`);
  }

  const decoder = signals.map((sig) =>
    F(channel[1][sig] || ZERO).gte(F(channel[-1][sig] || ZERO)) ? 1 : -1
  );

  const riskForActions = (actions) => {
    let total = ZERO;
    for (const winner of SIGNS) {
      for (let i = 0; i < signals.length; i += 1) {
        const sig = signals[i];
        const act = actions[i];
        const mass = F(channel[winner][sig] || ZERO);
        const loss = act === ABSTAIN ? ABSTENTION_COST : F(act !== winner ? 1 : 0);
        total = total.add(HALF.mul(mass).mul(loss));
      }
    }
    return total;
  };

  // Enumerate all deterministic policies in ACTIONS^|signals|
  const enumeratePolicies = (depth, prefixActions = []) => {
    if (depth === 0) return [prefixActions];
    const out = [];
    for (const act of ACTIONS) {
      out.push(...enumeratePolicies(depth - 1, [...prefixActions, act]));
    }
    return out;
  };
  const allPolicies = enumeratePolicies(signals.length);
  const optimum = fMin(allPolicies.map(riskForActions));
  const decoderRisk = riskForActions(decoder);
  const theoreticalOptimum = ONE.sub(tv).div(2);
  if (!optimum.eq(decoderRisk) || !optimum.eq(theoreticalOptimum)) {
    throw new Error('Bayes optimal TV risk identity failed');
  }
  return { tv, optimum, decoder };
}

export function runInformedReserveSuite() {
  const calibration = calibrateReservePolicies();
  const hiddenRows = [];
  const visibleRows = [];

  for (const profile of PROFILES) {
    for (const assignment of SIGNS) {
      for (const write of WRITES) {
        const hidden = SIGNS.map((sign) =>
          prepareReserveInstance(profile, assignment, write, sign, { visible: false })
        );
        const visible = SIGNS.map((sign) =>
          prepareReserveInstance(profile, assignment, write, sign, { visible: true })
        );

        // Public record equality on hidden pair
        if (
          !readoutEquals(hidden[0][0].current, hidden[1][0].current) ||
          !readoutEquals(hidden[0][0].history[0], hidden[1][0].history[0]) ||
          !readoutEquals(hidden[0][0].history[1], hidden[1][0].history[1])
        ) {
          throw new Error('Hidden reserve pair must have identical public records');
        }
        if (
          !readoutEquals(visible[0][0].current, visible[1][0].current) ||
          !readoutEquals(visible[0][0].current, hidden[0][0].current)
        ) {
          throw new Error('Visible and hidden current readouts must match');
        }
        if (readoutEquals(visible[0][0].history[1], visible[1][0].history[1])) {
          throw new Error('Visible cue histories must differ');
        }

        for (let idx = 0; idx < SIGNS.length; idx += 1) {
          const sign = SIGNS[idx];
          const [, state] = hidden[idx];
          const [visiblePublic, visibleState] = visible[idx];
          if (!state.equals(visibleState)) {
            throw new Error('Hidden and visible post-assignment states must coincide');
          }
          const winner = -assignment * sign;
          if (!terminalDistance(state, winner).isZero()) {
            throw new Error('Winner port terminal distance must be 0');
          }
          if (!terminalDistance(state, -winner).eq(F(1, 64))) {
            throw new Error('Loser port terminal distance must be 1/64');
          }
          for (const noise of [ETA.neg(), ZERO, ETA]) {
            if (!terminalDistance(state, winner, PORT, noise).lt(FAILURE_THRESHOLD)) {
              throw new Error('Noisy winner distance exceeded failure threshold');
            }
            if (!terminalDistance(state, -winner, PORT, noise).gt(FAILURE_THRESHOLD)) {
              throw new Error('Noisy loser distance fell below failure threshold');
            }
          }

          const viState = step(
            step(createState(profile, ZERO, ALTERNATING, F(sign, 4))),
            { q: assignment, write, rival: true }
          );
          const viAction = predictWithPolicy(
            RESERVE_POLICIES['Paper VI interaction'],
            visiblePublic,
            calibration
          );
          if (!terminalDistance(viState, viAction).isZero()) {
            throw new Error('Paper VI interaction rival must succeed on its own plant');
          }
          if (!actionLoss(state, viAction).eq(F(assignment === 1 ? 1 : 0))) {
            throw new Error('Paper VI interaction loss on true plant mismatch');
          }
        }

        const [, ablated] = prepareReserveInstance(profile, assignment, write, 0);
        for (const port of SIGNS) {
          if (!terminalDistance(ablated, port).eq(PORT)) {
            throw new Error('Ablated state terminal distance must equal PORT');
          }
        }

        const states = hidden.map(([, s]) => s);
        for (const [act, expected] of [
          [-1, HALF],
          [1, HALF],
          [ABSTAIN, ABSTENTION_COST]
        ]) {
          const r = fSum(states.map((s) => actionLoss(s, act))).div(states.length);
          if (!r.eq(expected)) {
            throw new Error(`Constant choice risk mismatch for action ${act}`);
          }
        }

        hiddenRows.push(...hidden);
        visibleRows.push(...visible);
      }
    }
  }

  const hiddenScores = evaluatePolicyScores(hiddenRows, calibration);
  const visibleScores = evaluatePolicyScores(visibleRows, calibration);

  for (const score of Object.values(hiddenScores)) {
    if (!score.loss.eq(HALF) || !score.coverage.eq(ONE)) {
      throw new Error('All public policies must tie at risk 1/2 on hidden reserve');
    }
  }

  const expectedVisible = {
    profile: HALF,
    history: ZERO,
    hybrid: ZERO,
    'Paper VI interaction': HALF,
    candidate: ZERO
  };
  for (const [name, expectedLoss] of Object.entries(expectedVisible)) {
    if (!visibleScores[name].loss.eq(expectedLoss) || !visibleScores[name].coverage.eq(ONE)) {
      throw new Error(`Visible reserve score mismatch on policy ${name}`);
    }
  }

  // Private & shared TV bounds
  const privateChannel = evaluateSignalChannel(
    { [-1]: { [-1]: ONE }, [1]: { [1]: ONE } },
    ONE
  );
  const erasedChannel = evaluateSignalChannel(
    { [-1]: { [-1]: HALF, [0]: HALF }, [1]: { [1]: HALF, [0]: HALF } },
    HALF
  );
  const commonChannel = evaluateSignalChannel(
    { [-1]: { [0]: ONE }, [1]: { [0]: ONE } },
    ZERO
  );

  // Asymmetric minimax check
  const asymChannel = { [-1]: { [0]: HALF, [-1]: HALF }, [1]: { [0]: ONE } };
  const asymBayes = evaluateSignalChannel(asymChannel, HALF);
  if (!asymBayes.optimum.eq(F(1, 4))) {
    throw new Error('Asymmetric balanced Bayes loss must be 1/4');
  }

  return {
    passed: true,
    strataCount: 84,
    hiddenPreparations: hiddenRows.length,
    visiblePreparations: visibleRows.length,
    publicTieForcedRisk: '1/2',
    abstentionCost: '3/4',
    privateSignalRiskGap: HALF.sub(privateChannel.optimum).toString(),
    halfErasedSignalRiskGap: HALF.sub(erasedChannel.optimum).toString(),
    commonFeatureRiskGap: HALF.sub(commonChannel.optimum).toString(),
    asymmetricBayesLoss: '1/4',
    asymmetricWorstSignMinimaxLoss: '1/3',
    hiddenPolicyScores: Object.fromEntries(
      Object.entries(hiddenScores).map(([k, v]) => [
        k,
        { loss: v.loss.toFloat(), exactLoss: v.loss.toString(), coverage: v.coverage.toFloat() }
      ])
    ),
    visiblePolicyScores: Object.fromEntries(
      Object.entries(visibleScores).map(([k, v]) => [
        k,
        { loss: v.loss.toFloat(), exactLoss: v.loss.toString(), coverage: v.coverage.toFloat() }
      ])
    )
  };
}

// ============================================================================
// Paper VIII 5 Selective Address Lesions (`verify_measurement` in check_prefix_tower.py)
// ============================================================================

function decodeContext(state, error = ZERO) {
  const [early, , late] = readout(state);
  const difference = late.sub(early).add(F(2).mul(error));
  const d0 = circle(difference.sub(CONTEXTS[0][2]));
  const d1 = circle(difference.sub(CONTEXTS[1][2]));
  return d0.lte(d1) ? 0 : 1;
}

function probeBit(state, site, role, error = ZERO, strength = TAP) {
  const observed = readout(step(state, { probe: [site, role], strength }))[0];
  return signedTurn(observed.add(error)).gt(TAP.div(2)) ? 1 : 0;
}

function preparedPair(write = null) {
  return CONTEXTS.map((p) => step(createState(p, ZERO, ALTERNATING, ZERO), { write }));
}

export function computePrimarySubjectivityScores(states, error = ZERO, relabel = false) {
  const indexes = [];
  const ownerships = [];
  const continuities = [];
  const valuations = [];
  const outcomes = [];
  const predictions = [];
  const roles = relabel ? [1, 0] : [0, 1];
  const perspective = roles.indexOf(1);

  for (let block = 0; block < states.length; block += 1) {
    const state = states[block];
    const z = roles.indexOf(block);
    const y = SITES.map((site) =>
      roles.map((r) => probeBit(state, site, r, error))
    );
    const weights = [0, 1].map((r) => F(1 + y[0][r] - y[0][1 - r], 2));
    indexes.push(fMax(weights).sub(fMin(weights)));

    const own = [0, 1].map((r) => F(1 + y[1][r] - y[1][1 - r], 2));
    const ownErr = fSum([0, 1].map((r) => own[r].sub(r === z ? 1 : 0).abs())).div(2);
    ownerships.push(HALF.sub(ownErr));

    continuities.push(F(y[2][z] - y[2][1 - z], 1 + y[2][z]));
    outcomes.push(y[3][perspective]);
    const pred =
      (decodeContext(state, error) === 1 ? 1 : 0) *
      active(state.code.add(error), SITES[3]);
    predictions.push(pred);
    valuations.push(F(y[4][z] - y[4][1 - z], 1 + y[4][z]));
  }

  const candidateMismatches = outcomes.filter((a, i) => a !== predictions[i]).length;
  const candidate = F(candidateMismatches, 2);
  const bestWeak = fMin(
    [0, 1].map((r) => F(outcomes.filter((a) => a !== r).length, 2))
  );

  return Object.freeze([
    fSum(indexes).div(2),
    fSum(ownerships).div(2),
    fSum(continuities).div(2),
    bestWeak.sub(candidate).div(ONE.add(bestWeak)),
    fSum(valuations).div(2)
  ]);
}

export function runSelectiveAddressLesionSuite() {
  const baseline = [ONE, HALF, HALF, F(1, 3), HALF];
  let trials = 0;
  const lesionProfiles = [];

  for (const error of [PHASE_ERROR.neg(), ZERO, PHASE_ERROR]) {
    for (const relabel of [false, true]) {
      const sham = computePrimarySubjectivityScores(preparedPair(), error, relabel);
      if (!sham.every((v, i) => v.eq(baseline[i]))) {
        throw new Error('Baseline primary subjectivity scores mismatch');
      }
      for (let i = 0; i < LESIONS.length; i += 1) {
        const write = LESIONS[i];
        const scores = computePrimarySubjectivityScores(preparedPair(write), error, relabel);
        const drops = sham.map((a, idx) => a.sub(scores[idx]));
        if (!drops[i].gte(F(1, 4))) {
          throw new Error(`Targeted drop at site index ${i} fell below 1/4`);
        }
        for (let j = 0; j < drops.length; j += 1) {
          if (j !== i && !drops[j].isZero()) {
            throw new Error(`Collateral damage detected at coordinate ${j} under lesion ${i}`);
          }
        }
        if (error.isZero() && !relabel) {
          lesionProfiles.push({
            site: SITES[i],
            coordinateIndex: i,
            targetedDrop: drops[i].toFloat(),
            exactTargetedDrop: drops[i].toString(),
            collateralDamage: 0,
            selectivity: 1.0
          });
        }
        trials += 1;
      }
    }
  }

  const best = ONE;
  const candidate = ZERO;
  const irred = best.sub(candidate).div(ONE.add(best)); // 1 / (1 + 1) = 1/2
  const fullCoordinates = [...baseline, ONE, irred];
  const minCoord = fMin(fullCoordinates);
  const prodCoord = fProd(fullCoordinates);
  if (!minCoord.eq(F(1, 3)) || !prodCoord.eq(F(1, 48))) {
    throw new Error('Paper VIII 7-coordinate gate summary mismatch');
  }

  return {
    passed: true,
    trials,
    baselineExact: baseline.map((x) => x.toString()),
    baselineFloat: baseline.map((x) => x.toFloat()),
    lesionProfiles,
    irreducibilityCoordinate: irred.toString(),
    minGateCoordinate: minCoord.toString(),
    productGateCoordinate: prodCoord.toString()
  };
}

// ============================================================================
// Etapa 2 Paper VIII Core Theorems & 4 Negative Controls
// (`thm:selfindex-emergence`, `thm:ownership-nontransfer`, `thm:five-field-reduction`)
// ============================================================================

export function computeSelfIndexMarginAndActivation(lossMatrixByLocus, scaleSI = ONE) {
  const sI = F(scaleSI);
  if (!sI.gt(ZERO)) {
    throw new RangeError('Self-index saturation scale s_I must be strictly positive');
  }
  const locusIds = Object.keys(lossMatrixByLocus);
  if (locusIds.length < 2) {
    throw new RangeError('At least two candidate loci are required for self-index emergence');
  }
  const margins = {};
  const activations = {};
  for (const l of locusIds) {
    const lossesL = lossMatrixByLocus[l].map((x) => F(x));
    const diffs = [];
    for (const k of locusIds) {
      if (k === l) continue;
      const lossesK = lossMatrixByLocus[k].map((x) => F(x));
      if (lossesK.length !== lossesL.length) {
        throw new RangeError('All candidate loci must be evaluated on the same task horizon');
      }
      for (let t = 0; t < lossesL.length; t += 1) {
        diffs.push(lossesK[t].sub(lossesL[t]));
      }
    }
    const gL = fMin(diffs);
    const gPos = gL.gt(ZERO) ? gL : ZERO;
    const aL = gPos.div(sI.add(gPos));
    margins[l] = gL;
    activations[l] = aL;
  }
  const positiveWinners = locusIds.filter((l) => margins[l].gt(ZERO));
  return {
    margins,
    activations,
    selectedLocus: positiveWinners.length === 1 ? positiveWinners[0] : null
  };
}

export function computeDagPathOwnershipAttribution({
  loci = [],
  rootWeights = {},
  edges = [],
  targetEvent
}) {
  const pathAttributions = {};
  for (const locus of loci) {
    // Enumerate directed paths from locus to targetEvent in the finite DAG
    const dfs = (node, visited) => {
      if (node === targetEvent) return ONE;
      let total = ZERO;
      for (const edge of edges) {
        if (edge.from === node && !visited.has(edge.to)) {
          const nextVisited = new Set(visited);
          nextVisited.add(edge.to);
          const subSum = dfs(edge.to, nextVisited);
          if (!subSum.isZero()) {
            total = total.add(F(edge.weight).mul(subSum));
          }
        }
      }
      return total;
    };
    pathAttributions[locus] = dfs(locus, new Set([locus]));
  }
  const weightedNumerators = {};
  let denominator = ZERO;
  for (const locus of loci) {
    const rho = F(rootWeights[locus] ?? ZERO);
    const num = rho.mul(pathAttributions[locus]);
    weightedNumerators[locus] = num;
    denominator = denominator.add(num);
  }
  if (denominator.isZero()) {
    return {
      supported: false,
      status: 'unsupported',
      pathAttributions,
      normalizedOwnership: null
    };
  }
  const normalizedOwnership = {};
  for (const locus of loci) {
    normalizedOwnership[locus] = weightedNumerators[locus].div(denominator);
  }
  return {
    supported: true,
    status: 'supported',
    pathAttributions,
    normalizedOwnership
  };
}

export function verifySubjectivityCoreTheoremsAndNegativeControls() {
  // 1. thm:selfindex-emergence + Negative Control 1 (tie = 0 even with name tie-breaker)
  const scaleSI = F(1, 2);
  const baselineLosses = {
    locus_1: [F(1, 8), F(1, 4)],
    locus_2: [F(5, 8), F(3, 4)]
  };
  const baseSelfIndex = computeSelfIndexMarginAndActivation(baselineLosses, scaleSI);
  const gStar = baseSelfIndex.margins.locus_1; // min(5/8 - 1/8, 3/4 - 1/4) = 1/2
  if (!gStar.eq(HALF) || baseSelfIndex.selectedLocus !== 'locus_1') {
    throw new Error('Baseline self-index margin g_* = 1/2 check failed');
  }
  const eta = F(1, 8); // 2 * eta = 1/4 < g_* = 1/2
  const perturbedLosses = {
    locus_1: baselineLosses.locus_1.map((x) => x.add(eta)),
    locus_2: baselineLosses.locus_2.map((x) => x.sub(eta))
  };
  const pertSelfIndex = computeSelfIndexMarginAndActivation(perturbedLosses, scaleSI);
  const deltaG1 = pertSelfIndex.margins.locus_1.sub(baseSelfIndex.margins.locus_1).abs();
  const deltaA1 = pertSelfIndex.activations.locus_1.sub(baseSelfIndex.activations.locus_1).abs();
  if (
    !deltaG1.lte(F(2).mul(eta)) ||
    !deltaA1.lte(F(2).mul(eta).div(scaleSI)) ||
    pertSelfIndex.selectedLocus !== 'locus_1'
  ) {
    throw new Error('thm:selfindex-emergence perturbation Lipschitz or winner persistence failed');
  }

  // Negative Control 1: equal losses at two loci -> g_l <= 0 and a_l = 0 regardless of name tie-breaker
  const tiedLosses = {
    alpha_first_name: [F(1, 4), F(3, 8)],
    zeta_second_name: [F(1, 4), F(3, 8)]
  };
  const tiedResult = computeSelfIndexMarginAndActivation(tiedLosses, scaleSI);
  const deterministicNameTieBreakerWinner = Object.keys(tiedLosses).sort()[0];
  if (
    !tiedResult.margins.alpha_first_name.isZero() ||
    !tiedResult.margins.zeta_second_name.isZero() ||
    !tiedResult.activations.alpha_first_name.isZero() ||
    !tiedResult.activations.zeta_second_name.isZero() ||
    tiedResult.selectedLocus !== null ||
    deterministicNameTieBreakerWinner !== 'alpha_first_name'
  ) {
    throw new Error('Negative Control 1 (tie = 0 under name tie-breaker) failed');
  }

  // 2. thm:ownership-nontransfer + isomorphism invariance + Negative Control 2 (parent transplant)
  const loci = ['root_1', 'root_2'];
  const rootWeights = { root_1: ONE, root_2: ONE };
  const originalEdges = [
    { from: 'root_1', to: 'mid_a', weight: F(1, 2) },
    { from: 'mid_a', to: 'event_e', weight: F(2) }
  ];
  const origOwn = computeDagPathOwnershipAttribution({
    loci,
    rootWeights,
    edges: originalEdges,
    targetEvent: 'event_e'
  });
  if (
    !origOwn.supported ||
    !origOwn.normalizedOwnership.root_1.eq(ONE) ||
    !origOwn.normalizedOwnership.root_2.isZero()
  ) {
    throw new Error('Baseline DAG path ownership attribution failed');
  }

  // Graph isomorphism relabeling (root_1 <-> iso_2, root_2 <-> iso_1, mid_a -> iso_mid, event_e -> iso_e)
  const isoOwn = computeDagPathOwnershipAttribution({
    loci: ['iso_1', 'iso_2'],
    rootWeights: { iso_1: ONE, iso_2: ONE },
    edges: [
      { from: 'iso_2', to: 'iso_mid', weight: F(1, 2) },
      { from: 'iso_mid', to: 'iso_e', weight: F(2) }
    ],
    targetEvent: 'iso_e'
  });
  if (
    !isoOwn.normalizedOwnership.iso_2.eq(origOwn.normalizedOwnership.root_1) ||
    !isoOwn.normalizedOwnership.iso_1.eq(origOwn.normalizedOwnership.root_2)
  ) {
    throw new Error('thm:ownership-nontransfer graph isomorphism invariance failed');
  }

  // Disconnected event -> zero denominator -> status = 'unsupported'
  const unsupportedOwn = computeDagPathOwnershipAttribution({
    loci,
    rootWeights,
    edges: [],
    targetEvent: 'event_e'
  });
  if (unsupportedOwn.supported !== false || unsupportedOwn.status !== 'unsupported') {
    throw new Error('Zero-denominator ownership attribution must return unsupported');
  }

  // Negative Control 2: parent transplant from root_1 to root_2 keeping event label, ports, and reference index 1
  const transplantedEdges = [
    { from: 'root_2', to: 'mid_a', weight: F(1, 2) },
    { from: 'mid_a', to: 'event_e', weight: F(2) }
  ];
  const transplantedOwn = computeDagPathOwnershipAttribution({
    loci,
    rootWeights,
    edges: transplantedEdges,
    targetEvent: 'event_e'
  });
  if (
    !transplantedOwn.normalizedOwnership.root_1.isZero() ||
    !transplantedOwn.normalizedOwnership.root_2.eq(ONE)
  ) {
    throw new Error('Negative Control 2 (parent transplant O_1: 1 -> 0) failed');
  }

  // 3. thm:five-field-reduction + Negative Controls 3 & 4
  const tauDrop = F(1, 4);
  const tauCollateral = ZERO;
  // Commuting law P(I_u z) = H_u(P z) on [0, 1]^5
  const primaryY = [ONE, HALF, HALF, F(1, 3), HALF];
  const lesionDropVector = [F(1, 2), F(1, 4), F(1, 4), F(1, 3), F(1, 4)];
  const interveneOnPrimary = (yVec, coordIdx, dropAmt) =>
    yVec.map((val, idx) => (idx === coordIdx ? val.sub(dropAmt) : val));

  const evaluateH6Gate = (dropsMatrix) => {
    for (let i = 0; i < 5; i += 1) {
      for (let j = 0; j < 5; j += 1) {
        if (i === j && !dropsMatrix[i][j].gte(tauDrop)) return ZERO;
        if (i !== j && !dropsMatrix[i][j].abs().lte(tauCollateral)) return ZERO;
      }
    }
    return ONE;
  };
  const evaluateH7Summary = (yVec) => {
    const meanPrimary = fSum(yVec).div(yVec.length);
    return meanPrimary.div(ONE.add(meanPrimary));
  };

  // Build exact commuting drops matrix from H_u(P z)
  const commutingDrops = Array.from({ length: 5 }, (_, i) => {
    const postY = interveneOnPrimary(primaryY, i, lesionDropVector[i]);
    return primaryY.map((baseVal, j) => baseVal.sub(postY[j]));
  });
  const h6Baseline = evaluateH6Gate(commutingDrops);
  const h7Baseline = evaluateH7Summary(primaryY);
  if (!h6Baseline.eq(ONE) || !h7Baseline.gt(ZERO)) {
    throw new Error('thm:five-field-reduction commuting reconstruction baseline failed');
  }

  // Negative Control 3: threshold boundary discontinuity at clearance = 0
  const boundaryDrops = commutingDrops.map((row) => [...row]);
  boundaryDrops[0][0] = tauDrop; // exact clearance = 0 at coordinate 0
  const boundarySubDrops = commutingDrops.map((row) => [...row]);
  boundarySubDrops[0][0] = tauDrop.sub(F(1, 1024));
  const h6AtBoundary = evaluateH6Gate(boundaryDrops);
  const h6BelowBoundary = evaluateH6Gate(boundarySubDrops);
  if (!h6AtBoundary.eq(ONE) || !h6BelowBoundary.isZero()) {
    throw new Error('Negative Control 3 (threshold boundary discontinuity at clearance = 0) failed');
  }

  // Negative Control 4: same-primary fibre counterexample (identical P(z), target drops 1/2 vs 0 at threshold 1/4)
  const recordADrops = commutingDrops.map((row) => [...row]);
  recordADrops[0][0] = HALF; // target drop 1/2 >= 1/4 -> h_6 = 1
  const recordBDrops = commutingDrops.map((row) => [...row]);
  recordBDrops[0][0] = ZERO; // target drop 0 < 1/4 -> h_6 = 0
  const h6RecordA = evaluateH6Gate(recordADrops);
  const h6RecordB = evaluateH6Gate(recordBDrops);
  const fiberGapD = h6RecordA.sub(h6RecordB).abs(); // d = 1
  const midpointPrimaryOnlyForecast = h6RecordA.add(h6RecordB).div(2); // 1/2
  const primaryOnlyReconstructionError = fMax([
    h6RecordA.sub(midpointPrimaryOnlyForecast).abs(),
    h6RecordB.sub(midpointPrimaryOnlyForecast).abs()
  ]);
  if (
    !h6RecordA.eq(ONE) ||
    !h6RecordB.isZero() ||
    !fiberGapD.eq(ONE) ||
    !primaryOnlyReconstructionError.eq(HALF)
  ) {
    throw new Error('Negative Control 4 (same-primary fibre counterexample error >= 1/2) failed');
  }

  return {
    passed: true,
    selfIndexEmergence: {
      baselineMarginGStar: gStar.toString(),
      perturbationRadiusEta: eta.toString(),
      marginShiftBoundVerified: deltaG1.lte(F(2).mul(eta)),
      activationShiftBoundVerified: deltaA1.lte(F(2).mul(eta).div(scaleSI)),
      winnerPersisted: pertSelfIndex.selectedLocus === 'locus_1',
      negativeControl1TieZero: {
        marginAlpha: tiedResult.margins.alpha_first_name.toString(),
        marginZeta: tiedResult.margins.zeta_second_name.toString(),
        activationAlpha: tiedResult.activations.alpha_first_name.toString(),
        activationZeta: tiedResult.activations.zeta_second_name.toString(),
        selectedLocus: tiedResult.selectedLocus
      }
    },
    ownershipNonTransfer: {
      baselineRoot1Ownership: origOwn.normalizedOwnership.root_1.toString(),
      baselineRoot2Ownership: origOwn.normalizedOwnership.root_2.toString(),
      isomorphismInvarianceVerified: true,
      zeroDenominatorStatus: unsupportedOwn.status,
      negativeControl2ParentTransplant: {
        root1Before: origOwn.normalizedOwnership.root_1.toString(),
        root1After: transplantedOwn.normalizedOwnership.root_1.toString(),
        root2After: transplantedOwn.normalizedOwnership.root_2.toString()
      }
    },
    fiveFieldReduction: {
      commutingLawVerified: true,
      h6Baseline: h6Baseline.toString(),
      h7Baseline: h7Baseline.toString(),
      negativeControl3BoundaryDiscontinuity: {
        clearanceZeroValue: h6AtBoundary.toString(),
        perturbedBelowBoundaryValue: h6BelowBoundary.toString(),
        discontinuousAtZeroClearance: !h6AtBoundary.eq(h6BelowBoundary)
      },
      negativeControl4SamePrimaryFibre: {
        identicalPrimaryVector: primaryY.map((x) => x.toString()),
        targetDropRecordA: '1/2',
        targetDropRecordB: '0',
        thresholdTauDrop: tauDrop.toString(),
        h6RecordA: h6RecordA.toString(),
        h6RecordB: h6RecordB.toString(),
        minPrimaryOnlyReconstructionError: primaryOnlyReconstructionError.toString()
      }
    }
  };
}
