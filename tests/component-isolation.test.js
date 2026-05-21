import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();
const componentDir = path.join(ROOT, 'src', 'components');
const contextDir = path.join(ROOT, 'src', 'contexts');

const componentContracts = [
  ['SimulationEngine.jsx', 'SimulationEngine'],
  ['ControlPanel.jsx', 'ControlPanel'],
  ['TelemetryHUD.jsx', 'TelemetryHUD'],
  ['ChatInterface.jsx', 'ChatInterface'],
  ['NetworkCanvas.jsx', 'NetworkCanvas'],
  ['TabRouter.jsx', 'TabRouter'],
  ['StateProvider.jsx', 'StateProvider'],
  ['ErrorBoundary.jsx', 'QICNErrorBoundary']
];

const stateFields = ['tickCount', 'ccc', 'pmia', 'omega', 'beth_q', 'spectral_gap', 'stasisIndex'];
const configFields = ['simulationControllerRef', 'isRunning', 'currentPhase', 'sensorsMode'];

try {
  for (const [file, namedExport] of componentContracts) {
    const fullPath = path.join(componentDir, file);
    assert.ok(fs.existsSync(fullPath), `component file missing: ${file}`);
    const source = fs.readFileSync(fullPath, 'utf8');
    assert.match(source, /QICNErrorBoundary|SimulationEngine|StateProvider/, `${file} should expose a boundary or top-level orchestrator`);
    assert.ok(source.includes(`export const ${namedExport}`) || source.includes(`export class ${namedExport}`), `${file} must export ${namedExport}`);
    assert.ok(source.includes('export default'), `${file} must provide a default export`);
  }

  const stateSource = fs.readFileSync(path.join(contextDir, 'SimulationStateContext.jsx'), 'utf8');
  for (const field of stateFields) {
    assert.ok(stateSource.includes(field), `SimulationStateContext missing field: ${field}`);
  }

  const configSource = fs.readFileSync(path.join(contextDir, 'SimulationConfigContext.jsx'), 'utf8');
  for (const field of configFields) {
    assert.ok(configSource.includes(field), `SimulationConfigContext missing field: ${field}`);
  }

  const engineSource = fs.readFileSync(path.join(componentDir, 'SimulationEngine.jsx'), 'utf8');
  const controllerInstantiations = [...engineSource.matchAll(/new\s+SimulationController\s*\(/g)].length;
  assert.equal(controllerInstantiations, 1, 'SimulationEngine must instantiate SimulationController exactly once');

  console.log('OK: component isolation contracts passed');
} catch (error) {
  console.error('FAIL: component isolation contracts failed:', error.message);
  process.exit(1);
}
