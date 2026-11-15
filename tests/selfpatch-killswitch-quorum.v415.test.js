import assert from 'node:assert/strict';
import { evaluateKillSwitchQuorum } from '../netlify/functions/lib/selfpatch-governor.js';

// The stop control is independent of risk, rate and budget exemptions.
for (const blobState of ['OFF', 'ON', 'UNKNOWN']) {
  for (const githubState of ['OFF', 'ON', 'UNKNOWN']) {
    const result = evaluateKillSwitchQuorum({ blobState, githubState });
    assert.equal(result.allowed, blobState === 'OFF' && githubState === 'OFF',
      `stop-control combination ${blobState}/${githubState}`);
  }
}
assert.equal(evaluateKillSwitchQuorum({}).allowed, false, 'missing switch state must fail closed');
console.log('ok selfpatch-killswitch-quorum.v415');
