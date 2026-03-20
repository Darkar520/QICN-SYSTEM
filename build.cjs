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

  try {
    if (IS_DEV) {
      console.log('[QICN] Modo DEV activo: sin minify/metafile (~5-8s)');
    }
    const result = await esbuild.build({
      entryPoints: ['./src/index.jsx'],
      bundle: true,
      outfile: './dist/bundle.js',
      loader: { '.jsx': 'jsx', '.js': 'jsx', '.svg': 'dataurl', '.png': 'dataurl' },
      define: {
        'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV || 'production'),
        'process.env.APP_ENV': JSON.stringify(appEnv),
        'process.env.LLM_PROXY_ENDPOINT': JSON.stringify(llmProxyEndpoint),
        'process.env.GEMINI_MODEL_ID': JSON.stringify(geminiModelId),
        'process.env.GEMINI_STRICT_MODEL': JSON.stringify(String(geminiStrictModel)),
        'process.env.AUTH_REQUIRED': JSON.stringify(String(authRequired)),
        'process.env.FRONTEND_GEMINI_ALLOWED': JSON.stringify(String(frontendGeminiAllowed)),
        'process.env.FEATURE_PWA': JSON.stringify(process.env.FEATURE_PWA || 'true'),
        'process.env.FEATURE_SENSORS': JSON.stringify(process.env.FEATURE_SENSORS || 'true'),
        'process.env.QUANTUM_ENTROPY_ENABLED': JSON.stringify(String(quantumEntropyEnabled)),
        'process.env.QUANTUM_ENTROPY_ENDPOINT': JSON.stringify(quantumEntropyEndpoint),
        'process.env.QUANTUM_PROVIDER_DEFAULT': JSON.stringify(String(quantumProviderDefault)),
        'process.env.QUANTUM_ENTROPY_TTL_MS': JSON.stringify(String(quantumEntropyTtlMs)),
        'process.env.QUANTUM_POLL_INTERVAL_MS': JSON.stringify(String(quantumPollIntervalMs)),
        'process.env.QUANTUM_REQUIRED_QUALITY_MIN': JSON.stringify(String(quantumRequiredQualityMin)),
        'process.env.SELF_PATCH_ENABLED': JSON.stringify(String(selfPatchEnabled)),
        'process.env.SELF_PATCH_MODE': JSON.stringify(String(selfPatchMode)),
        'process.env.SELF_PATCH_CODE_PROVIDER': JSON.stringify(String(selfPatchCodeProvider)),
        'process.env.SELF_PATCH_CODE_MODEL': JSON.stringify(String(selfPatchCodeModel)),
        'process.env.SELF_PATCH_CODE_REASONING_EFFORT': JSON.stringify(String(selfPatchCodeReasoningEffort)),
        'process.env.SELF_PATCH_GENERATION_DRY_RUN': JSON.stringify(String(selfPatchGenerationDryRun)),
        'process.env.SELF_PATCH_LOCAL_APPLY': JSON.stringify(String(selfPatchLocalApply)),
        'process.env.SELF_PATCH_AUTORUN_ENABLED': JSON.stringify(String(selfPatchAutorunEnabled)),
        'process.env.SELF_PATCH_AUTORUN_INTERVAL_MS': JSON.stringify(String(selfPatchAutorunIntervalMs)),
        'process.env.SELF_PATCH_AUTORUN_REQUIRE_SIM_RUNNING': JSON.stringify(String(selfPatchAutorunRequireSimRunning)),
        'process.env.ALLOW_CLIENT_CODEX_KEY': JSON.stringify(String(allowClientCodexKey)),
        'process.env.PMIA_POST_ASC_NEGATIVE_BIAS': JSON.stringify(String(pmiaPostAscNegativeBias)),
        'process.env.PMIA_POST_ASC_NEGATIVE_DUTY': JSON.stringify(String(pmiaPostAscNegativeDuty)),
        'process.env.PMIA_POST_ASC_NEGATIVE_CYCLE_TICKS': JSON.stringify(String(pmiaPostAscNegativeCycleTicks)),
        'process.env.BUILD_TIMESTAMP': JSON.stringify(new Date().toISOString()),
        'process.env.BUILD_VERSION': '"2.1.0-REINFORCED"',
        'process.env.ONTOLOGICAL_SIGNATURE': JSON.stringify(ontologicalSignature)
      },
      minify: !IS_DEV,
      sourcemap: IS_DEV ? 'inline' : true,
      format: 'esm',
      metafile: !IS_DEV,
      treeShaking: true,
      charset: 'utf8',
      logLevel: 'info'
    });

    await esbuild.build({
      entryPoints: ['./src/network_canvas_worker.js'],
      bundle: true,
      outfile: './dist/network_canvas_worker.js',
      format: 'esm',
      minify: true,
      sourcemap: true,
      charset: 'utf8',
      logLevel: 'silent'
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
