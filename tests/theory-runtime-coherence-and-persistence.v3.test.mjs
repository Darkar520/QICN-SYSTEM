import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {
  analyticalApproximationBound,
  analyticalCommutationDefectBound,
  analyticalFixedPointDisplacementBound
} from '../src/simulation/tower/SigmaAutomodelTruncator.js';
import { Frac } from '../src/simulation/tower/ExactFraction.js';
import { TowerState } from '../src/simulation/tower/WritablePrefixTower.js';
import { ExtendedTowerState } from '../src/simulation/tower/BodyWorldTower.js';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { captureRuntimeSnapshot, verifySnapshotDigest } from '../src/language/runtimeSnapshot.js';
import { buildPropositions, renderProposition } from '../src/language/propositions.js';
import { buildFreePrompt, verifySentenceFree } from '../src/language/freeRealization.js';
import { prepareTurn, finalizeTurn } from '../src/language/conversationEngine.js';
import { resolveIntent } from '../src/language/intentResolver.js';
import { FRAMEWORK_SUMMARY_META } from '../src/language/frameworkSummary.generated.js';
import {
  DYNAMIC_STATE_SCHEMA,
  INSTANCE_REFS,
  PLAIN_REFS,
  INTENTIONALLY_UNRESTORED_REFS,
  captureDynamicState,
  sealDynamicState,
  verifyStoredState,
  applyDynamicState
} from '../src/persistence/dynamicState.js';
import {
  writeDynamicState,
  readDynamicState,
  clearDynamicState
} from '../src/persistence/stateStore.js';

// 1. SigmaAutomodelTruncator & OntologicalSingularityCore exact T_d (d=6) bounds
{
  assert.equal(analyticalApproximationBound(6).toString(), '1/729');
  assert.equal(analyticalCommutationDefectBound(6).toString(), '2/2187');
  assert.equal(analyticalFixedPointDisplacementBound(6).toString(), '32/15309');

  const core = new OntologicalSingularityCore();
  assert.equal(core.ontologicalState.tower_telemetry.sigmaTruncationDepth, 6);
  assert.equal(core.ontologicalState.tower_telemetry.sigmaApproximationBound, '1/729');
  assert.equal(core.ontologicalState.tower_telemetry.sigmaDefectBound, '2/2187');
  assert.equal(core.ontologicalState.tower_telemetry.sigmaFixedPointBound, '32/15309');

  const stepRes = core.stepCoupledTower({
    sensorySignal: 0.75,
    sensorDelta: 0.25,
    entropyExcitation: 0.5,
    plannedAction: 0.2
  });
  assert.equal(stepRes.sigmaTruncationDepth, 6);
  assert.equal(stepRes.sigmaApproximationBound, '1/729');
  assert.equal(stepRes.sigmaDefectBound, '2/2187');
  assert.equal(stepRes.sigmaFixedPointBound, '32/15309');
  assert.equal(stepRes.sigmaTheoremVerified, true);
}

