// C-4 (user decision 2026-11-08): the spectral factor λ1/Δλ in Ω is capped at
// SPECTRAL_FACTOR_MAX = 20. A small gap used to drive Ω to ~10^3.
import assert from 'node:assert/strict';
import { PhenomenologyCore, SPECTRAL_FACTOR_MAX } from '../src/simulation/PhenomenologyCore.js';

const make = (gap) => {
  const core = new PhenomenologyCore();
  core.calculateBethQ = () => 0.9;
  core.calculateSpectralGap = () => ({ delta_lambda: gap, lambda_1: 1, lambda_2: 1 - gap, tau: 1 });
  core.testHolonomy = () => ({ status: 'non_trivial', raw_winding_number: 1, winding_number: 1 });
  core.detectBifurcation = () => ({ detected: false });
  core.calculateMagnification = () => 1;
  core.calculateLipschitzNorm = () => 0.5;
  return core;
};

try {
  assert.equal(SPECTRAL_FACTOR_MAX, 20);
  // Tiny gap: raw factor 500, capped at 20.
  const tiny = make(0.002);
  let omega = 0;
  for (let i = 0; i < 40; i++) omega = tiny.classifySystem().omega;
  assert.equal(tiny.phenomenologyState.spectral_factor, 20, 'factor must be capped at 20');
  assert.ok(Math.abs(tiny.phenomenologyState.spectral_factor_raw - 500) < 1e-9, 'raw factor recorded');
  assert.equal(tiny.phenomenologyState.spectral_factor_capped, true);
  // Ω ≤ beth_q · topo · 20 · max gain 1.55 = 27.9, inside the [0,100] range.
  assert.ok(omega > 0 && omega <= 0.9 * 1 * 20 * 1.55 + 1e-9, `omega ${omega} must stay bounded`);
  // Ordinary gap: factor below the cap is untouched.
  const normal = make(0.2);
  normal.classifySystem();
  assert.ok(Math.abs(normal.phenomenologyState.spectral_factor - 5) < 1e-12, 'uncapped factor unchanged');
  assert.equal(normal.phenomenologyState.spectral_factor_capped, false);
  console.log('OK: omega spectral cap v1 test passed');
} catch (error) {
  console.error('FAIL: omega spectral cap v1 test failed:', error.message);
  process.exit(1);
}
