#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const DEFAULT_SEED = 17057;

const toSafeString = (value) => (typeof value === 'string' ? value : '');

const readFileSafe = (relativePath) => {
  try {
    return fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');
  } catch (_) {
    return '';
  }
};

const toHash = (value) => crypto.createHash('sha256').update(String(value)).digest('hex');

const pickSeed = () => {
  const candidates = [
    process.env.QICN_SEED,
    process.env.COGNITIVE_EMERGENCE_EVAL_SEED,
    process.env.SEED
  ];
  for (let i = 0; i < candidates.length; i++) {
    const n = Number(candidates[i]);
    if (Number.isFinite(n) && n > 0) return Math.floor(n);
  }
  return DEFAULT_SEED;
};

const computeVersionHash = () => {
  const pkg = readFileSafe('package.json');
  const lock = readFileSafe('package-lock.json');
  const buildFile = readFileSafe('build.cjs');
  const mix = `${pkg}\n${lock}\n${buildFile}`;
  return toHash(mix).slice(0, 16);
};

const computeConfigHash = (mode) => {
  const configSnapshot = {
    mode: toSafeString(mode || 'unknown'),
    appEnv: toSafeString(process.env.APP_ENV || process.env.NODE_ENV || 'production'),
    buildMode: toSafeString(process.env.BUILD_MODE || ''),
    llmProxyEndpoint: toSafeString(process.env.LLM_PROXY_ENDPOINT || ''),
    geminiModelId: toSafeString(process.env.GEMINI_MODEL_ID || ''),
    deterministicFlag: toSafeString(process.env.RENDER_DETERMINISTIC || ''),
    seed: pickSeed()
  };
  return toHash(JSON.stringify(configSnapshot)).slice(0, 24);
};

const computeFreezeRef = () => {
  try {
    const raw = fs.readFileSync(path.join(PROJECT_ROOT, '..', 'artifacts', 'release_audit', 'final_release_freeze.json'), 'utf8');
    const parsed = JSON.parse(raw);
    return String(
      parsed?.freeze_id ||
      parsed?.release_id ||
      parsed?.releaseFreezeId ||
      parsed?.freeze_name ||
      'release_freeze_unavailable'
    );
  } catch (_) {
    return 'release_freeze_unavailable';
  }
};

const createRunId = () => {
  const ts = Date.now().toString(36);
  const rnd = crypto.randomBytes(4).toString('hex');
  return `${ts}-${rnd}`;
};

const buildRunMetadata = (mode) => ({
  runId: createRunId(),
  versionHash: computeVersionHash(),
  seed: pickSeed(),
  configHash: computeConfigHash(mode),
  mode: toSafeString(mode || 'unknown'),
  freezeRef: computeFreezeRef(),
  thresholdAuthorityRef: 'artifacts/release_audit/final_claim_status_ledger.csv',
  sourceOfTruth: 'src'
});

const emitRunMetadata = (mode) => {
  const payload = buildRunMetadata(mode);
  process.stdout.write(`${JSON.stringify(payload)}\n`);
  return payload;
};

if (require.main === module) {
  const mode = process.argv[2] || 'manual';
  emitRunMetadata(mode);
}

module.exports = {
  DEFAULT_SEED,
  buildRunMetadata,
  emitRunMetadata
};
