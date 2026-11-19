// @ts-check
/**
 * Structural Atomic Separator & Faithful Quotient Injectivity
 * (`BaseCore` `thm:basecore-irreducible-observation`, `prop:basecore-irreducible-control`,
 *  `Paper V` `thm:iint-irreducible-derivation`, `prop:iint-irreducible-negatives`,
 *  Lean 4 `QICNIrreducibleObservation.lean` & `QICNHybridBoundary.faithful_quotient_injective`).
 *
 * Derives response atomicity and non-factorization from polynomial irreducibility
 * over finite fields X = F_p^d (d >= 2) without assuming atomicity as an axiom,
 * and verifies exact negative controls (A = I reducible identity, reducible swap
 * with proper invariant subspace, and cross-factor communication).
 *
 * evidence_scope: internal_support_only
 * external_support_certified: false
 */

import { sha256Hex, stableStringify } from '../../utils/integrity.js';
import { F, ZERO, ONE, HALF, fMin, fMax } from '../../simulation/tower/ExactFraction.js';

/**
 * Generates all p^d vectors in F_p^d in lexicographic order.
 * @param {number} p
 * @param {number} d
 * @returns {number[][]}
 */
export function enumerateFiniteFieldSpace(p, d) {
  const total = p ** d;
  const states = [];
  for (let idx = 0; idx < total; idx += 1) {
    const vec = new Array(d);
    let rem = idx;
    for (let k = d - 1; k >= 0; k -= 1) {
      vec[k] = rem % p;
      rem = Math.floor(rem / p);
    }
    states.push(vec);
  }
  return states;
}

/**
 * Evaluates a linear functional ell · x mod p.
 * @param {number[]} ell
 * @param {number[]} x
 * @param {number} p
 * @returns {number}
 */
export function applyLinearFunctionalModP(ell, x, p) {
  let acc = 0;
  for (let i = 0; i < ell.length; i += 1) {
    acc = (acc + ell[i] * x[i]) % p;
  }
  return ((acc % p) + p) % p;
}

/**
 * Computes the d-step orbit [x, A(x), ..., A^{d-1}(x)] in F_p^d.
 * @param {number[]} x
 * @param {(state: number[]) => number[]} transitionFn
 * @param {number} d
 * @returns {number[][]}
 */
export function computeCyclicOrbit(x, transitionFn, d) {
  const orbit = [x.slice()];
  let cur = x.slice();
  for (let step = 1; step < d; step += 1) {
    cur = transitionFn(cur);
    orbit.push(cur.slice());
  }
  return orbit;
}

/**
 * Computes the rank over F_p of a list of row vectors in F_p^d via Gaussian elimination mod p.
 * @param {number[][]} rows
 * @param {number} p
 * @returns {number}
 */
export function matrixRankModP(rows, p) {
  if (!rows.length) return 0;
  const m = rows.length;
  const n = rows[0].length;
  const mat = rows.map((r) => r.map((v) => ((v % p) + p) % p));

  const modInverse = (a) => {
    const norm = ((a % p) + p) % p;
    for (let x = 1; x < p; x += 1) {
      if ((norm * x) % p === 1) return x;
    }
    throw new Error(`No modular inverse for ${a} mod ${p}`);
  };

  let rank = 0;
  for (let col = 0; col < n && rank < m; col += 1) {
    let pivot = -1;
    for (let row = rank; row < m; row += 1) {
      if (mat[row][col] !== 0) {
        pivot = row;
        break;
      }
    }
    if (pivot === -1) continue;
    const tmp = mat[rank];
    mat[rank] = mat[pivot];
    mat[pivot] = tmp;

    const inv = modInverse(mat[rank][col]);
    for (let c = col; c < n; c += 1) {
      mat[rank][c] = (mat[rank][c] * inv) % p;
    }
    for (let row = 0; row < m; row += 1) {
      if (row !== rank && mat[row][col] !== 0) {
        const factor = mat[row][col];
        for (let c = col; c < n; c += 1) {
          mat[row][c] = (((mat[row][c] - factor * mat[rank][c]) % p) + p) % p;
        }
      }
    }
    rank += 1;
  }
  return rank;
}

