const fs = require('node:fs');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { spawnSync } = require('node:child_process');

const projectRoot = path.resolve(__dirname, '..');
const frameworkRepo = process.env.QICN_FRAMEWORK_PATH
  ? path.resolve(process.env.QICN_FRAMEWORK_PATH)
  : path.resolve(__dirname, '../../QICN-FRAMEWORK/rigid-identity-framework');

const reproDir = path.join(frameworkRepo, 'repro');
const candidateScripts = [
  path.join(reproDir, 'golden_mean_shift_q3.py'),
  path.join(reproDir, 'golden_mean_shift', 'golden_mean_shift_q3.py')
];

const warnSkip = (reason) => {
  console.warn(`[repro-bridge] WARNING: ${reason}. Skipping external repro bridge verification.`);
  process.exit(0);
};

const fail = (reason) => {
  console.error(`[repro-bridge] FAIL: ${reason}`);
  process.exit(1);
};

const relativeDelta = (computed, runtime) => {
  const a = Number(computed);
  const b = Number(runtime);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return Infinity;
  return Math.abs(a - b) / Math.max(1e-9, Math.abs(b));
};

const runPythonJson = (scriptPath) => {
  const attempts = [
    { command: 'python', args: [scriptPath, '--json'] },
    { command: 'py', args: [scriptPath, '--json'] }
  ];

  for (const attempt of attempts) {
    const result = spawnSync(attempt.command, attempt.args, {
      cwd: path.dirname(scriptPath),
      encoding: 'utf8',
      windowsHide: true
    });

    if (result.error && result.error.code === 'ENOENT') continue;
    if (result.error) fail(`${attempt.command} failed: ${result.error.message}`);
    if (result.status !== 0) {
      fail(`${attempt.command} ${path.basename(scriptPath)} --json exited ${result.status}: ${(result.stderr || result.stdout || '').trim()}`);
    }

    const line = String(result.stdout || '')
      .trim()
      .split(/\r?\n/)
      .reverse()
      .find((entry) => entry.trim().startsWith('{'));
    if (!line) fail('Python repro script did not emit JSON.');

    try {
      return JSON.parse(line);
    } catch (error) {
      fail(`Python repro JSON parse failed: ${error.message}`);
    }
  }

  warnSkip('Python executable not found');
};

const loadRuntimeTarget = async () => {
  const moduleUrl = pathToFileURL(path.join(projectRoot, 'src', 'simulation', 'PhenomenologyCore.js')).href;
  const { PhenomenologyCore } = await import(moduleUrl);
  const originalLog = console.log;
  try {
    console.log = () => {};
    const core = new PhenomenologyCore();
    core._diagnostics.log_enabled = false;
    const spectral = core.calculateSpectralGap();
    const contraction = core.calculateLipschitzNorm();
    return {
      spectral_gap: Number(spectral?.delta_lambda ?? core.phenomenologyState.spectral_gap),
      contraction_norm_K: Number(contraction ?? core.phenomenologyState.lipschitz_norm_K ?? 0.5),
      relaxation_time_tau: Number(spectral?.tau ?? core.phenomenologyState.relaxation_time)
    };
  } finally {
    console.log = originalLog;
  }
};

(async () => {
  if (!fs.existsSync(reproDir)) {
    warnSkip(`framework repro directory not found at ${reproDir}`);
  }

  const scriptPath = candidateScripts.find((candidate) => fs.existsSync(candidate));
  if (!scriptPath) {
    warnSkip(`golden_mean_shift_q3.py not found under ${reproDir}`);
  }

  const payload = runPythonJson(scriptPath);
  if (payload?.['$schema'] !== 'repro-bridge-output.v1') {
    fail(`unexpected repro schema ${payload?.['$schema'] || 'missing'}`);
  }
  if (payload?.model !== 'golden_mean_shift') {
    fail(`unexpected repro model ${payload?.model || 'missing'}`);
  }

  const computed = payload?.computed || {};
  const runtime = await loadRuntimeTarget();
  const comparisons = [
    ['spectral_gap', computed.spectral_gap, runtime.spectral_gap],
    ['contraction_norm_K', computed.contraction_norm_K, runtime.contraction_norm_K],
    ['relaxation_time_tau', computed.relaxation_time_tau, runtime.relaxation_time_tau]
  ].map(([metric, pythonValue, runtimeValue]) => ({
    metric,
    pythonValue: Number(pythonValue),
    runtimeValue: Number(runtimeValue),
    relativeDelta: relativeDelta(pythonValue, runtimeValue)
  }));

  const bad = comparisons.filter((item) => !Number.isFinite(item.relativeDelta) || item.relativeDelta > 0.15);
  if (bad.length) {
    fail(`repro/runtime discrepancy >15%: ${JSON.stringify(bad)}`);
  }

  console.log(`[repro-bridge] OK: ${payload.model} matches runtime warm-up targets within 15%.`);
  console.log(JSON.stringify({
    frameworkRepo,
    scriptPath,
    schema: payload['$schema'],
    model: payload.model,
    comparisons
  }, null, 2));
})().catch((error) => fail(error.stack || error.message));
