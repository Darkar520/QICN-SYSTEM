// Audit-driven regression tests for CanonicalInvariantPackage.js and emit-run-metadata.cjs
// Covers fixes identified during the QICN framework audit:
//   1. continuityRatio() returns null (not 1) for empty/single-tick arrays
//   2. persistenceScore handles null continuityRatio via ?? 0
//   3. emit-run-metadata includes versionHashFull, configHashFull, configFilesHash
//   4. buildRunMetadata versionHash/configHash retain short display fields
// Run with: node tests/canonical-invariant-audit.v1.test.js

import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import path from 'path';

const require = createRequire(import.meta.url);
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const { buildCanonicalInvariantPackage } = await import('../src/canon/invariants/CanonicalInvariantPackage.js');

  // --- continuityRatio edge cases ---

  // CASE 1: empty ticks → continuityRatio must be null (not 1)
  const r1 = buildCanonicalInvariantPackage({});
  assert(
    r1.invariants.I_per.directSignals.continuityRatio === null,
    'CASE 1 FAIL: continuityRatio must be null for empty ticks, not 1 (prevents score inflation)'
  );
  assert(
    Number.isFinite(r1.invariants.I_per.score),
    'CASE 1 FAIL: persistenceScore must remain finite when continuityRatio is null'
  );
  assert(
    r1.invariants.I_per.score >= 0 && r1.invariants.I_per.score <= 1,
    'CASE 1 FAIL: persistenceScore must remain in [0, 1] when continuityRatio is null'
  );

  // CASE 2: single tick → continuityRatio must be null
  const r2 = buildCanonicalInvariantPackage({
    ticks: [{ tick: 0, metrics: { stasis_index: 0.5 } }]
  });
  assert(
    r2.invariants.I_per.directSignals.continuityRatio === null,
    'CASE 2 FAIL: continuityRatio must be null for single-tick run (< 2 ticks)'
  );

  // CASE 3: two sequential ticks → continuityRatio is 1, score should be computable
  const r3 = buildCanonicalInvariantPackage({
    ticks: [
      { tick: 0, metrics: { stasis_index: 0.1 } },
      { tick: 1, metrics: { stasis_index: 0.1 } }
    ]
  });
  assert(
    r3.invariants.I_per.directSignals.continuityRatio === 1,
    'CASE 3 FAIL: continuityRatio must be 1 for two perfectly sequential ticks'
  );
  assert(
    Number.isFinite(r3.invariants.I_per.score) && r3.invariants.I_per.score > 0,
    'CASE 3 FAIL: persistenceScore must be positive for two sequential ticks'
  );

  // CASE 4: two non-sequential ticks → continuityRatio is 0
  const r4 = buildCanonicalInvariantPackage({
    ticks: [
      { tick: 0, metrics: {} },
      { tick: 5, metrics: {} }
    ]
  });
  assert(
    r4.invariants.I_per.directSignals.continuityRatio === 0,
    'CASE 4 FAIL: continuityRatio must be 0 for non-sequential ticks'
  );

  // CASE 5: 100 sequential ticks → continuityRatio is 1 with proper 6-decimal format
  const ticks100 = Array.from({ length: 100 }, (_, i) => ({ tick: i, metrics: { stasis_index: 0.05 } }));
  const r5 = buildCanonicalInvariantPackage({ ticks: ticks100 });
  assert(
    r5.invariants.I_per.directSignals.continuityRatio === 1,
    'CASE 5 FAIL: continuityRatio must be 1 for 100 sequential ticks'
  );
  assert(
    r5.invariants.I_per.score > 0.4,
    'CASE 5 FAIL: persistenceScore should be meaningful for 100-tick sequential run'
  );

  // CASE 6: empty-ticks score must be strictly lower than full sequential run score
  // This validates that the old "return 1" inflation is gone
  assert(
    r1.invariants.I_per.score < r5.invariants.I_per.score,
    'CASE 6 FAIL: empty-run persistenceScore must be strictly lower than a proper sequential run (old code inflated empty runs to same level)'
  );

  // --- emit-run-metadata audit fixes ---

  const { buildRunMetadata } = require(path.join(__dirname, '../scripts/emit-run-metadata.cjs'));
  const metadata = buildRunMetadata('audit-test');

  // CASE 7: versionHash (short) must be present
  assert(
    typeof metadata.versionHash === 'string' && metadata.versionHash.length === 16,
    'CASE 7 FAIL: versionHash must be a 16-char display hash'
  );

  // CASE 8: versionHashFull must be the full SHA256 (64 hex chars)
  assert(
    typeof metadata.versionHashFull === 'string' && metadata.versionHashFull.length === 64,
    'CASE 8 FAIL: versionHashFull must be a full 64-char SHA256 hex string'
  );

  // CASE 9: versionHash must be a prefix of versionHashFull
  assert(
    metadata.versionHashFull.startsWith(metadata.versionHash),
    'CASE 9 FAIL: versionHash must be a prefix of versionHashFull'
  );

  // CASE 10: configHash (short) must be present
  assert(
    typeof metadata.configHash === 'string' && metadata.configHash.length === 24,
    'CASE 10 FAIL: configHash must be a 24-char display hash'
  );

  // CASE 11: configHashFull must be the full SHA256
  assert(
    typeof metadata.configHashFull === 'string' && metadata.configHashFull.length === 64,
    'CASE 11 FAIL: configHashFull must be a full 64-char SHA256 hex string'
  );

  // CASE 12: configHash must be a prefix of configHashFull
  assert(
    metadata.configHashFull.startsWith(metadata.configHash),
    'CASE 12 FAIL: configHash must be a prefix of configHashFull'
  );

  // CASE 13: configFilesHash must be present and non-empty
  assert(
    typeof metadata.configFilesHash === 'string' && metadata.configFilesHash.length > 0,
    'CASE 13 FAIL: configFilesHash must be a non-empty string'
  );

  // CASE 14: configFilesHash must be a 64-char SHA256 (since config/ has JSON files) or a known sentinel
  const isValidConfigFilesHash = (h) => h.length === 64 || h === 'config_files_empty' || h === 'config_files_unavailable';
  assert(
    isValidConfigFilesHash(metadata.configFilesHash),
    'CASE 14 FAIL: configFilesHash must be a full SHA256 or a known sentinel (config_files_empty / config_files_unavailable)'
  );

  // CASE 15: metadata must retain existing required fields
  assert(typeof metadata.runId === 'string' && metadata.runId.length > 0, 'CASE 15 FAIL: runId must be present');
  assert(Number.isFinite(Number(metadata.seed)), 'CASE 15 FAIL: seed must be numeric');
  assert(metadata.mode === 'audit-test', 'CASE 15 FAIL: mode must reflect execution mode');
  assert(metadata.sourceOfTruth === 'src', 'CASE 15 FAIL: sourceOfTruth must be src');

  console.log('OK: canonical-invariant-audit.v1 tests passed');
})().catch((err) => {
  console.error('FAIL: canonical-invariant-audit.v1 tests failed:', err.message);
  process.exit(1);
});
