import assert from 'node:assert/strict';
import { QICNConfig } from '../../services/config.js';
import { createHeadlessRuntimeSession } from '../../src/runtime/HeadlessRuntimeSession.js';
import { captureSession } from '../../src/experiments/workbench/capture.js';
import { encodeForDiff } from '../../src/persistence/dynamicState.js';

export async function matureFixture({ seed = 11, nodes = 12, warmup = 24, mode = 'non_stationary_regime' } = {}) {
  const config = { ...structuredClone(QICNConfig), EXOGENOUS_REGIME_MODE: mode, EXOGENOUS_REGIME_SEED: seed };
  const session = createHeadlessRuntimeSession({ config, seed, nodes });
  session.initialize();
  for (let index=0; index<warmup; index++) session.step();
  return { session, capture: await captureSession(session) };
}
export const snapshotHost = session => encodeForDiff({
  bag: session.bag, captured: session.captured, config: session.environment.config,
  environment: session.environment.snapshot(), sensors: session.sensorSnapshot()
});
export const inputTape = ticks => Array.from({length:ticks},(_,index)=>({
  entropyValue: 0.2+(index%5)*0.1,
  perception: {
    audio:{rms:0.1+index*0.002,silenceDurationSec:0},
    video:{frameNovelty:0.3,faceCount:1,humanPresence:{detected:true,count:1},faces:[{probability:0.8,engagement:{score:0.45+0.01*index}}]},
    awareness:{addressedToSystem:false,intentConfidence:0.2},isReady:true
  }
}));
export async function withGlobalTraps(fn) {
  const random = Math.random, RealDate = Date, measure = performance.now;
  const timer = globalThis.setTimeout, interval = globalThis.setInterval, fetch = globalThis.fetch;
  const denied = label => () => { throw new Error(`global_capability_consumed:${label}`); };
  Math.random=denied('rng');
  globalThis.Date=class extends RealDate {
    constructor(...args) { if (!args.length) throw new Error('global_capability_consumed:new_Date'); super(...args); }
    static now() { throw new Error('global_capability_consumed:clock'); }
  };
  performance.now=denied('measurement');
  globalThis.setTimeout=denied('timer');globalThis.setInterval=denied('interval');globalThis.fetch=denied('network');
  try { return await fn(); }
  finally { Math.random=random;globalThis.Date=RealDate;performance.now=measure;globalThis.setTimeout=timer;globalThis.setInterval=interval;globalThis.fetch=fetch; }
}
export function graphObjects(root) {
  const values = new Set();
  const visit = value => {
    if (!value || typeof value !== 'object' || values.has(value)) return;
    values.add(value);
    if (value instanceof Map) for(const [key,item] of value){visit(key);visit(item);}
    if (value instanceof Set) for(const item of value)visit(item);
    for(const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))visit(descriptor.value);
  };
  visit(root); return values;
}
export function assertNoSharedMutable(a,b) {
  const left=graphObjects(a);
  for(const value of graphObjects(b)) assert.ok(!left.has(value) || Object.isFrozen(value),'shared mutable object');
}
