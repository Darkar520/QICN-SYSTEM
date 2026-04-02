#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'comparative_program', 'stage3_readiness');

const main = async () => {
  const moduleUrl = pathToFileURL(
    path.join(ROOT, 'src', 'comparative_program', 'Stage3ReadinessFulfillmentBuilder.js')
  ).href;
  const comparative = await import(moduleUrl);
  const builder = comparative.createStage3ReadinessFulfillmentBuilder();
  const outputs = builder.buildArtifacts(OUTPUT_DIR);

  console.log('PASS build-stage3-readiness-fulfillment');
  Object.keys(outputs).forEach((key) => console.log(`  emitted: ${key}`));
};

main().catch((error) => {
  console.error(`FAIL build-stage3-readiness-fulfillment: ${error.message}`);
  process.exitCode = 1;
});
