import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const panelPath = path.resolve('src/components/PhenomenalBridgePanel.jsx');
const enginePath = path.resolve('src/components/SimulationEngine.jsx');

try {
  const panelSource = fs.readFileSync(panelPath, 'utf8');
  const engineSource = fs.readFileSync(enginePath, 'utf8');

  assert.match(panelSource, /memo\(function PhenomenalBridgePanel/, 'Panel must use React.memo.');
  assert.match(panelSource, /throttleWindow/, 'Panel must throttle by tick bucket.');
  assert.match(panelSource, /Pi_D/, 'Panel must expose Paper 9 bridge predicates.');
  assert.match(panelSource, /stage3_6b_runtime_health_and_stage3_7_opening_defined/, 'Panel must expose Paper 10 state.');
  assert.match(panelSource, /Interpretation boundary/, 'Panel must expose an interpretation boundary.');
  assert.match(panelSource, /not phenomenality evidence/, 'Panel must keep non-inference visible.');
  assert.doesNotMatch(panelSource, /from 'fs'|from "fs"|require\('fs'\)/, 'Browser panel must not import Node fs-bound layers.');

  assert.match(engineSource, /PhenomenalBridgePanel/, 'SimulationEngine must import and render PhenomenalBridgePanel.');
  assert.match(engineSource, /runtimeHealth=\{runtimeHealth\}/, 'Panel must receive runtime health context.');

  console.log('OK: phenomenal bridge panel wiring passed');
} catch (error) {
  console.error('FAIL: phenomenal bridge panel wiring failed:', error.message);
  process.exit(1);
}
