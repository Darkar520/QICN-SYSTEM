import { WorldModelEngine } from './WorldModelEngine.js';
import { CognitiveEmergencePlanner } from './CognitiveEmergencePlanner.js';

const DEFAULT_WORLD_MODEL_CONFIG = Object.freeze({
  learningRate: 0.018,
  historyLimit: 256
});

const DEFAULT_PLANNER_CONFIG = Object.freeze({
  horizon: 10,
  sampleCount: 24,
  iterations: 3,
  eliteFraction: 0.25
});

export class SimulationController {
  constructor({
    worldModelConfig = DEFAULT_WORLD_MODEL_CONFIG,
    plannerConfig = DEFAULT_PLANNER_CONFIG,
    worldModel = null,
    planner = null
  } = {}) {
    this.worldModelConfig = { ...worldModelConfig };
    this.plannerConfig = { ...plannerConfig };
    this.worldModel = worldModel || new WorldModelEngine(this.worldModelConfig);
    this.planner = planner || new CognitiveEmergencePlanner(this.plannerConfig);
    this.attachedCore = null;
  }

  attachCore(core) {
    if (!core || typeof core !== 'object') return null;
    core.worldModelEngine = this.worldModel;
    core.cognitivePlanner = this.planner;
    this.attachedCore = core;
    return {
      worldModel: this.worldModel,
      planner: this.planner
    };
  }

  reset() {
    this.worldModel = new WorldModelEngine(this.worldModelConfig);
    this.planner = new CognitiveEmergencePlanner(this.plannerConfig);
    if (this.attachedCore) this.attachCore(this.attachedCore);
    return {
      worldModel: this.worldModel,
      planner: this.planner
    };
  }

  getDiagnostics() {
    return {
      worldModel: this.worldModel?.getDiagnostics?.() || null,
      plannerConfig: { ...this.planner?.config },
      unifiedCoreBinding: Boolean(
        this.attachedCore
        && this.attachedCore.worldModelEngine === this.worldModel
        && this.attachedCore.cognitivePlanner === this.planner
      )
    };
  }
}

export default SimulationController;

