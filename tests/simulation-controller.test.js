import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { SimulationController } from '../src/simulation/SimulationController.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const indexSource = fs.readFileSync(path.join(projectRoot, 'src', 'index.jsx'), 'utf8');
const appSource = fs.readFileSync(path.join(projectRoot, 'src', 'components', 'SimulationEngine.jsx'), 'utf8');

try {
  const controller = new SimulationController();
  const core = new OntologicalSingularityCore({
    worldModelEngine: controller.worldModel,
    cognitivePlanner: controller.planner
  });
  controller.attachCore(core);

  assert.equal(core.worldModelEngine, controller.worldModel, 'core must share controller worldModel');
  assert.equal(core.cognitivePlanner, controller.planner, 'core must share controller planner');
  assert.equal(controller.getDiagnostics().unifiedCoreBinding, true, 'controller diagnostics must confirm unified binding');

  const previousWorldModel = controller.worldModel;
  const previousPlanner = controller.planner;
  const resetState = controller.reset();
  assert.notEqual(resetState.worldModel, previousWorldModel, 'reset must replace worldModel instance');
  assert.notEqual(resetState.planner, previousPlanner, 'reset must replace planner instance');
  assert.equal(core.worldModelEngine, controller.worldModel, 'reset must rebind core worldModel');
  assert.equal(core.cognitivePlanner, controller.planner, 'reset must rebind core planner');

  assert(/import App from '.\/App.jsx'/.test(indexSource), 'index.jsx must delegate to App.jsx');
  assert(!/WorldModelEngine/.test(appSource), 'App.jsx must not instantiate/import WorldModelEngine directly');
  assert(!/CognitiveEmergencePlanner/.test(appSource), 'App.jsx must not instantiate/import CognitiveEmergencePlanner directly');
  assert(/SimulationController/.test(appSource), 'App.jsx must use SimulationController');

  const runSimulationCycleMatch = appSource.match(
    /const\s+runSimulationCycle\s*=\s*useCallback\([\s\S]*?\n\s*\},\s*\[([^\]]*)\]\);/
  );
  assert(runSimulationCycleMatch, 'runSimulationCycle useCallback block must be present');
  const dependencies = runSimulationCycleMatch[1]
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
  assert(dependencies.length <= 4, `runSimulationCycle dependencies must be <= 4, got ${dependencies.length}`);

  console.log('OK: simulation controller unification test passed');
} catch (error) {
  console.error('FAIL: simulation controller unification test failed:', error.message);
  process.exit(1);
}
