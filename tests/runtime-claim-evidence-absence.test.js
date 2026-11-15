import assert from 'node:assert/strict';
import { buildCanonicalClaimMappingSnapshot } from '../src/canon/claimMapping/runtimeClaimMapping.js';
import { buildCanonicalInvariantPackage } from '../src/canon/invariants/CanonicalInvariantPackage.js';
import { evaluateP503ThresholdRuntime } from '../src/canon/thresholds/P503ThresholdRuntime.js';

for (const input of [{}, { externalEvidence: { unrelated: { pass: true } } }]) {
  const result = buildCanonicalClaimMappingSnapshot(input);
  const projection = result.runtimeClaimProjection.P5_05;
  assert.equal(projection.runtimePath, 'PARTIAL_RUNTIME_PATH');
  assert.equal(projection.claimClosingReadiness, 'INSUFFICIENT_FOR_CLAIM_CLOSING');
  assert.equal(projection.supportInterpretation, 'batch_negative_controls_not_consumed');
  assert.equal(result.runtimeCoverage.P5_05, 'PARTIAL_RUNTIME_PATH');
  assert.equal(result.fullNativeInvariantStatus.I_leg.scoreEvidenceStatus, 'not_recorded');
  assert.equal(result.runtimeClaimProjection.P5_01.firstFailingInvariant, null);
  assert.equal(result.runtimeClaimProjection.P5_01.closureCleanliness, 'not_recorded');
  assert.equal(result.runtimeClaimProjection.P5_03.supportInterpretation, 'runtime_threshold_evidence_incomplete');
  assert.equal(result.runtimeClaimProjection.P5_03.firstFailOffset, null);
  assert.equal(result.p503ThresholdRuntime.profiles.length, 0);
}
const withObservation = buildCanonicalInvariantPackage({summary:{metrics:{pmia:0.2}}}).invariants;
assert.equal(withObservation.I_int.provenance.scoreEvidenceStatus, 'partial_recorded');
assert.equal(withObservation.I_leg.provenance.scoreEvidenceStatus, 'not_recorded');
const ids = ['I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg'];
const syntheticComplete = {invariants:Object.fromEntries(ids.map(id => [id, {
  score:0.9, provenance:{scoreEvidenceStatus:'complete_recorded'}
}]))};
const positive = evaluateP503ThresholdRuntime({invariantPackage:syntheticComplete});
assert.ok(positive.profiles.length > 0, 'explicit complete fixture should exercise the threshold machinery');
syntheticComplete.invariants.I_int.provenance.scoreEvidenceStatus = 'partial_recorded';
const partial = evaluateP503ThresholdRuntime({invariantPackage:syntheticComplete});
assert.equal(partial.profiles.length, 0, 'partial data cannot establish a formal threshold crossing');
assert.ok(partial.closureSummary.missingInvariantEvidence.includes('I_int'));
const noData = buildCanonicalInvariantPackage({}).invariants;
const forged = buildCanonicalClaimMappingSnapshot({externalEvidence:{runtimeBoundaryRuntime:{closureSummary:{
  readiness:'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE', claimClosingReadiness:'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
}}}});
assert.equal(forged.boundaryRuntimeSelection.selected, 'local');
assert.equal(forged.externalEvidenceSummary.runtimeBoundaryProvided, true);
assert.equal(forged.externalEvidenceSummary.runtimeBoundaryVerified, false);
assert.equal(forged.runtimeClaimProjection.P5_01.claimClosingReadiness, 'INSUFFICIENT_FOR_CLAIM_CLOSING');
const unverifiedPairs = buildCanonicalClaimMappingSnapshot({externalEvidence:{runtimeSubstrateFamily:{pairs:[{pass:true}]}}});
assert.equal(unverifiedPairs.externalEvidenceSummary.runtimeSubstrateFamilyProvided, true);
assert.equal(unverifiedPairs.externalEvidenceSummary.runtimeSubstrateFamilyVerified, false);
assert.equal(unverifiedPairs.runtimeClaimProjection.P5_02.claimClosingReadiness, 'INSUFFICIENT_FOR_CLAIM_CLOSING');
assert.equal(unverifiedPairs.runtimeClaimProjection.P5_06.pairCount, 0);
for (const id of ['I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg']) {
  assert.equal(noData[id].provenance.scoreEvidenceStatus, 'not_recorded');
  assert.equal(noData[id].score, 0);
  assert.equal(noData[id].provenance.directRuntimeContribution, 0);
}
assert.equal(noData.I_cont.directSignals.continuityFormalAdmissible, null);
const incompleteContinuity = buildCanonicalInvariantPackage({ticks:[{metrics:{}},{metrics:{}}]}).invariants.I_cont;
assert.equal(incompleteContinuity.directSignals.fragmentationBound, null);
assert.equal(incompleteContinuity.directSignals.continuityFormalAdmissible, null);
const unlabeled = {metrics:{ccc:0.5,beth_q:0.5,omega:0.5,spectral_gap:0.5}};
assert.equal(buildCanonicalInvariantPackage({ticks:[unlabeled,unlabeled]}).invariants.I_cont.directSignals.continuityFormalAdmissible, null,
  'an unrecorded regime label must not be synthesized as a continuity observation');
console.log('OK: missing batch evidence cannot create P5-05 readiness');
