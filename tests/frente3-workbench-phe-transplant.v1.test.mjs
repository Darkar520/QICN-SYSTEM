// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Frente 3 Pillar C verification (Workbench P/H/E campaign, sealed state transplant, live dynamic atomic separator, 5 new isolated interventions, sealed export bundle, Sistema B v5 integration).
import assert from 'node:assert/strict';
import { matureFixture, inputTape, snapshotHost } from './lib/workbench-fixtures.mjs';
import { createWorkbenchProtocol, sealData, verifyData } from '../src/experiments/workbench/contracts.js';
import { applyWorkbenchIntervention } from '../src/experiments/workbench/interventions.js';
import { restoreWorkbenchCapture } from '../src/experiments/workbench/restore.js';
import { runWorkbench, verifyWorkbenchResult } from '../src/experiments/workbench/runner.js';
import { buildSealedWorkbenchExportBundle } from '../src/experiments/workbench/pheTransplantCampaign.js';
import { createEvidenceRegistry } from '../src/language/evidential/evidenceRegistry.js';
import { prepareTurn, finalizeTurn } from '../src/language/conversationEngine.js';
import { captureRuntimeSnapshot } from '../src/language/runtimeSnapshot.js';

const { session: live, capture } = await matureFixture({ nodes: 24, warmup: 28 });
const hostBefore = snapshotHost(live);

// 1. All 5 new interventions preserve physical state before stepping (declared scope only)
const newInterventions = [
  'kaizen_learned_mode',
  'kaizen_legacy_mode',
  'sensor_observer_dynamics',
  'td_cut_eta_zero',
  'reducible_control'
];
for (const intervention of newInterventions) {
  const { session } = await restoreWorkbenchCapture(capture);
  const effect = applyWorkbenchIntervention(session, intervention);
  assert.equal(effect.physicalDigestBefore, effect.physicalDigestAfter, `${intervention} mutated physical state at t=0`);
  assert.ok(effect.allowedFields.length > 0, `${intervention} missing allowedFields`);
}

// 2. Full Workbench run including new interventions + P/H/E campaign + sealed transplant + dynamic atomic separator
const ticks = 6;
const protocol = createWorkbenchProtocol({
  profile: 'paired_intervention',
  ticks,
  inputTape: inputTape(ticks),
  branches: [
    { id: 'baseline', intervention: 'sham' },
    { id: 'sham_ctrl', intervention: 'sham' },
    { id: 'kaizen_learned', intervention: 'kaizen_learned_mode' },
    { id: 'sensor_obs', intervention: 'sensor_observer_dynamics' },
    { id: 'td_cut', intervention: 'td_cut_eta_zero' },
    { id: 'reducible', intervention: 'reducible_control' }
  ]
});

const result = await runWorkbench(capture, protocol);
assert.equal(verifyWorkbenchResult(result, capture, protocol), true);
assert.equal(result.external_support_certified, false);
assert.equal(result.evidence_scope, 'internal_support_only');

// Sham identity control
assert.equal(result.comparisons[1].maxAbsDiff, 0);
assert.equal(result.comparisons[1].fullStateIdentical, true);

// New interventions produce measurable non-zero divergence from baseline sham
const byId = Object.fromEntries(result.comparisons.map((c) => [c.branchId, c]));
assert.ok(byId.sensor_obs.maxAbsDiff > 0, 'sensor_observer_dynamics intervention failed to move trajectory');
assert.ok(byId.td_cut.maxAbsDiff > 0, 'td_cut_eta_zero intervention failed to move trajectory');
assert.ok(byId.reducible.maxAbsDiff > 0, 'reducible_control intervention failed to move trajectory');

// 3. P/H/E campaign + sealed transplant + dynamic atomic separator assertions
const phe = result.pheTransplantCampaign;
assert.ok(phe, 'pheTransplantCampaign missing');
assert.equal(phe.schema, 'qicn.workbench_phe_campaign.v1');
assert.equal(phe.evidence_scope, 'internal_support_only');
assert.equal(phe.external_support_certified, false);

// Arm P (coupled plant)
assert.equal(phe.armP.effectiveEta, '1/8');
assert.ok(phe.armP.bridge.crossSectorFluxShare > 0, 'coupled Arm P must have positive cross-sector flux share');
assert.ok(phe.armP.bridge.nodalNonFactorizabilityFlux > 0, 'coupled Arm P must have positive non-factorizability flux');
assert.ok(phe.armP.bridge.bridgeNodalSyncIndex > 0, 'coupled Arm P must have positive tower-nodal sync index');

