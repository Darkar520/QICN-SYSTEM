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
