import fs from 'fs';
import path from 'path';

import { PROJECT_ROOT } from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_6b_runtime_health_and_stage3_7.paper10_protocol_backbone.v1';
const ESTIMATOR_VERSION = 'paper10_protocol_hardening_builder.stage3_6b_runtime_health_and_stage3_7.v1';

const PAPER10_DIR = path.join(PROJECT_ROOT, 'paper10_external_adjudication_and_human_comparators');
const PAPER10_FILES = Object.freeze({
  mainTex: path.join(PAPER10_DIR, 'main.tex'),
  mainPdf: path.join(PAPER10_DIR, 'main.pdf'),
  sectionStatus: path.join(PAPER10_DIR, 'PAPER10_SECTION_STATUS.md'),
  claimBoundary: path.join(PAPER10_DIR, 'PAPER10_CLAIM_BOUNDARY.md'),
  evidenceRequirements: path.join(PAPER10_DIR, 'PAPER10_EVIDENCE_REQUIREMENTS.md')
});

const REQUIRED_SECTION_PATTERNS = Object.freeze({
  status_banner: /SCAFFOLD ONLY -- NOT FINAL MANUSCRIPT/i,
  protocol_banner: /PROTOCOL-GRADE BACKBONE/i,
  abstract: /\\begin\{abstract\}/,
  dependency_architecture: /Dependency Architecture/i,
  release_vs_local_boundary: /Release-vs-Local Corpus Boundary|Release vs Local Corpus Boundary/i,
  lineage_semantics: /Lineage and Provenance Semantics/i,
  provenance_closure: /Provenance Closure and Live Head Reconciliation/i,
  frozen_preregistration_architecture: /Frozen Preregistration Architecture/i,
  instantiated_empty_record_layer: /Instantiated-Empty Record Layer/i,
  reviewer_candidate_architecture: /Reviewer Candidate and Adjudicator Candidate Architecture/i,
  candidate_pool_stub_architecture: /Reviewer Candidate Pool and Assignment Stub Architecture/i,
  blinding_assignment_logic: /Blinding Assignment Logic/i,
  instantiation_logic: /Human Comparator Instantiation Logic/i,
  execution_contracts: /Channel-by-Channel Execution Contracts/i,
  preregistration_architecture: /Preregistration Architecture/i,
  reviewer_architecture: /Reviewer and Adjudicator Independence Architecture/i,
  execution_pilot_package_architecture: /Execution Pilot Package Architecture/i,
  rehearsal_kit_architecture: /Execution Pilot Rehearsal Kit Architecture/i,
  controlled_execution_opening: /Controlled Execution Opening/i,
  live_but_unpopulated_artifacts: /Live-But-Unpopulated Artifacts/i,
  session_zero_protocol: /Session-Zero Protocol/i,
  pre_collection_gate: /Pre-Collection Admissibility Gate/i,
  contamination_abort_policy: /Contamination, Abort, and Invalidation Controls/i,
  operator_checklist: /Operator Checklist/i,
  collection_start_boundary: /Collection-Start Boundary/i,
  evidence_generation_boundary: /Evidence-Generation Boundary/i,
  decision_record_boundary: /Decision-Record Boundary/i,
  first_collection_transition: /Transition from Session-Zero to First Admissible Collection/i,
  runtime_health_audit: /Runtime Health Audit/i,
  clean_room_reproducibility: /Clean-Room Reproducibility/i,
  dependency_build_assumptions: /Dependency and Build Assumptions/i,
  reproducible_artifact_regeneration: /Reproducible Artifact Regeneration/i,
  local_path_leakage_policy: /Local Path Leakage Policy/i,
  controlled_execution_opening_audit: /Controlled Execution Opening Audit/i,
  session_zero_reproducibility: /Session-Zero Reproducibility/i,
  pre_collection_gate_reproducibility: /Pre-Collection Gate Reproducibility/i,
  reproducibility_not_evidence: /Why Reproducibility Does Not Imply Evidence/i,
  runtime_health_not_adjudication: /Why Runtime Health Does Not Imply Adjudication/i,
  first_collection_opening_conditions: /Transition Conditions for First Admissible Collection/i,
  reproducibility_skeleton_architecture: /Reproducibility Skeleton Architecture/i,
  dataset_population_boundary: /Dataset Population Boundary/i,
  dry_run_event_log_grammar: /Dry-Run Event Log Grammar/i,
  adjudication_decision_grammar: /Adjudication Decision Grammar/i,
  state_grammar: /State Grammar for Execution Readiness/i,
  evidence_insertion_map: /Evidence Insertion Map/i,
  appendices: /Appendix A|Appendices of Schemas and Templates/i,
  unlock_conditions: /Execution-Era Unlock Conditions/i,
  transition_map: /Stronger Execution-to-Result Transition Map/i,
  stage4_boundary: /Boundary to Stage 4/i
});

