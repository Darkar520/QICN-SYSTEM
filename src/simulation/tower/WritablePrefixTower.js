/**
 * Exact circle-prefix plant with one optional write and one optional neutral probe.
 * Direct 1:1 port of `prefix_tower.py` from `qicn-framework-ordenado`.
 */

import { F, ZERO, ONE, HALF, fMin, fMax, vecEq } from './ExactFraction.js';

export const LAMBDA = F(1, 12);
export const RETENTION = F(1, 2);
export const KAPPA = F(1, 8);
export const SAFE = F(1, 4);
export const ALTERNATING = F(1, 4);
export const CORE = F(1, 16);
export const SITES = Object.freeze([3, 4, 5, 6, 7]);
export const TAP = F(1n, 16n * (3n ** 7n)); // 1 / 34992
export const ETA = F(1n, 4n * (3n ** 10n)); // 1 / 236196

const buildProfiles = () => {
  const list = [Object.freeze([ZERO, ZERO, ZERO])];
  for (const k of [0, 1]) {
    for (const j of [1, 2, 3]) {
      list.push(
        Object.freeze([0, 1, 2].map((t) => (t > k ? F(j, 8) : ZERO)))
      );
    }
  }
  return Object.freeze(list);
};

export const PROFILES = buildProfiles();
export const CONTEXTS = Object.freeze([
  PROFILES[0],
  Object.freeze([ZERO, ZERO, F(1, 8)])
]);

export class TowerState {
  constructor(profile, phase = ZERO, code = ALTERNATING, memory = ZERO) {
    this.profile = Object.freeze(profile.map((x) => F(x)));
    this.phase = F(phase).mod1();
    this.code = F(code);
    this.memory = F(memory);
    Object.freeze(this);
  }

  replace({ profile, phase, code, memory } = {}) {
    return new TowerState(
      profile !== undefined ? profile : this.profile,
      phase !== undefined ? phase : this.phase,
      code !== undefined ? code : this.code,
      memory !== undefined ? memory : this.memory
    );
  }

  equals(other) {
    if (!(other instanceof TowerState)) return false;
    return (
      vecEq(this.profile, other.profile) &&
      this.phase.eq(other.phase) &&
      this.code.eq(other.code) &&
      this.memory.eq(other.memory)
    );
  }

  toFloatTelemetry() {
    return {
      profile: this.profile.map((x) => x.toFloat()),
      phase: this.phase.toFloat(),
      code: this.code.toFloat(),
      memory: this.memory.toFloat()
    };
  }
}

export function createState(profile = CONTEXTS[0], phase = ZERO, code = ALTERNATING, memory = ZERO) {
  return new TowerState(profile, phase, code, memory);
}

/**
 * Decode a Cantor prefix of length `depth`, also on the certified midpoint noise tube.
 */
export function prefix(codeRaw, depth) {
  let code = F(codeRaw);
  const digits = [];
  for (let i = 0; i < depth; i += 1) {
    const bit = code.gte(HALF) ? 1 : 0;
    digits.push(bit);
    code = code.mul(3).sub(2 * bit);
  }
  return Object.freeze(digits);
}

export function referenceBit(site) {
  return (site - 1) % 2;
}

export function active(code, site) {
  const p = prefix(code, site);
  return p[p.length - 1] === referenceBit(site) ? 1 : 0;
}

export function writePrefix(codeRaw, site, bit) {
  const code = F(codeRaw);
  const p = prefix(code, site);
  const old = p[p.length - 1];
  return code.add(F(2 * (bit - old), 3n ** BigInt(site)));
}

export function circle(displacementRaw) {
  const turn = F(displacementRaw).mod1();
  return fMin(turn, ONE.sub(turn));
}

export function signedTurn(turnRaw) {
  return F(turnRaw).add(HALF).mod1().sub(HALF);
}

export function distance(left, right) {
  if (!vecEq(left.profile, right.profile)) {
    return ONE;
  }
  return fMax(
    circle(left.phase.sub(right.phase)),
    left.code.sub(right.code).abs(),
    left.memory.sub(right.memory).abs().div(4)
  );
}

export function coreDistance(state) {
  return fMax(
    circle(state.phase),
    fMax(ZERO, state.memory.abs().sub(CORE)).div(4)
  );
}

export function clipControl(uRaw) {
  const u = F(uRaw);
  if (u.gt(HALF)) return HALF;
  if (u.lt(HALF.neg())) return HALF.neg();
  return u;
}

export function readout(state) {
  return Object.freeze([
    ...state.profile.map((offset) => state.phase.add(offset).mod1()),
    state.code
  ]);
}

export function readoutEquals(r1, r2) {
  return vecEq(r1, r2);
}

/**
 * Advance the writable prefix tower under a fixed command.
 * A probe reads the pre-transition tape.
 */
export function step(
  state,
  {
    u = ZERO,
    q = 0,
    write = null,
    probe = null,
    strength = TAP,
    rival = false
  } = {}
) {
  if (q !== -1 && q !== 0 && q !== 1) {
    throw new RangeError('q must be -1, 0, or 1');
  }
  let uVal = F(u);
  if (probe !== null) {
    const [site, role] = probe;
    if (q !== 0 || !SITES.includes(site) || (role !== 0 && role !== 1)) {
      throw new RangeError('a role probe must be neutral and use a protected-interface site');
    }
    const isRoleMatch = vecEq(state.profile, CONTEXTS[role]) ? 1 : 0;
    const act = active(state.code, site);
    if (act && isRoleMatch) {
      uVal = uVal.add(strength);
    }
  }

  const bit = prefix(state.code, 1)[0];
  let phase = uVal.add(LAMBDA.mul(q * bit));
  if (q === 0) {
    phase = phase.add(KAPPA.mul(state.memory));
  }
  const sign = q === -1 || (rival && q === 1) ? -1 : 1;
  const memory = RETENTION.mul(sign).mul(state.memory).add(LAMBDA.mul(q * bit));
  let code = ONE.sub(state.code).div(3);

  if (write !== null) {
    const [site, value] = write;
    if (!SITES.includes(site) || (value !== 0 && value !== 1)) {
      throw new RangeError('one binary digit in positions 3 through 7 may be overwritten');
    }
    code = writePrefix(code, site, value);
  }

  return new TowerState(state.profile, phase.mod1(), code, memory);
}

export function encodeBits(bits, tail = ZERO) {
  let sum = ZERO;
  for (let i = 0; i < bits.length; i += 1) {
    sum = sum.add(F(2 * bits[i], 3n ** BigInt(i + 1)));
  }
  return sum.add(F(tail).div(F(3n ** BigInt(bits.length))));
}