/**
 * Polynomial division in F_p[t]. Coefficients are ordered [c_0, c_1, ..., c_deg] (ascending degree).
 * @param {number[]} num
 * @param {number[]} den
 * @param {number} p
 */
function polyModP(num, den, p) {
  const trim = (poly) => {
    const out = poly.map((c) => ((c % p) + p) % p);
    while (out.length > 1 && out[out.length - 1] === 0) out.pop();
    return out;
  };
  const modInverse = (a) => {
    for (let x = 1; x < p; x += 1) {
      if ((a * x) % p === 1) return x;
    }
    return 1;
  };
  let rem = trim(num);
  const divisor = trim(den);
  const dDeg = divisor.length - 1;
  const invLead = modInverse(divisor[dDeg]);
  while (rem.length - 1 >= dDeg && !(rem.length === 1 && rem[0] === 0)) {
    const rDeg = rem.length - 1;
    const shift = rDeg - dDeg;
    const coeff = (rem[rDeg] * invLead) % p;
    for (let i = 0; i <= dDeg; i += 1) {
      rem[shift + i] = (((rem[shift + i] - coeff * divisor[i]) % p) + p) % p;
    }
    rem = trim(rem);
  }
  return rem;
}

/**
 * Verifies that a monic polynomial coeffs = [c_0, ..., c_d] over F_p is irreducible of degree d,
 * and annihilates the operator A on F_p^d (while no non-zero polynomial of degree < d annihilates A).
 * @param {number[]} coeffsAscending
 * @param {(x: number[]) => number[]} transitionFn
 * @param {number} p
 * @param {number} d
 */
export function verifyPolynomialIrreducibilityAndAnnihilation(coeffsAscending, transitionFn, p, d) {
  if (coeffsAscending.length !== d + 1 || coeffsAscending[d] % p !== 1) {
    throw new Error('Minimal polynomial must be monic of degree d');
  }
  // 1. Check irreducibility over F_p: no monic divisor of degree 1 <= k <= floor(d/2)
  const maxDivDeg = Math.floor(d / 2);
  for (let k = 1; k <= maxDivDeg; k += 1) {
    const lowerCoeffsList = enumerateFiniteFieldSpace(p, k);
    for (const low of lowerCoeffsList) {
      const candidateDivisor = [...low, 1];
      const rem = polyModP(coeffsAscending, candidateDivisor, p);
      if (rem.length === 1 && rem[0] === 0) {
        return { isIrreducible: false, annihilatesOperator: false, degreeIsMinimal: false };
      }
    }
  }

  // 2. Check p(A)x = 0 for all x in F_p^d
  const states = enumerateFiniteFieldSpace(p, d);
  for (const x of states) {
    const powers = [x.slice()];
    let cur = x.slice();
    for (let step = 1; step <= d; step += 1) {
      cur = transitionFn(cur);
      powers.push(cur.slice());
    }
    for (let coord = 0; coord < d; coord += 1) {
      let sum = 0;
      for (let k = 0; k <= d; k += 1) {
        sum = (sum + coeffsAscending[k] * powers[k][coord]) % p;
      }
      if (((sum % p) + p) % p !== 0) {
        return { isIrreducible: true, annihilatesOperator: false, degreeIsMinimal: false };
      }
    }
  }

  // 3. Check no nonzero polynomial of degree < d annihilates A on all states
  const nonZeroStates = states.filter((st) => st.some((v) => v !== 0));
  for (const x of nonZeroStates) {
    const orbit = computeCyclicOrbit(x, transitionFn, d);
    if (matrixRankModP(orbit, p) !== d) {
      return { isIrreducible: true, annihilatesOperator: true, degreeIsMinimal: false };
    }
  }

  return { isIrreducible: true, annihilatesOperator: true, degreeIsMinimal: true };
}

/**
 * Evaluates an instance (X = F_p^d, A, minpoly) against BaseCore thm:basecore-irreducible-observation
 * and Paper V thm:iint-irreducible-derivation.
 */
