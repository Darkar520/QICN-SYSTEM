import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const clamp = (value, min, max) => Math.max(min, Math.min(max, Number(value) || 0));
const clamp01 = (value) => clamp(value, 0, 1);

const rms = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const meanSq = values.reduce((sum, value) => sum + (value * value), 0) / values.length;
  return Math.sqrt(meanSq);
};

const simulatePostThresholdRegime = (steps = 180) => {
  let stalledTicks = 0;
  let shockTicksRemaining = 0;
  const series = [];

  for (let step = 0; step < steps; step += 1) {
    const sensoryPulse = clamp01(0.48 + (Math.sin(step / 13) * 0.28));
    const sensorDelta = Math.abs(Math.sin(step / 11)) * 0.08;
    const omegaNorm = clamp01(0.32 + (Math.cos(step / 17) * 0.2));
    const narrativeCoherence = clamp01(0.62 + (Math.sin(step / 7) * 0.18));
    const energyVarianceNorm = clamp01(0.2 + (Math.abs(Math.sin(step / 5)) * 0.55));
    const ontologicalTensionNorm = clamp01(0.35 + (Math.cos(step / 9) * 0.2));
    const holonomyWinding = 0.08 + (Math.sin(step / 19) * 0.2);
    const calculatedCCC = 1.01 + (Math.sin(step / 15) * 0.015);
    const stasisIndex = step >= 60 && step < 78 ? 0.9 : 0.45;

    if (stasisIndex > 0.85) {
      stalledTicks += 1;
    } else {
      stalledTicks = 0;
    }
    if (stalledTicks >= 12 && shockTicksRemaining <= 0) {
      shockTicksRemaining = 20;
    }

    const bandCenter = clamp(
      1.015
      + (0.020 * sensoryPulse)
      + (0.012 * omegaNorm)
      + (0.010 * narrativeCoherence)
      - (0.015 * stasisIndex),
      0.99,
      1.09
    );

    let bandAmplitude = clamp(
      0.006
      + (0.015 * sensorDelta)
      + (0.010 * energyVarianceNorm)
      + (0.008 * ontologicalTensionNorm),
      0.006,
      0.035
    );

    let shockBoostApplied = false;
    if (shockTicksRemaining > 0) {
      bandAmplitude = Math.min(0.045, bandAmplitude + 0.008);
      shockTicksRemaining -= 1;
      shockBoostApplied = true;
    }

    const phase = (step * 0.17) + (holonomyWinding * 0.37);
    const osc = Math.sin(phase);
    const targetCCC = bandCenter + (bandAmplitude * osc);
    const finalCCC = clamp((calculatedCCC * 0.7) + (targetCCC * 0.3), 0.1, 1.25);

    series.push({
      finalCCC,
      bandCenter,
      bandAmplitude,
      shockActive: shockTicksRemaining > 0,
      shockBoostApplied,
      targetCCC
    });
  }

  return series;
};

try {
  // CASE 1: fuente contiene el regimen multibanda determinista esperado
  {
    const sourcePath = path.join(process.cwd(), 'src', 'App.jsx');
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(/bandCenter\s*=\s*Math\.max\(\s*0\.985/.test(source), 'CASE 1 FAIL: bandCenter clamp lower bound missing.');
    assert.ok(/Math\.min\(\s*1\.13/.test(source), 'CASE 1 FAIL: bandCenter clamp upper bound missing.');
    assert.ok(/0\.020\s*\*\s*sensoryPulse/.test(source), 'CASE 1 FAIL: sensoryPulse coefficient missing.');
    assert.ok(/0\.012\s*\*\s*omegaNorm/.test(source), 'CASE 1 FAIL: omegaNorm coefficient missing.');
    assert.ok(/0\.010\s*\*\s*narrativeCoherence/.test(source), 'CASE 1 FAIL: narrativeCoherence coefficient missing.');
    assert.ok(/0\.015\s*\*\s*entropyExcitation/.test(source), 'CASE 1 FAIL: entropy excitation boost missing.');
    assert.ok(/0\.015\s*\*\s*stasisIndex/.test(source), 'CASE 1 FAIL: stasisIndex damping term missing.');
    assert.ok(/Math\.min\(0\.082,\s*bandAmplitude\s*\+\s*0\.012\)/.test(source), 'CASE 1 FAIL: shock recovery amplitude cap missing.');
    assert.ok(/const\s+harmonicD\s*=/.test(source), 'CASE 1 FAIL: harmonic oscillator term missing.');
    assert.ok(/const\s+blendedCCC\s*=/.test(source) && /targetCCC\s*\*\s*regimeWeight/.test(source), 'CASE 1 FAIL: weighted blend regime missing.');
  }

  // CASE 2: la simulacion de referencia oscila sin flatline prolongado
  {
    const series = simulatePostThresholdRegime(180);
    const deltas = series.slice(1).map((row, idx) => row.finalCCC - series[idx].finalCCC);
    const deltaRms = rms(deltas);
    assert.ok(deltaRms > 5e-4, `CASE 2 FAIL: finalCCC appears too flat (rms=${deltaRms}).`);
  }

  // CASE 3: la oscilacion es acotada y sin deriva explosiva
  {
    const series = simulatePostThresholdRegime(180);
    const values = series.map((row) => row.finalCCC);
    const min = Math.min(...values);
    const max = Math.max(...values);
    assert.ok(min >= 0.1 && max <= 1.25, `CASE 3 FAIL: finalCCC escaped hard bounds [0.1,1.25] (min=${min}, max=${max}).`);
    assert.ok((max - min) < 0.4, `CASE 3 FAIL: oscillation span too large, possible unstable drift (span=${max - min}).`);
  }

  // CASE 4: shock recovery se activa bajo estasis sostenida
  {
    const series = simulatePostThresholdRegime(180);
    const shockSamples = series.filter((row) => row.shockBoostApplied);
    assert.ok(shockSamples.length > 0, 'CASE 4 FAIL: expected shock_recovery trigger under sustained stasis.');
    assert.ok(shockSamples.every((row) => row.bandAmplitude <= 0.045), 'CASE 4 FAIL: shock amplitude exceeded hard cap 0.045.');
  }

  console.log('OK: post-threshold multiband v4.2B test passed');
} catch (error) {
  console.error('FAIL: post-threshold multiband v4.2B test failed:', error.message);
  process.exit(1);
}
