#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_RUNTIME = path.join(ROOT, 'artifacts', 'runtime_health');
const STAGE36_DIR = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_6');
const STAGE37_DIR = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_7');
const PAPER10_STATUS_PATH = path.join(
  ROOT,
  'artifacts',
  'external_adjudication',
  'stage3_2',
  'paper10_protocol_hardening_status.json'
);

const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, payload) =>
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const main = async () => {
  const runtimeModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'comparative_program', 'ComparativeRuntimeUtils.js')
    ).href
  );
  const stage37BuilderModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'comparative_program', 'Stage3_7FirstAdmissibleCollectionGateBuilder.js')
    ).href
  );
  const stage36bBuilderModule = await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src',
        'comparative_program',
        'Stage3_6BRuntimeReproducibilityGateBuilder.js'
      )
    ).href
  );

  const runtimeHealthAudit = readJson(path.join(OUTPUT_RUNTIME, 'runtime_health_audit.json'));
  const cleanRoomAudit = readJson(
    path.join(OUTPUT_RUNTIME, 'clean_room_reproducibility_audit.json')
  );
  const pathLeakageAudit = readJson(
    path.join(OUTPUT_RUNTIME, 'path_and_local_leakage_audit.json')
  );
  const artifactRegenerationAudit = readJson(
    path.join(OUTPUT_RUNTIME, 'artifact_regeneration_audit.json')
  );
  const stage3_6_manifest = readJson(path.join(STAGE36_DIR, 'stage3_6_manifest.json'));
  const stage3_6_controlled_execution_gate = readJson(
    path.join(STAGE36_DIR, 'stage3_6_controlled_execution_gate.json')
  );
  const paper10Status = readJson(PAPER10_STATUS_PATH);

  const currentLineage = runtimeModule.captureComparativeLineage({
    layerVersion: 'comparative_expansion_layer.stage3_7_first_admissible_collection_opening.v1',
    estimatorVersion: 'build-stage3-first-collection-opening.cjs',
    extraRefs: {
      stage3_7_opening_criteria: {
        ref: 'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json',
        sha256: runtimeModule.hashFileRelative(
          'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json'
        )
      },
      stage3_6b_runtime_reproducibility_gate_policy: {
        ref: 'docs/stage3_6b_runtime_reproducibility_gate.v1.json',
        sha256: runtimeModule.hashFileRelative(
          'docs/stage3_6b_runtime_reproducibility_gate.v1.json'
        )
      }
    }
  });

  const { stage3_7_opening_gate, first_collection_opening_manifest } =
    stage37BuilderModule.createStage3_7FirstAdmissibleCollectionGateBuilder().build({
      runtimeHealthAudit,
      cleanRoomAudit,
      pathLeakageAudit,
      artifactRegenerationAudit,
      stage3_6_manifest,
      stage3_6_controlled_execution_gate,
      paper10Status,
      currentLineage
    });

  fs.mkdirSync(STAGE37_DIR, { recursive: true });
  writeJson(path.join(STAGE37_DIR, 'stage3_7_opening_gate.json'), stage3_7_opening_gate);
  writeJson(
    path.join(STAGE37_DIR, 'first_collection_opening_manifest.json'),
    first_collection_opening_manifest
  );

  const stage3_6bGate =
    stage36bBuilderModule.createStage3_6BRuntimeReproducibilityGateBuilder().build({
      runtimeHealthAudit,
      cleanRoomAudit,
      pathLeakageAudit,
      artifactRegenerationAudit,
      paper10Status,
      stage3_7_opening_gate,
      currentLineage
    });
  writeJson(
    path.join(OUTPUT_RUNTIME, 'stage3_6b_runtime_reproducibility_gate.json'),
    stage3_6bGate
  );

  console.log('PASS build-stage3-first-collection-opening');
  console.log(`  stage3_7_state: ${stage3_7_opening_gate.stage3_7_state}`);
  console.log(`  collection_state: ${stage3_7_opening_gate.collection_state}`);
  console.log(`  evidence_state: ${stage3_7_opening_gate.evidence_state}`);
  console.log(`  stage3_6b_state: ${stage3_6bGate.stage3_6b_state}`);
};

main().catch((error) => {
  console.error(`FAIL build-stage3-first-collection-opening: ${error.message}`);
  process.exitCode = 1;
});
