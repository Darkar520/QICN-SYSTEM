#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_DIR = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_0');
const PAPER10_DIR = path.join(ROOT, 'paper10_external_adjudication_and_human_comparators');
const PAPER10_MAIN = path.join(PAPER10_DIR, 'main.tex');
const PAPER10_PDF = path.join(PAPER10_DIR, 'main.pdf');
const PAPER10_CLEANUP_SUFFIXES = ['.aux', '.log', '.out', '.toc', '.fdb_latexmk', '.fls'];

const fileExists = (relativePath) => fs.existsSync(path.join(ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(ROOT, relativePath), 'utf8');
const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const cleanupPaper10BuildArtifacts = () => {
  PAPER10_CLEANUP_SUFFIXES.forEach((suffix) => {
    const target = path.join(PAPER10_DIR, `main${suffix}`);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });
};

const compilePaper10 = () => {
  if (!fs.existsSync(PAPER10_MAIN)) {
    return {
      status: 'compile_not_run_missing_source',
      warnings: ['paper10_main_tex_missing']
    };
  }

  try {
    for (let i = 0; i < 2; i += 1) {
      const result = cp.spawnSync(
        'pdflatex',
        ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'],
        {
          cwd: PAPER10_DIR,
          encoding: 'utf8'
        }
      );
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(
          (result.stderr || result.stdout || 'pdflatex returned a non-zero status')
            .split(/\r?\n/)
            .slice(-20)
            .join('\n')
        );
      }
    }

    const compiled = fs.existsSync(PAPER10_PDF);
    cleanupPaper10BuildArtifacts();
    return {
      status: compiled ? 'compiled' : 'compile_failed_missing_pdf',
      warnings: compiled ? [] : ['paper10_pdf_missing_after_pdflatex']
    };
  } catch (error) {
    cleanupPaper10BuildArtifacts();
    const message = String(error.message || error);
    if (/ENOENT|not recognized as the name of a cmdlet|No such file/i.test(message)) {
      return {
        status: 'compile_not_run_toolchain_unavailable',
        warnings: ['pdflatex_unavailable']
      };
    }
    return {
      status: 'compile_failed',
      warnings: [`paper10_compile_failed:${message.replace(/\s+/g, ' ').slice(0, 240)}`]
    };
  }
};

