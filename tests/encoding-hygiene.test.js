// Guardrail test: enforce UTF-8 readability and block mojibake tokens in source/runtime files.
// Run with: node tests/encoding-hygiene.test.js

import fs from 'fs';
import path from 'path';
import { TextDecoder } from 'util';
import { fileURLToPath } from 'url';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const decoder = new TextDecoder('utf-8', { fatal: true });
const sourceRoots = ['src', 'js', 'services', 'tests'];
const rootFiles = ['index.html', 'build.cjs', 'package.json'];
const allowedExt = new Set(['.js', '.jsx', '.cjs', '.mjs', '.json', '.html', '.css', '.md']);

// Common mojibake fragments from UTF-8/Latin-1 corruption.
const forbiddenTokens = [
  String.fromCharCode(0x00c3),
  String.fromCharCode(0x00c2),
  '\u00e2\u20ac\u2122',
  '\u00e2\u20ac\u0153',
  '\u00e2\u20ac',
  '\u00e2\u20ac\u201c',
  '\u00e2\u20ac\u201d',
  '\u00f0\u0178',
  '\u00d0Y',
  '\u0192?'
];

const shouldSkip = (filePath) => {
  const normalized = filePath.replace(/\\/g, '/');
  if (normalized.endsWith('/tests/encoding-hygiene.test.js')) return true;
  if (normalized.endsWith('/tests/ui-mojibake-guard.v47.test.js')) return true;
  if (
    normalized.includes('/node_modules/') ||
    normalized.includes('/dist/') ||
    normalized.includes('/backups/') ||
    normalized.includes('/archive/')
  ) {
    return true;
  }
  if (
    normalized.includes('.pre_') ||
    normalized.includes('.bak_') ||
    normalized.includes('.pre_utf8fix_')
  ) {
    return true;
  }
  return false;
};

const collectFiles = (dirPath, acc) => {
  if (!fs.existsSync(dirPath)) return;
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dirPath, entry.name);
    if (shouldSkip(full)) continue;
    if (entry.isDirectory()) {
      collectFiles(full, acc);
      continue;
    }
    if (!allowedExt.has(path.extname(entry.name).toLowerCase())) continue;
    acc.push(full);
  }
};

try {
  const files = [];
  for (const rel of sourceRoots) {
    collectFiles(path.join(rootDir, rel), files);
  }
  for (const rel of rootFiles) {
    const full = path.join(rootDir, rel);
    if (fs.existsSync(full) && !shouldSkip(full)) files.push(full);
  }

  const utf8Errors = [];
  const mojibakeHits = [];

  for (const file of files) {
    const bytes = fs.readFileSync(file);

    try {
      decoder.decode(bytes);
    } catch (err) {
      utf8Errors.push(`${path.relative(rootDir, file)} :: ${err.message}`);
      continue;
    }

    const text = bytes.toString('utf8');
    const badToken = forbiddenTokens.find((token) => text.includes(token));
    if (badToken) {
      mojibakeHits.push(`${path.relative(rootDir, file)} :: token "${badToken}"`);
    }
  }

  assert(utf8Errors.length === 0, `UTF-8 decode errors found:\n${utf8Errors.join('\n')}`);
  assert(mojibakeHits.length === 0, `Mojibake tokens found:\n${mojibakeHits.join('\n')}`);

  console.log(`OK: encoding hygiene test passed (${files.length} files scanned)`);
} catch (err) {
  console.error('FAIL: encoding hygiene test failed:', err.message);
  process.exit(1);
}
