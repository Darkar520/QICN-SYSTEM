import assert from 'node:assert/strict';
import { evaluateKillSwitchQuorum } from '../netlify/functions/lib/selfpatch-governor.js';
import policyJson from '../netlify/functions/lib/load-selfpatch-policy.js';

try {
  const allowed = evaluateKillSwitchQuorum({ blobState: 'OFF', githubState: 'OFF' });
  assert.equal(allowed.allowed, true, 'quorum must allow when both sources are OFF');

  const blockedBlob = evaluateKillSwitchQuorum({ blobState: 'ON', githubState: 'OFF' });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(blockedBlob.allowed, true, 'sandbox_unrestricted must bypass blob kill-switch');
  } else {
    assert.equal(blockedBlob.allowed, false, 'quorum must block when blob is ON');
  }

  const blockedGithub = evaluateKillSwitchQuorum({ blobState: 'OFF', githubState: 'ON' });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(blockedGithub.allowed, true, 'sandbox_unrestricted must bypass github kill-switch');
  } else {
    assert.equal(blockedGithub.allowed, false, 'quorum must block when github variable is ON');
  }

  const blockedUnknown = evaluateKillSwitchQuorum({ blobState: 'UNKNOWN', githubState: 'OFF' });
  if (String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    assert.equal(blockedUnknown.allowed, true, 'sandbox_unrestricted must bypass UNKNOWN kill-switch state');
  } else {
    assert.equal(blockedUnknown.allowed, false, 'quorum must block on UNKNOWN state');
  }

  console.log('ok selfpatch-killswitch-quorum.v415');
} catch (error) {
  console.error('fail selfpatch-killswitch-quorum.v415:', error.message);
  process.exit(1);
}
