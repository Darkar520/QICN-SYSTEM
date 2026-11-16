import { captureDynamicState, encodeForDiff } from '../../persistence/dynamicState.js';
import { dataDigest } from './contracts.js';

export function readWorkbenchMetrics(session, build) {
  const core = session.bag.ontologicalCore.current;
  const nodes = session.bag.nodalLayer.current.getActiveNodes();
  if (!nodes.length) throw new Error('workbench_missing_active_nodes');
  const x_n = nodes.reduce((sum,node) => sum + node.coherenceState, 0) / nodes.length;
  const x_dispersion = Math.sqrt(nodes.reduce((sum,node) => sum + (node.coherenceState-x_n)**2, 0) / nodes.length);
  const wm = session.bag.worldModelRef.current;
  const kaizen = session.bag.kaizenEngine.current;
  const viability = kaizen.viabilityPolicyState.viabilityStats;
  const plasticity = wm.getPlasticityProfile();
  const values = {
    ccc: core.ontologicalState.coherence, pmia: core.pmiaValue,
    omega: core.ontologicalState.omega, x_n, x_dispersion,
    maturationIndex: plasticity.maturationIndex, surprisalEma: plasticity.surprisalEma,
    viabilityObjectiveScore: viability.lastObjectiveScore
  };
  if (Object.values(values).some(value => !Number.isFinite(value))) throw new Error('workbench_nonfinite_observable');
  const body = captureDynamicState(session.bag, {
    runtime: session.bag.simulationRuntimeRef.current, config: session.environment.config,
    build, now: session.environment.peekClock()
  });
  const stateDigest = dataDigest('qicn.workbench_tick_state.v1', body);
  return {
    tick: session.completedTick, values, stateDigest,
    action: viability.lastSelectedPolicyAction, inTube: viability.lastInTube,
    plasticity, anchorVector: wm.getConsolidatedAnchorVector(),
    predictorWeights: encodeForDiff({ fast: wm.weights, multi: wm.multiWeights, anchor: wm.plasticityState.consolidatedWeights, fisher: wm.plasticityState.fisherStiffness }),
    engramCount: session.bag.holographicMemory.current.structuralEngrams.length,
    policyCreditState: encodeForDiff(kaizen.viabilityPolicyState),
    policyDiagnostic: structuredClone(session.environment.diagnostics?.prePolicy || null),
    viabilityEvaluation: structuredClone(session.environment.diagnostics?.viability || null),
    viabilityInputs: structuredClone(session.environment.diagnostics?.viabilityInputs || null),
    sensorCursor: session.sensorSnapshot(), executionCursor: session.environment.snapshot()
  };
}

export { compareWorkbenchTrajectories } from './trajectoryComparison.js';