// Arm H (transcript bottleneck frontier B < m vs B = m)
assert.equal(phe.armH.m, 4);
assert.equal(phe.armH.boundedMarginPositive, true);
assert.equal(phe.armH.sufficientBudgetCollapsesToZero, true);
assert.equal(phe.armH.tdCutParityResponse, '0');
assert.equal(phe.armH.transcriptSweep.find((r) => r.B === 2).uniformSeparationR, '1/2097152');
assert.equal(phe.armH.transcriptSweep.find((r) => r.B === 4).uniformSeparationR, '0');

// Arm E (equal-cost total replica negative control: R = 0, bit-for-bit identical)
assert.equal(phe.armE.fullStateIdentical, true);
assert.equal(phe.armE.maxAbsDiff, 0);
assert.equal(phe.armE.replicaSeparationR, '0');

// Sealed state transplant (exact continuation transfer vs untransplanted sensitivity control)
assert.equal(phe.sealedTransplant.digestVerified, true);
assert.equal(phe.sealedTransplant.transplantedFullStateIdentical, true);
assert.equal(phe.sealedTransplant.transplantedVsSourceMaxAbsDiff, 0);
assert.equal(phe.sealedTransplant.transferSensitivityPositive, true);
assert.ok(phe.sealedTransplant.untransplantedVsSourceMaxAbsDiff > 0, 'untransplanted control must diverge from midpoint-evolved trajectory');

// Live dynamic atomic separator (bidirectional vs T_d cut vs reducible A=I)
assert.equal(phe.dynamicAtomicSeparator.reducibleInterSectorFluxShare, 0);
assert.ok(phe.dynamicAtomicSeparator.integrationFluxContrast > 0);
assert.ok(phe.dynamicAtomicSeparator.bidirectionalVsTdCutMaxAbsDiff > 0);
assert.ok(phe.dynamicAtomicSeparator.bidirectionalVsReducibleMaxAbsDiff > 0);
assert.equal(phe.dynamicAtomicSeparator.algebraicDeltaIntF2, '1/4');
assert.equal(phe.dynamicAtomicSeparator.algebraicReducibleControlAeqI, '0');

// 4. Negative tamper control on pheTransplantCampaign
const resign = (value) => {
  const { digest: _old, ...body } = structuredClone(value);
  return sealData(body);
};
const tampered = structuredClone(result);
tampered.pheTransplantCampaign = resign({
  ...tampered.pheTransplantCampaign,
  armE: { ...tampered.pheTransplantCampaign.armE, replicaSeparationR: '1/2097152' }
});
assert.throws(() => verifyWorkbenchResult(resign(tampered), capture, protocol), /workbench_phe_campaign_mismatch/);

// 5. Sealed JSON export bundle verification
const exportPkg = buildSealedWorkbenchExportBundle({ capture, protocol, result });
assert.equal(exportPkg.schema, 'qicn.workbench_export_bundle.v1');
assert.equal(exportPkg.external_support_certified, false);
assert.equal(exportPkg.resultDigest, result.digest);
verifyData(exportPkg, 'qicn.workbench_export_bundle.v1');

// 6. Sistema B v5 evidence registry & local narrator surface verified P/H/E summary
const registry = createEvidenceRegistry([{ capture, protocol, result }]);
assert.equal(registry.status, 'verified_internal_copy');
assert.ok(registry.records[0].pheSummary, 'registry record should include verified pheSummary');
const snapshot = captureRuntimeSnapshot(live.bag.ontologicalCore.current, {
  tick: live.completedTick,
  now: 1800000000000,
  nodes: live.bag.nodalLayer.current.nodes,
  config: live.environment.config,
  build: capture.sourceBuild
});
const prepared = prepareTurn({
  question: 'Resume la evidencia del Workbench y la campaña P/H/E',
  snapshot,
  contract: 'evidential',
  workbenchEvidence: [{ capture, protocol, result }]
});
const localOutcome = finalizeTurn(prepared, { mode: 'local' });
assert.ok(localOutcome.text.includes('Campaña P/H/E'), 'Solo motor summary must surface verified P/H/E campaign');
assert.ok(localOutcome.text.includes('external_support_certified = false'));

// 7. Zero mutation of live host runtime
assert.deepEqual(snapshotHost(live), hostBefore, 'Workbench campaign mutated live host runtime');

console.log('OK: frente3-workbench-phe-transplant.v1 passed (5 new interventions, P/H/E arms, bit-for-bit sealed transplant, dynamic separator, tamper rejection, sealed export, Sistema B v5)');
