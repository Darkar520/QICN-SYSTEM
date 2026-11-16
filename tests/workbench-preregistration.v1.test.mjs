import assert from 'node:assert/strict';
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const workbench = JSON.parse(fs.readFileSync('config/workbench/preregister.v1.json', 'utf8'));
const language = JSON.parse(fs.readFileSync('config/language/system-b-preregister.v1.json', 'utf8'));
const baseline = '4142610792c51a171db3b965ff314646fa5535c1';
for (const protocol of [workbench, language]) {
  assert.equal(protocol.source_commit, baseline);
  assert.equal(protocol.evidence_scope, 'internal_support_only');
  assert.equal(protocol.external_support_certified, false);
  assert.equal(protocol.implementation_status, 'not_recorded');
}
assert.deepEqual(workbench.historical_v1.seeds, [11, 23, 37, 41, 53]);
assert.deepEqual(workbench.paired_protocol.held_out_seeds, [67, 79, 97, 101, 113]);
assert.equal(workbench.historical_v1.warmup_ticks, 420);
assert.equal(workbench.historical_v1.evaluation_ticks, 180);
assert.equal(workbench.historical_v1.nodes, 250);
assert.equal(workbench.historical_v1.action_divergence_min, 0.2);
assert.equal(workbench.historical_v1.anchor_l2_min, 0.08);
assert.equal(workbench.historical_v1.viability_gain_min, 0.03);
assert.equal(workbench.historical_v1.required_seeds, 4);
assert.equal(workbench.historical_v1.stage0_memory_reproduction.cn3_erased_history, false);
assert.equal(workbench.historical_v1.stage0_memory_reproduction.allPreregisteredCriteriaPass, false);
assert.equal(workbench.engineering_acceptance.scientific_effect_positive_required, false);
assert.equal(workbench.engineering_acceptance.cn4_maxAbsDiff, 0);
assert.equal(workbench.engineering_acceptance.observerChannelChangesTrajectory, false);
assert.equal(language.invariants.OPEN_FRAME_may_suspend_factual_verification, false);
assert.equal(language.gemini_role.not_limited_to_closed_answer_templates, true);
assert.equal(language.gemini_role.cannot_certify_its_own_annotations, true);
assert.equal(language.compatibility.v3_fixed_cases, 87);
assert.equal(language.compatibility.v4_fixed_cases, 95);

// Freeze the actual historical predicates and fixed compatibility batteries,
// not just a second copy of their thresholds in a new JSON document.
for (const file of [
  'scripts/run-historical-dependence-ablation.mjs',
  'tests/language-grounded-conversation.v2.test.mjs',
  'tests/language-semantic-contract.v3.test.mjs',
  'tests/language-free-contract.v4.test.mjs'
]) {
  const original = execFileSync('git', ['show', `${baseline}:${file}`], { encoding: 'utf8', windowsHide: true });
  assert.equal(fs.readFileSync(file, 'utf8').replace(/\r\n/g, '\n'), original.replace(/\r\n/g, '\n'), `Frozen protocol/battery changed: ${file}`);
}
console.log('OK: preregistration boundaries, honest historical failure and frozen v1/v2/v3/v4 anchors');