const readTextIfExists = (absolutePath) =>
  fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : '';

const countPattern = (text, pattern) => (text.match(pattern) || []).length;

export class Paper10ProtocolHardeningBuilder {
  build({ compileResult, currentLineage }) {
    const mainTex = readTextIfExists(PAPER10_FILES.mainTex);
    const sectionStatus = readTextIfExists(PAPER10_FILES.sectionStatus);
    const claimBoundary = readTextIfExists(PAPER10_FILES.claimBoundary);
    const evidenceRequirements = readTextIfExists(PAPER10_FILES.evidenceRequirements);

    const required_section_flags = Object.fromEntries(
      Object.entries(REQUIRED_SECTION_PATTERNS).map(([key, pattern]) => [key, pattern.test(mainTex)])
    );

    return {
      artifact_role: 'paper10_protocol_hardening_status',
      artifact_name: 'paper10_protocol_hardening_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_6b_runtime_health_and_stage3_7_first_collection_opening',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_6b_runtime_health_and_stage3_7_paper10_protocol_backbone_defined',
      paper10_state: 'paper10_protocol_grade_backbone',
      paper10_result_state: 'paper10_result_sections_blocked',
      paper10_authorization_state: 'paper10_not_final_authorized',
      paper10_evidence_insertion_state: 'paper10_ready_for_evidence_insertion_only_after_execution',
      compile_status: compileResult.status,
      compile_warnings: [...(compileResult.warnings || [])],
      pdf_present: fs.existsSync(PAPER10_FILES.mainPdf),
      required_section_flags,
      blocked_result_marker_present: /intentionally non-result-bearing/i.test(mainTex),
      protocol_table_present: /Theorem, Proposition, and Protocol Mapping/i.test(mainTex),
      evidence_placeholder_count: countPattern(mainTex, /Admissible evidence required/gi),
      section_status_marker_count: countPattern(sectionStatus, /\|\s*(formalized|protocol_defined|evidence_pending|blocked_until_execution|blocked_until_external_adjudication|forbidden_claim_surface)\s*\|/gi),
      claim_boundary_block_count: countPattern(claimBoundary, /^- /gm),
      evidence_requirement_block_count: countPattern(evidenceRequirements, /^## /gm),
      boundary_flags: {
        framework_internal_only: true,
        non_result_bearing: true,
        paper10_final_authorized: false,
        external_validation_absent: true,
        human_data_absent: true
      },
      non_implications: [
        'Protocol-grade backbone is not a final manuscript.',
        'Protocol-grade backbone is not an adjudication verdict.',
        'Protocol-grade backbone is not human equivalence.'
      ],
      interpretation_boundary:
        'Paper 10 is hardened into a protocol-grade, non-result-bearing manuscript backbone only. It remains blocked from final claims until later admissible execution-era evidence exists, later reviewer and adjudicator action exists, and later result-bearing sections are written honestly from those records.',
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/paper10_protocol_hardening_status.v1.json'
    };
  }
}

export const createPaper10ProtocolHardeningBuilder = () =>
  new Paper10ProtocolHardeningBuilder();

export default {
  Paper10ProtocolHardeningBuilder,
  createPaper10ProtocolHardeningBuilder
};
