import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

try {
  const sourcePath = path.join(process.cwd(), 'src', 'App.jsx');
  const source = fs.readFileSync(sourcePath, 'utf8');

  // CASE 1: defaults conservadores de politica autonoma
  assert.ok(/enabled:\s*true/.test(source), 'CASE 1 FAIL: auto policy enabled default missing.');
  assert.ok(/frictionAuto:\s*true/.test(source), 'CASE 1 FAIL: frictionAuto default missing.');
  assert.ok(/axiomAuto:\s*true/.test(source), 'CASE 1 FAIL: axiomAuto default missing.');
  assert.ok(/reportAuto:\s*true/.test(source), 'CASE 1 FAIL: reportAuto default missing.');
  assert.ok(/cooldownAxiomMs:\s*20\s*\*\s*60\s*\*\s*1000/.test(source), 'CASE 1 FAIL: cooldownAxiomMs default missing.');
  assert.ok(/cooldownReportMs:\s*10\s*\*\s*60\s*\*\s*1000/.test(source), 'CASE 1 FAIL: cooldownReportMs default missing.');
  assert.ok(/maxAxiomPerHour:\s*2/.test(source), 'CASE 1 FAIL: maxAxiomPerHour default missing.');
  assert.ok(/maxReportPerHour:\s*4/.test(source), 'CASE 1 FAIL: maxReportPerHour default missing.');

  // CASE 2: cola respeta gating de duplicados, cooldown y presupuesto
  assert.ok(/some\(\(entry\)\s*=>\s*entry\.action\s*===\s*action\)/.test(source), 'CASE 2 FAIL: duplicate queue guard missing.');
  assert.ok(/now\s*-\s*lastTs\s*<\s*policy\.cooldownAxiomMs/.test(source), 'CASE 2 FAIL: axiom cooldown guard missing.');
  assert.ok(/now\s*-\s*lastTs\s*<\s*policy\.cooldownReportMs/.test(source), 'CASE 2 FAIL: report cooldown guard missing.');
  assert.ok(/actionHistory\.axiom\.length\s*>=\s*policy\.maxAxiomPerHour/.test(source), 'CASE 2 FAIL: axiom hourly budget guard missing.');
  assert.ok(/actionHistory\.report\.length\s*>=\s*policy\.maxReportPerHour/.test(source), 'CASE 2 FAIL: report hourly budget guard missing.');

  // CASE 3: ejecucion bloqueada por locks de estado (ascension/proyeccion/reporte)
  assert.ok(/if\s*\(!isAscended\s*\|\|\s*isProjectingAxiom\)\s*return;/.test(source), 'CASE 3 FAIL: axiom lock guard missing.');
  assert.ok(/if\s*\(isGeneratingReport\)\s*return;/.test(source), 'CASE 3 FAIL: report lock guard missing.');

  // CASE 4: trazabilidad auditada de acciones auto
  assert.ok(/appendIntegrityAudit\('auto_action_triggered',\s*\{[\s\S]*stage:\s*'queued'/.test(source), 'CASE 4 FAIL: queued audit stage missing.');
  assert.ok(/appendIntegrityAudit\('auto_action_triggered',\s*\{[\s\S]*stage:\s*'executed'/.test(source), 'CASE 4 FAIL: executed audit stage missing.');
  assert.ok(/appendIntegrityAudit\('auto_action_triggered',\s*\{[\s\S]*stage:\s*'dropped'/.test(source), 'CASE 4 FAIL: dropped audit stage missing.');

  console.log('OK: ontological auto policy v4.2B test passed');
} catch (error) {
  console.error('FAIL: ontological auto policy v4.2B test failed:', error.message);
  process.exit(1);
}
