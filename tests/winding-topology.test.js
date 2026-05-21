import assert from 'node:assert/strict';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';
import { ExperimentalEpisodeHarness } from '../src/experiments/ExperimentalEpisodeHarness.js';

const makeCoreWithWinding = (rawWinding) => {
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;
  core.stateHistory = Array.from({ length: 24 }, (_, index) => Math.sin(index / 3));
  core._generateTestPaths = () => [[0, 1, 0, -1, 0]];
  core._calculateWindingNumber = () => rawWinding;
  return core;
};

try {
  {
    const core = makeCoreWithWinding(2.3);
    const holonomy = core.testHolonomy();

    assert.ok(Math.abs(holonomy.raw_winding_number - 2.3) < 1e-9, 'CASE 1 FAIL: raw winding number must preserve signed float.');
    assert.equal(holonomy.winding_integer, 2, 'CASE 1 FAIL: winding integer must round raw winding.');
    assert.equal(holonomy.winding_orientation, 'counterclockwise', 'CASE 1 FAIL: positive winding must be counterclockwise.');
    assert.equal(holonomy.topo_factor, 1.0, 'CASE 1 FAIL: topo_factor must clamp abs(raw) to 1.0.');
    assert.equal(core.metrics.raw_winding_number, 2.3, 'CASE 1 FAIL: metrics must expose raw winding.');
    assert.equal(core.metrics.winding_integer, 2, 'CASE 1 FAIL: metrics must expose winding integer.');
    assert.equal(core.metrics.winding_orientation, 'counterclockwise', 'CASE 1 FAIL: metrics must expose orientation.');
  }

  {
    const core = makeCoreWithWinding(-1.4);
    const holonomy = core.testHolonomy();

    assert.equal(holonomy.winding_integer, -1, 'CASE 2 FAIL: negative winding integer must preserve sign.');
    assert.equal(holonomy.winding_orientation, 'clockwise', 'CASE 2 FAIL: negative winding must be clockwise.');
    assert.equal(holonomy.topo_factor, 1.0, 'CASE 2 FAIL: topo_factor must use absolute raw winding.');
  }

  {
    const core = new PhenomenologyCore();
    core._diagnostics.log_enabled = false;
    core.stateHistory = [0.1, 0.2, 0.3];
    const holonomy = core.testHolonomy();

    assert.equal(holonomy.raw_winding_number, 0, 'CASE 3 FAIL: insufficient history must report raw winding 0.');
    assert.equal(holonomy.winding_integer, 0, 'CASE 3 FAIL: insufficient history must report integer 0.');
    assert.equal(holonomy.winding_orientation, 'trivial', 'CASE 3 FAIL: insufficient history must be trivial.');
    assert.equal(holonomy.topo_factor, 0, 'CASE 3 FAIL: insufficient history topo_factor must be 0.');
  }

  {
    const harness = new ExperimentalEpisodeHarness({ runMeta: { runId: 'winding_test' }, schemaPath: 'unused' });
    harness.recordDirectMetricSeries({
      winding_number: 1,
      raw_winding_number: 2.3,
      winding_integer: 2,
      winding_orientation: 'counterclockwise',
      topo_factor: 1
    });
    harness.recordDirectMetricSeries({
      winding_orientation: 'clockwise',
      raw_winding_number: -1.4,
      winding_integer: -1,
      topo_factor: 1
    });
    const summary = harness.computeDirectMetricSummary();

    assert.ok(Math.abs(summary.raw_winding_number - 0.45) < 1e-12, 'CASE 4 FAIL: harness must summarize raw winding numeric series.');
    assert.equal(summary.winding_integer, 0.5, 'CASE 4 FAIL: harness must summarize winding integer series.');
    assert.equal(summary.winding_orientation_mode, 'clockwise', 'CASE 4 FAIL: harness must record orientation mode deterministically.');
    assert.equal(summary.topo_factor, 1, 'CASE 4 FAIL: harness must summarize topo_factor.');
  }

  console.log('OK: winding topology tests passed');
} catch (error) {
  console.error('FAIL: winding topology tests failed:', error.message);
  process.exit(1);
}
