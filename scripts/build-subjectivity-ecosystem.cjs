#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const { verifySubjectivityGate } = require('./verify-subjectivity-gate.cjs');

const ROOT = path.resolve(__dirname, '..');
const SRT5_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt5');
const SRT6_DIR = path.join(ROOT, 'artifacts', 'subjectivity', 'srt6');

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const rel = (filePath) => path.relative(ROOT, filePath).replace(/\\/g, '/');

async function buildSubjectivityEcosystem() {
  const gate = await verifySubjectivityGate();
  if (!gate.ok) {
    throw new Error(
      `SRT-5 dependency verification failed before SRT-6. See ${path.relative(
        ROOT,
        gate.outputPath
      )}`
    );
  }

  const imported = await import(
    pathToFileURL(path.join(ROOT, 'src', 'subjectivity', 'index.js')).href
  );
  const integrator = imported.createSubjectivityEcosystemIntegrator();

  const runBundle = {
    projection: readJson(path.join(SRT5_DIR, 'subjectivity_runtime_projection.json')),
    gate_result: readJson(path.join(SRT5_DIR, 'subjectivity_gate_result.json')),
    manifest: readJson(path.join(SRT5_DIR, 'subjectivity_manifest.json')),
    refs: {
      projection: 'artifacts/subjectivity/srt5/subjectivity_runtime_projection.json',
      gate_result: 'artifacts/subjectivity/srt5/subjectivity_gate_result.json',
      manifest: 'artifacts/subjectivity/srt5/subjectivity_manifest.json'
    }
  };

  const result = integrator.writeArtifacts(
    {
      run_bundle: runBundle,
      condition_runs: [runBundle],
      condition_id: runBundle.gate_result.condition_id,
      batch_id: 'subjectivity_internal_batch_baseline',
      campaign_id: 'subjectivity_internal_campaign_baseline',
      provenance: {
        source_trace_ref: 'subjectivity_inputs/srt6_ecosystem_baseline',
        input_profile: 'srt6_ecosystem_integration_baseline'
      }
    },
    SRT6_DIR
  );

  const payload = {
    ok: result.verification_matrix.status === 'PASS',
    output_dir: rel(SRT6_DIR),
    emitted_artifacts: Object.fromEntries(
      Object.entries(result.outputs).map(([key, value]) => [key, rel(value)])
    ),
    readiness_class: result.candidate_projection.readiness_class,
    support_class: result.campaign_summary.aggregate_support.support_classes
      ? Object.keys(result.campaign_summary.aggregate_support.support_classes)[0]
      : runBundle.manifest.support_class,
    verification_status: result.verification_matrix.status
  };

  return payload;
}

if (require.main === module) {
  buildSubjectivityEcosystem()
    .then((payload) => {
      process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
      if (!payload.ok) process.exitCode = 1;
    })
    .catch((error) => {
      console.error(`FAIL build-subjectivity-ecosystem: ${error.message}`);
      process.exit(1);
    });
}

module.exports = {
  buildSubjectivityEcosystem
};