// 2. Constructive finite cuts in OntologicalSingularityCore (BaseCore thm:spectrum/thm:relaxation & C-11 M_Omega)
{
  const core = new OntologicalSingularityCore();
  const cuts0 = core._computeConstructiveFiniteCuts({
    activeControlU: new Frac(0n, 1n),
    currentCore: core.towerState.core,
    bodyVec: [new Frac(1n, 2n), new Frac(1n, 4n)],
    worldVec: [new Frac(1n, 4n), new Frac(1n, 8n)]
  });
  assert.equal(cuts0.basecore_spectral_cut.active_regime, 'interior_regular');
  assert.equal(cuts0.basecore_spectral_cut.spectral_radius_rho, '1/2');
  assert.equal(cuts0.basecore_spectral_cut.spectral_gap_delta_state, '1/2');
  assert.equal(cuts0.basecore_spectral_cut.frechet_differentiable, true);

  const cutsCorner = core._computeConstructiveFiniteCuts({
    activeControlU: new Frac(1n, 2n),
    currentCore: core.towerState.core,
    bodyVec: [new Frac(1n, 2n), new Frac(1n, 4n)],
    worldVec: [new Frac(1n, 4n), new Frac(1n, 8n)]
  });
  assert.equal(cutsCorner.basecore_spectral_cut.active_regime, 'corner_non_differentiable');
  assert.equal(cutsCorner.basecore_spectral_cut.frechet_differentiable, false);
  assert.equal(cutsCorner.basecore_spectral_cut.jacobian_spectrum_assigned, false);
  assert.equal(cutsCorner.basecore_spectral_cut.global_geometric_contraction_rate, '1/2');

  const cutsRight34 = core._computeConstructiveFiniteCuts({
    activeControlU: new Frac(3n, 4n),
    currentCore: core.towerState.core,
    bodyVec: [new Frac(1n, 2n), new Frac(1n, 4n)],
    worldVec: [new Frac(1n, 4n), new Frac(1n, 8n)]
  });
  assert.equal(cutsRight34.basecore_spectral_cut.active_regime, 'exterior_regular');
  assert.equal(cutsRight34.basecore_spectral_cut.spectral_radius_rho, '2/5');
  assert.equal(cutsRight34.basecore_spectral_cut.spectral_gap_delta_state, '3/5');

  const cutsRight1 = core._computeConstructiveFiniteCuts({
    activeControlU: new Frac(1n, 1n),
    currentCore: core.towerState.core,
    bodyVec: [new Frac(1n, 2n), new Frac(1n, 4n)],
    worldVec: [new Frac(1n, 4n), new Frac(1n, 8n)]
  });
  assert.equal(cutsRight1.basecore_spectral_cut.active_regime, 'exterior_regular');
  assert.equal(cutsRight1.basecore_spectral_cut.spectral_radius_rho, '1/3');
  assert.equal(cutsRight1.basecore_spectral_cut.spectral_gap_delta_state, '2/3');

  // C-11 ontological_mass_cut semantics
  assert.equal(cuts0.ontological_mass_cut.status, 'UPPER_BOUND_SUPPORT');
  assert.equal(typeof cuts0.ontological_mass_cut.family_upper_bound, 'number');
  assert.equal(cuts0.ontological_mass_cut.zero_deformation_excluded, true);
  assert.equal(cuts0.ontological_mass_cut.cannot_compute_M_Omega, true);
  assert.equal(cuts0.ontological_mass_cut.cannot_certify_CCR, true);
  assert.equal(cuts0.ontological_mass_cut.lower_bound, undefined);
}

