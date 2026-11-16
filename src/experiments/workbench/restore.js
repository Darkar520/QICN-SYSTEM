import { verifyStoredState, applyDynamicState, applyExecutionComponent, INSTANCE_REFS, PLAIN_REFS, RUNTIME_KEYS } from '../../persistence/dynamicState.js';
import { createHeadlessRuntimeSession } from '../../runtime/HeadlessRuntimeSession.js';
import { CausalInterventionScheduler } from '../CausalInterventionScheduler.js';
import { EXECUTION_REFS } from './capture.js';
import { verifyData, PROFILES } from './contracts.js';

export async function restoreWorkbenchCapture(record, { profile = null, expectedBuild = null } = {}) {
  const source = verifyData(record, 'qicn.workbench_capture.v1');
  profile = profile || source.execution.profile;
  expectedBuild = expectedBuild || source.sourceBuild;
  if (source.evidence_scope !== 'internal_support_only' || source.external_support_certified !== false) throw new Error('workbench_boundary_violation');
  if (!PROFILES.includes(profile) || !Number.isInteger(source.nodeCount) || source.nodeCount < 1 || source.nodeCount > 1500) throw new Error('invalid_capture_profile_or_nodes');
  if (!['capture_only','react_commit'].includes(source.execution.setterPolicy)) throw new Error('invalid_setter_policy');
  const verified = await verifyStoredState(source.dynamicRecord, { build: expectedBuild, nodeCount: source.nodeCount });
  if (!verified.ok) throw new Error(`workbench_restore_rejected:${verified.reason}`);
  for (const name of INSTANCE_REFS) if (!(name in verified.body.components.instances)) throw new Error(`incomplete_dynamic_capture:${name}`);
  for (const name of PLAIN_REFS) if (!(name in verified.body.components.plain)) throw new Error(`incomplete_dynamic_capture:${name}`);
  for (const name of RUNTIME_KEYS) if (!(name in verified.body.components.runtime)) throw new Error(`incomplete_runtime_capture:${name}`);
  if (source.sourceTick !== verified.body.tick || source.configuration.KAIZEN_ADJUSTMENT_MODE !== verified.body.kaizenMode) throw new Error('capture_header_mismatch');
  const session = createHeadlessRuntimeSession({
    config: source.configuration, seed: source.execution.seed, nodes: source.nodeCount,
    profile, schedule: source.execution.schedule, setterPolicy: source.execution.setterPolicy
  });
  session.initialize();
  const applied = applyDynamicState(session.bag, verified.body, { config: session.environment.config });
  const unrestored = [...applied.unrestored];
  for (const name of Object.keys(source.extraComponents)) if (!EXECUTION_REFS.includes(name)) throw new Error('unknown_execution_component');
  for (const name of EXECUTION_REFS) {
    if (!(name in source.extraComponents)) throw new Error(`missing_execution_component:${name}`);
    if (name === 'interventionSchedulerRef' && source.extraComponents[name] !== null) session.bag[name].current = new CausalInterventionScheduler(source.execution.schedule);
    const result = applyExecutionComponent(session.bag[name].current, source.extraComponents[name]);
    session.bag[name].current = result.value;
    unrestored.push(...result.unrestored);
  }
  const inputs = applyExecutionComponent(session.bag.simulationRuntimeRef.current, source.runtimeInputs);
  unrestored.push(...inputs.unrestored);
  Object.assign(session.bag.simulationRuntimeRef.current, inputs.value, applied.runtime);
  session.bag.simulationControllerRef.current.syncFromCore(session.bag.ontologicalCore.current);
  const controller = session.bag.simulationControllerRef.current;
  const core = session.bag.ontologicalCore.current;
  session.bag.worldModelRef.current = controller.worldModel;
  session.bag.cogPlannerRef.current = controller.planner;
  if (controller.worldModel !== core.worldModelEngine || controller.planner !== core.cognitivePlanner) throw new Error('restored_controller_alias_mismatch');
  if (unrestored.length) throw new Error(`workbench_unrestored:${unrestored.join('|')}`);
  if (session.bag.nodalLayer.current.nodes.length !== source.nodeCount) throw new Error('restored_node_count_mismatch');
  session.environment.restore(source.execution.environmentState);
  Object.assign(session.environment.runtimePolicy, source.execution.runtimePolicy);
  session.restoreSensors(source.execution.sensorState);
  session.setCompletedTick(source.sourceTick);
  session.environment.diagnostics = {};
  return { session, unrestored, source };
}
