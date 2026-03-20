/**
 * Pinhole projection utilities (Canvas2D, no WebGL).
 * Deterministic, bounded, and testable.
 */

/**
 * @typedef {{ x: number, y: number }} Center2D
 * @typedef {{
 *  x2d: number,
 *  y2d: number,
 *  scale: number,
 *  depth: number,
 *  clamped: boolean
 * }} ProjectionResult
 * @typedef {{
 *  sMin?: number,
 *  sMax?: number,
 *  depthOffset?: number,
 *  denomEps?: number
 * }} ProjectionLimits
 */

/**
 * Project a 3D point to 2D with pinhole camera.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} rotX
 * @param {number} rotY
 * @param {number} f - focal length
 * @param {Center2D} center
 * @param {ProjectionLimits} [limits]
 * @returns {ProjectionResult}
 */
export const project = (x, y, z, rotX, rotY, f, center, limits = {}) => {
  const sinX = Math.sin(rotX);
  const cosX = Math.cos(rotX);
  const sinY = Math.sin(rotY);
  const cosY = Math.cos(rotY);
  return projectWithTrig(x, y, z, sinX, cosX, sinY, cosY, f, center, limits);
};

/**
 * Project using precomputed sin/cos for performance.
 * @param {number} x
 * @param {number} y
 * @param {number} z
 * @param {number} sinX
 * @param {number} cosX
 * @param {number} sinY
 * @param {number} cosY
 * @param {number} f
 * @param {Center2D} center
 * @param {ProjectionLimits} [limits]
 * @returns {ProjectionResult}
 */
export const projectWithTrig = (x, y, z, sinX, cosX, sinY, cosY, f, center, limits = {}) => {
  const tx = x - center.x;
  const ty = y - center.y;
  const tz = z || 0;

  // Rotate around Y (vertical axis)
  const x1 = tx * cosY + tz * sinY;
  const z1 = tz * cosY - tx * sinY;

  // Rotate around X (horizontal axis)
  const y2 = ty * cosX - z1 * sinX;
  const z2 = z1 * cosX + ty * sinX;

  const sMin = limits.sMin ?? 0.0;
  const sMax = limits.sMax ?? 4.0;
  const depthOffset = limits.depthOffset ?? f;
  const denomEps = limits.denomEps ?? 1e-3;

  const denom = depthOffset + z2;
  const rawScale = f / denom;
  let scale = rawScale;
  let clamped = false;

  if (!Number.isFinite(scale) || denom <= denomEps) {
    scale = sMin;
    clamped = true;
  } else if (scale < sMin || scale > sMax) {
    scale = Math.max(sMin, Math.min(sMax, scale));
    clamped = true;
  }

  const x2d = x1 * scale + center.x;
  const y2d = y2 * scale + center.y;

  return { x2d, y2d, scale, depth: z2, clamped };
};
