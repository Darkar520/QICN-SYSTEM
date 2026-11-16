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
   * Checks whether a candidate engine already carries live or restored state that
   * should take precedence over a pristine controller default instance.
   * @param {unknown} engine
   * @returns {boolean}
   */
  _hasPopulatedModelState(engine) {
    if (!engine || typeof engine !== 'object') return false;
    if ((Number(engine.trainingSteps) || 0) > 0) return true;
    const pl = engine.plasticityState;
    if (pl && typeof pl === 'object') {
      if ((Number(pl.maturationIndex) || 0) > 0) return true;
      if ((Number(pl.sealedCommitCount) || 0) > 0) return true;
      if ((Number(pl.verifiedPredictionCount) || 0) > 0) return true;
    }
    if (Array.isArray(engine.pendingCommits) && engine.pendingCommits.length > 0) return true;
    if (Array.isArray(engine.resolvedPredictions) && engine.resolvedPredictions.length > 0) return true;
    return false;
  }

  /**
   * Synchronize controller references FROM an already-restored or core-owned
   * engine without overwriting restored weights or plasticity state.
   * @param {Record<string, unknown>} core
   * @returns {ControllerAttachment|null}
   */
  syncFromCore(core) {
    if (!core || typeof core !== 'object') {
      logger.warn('sync_skipped_invalid_core');
      return null;
    }
    if (core.worldModelEngine && typeof core.worldModelEngine === 'object') {
      this.worldModel = /** @type {WorldModelEngine} */ (core.worldModelEngine);
    } else {
      core.worldModelEngine = this.worldModel;
    }
    if (core.cognitivePlanner && typeof core.cognitivePlanner === 'object') {
      this.planner = /** @type {CognitiveEmergencePlanner} */ (core.cognitivePlanner);
    } else {
      core.cognitivePlanner = this.planner;
    }
    if (this.worldModel && typeof this.worldModel === 'object') {
      this.worldModel.externalCycleOwned = true;
    }
    this.attachedCore = core;
    logger.info('sync_from_core', {
      unifiedCoreBinding: core.worldModelEngine === this.worldModel && core.cognitivePlanner === this.planner
    });
    return {
      worldModel: this.worldModel,
      planner: this.planner
    };
  }

  /**
   * @param {Record<string, unknown>} core
   * @param {{ preferCore?: boolean }} [options]
   * @returns {ControllerAttachment|null}
   */
  attachCore(core, options = {}) {
    if (!core || typeof core !== 'object') {
      logger.warn('attach_skipped_invalid_core');
      return null;
    }
    const coreWorldModelPopulated = this._hasPopulatedModelState(core.worldModelEngine);
    const controllerWorldModelPopulated = this._hasPopulatedModelState(this.worldModel);
    if (
      options?.preferCore === true
      || (core.worldModelEngine && coreWorldModelPopulated && !controllerWorldModelPopulated)
    ) {
      return this.syncFromCore(core);
    }
    core.worldModelEngine = this.worldModel;
    core.cognitivePlanner = this.planner;
    if (this.worldModel && typeof this.worldModel === 'object') {
      this.worldModel.externalCycleOwned = true;
    }
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
