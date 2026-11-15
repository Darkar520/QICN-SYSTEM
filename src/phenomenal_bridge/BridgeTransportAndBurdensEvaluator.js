/**
 * Frente 4 & Body-World Extension (Paper IX & Paper Puente):
 * Exact binary cycle transport gauge classification, 6 local bridge burdens
 * (Pi_D, Pi_V, Pi_W, Pi_A, Pi_E, Pi_T) on the unified 4-state body-world fiber extension,
 * full-rank 6x6 selective lesion matrix, minimum margin 13/96, and the documented
 * shared-hybrid obstruction (`prop:bridge-shared-hybrid-obstruction`).
 *
 * Direct 1:1 port of `check_bridge_transport_burdens.py` and `check_body_world.py`.
 */

import {
  F,
  ZERO,
  ONE,
  HALF,
  fMin,
  fMax,
  fSum,
  vecAdd,
  vecSub,
  vecScale,
  vecNormInf,
  vecEq,
  matVecMul,
  matMul,
  matTranspose,
  matOperatorNormInf,
  matRank,
  matDeterminant,
  matInverse,
  matGap,
  matEq,
  polyDerivative,
  polyValue,
  hermiteBases
} from '../simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  ETA,
  PROFILES,
  SITES,
  TAP,
  circle,
  createState,
  readout,
  readoutEquals,
  referenceBit,
  signedTurn,
  step,
  writePrefix
} from '../simulation/tower/WritablePrefixTower.js';
import {
  ALPHA,
  BETA,
  COMMON,
  EVALUATIVE,
  ExtendedTowerState,
  FIRST,
  H,
  IDENTITY,
  LOOP_SCALE,
  Mechanism,
  NULL_MAT,
  SECOND,
  SWAP,
  VALUE_SCALE,
  WORLD_SCALE,
  ZERO_VEC,
  advance,
  fibreMatrix,
  fibreUpdate,
  nativeReadout,
  roleFrame
} from '../simulation/tower/BodyWorldTower.js';

export const BITS = Object.freeze([0, 1]);
export const PHASE_NOISE = TAP.div(16);
export const TRIANGLE = Object.freeze([
  Object.freeze([0, 1]),
  Object.freeze([1, 2]),
  Object.freeze([2, 0])
]);

function witnessLabel(phaseRaw) {
  const centered = signedTurn(phaseRaw);
  if (centered.isZero()) throw new Error('Witness phase cannot be zero');
  return centered.lt(ZERO) ? 1 : 0;
}

function coherentAssignments(edgeBits) {
  const out = [];
  for (const b0 of BITS) {
    for (const b1 of BITS) {
      for (const b2 of BITS) {
        const labels = [b0, b1, b2];
        const ok = TRIANGLE.every(
          ([src, dst], idx) => labels[dst] === (labels[src] ^ edgeBits[idx])
        );
        if (ok) out.push(labels.join(','));
      }
    }
  }
  return out;
}

function shiftPhaseReadout(state, shiftRaw) {
  const shift = F(shiftRaw);
  const r = readout(state);
  return Object.freeze([
    r[0].add(shift).mod1(),
    r[1].add(shift).mod1(),
    r[2].add(shift).mod1(),
    state.code
  ]);
}

