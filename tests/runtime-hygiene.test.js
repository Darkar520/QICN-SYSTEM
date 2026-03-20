// Validate production runtime hygiene for index.html.
// Run with: node tests/runtime-hygiene.test.js

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire } from 'module';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

try {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');

  const forbidden = [
    'cdn.tailwindcss.com',
    'react.development.js',
    'react-dom.development.js',
    '@babel/standalone',
    './js/simulation/'
  ];

  for (const token of forbidden) {
    assert(!html.includes(token), `index.html must not include: ${token}`);
  }

  const hasBundlePath = html.includes('./dist/bundle.js') || html.includes('/bundle.js');
  const hasCssPath = html.includes('./dist/tailwind.css') || html.includes('/tailwind.css');
  assert(hasBundlePath, 'index.html must load bundle.js (dist or root path).');
  assert(hasCssPath, 'index.html must load tailwind.css (dist or root path).');

  // PR-4 contract: single JSON metadata line shape.
  const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
  const metadataScript = fileURLToPath(new URL('../scripts/emit-run-metadata.cjs', import.meta.url));
  const require = createRequire(import.meta.url);
  const { buildRunMetadata } = require(metadataScript);
  const metadata = buildRunMetadata('test');
  const metadataLine = JSON.stringify(metadata);
  const stdoutLines = metadataLine.trim().split(/\r?\n/).filter(Boolean);
  assert(stdoutLines.length === 1, 'run metadata contract must be a single JSON line');

  let parsedMetadata;
  try {
    parsedMetadata = JSON.parse(stdoutLines[0]);
  } catch (error) {
    throw new Error(`metadata output is not valid JSON: ${error.message}`);
  }
  assert(typeof parsedMetadata.runId === 'string' && parsedMetadata.runId.length > 0, 'metadata.runId must be non-empty string');
  assert(typeof parsedMetadata.versionHash === 'string' && parsedMetadata.versionHash.length > 0, 'metadata.versionHash must be non-empty string');
  assert(Number.isFinite(Number(parsedMetadata.seed)), 'metadata.seed must be numeric');
  assert(typeof parsedMetadata.configHash === 'string' && parsedMetadata.configHash.length > 0, 'metadata.configHash must be non-empty string');
  assert(parsedMetadata.mode === 'test', 'metadata.mode must match execution mode');

  // Integration contract: build/test/scoreboard must emit metadata line.
  const runAllTestsScript = fs.readFileSync(path.join(rootDir, 'tests', 'run-all-tests.cjs'), 'utf8');
  const buildScript = fs.readFileSync(path.join(rootDir, 'build.cjs'), 'utf8');
  const scoreboardScript = fs.readFileSync(path.join(rootDir, 'scripts', 'scoreboard.cjs'), 'utf8');
  assert(runAllTestsScript.includes("emitRunMetadata('test')"), 'run-all-tests must emit metadata in test mode');
  assert(buildScript.includes("emitRunMetadata('build')"), 'build.cjs must emit metadata in build mode');
  assert(scoreboardScript.includes("emitRunMetadata('scoreboard')"), 'scoreboard must emit metadata in scoreboard mode');

  console.log('OK: runtime hygiene test passed');
} catch (err) {
  console.error('FAIL: runtime hygiene test failed:', err.message);
  process.exit(1);
}
