import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const ROOT = process.cwd();

const CRITICAL_METHODS = [
  {
    file: 'src/simulation/OntologicalSingularityCore.js',
    signature: /updatePhenomenology\s*\(/
  },
  {
    file: 'src/simulation/PhenomenologyCore.js',
    signature: /calculateBethQ\s*\(/
  },
  {
    file: 'src/simulation/PhenomenologyCore.js',
    signature: /classifySystem\s*\(/
  },
  {
    file: 'src/simulation/PhenomenologyCore.js',
    signature: /_stateToScalar\s*\(/
  },
  {
    file: 'src/simulation/PhenomenologyCore.js',
    signature: /_inputToScalar\s*\(/
  },
  {
    file: 'src/simulation/PhenomenologyCore.js',
    signature: /_generateTestPaths\s*\(/
  }
];

const countMatches = (line, pattern) => {
  const matches = line.match(pattern);
  return matches ? matches.length : 0;
};

const extractMethodBody = (sourceText, signatureRegex) => {
  const lines = sourceText.split(/\r?\n/);
  const start = lines.findIndex((line) => signatureRegex.test(line));
  if (start < 0) {
    throw new Error(`method signature not found: ${signatureRegex}`);
  }

  let depth = 0;
  let opened = false;
  const collected = [];

  for (let i = start; i < lines.length; i++) {
    const line = lines[i];
    collected.push(line);

    const opens = countMatches(line, /\{/g);
    const closes = countMatches(line, /\}/g);

    if (opens > 0) {
      opened = true;
    }
    if (opened) {
      depth += opens;
      depth -= closes;
      if (depth === 0) {
        break;
      }
    }
  }

  if (!opened) {
    throw new Error(`could not parse method body for signature: ${signatureRegex}`);
  }

  return collected.join('\n');
};

try {
  CRITICAL_METHODS.forEach(({ file, signature }, index) => {
    const fullPath = path.join(ROOT, file);
    assert.ok(fs.existsSync(fullPath), `CASE ${index + 1} FAIL: file not found: ${file}`);
    const sourceText = fs.readFileSync(fullPath, 'utf8');
    const methodBody = extractMethodBody(sourceText, signature);
    assert.ok(
      !/Math\.random\s*\(/.test(methodBody),
      `CASE ${index + 1} FAIL: Math.random detected in critical path ${file} :: ${signature}`
    );
  });

  console.log('OK: no RNG in critical paths v4.1A test passed');
} catch (error) {
  console.error('FAIL: no RNG in critical paths v4.1A test failed:', error.message);
  process.exit(1);
}