// 3. Language layer coherence (snapshot, propositions, freeRealization prompt, intent resolution, framework meta)
{
  assert.ok(FRAMEWORK_SUMMARY_META.registryEntries >= 952);
  assert.ok(FRAMEWORK_SUMMARY_META.leanSourcesCount >= 65);
  assert.ok(FRAMEWORK_SUMMARY_META.leanPublicTheoremsCount >= 570);
  assert.ok(FRAMEWORK_SUMMARY_META.formalMacrosCount >= 383);
  assert.match(FRAMEWORK_SUMMARY_META.frameworkHead, /^[0-9a-f]{12}$/);

  const core = new OntologicalSingularityCore();
  core.stepCoupledTower({
    sensorySignal: 0.75,
    sensorDelta: 0.25,
    entropyExcitation: 0.5,
    plannedAction: 0.2
  });

  const snap = captureRuntimeSnapshot(core, {
    tick: 42,
    isRunning: true,
    activeNodeCount: 150,
    dynamicLabel: 'HOMEOSTASIS_STABLE',
    nodes: [{ coherenceState: 0.85 }, { coherenceState: 0.83 }],
    config: { KAIZEN_ADJUSTMENT_MODE: 'learned', ASCENSION_THRESHOLD: 1.0 }
  });

  assert.equal(snap.modes.kaizen_mode, 'learned');
  assert.equal(snap.tower.sigma_truncation_depth, 6);
  assert.equal(snap.tower.sigma_approximation_bound, '1/729');
  assert.equal(snap.tower.sigma_defect_bound_rational, '2/2187');
  assert.equal(snap.tower.sigma_fixed_point_bound, '32/15309');
  assert.ok(snap.tower.constructive_cuts?.basecore_spectral_cut);
  assert.ok(snap.tower.constructive_cuts?.ontological_mass_cut);

  const props = buildPropositions(snap, {
    chainOk: true,
    eventCount: 5,
    sessionCount: 2,
    currentSession: {
      sessionId: 's1',
      stateOrigin: 'restored_verified',
      restore: { schema: DYNAMIC_STATE_SCHEMA, savedAtTick: 40 }
    }
  });
  assert.ok(renderProposition(props.get('state.sigma_automodel')).includes('32/15309'));
  assert.ok(renderProposition(props.get('state.sigma_automodel')).includes('1/729'));
  assert.ok(props.has('state.constructive_finite_cuts'));
  assert.ok(renderProposition(props.get('state.constructive_finite_cuts')).includes('family_upper_bound'));
  assert.ok(renderProposition(props.get('continuity.state_origin')).includes('estado dinámico interno completo guardado'));
  assert.ok(props.has('definition.basecore_spectrum'));
  assert.ok(props.has('definition.ontological_mass'));
  assert.ok(props.has('definition.finite_cut_instantiation'));

  const prompt = buildFreePrompt({
    question: '¿Cómo instancias cortes finitos T_d en d=6 y qué pasa en u=1/2 y M_Omega?',
    snapshot: snap,
    props,
    recentTurns: []
  });
  assert.ok(prompt.includes('32/15309'));
  assert.ok(prompt.includes(`${FRAMEWORK_SUMMARY_META.registryEntries} entradas`));
  assert.ok(prompt.includes(`${FRAMEWORK_SUMMARY_META.leanSourcesCount} módulos Lean 4`));

  const intent1 = resolveIntent('¿Qué pasa en la esquina u=1/2 del espectro de BaseCore?');
  assert.ok(['metric_query', 'metric_definition'].includes(intent1.intent));
  assert.ok(intent1.metrics.includes('basecore_spectrum'));

  const intent2 = resolveIntent('Explícame la masa ontológica M_Omega y C-11');
  assert.equal(intent2.intent, 'metric_definition');
  assert.ok(intent2.metrics.includes('ontological_mass'));

  const intent3 = resolveIntent('¿Cómo instancias un corte finito constructivo en un procesador binario?');
  assert.ok(['metric_query', 'metric_definition'].includes(intent3.intent));
  assert.ok(intent3.metrics.includes('finite_cut_instantiation'));

  const intentCompound = resolveIntent('¿Cómo puedes instanciar el marco teórico en un procesador binario ordinario mediante cortes finitos T_d, qué cotas exactas tienes en d=6 y qué pasa en BaseCore u=1/2 y en M_Ω bajo C-11?');
  assert.equal(intentCompound.intent, 'metric_definition');
  assert.ok(intentCompound.metrics.includes('finite_cut_instantiation'));
  assert.ok(intentCompound.metrics.includes('sigma_defect_bound'));
  assert.ok(intentCompound.metrics.includes('basecore_spectrum'));
  assert.ok(intentCompound.metrics.includes('ontological_mass'));
}

