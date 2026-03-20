#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { pathToFileURL } = require('node:url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_PATH = path.join(ROOT, 'docs', 'cognitive_emergence_prereg.v1.json');

const run = async () => {
  const specModule = await import(
    pathToFileURL(path.join(ROOT, 'src', 'config', 'cognitiveEmergenceOperationalSpec.js')).href
  );

  const validation = specModule.validateCognitiveEmergenceSpec();
  const hashes = specModule.computeCognitiveEmergenceSpecHashes();

  const payload = {
    generatedAt: new Date().toISOString(),
    specVersion: specModule.COGNITIVE_EMERGENCE_SPEC_VERSION,
    preregistrationId: specModule.COGNITIVE_EMERGENCE_PREREGISTRATION_ID,
    frozenActuatorSetVersion: specModule.COGNITIVE_EMERGENCE_ACTUATOR_SET_VERSION,
    specHash: hashes.specHash,
    actuatorSetHash: hashes.actuatorSetHash,
    specLock: specModule.COGNITIVE_EMERGENCE_SPEC_LOCK,
    actuatorSet: specModule.COGNITIVE_EMERGENCE_ACTUATOR_SET,
    primaryMetrics: specModule.COGNITIVE_EMERGENCE_PRIMARY_METRICS,
    secondaryMetrics: specModule.COGNITIVE_EMERGENCE_SECONDARY_METRICS,
    primaryMetricOrder: specModule.COGNITIVE_EMERGENCE_PRIMARY_METRICS.map((entry) => entry.id),
    testCriteria: specModule.COGNITIVE_EMERGENCE_TEST_CRITERIA,
    computeBudgetMs: specModule.COGNITIVE_EMERGENCE_COMPUTE_BUDGET_MS,
    computeBudgetPolicy: specModule.COGNITIVE_EMERGENCE_COMPUTE_BUDGET_POLICY,
    identityScoreModel: specModule.COGNITIVE_EMERGENCE_IDENTITY_SCORE_MODEL,
    languageLeakagePolicy: specModule.COGNITIVE_EMERGENCE_LANGUAGE_LEAKAGE_POLICY,
    preregProtocol: specModule.COGNITIVE_EMERGENCE_PREREG_PROTOCOL,
    analysisProtocolLocked: true,
    claimBoundary: specModule.COGNITIVE_EMERGENCE_CLAIM_BOUNDARY,
    validation
  };

  const compatibility = specModule.validateSpecCompatibility(payload);
  payload.compatibility = compatibility;
  payload.preregisteredCommandEvidence = [
    'npm test',
    'npm run build',
    'npm run scoreboard:run'
  ];
  payload.preregChecksum = crypto
    .createHash('sha256')
    .update(JSON.stringify(payload))
    .digest('hex');

  fs.writeFileSync(OUTPUT_PATH, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  console.log(`[cognitive-prereg] wrote ${OUTPUT_PATH}`);
  console.log(`[cognitive-prereg] spec valid: ${validation.valid}`);
  console.log(`[cognitive-prereg] compatibility valid: ${compatibility.valid}`);
  if (!validation.valid || !compatibility.valid) {
    process.exit(1);
  }
};

run().catch((error) => {
  console.error('[cognitive-prereg] failed:', error?.stack || error?.message || String(error));
  process.exit(1);
});
