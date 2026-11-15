/**
 * Paper Puente (Operational Subjecthood Bridge) - Approximate Self-Model Truncator T_d.
 *
 * Implements:
 * - `thm:sigma-approximate-displacement`: Fixed-point displacement <= e_u(p)/(1-L)
 *   and two-intervention separation <= (e_+(p) + e_-(p))/(1-L) with rational saturation.
 * - `prop:sigma-tower-defect-floor`: Global phase floor 1/4 for commands {0, 1/4}
 *   and 1/2 turn over the circle vs. depth-d fiberwise truncation T_d with exact
 *   commutation defect 2 * 3^-(d+1).
 */

import { F, ZERO, ONE } from './ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  SITES,
  createState,
  distance,
  prefix,
  step
} from './WritablePrefixTower.js';

export const TOWER_LIPSCHITZ = F(9, 16);

/**
 * Depth-d fiberwise self-model truncation T_d:
 * Preserves profile, phase, and memory exactly, and replaces the tail of `code`
 * beyond depth `d` with the reference `ALTERNATING` tail.
 */
export function truncateTowerState(state, depth = 6) {
  const bits = prefix(state.code, depth);
  const reference = prefix(ALTERNATING, depth);
  let replacement = ALTERNATING;
  for (let j = 1; j <= depth; j += 1) {
    const bit = bits[j - 1];
    const fixed = reference[j - 1];
    replacement = replacement.add(F(2 * (bit - fixed), 3n ** BigInt(j)));
  }
  return state.replace({ code: replacement });
}

/**
 * Exact theoretical uniform state approximation bound for depth `d`:
 * sup_x d(T_d(x), x) <= 3^-d
 */
export function analyticalApproximationBound(depth = 6) {
  return F(1n, 3n ** BigInt(depth));
}

/**
 * Exact theoretical upper bound on the commutation defect for depth `d`:
 * epsilon_d = 2 * 3^-(d+1)
 */
export function analyticalCommutationDefectBound(depth = 6) {
  return F(2n, 3n ** BigInt(depth + 1));
}

/**
 * Exact theoretical fixed-point displacement bound for depth `d` with L = 9/16:
 * epsilon_d / (1 - L) = (32 / 7) * 3^-(d+1)
 */
export function analyticalFixedPointDisplacementBound(depth = 6) {
  return analyticalCommutationDefectBound(depth).div(ONE.sub(TOWER_LIPSCHITZ));
}

/**
 * Compute the exact commutation defect d(T_d(step(x, cmd)), step(T_d(x), cmd))
 * and verify the theorem identity: defect == 2 * 1_{mismatch(d)} * 3^-(d+1).
 */
export function evaluateCommutationDefect(state, depth = 6, command = {}) {
  const truncated = truncateTowerState(state, depth);
  const approximationError = distance(state, truncated);
  const maxApproximationBound = F(1n, 3n ** BigInt(depth));

  const left = truncateTowerState(step(state, command), depth);
  const right = step(truncated, command);
  const exactDefect = distance(left, right);

  const codeBits = prefix(state.code, depth);
  const refBits = prefix(ALTERNATING, depth);
  const mismatch = codeBits[depth - 1] !== refBits[depth - 1] ? 1 : 0;
  const formulaDefect = F(2n * BigInt(mismatch), 3n ** BigInt(depth + 1));
  const upperBound = analyticalCommutationDefectBound(depth);

  return {
    depth,
    approximationError,
    maxApproximationBound,
    exactDefect,
    formulaDefect,
    upperBound,
    fixedPointDisplacementBound: upperBound.div(ONE.sub(TOWER_LIPSCHITZ)),
    exactFixedPointDisplacement: exactDefect.div(ONE.sub(TOWER_LIPSCHITZ)),
    theoremVerified:
      approximationError.lte(maxApproximationBound) &&
      exactDefect.eq(formulaDefect) &&
      exactDefect.lte(upperBound)
  };
}

/**
 * Run the full Paper Puente verification suite (`check_approximate_automodels`).
 */
export function verifySigmaApproximateAutomodels() {
  const lipschitzList = [ZERO, F(1, 5), F(1, 2), F(9, 10)];
  for (const L of lipschitzList) {
    const plus = ONE;
    const minus = F(-1);
    const defectPlus = L.mul(plus).sub(plus).abs();
    const defectMinus = L.mul(minus).sub(minus).abs();
    if (!defectPlus.eq(ONE.sub(L)) || !defectMinus.eq(ONE.sub(L))) {
      throw new Error('Rational saturation defect mismatch');
    }
    if (!plus.abs().eq(defectPlus.div(ONE.sub(L)))) {
      throw new Error('Fixed-point displacement saturation failed');
    }
    if (!plus.sub(minus).abs().eq(defectPlus.add(defectMinus).div(ONE.sub(L)))) {
      throw new Error('Two-intervention separation saturation failed');
    }
  }

  const point = createState(CONTEXTS[0], ZERO, ALTERNATING, ZERO);
  const neutral = step(point);
  const quarter = step(point, { u: F(1, 4) });
  const antipodal = step(point, { u: F(1, 2) });
  if (!distance(neutral, quarter).eq(F(1, 4))) {
    throw new Error('Quarter command distance must be 1/4');
  }
  if (!distance(point, antipodal).eq(F(1, 2))) {
    throw new Error('Antipodal command distance must be 1/2');
  }

  const writes = [null];
  for (const s of SITES) {
    writes.push([s, 0], [s, 1]);
  }
  const commands = [
    [-1, null],
    [0, null],
    [1, null]
  ];
  for (const s of SITES) {
    commands.push([0, [s, 0]], [0, [s, 1]]);
  }

  let worst = ZERO;
  for (const u of [ZERO, F(1, 4), F(1, 2)]) {
    for (const [q, probe] of commands) {
      for (const write of writes) {
        const d = distance(point, step(point, { u, q, write, probe }));
        if (d.gt(worst)) worst = d;
      }
    }
  }
  if (!worst.eq(F(1, 2))) {
    throw new Error(`Uniform phase upper bound must equal 1/2, got ${worst}`);
  }

  let fiberChecks = 0;
  for (let depth = 1; depth <= 8; depth += 1) {
    for (const code of [ZERO, ALTERNATING, ONE]) {
      for (const memory of [F(-1, 8), F(1, 8)]) {
        for (const q of [-1, 0, 1]) {
          const state = createState(CONTEXTS[0], F(1, 8), code, memory);
          const check = evaluateCommutationDefect(state, depth, { q });
          if (!check.theoremVerified) {
            throw new Error(`Fiber truncation defect failed at depth=${depth}`);
          }
          fiberChecks += 1;
        }
      }
    }
  }

  return {
    passed: true,
    rationalSaturationChecked: lipschitzList.length,
    globalPhaseFloorQuarter: '1/4',
    globalCirclePhaseFloor: '1/2',
    fiberChecks
  };
}
