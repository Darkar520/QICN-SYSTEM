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
  const sourcePath = path.join(process.cwd(), 'src', 'App.jsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // CASE 1: timeline v4.3 acotado a 240 y con trim
  assert.ok(/cccHistoryTimelineRef\s*=\s*useRef\(\{\s*points:\s*\[\],\s*maxPoints:\s*240/s.test(source), 'CASE 1 FAIL: cccHistoryTimelineRef maxPoints=240 missing.');
  assert.ok(/cccTimeline\.points\.length\s*>\s*cccTimeline\.maxPoints/.test(source), 'CASE 1 FAIL: ccc history trim guard missing.');
  assert.ok(/cccTimeline\.points\.shift\(\)/.test(source), 'CASE 1 FAIL: ccc history shift trim missing.');

  // CASE 2: throttle visual <= 10Hz para historial CCC
  assert.ok(/canUpdateCccTimeline\s*=\s*\(nowTs\s*-\s*Number\(cccTimeline\.lastUiUpdateTs\s*\|\|\s*0\)\)\s*>=\s*100/.test(source), 'CASE 2 FAIL: ccc history 10Hz throttle guard missing.');

  // CASE 3: UX interactiva requerida
  assert.ok(/Smoothing/.test(source), 'CASE 3 FAIL: smoothing control label missing.');
  assert.ok(/Freeze chart/.test(source), 'CASE 3 FAIL: freeze chart control missing.');
  assert.ok(/Export snapshot/.test(source), 'CASE 3 FAIL: export snapshot control missing.');
  assert.ok(/onMouseMove=\{handleChartHover\}/.test(source), 'CASE 3 FAIL: hover handler missing.');
  assert.ok(/tick=\{hoverPoint\.tick\}/.test(source), 'CASE 3 FAIL: hover tooltip tick missing.');

  // CASE 4: tooltip multimétrica por tick
  assert.ok(/ccc=\{Number\(hoverPoint\.ccc\s*\|\|\s*0\)\.toFixed\(4\)\}/.test(source), 'CASE 4 FAIL: tooltip ccc missing.');
  assert.ok(/pmia=\{Number\(hoverPoint\.pmia\s*\|\|\s*0\)\.toFixed\(4\)\}/.test(source), 'CASE 4 FAIL: tooltip pmia missing.');
  assert.ok(/omega=\{Number\(hoverPoint\.omega\s*\|\|\s*0\)\.toFixed\(4\)\}/.test(source), 'CASE 4 FAIL: tooltip omega missing.');
  assert.ok(/spectralGap=\{Number\(hoverPoint\.spectralGap\s*\|\|\s*0\)\.toFixed\(4\)\}/.test(source), 'CASE 4 FAIL: tooltip spectralGap missing.');
  assert.ok(/regimeState=\{hoverPoint\.regimeState\s*\|\|\s*'active'\}/.test(source), 'CASE 4 FAIL: tooltip regimeState missing.');

  // CASE 5: smoothing no muta fuente + clamp [1..20]
  assert.ok(/Math\.max\(1,\s*Math\.min\(20,\s*Number\(windowSize\)\s*\|\|\s*1\)\)/.test(source), 'CASE 5 FAIL: smoothing clamp [1,20] missing.');
  {
    const sample = [0.2, 0.9, 0.1, 0.7, 0.4];
    const original = sample.slice();
    const smoothed = smoothSeriesReference(sample, 4);
    assert.deepEqual(sample, original, 'CASE 5 FAIL: smoothing mutated source array.');
    assert.equal(smoothed.length, sample.length, 'CASE 5 FAIL: smoothing changed length.');
  }

  // CASE 6: banda post-umbral opcional y auditable
  assert.ok(/showBand:\s*true/.test(source), 'CASE 6 FAIL: showBand toggle default missing.');
  assert.ok(/cccHistoryUiState\.showBand\s*&&\s*bandAreaPoints/.test(source), 'CASE 6 FAIL: band area conditional render missing.');
  assert.ok(/appendIntegrityAudit\('ccc_history_snapshot_export'/.test(source), 'CASE 6 FAIL: ccc_history_snapshot_export audit event missing.');

  console.log('OK: ccc history interactive v4.3 test passed');
} catch (error) {
  console.error('FAIL: ccc history interactive v4.3 test failed:', error.message);
  process.exit(1);
}
