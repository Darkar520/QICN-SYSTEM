import assert from 'node:assert/strict';
import {
  PhenomenologyProtocolTracker,
  buildWorkspaceSnapshot,
  computePciLikeScore,
  computeDoubleDissociation,
  computeValenceIntervention,
  runPhenomenologyProtocolSynthetic
} from '../src/utils/phenomenologyProtocolSuite.js';

try {
  // CASE 1: workspace snapshot should return bounded scores and fixed vector width.
  {
    const snapshot = buildWorkspaceSnapshot({
      ccc: 1.02,
      omega: 1.31,
      bethQ: 0.88,
      pmia: 0.21,
      stasisIndex: 0.18,
      sensorySignal: 0.63,
      entropyExcitation: 0.42,
      plannerAction: 0.14,
      predictionError: 0.08,
      moduleReadFanout: 8,
      writeAttempts: 4,
      writeConflicts: 1,
      reportLength: 420,
      narrativeIntegrity: 0.81,
      actionImpactProxy: 0.74
    });
    assert.equal(snapshot.workspaceVector.length, 10, 'CASE 1 FAIL: workspace vector width must be 10.');
    assert.ok(snapshot.workspaceAccess >= 0 && snapshot.workspaceAccess <= 1, 'CASE 1 FAIL: workspaceAccess out of bounds.');
    assert.ok(snapshot.reportability >= 0 && snapshot.reportability <= 1, 'CASE 1 FAIL: reportability out of bounds.');
  }

  // CASE 2: PCI-like score should increase with perturbation diversity.
  {
    const low = computePciLikeScore(
      Array.from({ length: 48 }, (_, idx) => ({
        responseScore: 0.52 + ((idx % 2) * 0.005),
        perturbation: false
      }))
    );
    const high = computePciLikeScore(
      Array.from({ length: 48 }, (_, idx) => ({
        responseScore: 0.35 + ((idx % 7) * 0.08),
        perturbation: idx % 3 === 0
      }))
    );
    assert.ok(high.pciLikeScore > low.pciLikeScore, 'CASE 2 FAIL: high perturbation complexity should raise PCI-like score.');
  }

  // CASE 3: dissociation index should be positive when both dissociation conditions exist.
  {
    const series = [];
    for (let i = 0; i < 24; i += 1) {
      series.push({
        performanceScore: i % 2 === 0 ? 0.72 : 0.33,
        workspaceAccess: i % 2 === 0 ? 0.38 : 0.68
      });
    }
    const dissociation = computeDoubleDissociation(series);
    assert.ok(dissociation.dissociationIndex > 0.08, 'CASE 3 FAIL: dissociation index should exceed minimum threshold.');
  }

  // CASE 4: valence intervention should show positive do-effect in treated cohort.
  {
    const series = [];
    for (let i = 0; i < 60; i += 1) {
      const intervention = i % 3 === 0;
      series.push({
        intervention,
        plannerAction: intervention ? 0.65 : 0.12,
        responseScore: intervention ? 0.76 : 0.58
      });
    }
    const valence = computeValenceIntervention(series);
    assert.ok(valence.valenceDoEffect > 0.02, 'CASE 4 FAIL: valence do-effect should be positive.');
    assert.ok(valence.actuatorCausalImpact > 0.05, 'CASE 4 FAIL: actuator causal impact should exceed minimum.');
  }

  // CASE 5: tracker should aggregate runtime-style samples and expose PPS metrics.
  {
    const tracker = new PhenomenologyProtocolTracker(120);
    for (let tick = 0; tick < 120; tick += 1) {
      tracker.record({
        tick,
        workspaceAccess: 0.58 + ((tick % 4) * 0.04),
        reportability: 0.61 + ((tick % 5) * 0.03),
        performanceScore: tick % 2 === 0 ? 0.7 : 0.4,
        perturbation: tick % 6 < 2,
        valenceSignal: tick % 2 === 0 ? 0.4 : -0.2,
        plannerAction: tick % 2 === 0 ? 0.24 : -0.11,
        responseScore: tick % 2 === 0 ? 0.74 : 0.46,
        intervention: tick % 4 === 0
      });
    }
    const metrics = tracker.getMetrics();
    assert.ok(metrics.sampleCount >= 100, 'CASE 5 FAIL: tracker should retain runtime window.');
    assert.ok(metrics.workspaceGlobalAccessScore >= 0.6, 'CASE 5 FAIL: workspace access score below expected.');
    assert.ok(metrics.pciLikeScore >= 0.1, 'CASE 5 FAIL: PCI-like score below expected.');
  }

  // CASE 6: synthetic PPS run should satisfy minimum operational thresholds.
  {
    const synthetic = runPhenomenologyProtocolSynthetic({ seed: 20260227, steps: 240 });
    assert.ok(synthetic.workspaceGlobalAccessScore >= 0.6, 'CASE 6 FAIL: synthetic workspace access below threshold.');
    assert.ok(synthetic.pciLikeScore >= 0.1, 'CASE 6 FAIL: synthetic PCI-like score below threshold.');
    assert.ok(synthetic.dissociationIndex >= 0.08, 'CASE 6 FAIL: synthetic dissociation index below threshold.');
    assert.ok(synthetic.valenceDoEffect >= 0.02, 'CASE 6 FAIL: synthetic valence do-effect below threshold.');
  }

  console.log('ok phenomenology-protocol-suite.v56');
} catch (error) {
  console.error('fail phenomenology-protocol-suite.v56:', error.message);
  process.exit(1);
}