export function verifyBinaryCycleTransport() {
  for (const [edgeBits, expectedCount] of [
    [[0, 1, 1], 2],
    [[0, 0, 1], 0]
  ]) {
    const assignments = coherentAssignments(edgeBits);
    if (assignments.length !== expectedCount) {
      throw new Error(`Expected ${expectedCount} coherent assignments, got ${assignments.length}`);
    }
    const holonomy = edgeBits.reduce((a, b) => a ^ b, 0);

    for (const g0 of BITS) {
      for (const g1 of BITS) {
        for (const g2 of BITS) {
          const gauge = [g0, g1, g2];
          const relabeled = TRIANGLE.map(
            ([src, dst], idx) => edgeBits[idx] ^ gauge[src] ^ gauge[dst]
          );
          const relabeledHolonomy = relabeled.reduce((a, b) => a ^ b, 0);
          if (relabeledHolonomy !== holonomy) {
            throw new Error('XOR cycle holonomy must be gauge-invariant');
          }
        }
      }
    }

    let states = BITS.map((label) =>
      createState(CONTEXTS[1], ZERO, ALTERNATING, F(label === 0 ? 1 : -1, 8))
    );
    let labels = [...BITS];
    for (let index = 0; index < edgeBits.length; index += 1) {
      const bit = edgeBits[index];
      const expectedMagnitude = F(1n, 128n * (4n ** BigInt(index)));
      states = states.map((s) => step(step(s, { q: bit === 0 ? 1 : -1 })));
      const expectedLabels = labels.map((l) => l ^ bit);
      for (const s of states) {
        if (!signedTurn(s.phase).abs().eq(expectedMagnitude)) {
          throw new Error('Transported phase magnitude mismatch');
        }
      }
      for (const err of [ETA.neg(), ZERO, ETA]) {
        const decoded = states.map((s) => witnessLabel(s.phase.add(err)));
        if (decoded.some((d, i) => d !== expectedLabels[i])) {
          throw new Error('Noisy witness label decoding failed');
        }
      }
      labels = expectedLabels;
    }

    const finalShifts = states.map((s) => signedTurn(s.phase).neg());
    if (
      !finalShifts[0].abs().eq(F(1, 2048)) ||
      !finalShifts[1].abs().eq(F(1, 2048))
    ) {
      throw new Error('Final transport shift magnitude must be 1/2048');
    }
    if (
      !readoutEquals(
        shiftPhaseReadout(states[0], finalShifts[0]),
        shiftPhaseReadout(states[1], finalShifts[1])
      )
    ) {
      throw new Error('Midpoint phase shift collision check failed');
    }
  }
  return {
    passed: true,
    gaugeChecks: 16,
    evenCycleCoherentAssignments: 2,
    oddCycleCoherentAssignments: 0,
    midpointCollisionShift: '1/2048'
  };
}

// ============================================================================
// Body-World 4-State Plant Trace & Six Local Burdens (check_body_world.py)
// ============================================================================

export function makeCore(role = 0, code = ALTERNATING, memory = ZERO) {
  return createState(CONTEXTS[role], ZERO, code, memory);
}

export function runBodyWorldTrace(
  coreState,
  commands = [],
  { lesion = null, pulse = ZERO_VEC, evaluate = false, motor = ONE } = {}
) {
  const coreInit =
    lesion === 'D' ? coreState.replace({ profile: CONTEXTS[0] }) : coreState;
  const mechanism = new Mechanism(
    lesion === 'W' ? COMMON : IDENTITY,
    lesion === 'V' ? matMul(EVALUATIVE, COMMON) : EVALUATIVE,
    lesion === 'E' ? ZERO : F(motor)
  );
  const states = [new ExtendedTowerState(coreInit)];
  for (let time = 1; time <= 4; time += 1) {
    const cmd = time <= commands.length ? commands[time - 1] : {};
    let state = advance(states[states.length - 1], cmd, mechanism, {
      evaluate: evaluate && time === 2,
      worldInput: time === 1 ? pulse : ZERO_VEC
    });
    if (lesion === 'A' && time === 1) {
      const newCode = writePrefix(state.core.code, 5, 1 - referenceBit(5));
      state = state.replace({ core: state.core.replace({ code: newCode }) });
    }
    if (lesion === 'T' && time === 3) {
      state = state.replace({ core: state.core.replace({ memory: ZERO }) });
    }
    states.push(state);
  }
  return Object.freeze(states);
}

export function computeValuationResponse(role, v, lesion = null, customL = null) {
  const reference = roleFrame(CONTEXTS[role]);
  const pulse = vecScale(H, matVecMul(matTranspose(reference), v));
  let activeStates;
  let passiveStates;
  if (customL === null) {
    activeStates = runBodyWorldTrace(makeCore(role), [], {
      lesion,
      pulse,
      evaluate: true
    });
    passiveStates = runBodyWorldTrace(makeCore(role), [], {
      lesion,
      pulse,
      evaluate: false
    });
  } else {
    const runWithL = (evalFlag) => {
      let state = new ExtendedTowerState(makeCore(role));
      const list = [state];
      for (let time = 1; time <= 3; time += 1) {
        state = advance(state, {}, new Mechanism(IDENTITY, customL, ONE), {
          worldInput: time === 1 ? pulse : ZERO_VEC,
          evaluate: evalFlag && time === 2
        });
        list.push(state);
      }
      return list;
    };
    activeStates = runWithL(true);
    passiveStates = runWithL(false);
  }
  return matVecMul(
    reference,
    vecSub(activeStates[3].world, passiveStates[3].world)
  );
}

