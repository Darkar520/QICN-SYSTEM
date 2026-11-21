import { encodeForDiff } from '../../persistence/dynamicState.js';
import { dataDigest } from './contracts.js';

const physicalDigest = (session) => dataDigest('qicn.workbench_physical_state.v1', {
  nodes: encodeForDiff(session.bag.nodalLayer.current),
  tower: encodeForDiff(session.bag.ontologicalCore.current.towerState),
  observables: encodeForDiff(session.bag.ontologicalCore.current.ontologicalState)
});

/** These operations receive only a restored branch; never a live runtime bag. */
export function applyWorkbenchIntervention(session, intervention) {
  const before = physicalDigest(session);
  const effects = { intervention, allowedFields: [], originalCommitDigestsRetained: [] };
  switch (intervention) {
    case 'sham': break;
    case 'block_history_read':
      session.environment.controls.historyRead = false;
      effects.allowedFields = ['execution.controls.historyRead'];
      effects.scope = 'selector engram lookup, historical action bonuses and exploration only; predictor EWC remains active';
      break;
    case 'suspend_consolidation':
      session.environment.controls.consolidation = false;
      effects.allowedFields = ['execution.controls.consolidation'];
      effects.scope = 'predictor anchor/Fisher/maturation, structural engrams, policy credits; fast gradients and history reads remain active';
      break;
    case 'freeze_predictor_weights':
      session.environment.config.FREEZE_WORLD_MODEL = true;
      effects.allowedFields = ['configuration.FREEZE_WORLD_MODEL'];
      effects.scope = 'predictor weights and its consolidation only; settlements, engrams and policy history continue';
      break;
    case 'erase_declared_history': {
      const model = session.bag.worldModelRef.current;
      effects.originalCommitDigestsRetained = model.pendingCommits.map(row => row.commitDigest);
      model.resetHistoricalConsolidation();
      session.bag.holographicMemory.current.resetStructuralEngrams();
      session.bag.kaizenEngine.current.resetViabilityHistory();
      effects.allowedFields = [
        'worldModel.weights','worldModel.multiWeights','worldModel.residualScaleEma',
        'worldModel.pendingCommits','worldModel.resolvedPredictions','worldModel.commitSequence',
        'worldModel.lastSettledTick','worldModel.plasticityState',
        'holographicMemory.structuralEngrams','holographicMemory.structuralEngramCounter',
        'holographicMemory.structuralMemoryMetrics','kaizen.viabilityPolicyState'
      ];
      effects.scope = 'one-time declared reset; preserves transition history, last observation, trainingSteps, residualEma, nodal state and subsequent learning';
      break;
    }
    case 'sensor_impulse':
      session.environment.controls.sensorImpulse = true;
      effects.allowedFields = ['execution.controls.sensorImpulse'];
      effects.scope = 'positive detector sensitivity control; declared intervention on synthetic sensory input';
      break;
    case 'kaizen_learned_mode':
      session.environment.config.KAIZEN_ADJUSTMENT_MODE = 'learned';
      session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;
      effects.allowedFields = ['configuration.KAIZEN_ADJUSTMENT_MODE', 'configuration.SENSOR_OBSERVER_DYNAMICS_ENABLED'];
      effects.scope = 'enables bounded Kaizen learned factors across all 6 recomputed keys including PLASTICITY_DECAY on isolated copy';
      break;
    case 'kaizen_legacy_mode':
      session.environment.config.KAIZEN_ADJUSTMENT_MODE = 'legacy';
      session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = false;
      effects.allowedFields = ['configuration.KAIZEN_ADJUSTMENT_MODE', 'configuration.SENSOR_OBSERVER_DYNAMICS_ENABLED'];
      effects.scope = 'negative ablation forcing legacy Kaizen overwrite behavior and disabling sensor/observer coupling';
      break;
    case 'sensor_observer_dynamics':
      session.environment.config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;
      session.environment.controls.observerLatencyProbe = true;
      effects.allowedFields = ['configuration.SENSOR_OBSERVER_DYNAMICS_ENABLED', 'execution.controls.observerLatencyProbe'];
      effects.scope = 'activates bounded sensory observer presence + coupled latency strain dynamics with deterministic probe (chat remains decoupled)';
      break;
    case 'td_cut_eta_zero':
      session.environment.config.NODAL_TOWER_COUPLING_MODE = 'td_cut_eta_zero';
      effects.allowedFields = ['configuration.NODAL_TOWER_COUPLING_MODE'];
      effects.scope = 'physical T_d coupling cut (eta = 0) negative control on isolated copy';
      break;
    case 'reducible_control':
      session.environment.config.NODAL_TOWER_COUPLING_MODE = 'reducible_control';
      effects.allowedFields = ['configuration.NODAL_TOWER_COUPLING_MODE'];
      effects.scope = 'reducible A = I sector-uncoupled negative control on isolated copy';
      break;
    default: throw new Error('unknown_workbench_intervention');
  }
  effects.physicalDigestBefore = before;
  effects.physicalDigestAfter = physicalDigest(session);
  if (effects.physicalDigestBefore !== effects.physicalDigestAfter) throw new Error('intervention_changed_undeclared_physical_state');
  return effects;
}