const build = async () => {
  const stage3LayerUrl = pathToFileURL(
    path.join(ROOT, 'src', 'comparative_program', 'Stage3Layer.js')
  ).href;
  const utilsUrl = pathToFileURL(
    path.join(ROOT, 'src', 'comparative_program', 'ComparativeRuntimeUtils.js')
  ).href;

  const stage3Module = await import(stage3LayerUrl);
  const utils = await import(utilsUrl);
  const stage3 = stage3Module.describeStage3Layer();
  const compileResult = compilePaper10();

  ensureDir(OUTPUT_DIR);

  const lineage = utils.captureComparativeLineage({
    layerVersion: 'comparative_expansion_layer.stage3_0_external_adjudication_scaffold.v1',
    estimatorVersion: 'build_stage3_scaffolding.cjs.v1',
    extraRefs: {
      external_adjudication_protocol: {
        ref: 'docs/external_adjudication_protocol.v1.json',
        sha256: utils.hashFileRelative('docs/external_adjudication_protocol.v1.json')
      },
      external_evidence_admissibility_criteria: {
        ref: 'docs/external_evidence_admissibility_criteria.v1.json',
        sha256: utils.hashFileRelative('docs/external_evidence_admissibility_criteria.v1.json')
      },
      human_comparator_execution_protocol: {
        ref: 'docs/human_comparator_execution_protocol.v1.json',
        sha256: utils.hashFileRelative('docs/human_comparator_execution_protocol.v1.json')
      },
      stage3_surface_policy: {
        ref: 'docs/stage3_surface_policy.v1.json',
        sha256: utils.hashFileRelative('docs/stage3_surface_policy.v1.json')
      },
      stage3_artifact_schema: {
        ref: 'docs/stage3_artifact_schema.v1.json',
        sha256: utils.hashFileRelative('docs/stage3_artifact_schema.v1.json')
      },
      paper10_scaffold_manifest: {
        ref: 'docs/paper10_scaffold_manifest.v1.json',
        sha256: utils.hashFileRelative('docs/paper10_scaffold_manifest.v1.json')
      }
    }
  });

  const externalAdjudicationManifest = {
    artifact_role: 'external_adjudication_manifest',
    artifact_name: 'external_adjudication_manifest.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    external_adjudication_state: 'external_adjudication_protocol_defined',
    execution_state: 'external_adjudication_not_executed',
    paper10_state: 'paper10_scaffold_open',
    paper10_authorization_state: 'not_paper10_final_authorized',
    boundary_flags: {
      framework_internal_only: true,
      stage3_0_scaffold_only: true,
      external_adjudication_executed: false,
      human_comparator_data_present: false,
      paper10_scaffold_created: true,
      paper10_final_authorized: false,
      no_external_validation: true,
      no_human_equivalence: true,
      no_superiority_claim: true,
      no_metaphysical_closure: true
    },
    non_implications: [
      'This manifest is not an adjudication verdict.',
      'This manifest is not external validation.',
      'This manifest is not Paper 10 final authorization.'
    ],
    interpretation_boundary:
      'Framework-internal only; this manifest records Stage3-0 governance availability and scaffold state, not adjudication execution.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref: 'src/comparative_program/schemas/external_adjudication_manifest.v1.json'
  };

  const externalAdjudicationReadinessGate = {
    artifact_role: 'external_adjudication_readiness_gate',
    artifact_name: 'external_adjudication_readiness_gate.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    stage3_readiness_state: 'stage3_0_protocol_scaffold_ready',
    external_adjudication_state: 'external_adjudication_protocol_defined',
    execution_state: 'external_adjudication_not_executed',
    human_comparator_state: 'comparator_protocol_defined',
    human_data_state: 'human_comparator_data_absent',
    paper10_authorization_state: 'not_paper10_final_authorized',
    remaining_blockers: [
      'preregistration_record_absent',
      'reviewer_selection_absent',
      'human_comparator_dataset_absent',
      'matched_intervention_dataset_absent',
      'negative_control_dataset_absent',
      'replication_package_absent',
      'external_adjudication_execution_absent'
    ],
    boundary_flags: {
      framework_internal_only: true,
      stage3_0_scaffold_only: true,
      external_adjudication_executed: false,
      human_comparator_data_present: false,
      paper10_final_authorized: false
    },
    non_implications: [
      'Readiness is not execution.',
      'Readiness is not reviewer selection.',
      'Readiness is not an adjudication result.'
    ],
    interpretation_boundary:
      'Framework-internal only; this gate records protocol-defined readiness and still-blocked execution burdens.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref: 'src/comparative_program/schemas/external_adjudication_readiness_gate.v1.json'
  };

  const admissibilitySource = JSON.parse(
    readText('docs/external_evidence_admissibility_criteria.v1.json')
  );
  const externalEvidenceAdmissibilityAssessment = {
    artifact_role: 'external_evidence_admissibility_assessment',
    artifact_name: 'external_evidence_admissibility_assessment.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    assessment_state: 'criteria_defined_not_exercised',
    evidence_class_states: (admissibilitySource.evidence_classes || []).map((entry) => ({
      evidence_id: entry.evidence_id,
      state: 'criteria_defined_not_instantiated'
    })),
    invalid_substitutes: admissibilitySource.global_invalid_substitutes || [],
    boundary_flags: {
      framework_internal_only: true,
      no_external_validation: true,
      no_human_equivalence: true
    },
    non_implications: [
      'This assessment is not evidence.',
      'This assessment is not external validation.'
    ],
    interpretation_boundary:
      'Framework-internal only; this artifact records the admissibility grammar without any external evidence instantiation.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref:
      'src/comparative_program/schemas/external_evidence_admissibility_assessment.v1.json'
  };

  const comparatorProtocol = JSON.parse(
    readText('docs/human_comparator_execution_protocol.v1.json')
  );
  const humanComparatorExecutionPlan = {
    artifact_role: 'human_comparator_execution_plan',
    artifact_name: 'human_comparator_execution_plan.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    comparator_state: 'comparator_protocol_defined',
    execution_state: 'comparator_execution_not_open',
    human_data_state: 'human_comparator_data_absent',
    channel_states: (comparatorProtocol.channels || []).map((entry) => ({
      channel_id: entry.channel_id,
      state: 'protocol_defined_collection_not_open'
    })),
    boundary_flags: {
      framework_internal_only: true,
      human_comparator_data_present: false,
      no_human_equivalence: true
    },
    non_implications: [
      'This execution plan is not a dataset.',
      'This execution plan is not human equivalence.'
    ],
    interpretation_boundary:
      'Framework-internal only; this plan records comparator channel structure without opening collection.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref: 'src/comparative_program/schemas/human_comparator_execution_plan.v1.json'
  };

  const paper10Text = readText('paper10_external_adjudication_and_human_comparators/main.tex');
  const paper10ScaffoldStatus = {
    artifact_role: 'paper10_scaffold_status',
    artifact_name: 'paper10_scaffold_status.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    paper10_state: 'paper10_scaffold_open',
    paper10_authorization_state: 'not_paper10_final_authorized',
    scaffold_only_marker_present: /SCAFFOLD ONLY -- NOT FINAL MANUSCRIPT/.test(paper10Text),
    result_sections_blocked: /intentionally non-result-bearing at Stage3-0/i.test(paper10Text),
    compile_status: compileResult.status,
    compile_warnings: compileResult.warnings,
    pdf_present: fs.existsSync(PAPER10_PDF),
    boundary_flags: {
      framework_internal_only: true,
      stage3_0_scaffold_only: true,
      no_external_validation: true,
      no_human_equivalence: true,
      no_superiority_claim: true,
      no_metaphysical_closure: true
    },
    non_implications: [
      'This scaffold status is not Paper 10 final authorization.',
      'This scaffold status is not a result-bearing manuscript.'
    ],
    interpretation_boundary:
      'Framework-internal only; this artifact records scaffold state and blocked result sections for the local Paper 10 source tree.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref: 'src/comparative_program/schemas/paper10_scaffold_status.v1.json'
  };

  const checks = [
    {
      id: 'protocol_defined',
      pass: externalAdjudicationManifest.external_adjudication_state === 'external_adjudication_protocol_defined'
    },
    {
      id: 'not_executed',
      pass: externalAdjudicationManifest.execution_state === 'external_adjudication_not_executed'
    },
    {
      id: 'human_data_absent',
      pass: humanComparatorExecutionPlan.human_data_state === 'human_comparator_data_absent'
    },
    {
      id: 'paper10_scaffold_open',
      pass: paper10ScaffoldStatus.paper10_state === 'paper10_scaffold_open'
    },
    {
      id: 'paper10_not_authorized',
      pass: paper10ScaffoldStatus.paper10_authorization_state === 'not_paper10_final_authorized'
    },
    {
      id: 'scaffold_marker_present',
      pass: paper10ScaffoldStatus.scaffold_only_marker_present === true
    },
    {
      id: 'result_sections_blocked',
      pass: paper10ScaffoldStatus.result_sections_blocked === true
    }
  ];

  const stage3VerificationMatrix = {
    artifact_role: 'stage3_verification_matrix',
    artifact_name: 'stage3_verification_matrix.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: stage3.layer_id,
    implementation_status: stage3.implementation_status,
    status: checks.every((entry) => entry.pass) ? 'PASS' : 'FAIL',
    checks,
    boundary_flags: {
      framework_internal_only: true,
      stage3_0_scaffold_only: true,
      external_adjudication_executed: false,
      human_comparator_data_present: false,
      paper10_final_authorized: false
    },
    interpretation_boundary:
      'Framework-internal only; this matrix verifies the local Stage3-0 scaffold state and does not certify external adjudication.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: lineage
    },
    schema_ref: 'src/comparative_program/schemas/stage3_verification_matrix.v1.json'
  };

  const outputs = {
    external_adjudication_manifest: externalAdjudicationManifest,
    external_adjudication_readiness_gate: externalAdjudicationReadinessGate,
    external_evidence_admissibility_assessment: externalEvidenceAdmissibilityAssessment,
    human_comparator_execution_plan: humanComparatorExecutionPlan,
    paper10_scaffold_status: paper10ScaffoldStatus,
    stage3_verification_matrix: stage3VerificationMatrix
  };

  Object.entries(outputs).forEach(([key, payload]) => {
    writeJson(path.join(OUTPUT_DIR, `${key}.json`), payload);
  });

  console.log('PASS build-stage3-scaffolding');
  Object.keys(outputs).forEach((key) => console.log(`  emitted: ${key}.json`));
  console.log(`  paper10_compile_status: ${compileResult.status}`);
  compileResult.warnings.forEach((warning) => console.log(`  warning: ${warning}`));
};

build().catch((error) => {
  console.error(`FAIL build-stage3-scaffolding: ${error.message}`);
  process.exitCode = 1;
});
