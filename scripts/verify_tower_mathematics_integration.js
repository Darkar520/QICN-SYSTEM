/**
 * End-to-End Verification Suite for the Integrated Mathematical Corpus
 * (Papers I-X, Paper Puente, Frentes 1-5, WritablePrefixTower, BodyWorldTower)
 * inside QICN-SYSTEM.
 */

import assert from 'node:assert/strict';
import { F, ZERO, ONE, HALF } from '../src/simulation/tower/ExactFraction.js';
import {
  ALTERNATING,
  CONTEXTS,
  SITES,
  createState,
  nativeReadout,
  advance,
  Mechanism,
  IDENTITY,
  COMMON,
  EVALUATIVE,
  H
} from './tower_exports_bridge.js';
import { verifySigmaApproximateAutomodels } from '../src/simulation/tower/SigmaAutomodelTruncator.js';
import { evaluateFoundationalFront1 } from '../src/canon/finite_horizon/FiniteProjectionEvaluator.js';
import { runTowerViabilityAndBoundaryControls } from '../src/canon/persistence/PersistenceCertifier.js';
import { verifyTowerLegibilityHorizon } from '../src/experiments/LegibilityCertifier.js';
import { verifyTowerJointSubjecthoodCertificate } from '../src/experiments/LifeCertifier.js';
import { verifyTowerCommonPlantAndInteractionNonFactorization } from '../src/experiments/NonFactorizationProver.js';
import {
  runInformedReserveSuite,
  runSelectiveAddressLesionSuite
} from '../src/subjectivity/InformedReserveEvaluator.js';
import { runFullBodyWorldBridgeVerification } from '../src/phenomenal_bridge/BridgeTransportAndBurdensEvaluator.js';
import { runFullStatisticalAdjudicationSuite } from '../src/comparative_program/StatisticalAdjudicationEngine.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { captureTowerSnapshot } from '../src/language/runtimeSnapshot.js';

