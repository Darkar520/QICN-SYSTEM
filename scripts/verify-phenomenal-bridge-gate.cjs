#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const BPFM3_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');
const LOCAL_PATH_PATTERN =
  /\/c:\/|[A-Za-z]:\\Users\\|OneDrive|Escritorio|TRADING 3\.0|\.\.[/\\]release_repo_qicn_2026-03-01|\.\.[/\\]rigid-identity-framework/i;
const BANNED_PATTERNS = [
  /bridge support achieved/i,
  /external validation achieved/i,
  /paper ?10/i
];
const ALLOWED_CLASSIFICATIONS = new Set([
  'bridge_evaluation_unsupported',
  'bridge_drift_invalidated',
  'bridge_reducible',
  'bridge_interventionally_unstable',
  'bridge_gate_fail',
  'bridge_insufficient_support',
  'bridge_internal_formalized',
  'bridge_internal_admissible',
  'bridge_internal_strong_support'
]);

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const ensureNoLeakage = (payload, label) => {
  const text = JSON.stringify(payload, null, 2);
  assert(!LOCAL_PATH_PATTERN.test(text), `Path leak found in ${label}`);
  BANNED_PATTERNS.forEach((pattern) =>
    assert(!pattern.test(text), `Overclaim wording found in ${label}: ${pattern}`)
  );
};

const verifyRootArtifacts = () => {
  const projection = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_projection.json'));
  const gateResult = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_gate_result.json'));
  const manifest = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_manifest.json'));
  const thresholds = readJson(path.join(ROOT, 'docs', 'phenomenal_bridge_thresholds.v1.json'));

  ['Pi_D', 'Pi_V', 'Pi_W', 'Pi_A', 'Pi_E', 'Pi_T', 'R_b', 'Delta_b'].forEach((key) => {
    assert(typeof projection.coordinate_estimates[key] === 'number', `Projection missing coordinate ${key}`);
    assert(typeof gateResult.gate_inputs[key] === 'number', `Gate inputs missing ${key}`);
    assert(typeof gateResult.local_threshold_results[key]?.pass === 'boolean', `Local threshold result missing ${key}`);
  });
  assert(ALLOWED_CLASSIFICATIONS.has(gateResult.classification), 'Unexpected root gate classification');
  assert(gateResult.gate_definition.non_compensatory === true, 'Gate must be non-compensatory');
  assert(gateResult.gate_definition.functional_is_not_gate === true, 'Functional must remain distinct from gate');
  assert(manifest.threshold_binding_status === thresholds.status, 'Manifest threshold status drift');
  assert(manifest.support_class === gateResult.classification, 'Manifest support class mismatch');
  assert(projection.bridge_functional.not_the_gate === true, 'Projection must state that functional is not the gate');
  assert(projection.bridge_reducibility_status_summary.best_weak_rival, 'Projection must expose best weak rival');
  assert(projection.bridge_reducibility_status_summary.best_bridge_composite, 'Projection must expose best bridge composite');

  const gammaExpected = Math.min(...Object.values(gateResult.gate_inputs));
  assert(
    Math.abs(gammaExpected - gateResult.global_threshold_results.Gamma_bpf.observed) < 1e-12,
    'Gamma_bpf must equal min gate input'
  );
  assert(
    Math.abs(projection.bridge_functional.value - gateResult.global_threshold_results.Phi_bpf.observed) < 1e-12,
    'Phi_bpf mismatch between projection and gate result'
  );

  const anyLocalFail = Object.values(gateResult.local_threshold_results).some((entry) => entry.pass !== true);
  const anyGlobalFail = Object.values(gateResult.global_threshold_results).some((entry) => entry.pass !== true);
  if (anyLocalFail || anyGlobalFail || gateResult.invalidation_reasons.length > 0) {
    assert(gateResult.gate_status !== 'pass', 'Gate must fail under local/global threshold failure or invalidation');
  }

  ensureNoLeakage(projection, 'phenomenal_bridge_projection.json');
  ensureNoLeakage(gateResult, 'phenomenal_bridge_gate_result.json');
  ensureNoLeakage(manifest, 'phenomenal_bridge_manifest.json');
};

const verifySyntheticInvalidation = async () => {
  const imported = await import(pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href);
  const evaluator = imported.createPhenomenalBridgeGateEvaluator();
  const reducibility = readJson(path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm2', 'bridge_reducibility_report.json'));
  const manifest = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_manifest.json'));

  const unsupported = evaluator.evaluate({
    reducibilityReport: {
      ...reducibility,
      comparison_supported: false,
      classification: 'bridge_comparison_unsupported'
    }
  });
  assert(unsupported.gate_result.gate_status === 'fail', 'Comparator unsupported must fail the gate');
  assert(
    unsupported.gate_result.invalidation_reasons.includes('comparator_unsupported'),
    'Comparator unsupported invalidation reason missing'
  );

  const lineageBroken = JSON.parse(JSON.stringify(manifest));
  lineageBroken.lineage.protocol.sha256 = 'broken-lineage';
  const lineageEval = evaluator.evaluate({ previousManifest: lineageBroken });
  assert(lineageEval.gate_result.gate_status === 'fail', 'Lineage invalidation must fail the gate');
  assert(
    lineageEval.gate_result.invalidation_reasons.some((reason) => reason.startsWith('lineage:')),
    'Lineage invalidation reason missing'
  );

  const driftBroken = JSON.parse(JSON.stringify(manifest));
  driftBroken.projection_snapshot.coordinate_estimates.Pi_D = 0.02;
  const driftEval = evaluator.evaluate({ previousManifest: driftBroken });
  assert(driftEval.gate_result.gate_status === 'fail', 'Drift invalidation must fail the gate');
  assert(
    driftEval.gate_result.invalidation_reasons.some((reason) => reason === 'drift:Pi_D'),
    'Drift invalidation reason missing'
  );
};

const main = async () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-reducibility.cjs')], {
    stdio: 'inherit'
  });
  const rootRequired = [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json'
  ];
  const shouldWrite = process.argv.includes('--write')
    || rootRequired.some((fileName) => !fs.existsSync(path.join(BPFM3_DIR, fileName)));
  if (shouldWrite) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'build-phenomenal-bridge-root.cjs')], {
      stdio: 'inherit'
    });
  }

  [
    'phenomenal_bridge_projection.json',
    'phenomenal_bridge_gate_result.json',
    'phenomenal_bridge_manifest.json'
  ].forEach((fileName) =>
    assert(fs.existsSync(path.join(BPFM3_DIR, fileName)), `Missing root artifact ${fileName}`)
  );

  verifyRootArtifacts();
  await verifySyntheticInvalidation();

  console.log('PASS verify-phenomenal-bridge-gate');
};

main().catch((error) => {
  console.error(`FAIL verify-phenomenal-bridge-gate: ${error.message}`);
  process.exitCode = 1;
});
