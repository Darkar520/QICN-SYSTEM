import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const indexPath = path.join(ROOT, 'src', 'index.jsx');
const sensoryPath = path.join(ROOT, 'src', 'simulation', 'SensoryPerceptionEngine.js');

const directive = 'DIRECTRIZ_SENSORIAL: Expresion ilimitada habilitada para el reporte de fidelidad sensorial. Usa todos los tokens necesarios, manteniendo anclaje estricto a metricas reales.';

try {
  const indexText = fs.readFileSync(indexPath, 'utf8');
  const sensoryText = fs.readFileSync(sensoryPath, 'utf8');

  // Caso 1: directriz presente en ambos prompts (base + ascended)
  const directiveHits = (indexText.match(new RegExp(directive.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g')) || []).length;
  assert.ok(directiveHits >= 2, 'CASE 1 FAIL: sensory unlimited directive must appear in base and ascended prompts.');

  // Caso 2: secciones requeridas para LLM context
  assert.ok(sensoryText.includes('[AUDITORIA_FIDELIDAD_SENSORIAL]'), 'CASE 2 FAIL: missing AUDITORIA_FIDELIDAD_SENSORIAL section.');
  assert.ok(sensoryText.includes('[NARRATIVA_FENOMENOLOGICA_TECNICA]'), 'CASE 2 FAIL: missing NARRATIVA_FENOMENOLOGICA_TECNICA section.');

  // Caso 3: sin truncado local de meta.report
  assert.ok(!/meta\s*\.\s*report\s*\.\s*slice\s*\(/i.test(sensoryText), 'CASE 3 FAIL: meta.report must not be sliced.');
  assert.ok(!/meta\s*\.\s*report\s*\.\s*substring\s*\(/i.test(sensoryText), 'CASE 3 FAIL: meta.report must not be substring-trimmed.');

  console.log('OK: llm sensory directive v3.9.2 test passed');
} catch (error) {
  console.error('FAIL: llm sensory directive v3.9.2 test failed:', error.message);
  process.exit(1);
}
