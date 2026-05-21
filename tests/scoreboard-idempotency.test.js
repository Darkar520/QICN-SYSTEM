import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-scoreboard-'));

try {
  const runs = [];
  for (let index = 0; index < 3; index += 1) {
    const outFile = path.join(tmpDir, `scoreboard-${index}.json`);
    const result = spawnSync(process.execPath, [
      'scripts/scoreboard.cjs',
      `--json-file=${outFile}`
    ], {
      cwd: process.cwd(),
      encoding: 'utf8'
    });
    assert.equal(result.status, 0, `scoreboard inspect run ${index + 1} failed: ${result.stderr || result.stdout}`);
    const payload = JSON.parse(fs.readFileSync(outFile, 'utf8'));
    assert.equal(payload.summary.dimensionsTotal, 7, 'scoreboard must expose 7 dimensions');
    runs.push(payload.dimensions.map((dimension) => ({
      id: dimension.id,
      score10: Number(dimension.score10)
    })));
  }

  const baseline = runs[0];
  for (const run of runs.slice(1)) {
    for (const expected of baseline) {
      const actual = run.find((dimension) => dimension.id === expected.id);
      assert.ok(actual, `missing dimension on repeat run: ${expected.id}`);
      const tolerance = expected.id === 'COMPUTE_TICK_BUDGET' ? 1 : 0.5;
      assert.ok(
        Math.abs(actual.score10 - expected.score10) <= tolerance,
        `${expected.id} drifted by more than ${tolerance}: ${expected.score10} -> ${actual.score10}`
      );
    }
  }

  console.log('OK: scoreboard idempotency test passed');
} catch (error) {
  console.error('FAIL: scoreboard idempotency test failed:', error.message);
  process.exit(1);
} finally {
  fs.rmSync(tmpDir, { recursive: true, force: true });
}
