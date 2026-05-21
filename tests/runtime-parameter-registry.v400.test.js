import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { runtimeParameterRegistry, getMutableRuntimeParameterKeys } from '../src/utils/runtimeParameterRegistry.js';
import { KaizenMetamorphosisEngine } from '../src/simulation/KaizenMetamorphosisEngine.js';

const ROOT = process.cwd();
const SRC_ROOT = path.join(ROOT, 'src');
const INDEX_PATH = path.join(ROOT, 'src', 'components', 'SimulationEngine.jsx');

const expectedRuntimeCriticalKeys = [
  'BASE_LEARNING_RATE',
  'HEBBIAN_FACTOR',
  'SYNAPTIC_PRUNING_THRESHOLD',
  'PLASTICITY_DECAY',
  'RETRO_FLUX_WEIGHT',
  'BOLTZMANN_ANALOG_K',
  'INFORMATIONAL_TEMP_T',
  'COHERENCE_THRESHOLD',
  'ASCENSION_THRESHOLD',
  'PROCESSING_SAMPLE_SIZE',
  'NODE_CONNECTION_MIN',
  'NODE_CONNECTION_MAX',
  'SIMULATION_FREQUENCY',
  'FRICTION_CYCLE_LENGTH',
  'targetFPS',
  'minFPS',
  'faceDetectMinIntervalMs',
  'faceDetectMaxIntervalMs',
  'activationDelayMs',
  'tickIntervalMs',
  'LATENCY_STRAIN_ALPHA',
  'LATENCY_STRAIN_BASELINE_MS',
  'LATENCY_STRAIN_SATURATION_MS',
  'AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR',
  'AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS',
  'QUANTUM_ENTROPY_TTL_MS',
  'QUANTUM_POLL_INTERVAL_MS',
  'QUANTUM_REQUIRED_QUALITY_MIN',
  'QUANTUM_ENTROPY_ENABLED',
  'QUANTUM_BUFFER_CAPACITY_CHUNKS',
  'QUANTUM_BUFFER_LOW_WATERMARK_CHUNKS',
  'QUANTUM_BUFFER_REFILL_TARGET_CHUNKS',
  'QUANTUM_PROVIDER_TIMEOUT_MS',
  'QUANTUM_PROVIDER_RETRY_COUNT',
  'QUANTUM_PROVIDER_RETRY_BACKOFF_MS',
  'QUANTUM_PROVIDER_FALLBACK_ENABLED',
  'QUANTUM_LOG_LEVEL'
];

const walkFiles = (dir) => {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...walkFiles(fullPath));
      continue;
    }
    if (/\.(js|jsx|cjs)$/i.test(entry.name)) {
      files.push(fullPath);
    }
  }
  return files;
};

const uniqueSorted = (arr) => [...new Set(arr)].sort();

try {
  // CASE 1: cobertura 100% de lista runtime critica definida
  {
    const registryKeys = runtimeParameterRegistry.map((entry) => entry.key);
    expectedRuntimeCriticalKeys.forEach((key) => {
      assert.ok(registryKeys.includes(key), `CASE 1 FAIL: missing runtime key in registry: ${key}`);
    });
    assert.equal(
      uniqueSorted(registryKeys).length,
      expectedRuntimeCriticalKeys.length,
      'CASE 1 FAIL: registry should not contain missing/duplicated critical keys.'
    );
  }

  // CASE 2: paridad mutable keys (registry vs Kaizen vs fallback string en App.jsx)
  {
    const mutableRegistryKeys = uniqueSorted(getMutableRuntimeParameterKeys());

    const initialConfig = {
      BASE_LEARNING_RATE: 0.1,
      HEBBIAN_FACTOR: 0.05,
      SYNAPTIC_PRUNING_THRESHOLD: 0.15,
      PLASTICITY_DECAY: 0.98,
      RETRO_FLUX_WEIGHT: 0.15,
      BOLTZMANN_ANALOG_K: 1.0,
      INFORMATIONAL_TEMP_T: 1.0
    };
    const kaizen = new KaizenMetamorphosisEngine(initialConfig);
    const kaizenMutableKeys = uniqueSorted(kaizen.mutableKeys);

    const indexText = fs.readFileSync(INDEX_PATH, 'utf8');
    const fallbackMatch = indexText.match(
      /BASE_LEARNING_RATE,\s*HEBBIAN_FACTOR,\s*SYNAPTIC_PRUNING_THRESHOLD,\s*PLASTICITY_DECAY,\s*RETRO_FLUX_WEIGHT,\s*BOLTZMANN_ANALOG_K,\s*INFORMATIONAL_TEMP_T/
    );
    assert.ok(fallbackMatch, 'CASE 2 FAIL: mutable fallback string not found in App.jsx.');
    const fallbackMutableKeys = uniqueSorted(
      fallbackMatch[0].split(',').map((entry) => entry.trim())
    );

    assert.deepEqual(
      mutableRegistryKeys,
      kaizenMutableKeys,
      'CASE 2 FAIL: mutable keys mismatch between runtime registry and Kaizen engine.'
    );
    assert.deepEqual(
      mutableRegistryKeys,
      fallbackMutableKeys,
      'CASE 2 FAIL: mutable keys mismatch between runtime registry and prompt fallback.'
    );
  }

  // CASE 3: ownerFile existente + referencia real en src + verificationTestId presente
  {
    const srcFiles = walkFiles(SRC_ROOT).map((file) => ({
      path: file,
      content: fs.readFileSync(file, 'utf8')
    }));

    runtimeParameterRegistry.forEach((entry) => {
      assert.ok(entry.verificationTestId && typeof entry.verificationTestId === 'string', `CASE 3 FAIL: verificationTestId missing for ${entry.key}`);

      const ownerPath = path.join(ROOT, entry.ownerFile);
      assert.ok(fs.existsSync(ownerPath), `CASE 3 FAIL: ownerFile not found for ${entry.key}: ${entry.ownerFile}`);

      const hasRuntimeReference = srcFiles.some((file) => file.content.includes(entry.key));
      assert.ok(hasRuntimeReference, `CASE 3 FAIL: no runtime reference found in src for key ${entry.key}`);
    });
  }

  console.log('OK: runtime parameter registry v4.0 test passed');
} catch (error) {
  console.error('FAIL: runtime parameter registry v4.0 test failed:', error.message);
  process.exit(1);
}
