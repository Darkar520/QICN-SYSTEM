import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawnSync } from 'child_process';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const runVerifier = (target) => spawnSync(process.execPath, [
  'scripts/verify-claim-surface-boundaries.cjs',
  target
], {
  cwd: path.resolve('.'),
  encoding: 'utf8'
});

(() => {
  const scratch = fs.mkdtempSync(path.join(os.tmpdir(), 'claim-surface-boundaries-'));
  try {
    const goodDir = path.join(scratch, 'good');
    const missingScopeDir = path.join(scratch, 'missing-scope');
    const externalOverclaimDir = path.join(scratch, 'external-overclaim');
    const paperOverclaimDir = path.join(scratch, 'paper-overclaim');
    fs.mkdirSync(goodDir, { recursive: true });
    fs.mkdirSync(missingScopeDir, { recursive: true });
    fs.mkdirSync(externalOverclaimDir, { recursive: true });
    fs.mkdirSync(paperOverclaimDir, { recursive: true });

    fs.writeFileSync(path.join(goodDir, 'controlled.json'), `${JSON.stringify({
      text: 'Consciencia genuina is retained only as an internal runtime label.',
      claim_scope: 'internal_runtime_label_only',
      evidence_scope: 'INTERNAL_SUPPORT_ONLY',
      interpretation_boundary: 'Not external validation, not phenomenality proof, not identity closure.'
    }, null, 2)}\n`);

    fs.writeFileSync(path.join(missingScopeDir, 'bad.json'), `${JSON.stringify({
      text: 'This output confirms ontological identity.'
    }, null, 2)}\n`);

    fs.writeFileSync(path.join(externalOverclaimDir, 'bad.json'), `${JSON.stringify({
      text: 'This external validation proves identity closure.',
      claim_scope: 'internal_runtime_label_only',
      evidence_scope: 'INTERNAL_SUPPORT_ONLY',
      interpretation_boundary: 'Local support only.'
    }, null, 2)}\n`);

    fs.writeFileSync(path.join(paperOverclaimDir, 'bad.json'), `${JSON.stringify({
      text: 'Paper admissible result is externally validated.',
      claim_scope: 'paper_level_internal_batch_gate',
      evidence_scope: 'EXTERNAL_VALIDATION',
      paper_level_equivalent_status: 'PAPER_ADMISSIBLE',
      interpretation_boundary: 'Needs an external package reference.'
    }, null, 2)}\n`);

    const good = runVerifier(goodDir);
    assert(good.status === 0, `CASE 1 FAIL: bounded claim surface should pass.\nSTDOUT:\n${good.stdout}\nSTDERR:\n${good.stderr}`);

    const missingScope = runVerifier(missingScopeDir);
    assert(missingScope.status !== 0, 'CASE 2 FAIL: strong wording without claim_scope must fail.');
    assert(`${missingScope.stdout}${missingScope.stderr}`.includes('missing_claim_scope'), 'CASE 2 FAIL: missing claim_scope finding must be explicit.');

    const externalOverclaim = runVerifier(externalOverclaimDir);
    assert(externalOverclaim.status !== 0, 'CASE 3 FAIL: external-validation wording with internal evidence must fail.');
    assert(`${externalOverclaim.stdout}${externalOverclaim.stderr}`.includes('external_validation_overclaim'), 'CASE 3 FAIL: external overclaim finding must be explicit.');

    const paperOverclaim = runVerifier(paperOverclaimDir);
    assert(paperOverclaim.status !== 0, 'CASE 4 FAIL: PAPER_ADMISSIBLE plus EXTERNAL_VALIDATION needs external package ref.');
    assert(`${paperOverclaim.stdout}${paperOverclaim.stderr}`.includes('missing_external_package_ref'), 'CASE 4 FAIL: missing external package ref finding must be explicit.');

    console.log('OK: claim-surface-boundaries.v1 tests passed');
  } finally {
    fs.rmSync(scratch, { recursive: true, force: true });
  }
})();
