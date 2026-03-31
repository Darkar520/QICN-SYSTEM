#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'comparative_program', 'stage2m3');

const main = async () => {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, 'src', 'comparative_program', 'ComparativeOperationalReadinessBuilder.js')
  ).href;
  const comparative = await import(moduleUrl);
  const builder = comparative.createComparativeOperationalReadinessBuilder();
  const outputs = builder.buildArtifacts(OUTPUT_DIR);

  console.log('PASS build-comparative-program-operationalization');
  Object.keys(outputs).forEach((key) => console.log(`  emitted: ${key}`));
};

main().catch((error) => {
  console.error(`FAIL build-comparative-program-operationalization: ${error.message}`);
  process.exitCode = 1;
});