#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');
const rel = (filePath) => path.relative(ROOT, filePath).replace(/\\/g, '/');

async function buildPhenomenalBridgeRoot() {
  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href
  );
  const evaluator = imported.createPhenomenalBridgeGateEvaluator();
  const result = evaluator.writeArtifacts({}, OUTPUT_DIR);

  return {
    ok: true,
    output_dir: rel(OUTPUT_DIR),
    emitted_artifacts: Object.fromEntries(
      Object.entries(result.outputs).map(([key, value]) => [key, rel(value)])
    ),
    support_class: result.classification,
    gate_status: result.gate_result.gate_status,
    phi_bpf: result.phi_bpf,
    gamma_bpf: result.gamma_bpf
  };
}

if (require.main === module) {
  buildPhenomenalBridgeRoot()
    .then((payload) => {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      if (!payload.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`FAIL build-phenomenal-bridge-root: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildPhenomenalBridgeRoot
};
