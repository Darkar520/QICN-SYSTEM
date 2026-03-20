/**
 * Determinism utilities (no DOM/React dependencies).
 */

/**
 * Seeded PRNG (mulberry32).
 * @param {number} seed
 * @returns {() => number} float in [0,1)
 */
export const createRng = (seed) => {
  let t = seed >>> 0;
  return () => {
    t += 0x6D2B79F5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
};

/**
 * Order-insensitive key for a node set (defends against unstable source ordering).
 * @param {Array<{id:number}>} nodes
 * @returns {number} signed 32-bit int key
 */
export const computeNodesKeyUnordered = (nodes) => {
  let xor = 0;
  let sum = 0;
  let key = nodes.length | 0;
  for (let i = 0; i < nodes.length; i++) {
    const id = (nodes[i]?.id || 0) | 0;
    xor ^= id;
    sum = (sum + id) | 0;
  }
  key = (key * 31 + xor) | 0;
  key = (key * 31 + sum) | 0;
  return key | 0;
};

/**
 * Depth comparator (Painter's Algorithm): far (larger depth) first.
 * Includes deterministic tie-breakers.
 * @param {number} aDepth
 * @param {number} bDepth
 * @param {number} aId
 * @param {number} bId
 * @param {number} aIndex
 * @param {number} bIndex
 */
export const compareDepthDesc = (aDepth, bDepth, aId, bId, aIndex, bIndex) => {
  const dz = bDepth - aDepth;
  if (dz !== 0) return dz;
  if (aId !== bId) return aId - bId;
  return aIndex - bIndex;
};

/**
 * Deterministic orbital angle: no mutation, tick-driven.
 * @param {number} baseAngle
 * @param {number} speed
 * @param {number} tick
 */
export const computeOrbitalAngle = (baseAngle, speed, tick) => baseAngle + speed * tick;

