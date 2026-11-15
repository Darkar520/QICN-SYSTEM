const fs = require('fs');
const path = require('path');
const {
  SYSTEM_ROOT,
  ECOSYSTEM_ARTIFACT_ROOT,
  ensureDir,
  evaluateEcosystem,
  writeJson,
  normalize
} = require('./ecosystem-release-common.cjs');

const outputRoot = ensureDir(ECOSYSTEM_ARTIFACT_ROOT);
const { gapRegister, verificationMatrix } = evaluateEcosystem();

const matrixPath = path.join(outputRoot, 'ecosystem_verification_matrix.json');
const gapPath = path.join(outputRoot, 'ecosystem_gap_register.v1.json');

const shouldPersist = process.argv.includes('--write');
if (shouldPersist || !fs.existsSync(matrixPath)) {
  writeJson(matrixPath, verificationMatrix);
}
if (shouldPersist || !fs.existsSync(gapPath)) {
  writeJson(gapPath, gapRegister);
}

process.stdout.write(`${JSON.stringify({
  output: normalize(path.relative(SYSTEM_ROOT, matrixPath)),
  gap_register: normalize(path.relative(SYSTEM_ROOT, gapPath)),
  artifact_role: verificationMatrix.artifact_role,
  checked_at: verificationMatrix.checked_at,
  status: verificationMatrix.status,
  warnings: verificationMatrix.warnings,
  failures: verificationMatrix.failures
}, null, 2)}\n`);
