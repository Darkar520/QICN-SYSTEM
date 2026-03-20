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

if (failed.length > 0) {
  console.error(`\n[tests] Failed: ${failed.length}/${allTests.length}`);
  for (const file of failed) {
    console.error(` - ${file}`);
  }
  process.exit(1);
}

console.log(`\n[tests] OK: ${allTests.length}/${allTests.length} passed`);
