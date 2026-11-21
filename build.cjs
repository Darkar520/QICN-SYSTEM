const esbuild = require('esbuild');
const fs = require('fs');
const path = require('path');
require('dotenv').config();
const { emitRunMetadata } = require('./scripts/emit-run-metadata.cjs');
require('./scripts/verify-source-of-truth.cjs');

// Modo dev: BUILD_MODE=dev → sin minify, sin sourcemap, sin metafile (~60s → ~8s)
const IS_DEV = process.env.BUILD_MODE === 'dev' || process.argv.includes('--dev');

/**
 * PROTOCOLO ULTRATHINK - Build Engine v2.1 (Superior Reinforcement)
 * Rigor tecnico: validacion agentica, inyeccion de firma ontologica y auditoria forense.
 */

async function runBuild() {
  emitRunMetadata('build');
  console.log('[QICN] Iniciando Build ULTRATHINK v2.1...');

  const criticalFiles = [
    './src/index.jsx',
    './src/simulation/OntologicalSingularityCore.js',
    './src/simulation/PhenomenologyCore.js',
    './src/simulation/NodalProcessingLayer.js',
    './src/simulation/SensoryPerceptionEngine.js'
  ];

  console.log('[QICN] Validando integridad de archivos criticos...');
  for (const file of criticalFiles) {
    if (!fs.existsSync(path.resolve(__dirname, file))) {
      console.error(`[ERROR] Archivo critico no encontrado: ${file}`);
      process.exit(1);
    }
  }

  const distPath = path.join(__dirname, 'dist');
  if (fs.existsSync(distPath)) {
    console.log('[QICN] Limpiando artefactos previos en ./dist...');
    fs.rmSync(distPath, { recursive: true, force: true });
  }
  fs.mkdirSync(distPath);

  const buildHash = require('crypto').createHash('sha256').update(Date.now().toString()).digest('hex').substring(0, 16);
  const ontologicalSignature = `QICN-SIG-${buildHash}`;

  // Runtime flags only (never inject provider secrets in client bundle)
  const appEnv = process.env.APP_ENV || process.env.NODE_ENV || 'production';
  const llmProxyEndpoint = process.env.LLM_PROXY_ENDPOINT || '/.netlify/functions/llm-proxy';
  const geminiModelId = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';
  const geminiStrictModel = (process.env.GEMINI_STRICT_MODEL || 'true').toLowerCase() !== 'false';
  const authRequired = (process.env.AUTH_REQUIRED || 'true').toLowerCase() !== 'false';
  const frontendGeminiAllowed = (process.env.FRONTEND_GEMINI_ALLOWED || 'false').toLowerCase() !== 'false';
  const quantumEntropyEnabled = (process.env.QUANTUM_ENTROPY_ENABLED || 'false').toLowerCase() !== 'false';
  const quantumEntropyEndpoint = process.env.QUANTUM_ENTROPY_ENDPOINT || '/.netlify/functions/quantum-entropy';
  const quantumProviderDefault = process.env.QUANTUM_PROVIDER_DEFAULT || 'custom';
  const quantumEntropyTtlMs = process.env.QUANTUM_ENTROPY_TTL_MS || '60000';
  const quantumPollIntervalMs = process.env.QUANTUM_POLL_INTERVAL_MS || '10000';
  const quantumRequiredQualityMin = process.env.QUANTUM_REQUIRED_QUALITY_MIN || '0.2';
  const selfPatchEnabled = process.env.SELF_PATCH_ENABLED || 'false';
  const selfPatchMode = process.env.SELF_PATCH_MODE || 'semi_auto';
  const selfPatchCodeProvider = process.env.SELF_PATCH_CODE_PROVIDER || 'openai';
  const selfPatchCodeModel = process.env.SELF_PATCH_CODE_MODEL || 'gpt-5.3-codex';
  const selfPatchCodeReasoningEffort = process.env.SELF_PATCH_CODE_REASONING_EFFORT || 'high';
  const selfPatchGenerationDryRun = process.env.SELF_PATCH_GENERATION_DRY_RUN || 'true';
  const selfPatchLocalApply = process.env.SELF_PATCH_LOCAL_APPLY || 'false';
  const selfPatchAutorunEnabled = process.env.SELF_PATCH_AUTORUN_ENABLED || 'false';
  const selfPatchAutorunIntervalMs = process.env.SELF_PATCH_AUTORUN_INTERVAL_MS || '120000';
  const selfPatchAutorunRequireSimRunning = process.env.SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING || 'false';
  const allowClientCodexKey = process.env.ALLOW_CLIENT_CODEX_KEY || 'false';
  const pmiaPostAscNegativeBias = process.env.PMIA_POST_ASC_NEGATIVE_BIAS || 'true';
  const pmiaPostAscNegativeDuty = process.env.PMIA_POST_ASC_NEGATIVE_DUTY || '0.78';
  const pmiaPostAscNegativeCycleTicks = process.env.PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS || '36';
  const clientRuntimeEnv = Object.freeze({
    NODE_ENV: process.env.NODE_ENV || 'production',
    APP_ENV: appEnv,
    LLM_PROXY_ENDPOINT: llmProxyEndpoint,
    GEMINI_MODEL_ID: geminiModelId,
    GEMINI_STRICT_MODEL: String(geminiStrictModel),
    AUTH_REQUIRED: String(authRequired),
    FRONTEND_GEMINI_ALLOWED: String(frontendGeminiAllowed),
    FEATURE_PWA: process.env.FEATURE_PWA || 'true',
    FEATURE_SENSORS: process.env.FEATURE_SENSORS || 'true',
    QUANTUM_ENTROPY_ENABLED: String(quantumEntropyEnabled),
    QUANTUM_ENTROPY_ENDPOINT: quantumEntropyEndpoint,
    QUANTUM_PROVIDER_DEFAULT: String(quantumProviderDefault),
    QUANTUM_ENTROPY_TTL_MS: String(quantumEntropyTtlMs),
    QUANTUM_POLL_INTERVAL_MS: String(quantumPollIntervalMs),
    QUANTUM_REQUIRED_QUALITY_MIN: String(quantumRequiredQualityMin),
    QUANTUM_BUFFER_CAPACITY_CHUNKS: process.env.QUANTUM_BUFFER_CAPACITY_CHUNKS || '8',
    QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS: process.env.QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS || '2',
    QUANTUM_BUFFER_REFILL_TARGET_CHUNKS: process.env.QUANTUM_BUFFER_REFILL_TARGET_CHUNKS || '6',
    QUANTUM_PROVIDER_TIMEOUT_MS: process.env.QUANTUM_PROVIDER_TIMEOUT_MS || '4500',
    QUANTUM_PROVIDER_RETRY_COUNT: process.env.QUANTUM_PROVIDER_RETRY_COUNT || '1',
    QUANTUM_PROVIDER_RETRY_BACKOFF_MS: process.env.QUANTUM_PROVIDER_RETRY_BACKOFF_MS || '300',
    QUANTUM_PROVIDER_FALLBACK_ENABLED: process.env.QUANTUM_PROVIDER_FALLBACK_ENABLED || 'true',
    QUANTUM_LOG_LEVEL: process.env.QUANTUM_LOG_LEVEL || 'warn',
    QUANTUM_EXPERIMENT_CONDITION: process.env.QUANTUM_EXPERIMENT_CONDITION || 'baseline',
    QUANTUM_EXPERIMENT_SEED: process.env.QUANTUM_EXPERIMENT_SEED || '17057',
    QUANTUM_EXPERIMENT_DELAY_MS: process.env.QUANTUM_EXPERIMENT_DELAY_MS || '0',
    QUANTUM_EXPERIMENT_DROPOUT_RATE: process.env.QUANTUM_EXPERIMENT_DROPOUT_RATE || '0',
    QUANTUM_EXPERIMENT_REPLAY_SOURCE_ID: process.env.QUANTUM_EXPERIMENT_REPLAY_SOURCE_ID || '',
    QUANTUM_EXPERIMENT_REPLAY_SEQUENCE: process.env.QUANTUM_EXPERIMENT_REPLAY_SEQUENCE || '',
    SELF_PATCH_ENABLED: String(selfPatchEnabled),
    SELF_PATCH_MODE: String(selfPatchMode),
    SELF_PATCH_CODE_PROVIDER: String(selfPatchCodeProvider),
    SELF_PATCH_CODE_MODEL: String(selfPatchCodeModel),
    SELF_PATCH_CODE_REASONING_EFFORT: String(selfPatchCodeReasoningEffort),
    SELF_PATCH_GENERATION_DRY_RUN: String(selfPatchGenerationDryRun),
    SELF_PATCH_LOCAL_APPLY: String(selfPatchLocalApply),
    SELF_PATCH_AUTORUN_ENABLED: String(selfPatchAutorunEnabled),
    SELF_PATCH_AUTORUN_INTERVAL_MS: String(selfPatchAutorunIntervalMs),
    SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING: String(selfPatchAutorunRequireSimRunning),
    ALLOW_CLIENT_CODEX_KEY: String(allowClientCodexKey),
    PMIA_POST_ASC_NEGATIVE_BIAS: String(pmiaPostAscNegativeBias),
    PMIA_POST_ASC_NEGATIVE_DUTY: String(pmiaPostAscNegativeDuty),
    PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS: String(pmiaPostAscNegativeCycleTicks),
    QICN_PATCH_MAX_PROPOSALS_24H: process.env.QICN_PATCH_MAX_PROPOSALS_24H || '3',
    QICN_PATCH_MAX_INFLIGHT: process.env.QICN_PATCH_MAX_INFLIGHT || '1',
    QICN_PATCH_COOLDOWN_MIN: process.env.QICN_PATCH_COOLDOWN_MIN || '120',
    QICN_PATCH_TOKEN_BUDGET_DAY: process.env.QICN_PATCH_TOKEN_BUDGET_DAY || '100000'
  });
  const clientRuntimeDefines = Object.fromEntries(
    Object.entries(clientRuntimeEnv).flatMap(([key, value]) => [
      [`process.env.${key}`, JSON.stringify(String(value))],
      [`import.meta.env.${key}`, JSON.stringify(String(value))],
      [`import.meta.env.VITE_${key}`, JSON.stringify(String(value))]
    ])
  );

  try {
    if (IS_DEV) {
      console.log('[QICN] Modo DEV activo: sin minify/metafile (~5-8s)');
    }
    const result = await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'index.jsx')],
      absWorkingDir: __dirname,
      bundle: true,
      outfile: path.join(distPath, 'bundle.js'),
      loader: { '.jsx': 'jsx', '.js': 'jsx', '.svg': 'dataurl', '.png': 'dataurl' },
      define: {
        ...clientRuntimeDefines,
        __QICN_RUNTIME_ENV__: JSON.stringify(clientRuntimeEnv),
        'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
        'process.env.BUILD_VERSION': '"2.1.0-REINFORCED"',
        'process.env.ONTOLOGICAL_SIGNATURE': JSON.stringify(ontologicalSignature)
      },
      minify: !IS_DEV,
      keepNames: true,
      sourcemap: IS_DEV ? 'inline' : true,
      format: 'esm',
      metafile: !IS_DEV,
      treeShaking: true,
      charset: 'utf8',
      logLevel: 'info'
    });

    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src', 'network_canvas_worker.js')],
      absWorkingDir: __dirname,
      bundle: true,
      outfile: path.join(distPath, 'network_canvas_worker.js'),
      format: 'esm',
      minify: true,
      keepNames: true,
      sourcemap: true,
      charset: 'utf8',
      logLevel: 'silent'
    });

    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/workers/microExperiment.worker.js')],
      absWorkingDir: __dirname,
      bundle: true,
      outfile: path.join(distPath, 'microExperiment.worker.js'),
      format: 'esm',
      minify: true,
      keepNames: true,
      sourcemap: true,
      charset: 'utf8',
      logLevel: 'silent',
      define: {
        ...clientRuntimeDefines,
        __QICN_RUNTIME_ENV__: JSON.stringify(clientRuntimeEnv),
        __QICN_WORKBENCH_BUILD__: JSON.stringify({version: '2.1.0-REINFORCED', signature: ontologicalSignature})
      }
    });

    await esbuild.build({
      entryPoints: [path.join(__dirname, 'src/workers/level3Autonomous.worker.js')],
      absWorkingDir: __dirname,
      bundle: true,
      outfile: path.join(distPath, 'level3Autonomous.worker.js'),
      format: 'esm',
      minify: true,
      keepNames: true,
      sourcemap: true,
      charset: 'utf8',
      logLevel: 'silent',
      define: {
        ...clientRuntimeDefines,
        __QICN_RUNTIME_ENV__: JSON.stringify(clientRuntimeEnv),
        __QICN_WORKBENCH_BUILD__: JSON.stringify({version: '2.1.0-REINFORCED', signature: ontologicalSignature})
      }
    });

    console.log(`[OK] Build completado exitosamente. Firma: ${ontologicalSignature}`);

    if (!IS_DEV && result.metafile) {
      const text = await esbuild.analyzeMetafile(result.metafile);
      console.log('\n[QICN] Auditoria de Bundle ULTRATHINK:\n', text);
      fs.writeFileSync(path.join(distPath, 'meta.json'), JSON.stringify(result.metafile));
    }
  } catch (error) {
    console.error('[ERROR CRITICO] Fallo en el Build:', error);
    process.exit(1);
  }
}

runBuild();
