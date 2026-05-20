import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const runtimeEnvPath = path.join(projectRoot, 'src', 'config', 'runtimeEnv.js');
const buildPath = path.join(projectRoot, 'build.cjs');

const runtimeEnvSource = fs.readFileSync(runtimeEnvPath, 'utf8');
const buildSource = fs.readFileSync(buildPath, 'utf8');

const unique = (values) => [...new Set(values)].sort((a, b) => a.localeCompare(b));

const runtimeGetEnvKeys = unique(
  [...runtimeEnvSource.matchAll(/getEnv\(\s*['"`]([A-Z0-9_]+)['"`]/g)]
    .map((match) => match[1])
);

const clientRuntimeEnvMatch = buildSource.match(
  /const\s+clientRuntimeEnv\s*=\s*Object\.freeze\(\s*\{([\s\S]*?)\n\s*\}\s*\);/
);

assert(clientRuntimeEnvMatch, 'build.cjs must declare clientRuntimeEnv via Object.freeze({...})');

const buildRuntimeKeys = unique(
  [...clientRuntimeEnvMatch[1].matchAll(/^\s*([A-Z0-9_]+)\s*:/gm)]
    .map((match) => match[1])
);

const missingDefines = runtimeGetEnvKeys.filter((key) => !buildRuntimeKeys.includes(key));
assert.deepEqual(
  missingDefines,
  [],
  `runtimeEnv.js keys missing from build.cjs clientRuntimeEnv: ${missingDefines.join(', ')}`
);

assert(
  /const\s+clientRuntimeDefines\s*=\s*Object\.fromEntries/.test(buildSource),
  'build.cjs must derive clientRuntimeDefines from clientRuntimeEnv'
);
assert(
  /\.\.\.clientRuntimeDefines/.test(buildSource),
  'esbuild define block must include clientRuntimeDefines'
);
assert(
  /__QICN_RUNTIME_ENV__/.test(buildSource),
  'esbuild define block must inject __QICN_RUNTIME_ENV__'
);

assert(
  !/processEnvDirect/.test(runtimeEnvSource),
  'runtimeEnv.js must not contain processEnvDirect bypass objects'
);
assert(
  !/(^|[^.\w])process\.env\.[A-Z0-9_]+/.test(runtimeEnvSource),
  'runtimeEnv.js must not read process.env.KEY directly'
);

console.log(`OK: env sync test passed (${runtimeGetEnvKeys.length} runtime keys checked)`);
