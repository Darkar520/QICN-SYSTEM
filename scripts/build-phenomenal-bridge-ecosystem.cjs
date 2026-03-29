#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');
const { buildPhenomenalBridgeRoot } = require('./build-phenomenal-bridge-root.cjs');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');
const rel = (filePath) => path.relative(ROOT, filePath).replace(/\\/g, '/');
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

async function buildPhenomenalBridgeEcosystem() {
  await buildPhenomenalBridgeRoot();

  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'phenomenal_bridge', 'index.js')).href
  );
  const integrator = imported.createPhenomenalBridgeEcosystemIntegrator();
  const auditor = imported.createPhenomenalBridgeFinalAuditor();

  const rootBundle = {
    projection: readJson(path.join(OUTPUT_DIR, 'phenomenal_bridge_projection.json')),
    gate_result: readJson(path.join(OUTPUT_DIR, 'phenomenal_bridge_gate_result.json')),
    manifest: readJson(path.join(OUTPUT_DIR, 'phenomenal_bridge_manifest.json')),
    refs: {
      projection: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_projection.json',
      gate_result: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_gate_result.json',
      manifest: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_manifest.json'
    }
  };

  const ecosystem = integrator.writeArtifacts({ rootBundle }, OUTPUT_DIR);
  const audit = auditor.writeArtifacts({ rootBundle, ecosystemBundle: ecosystem }, OUTPUT_DIR);

  return {
    ok:
      ecosystem.verification_matrix.status === 'PASS'
      && ['PASS', 'PASS_WITH_WARNINGS'].includes(audit.final_audit.audit_status),
    output_dir: rel(OUTPUT_DIR),
    emitted_artifacts: {
      ...Object.fromEntries(Object.entries(ecosystem.outputs).map(([key, value]) => [key, rel(value)])),
      ...Object.fromEntries(Object.entries(audit.outputs).map(([key, value]) => [key, rel(value)]))
    },
    support_class: rootBundle.gate_result.classification,
    readiness_state: audit.readiness_gate.bridge_readiness_state,
    paper9_final_hardening_status: audit.readiness_gate.paper9_final_hardening_status,
    verification_status: ecosystem.verification_matrix.status
  };
}

if (require.main === module) {
  buildPhenomenalBridgeEcosystem()
    .then((payload) => {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      if (!payload.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`FAIL build-phenomenal-bridge-ecosystem: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildPhenomenalBridgeEcosystem
};
