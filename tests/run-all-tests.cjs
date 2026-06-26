const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { emitRunMetadata } = require('../scripts/emit-run-metadata.cjs');

emitRunMetadata('test');

const testsDir = path.resolve(__dirname);
const allTests = fs
  .readdirSync(testsDir)
  .filter((file) => file.endsWith('.test.js'))
  .sort((a, b) => a.localeCompare(b));

if (allTests.length === 0) {
  console.error('[tests] No .test.js files found.');
  process.exit(1);
}

const failed = [];
for (const file of allTests) {
  const relative = path.join('tests', file);
  console.log(`[tests] Running ${relative}`);
  const result = spawnSync(process.execPath, [relative], { stdio: 'inherit' });
  if (result.status !== 0) {
    failed.push(relative);
  }
}

// Fase 3 regression guard: ejecuta el ciclo de simulacion extraido end-to-end
// (ESM + loader) para detectar identificadores libres / wiring del bag roto que
// el build y los tests .test.js no capturan.
const headlessHarness = path.join('tests', 'simulation-cycle-headless.smoke.mjs');
if (fs.existsSync(path.resolve(testsDir, 'simulation-cycle-headless.smoke.mjs'))) {
  console.log(`[tests] Running ${headlessHarness} (headless simulation-cycle guard)`);
  const harnessResult = spawnSync(
    process.execPath,
    ['--import', './tests/lib/register-loader.mjs', headlessHarness],
    { stdio: 'inherit' }
  );
  if (harnessResult.status !== 0) {
    failed.push(headlessHarness);
  }
}

if (failed.length > 0) {
  console.error(`\n[tests] Failed: ${failed.length}/${allTests.length}`);
  for (const file of failed) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log(`\n[tests] OK: ${allTests.length}/${allTests.length} passed`);
