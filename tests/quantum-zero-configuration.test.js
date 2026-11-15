import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

const keys = [
  'QUANTUM_REQUIRED_QUALITY_MIN', 'QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS',
  'QUANTUM_PROVIDER_RETRY_COUNT', 'QUANTUM_PROVIDER_RETRY_BACKOFF_MS'
];
const probe = `
  import { QUANTUM_RUNTIME_DEFAULTS as d } from './src/config/simulationDefaults.js';
  import { QuantumEntropyBridge } from './src/simulation/QuantumEntropyBridge.js';
  const b = new QuantumEntropyBridge({ requiredQualityMin:d.requiredQualityMin,
    lowWatermarkChunks:d.lowWatermarkChunks, retryCount:d.providerRetryCount,
    retryBackoffMs:d.providerRetryBackoffMs });
  b.providerClient.fetchHttpChunk = async () => ({ok:false,status:'error'});
  const attempt = await b.providerClient.fetchChunk({provider:'custom'});
  const sample = b.normalizeSample({entropyFloat01:0.5,quality:{bitBalance:0,shots:0}});
  console.log(JSON.stringify({quality:b.config.requiredQualityMin, low:b.config.lowWatermarkChunks,
    retries:b.providerClient.config.retryCount, backoff:b.providerClient.config.retryBackoffMs,
    attempts:attempt.attempts, sampleValid:sample.valid}));
`;
function run(values) {
  const env = { ...process.env };
  keys.forEach((key, i) => { if (values[i] === null) delete env[key]; else env[key] = values[i]; });
  const result = spawnSync(process.execPath, ['--input-type=module', '-e', probe], { env, encoding:'utf8', timeout:10000 });
  assert.equal(result.status, 0, result.stderr);
  return JSON.parse(result.stdout.trim());
}
assert.deepEqual(run(['0','0','0','0']), {quality:0,low:0,retries:0,backoff:0,attempts:1,sampleValid:true});
assert.deepEqual(run(['0.2','2','1','0']), {quality:0.2,low:2,retries:1,backoff:0,attempts:2,sampleValid:false});
assert.deepEqual(run(['invalid','',null,'invalid']), {quality:0.2,low:2,retries:1,backoff:300,attempts:2,sampleValid:false});
console.log('OK: zero-valued entropy configuration reaches bridge and affects behavior');