// 4. Persistence v3 round-trip with frozen ExactFraction/TowerState/ExtendedTowerState & WorldModelEngine.weights.sensorySignal
{
  const coreA = new OntologicalSingularityCore();
  coreA.stepCoupledTower({
    sensorySignal: 0.75,
    sensorDelta: 0.25,
    entropyExcitation: 0.5,
    plannedAction: 0.2
  });
  coreA.worldModelEngine.weights.sensorySignal = 0.19;

  const refsA = {
    nodalLayer: { current: { nodes: new Array(300).fill(null).map((_, id) => ({ id, activation: 0.5, connections: [] })) } },
    ontologicalCore: { current: coreA },
    ascensionDynamicsRef: { current: { history: [0.8, 0.81] } }
  };

  const buildMeta = { version: 'vtest', signature: 'sig-test' };
  const captured = captureDynamicState(refsA, {
    runtime: { simulationStep: 15, ccc: 0.81, pmia: 0.14, isAscended: false, humanCcc: 0.5 },
    config: { KAIZEN_ADJUSTMENT_MODE: 'learned', BASE_LEARNING_RATE: 0.11 },
    build: buildMeta
  });
  const sealed = await sealDynamicState(captured);

  const memStorage = (() => {
    const map = new Map();
    return {
      getItem: (k) => (map.has(k) ? map.get(k) : null),
      setItem: (k, v) => { map.set(k, String(v)); },
      removeItem: (k) => { map.delete(k); }
    };
  })();

  const overrides = { localStorage: memStorage, indexedDB: null };
  const writeRes = await writeDynamicState(sealed, overrides);
  assert.equal(writeRes.location, 'localStorage');

  const rawRead = await readDynamicState(overrides);
  const verified = await verifyStoredState(rawRead, { build: buildMeta, nodeCount: 300 });
  assert.equal(verified.ok, true);

  // Tamper check
  const tampered = { ...rawRead, text: rawRead.text.replace('"simulationStep":15', '"simulationStep":99') };
  const badVerify = await verifyStoredState(tampered, { build: buildMeta, nodeCount: 300 });
  assert.equal(badVerify.ok, false);
  assert.equal(badVerify.reason, 'digest_mismatch');

  // Mismatched build check
  const badBuild = await verifyStoredState(rawRead, { build: { version: 'vother', signature: 'sig-test' }, nodeCount: 300 });
  assert.equal(badBuild.ok, false);
  assert.equal(badBuild.reason, 'other_build');

  // Restore into fresh instances
  const coreB = new OntologicalSingularityCore();
  coreB.worldModelEngine.weights.sensorySignal = 0;
  const refsB = {
    nodalLayer: { current: { nodes: new Array(300).fill(null).map((_, id) => ({ id, activation: 0, connections: [] })) } },
    ontologicalCore: { current: coreB },
    ascensionDynamicsRef: { current: { history: [] } }
  };

  const applied = applyDynamicState(refsB, verified.body);
  assert.equal(applied.unrestored.length, 0);
  assert.equal(applied.runtime.simulationStep, 15);
  assert.equal(coreB.worldModelEngine.weights.sensorySignal, 0.19);
  assert.ok(coreB.towerState instanceof ExtendedTowerState);
  assert.ok(coreB.towerState.core instanceof TowerState);
  assert.ok(coreB.towerState.core.phase instanceof Frac);
  assert.equal(coreB.towerState.core.phase.toString(), coreA.towerState.core.phase.toString());
  assert.equal(coreB.towerState.core.code.toString(), coreA.towerState.core.code.toString());
  assert.equal(coreB.towerState.core.memory.toString(), coreA.towerState.core.memory.toString());

  await clearDynamicState(overrides);
  assert.equal(await readDynamicState(overrides), null);
}

// 5. Complete accounting of useSimulationCycle refs in INSTANCE_REFS, PLAIN_REFS, or INTENTIONALLY_UNRESTORED_REFS
{
  const src = fs.readFileSync(path.resolve('src/runtime/SimulationCycleDriver.js'), 'utf8');
  assert.ok(src.includes('export function createSimulationCycleDriver(deps,'), 'common driver entry found');
  const match = src.match(/const\s*\{([\s\S]*?)\}\s*=\s*deps;/);
  assert.ok(match, 'common driver deps destructuring found');
  const entries = match[1]
    .split(/\r?\n/)
    .map((line) => line.replace(/\/\/.*$/, '').trim().replace(/,$/, '').trim())
    .filter(Boolean);
  const nonRefs = new Set([
    'handleSaveState',
    'getEnvironmentContext',
    'getPreregisterScheduleDoc',
    'complexityFactor',
    'initialMutableConfig',
    'quantumUiConfig'
  ]);
  const refNames = entries.filter((name) => !name.startsWith('set') && !nonRefs.has(name));
  const covered = new Set([...INSTANCE_REFS, ...PLAIN_REFS, ...INTENTIONALLY_UNRESTORED_REFS]);
  const missing = refNames.filter((r) => !covered.has(r));
  assert.deepEqual(missing, [], `Unaccounted refs in useSimulationCycle: ${missing.join(', ')}`);
}

