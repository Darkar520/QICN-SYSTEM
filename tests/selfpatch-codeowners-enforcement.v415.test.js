import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import policyJson from '../netlify/functions/lib/load-selfpatch-policy.js';
import { classifyPatchRisk, isProtectedPath } from '../netlify/functions/lib/risk-classifier.js';

try {
  const currentFile = fileURLToPath(import.meta.url);
  const testsDir = path.dirname(currentFile);
  const codeownersPath = path.resolve(testsDir, '../.github/CODEOWNERS');
  const codeowners = fs.readFileSync(codeownersPath, 'utf8');

  const requiredProtected = [
    'src/simulation/PhenomenologyCore.js',
    'src/simulation/MetaSovereigntyCheck.js',
    'src/simulation/HolographicMemoryNexus.js',
    'src/utils/integrity.js'
  ];
  const isSandboxUnrestricted = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted';
  for (const filePath of requiredProtected) {
    assert.ok(codeowners.includes(`/${filePath}`), `CODEOWNERS missing critical entry: /${filePath}`);
    if (!isSandboxUnrestricted) {
      assert.ok(isProtectedPath(filePath, policyJson), `protected path missing: ${filePath}`);
    }
  }

  const rejected = classifyPatchRisk({
    targetFiles: ['src/simulation/PhenomenologyCore.js'],
    totalChangedLines: 12
  }, policyJson);
  if (isSandboxUnrestricted) {
    assert.equal(rejected.allowed, true, 'sandbox_unrestricted must allow protected patch simulation');
    assert.equal(rejected.riskLevel, 'low', 'sandbox_unrestricted must force low risk');
    assert.ok(Array.isArray(rejected.reasons) && rejected.reasons.includes('sandbox_unrestricted_mode'), 'sandbox_unrestricted reason missing');
  } else {
    assert.equal(rejected.allowed, false, 'risk classifier must reject protected file patch');
    assert.equal(rejected.riskLevel, 'high', 'protected file patch must be high risk');
  }

  console.log('ok selfpatch-codeowners-enforcement.v415');
} catch (error) {
  console.error('fail selfpatch-codeowners-enforcement.v415:', error.message);
  process.exit(1);
}
