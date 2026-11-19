#!/usr/bin/env node
// Internal isolated execution only; no external validation or live-ledger writes.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { captureSession } from '../src/experiments/workbench/capture.js';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { createSyntheticInputTape } from '../src/experiments/workbench/inputTape.js';
import { runWorkbenchInWorker } from './lib/workbench-worker-client.mjs';
import outputPaths from './lib/report-output-path.cjs';

const argv=process.argv.slice(2);
const args=Object.fromEntries(argv.filter(arg=>arg.startsWith('--')&&arg.includes('=')).map(arg=>{const [key,...value]=arg.slice(2).split('=');return [key,value.join('=')];}));
const number=(key,fallback)=>{const value=args[key]===undefined?fallback:Number(args[key]);if(!Number.isInteger(value))throw new Error(`invalid_${key}`);return value;};
const sourceSignature=()=>{
  const files=[];
  const walk=dir=>{for(const entry of fs.readdirSync(dir,{withFileTypes:true})){const file=path.join(dir,entry.name);if(entry.isDirectory())walk(file);else if(/\.(js|jsx|mjs|cjs)$/.test(entry.name))files.push(file);}};
  walk('src');files.push('services/config.js');
  const manifest=files.sort().map(file=>[file.replace(/\\/g,'/'),createHash('sha256').update(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n')).digest('hex')]);
  return createHash('sha256').update(JSON.stringify(manifest)).digest('hex');
};
try {
  const requested=outputPaths.readReportOutputArg(argv);
  if (!requested && !process.env.QICN_REPORT_DIR) throw new Error('explicit_TEMP_output_required');
  const out=outputPaths.resolveReportOutput({projectRoot:process.cwd(),defaultPath:path.resolve('artifacts/workbench/micro_experiment.json'),outputPath:requested});
  const relative=path.relative(path.resolve(os.tmpdir()),path.resolve(out));
  if (!relative || relative==='..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error('workbench_report_must_be_under_TEMP');
  const preregister=JSON.parse(fs.readFileSync(args.preregister || 'config/workbench/preregister.v1.json','utf8'));
  if (preregister.schema!=='qicn.workbench_preregister.v1' || preregister.evidence_scope!=='internal_support_only' || preregister.external_support_certified!==false) throw new Error('invalid_workbench_preregistration');
  let seed=number('seed',11);
  const nodes=number('nodes',24), warmup=number('warmup',40), ticks=number('ticks',12);
  if (!preregister.paired_protocol.diagnostic_seeds.includes(seed)) throw new Error('held_out_or_unregistered_seed_not_open_for_execution');
  if(nodes<1||nodes>1500||warmup<1||warmup>1000)throw new Error('invalid_workbench_initialization');
  const profile=args.profile || 'legacy_compatibility';
  const expectedBuild={version:'workbench.v1',signature:sourceSignature()};
  let capture;
  if(args.capture) {
    capture=JSON.parse(fs.readFileSync(path.resolve(args.capture),'utf8'));
    if(args.seed!==undefined && seed!==capture.execution.seed)throw new Error('capture_seed_mismatch');
    seed=capture.execution.seed;
    if(!preregister.paired_protocol.diagnostic_seeds.includes(seed))throw new Error('held_out_or_unregistered_seed_not_open_for_execution');
  }
  else {
    const session=createHeadlessRuntimeSession({seed,nodes});
    session.environment.config.EXOGENOUS_REGIME_MODE='non_stationary_regime';
    session.environment.config.EXOGENOUS_REGIME_SEED=seed;
    session.initialize();for(let index=0;index<warmup;index++)session.step();
    const sourceCommit=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8',windowsHide:true}).trim();
    capture=await captureSession(session,{sourceCommit,build:expectedBuild});
  }
  const protocol=createWorkbenchProtocol({profile,ticks,inputTape:profile==='paired_intervention'?createSyntheticInputTape(ticks,seed):[],branches:[
    {id:'baseline',intervention:'sham'},{id:'sham',intervention:'sham'},
    {id:'history_read_blocked',intervention:'block_history_read'},
    {id:'consolidation_suspended',intervention:'suspend_consolidation'},
    {id:'predictor_frozen',intervention:'freeze_predictor_weights'},
    {id:'declared_history_erased',intervention:'erase_declared_history'},
    {id:'sensitivity',intervention:'sensor_impulse'}
  ]});
  const result=await runWorkbenchInWorker(capture,protocol,{expectedBuild});
  const sham=result.comparisons.find(row=>row.branchId==='sham');
  if(!sham.fullStateIdentical||sham.maxAbsDiff!==0||sham.actionDivergence!==0)throw new Error('sham_control_failed');
  fs.mkdirSync(path.dirname(out),{recursive:true});
  fs.writeFileSync(out,JSON.stringify({capture,protocol,result},null,2)+'\n');
  console.log(JSON.stringify({out,resultDigest:result.digest,executionStatus:result.executionStatus,comparisons:result.comparisons,hybridLateQueryTieBreaker:{digest:result.hybridLateQueryTieBreaker?.digest,passed:result.hybridLateQueryTieBreaker?.passed,fifthContrastG:result.hybridLateQueryTieBreaker?.fifthContrastG,noisyPenalizedMargin:result.hybridLateQueryTieBreaker?.noisyPenalizedMargin,m2_b1_best_mean:result.hybridLateQueryTieBreaker?.m2_b1_best_mean,atomicSeparatorDeltaInt:result.hybridLateQueryTieBreaker?.atomicSeparator?.primaryDeltaInt}},null,2));
} catch(error) { console.error(`FAIL workbench: ${error.message}`);process.exitCode=1; }
