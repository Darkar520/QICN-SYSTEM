/**
 * Rational skew product over the unchanged writable tower (`body_world_tower.py`).
 *
 * The two extra ports implement a finite-dimensional control model (2 body coordinates,
 * 2 world coordinates). Their names do not assert phenomenal valence, world experience,
 * or biological embodiment.
 */

import {
  F,
  ZERO,
  ONE,
  vecAdd,
  vecSub,
  vecScale,
  vecNormInf,
  vecEq,
  matVecMul,
  matMul,
  matTranspose,
  matOperatorNormInf,
  matEq
} from './ExactFraction.js';
import { CONTEXTS, createState, readout, step } from './WritablePrefixTower.js';

export const ALPHA = F(1, 4);
export const BETA = F(1, 4);
export const H = F(1, 4);
export const EVAL_GAIN = F(1, 8);
export const VALUE_SCALE = BETA.mul(EVAL_GAIN).mul(H); // 1/128
export const WORLD_SCALE = BETA.mul(H); // 1/16
export const LOOP_SCALE = BETA.pow(3).mul(H); // 1/256

export const ZERO_VEC = Object.freeze([ZERO, ZERO]);
export const IDENTITY = Object.freeze([
  Object.freeze([ONE, ZERO]),
  Object.freeze([ZERO, ONE])
]);
export const SWAP = Object.freeze([
  Object.freeze([ZERO, ONE]),
  Object.freeze([ONE, ZERO])
]);
export const ROTATION = Object.freeze([
  Object.freeze([ZERO, F(-1)]),
  Object.freeze([ONE, ZERO])
]);
export const EVALUATIVE = Object.freeze([
  Object.freeze([F(1, 2), F(-1, 2)]),
  Object.freeze([F(1, 2), F(1, 2)])
]);
export const COMMON = Object.freeze([
  Object.freeze([F(1, 2), F(1, 2)]),
  Object.freeze([F(1, 2), F(1, 2)])
]);
export const FIRST = Object.freeze([
  Object.freeze([ONE, ZERO]),
  Object.freeze([ZERO, ZERO])
]);
export const SECOND = Object.freeze([
  Object.freeze([ZERO, ZERO]),
  Object.freeze([ZERO, ONE])
]);
export const NULL_MAT = Object.freeze([
  Object.freeze([ZERO, ZERO]),
  Object.freeze([ZERO, ZERO])
]);

export function roleFrame(profile) {
  return vecEq(profile, CONTEXTS[1]) ? SWAP : IDENTITY;
}

export class Mechanism {
  constructor(worldProjection = IDENTITY, evaluationMap = EVALUATIVE, motorGain = ONE) {
    this.worldProjection = worldProjection;
    this.evaluationMap = evaluationMap;
    this.motorGain = F(motorGain);
    Object.freeze(this);
  }
}

export class ExtendedTowerState {
  constructor(core = createState(), body = ZERO_VEC, world = ZERO_VEC) {
    this.core = core;
    this.body = Object.freeze(body.map((x) => F(x)));
    this.world = Object.freeze(world.map((x) => F(x)));
    Object.freeze(this);
  }

  replace({ core, body, world } = {}) {
    return new ExtendedTowerState(
      core !== undefined ? core : this.core,
      body !== undefined ? body : this.body,
      world !== undefined ? world : this.world
    );
  }

  equals(other) {
    if (!(other instanceof ExtendedTowerState)) return false;
    return (
      this.core.equals(other.core) &&
      vecEq(this.body, other.body) &&
      vecEq(this.world, other.world)
    );
  }

  toFloatTelemetry() {
    return {
      core: this.core.toFloatTelemetry(),
      body: this.body.map((x) => x.toFloat()),
      world: this.world.map((x) => x.toFloat()),
      bodyNormInf: vecNormInf(this.body).toFloat(),
      worldNormInf: vecNormInf(this.world).toFloat()
    };
  }
}

export function fibreUpdate(
  bodyRaw,
  worldRaw,
  frame,
  mechanism = new Mechanism(),
  { evaluate = false, bodyInput = ZERO_VEC, worldInput = ZERO_VEC } = {}
) {
  const body = bodyRaw.map((x) => F(x));
  const world = worldRaw.map((x) => F(x));
  const bIn = bodyInput.map((x) => F(x));
  const wIn = worldInput.map((x) => F(x));

  if ([body, world, bIn, wIn].some((v) => v.length !== 2)) {
    throw new RangeError('Each typed port has two coordinates');
  }
  const q = mechanism.worldProjection;
  const evaluation = mechanism.evaluationMap;
  const motor = mechanism.motorGain;

  if (
    [q, evaluation, frame].some(
      (m) => m.length !== 2 || m.some((row) => row.length !== 2)
    )
  ) {
    throw new RangeError('Each port operator must be 2x2');
  }
  const isIdempotent =
    matEq(q, IDENTITY) || matEq(q, COMMON) || matEq(matMul(q, q), q);
  if (!isIdempotent) {
    throw new RangeError('The world map must be an idempotent contraction');
  }
  if (
    matOperatorNormInf(q).gt(ONE) ||
    matOperatorNormInf(evaluation).gt(ONE) ||
    motor.abs().gt(ONE)
  ) {
    throw new RangeError('Mechanism exceeds the frozen gain envelope');
  }
  if (
    !matEq(matMul(frame, matTranspose(frame)), IDENTITY) ||
    !matOperatorNormInf(frame).eq(ONE)
  ) {
    throw new RangeError('The indexed frame must be a signed permutation');
  }
  if (vecNormInf(bIn).gt(H) || vecNormInf(wIn).gt(H)) {
    throw new RangeError('Primitive input exceeds the common port budget');
  }

  const sensor = matVecMul(frame, matVecMul(q, world));
  const force = vecScale(
    EVAL_GAIN,
    matVecMul(evaluation, vecSub(sensor, body))
  );
  let nextBody = vecAdd(
    vecAdd(vecScale(ALPHA, body), vecScale(BETA, sensor)),
    bIn
  );
  if (evaluate) {
    nextBody = vecAdd(nextBody, force);
  }
  const nextWorld = vecAdd(
    vecAdd(
      vecScale(ALPHA, matVecMul(q, world)),
      vecScale(
        BETA.mul(motor),
        matVecMul(q, matVecMul(matTranspose(frame), body))
      )
    ),
    matVecMul(q, wIn)
  );
  return Object.freeze([nextBody, nextWorld]);
}

export function advance(
  state,
  nativeCommand = {},
  mechanism = new Mechanism(),
  { evaluate = false, bodyInput = ZERO_VEC, worldInput = ZERO_VEC } = {}
) {
  const [nextBody, nextWorld] = fibreUpdate(
    state.body,
    state.world,
    roleFrame(state.core.profile),
    mechanism,
    { evaluate, bodyInput, worldInput }
  );
  return new ExtendedTowerState(
    step(state.core, nativeCommand || {}),
    nextBody,
    nextWorld
  );
}

export function nativeReadout(state) {
  return readout(state.core);
}

export function portReadout(state) {
  return Object.freeze([state.body, state.world]);
}

export function fibreMatrix(frame, mechanism = new Mechanism(), { evaluate = false } = {}) {
  const columns = [];
  for (let i = 0; i < 4; i += 1) {
    const vector = Array.from({ length: 4 }, (_, j) => (i === j ? ONE : ZERO));
    const [b, w] = fibreUpdate(
      vector.slice(0, 2),
      vector.slice(2, 4),
      frame,
      mechanism,
      { evaluate }
    );
    columns.push([...b, ...w]);
  }
  return matTranspose(columns);
}