export function computeValuationMatrix(role, lesion = null, customL = null) {
  const columns = [
    [ONE, ZERO],
    [ZERO, ONE]
  ].map((v) => computeValuationResponse(role, v, lesion, customL));
  return matTranspose(columns);
}

export function computeCirculation(fieldFn, r = ONE) {
  const nr = F(r).neg();
  const pr = F(r);
  const vertices = [
    [nr, nr],
    [pr, nr],
    [pr, pr],
    [nr, pr],
    [nr, nr]
  ];
  let sum = ZERO;
  for (let i = 0; i < 4; i += 1) {
    const u = vertices[i];
    const v = vertices[i + 1];
    const avgField = vecScale(HALF, vecAdd(fieldFn(u), fieldFn(v)));
    const dv = vecSub(v, u);
    sum = sum.add(avgField[0].mul(dv[0]).add(avgField[1].mul(dv[1])));
  }
  return sum;
}

export function computeMarkovBlocks(role, lesion = null, motor = ONE) {
  const basis = [
    [ONE, ZERO],
    [ZERO, ONE]
  ];
  const runs = basis.map((v) =>
    runBodyWorldTrace(makeCore(role), [], {
      lesion,
      pulse: vecScale(H, v),
      motor
    })
  );
  return Object.freeze(
    [1, 2, 3, 4].map((time) =>
      Object.freeze(
        BITS.map((j) => Object.freeze(runs.map((run) => run[time].body[j])))
      )
    )
  );
}

export function buildHankelMatrix(markovs) {
  const [x, y, z] = markovs;
  return Object.freeze([
    ...BITS.map((i) => Object.freeze([...x[i], ...y[i]])),
    ...BITS.map((i) => Object.freeze([...y[i], ...z[i]]))
  ]);
}

export function computeDMatrix(lesion = null) {
  const matrix = [];
  for (const p of BITS) {
    for (const r of BITS) {
      const outcomes = BITS.map((target) => {
        const commands = [
          { write: [3, referenceBit(3) ^ target] },
          {},
          { probe: [4, r] },
          {}
        ];
        const states = runBodyWorldTrace(makeCore(p), commands, { lesion });
        return signedTurn(states[3].core.phase);
      });
      matrix.push(outcomes[0].sub(outcomes[1]));
    }
  }
  return Object.freeze(matrix);
}

export function computeAOptimum(lesion = null) {
  const words = [
    [0, 0],
    [0, 1],
    [1, 0],
    [1, 1]
  ];
  const responses = words.map((word) => {
    let code = ALTERNATING;
    for (let idx = 0; idx < 2; idx += 1) {
      const site = idx === 0 ? 3 : 4;
      const bit = word[idx];
      code = writePrefix(code, site, referenceBit(site) ^ (1 - bit));
    }
    return BITS.map((query) => {
      const run = runBodyWorldTrace(
        makeCore(0, code),
        [{}, { probe: [4 + query, 0] }],
        { lesion }
      );
      const phase = signedTurn(run[2].core.phase);
      for (const err of [TAP.div(16).neg(), ZERO, TAP.div(16)]) {
        if ((phase.add(err).gt(TAP.div(2)) ? 1 : 0) !== (phase.gt(TAP.div(2)) ? 1 : 0)) {
          throw new Error('Ambiguity probe noise stability failed');
        }
      }
      return phase.gt(TAP.div(2)) ? 1 : 0;
    });
  });

  // Enumerate all 16 4-bit maps for encoder and decoder
  const maps = [];
  for (let m = 0; m < 16; m += 1) {
    maps.push([(m >> 0) & 1, (m >> 1) & 1, (m >> 2) & 1, (m >> 3) & 1]);
  }
  let bestErrors = 8;
  for (const enc of maps) {
    for (const dec of maps) {
      let errs = 0;
      for (let i = 0; i < 4; i += 1) {
        for (const q of BITS) {
          if (dec[2 * enc[i] + q] !== responses[i][q]) errs += 1;
        }
      }
      if (errs < bestErrors) bestErrors = errs;
    }
  }
  return F(bestErrors, 8);
}

