import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { RECOMPUTED_EACH_TICK } from '../src/language/runtimeSnapshot.js';

const temp = fs.mkdtempSync(path.join(os.tmpdir(),'qicn-driver-equivalence-'));
const run = (seed,mode,frozen) => {
  const out = path.join(temp,`${seed}-${mode}-${frozen}.json`);
  const loader = ['--import','./tests/lib/headless-register.mjs'];
  if (frozen) loader.push('--import','./tests/lib/frozen-runtime-register.mjs');
  const result = spawnSync(process.execPath,[...loader,
    'scripts/run-full-cycle-language-ablation.mjs','--worker','--condition=current',
    `--seed=${seed}`,'--ticks=24','--nodes=24',`--kaizen-mode=${mode}`,
    '--capture-at=24',`--capture-out=${out}`
  ],{encoding:'utf8',timeout:120000,maxBuffer:64*1024*1024,windowsHide:true});
  assert.equal(result.status,0,result.stderr || result.stdout);
  const line=result.stdout.split('\n').find(row=>row.startsWith('@@QICN_RESULT@@'));
  assert.ok(line,'worker result missing');
  const data=JSON.parse(line.slice('@@QICN_RESULT@@'.length));
  assert.equal(data.threw,null);
  return { data, capture:JSON.parse(fs.readFileSync(out,'utf8')) };
};
try {
  assert.deepEqual(RECOMPUTED_EACH_TICK,[
    'BOLTZMANN_ANALOG_K','RETRO_FLUX_WEIGHT','INFORMATIONAL_TEMP_T','COHERENCE_THRESHOLD',
    'BASE_LEARNING_RATE','HEBBIAN_FACTOR','PLASTICITY_DECAY'
  ]);
  for (const seed of [11,23]) for(const mode of ['legacy','learned']) {
    const original=run(seed,mode,true), current=run(seed,mode,false);
    assert.deepEqual(current.data.series,original.data.series,`trajectory changed seed=${seed} mode=${mode}`);
    assert.deepEqual(current.data.final,original.data.final,`final/call counters changed seed=${seed} mode=${mode}`);
    assert.deepEqual(current.capture,original.capture,`v3 bytes, RNG, clock or sensor continuation changed seed=${seed} mode=${mode}`);
  }
  console.log('OK: 4 frozen-B0 vs driver pairs, full v3 capture bytes and RNG/clock/sensor cursors identical');
} finally {
  assert.ok(path.resolve(temp).startsWith(path.resolve(os.tmpdir())+path.sep));
  fs.rmSync(temp,{recursive:true,force:true});
}
