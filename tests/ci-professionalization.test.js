import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const workflow = fs.readFileSync(path.join(rootDir, '.github', 'workflows', 'verify.yml'), 'utf8');
assert.match(workflow, /cache:\s*'npm'/, 'verify workflow must enable npm cache');
assert.match(workflow, /npm ci/, 'verify workflow must install from lockfile');
assert.match(workflow, /npm run verify:source-of-truth/, 'source-of-truth gate must be in CI');
assert.match(workflow, /npm run verify:descriptor-registry/, 'descriptor registry gate must be in CI');
assert.match(workflow, /npm run test:coverage/, 'coverage gate must be in CI');
assert.match(workflow, /npm run build/, 'build gate must be in CI');
assert.match(workflow, /npm run scoreboard:run/, 'scoreboard gate must be in CI');
assert.equal((workflow.match(/actions\/upload-artifact@v4/g) || []).length, 2, 'CI must upload scoreboard and coverage artifacts');

const preCommit = fs.readFileSync(path.join(rootDir, '.husky', 'pre-commit'), 'utf8');
assert.match(preCommit, /npm run verify:source-of-truth && npm test/, 'pre-commit must run source-of-truth verification and tests');

const branchProtection = fs.readFileSync(path.join(rootDir, 'docs', 'BRANCH_PROTECTION.md'), 'utf8');
assert.match(branchProtection, /Require status checks/);
assert.match(branchProtection, /Block force pushes/);
assert.match(branchProtection, /external validation/);

console.log('[ci-professionalization] PASS');