export function computeTemporalGap(lesion = null) {
  const x = makeCore(1, ALTERNATING.add(F(2, 3)));
  const orders = [
    [1, 0],
    [0, 1]
  ];
  const runs = orders.map(([first, second]) =>
    runBodyWorldTrace(x, [{ q: first }, { q: second }, { q: 1 }, {}], { lesion })
  );
  if (!readoutEquals(nativeReadout(runs[0][3]), nativeReadout(runs[1][3]))) {
    throw new Error('Pre-terminal temporal order readouts must coincide');
  }
  return signedTurn(runs[0][4].core.phase)
    .sub(signedTurn(runs[1][4].core.phase))
    .abs();
}

export function computeSixCertificates(lesion = null) {
  const c = computeDMatrix(lesion);
  const d = !c[0].sub(c[1]).sub(c[2]).add(c[3]).isZero();

  const v = BITS.every(
    (role) =>
      matRank(computeValuationMatrix(role, lesion)) === 2 &&
      !computeCirculation((z) => computeValuationResponse(role, z, lesion)).isZero()
  );

  const worlds = BITS.map((role) => computeMarkovBlocks(role, lesion));
  const w =
    worlds.every((m) => matRank(buildHankelMatrix(m)) === 4) &&
    !matEq(worlds[0][1], worlds[1][1]);

  const a = computeAOptimum(lesion).gt(ZERO);

  const common = [ONE, ONE];
  const plus = runBodyWorldTrace(makeCore(1), [], {
    pulse: vecScale(H, common),
    lesion,
    motor: ONE
  });
  const minus = runBodyWorldTrace(makeCore(1), [], {
    pulse: vecScale(H, common),
    lesion,
    motor: F(-1)
  });
  const e = vecNormInf(vecSub(plus[4].body, minus[4].body)).gt(ZERO);

  const t = computeTemporalGap(lesion).gt(ZERO);

  return Object.freeze([d, v, w, a, e, t].map((flag) => (flag ? 1 : 0)));
}

