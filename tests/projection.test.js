// Minimal unit tests for pinhole projection utilities (Canvas2D)
// Run with: node tests/projection.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const { project, projectWithTrig } = await import('../src/utils/pinhole.js');

  const f = 800;
  const center = { x: 450, y: 325 };
  const limits = { sMin: 0.02, sMax: 4.0, depthOffset: f, denomEps: 1e-3 };

  // Test 1: z near -f (scale explosion) should clamp
  const p1 = project(450, 325, -800, 0, 0, f, center, limits);
  assert(Number.isFinite(p1.scale), 'Scale must be finite at z=-f');
  assert(p1.scale >= limits.sMin && p1.scale <= limits.sMax, 'Scale must be clamped within bounds');
  assert(p1.clamped === true, 'Clamp flag must be true when denom -> 0');

  // Test 2: extreme negative z (behind camera) should clamp to sMin
  const p2 = project(450, 325, -5000, 0, 0, f, center, limits);
  assert(p2.scale === limits.sMin, 'Scale should clamp to sMin when behind camera');
  assert(p2.clamped === true, 'Clamp flag must be true when behind camera');

  // Test 2b: clampHits accounting via clamped flag
  const zs = [-800, -800.000001, -799.999999, -5000, 0, 200, 1000];
  const clampCount = zs.reduce((acc, z) => acc + (project(450, 325, z, 0, 0, f, center, limits).clamped ? 1 : 0), 0);
  assert(clampCount >= 2, 'Expected at least 2 clamped projections in test set');

  // Test 3: rotation consistency with precomputed trig
  const rotX = Math.PI / 4;
  const rotY = Math.PI / 3;
  const sinX = Math.sin(rotX);
  const cosX = Math.cos(rotX);
  const sinY = Math.sin(rotY);
  const cosY = Math.cos(rotY);
  const p3 = project(500, 350, 200, rotX, rotY, f, center, limits);
  const p4 = projectWithTrig(500, 350, 200, sinX, cosX, sinY, cosY, f, center, limits);
  assert(Math.abs(p3.x2d - p4.x2d) < 1e-6, 'projectWithTrig x2d should match project');
  assert(Math.abs(p3.y2d - p4.y2d) < 1e-6, 'projectWithTrig y2d should match project');
  assert(Math.abs(p3.scale - p4.scale) < 1e-9, 'projectWithTrig scale should match project');

  console.log('OK: projection tests passed');
})().catch((err) => {
  console.error('FAIL: projection tests failed:', err.message);
  process.exit(1);
});
