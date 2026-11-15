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
const SUBJECTIVITY_ARTIFACT_ROOT = path.join(ROOT, 'artifacts', 'subjectivity');
const SRT6_DIR = path.join(SUBJECTIVITY_ARTIFACT_ROOT, 'srt6');
const VOLATILE_TIMESTAMP_KEYS = new Set(['generated_at', 'checked_at', 'created_at', 'timestamp']);
const NON_SUBJECTIVITY_ECOSYSTEM_CHECKS = new Set([
  'system_repo_state',
  'release_repo_state',
  'system_protocolized_evaluation_phase'
]);
const NON_BLOCKING_HYGIENE_GAPS = new Set([
  'system.repo_not_clean',
  'system.repo_not_pushed',
  'release.repo_not_clean',
  'release.repo_not_pushed',
  'release.external_freeze_unavailable',
  'system.evaluation_phase_failed'
]);

const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const listJsonFiles = (dirPath) => {
  if (!fs.existsSync(dirPath)) return [];
  const results = [];
  for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...listJsonFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith('.json')) {
      results.push(fullPath);
    }
  }
  return results;
};

const stripVolatileTimestamps = (value) => {
  if (Array.isArray(value)) return value.map(stripVolatileTimestamps);
  if (value && typeof value === 'object') {
    const out = {};
    for (const key of Object.keys(value)) {
      if (VOLATILE_TIMESTAMP_KEYS.has(key)) continue;
      out[key] = stripVolatileTimestamps(value[key]);
    }
    return out;
  }
  return value;
};

const snapshotSubjectivityJson = () => {
  const snapshot = new Map();
  for (const filePath of listJsonFiles(SUBJECTIVITY_ARTIFACT_ROOT)) {
    const raw = fs.readFileSync(filePath, 'utf8');
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      parsed = null;
    }
    snapshot.set(filePath, { raw, parsed });
  }
  return snapshot;
};

const restoreTimestampOnlyChanges = (beforeSnapshot) => {
  for (const filePath of listJsonFiles(SUBJECTIVITY_ARTIFACT_ROOT)) {
    const previous = beforeSnapshot.get(filePath);
    if (!previous || !previous.parsed) continue;
    try {
      const currentParsed = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      const sameSemantics = JSON.stringify(stripVolatileTimestamps(previous.parsed))
        === JSON.stringify(stripVolatileTimestamps(currentParsed));
      if (sameSemantics) {
        fs.writeFileSync(filePath, previous.raw, 'utf8');
      }
    } catch {
      // Leave freshly written non-JSON or unreadable files untouched for diagnostics.
    }
  }
};

async function verifySubjectivityStack() {
  const beforeSnapshot = snapshotSubjectivityJson();
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
  const structuralFailures = ecosystem.verificationMatrix.checks
    .filter((check) => check.status === 'FAIL' && !NON_SUBJECTIVITY_ECOSYSTEM_CHECKS.has(check.id))
    .map((check) => check.id);
  const structuralGapFailures = ecosystem.gapRegister.gaps
    .filter((gap) => gap.classification === 'blocking_gap' && !NON_BLOCKING_HYGIENE_GAPS.has(gap.id))
    .map((gap) => gap.id);
  const allEcosystemFailures = [...new Set([...structuralFailures, ...structuralGapFailures])];
  const hygieneWarnings = ecosystem.verificationMatrix.checks
    .filter((check) => check.status === 'FAIL' && NON_SUBJECTIVITY_ECOSYSTEM_CHECKS.has(check.id))
    .map((check) => check.id);
  const allWarnings = [
    ...new Set([
      ...(ecosystem.verificationMatrix.warnings || []),
      ...hygieneWarnings
    ])
  ];
  const externalCertifiedViolation = ecosystem.model.release.external_support_certified === true;
  if (externalCertifiedViolation) {
    allEcosystemFailures.push('external_support_certified_must_be_false');
  }
  const ecosystemPass = allEcosystemFailures.length === 0;
  const failedSteps = steps.filter(([, result]) => !result.ok).map(([id]) => id);
  if (!ecosystemPass) failedSteps.push('ecosystem_integrity');

  const payload = {
    artifact_role: 'subjectivity_stack_check',
    schema_version: '1.0.0',
    layer_id: 'subjectivity_runtime_layer.srt6',
    status: failedSteps.length === 0 ? 'PASS' : 'FAIL',
    external_support_certified: false,
    steps: steps.map(([id, result]) => ({
      id,
      status: result.ok ? 'PASS' : 'FAIL',
      output_path: path.relative(ROOT, result.outputPath).replace(/\\/g, '/')
    })),
    ecosystem_integrity: {
      status: ecosystemPass
        ? (allWarnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS')
        : 'FAIL',
      freeze_status: ecosystem.model.release.freeze_status,
      external_support_certified: ecosystem.model.release.external_support_certified,
      failures: allEcosystemFailures,
      warnings: allWarnings
    },
    failed_steps: failedSteps,
    interpretation_boundary:
      'SRT-0..6 subjectivity stack verification only; internal execution integrity and ecosystem hardening check, not external validation, not phenomenality closure.'
  };

  const outputPath = path.join(SRT6_DIR, 'subjectivity_stack_check.json');
  writeJson(outputPath, payload);
  restoreTimestampOnlyChanges(beforeSnapshot);
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