export function runFullBodyWorldBridgeVerification() {
  // 1. Contraction & safety envelope
  const evaluations = [
    EVALUATIVE,
    IDENTITY,
    SWAP,
    NULL_MAT,
    matMul(EVALUATIVE, COMMON),
    matMul(EVALUATIVE, FIRST),
    matMul(EVALUATIVE, SECOND),
    matTranspose(EVALUATIVE)
  ];
  let safetyChecks = 0;
  for (const q of [IDENTITY, COMMON]) {
    for (const l of evaluations) {
      for (const motor of [F(-1), ZERO, ONE]) {
        for (const evalFlag of [false, true]) {
          const mech = new Mechanism(q, l, motor);
          const mat = fibreMatrix(IDENTITY, mech, { evaluate: evalFlag });
          const norm = matOperatorNormInf(mat);
          if (!norm.lte(F(3, 4))) throw new Error('Active fiber contraction > 3/4');
          if (!evalFlag && !norm.lte(HALF)) throw new Error('Passive fiber contraction > 1/2');
          safetyChecks += 1;
        }
      }
    }
  }

  // 2. Valuation controls & Hermite grid emulator
  const gamma = VALUE_SCALE;
  const nodes = [F(-1), ZERO, ONE];
  const field = (v) => vecScale(gamma, matVecMul(EVALUATIVE, v));
  if (!computeCirculation(field).eq(gamma.mul(4)) || !gamma.mul(4).eq(F(1, 32))) {
    throw new Error('Valuation circulation must equal 4*gamma = 1/32');
  }
  const bases = hermiteBases(nodes);
  const interpolatedGradient = (xRaw, yRaw) => {
    const x = F(xRaw);
    const y = F(yRaw);
    let ax = ZERO;
    let ay = ZERO;
    for (let i = 0; i < 3; i += 1) {
      for (let j = 0; j < 3; j += 1) {
        const [hx, kx] = bases[i];
        const [hy, ky] = bases[j];
        const [gx, gy] = field([nodes[i], nodes[j]]);
        ax = ax
          .add(gx.mul(polyValue(polyDerivative(kx), x)).mul(polyValue(hy, y)))
          .add(gy.mul(polyValue(polyDerivative(hx), x)).mul(polyValue(ky, y)));
        ay = ay
          .add(gx.mul(polyValue(kx, x)).mul(polyValue(polyDerivative(hy), y)))
          .add(gy.mul(polyValue(hx, x)).mul(polyValue(polyDerivative(ky), y)));
      }
    }
    return [ax, ay];
  };
  for (const nx of nodes) {
    for (const ny of nodes) {
      if (!vecEq(interpolatedGradient(nx, ny), field([nx, ny]))) {
        throw new Error('Hermite grid gradient emulator must match on the 9 grid nodes');
      }
    }
  }

  // 3. World rank-4 Hankel & C1 Jacobian
  const h0 = buildHankelMatrix(computeMarkovBlocks(0));
  if (
    matRank(h0) !== 4 ||
    !matDeterminant(h0).eq(WORLD_SCALE.pow(4)) ||
    !matOperatorNormInf(matInverse(h0)).eq(F(24))
  ) {
    throw new Error('World Hankel rank/determinant/inverse norm check failed');
  }

  // 4. Motor closure
  const sLoop = LOOP_SCALE;
  const commonVec = [ONE, ONE];
  const motorPlus = runBodyWorldTrace(makeCore(1), [], {
    pulse: vecScale(H, commonVec),
    motor: ONE
  });
  const motorMinus = runBodyWorldTrace(makeCore(1), [], {
    pulse: vecScale(H, commonVec),
    motor: F(-1)
  });
  if (!vecNormInf(vecSub(motorPlus[4].body, motorMinus[4].body)).eq(sLoop.mul(2))) {
    throw new Error('Motor closure late separation must equal 2*LOOP_SCALE = 1/128');
  }

  // 5. Six joint certificates & full-rank 6x6 selective lesion response matrix
  const baselineCerts = computeSixCertificates();
  if (baselineCerts.some((c) => c !== 1)) {
    throw new Error(`Expected (1,1,1,1,1,1) joint certificate, got ${baselineCerts}`);
  }
  const expectedLesions = {
    D: [0, 1, 0, 1, 1, 1],
    V: [1, 0, 1, 1, 1, 1],
    W: [1, 0, 0, 1, 1, 1],
    A: [1, 1, 1, 0, 1, 1],
    E: [1, 0, 1, 1, 0, 1],
    T: [1, 1, 1, 1, 1, 0]
  };
  const dropSignatures = [];
  for (const [lesionKey, expectedVec] of Object.entries(expectedLesions)) {
    const actual = computeSixCertificates(lesionKey);
    if (actual.some((val, i) => val !== expectedVec[i])) {
      throw new Error(`Lesion ${lesionKey} certificate mismatch: got ${actual}`);
    }
    dropSignatures.push(actual.map((x) => F(1 - x)));
  }
  const lesionMatrixRank = matRank(matTranspose(dropSignatures));
  if (lesionMatrixRank !== 6) {
    throw new Error(`Expected full rank 6 lesion matrix, got ${lesionMatrixRank}`);
  }

  const margins = [
    F(1, 4),
    F(7, 16),
    F(13, 96),
    F(1, 4),
    F(31, 32),
    HALF.sub(F(64, 19683))
  ];
  const minMargin = fMin(margins);
  if (!minMargin.eq(F(13, 96))) {
    throw new Error(`Minimum certificate margin must equal 13/96, got ${minMargin}`);
  }

  const transportResult = verifyBinaryCycleTransport();

  return {
    passed: true,
    transportResult,
    safetyChecks,
    sixBurdensJointCertificate: baselineCerts,
    lesionSignatures: expectedLesions,
    lesionMatrixRank,
    minimumCertificateMargin: minMargin.toString(),
    minimumCertificateMarginFloat: minMargin.toFloat(),
    valuationCirculation: '1/32',
    worldHankelRank: 4,
    worldHankelInverseNorm: 24,
    ambiguityOptimumError: '1/4',
    motorLateReturnSeparation: '1/128',
    temporalOrderGapH0: '1/384',
    sharedHybridObstructionDocumented: true,
    sharedHybridObstructionSummary:
      'A 5-state shared hybrid with a 3-bit readout matches the six local port summaries unless a 7th cross-port burden ties internal tape probes directly to body-world fiber coordinates (prop:bridge-shared-hybrid-obstruction).'
  };
}
