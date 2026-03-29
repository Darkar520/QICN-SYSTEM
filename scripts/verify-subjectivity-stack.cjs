#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');

const { verifySubjectivityScaffolding } = require('./verify-subjectivity-scaffolding.cjs');
const { verifySubjectivitySelfIndexOwnership } = require('./verify-subjectivity-selfindex-ownership.cjs');
const { verifySubjectivityContinuityPerspective } = require('./verify-subjectivity-continuity-perspective.cjs');
const { verifySubjectivityValuationIntervention } = require('./verify-subjectivity-valuation-intervention.cjs');
const { verifySubjectivityReducibility } = require('./verify-subjectivity-reducibility.cjs');
const { verifySubjectivityGate } = require('./verify-subjectivity-gate.cjs');
const { verifySubjectivityEcosystem } = require('./verify-subjectivity-ecosystem.cjs');
const { evaluateEcosystem } = require('./ecosystem-release-common.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRT6_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt6');

const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

async function verifySubjectivityStack() {
  const steps = [
    ['srt0_scaffolding', await verifySubjectivityScaffolding()],
    ['srt1_selfindex_ownership', await verifySubjectivitySelfIndexOwnership()],
    ['srt2_continuity_perspective', await verifySubjectivityContinuityPerspective()],
    ['srt3_valuation_intervention', await verifySubjectivityValuationIntervention()],
    ['srt4_reducibility', await verifySubjectivityReducibility()],
    ['srt5_gate', await verifySubjectivityGate()],
    ['srt6_ecosystem', await verifySubjectivityEcosystem()]
  ];

  const ecosystem = evaluateEcosystem();
  const ecosystemPass = ecosystem.verificationMatrix.status === 'PASS';
  const failedSteps = steps.filter(([, result]) => !result.ok).map(([id]) => id);
  if (!ecosystemPass) failedSteps.push('ecosystem_integrity');

  const payload = {
    artifact_role: 'subjectivity_stack_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt6',
    status: failedSteps.length === 0 ? 'PASS' : 'FAIL',
    steps: steps.map(([id, result]) => ({
      id,
      status: result.ok ? 'PASS' : 'FAIL',
      output_path: path.relative(ROOT, result.outputPath).replace(/\\/g, '/')
    })),
    ecosystem_integrity: {
      status: ecosystem.verificationMatrix.status,
      failures: ecosystem.verificationMatrix.failures,
      warnings: ecosystem.verificationMatrix.warnings
    },
    failed_steps: failedSteps,
    interpretation_boundary:
      'SRT-0..6 subjectivity stack verification only; internal execution integrity and ecosystem hardening check, not external validation, not phenomenality closure.'
  };

  const outputPath = path.join(SRT6_DIR, 'subjectivity_stack_check.json');
  writeJson(outputPath, payload);
  return { ok: failedSteps.length === 0, outputPath, payload };
}

if (require.main === module) {
  verifySubjectivityStack()
    .then((result) => {
      if (!result.ok) {
        throw new Error(
          `Subjectivity stack verification failed. See ${path.relative(
            ROOT,
            result.outputPath
          )}`
        );
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    })
    .catch((error) => {
      console.error(`FAIL verify-subjectivity-stack: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  verifySubjectivityStack
};
