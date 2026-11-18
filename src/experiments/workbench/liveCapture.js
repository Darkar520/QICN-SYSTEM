// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Live values, synthetic future context; never a continuation of live RNG/sensors or external validation.
import { captureWorkbench } from './capture.js';
import { createDeterministicEnvironment } from '../../runtime/ExecutionEnvironment.js';

export function captureLiveWorkbench({boundary,refs,runtime,config,build,schedule={},ledgerHeadHash=null,seed=11,profile='paired_intervention'}) {
  if(!boundary.ready||boundary.tick!==runtime.simulationStep||boundary.tick<1||refs.simulationErrorStreakRef?.current)throw new Error('capture_requires_completed_committed_tick');
  const environment=createDeterministicEnvironment({config,seed,profile});
  // Browser Math.random, measurement clock and hardware sensor cursors cannot
  // be serialized. Start a DECLARED fresh synthetic fork, never patch globals.
  return captureWorkbench({refs,runtime,config,build,ledgerHeadHash,now:environment.peekClock(),execution:{
    profile,seed,setterPolicy:'react_commit',schedule:structuredClone(schedule||{}),
    runtimePolicy:structuredClone(environment.runtimePolicy),environmentState:environment.snapshot(),
    sensorState:{sensorTick:0,sensorFrames:0,rng:seed^0x5EED}
  }});
}
