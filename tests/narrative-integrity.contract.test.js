// Contract tests for narrative integrity hardening.
// Run with: node tests/narrative-integrity.contract.test.js

import assert from 'node:assert/strict';
import { validateNarrativeIntegrity } from '../src/utils/narrativeIntegrity.js';

const minimalMetrics = {
  ccc: 0.9138,
  pmia: 0.6512,
  beth_q: 0.9807,
  omega: 1.8052,
  spectral_gap: 0.4347,
  winding_number: 0.218,
  lipschitz_norm_K: 0.063,
  magnification_M: 1.024,
  simulationStep: 163,
  activeNodes: 1500,
  depthMin: 0,
  depthMax: 0,
  clampHits: 0,
  recoveryTriggers: 0,
  rotationX: 0,
  rotationY: 0
};
const metricsWithRelaxationTime = {
  ...minimalMetrics,
  relaxation_time: 12.4
};

const hasType = (validation, type) =>
  (validation.discrepancies || []).some((entry) => entry?.type === type);

try {
  // CASE 1: Strict + structure ok => no STRUCTURAL_FAILURE
  {
    const text = `
[CALCULOS_DEL_CORE]
beth_q: 0.9807
activeNodes: 1500
[TRADUCCION_LINGUISTICA]
Estado interno estable y verificable.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(!hasType(result, 'STRUCTURAL_FAILURE'), 'CASE 1 FAIL: structure should be accepted.');
  }

  // CASE 2: Strict + missing section => STRUCTURAL_FAILURE high
  {
    const text = `beth_q: 0.9807`;
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(hasType(result, 'STRUCTURAL_FAILURE'), 'CASE 2 FAIL: expected STRUCTURAL_FAILURE.');
    const structural = result.discrepancies.find((d) => d.type === 'STRUCTURAL_FAILURE');
    assert.equal(structural?.severity, 'high', 'CASE 2 FAIL: strict STRUCTURAL_FAILURE must be high.');
  }

  // CASE 3: Hallucinated file path => HALLUCINATED_FILES high
  {
    const text = `
[CALCULOS_DEL_CORE]
Revisa src/simulation/causal_engine.js para aplicar el ajuste.
[TRADUCCION_LINGUISTICA]
Se requiere una mejora.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(hasType(result, 'HALLUCINATED_FILES'), 'CASE 3 FAIL: expected HALLUCINATED_FILES.');
    const issue = result.discrepancies.find((d) => d.type === 'HALLUCINATED_FILES');
    assert.equal(issue?.severity, 'high', 'CASE 3 FAIL: HALLUCINATED_FILES must be high.');
  }

  // CASE 4: Route with .ts => HALLUCINATED_EXTENSION medium
  {
    const text = `
[CALCULOS_DEL_CORE]
Aplicar cambios en src/simulation/causal_engine.ts.
[TRADUCCION_LINGUISTICA]
Ruta de ejemplo.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(hasType(result, 'HALLUCINATED_EXTENSION'), 'CASE 4 FAIL: expected HALLUCINATED_EXTENSION.');
    const issue = result.discrepancies.find((d) => d.type === 'HALLUCINATED_EXTENSION');
    assert.equal(issue?.severity, 'medium', 'CASE 4 FAIL: HALLUCINATED_EXTENSION must be medium.');
  }

  // CASE 5: [HIPOTETICO] path => no hallucinated file/extension flags
  {
    const text = `
[CALCULOS_DEL_CORE]
[HIPOTETICO] src/simulation/causal_engine.ts
[TRADUCCION_LINGUISTICA]
Propuesta hipotetica.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(!hasType(result, 'HALLUCINATED_FILES'), 'CASE 5 FAIL: hypothetical file should not be flagged.');
    assert.ok(!hasType(result, 'HALLUCINATED_EXTENSION'), 'CASE 5 FAIL: hypothetical extension should not be flagged.');
  }

  // CASE 6: Strict metric mismatch => high + blocking
  {
    const text = `
[CALCULOS_DEL_CORE]
simulationStep: 200
[TRADUCCION_LINGUISTICA]
Valor no coincide.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const mismatch = result.discrepancies.find(
      (d) => d.type === 'VALUE_MISMATCH' && d.metric === 'simulationStep'
    );
    assert.ok(Boolean(mismatch), 'CASE 6 FAIL: expected strict metric mismatch.');
    assert.equal(mismatch?.severity, 'high', 'CASE 6 FAIL: strict mismatch must be high.');
    assert.equal(result.blocking, true, 'CASE 6 FAIL: strict mismatch must be blocking.');
  }

  // CASE 7: Real files from src/simulation and js/simulation => no false positive
  {
    const text = `
[CALCULOS_DEL_CORE]
Archivo real: src/simulation/ConsciousNode.js
Archivo real: js/simulation/ConsciousNode.js
[TRADUCCION_LINGUISTICA]
Referencias validas.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(!hasType(result, 'HALLUCINATED_FILES'), 'CASE 7 FAIL: real simulation files should be accepted.');
  }

  // CASE 8 v3.5: Syntactic attribution of hallucinated method => HALLUCINATED_METHOD
  // New detector fires only on DIRECT syntax: 'File.js -> method()'
  {
    const text = `
[CALCULOS_DEL_CORE]
- CCC: 1.4895 (InformationalEntanglementField.js -> globalPhaseSync())
[TRADUCCION_LINGUISTICA]
Implementacion directa en el sustrato.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const hasFlag = result.discrepancies.some((d) => d.type === 'HALLUCINATED_METHOD');
    assert.ok(hasFlag, 'CASE 8 FAIL: "InformationalEntanglementField.js -> globalPhaseSync()" should be HALLUCINATED_METHOD.');
  }

  // CASE 9 v3.5: Real method with direct attribution => no HALLUCINATED_METHOD
  {
    const text = `
[CALCULOS_DEL_CORE]
- CCC: 1.4895 (InformationalEntanglementField.js -> calculateCCC())
[TRADUCCION_LINGUISTICA]
La cohesion es suficiente para mantener el estado actual.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const hasFlag = result.discrepancies.some((d) => d.type === 'HALLUCINATED_METHOD');
    assert.ok(!hasFlag, 'CASE 9 FAIL: "InformationalEntanglementField.js -> calculateCCC()" should NOT be flagged (real method).');
  }

  // CASE 10 v3.5: evalKaizen with direct attribution => HALLUCINATED_METHOD, message suggests evaluate()
  {
    const text = `
[CALCULOS_DEL_CORE]
Activar MetaSovereigntyCheck.js -> evalKaizen() para rechazar actualizaciones externas.
[TRADUCCION_LINGUISTICA]
La soberania se refuerza.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const flag = result.discrepancies.find((d) => d.type === 'HALLUCINATED_METHOD');
    assert.ok(flag, 'CASE 10 FAIL: "MetaSovereigntyCheck.js -> evalKaizen()" should be HALLUCINATED_METHOD.');
    assert.ok(flag.message.includes('evaluate'), 'CASE 10 FAIL: message should suggest evaluate().');
    assert.equal(result.blocking, true, 'CASE 10 FAIL: HALLUCINATED_METHOD must be blocking.');
  }

  // CASE 12 (ANTI-REGRESION): Window collision false positive — THE BUG THAT OCCURRED IN PRODUCTION
  // LLM cites calculateCCC from IEF and calculatePMIA from OSC correctly,
  // then mentions PhenomenologyCore.js for its own methods. Old detector (window-based)
  // would capture calculateCCC/PMIA in PhenomenologyCore's window and flag them falsely.
  // New detector (attribution-based) must NOT flag this.
  {
    const text = `
[CALCULOS_DEL_CORE]
- CCC: 1.4895 (InformationalEntanglementField.js -> calculateCCC())
- PMIA: 0.3488 (OntologicalSingularityCore.js -> calculatePMIA())
- beth_q: 0.9206 (PhenomenologyCore.js -> calculateBethQ())
[TRADUCCION_LINGUISTICA]
El sistema opera con alta cohesion causal.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const hasFlag = result.discrepancies.some((d) => d.type === 'HALLUCINATED_METHOD');
    assert.ok(
      !hasFlag,
      'CASE 12 FAIL (anti-regression): calculateCCC and calculatePMIA are correcty attributed '
      + 'to their real files. PhenomenologyCore.js must NOT flag them. '
      + 'This was the production bug in v3.3.'
    );
  }

  // CASE 11: "infinito" in mathematical context should NOT trigger GASEOUS_JARGON
  {
    const text = `
[CALCULOS_DEL_CORE]
Rango esperado de Capa: [0, ∞) con limites matematicos.
[TRADUCCION_LINGUISTICA]
Descripcion formal sin narrativa ornamental.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    assert.ok(!hasType(result, 'GASEOUS_JARGON'), 'CASE 11 FAIL: infinito in math context should not be flagged.');
  }

  // CASE 13 v3.6: Fabricated math term "Correlacion V8" => MATH_VOCAB_FABRICATED (medium, non-blocking)
  {
    const text = `
[CALCULOS_DEL_CORE]
Correlación V8: 0.88
[TRADUCCION_LINGUISTICA]
Propuesta de metrica no implementada.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const issue = result.discrepancies.find((d) => d.type === 'MATH_VOCAB_FABRICATED');
    assert.ok(issue, 'CASE 13 FAIL: expected MATH_VOCAB_FABRICATED for Correlacion V8.');
    assert.equal(issue?.severity, 'medium', 'CASE 13 FAIL: must be medium severity.');
    assert.equal(result.blocking, false, 'CASE 13 FAIL: must remain non-blocking.');
  }

  // CASE 14 v3.6: "relaxation_time" sin metrica real => MATH_VOCAB_FABRICATED (medium, non-blocking)
  {
    const text = `
[CALCULOS_DEL_CORE]
relaxation_time: 12.4
[TRADUCCION_LINGUISTICA]
Uso de termino sin respaldo metrologico.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const issue = result.discrepancies.find((d) => d.type === 'MATH_VOCAB_FABRICATED');
    assert.ok(issue, 'CASE 14 FAIL: expected MATH_VOCAB_FABRICATED for relaxation_time.');
    assert.equal(issue?.severity, 'medium', 'CASE 14 FAIL: must be medium severity.');
    assert.equal(result.blocking, false, 'CASE 14 FAIL: must remain non-blocking.');
  }

  // CASE 15 v3.6: Pattern Concepto_[A-Z][0-9] => MATH_VOCAB_FABRICATED (medium, non-blocking)
  {
    const text = `
[CALCULOS_DEL_CORE]
Curvatura_Z9: 0.21
[TRADUCCION_LINGUISTICA]
Token sintetico no implementado.
    `.trim();
    const result = validateNarrativeIntegrity(text, minimalMetrics, { strictMode: true });
    const issue = result.discrepancies.find((d) => d.type === 'MATH_VOCAB_FABRICATED');
    assert.ok(issue, 'CASE 15 FAIL: expected MATH_VOCAB_FABRICATED for Concepto_[A-Z][0-9].');
    assert.equal(issue?.severity, 'medium', 'CASE 15 FAIL: must be medium severity.');
    assert.equal(result.blocking, false, 'CASE 15 FAIL: must remain non-blocking.');
  }

  // CASE 16 v4.2B: "relaxation_time" con metrica real disponible => NO MATH_VOCAB_FABRICATED
  {
    const text = `
[CALCULOS_DEL_CORE]
relaxation_time: 12.4
[TRADUCCION_LINGUISTICA]
Metrica validada y anclada al snapshot.
    `.trim();
    const result = validateNarrativeIntegrity(text, metricsWithRelaxationTime, { strictMode: true });
    assert.ok(!hasType(result, 'MATH_VOCAB_FABRICATED'), 'CASE 16 FAIL: relaxation_time should be accepted when present in metrics.');
    assert.equal(result.blocking, false, 'CASE 16 FAIL: should remain non-blocking.');
  }

  console.log('OK: narrative integrity contract test passed');
} catch (error) {
  console.error('FAIL: narrative integrity contract test failed:', error.message);
  process.exit(1);
}