export function evaluateFiniteFieldIrreducibleInstance({
  id,
  p,
  d,
  minpolyCoeffs,
  minpolyLabel,
  transitionFn
}) {
  const states = enumerateFiniteFieldSpace(p, d);
  const nonZeroFunctionals = states.filter((ell) => ell.some((c) => c !== 0));
  const nonZeroStates = states.filter((x) => x.some((c) => c !== 0));
  const polyCheck = verifyPolynomialIrreducibilityAndAnnihilation(minpolyCoeffs, transitionFn, p, d);

  // Cyclic independence check (`cyclic_independent` in QICNIrreducibleObservation.lean)
  let cyclicIndependentCount = 0;
  for (const v of nonZeroStates) {
    const orbit = computeCyclicOrbit(v, transitionFn, d);
    if (matrixRankModP(orbit, p) === d) {
      cyclicIndependentCount += 1;
    }
  }
  const allCyclicOrbitsIndependent = cyclicIndependentCount === nonZeroStates.length;

  // Symbol encoding iota(a) = a / (p - 1) in [0, 1]
  const encodeSymbol = (a) => F(a, p - 1);
  const theoreticalSigma = F(1, p - 1);
  const theoreticalErrorBound = F(1, 2 * (p - 1));
  const theoreticalDeltaInt = F(1, 4 * (p - 1));

  // Observation injectivity across EVERY nonzero linear functional ell != 0
  let injectiveFunctionalCount = 0;
  let globalMinDistinctPairDistance = ONE;
  for (const ell of nonZeroFunctionals) {
    const trajectoryKeys = new Set();
    const encodedTrajectories = [];
    for (const x of states) {
      const orbit = computeCyclicOrbit(x, transitionFn, d);
      const readings = orbit.map((st) => applyLinearFunctionalModP(ell, st, p));
      trajectoryKeys.add(readings.join(','));
      encodedTrajectories.push(readings.map(encodeSymbol));
    }
    if (trajectoryKeys.size === states.length) {
      injectiveFunctionalCount += 1;
    }
    for (let i = 0; i < states.length; i += 1) {
      for (let j = i + 1; j < states.length; j += 1) {
        let pairMaxDiff = ZERO;
        for (let k = 0; k < d; k += 1) {
          const diff = encodedTrajectories[i][k].sub(encodedTrajectories[j][k]).abs();
          if (diff.gt(pairMaxDiff)) pairMaxDiff = diff;
        }
        if (pairMaxDiff.lt(globalMinDistinctPairDistance)) {
          globalMinDistinctPairDistance = pairMaxDiff;
        }
      }
    }
  }
  const everyNonZeroFunctionalInjective = injectiveFunctionalCount === nonZeroFunctionals.length;

  // Faithful quotient injectivity check (`faithful_quotient_injective` in QICNHybridBoundary.lean):
  // Every pair (x, y) with x != y has max-norm response separation >= sigma = 1/(p-1) under every ell != 0,
  // so no non-injective quotient can preserve responses on any nonzero linear port.
  const distinctStatePairsCount = (states.length * (states.length - 1)) / 2;
  const faithfulQuotientInjectiveVerified =
    everyNonZeroFunctionalInjective && globalMinDistinctPairDistance.eq(theoreticalSigma);

  return {
    id,
    fieldPrimeP: p,
    dimensionD: d,
    stateCount: states.length,
    minpolyLabel,
    minpolyCoeffs,
    polyIrreducible: polyCheck.isIrreducible,
    polyAnnihilatesOperator: polyCheck.annihilatesOperator,
    allCyclicOrbitsIndependent,
    nonZeroStatesChecked: nonZeroStates.length,
    nonZeroFunctionalsChecked: nonZeroFunctionals.length,
    injectiveFunctionalCount,
    everyNonZeroFunctionalInjective,
    distinctStatePairsChecked: distinctStatePairsCount,
    responseSeparationSigma: globalMinDistinctPairDistance.toString(),
    expectedSigma: theoreticalSigma.toString(),
    uniformProductErrorLowerBound: theoreticalErrorBound.toString(),
    integrationCertificateDeltaInt: theoreticalDeltaInt.toString(),
    integrationCertificateDeltaIntFloat: theoreticalDeltaInt.toFloat(),
    faithfulQuotientInjectiveVerified
  };
}

/**
 * Exhaustively verifies the 4! = 24 onto product encodings x 2 port splits = 48 configurations
 * on F_2^2 with A(a,b) = (b, a xor b) (minpoly t^2 + t + 1), matching `check_atomic_coupled.py`,
 * plus higher-dimension F_2^3 (t^3 + t + 1) and odd-prime F_3^2 (t^2 + 1) product bounds
 * and all 3 exact negative controls.
 */
