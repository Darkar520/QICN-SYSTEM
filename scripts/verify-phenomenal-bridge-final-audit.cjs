#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const BPFM3_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');
const DOC_AUDIT = path.join(ROOT, 'docs', 'PHENOMENAL_BRIDGE_FINAL_INTERNAL_AUDIT.md');
const DOC_READINESS = path.join(ROOT, 'docs', 'PHENOMENAL_BRIDGE_READINESS_GATE.md');

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const readText = (filePath) => fs.readFileSync(filePath, 'utf8');

const main = () => {
  execFileSync(process.execPath, [path.join(ROOT, 'scripts', 'verify-phenomenal-bridge-ecosystem.cjs')], {
    stdio: 'inherit'
  });

  assert(fs.existsSync(path.join(BPFM3_DIR, 'phenomenal_bridge_final_internal_audit.json')), 'Missing final internal audit artifact');
  assert(fs.existsSync(path.join(BPFM3_DIR, 'phenomenal_bridge_readiness_gate.json')), 'Missing readiness gate artifact');
  assert(fs.existsSync(DOC_AUDIT), 'Missing PHENOMENAL_BRIDGE_FINAL_INTERNAL_AUDIT.md');
  assert(fs.existsSync(DOC_READINESS), 'Missing PHENOMENAL_BRIDGE_READINESS_GATE.md');

  const audit = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_final_internal_audit.json'));
  const readiness = readJson(path.join(BPFM3_DIR, 'phenomenal_bridge_readiness_gate.json'));
  const auditDoc = readText(DOC_AUDIT);
  const readinessDoc = readText(DOC_READINESS);

  assert(['PASS', 'PASS_WITH_WARNINGS'].includes(audit.audit_status), 'Unexpected final audit status');
  assert(audit.layer_integrity.bpf0_intact === true, 'BPF-0 must remain intact');
  assert(audit.layer_integrity.bpf1_intact === true, 'BPF-1 must remain intact');
  assert(audit.layer_integrity.bpfm2_intact === true, 'BPF-M2 must remain intact');
  assert(audit.layer_integrity.bpfm3_root_intact === true, 'BPF-M3 root must remain intact');
  assert(audit.layer_integrity.bpfm3_ecosystem_intact === true, 'BPF-M3 ecosystem must remain intact');
  assert(audit.coherence.threshold_policy_coherent === true, 'Threshold policy must be coherent');
  assert(audit.coherence.intervention_layer_coherent === true, 'Intervention layer must be coherent');
  assert(audit.coherence.comparator_layer_coherent === true, 'Comparator layer must be coherent');
  assert(audit.coherence.reducibility_logic_coherent === true, 'Reducibility logic must be coherent');
  assert(audit.coherence.drift_logic_coherent === true, 'Drift logic must be coherent');
  assert(audit.coherence.ecosystem_integration_coherent === true, 'Ecosystem integration must be coherent');
  assert(audit.coherence.surface_discipline_preserved === true, 'Surface discipline must be preserved');
  assert(audit.coherence.claim_facing_leakage_absent === true, 'Claim-facing leakage must remain absent');

  assert(readiness.support_class === 'bridge_internal_admissible', 'Unexpected readiness support class');
  assert(readiness.bridge_ecosystem_state === 'bridge_internal_ecosystem_hardened', 'Unexpected ecosystem state');
  assert(readiness.bridge_readiness_state === 'bridge_internal_audit_ready', 'Unexpected readiness state');
  assert(readiness.paper9_final_hardening_status === 'not_ready_for_paper9_final_hardening', 'Paper 9 final hardening must remain blocked');
  assert(readiness.external_validation_status === 'external_validation_absent', 'External validation must remain absent');
  assert(readiness.human_comparator_status === 'human_comparator_absent', 'Human comparator status must remain absent');
  assert(readiness.metaphysical_closure_status === 'metaphysical_closure_not_open', 'Metaphysical closure must remain closed');
  assert(
    Array.isArray(readiness.blocking_reasons) && readiness.blocking_reasons.includes('single_run_dominated_bridge_campaign'),
    'Readiness gate must preserve the single-run blocker'
  );

  ['bridge_internal_admissible', 'not_ready_for_paper9_final_hardening', 'external_validation_absent'].forEach((token) =>
    assert(auditDoc.includes(token) || readinessDoc.includes(token), `Expected token missing from audit/readiness docs: ${token}`)
  );
  assert(!/phenomenality achieved/i.test(auditDoc), 'Audit doc must not overclaim phenomenality achieved');
  assert(!/phenomenality achieved/i.test(readinessDoc), 'Readiness doc must not overclaim phenomenality achieved');

  console.log('PASS verify-phenomenal-bridge-final-audit');
};

try {
  main();
} catch (error) {
  console.error(`FAIL verify-phenomenal-bridge-final-audit: ${error.message}`);
  process.exitCode = 1;
}
