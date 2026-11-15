// C-6b (user decision 2026-11-08): Kaizen learned adjustment mode.
import assert from 'node:assert/strict';
import { QICNConfig } from '../services/config.js';
import { KaizenMetamorphosisEngine, KAIZEN_ADJUSTABLE_KEYS, KAIZEN_LEARNING_DEFAULTS as D, kaizenWindowScore } from '../src/simulation/KaizenMetamorphosisEngine.js';

const base = { BASE_LEARNING_RATE: 0.1, HEBBIAN_FACTOR: 0.05, SYNAPTIC_PRUNING_THRESHOLD: 0.15, PLASTICITY_DECAY: 0.98, RETRO_FLUX_WEIGHT: 0.15, BOLTZMANN_ANALOG_K: 1, INFORMATIONAL_TEMP_T: 1 };
const previousMode = QICNConfig.KAIZEN_ADJUSTMENT_MODE;
try {
  assert.equal(previousMode, 'legacy', 'default mode stays legacy');
  // Score: CCC level does not enter; stasis and strain penalise.
  const flat = Array.from({ length: 24 }, () => ({ ccc: 0.7, stasis: 0, strain: 0 }));
  const atTarget = Array.from({ length: 24 }, (_, i) => ({ ccc: 0.7 + (i % 2 ? D.oscTarget : 0), stasis: 0, strain: 0 }));
  const highLevel = atTarget.map((s) => ({ ...s, ccc: s.ccc + 0.25 }));
  assert.ok(kaizenWindowScore(atTarget).score > kaizenWindowScore(flat).score, 'moving at the target rate beats a frozen CCC');
  assert.ok(Math.abs(kaizenWindowScore(highLevel).score - kaizenWindowScore(atTarget).score) < 1e-12, 'CCC level does not change the score');
  assert.ok(kaizenWindowScore(atTarget.map((s) => ({ ...s, stasis: 1 }))).score < kaizenWindowScore(atTarget).score, 'stasis penalised');

  // Legacy mode: atomic mutation path unchanged (writes the value directly).
  const legacy = new KaizenMetamorphosisEngine({ ...base });
  const r0 = legacy.executeAtomicStep(0.9, 0, 0, { vector: 0 }, 'BASE_LEARNING_RATE', 1);
  assert.equal(r0.changeApplied, true);
  assert.ok(Math.abs(legacy.mutableConfig.BASE_LEARNING_RATE - (0.1 + 1e-5)) < 1e-12);

  QICNConfig.KAIZEN_ADJUSTMENT_MODE = 'learned';
  const k = new KaizenMetamorphosisEngine({ ...base });
  // Non-forced steps do nothing (the window learner owns the six keys).
  assert.equal(k.executeAtomicStep(0.9, -0.6, 2, { vector: 1, targetKey: 'HEBBIAN_FACTOR' }).changeApplied, false);
  // Forced (autonomy) step on a recomputed key moves its factor, bounded.
  const f = k.executeAtomicStep(0.5, 0, 0, { vector: 0 }, 'RETRO_FLUX_WEIGHT', -1);
  assert.equal(f.kind, 'learned_factor');
  assert.ok(Math.abs(k.getAdjustments().RETRO_FLUX_WEIGHT - (1 - D.sandboxStep)) < 1e-9);
  for (let i = 0; i < 40; i += 1) k.applyFactorStep('RETRO_FLUX_WEIGHT', -1);
  assert.equal(k.getAdjustments().RETRO_FLUX_WEIGHT, D.factorMin, 'factor clamped at -20 %');
  // Effective value = core base × factor.
  k.applyLearnedAdjustments({ ...base, RETRO_FLUX_WEIGHT: 0.2 });
  assert.ok(Math.abs(k.mutableConfig.RETRO_FLUX_WEIGHT - 0.2 * D.factorMin) < 1e-12);
  assert.equal(k.mutableConfig.SYNAPTIC_PRUNING_THRESHOLD, 0.15, 'pruning threshold untouched by factors');
  // Rollback restores factors.
  const saved = k.getAdjustments();
  k.applyFactorStep('HEBBIAN_FACTOR', 1);
  k.restoreAdjustments(saved);
  assert.deepEqual(k.getAdjustments(), saved);

  // Window learner: a trial that improves the score is kept, one that does not is reverted.
  const learner = new KaizenMetamorphosisEngine({ ...base });
  let trial = null;
  // warmupBaselines = 2: the first window only measures; the second starts a trial.
  for (const s of flat) trial = learner.observeLearningTick(s) || trial;
  assert.equal(trial.event, 'baseline_measured');
  for (const s of flat) trial = learner.observeLearningTick(s) || trial;
  assert.equal(trial.event, 'trial_started');
  assert.equal(trial.key, KAIZEN_ADJUSTABLE_KEYS[0]);
  let verdict = null;
  for (const s of atTarget) verdict = learner.observeLearningTick(s) || verdict;
  assert.equal(verdict.event, 'trial_kept');
  assert.ok(Math.abs(learner.getAdjustments()[KAIZEN_ADJUSTABLE_KEYS[0]] - (1 + D.step)) < 1e-9);
  for (const s of atTarget) learner.observeLearningTick(s); // baseline
  let second = null;
  for (const s of flat) second = learner.observeLearningTick(s) || second;
  assert.equal(second.event, 'trial_reverted');
  assert.equal(learner.getAdjustments()[KAIZEN_ADJUSTABLE_KEYS[1]], 1, 'reverted factor back to 1');
  assert.ok(second.requiredGain >= D.margin, 'required gain reported');
  // PLASTICITY_DECAY is never tried by the window learner (no active reader).
  const probe = new KaizenMetamorphosisEngine({ ...base });
  const tried = new Set();
  for (let i = 0; i < 24 * 40; i += 1) { const e = probe.observeLearningTick({ ccc: 0.7 + (i % 2) * 0.004, stasis: 0, strain: 0 }); if (e?.event === 'trial_started') tried.add(e.key); }
  assert.ok(!tried.has('PLASTICITY_DECAY') && tried.size === 5, `learner tries the 5 read keys, got ${[...tried]}`);
  // Deterministic: no Math.random and no Date.now.
  const realRandom = Math.random; const realNow = Date.now;
  Math.random = () => { throw new Error('learner used Math.random'); };
  Date.now = () => { throw new Error('learner used Date.now'); };
  try { const d = new KaizenMetamorphosisEngine({ ...base }); for (let i = 0; i < 100; i += 1) { d.observeLearningTick({ ccc: 0.7 + (i % 3) * 0.003, stasis: 0.2, strain: 0.1 }); d.applyLearnedAdjustments(base); } }
  finally { Math.random = realRandom; Date.now = realNow; }
  console.log('OK: kaizen learned adjustment v1 test passed');
} catch (error) {
  console.error('FAIL: kaizen learned adjustment v1 test failed:', error.message);
  process.exitCode = 1;
} finally {
  QICNConfig.KAIZEN_ADJUSTMENT_MODE = previousMode;
}
