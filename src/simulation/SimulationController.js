// @ts-check

import { WorldModelEngine } from './WorldModelEngine.js';
import { CognitiveEmergencePlanner } from './CognitiveEmergencePlanner.js';
import { createLogger } from '../utils/logger.js';

/**
 * @typedef {Object} SimulationControllerOptions
 * @property {Record<string, unknown>} [worldModelConfig]
 * @property {Record<string, unknown>} [plannerConfig]
 * @property {WorldModelEngine|null} [worldModel]
 * @property {CognitiveEmergencePlanner|null} [planner]
 */

/**
 * @typedef {Object} ControllerAttachment
 * @property {WorldModelEngine} worldModel
 * @property {CognitiveEmergencePlanner} planner
 */

/**
 * @typedef {Object} ControllerDiagnostics
 * @property {unknown} worldModel
 * @property {Record<string, unknown>} plannerConfig
 * @property {boolean} unifiedCoreBinding
 */

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

const logger = createLogger('SimulationController');

export class SimulationController {
  /**
   * @param {SimulationControllerOptions} [options]
   */
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

  /**
   * @param {Record<string, unknown>} core
   * @returns {ControllerAttachment|null}
   */
  attachCore(core) {
    if (!core || typeof core !== 'object') {
      logger.warn('attach_skipped_invalid_core');
      return null;
    }
    core.worldModelEngine = this.worldModel;
    core.cognitivePlanner = this.planner;
    this.attachedCore = core;
    logger.info('attach_core', {
      unifiedCoreBinding: core.worldModelEngine === this.worldModel && core.cognitivePlanner === this.planner
    });
    return {
      worldModel: this.worldModel,
      planner: this.planner
    };
  }

  /**
   * @returns {ControllerAttachment}
   */
  reset() {
    this.worldModel = new WorldModelEngine(this.worldModelConfig);
    this.planner = new CognitiveEmergencePlanner(this.plannerConfig);
    if (this.attachedCore) this.attachCore(this.attachedCore);
    logger.info('reset_controller', {
      reattached: Boolean(this.attachedCore)
    });
    return {
      worldModel: this.worldModel,
      planner: this.planner
    };
  }

  /**
   * @returns {ControllerDiagnostics}
   */
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
