import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

try {
  const sourcePath = path.join(process.cwd(), 'src', 'components', 'SimulationEngine.jsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // CASE 1: policy defaults and runtime constants exist
  assert.ok(/LATENCY_STRAIN_ALPHA:\s*0\.18/.test(source), 'CASE 1 FAIL: LATENCY_STRAIN_ALPHA default missing.');
  assert.ok(/LATENCY_STRAIN_BASELINE_MS:\s*800/.test(source), 'CASE 1 FAIL: LATENCY_STRAIN_BASELINE_MS default missing.');
  assert.ok(/LATENCY_STRAIN_SATURATION_MS:\s*12000/.test(source), 'CASE 1 FAIL: LATENCY_STRAIN_SATURATION_MS default missing.');
  assert.ok(/maxActionsPerHour:\s*AUTONOMY_RUNTIME_DEFAULTS\.AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR/.test(source), 'CASE 1 FAIL: maxActionsPerHour default binding missing.');
  assert.ok(/cooldownBetweenActionsMs:\s*90\s*\*\s*1000/.test(source), 'CASE 1 FAIL: cooldownBetweenActionsMs default missing.');
  assert.ok(/llmAutoActionsDisabledAtStrain:\s*0\.75/.test(source), 'CASE 1 FAIL: llmAutoActionsDisabledAtStrain default missing.');

  // CASE 2: strain telemetry is emitted per tick
  assert.ok(/appendIntegrityAudit\('latency_strain_tick'/.test(source), 'CASE 2 FAIL: latency_strain_tick audit missing.');
  assert.ok(/metacognitive_strain:\s*metacognitiveStrain/.test(source), 'CASE 2 FAIL: metacognitive_strain telemetry binding missing.');
  assert.ok(/latency_p95_ms:\s*p95LatencyMs/.test(source), 'CASE 2 FAIL: latency_p95_ms telemetry binding missing.');
  assert.ok(/latency_failure_rate:\s*failureRate/.test(source), 'CASE 2 FAIL: latency_failure_rate telemetry binding missing.');

  // CASE 3: LLM auto actions are gated by strain
  assert.ok(/if \(effectiveIsAscended[\s\S]*&& !llmAutoBlockedByStrain[\s\S]*queueOntologicalAutoAction\('axiom'/.test(source), 'CASE 3 FAIL: axiom auto-action not gated by llmAutoBlockedByStrain.');
  assert.ok(/if \(!llmAutoBlockedByStrain && \(pmiaFlatWarning \|\| metacogDriftWarning \|\| diagnosticIncoherence\)\)/.test(source), 'CASE 3 FAIL: report auto-action not gated by llmAutoBlockedByStrain.');

  // CASE 4: autonomy sandbox action audit path exists
  assert.ok(/appendIntegrityAudit\('autonomy_sandbox_action',\s*\{[\s\S]*stage:\s*'applied'/.test(source), 'CASE 4 FAIL: autonomy_sandbox_action applied audit missing.');
  assert.ok(/appendIntegrityAudit\('autonomy_sandbox_action',\s*\{[\s\S]*stage:\s*'rollback'/.test(source), 'CASE 4 FAIL: autonomy_sandbox_action rollback audit missing.');

  console.log('OK: autonomy budget governor v4.4 test passed');
} catch (error) {
  console.error('FAIL: autonomy budget governor v4.4 test failed:', error.message);
  process.exit(1);
}
