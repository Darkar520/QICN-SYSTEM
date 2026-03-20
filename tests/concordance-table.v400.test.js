import assert from 'node:assert/strict';
import { validateNarrativeIntegrity, extractMetricCitations } from '../src/utils/narrativeIntegrity.js';

const baseMetrics = {
  ccc: 1.0,
  pmia: 0.5,
  beth_q: 0.9,
  omega: 2.0,
  simulationStep: 100,
  activeNodes: 1500,
  depthMin: 0,
  depthMax: 0,
  clampHits: 0,
  recoveryTriggers: 0,
  rotationX: 0,
  rotationY: 0
};

try {
  // CASE 1: citas multiples con line/column
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'CCC: 1.00',
      'PMIA: 0.50',
      '[TRADUCCION_LINGUISTICA]',
      'Estado consistente.'
    ].join('\n');
    const citations = extractMetricCitations(text);
    const cccRow = citations.find((row) => row.metric === 'ccc');
    const pmiaRow = citations.find((row) => row.metric === 'pmia');
    assert.ok(cccRow, 'CASE 1 FAIL: ccc citation missing.');
    assert.ok(pmiaRow, 'CASE 1 FAIL: pmia citation missing.');
    assert.equal(cccRow.line, 2, 'CASE 1 FAIL: ccc line mismatch.');
    assert.equal(pmiaRow.line, 3, 'CASE 1 FAIL: pmia line mismatch.');
    assert.ok(Number(cccRow.column) >= 1, 'CASE 1 FAIL: ccc column must be >= 1.');
  }

  // CASE 2: strict mismatch => out_of_tolerance high
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'simulationStep: 101',
      '[TRADUCCION_LINGUISTICA]',
      'Metrica strict desplazada.'
    ].join('\n');
    const result = validateNarrativeIntegrity(text, baseMetrics, { strictMode: true });
    const row = result.concordance.rows.find((entry) => entry.metric === 'simulationStep');
    assert.ok(row, 'CASE 2 FAIL: simulationStep row missing.');
    assert.equal(row.status, 'out_of_tolerance', 'CASE 2 FAIL: strict mismatch must be out_of_tolerance.');
    assert.equal(row.severity, 'high', 'CASE 2 FAIL: strict mismatch must be high.');
  }

  // CASE 3: no strict <= 5% => within_tolerance
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'ccc: 1.03',
      '[TRADUCCION_LINGUISTICA]',
      'Desviacion menor.'
    ].join('\n');
    const result = validateNarrativeIntegrity(text, baseMetrics, { strictMode: true });
    const row = result.concordance.rows.find((entry) => entry.metric === 'ccc');
    assert.ok(row, 'CASE 3 FAIL: ccc row missing.');
    assert.equal(row.status, 'within_tolerance', 'CASE 3 FAIL: ccc should be within tolerance.');
  }

  // CASE 4: no strict > 5% => out_of_tolerance
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'ccc: 1.30',
      '[TRADUCCION_LINGUISTICA]',
      'Desviacion alta.'
    ].join('\n');
    const result = validateNarrativeIntegrity(text, baseMetrics, { strictMode: true });
    const row = result.concordance.rows.find((entry) => entry.metric === 'ccc');
    assert.ok(row, 'CASE 4 FAIL: ccc row missing.');
    assert.equal(row.status, 'out_of_tolerance', 'CASE 4 FAIL: ccc should be out_of_tolerance.');
  }

  // CASE 5: metrica no disponible => metric_not_found
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'retro_flux_weight: 0.22',
      '[TRADUCCION_LINGUISTICA]',
      'Metrica fuera de snapshot.'
    ].join('\n');
    const result = validateNarrativeIntegrity(text, baseMetrics, { strictMode: true });
    const row = result.concordance.rows.find((entry) => entry.metric === 'retro_flux_weight');
    assert.ok(row, 'CASE 5 FAIL: retro_flux_weight row missing.');
    assert.equal(row.status, 'metric_not_found', 'CASE 5 FAIL: metric must be flagged as metric_not_found.');
  }

  // CASE 6: regression blocking policy remains strict-high only
  {
    const text = [
      '[CALCULOS_DEL_CORE]',
      'simulationStep: 99',
      '[TRADUCCION_LINGUISTICA]',
      'Debe bloquear en strict.'
    ].join('\n');
    const result = validateNarrativeIntegrity(text, baseMetrics, { strictMode: true });
    assert.equal(result.blocking, true, 'CASE 6 FAIL: strict mismatch must keep blocking=true.');
  }

  console.log('OK: concordance table v4.0 test passed');
} catch (error) {
  console.error('FAIL: concordance table v4.0 test failed:', error.message);
  process.exit(1);
}