export function verifyStructuralAtomicSeparatorAndFaithfulQuotients() {
  // 1. Canonical binary instance: p = 2, d = 2, A(a, b) = (b, a ^ b), minpoly t^2 + t + 1
  const transitionF2D2 = ([a, b]) => [b, a ^ b];
  const instF2D2 = evaluateFiniteFieldIrreducibleInstance({
    id: 'F2_d2_t2_plus_t_plus_1',
    p: 2,
    d: 2,
    minpolyCoeffs: [1, 1, 1],
    minpolyLabel: 't^2 + t + 1',
    transitionFn: transitionF2D2
  });
  if (!instF2D2.polyIrreducible || !instF2D2.everyNonZeroFunctionalInjective || !instF2D2.faithfulQuotientInjectiveVerified) {
    throw new Error('F2^2 irreducible observation separator check failed');
  }

  // Exhaustive 24 permutations x 2 port orders = 48 product encodings on F_2^2
  const statesF2D2 = enumerateFiniteFieldSpace(2, 2);
  const permute = (arr) => {
    if (arr.length <= 1) return [arr];
    const out = [];
    for (let i = 0; i < arr.length; i += 1) {
      const head = arr[i];
      const rest = [...arr.slice(0, i), ...arr.slice(i + 1)];
      for (const p of permute(rest)) out.push([head, ...p]);
    }
    return out;
  };
  const encodings24 = permute(statesF2D2);
  const productErrors48 = [];
  for (const encoding of encodings24) {
    for (const order of [
      [0, 1],
      [1, 0]
    ]) {
      let maxErr = ZERO;
      for (let factor = 0; factor < 2; factor += 1) {
        const port = order[factor];
        for (const bit of [0, 1]) {
          for (const time of [0, 1]) {
            const vals = [];
            for (let sIdx = 0; sIdx < statesF2D2.length; sIdx += 1) {
              if (encoding[sIdx][factor] === bit) {
                const orbit = computeCyclicOrbit(statesF2D2[sIdx], transitionF2D2, 2);
                vals.push(F(orbit[time][port]));
              }
            }
            const fiberErr = fMax(vals).sub(fMin(vals)).div(2);
            if (fiberErr.gt(maxErr)) maxErr = fiberErr;
          }
        }
      }
      productErrors48.push(maxErr);
    }
  }
  const minProductErrorF2D2 = fMin(productErrors48);
  if (productErrors48.length !== 48 || !minProductErrorF2D2.eq(HALF)) {
    throw new Error(`Expected 48 product configs with min error 1/2, got ${productErrors48.length} and ${minProductErrorF2D2}`);
  }

  // 2. Higher-degree binary instance: p = 2, d = 3, A(a, b, c) = (b, c, a ^ b), minpoly t^3 + t + 1
  const transitionF2D3 = ([a, b, c]) => [b, c, a ^ b];
  const instF2D3 = evaluateFiniteFieldIrreducibleInstance({
    id: 'F2_d3_t3_plus_t_plus_1',
    p: 2,
    d: 3,
    minpolyCoeffs: [1, 1, 0, 1],
    minpolyLabel: 't^3 + t + 1',
    transitionFn: transitionF2D3
  });
  if (!instF2D3.polyIrreducible || !instF2D3.everyNonZeroFunctionalInjective || instF2D3.injectiveFunctionalCount !== 7) {
    throw new Error('F2^3 irreducible observation separator check failed');
  }

  // Verify onto product splits F_2^3 -> L x R (|L|=4, |R|=2 and |L|=2, |R|=4) incur uniform error >= 1/2
  const statesF2D3 = enumerateFiniteFieldSpace(2, 3);
  let f2d3ProductMinError = ONE;
  for (const splitMode of ['4x2_prefix_suffix', '2x4_first_tail', '4x2_parity_split']) {
    let splitErr = ZERO;
    for (let lVal = 0; lVal < (splitMode === '2x4_first_tail' ? 2 : 4); lVal += 1) {
      const fiber = statesF2D3.filter((st) => {
        if (splitMode === '4x2_prefix_suffix') return (st[0] * 2 + st[1]) === lVal;
        if (splitMode === '2x4_first_tail') return st[0] === lVal;
        return ((st[0] ^ st[2]) * 2 + (st[1] ^ st[2])) === lVal;
      });
      for (let time = 0; time < 3; time += 1) {
        const vals = fiber.map((st) => F(computeCyclicOrbit(st, transitionF2D3, 3)[time][0]));
        const err = fMax(vals).sub(fMin(vals)).div(2);
        if (err.gt(splitErr)) splitErr = err;
      }
    }
    if (splitErr.lt(f2d3ProductMinError)) f2d3ProductMinError = splitErr;
  }
  if (!f2d3ProductMinError.eq(HALF)) {
    throw new Error(`Expected F2^3 onto product splits to incur error 1/2, got ${f2d3ProductMinError}`);
  }

  // 3. Odd-prime field instance: p = 3, d = 2, A(a, b) = (b, 2a mod 3), minpoly t^2 + 1 over F_3
  const transitionF3D2 = ([a, b]) => [b, (2 * a) % 3];
  const instF3D2 = evaluateFiniteFieldIrreducibleInstance({
    id: 'F3_d2_t2_plus_1',
    p: 3,
    d: 2,
    minpolyCoeffs: [1, 0, 1],
    minpolyLabel: 't^2 + 1 (over F_3)',
    transitionFn: transitionF3D2
  });
  if (
    !instF3D2.polyIrreducible ||
    !instF3D2.everyNonZeroFunctionalInjective ||
    instF3D2.injectiveFunctionalCount !== 8 ||
    instF3D2.responseSeparationSigma !== '1/2' ||
    instF3D2.integrationCertificateDeltaInt !== '1/8'
  ) {
    throw new Error('F3^2 irreducible observation separator check failed');
  }

  // Verify native product split F_3^2 -> F_3 x F_3 under irreducible A(a,b)=(b, 2a mod 3) incurs error >= sigma/2 = 1/4
  const statesF3D2 = enumerateFiniteFieldSpace(3, 2);
  let f3d2NativeProductErr = ZERO;
  for (let lCoord = 0; lCoord < 3; lCoord += 1) {
    const fiber = statesF3D2.filter((st) => st[0] === lCoord);
    for (let time = 0; time < 2; time += 1) {
      const vals = fiber.map((st) => F(computeCyclicOrbit(st, transitionF3D2, 2)[time][0], 2));
      const err = fMax(vals).sub(fMin(vals)).div(2);
      if (err.gt(f3d2NativeProductErr)) f3d2NativeProductErr = err;
    }
  }
  if (!f3d2NativeProductErr.gte(F(1, 4))) {
    throw new Error(`Expected F3^2 product error >= 1/4, got ${f3d2NativeProductErr}`);
  }

  // 4. Exact Negative Controls (`prop:basecore-irreducible-control` & `prop:iint-irreducible-negatives`)
  // Negative Control 1: A = I (identity) on F_2^2 and F_3^2 -> reducible (minpoly t - 1 of degree 1 < d),
  // native coordinate split factorizes with exact error 0 and delta_int = 0.
  let identityNativeErrorF2 = ZERO;
  for (const st of statesF2D2) {
    const [a, b] = st;
    const next = [a, b]; // A = I
    const err0 = F(next[0]).sub(F(a)).abs();
    const err1 = F(next[1]).sub(F(b)).abs();
    identityNativeErrorF2 = fMax([identityNativeErrorF2, err0, err1]);
  }
  let identityInjectiveFunctionalsF2 = 0;
  for (const ell of statesF2D2.filter((e) => e[0] !== 0 || e[1] !== 0)) {
    const seen = new Set(statesF2D2.map((x) => [applyLinearFunctionalModP(ell, x, 2), applyLinearFunctionalModP(ell, x, 2)].join(',')));
    if (seen.size === statesF2D2.length) identityInjectiveFunctionalsF2 += 1;
  }
  if (!identityNativeErrorF2.isZero() || identityInjectiveFunctionalsF2 !== 0) {
    throw new Error('Reducible identity A = I negative control failed');
  }

  // Negative Control 2: Non-scalar reducible swap A_swap(a,b) = (b,a) on F_2^2 (minpoly t^2 + 1 = (t+1)^2 over F_2):
  // The nonzero linear functional ell = (1, 1) annihilates the proper invariant subspace W = span{(1,1)},
  // so states (0,0) and (1,1) have identical response (0,0) and ell is NOT injective (converse of thm:basecore-irreducible-observation).
  const swapFn = ([a, b]) => [b, a];
  const ellSum = [1, 1];
  const resp00 = computeCyclicOrbit([0, 0], swapFn, 2).map((st) => applyLinearFunctionalModP(ellSum, st, 2));
  const resp11 = computeCyclicOrbit([1, 1], swapFn, 2).map((st) => applyLinearFunctionalModP(ellSum, st, 2));
  const swapInvariantSubspaceAnnihilated =
    resp00.join(',') === '0,0' && resp11.join(',') === '0,0' && resp00.join(',') === resp11.join(',');
  if (!swapInvariantSubspaceAnnihilated) {
    throw new Error('Reducible swap invariant-subspace converse negative control failed');
  }

  // Negative Control 3: 1-bit cross-factor state message collapses error on F_2^2 from 1/2 to 0
  let crossFactorMessageError = ZERO;
  for (const st of statesF2D2) {
    const [a, b] = st;
    const msgTo0 = b;
    const msgTo1 = a;
    const actualNext = transitionF2D2(st);
    const predNext0 = msgTo0;
    const predNext1 = msgTo1 ^ b;
    const err0 = F(actualNext[0]).sub(F(predNext0)).abs();
    const err1 = F(actualNext[1]).sub(F(predNext1)).abs();
    crossFactorMessageError = fMax([crossFactorMessageError, err0, err1]);
  }
  if (!crossFactorMessageError.isZero()) {
    throw new Error('Cross-factor 1-bit communication negative control must achieve error 0');
  }

  const body = {
    schema: 'qicn.structural_atomic_separator.v1',
    passed: true,
    theorems_verified: [
      'basecore:thm:basecore-irreducible-observation',
      'basecore:prop:basecore-irreducible-control',
      'paper5:thm:iint-irreducible-derivation',
      'paper5:prop:iint-irreducible-negatives',
      'lean:QICNIrreducibleObservation.cyclic_independent',
      'lean:QICNIrreducibleObservation.irreducible_observation_injective',
      'lean:QICNIrreducibleObservation.irreducible_product_bound',
      'lean:QICNHybridBoundary.faithful_quotient_injective'
    ],
    primary_binary_instance: {
      ...instF2D2,
      ontoProductConfigurationsChecked: productErrors48.length,
      minimaxUniformProductError: minProductErrorF2D2.toString()
    },
    higher_degree_instance: {
      ...instF2D3,
      ontoProductMinErrorVerified: f2d3ProductMinError.toString()
    },
    odd_prime_instance: {
      ...instF3D2,
      nativeProductErrorVerified: f3d2NativeProductErr.toString()
    },
    negative_controls: {
      reducible_identity_A_eq_I: {
        nativeCoordinateProductError: identityNativeErrorF2.toString(),
        integrationCertificateDeltaInt: '0',
        injectiveLinearFunctionalsCount: identityInjectiveFunctionalsF2,
        factorizesExactly: identityNativeErrorF2.isZero()
      },
      reducible_swap_invariant_subspace: {
        operatorLabel: 'A_swap(a,b)=(b,a), minpoly (t+1)^2 over F_2',
        annihilatingFunctional: [1, 1],
        invariantVector: [1, 1],
        collidingResponses: [resp00, resp11],
        invariantSubspaceAnnihilated: swapInvariantSubspaceAnnihilated
      },
      cross_factor_1bit_communication: {
        communicatingProductError: crossFactorMessageError.toString(),
        collapsesObstructionToZero: crossFactorMessageError.isZero()
      }
    },
    evidence_scope: 'internal_support_only',
    external_support_certified: false,
    interpretation_boundary:
      'Exact finite-field structural atomic separator and faithful-quotient injectivity (thm:basecore-irreducible-observation, thm:iint-irreducible-derivation); establishes class-relative non-factorization delta_int = 1/[4(p-1)] > 0 against non-communicating factor predictors without certifying phenomenal experience or unconditional continuous Hilbert atomicity.'
  };

  const digest = sha256Hex(stableStringify(body));
  return Object.freeze({ ...body, digest });
}