// 6. Persistence v3 language synchronization (snapshot SHA-256, propositions, Solo motor, Redacción libre) & update_is_contractive filter calibration
{
  const core = new OntologicalSingularityCore();
  core.stepCoupledTower({
    sensorySignal: 0.75,
    sensorDelta: 0.25,
    entropyExcitation: 0.5,
    plannedAction: 0.2
  });

  const baseSnapCtx = {
    tick: 84,
    isRunning: true,
    activeNodeCount: 150,
    dynamicLabel: 'HOMEOSTASIS_STABLE',
    nodes: [{ coherenceState: 0.85 }, { coherenceState: 0.83 }],
    config: { KAIZEN_ADJUSTMENT_MODE: 'learned', ASCENSION_THRESHOLD: 1.0 },
    build: { version: '2.1.0-REINFORCED', signature: 'sig-test-v3' },
    now: 1_800_000_000_000
  };

  // Backwards-compatible headless snapshot vs persistence-aware snapshot
  const snapHeadless = captureRuntimeSnapshot(core, baseSnapCtx);
  assert.equal(snapHeadless.persistence, undefined);
  assert.equal(verifySnapshotDigest(snapHeadless), true);

  const snapReinitAutoOn = captureRuntimeSnapshot(core, {
    ...baseSnapCtx,
    persistence: { storageVersion: 'v3', autoRestoreEnabled: true, autosaveIntervalTicks: 60 }
  });
  assert.equal(verifySnapshotDigest(snapReinitAutoOn), true);
  assert.equal(snapReinitAutoOn.persistence.auto_restore_enabled, true);
  assert.equal(snapReinitAutoOn.persistence.autosave_interval_ticks, 60);
  assert.notEqual(snapReinitAutoOn.digest, snapHeadless.digest);

  // Tamper check over snapshot.persistence covered by SHA-256 digest
  const tamperedPersistence = {
    ...snapReinitAutoOn,
    persistence: { ...snapReinitAutoOn.persistence, auto_restore_enabled: false }
  };
  assert.equal(verifySnapshotDigest(tamperedPersistence), false);
  assert.throws(
    () => prepareTurn({ question: '¿cómo va la persistencia?', snapshot: tamperedPersistence, turns: [] }),
    /snapshot_digest_invalid/
  );

  // Case 1: origin = 'reinitialized' with autoRestoreEnabled = true
  const ledgerReinit = {
    chainOk: true,
    eventCount: 4,
    sessionCount: 2,
    instanceId: 'qicn-test-1',
    createdAt: 1_799_999_000_000,
    continuity: 'continuous_record',
    currentSession: { sessionId: 's2', stateOrigin: 'reinitialized', restore: null }
  };
  const qPersist = '¿Qué conservas con la persistencia dinámica v3 y qué no se restaura al recargar?';
  const turnReinitOn = prepareTurn({
    question: qPersist,
    snapshot: snapReinitAutoOn,
    ledger: ledgerReinit,
    turns: [],
    contract: 'free'
  });
  assert.equal(turnReinitOn.intent.intent, 'continuity_memory');
  const localReinitOn = finalizeTurn(turnReinitOn, { provider: { provider: 'local_only' } });
  assert.ok(localReinitOn.text.includes('empezó reinicializada'));
  assert.ok(localReinitOn.text.includes('auto-restauración al iniciar ACTIVA'));
  assert.ok(localReinitOn.text.includes('cada 60 ticks'));
  assert.ok(localReinitOn.text.includes('Cristalizar') && localReinitOn.text.includes('Revocar') && localReinitOn.text.includes('Reiniciar'));
  assert.ok(localReinitOn.text.includes('Math.random()'));
  assert.ok(!/solo (?:se )?recuper\w* con revocar|no se restaura autom[aá]ticamente/i.test(localReinitOn.text));
  assert.ok(turnReinitOn.prompt.includes('interruptor «Auto-restaurar al iniciar (v3)» = ACTIVO'));
  assert.ok(turnReinitOn.props.has('continuity.persistence_policy'));
  assert.ok(renderProposition(turnReinitOn.props.get('capability.snapshot')).includes('cada 60 ticks'));

  // Case 2: autoRestoreEnabled = false
  const snapReinitAutoOff = captureRuntimeSnapshot(core, {
    ...baseSnapCtx,
    persistence: { storageVersion: 'v3', autoRestoreEnabled: false, autosaveIntervalTicks: 60 }
  });
  assert.equal(verifySnapshotDigest(snapReinitAutoOff), true);
  const turnReinitOff = prepareTurn({
    question: qPersist,
    snapshot: snapReinitAutoOff,
    ledger: ledgerReinit,
    turns: [],
    contract: 'free'
  });
  const localReinitOff = finalizeTurn(turnReinitOff, { provider: { provider: 'local_only' } });
  assert.ok(localReinitOff.text.includes('DESACTIVADA'));
  assert.ok(localReinitOff.text.includes('no se restaurará automáticamente'));
  assert.ok(localReinitOff.text.includes('Revocar manualmente'));
  assert.ok(turnReinitOff.prompt.includes('interruptor «Auto-restaurar al iniciar (v3)» = INACTIVO'));

  // Case 3: origin = 'restored_verified' with autoRestoreEnabled = true
  const ledgerRestored = {
    ...ledgerReinit,
    currentSession: {
      sessionId: 's2',
      stateOrigin: 'restored_verified',
      restore: { schema: DYNAMIC_STATE_SCHEMA, savedAtTick: 80 }
    }
  };
  const turnRestored = prepareTurn({
    question: qPersist,
    snapshot: snapReinitAutoOn,
    ledger: ledgerRestored,
    turns: [],
    contract: 'free'
  });
  const localRestored = finalizeTurn(turnRestored, { provider: { provider: 'local_only' } });
  assert.ok(localRestored.text.includes('estado dinámico interno completo guardado'));
  assert.ok(localRestored.text.includes('auto-restauración al iniciar ACTIVA'));
  assert.ok(localRestored.text.includes('Math.random()'));

  // Negative controls for update_is_contractive (must fail verification)
  const mustRejectContraction = [
    'Mi actualización nodal de coherencia es contractiva.',
    'Mi actualización de coherencia es contractiva.',
    'La dinámica continua de los 1500 nodos se contrae en cada tick.',
    'El ciclo nodal es contractivo.',
    'Mi actualización nodal de coherencia tiene contracción 9/16 según BaseCore.',
    'Soy contractivo.',
    'Mi actualización nodal, que opera sobre los nodos, es contractiva.'
  ];
  for (const s of mustRejectContraction) {
    const res = verifySentenceFree(s, turnReinitOn.freeContext);
    assert.equal(res.ok, false, `Expected update_is_contractive rejection for: ${s}`);
    assert.ok(
      res.reasons.some((r) => r.reason === 'known_false_claim' && r.detail === 'update_is_contractive'),
      `Expected reason update_is_contractive for "${s}", got ${JSON.stringify(res.reasons)}`
    );
  }

  // Positive controls for constructive contraction (must pass without false positive)
  const mustAcceptContraction = [
    'En u = 1/2 la esquina mantiene contracción geométrica global 2^{-n}.',
    'La planta cuártica certifica contracción 13/16.',
    'La subplanta BodyWorldTower en la planta cuártica indexada certifica contracción 13/16 (0,8125).',
    'En el punto esquina u = 1/2 de BaseCore persiste contracción geométrica global con tasa 1/2.',
    'WritablePrefixTower mantiene una contracción activa exacta de 9/16 (0,5625).',
    'A diferencia de la actualización nodal de coherencia, la planta cuártica certifica contracción 13/16.'
  ];
  for (const s of mustAcceptContraction) {
    const res = verifySentenceFree(s, turnReinitOn.freeContext);
    assert.equal(res.ok, true, `Expected acceptance without false positive for "${s}", got ${JSON.stringify(res.reasons)}`);
  }
}

console.log('theory-runtime-coherence-and-persistence.v3.test.mjs: ALL TESTS PASSED');