export function runAllTowerMathematicsChecks() {
  const f1 = evaluateFoundationalFront1();
  assert.equal(f1.passed, true, 'Frente 1 (Paper I + Projective Tape) failed');
  assert.equal(f1.ternaryPairsChecked, 4032);

  const viability = runTowerViabilityAndBoundaryControls();
  assert.equal(viability.passed, true, 'Tower viability & boundary controls failed');
  assert.equal(viability.activeRecoveriesVerified, 126);
  assert.equal(viability.boundaryTracesVerified, 63);

  const legibility = verifyTowerLegibilityHorizon();
  assert.equal(legibility.passed, true, 'Frente 2 Legibility Horizon failed');
  assert.equal(legibility.trialsVerified, 105);

  const jointCert = verifyTowerJointSubjecthoodCertificate();
  assert.equal(jointCert.passed, true, 'Frente 2 Joint Subjecthood Certificate failed');
  assert.equal(jointCert.continuityChecks, 56);
  assert.equal(jointCert.discriminationChecks, 28);
  assert.equal(jointCert.ownershipPairedProtocols, 84);

  const nonFact = verifyTowerCommonPlantAndInteractionNonFactorization();
  assert.equal(nonFact.passed, true, 'Non-factorization prover checks failed');
  assert.equal(nonFact.profileSeparationGap, '1/80');
  assert.equal(nonFact.fiberContractionConstant, '9/16');

  const sigma = verifySigmaApproximateAutomodels();
  assert.equal(sigma.passed, true, 'Frente 4 Paper Puente Sigma Automodels failed');
  assert.equal(sigma.fiberChecks, 144);

  const reserve = runInformedReserveSuite();
  assert.equal(reserve.passed, true, 'Frente 3 Informed Reserve failed');
  assert.equal(reserve.strataCount, 84);
  assert.equal(reserve.publicTieForcedRisk, '1/2');
  assert.equal(reserve.privateSignalRiskGap, '1/2');

  const lesions = runSelectiveAddressLesionSuite();
  assert.equal(lesions.passed, true, 'Frente 2/3 5 Selective Address Lesions failed');
  assert.equal(lesions.trials, 30);
  assert.equal(lesions.productGateCoordinate, '1/48');

  const bodyWorld = runFullBodyWorldBridgeVerification();
  assert.equal(bodyWorld.passed, true, 'Body-World Extension & Paper IX Bridge failed');
  assert.deepEqual(bodyWorld.sixBurdensJointCertificate, [1, 1, 1, 1, 1, 1]);
  assert.equal(bodyWorld.lesionMatrixRank, 6);
  assert.equal(bodyWorld.minimumCertificateMargin, '13/96');
  assert.equal(bodyWorld.sharedHybridObstructionDocumented, true);

  const front5 = runFullStatisticalAdjudicationSuite();
  assert.equal(front5.passed, true, 'Frente 5 Statistical Adjudication (Papers IV & X) failed');
  assert.equal(front5.paper4CampaignControls.exactSize, '5425/262144');
  assert.equal(front5.paper10AdjudicationControls.multinomialLawsVerified, 112);
  assert.equal(front5.paper10AdjudicationControls.stationaryAr1GlsEstimate, '4/5');
  assert.equal(front5.external_support_certified, false);

  // Runtime core coupling & signed language snapshot check
  const core = new OntologicalSingularityCore({ selfModelDepth: 6 });
  for (let tick = 1; tick <= 8; tick += 1) {
    const telemetry = core.stepCoupledTower({
      sensorySignal: 0.6,
      sensorDelta: 0.12,
      entropyExcitation: 0.4,
      plannedAction: tick % 2 === 0 ? 0.2 : -0.2,
      evaluate: true
    });
    assert.equal(typeof telemetry.core.phase, 'number');
    assert.equal(telemetry.sigmaTheoremVerified, true);
  }
  const snap = captureTowerSnapshot(core);
  assert.equal(snap.schema, 'qicn.tower_snapshot.v1');
  assert.equal(typeof snap.digest, 'string');
  assert.equal(snap.digest.length, 64);

  return {
    passed: true,
    f1,
    viability,
    legibility,
    jointCert,
    nonFact,
    sigma,
    reserve,
    lesions,
    bodyWorld,
    front5,
    runtimeTowerSnapshotDigest: snap.digest,
    external_support_certified: false
  };
}

if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}` || process.argv[1]?.endsWith('verify_tower_mathematics_integration.js')) {
  const summary = runAllTowerMathematicsChecks();
  console.log('[tower-math] PASS: All Frentes 1-5 + Body-World Tower runtime checks succeeded.');
  console.log(`  - Frente 1 (Paper I + Tape): ${summary.f1.ternaryPairsChecked} ternary pairs, ${summary.f1.projectiveCutAgreements} cut agreements`);
  console.log(`  - Frente 2 (Papers V & VII): ${summary.legibility.trialsVerified} horizon trials, ${summary.jointCert.ownershipPairedProtocols} ownership protocols`);
  console.log(`  - Frente 3 (Papers VI & VIII): ${summary.reserve.strataCount} reserve strata, public tie ${summary.reserve.publicTieForcedRisk}, private TV gap ${summary.reserve.privateSignalRiskGap}`);
  console.log(`  - Frente 4 (Paper Puente & IX): ${summary.sigma.fiberChecks} T_d fiber checks, 6x6 lesion rank ${summary.bodyWorld.lesionMatrixRank}, min margin ${summary.bodyWorld.minimumCertificateMargin}`);
  console.log(`  - Frente 5 (Papers IV & X): ${summary.front5.paper10AdjudicationControls.multinomialLawsVerified} multinomial laws, AR(1) GLS=${summary.front5.paper10AdjudicationControls.stationaryAr1GlsEstimate}`);
  console.log(`  - Runtime Coupling Snapshot SHA-256: ${summary.runtimeTowerSnapshotDigest}`);
  console.log(`  - external_support_certified=${summary.external_support_certified}`);
}
