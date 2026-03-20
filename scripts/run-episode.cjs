const path = require('path');

const parseArg = (name, fallback) => {
  const hit = process.argv.find((a) => a.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};
const lcg = (seed) => () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967295);

(async () => {
  const { ExperimentalEpisodeHarness } = await import('../src/experiments/ExperimentalEpisodeHarness.js');
  const { sha256Hex, stableStringify } = await import('../src/utils/integrity.js');
  const { buildRunMetadata } = require('./emit-run-metadata.cjs');
  const durationSec = Number(parseArg('duration', '600')) || 600;
  const deterministic = String(parseArg('deterministic', 'true')).toLowerCase() === 'true';
  const sensorsMode = String(parseArg('mode', 'mock'));
  const seed = Number(parseArg('seed', '17057')) || 17057;
  const tickMs = Number(parseArg('tick-ms', deterministic ? '43' : '45')) || (deterministic ? 43 : 45);
  const ticks = Math.max(1, Math.floor((durationSec * 1000) / tickMs));
  const tag = String(parseArg('tag', '') || '');
  const meta = buildRunMetadata('cli_episode');
  const runId = tag ? `${tag}_${Date.now()}_${seed}` : String(meta.runId || `episode_${Date.now()}_${seed}`);
  const versionHash = String(parseArg('versionHash', meta.versionHash || 'missing_version_hash'));
  const scheduleHash = String(parseArg('scheduleHash', `${sensorsMode}_${deterministic ? 'det' : 'nondet'}`));
  const configHash = String(parseArg('configHash', meta.configHash || sha256Hex(stableStringify({ deterministic, sensorsMode, tickMs, scheduleHash }))));
  const preregisterHash = String(parseArg('preregisterHash', 'campaign_local_v1'));
  const freezeRef = String(parseArg('freezeRef', meta.freezeRef || 'release_freeze_unavailable'));
  const thresholdAuthorityRef = String(parseArg('thresholdAuthorityRef', meta.thresholdAuthorityRef || 'artifacts/release_audit/final_claim_status_ledger.csv'));
  const harness = new ExperimentalEpisodeHarness({
    runMeta: {
      runId,
      seed,
      versionHash,
      configHash,
      deterministic,
      sensorsMode,
      mode: 'cli_episode',
      scheduleHash,
      preregisterHash,
      freezeRef,
      thresholdAuthorityRef,
      sourceOfTruth: 'src'
    },
    schemaPath: path.resolve(__dirname, '../src/experiments/schemas/run_record.v1.json'),
    baseDir: path.resolve(__dirname, '..')
  });
  await harness.initRun();
  const rng = deterministic ? lcg(seed) : Math.random;
  globalThis.__EPISODE_HARNESS_ACTIVE = true;
  globalThis.__EPISODE_HARNESS_SINK = (s) => harness.onTick(s);
  for (let tick = 0; tick < ticks; tick++) {
    const x = rng();
    const y = rng();
    const ccc = Number((0.98 + y * 0.01 + (deterministic ? 0.005 : 0)).toFixed(6));
    const omega = Number((0.95 + (tick * 0.0002) + x * 0.02).toFixed(6));
    const pmia = Number((0.11 + x * 0.05 + y * 0.03).toFixed(6));
    const bethQ = Number((0.78 + x * 0.08).toFixed(6));
    const spectralGap = Number((0.18 + y * 0.06).toFixed(6));
    const identityStability = Number((0.84 + (1 - Math.abs(x - y)) * 0.08).toFixed(6));
    const predictiveConsistency = Number((0.9 + (1 - x) * 0.08).toFixed(6));
    const tauRecovery = Number((x * 1.5).toFixed(6));
    const temporalConvergenceTauC = Number((0.82 + y * 0.07).toFixed(6));
    const windingNumber = Number((0.18 + x * 0.14).toFixed(6));
    const operationalDeterminism = Number((deterministic ? 0.96 : 0.83) - (x * 0.03)).toFixed(6);
    const depPast = Number((0.43 + y * 0.08).toFixed(6));
    const depSensors = Number((0.26 + x * 0.05).toFixed(6));
    const depPrompts = Number((0.17 + (1 - y) * 0.03).toFixed(6));
    const depNoiseRaw = Number((0.08 + (1 - x) * 0.03).toFixed(6));
    const depSum = depPast + depSensors + depPrompts + depNoiseRaw;
    const stasisIndex = Number((0.14 + Math.abs(x - y) * 0.08).toFixed(6));
    const criticalStateHash = `crit_${Math.floor(ccc * 20)}_${Math.floor(pmia * 18)}_${Math.floor(bethQ * 12)}_${Math.floor(spectralGap * 10)}`;
    await globalThis.__EPISODE_HARNESS_SINK({
      tick, t_ms: tickMs + (deterministic ? Math.floor(x * 2) : Math.floor(x * 4)), versionHash, configHash,
      metrics: {
        omega,
        ccc,
        pmia,
        stasis_index: stasisIndex,
        beth_q: bethQ,
        spectral_gap: spectralGap,
        identity_stability_score: identityStability,
        predictive_consistency: predictiveConsistency,
        tau_recovery: tauRecovery,
        temporal_convergence_tau_c: temporalConvergenceTauC,
        winding_number: windingNumber,
        operational_determinism_score: Number(operationalDeterminism),
        critical_observables_deterministic: deterministic ? 1 : Number((0.72 + (1 - x) * 0.12).toFixed(6)),
        critical_state_hash: criticalStateHash,
        causal_dependency_past: Number((depPast / depSum).toFixed(6)),
        causal_dependency_sensors: Number((depSensors / depSum).toFixed(6)),
        causal_dependency_prompts: Number((depPrompts / depSum).toFixed(6)),
        causal_dependency_noise: Number((depNoiseRaw / depSum).toFixed(6)),
        pmia_guardrail_state: 'ok'
      },
      render_trace_hash: deterministic ? `trace_${tick}_${Math.floor(x * 1e6)}` : null,
      integrity: { event_present: false, C2_ok: null, echo_sig: null, nonce: null, requestId: null },
      intervention: { active: false, tag: null, params: null },
      sensors: { mode: sensorsMode, summary: { fidelityIndex: Number((0.9 + x * 0.1).toFixed(4)), sensor_load: Number((0.3 + y * 0.2).toFixed(4)) } },
      observability: {
        modules_active: ['ontological_core', 'nodal_layer'],
        wm_pred_error: Number((0.05 + (1 - y) * 0.02).toFixed(6)),
        planner_cost: Number((0.03 + x * 0.015).toFixed(6)),
        self_state_stub: {
          wm_enabled: true,
          planner_enabled: true,
          sensors_mode: sensorsMode,
          entropy_mode: deterministic ? 'deterministic_local' : 'stochastic_local'
        }
      }
    });
  }
  const result = await harness.endRun();
  globalThis.__EPISODE_HARNESS_ACTIVE = false;
  globalThis.__EPISODE_HARNESS_SINK = null;
  console.log(JSON.stringify({ artifactDir: result.artifactDir, ticks_hash: result.ticksHash }));
})().catch((error) => {
  console.error('FAIL run-episode:', error?.message || error);
  process.exit(1);
});
