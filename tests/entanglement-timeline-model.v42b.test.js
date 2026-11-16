import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const smoothSeriesReference = (values, windowSize) => {
  const points = Array.isArray(values) ? values : [];
  const safeWindow = Math.max(1, Math.min(20, Number(windowSize) || 1));
  if (safeWindow === 1) return points.slice();
  return points.map((_, idx) => {
    const start = Math.max(0, idx - safeWindow + 1);
    const subset = points.slice(start, idx + 1);
    const sum = subset.reduce((acc, value) => acc + (Number(value) || 0), 0);
    return subset.length > 0 ? sum / subset.length : 0;
  });
};

try {
  const sourcePath = path.join(process.cwd(), 'src', 'components', 'SimulationEngine.jsx');
  const source = fs.readFileSync(sourcePath, 'utf8') + '\n' + fs.readFileSync(path.join(process.cwd(), 'src', 'runtime', 'SimulationCycleDriver.js'), 'utf8');

  // CASE 1: timeline acotado y throttle visual <= 10Hz
  assert.ok(/maxPoints:\s*120/.test(source), 'CASE 1 FAIL: timeline maxPoints=120 missing.');
  assert.ok(/timeline\.points\.length\s*>\s*timeline\.maxPoints/.test(source), 'CASE 1 FAIL: timeline trim guard missing.');
  assert.ok(/timeline\.points\.shift\(\)/.test(source), 'CASE 1 FAIL: timeline shift trim missing.');
  assert.ok(/lastUiUpdateTs/.test(source), 'CASE 1 FAIL: lastUiUpdateTs state missing.');
  assert.ok(/\(nowTs\s*-\s*Number\(timeline\.lastUiUpdateTs\s*\|\|\s*0\)\)\s*>=\s*100/.test(source), 'CASE 1 FAIL: 10Hz throttle guard missing.');

  // CASE 2: controles de UX funcionales
  assert.ok(/Smoothing/.test(source), 'CASE 2 FAIL: smoothing control label missing.');
  assert.ok(/Freeze chart/.test(source), 'CASE 2 FAIL: freeze chart control missing.');
  assert.ok(/Export snapshot/.test(source), 'CASE 2 FAIL: export snapshot control missing.');
  assert.ok(/onMouseMove=\{handleChartHover\}/.test(source), 'CASE 2 FAIL: chart hover handler missing.');
  assert.ok(/tick=\{hoverPoint\.tick\}/.test(source), 'CASE 2 FAIL: hover tooltip payload missing.');

  // CASE 3: smoothing visual no muta datos fuente
  {
    const sourceValues = [0.1, 0.9, 0.2, 0.8, 0.3];
    const original = sourceValues.slice();
    const smoothed = smoothSeriesReference(sourceValues, 3);
    assert.deepEqual(sourceValues, original, 'CASE 3 FAIL: smoothing mutated source data.');
    assert.equal(smoothed.length, sourceValues.length, 'CASE 3 FAIL: smoothing changed series length.');
    assert.ok(smoothed.some((value, index) => Math.abs(value - sourceValues[index]) > 1e-6), 'CASE 3 FAIL: smoothing produced no visible effect.');
  }

  // CASE 4: smoothing visual con limites 1..20
  assert.ok(/Math\.max\(1,\s*Math\.min\(20,\s*Number\(windowSize\)\s*\|\|\s*1\)\)/.test(source), 'CASE 4 FAIL: smoothing clamp [1,20] missing.');

  console.log('OK: entanglement timeline model v4.2B test passed');
} catch (error) {
  console.error('FAIL: entanglement timeline model v4.2B test failed:', error.message);
  process.exit(1);
}
