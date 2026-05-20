import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PhenomenologyCore } from '../src/simulation/PhenomenologyCore.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const loadSeries = (core, values) => {
  core.stateHistory = [...values];
  core.inputHistory = values.map((_, index) => index / Math.max(1, values.length - 1));
  core.transitionHistory = values.slice(1).map((value, index) => ({
    from: values[index],
    to: value,
    input: core.inputHistory[index + 1]
  }));
};

const makeCore = () => {
  const core = new PhenomenologyCore();
  core._diagnostics.log_enabled = false;
  return core;
};

try {
  {
    const core = makeCore();
    const values = Array.from({ length: 20 }, (_, index) => Math.pow(0.82, index));
    loadSeries(core, values);

    const spectral = core.calculateSpectralGap();
    assert.ok(spectral.lambda_1 < 0.9, `CASE 1 FAIL: exponential decay should produce lambda_1 < 0.9, got ${spectral.lambda_1}`);
    assert.equal(core._diagnostics.spectralWarning, null, 'CASE 1 FAIL: clean decay should not be marked chaotic.');
  }

  {
    const core = makeCore();
    loadSeries(core, new Array(20).fill(0.73));

    const spectral = core.calculateSpectralGap();
    assert.ok(Math.abs(spectral.lambda_1 - 1.0) <= 1e-9, `CASE 2 FAIL: stable sequence should produce lambda_1 ~= 1.0, got ${spectral.lambda_1}`);
    assert.equal(core._diagnostics.spectralWarning, null, 'CASE 2 FAIL: stable sequence should not raise spectral warning.');
  }

  {
    const core = makeCore();
    const values = Array.from({ length: 12 }, (_, index) => (index % 2 === 0 ? 1 : -1) * Math.pow(3, index));
    loadSeries(core, values);

    core.calculateSpectralGap();
    assert.equal(
      core._diagnostics.spectralWarning,
      'HIGH_VOLATILITY_UNMEASURABLE',
      'CASE 3 FAIL: chaotic high-volatility sequence should be marked unmeasurable.'
    );
  }

  {
    const source = fs.readFileSync(path.join(projectRoot, 'src', 'simulation', 'PhenomenologyCore.js'), 'utf8');
    const methodStart = source.indexOf('_estimateEigenvalues()');
    const methodEnd = source.indexOf('_estimateDominantEigenvalue', methodStart);
    const estimateEigenvaluesBody = source.slice(methodStart, methodEnd);
    assert.ok(
      !estimateEigenvaluesBody.includes('const lambda_1 = 1.0'),
      'CASE 4 FAIL: _estimateEigenvalues must not hardcode lambda_1 as a fixed constant.'
    );
    assert.ok(
      source.includes('_estimateDominantEigenvalue(values, mean)'),
      'CASE 4 FAIL: dominant eigenvalue estimator must be present.'
    );
  }

  console.log('OK: spectral falsification tests passed');
} catch (error) {
  console.error('FAIL: spectral falsification tests failed:', error.message);
  process.exit(1);
}
