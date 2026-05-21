import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const read = (relativePath) => fs.readFileSync(path.join(rootDir, relativePath), 'utf8');

const requiredDocs = [
  'CONTRIBUTING.md',
  'docs/ARCHITECTURE.md',
  'docs/API_SURFACE.md',
  'README.md'
];

for (const doc of requiredDocs) {
  assert.ok(fs.existsSync(path.join(rootDir, doc)), `${doc} must exist`);
}

const contributing = read('CONTRIBUTING.md');
assert.match(contributing, /npm ci/);
assert.match(contributing, /npm test/);
assert.match(contributing, /feat/);
assert.match(contributing, /src\/canon\/index\.js/);
assert.match(contributing, /external validation/);

const architecture = read('docs/ARCHITECTURE.md');
assert.match(architecture, /src\/index\.jsx/);
assert.match(architecture, /SimulationEngine\.jsx/);
assert.match(architecture, /SimulationController\.js/);
assert.match(architecture, /FiniteProjectionEvaluator\.js/);
assert.match(architecture, /does not expose a public `runTick`/);

const apiSurface = read('docs/API_SURFACE.md');
assert.match(apiSurface, /calculateSpectralGap/);
assert.match(apiSurface, /testHolonomy/);
assert.match(apiSurface, /buildCanonicalInvariantPackage/);
assert.match(apiSurface, /projectionMorphism/);
assert.match(apiSurface, /computeInverseLimitScore/);
assert.match(apiSurface, /attachCore/);

const readme = read('README.md');
assert.match(readme, /actions\/workflows\/verify\.yml\/badge\.svg/);
assert.match(readme, /## Quick Start/);
assert.match(readme, /docs\/ARCHITECTURE\.md/);
assert.match(readme, /npm run verify:descriptor-registry/);
assert.match(readme, /docs\/EPISTEMIC_POSTURE\.md/);

const markdownLinks = [...readme.matchAll(/\]\(([^)]+)\)/g)].map((match) => match[1]);
for (const link of markdownLinks) {
  if (/^https?:\/\//.test(link) || link.startsWith('#')) continue;
  assert.ok(fs.existsSync(path.join(rootDir, link)), `README link must resolve: ${link}`);
}

console.log('[documentation-professionalization] PASS');
