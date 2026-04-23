import path from 'path';

import {
  PROJECT_ROOT,
  ensureDir,
  writeJson,
  hashFileRelative,
  readJsonRelative,
  captureComparativeLineage,
  containsLocalPathLeak,
  checkSurfaceEligibility,
  COMPARATIVE_CLOSURE_ARTIFACT_REFS
} from './ComparativeRuntimeUtils.js';
import { createStage3ReadinessFulfillmentBuilder } from './Stage3ReadinessFulfillmentBuilder.js';
import { createHumanChannelInstantiationEvaluator } from './HumanChannelInstantiationEvaluator.js';
import {
  HUMAN_CHANNEL_PREREGISTRATION_TEMPLATES
} from './HumanChannelPreregistrationRegistry.js';
import {
  MATCHED_INTERVENTION_DATASET_CONTRACTS
} from './MatchedInterventionDatasetContractRegistry.js';
import {
  NEGATIVE_CONTROL_DATASET_CONTRACTS
} from './NegativeControlDatasetContractRegistry.js';
import {
  EXTERNAL_ADJUDICATION_PREREGISTRATION_TEMPLATE,
  HUMAN_COMPARATOR_PREREGISTRATION_TEMPLATE
} from './ExternalAdjudicationPreregistrationRegistry.js';
import {
  REVIEWER_INDEPENDENCE_PROTOCOL,
  REVIEWER_SELECTION_CRITERIA,
  CONFLICT_OF_INTEREST_POLICY,
  BLINDING_POLICY
} from './ReviewerIndependenceRegistry.js';
import {
  ADJUDICATOR_INDEPENDENCE_CRITERIA
} from './AdjudicatorIndependenceRegistry.js';
import { STATISTICAL_ANALYSIS_SHELLS } from './StatisticalAnalysisShellRegistry.js';
import { STAGE3_SURFACE_POLICY } from './Stage3SurfacePolicy.js';
import { createPaper10ProtocolHardeningBuilder } from './Paper10ProtocolHardeningBuilder.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_2_external_adjudication_readiness.v1';
const ESTIMATOR_VERSION = 'stage3_execution_readiness_builder.v1';

const STAGE3_1_DOC_REFS = Object.freeze([
  'docs/human_channel_instantiation_contracts.v1.json',
  'docs/human_channel_preregistration_templates.v1.json',
  'docs/matched_intervention_dataset_contracts.v1.json',
  'docs/negative_control_dataset_contracts.v1.json',
  'docs/external_adjudication_preregistration_template.v1.json',
  'docs/human_comparator_preregistration_template.v1.json',
  'docs/reviewer_independence_protocol.v1.json',
  'docs/reviewer_conflict_disclosure_template.v1.json',
  'docs/statistical_analysis_shells.v1.json',
  'docs/adjudicator_independence_criteria.v1.json',
  'docs/reviewer_selection_criteria.v1.json',
  'docs/conflict_of_interest_policy.v1.json',
  'docs/blinding_policy.v1.json'
]);

const STAGE3_OUTPUT_NAMES = Object.freeze([
  'human_channel_instantiation_assessment.json',
  'human_channel_preregistration_readiness.json',
  'matched_intervention_dataset_contract_assessment.json',
  'negative_control_dataset_contract_assessment.json',
  'reviewer_independence_assessment.json',
  'external_adjudication_execution_readiness.json',
  'paper10_protocol_hardening_status.json',
  'external_adjudication_manifest.json',
  'external_adjudication_readiness_gate.json',
  'stage3_verification_matrix.json'
]);

const unique = (items) => [...new Set((items || []).filter(Boolean))];

const summarizeBy = (entries, key) => {
  const counts = {};
  entries.forEach((entry) => {
    counts[entry[key]] = (counts[entry[key]] || 0) + 1;
  });
  return counts;
};

const buildHumanChannelPreregistrationReadiness = ({ instantiationAssessment, currentLineage }) => ({
  artifact_role: 'human_channel_preregistration_readiness',
  artifact_name: 'human_channel_preregistration_readiness.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_id: 'comparative_expansion_layer.stage3_1_human_comparator_instantiation',
  implementation_status: 'stage3_1_preregistration_templates_defined',
  preregistration_state: 'preregistration_ready_for_freeze',
  execution_state: 'preregistration_not_executed',
  template_only: true,
  channel_preregistration_states: instantiationAssessment.channel_assessments.map((entry) => ({
    channel_id: entry.channel_id,
    preregistration_state: entry.preregistration_template_state
  })),
  channel_count: instantiationAssessment.channel_assessments.length,
  boundary_flags: {
    framework_internal_only: true,
    preregistration_record_present: false,
    human_data_absent: true
  },
  non_implications: [
    'Template readiness is not a frozen preregistration record.',
    'Template readiness is not execution.'
  ],
  interpretation_boundary:
    'This artifact records local template readiness only. No preregistration has been frozen or externally filed.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref:
    'src/comparative_program/schemas/human_channel_preregistration_readiness.v1.json'
});

const buildMatchedInterventionDatasetContractAssessment = ({ currentLineage }) => {
  const bindings = MATCHED_INTERVENTION_DATASET_CONTRACTS.channel_bindings || [];
  return {
    artifact_role: 'matched_intervention_dataset_contract_assessment',
    artifact_name: 'matched_intervention_dataset_contract_assessment.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_1_human_comparator_instantiation',
    implementation_status: 'stage3_1_matched_intervention_dataset_contracts_defined',
    contract_state: 'dataset_contract_ready_but_uninstantiated',
    human_data_state: 'human_comparator_data_absent',
    bindings: bindings.map((entry) => ({
      channel_id: entry.channel_id,
      dataset_contract_state: 'dataset_contract_ready_but_uninstantiated',
      required_dataset_family: entry.required_dataset_family
    })),
    boundary_flags: {
      framework_internal_only: true,
      dataset_present: false,
      no_external_validation: true
    },
    non_implications: [
      'Dataset contract readiness is not a dataset.',
      'Dataset contract readiness is not an effect result.'
    ],
    interpretation_boundary:
      'This artifact records matched intervention dataset contracts only. No dataset has been instantiated.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref:
      'src/comparative_program/schemas/matched_intervention_dataset_contract_assessment.v1.json'
  };
};

const buildNegativeControlDatasetContractAssessment = ({ currentLineage }) => {
  const families = NEGATIVE_CONTROL_DATASET_CONTRACTS.negative_control_families || [];
  return {
    artifact_role: 'negative_control_dataset_contract_assessment',
    artifact_name: 'negative_control_dataset_contract_assessment.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_1_human_comparator_instantiation',
    implementation_status: 'stage3_1_negative_control_dataset_contracts_defined',
    contract_state: 'negative_control_contract_ready_but_uninstantiated',
    human_data_state: 'human_comparator_data_absent',
    families: families.map((entry) => ({
      channel_id: entry.channel_id,
      required_dataset_family: entry.required_dataset_family,
      dataset_contract_state: 'negative_control_contract_ready_but_uninstantiated'
    })),
    boundary_flags: {
      framework_internal_only: true,
      dataset_present: false,
      no_external_validation: true
    },
    non_implications: [
      'Negative-control contracts are not datasets.',
      'Negative-control contracts are not failure verdicts.'
    ],
    interpretation_boundary:
      'This artifact records negative-control dataset contracts only. No negative-control dataset exists yet.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref:
      'src/comparative_program/schemas/negative_control_dataset_contract_assessment.v1.json'
  };
};

const buildReviewerIndependenceAssessment = ({ currentLineage }) => ({
  artifact_role: 'reviewer_independence_assessment',
  artifact_name: 'reviewer_independence_assessment.json',
  artifact_version: '1.0.0',
  schema_version: '1.0.0',
  layer_id: 'comparative_expansion_layer.stage3_2_external_adjudication_readiness',
  implementation_status: 'stage3_2_reviewer_independence_protocol_defined',
  reviewer_layer_state: 'reviewer_criteria_defined',
  reviewer_selection_state: REVIEWER_SELECTION_CRITERIA.current_state || 'reviewer_selection_ready',
  adjudicator_layer_state: 'adjudicator_criteria_defined',
  adjudication_execution_state: 'adjudication_execution_not_open',
  reviewer_role_count: (REVIEWER_INDEPENDENCE_PROTOCOL.reviewer_roles || []).length,
  adjudicator_requirement_count: (ADJUDICATOR_INDEPENDENCE_CRITERIA.independence_requirements || []).length,
  conflict_class_count: (CONFLICT_OF_INTEREST_POLICY.conflict_classes || []).length,
  blinding_class_count: (BLINDING_POLICY.blinding_classes || []).length,
  boundary_flags: {
    framework_internal_only: true,
    reviewer_selection_started: false,
    adjudication_execution_started: false
  },
  non_implications: [
    'Reviewer readiness is not reviewer assignment.',
    'Reviewer readiness is not adjudication execution.'
  ],
  interpretation_boundary:
    'This artifact records reviewer and adjudicator independence architecture only. No reviewer selection or adjudication execution has started.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/reviewer_independence_assessment.v1.json'
});

const buildExternalAdjudicationExecutionReadiness = ({
  instantiationAssessment,
  preregistrationReadiness,
  matchedDatasetAssessment,
  negativeControlAssessment,
  reviewerAssessment,
  paper10Status,
  currentLineage
}) => {
  const remaining_blockers = unique([
    'frozen_preregistration_record_absent',
    'reviewer_selection_not_started',
    'adjudicator_assignment_not_started',
    'human_comparator_dataset_absent',
    'matched_intervention_dataset_absent',
    'negative_control_dataset_absent',
    'external_adjudication_execution_absent'
  ]);

  return {
    artifact_role: 'external_adjudication_execution_readiness',
    artifact_name: 'external_adjudication_execution_readiness.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_2_external_adjudication_readiness',
    implementation_status: 'stage3_2_execution_readiness_protocol_defined',
    external_adjudication_state: 'external_adjudication_ready_for_preregistration',
    execution_state: 'external_adjudication_not_executed',
    execution_readiness_state: 'execution_readiness_partially_satisfied',
    preregistration_state: preregistrationReadiness.preregistration_state,
    reviewer_layer_state: reviewerAssessment.reviewer_selection_state,
    human_channel_state: instantiationAssessment.overall_state,
    human_data_state: 'human_comparator_data_absent',
    matched_dataset_state: matchedDatasetAssessment.contract_state,
    negative_control_state: negativeControlAssessment.contract_state,
    paper10_state: paper10Status.paper10_state,
    remaining_blockers,
    boundary_flags: {
      framework_internal_only: true,
      external_adjudication_started: false,
      human_data_present: false,
      external_validation_absent: true,
      paper10_final_authorized: false
    },
    non_implications: [
      'Execution readiness is not execution.',
      'Execution readiness is not external validation.',
      'Execution readiness is not human equivalence.'
    ],
    interpretation_boundary:
      'This artifact records Stage3-2 execution-readiness logic only. External adjudication remains unexecuted and no admissible human dataset exists yet.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref:
      'src/comparative_program/schemas/external_adjudication_execution_readiness.v1.json'
  };
};

const buildExternalManifest = ({ executionReadiness, currentLineage }) => ({
  artifact_role: 'external_adjudication_manifest',
  artifact_name: 'external_adjudication_manifest.json',
  artifact_version: '2.0.0',
  schema_version: '1.0.0',
  layer_id: 'comparative_expansion_layer.stage3_2_external_adjudication_readiness',
  implementation_status: 'stage3_2_execution_readiness_protocol_defined',
  external_adjudication_state: executionReadiness.external_adjudication_state,
  execution_state: executionReadiness.execution_state,
  paper10_state: executionReadiness.paper10_state,
  paper10_authorization_state: 'paper10_not_final_authorized',
  boundary_flags: {
    framework_internal_only: true,
    external_adjudication_executed: false,
    human_comparator_data_present: false,
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
    'Framework-internal only; this manifest records the Stage3-2 protocol-readiness state without opening execution.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/external_adjudication_manifest.v1.json'
});

const buildExternalReadinessGate = ({ executionReadiness, currentLineage }) => ({
  artifact_role: 'external_adjudication_readiness_gate',
  artifact_name: 'external_adjudication_readiness_gate.json',
  artifact_version: '2.0.0',
  schema_version: '1.0.0',
  layer_id: 'comparative_expansion_layer.stage3_2_external_adjudication_readiness',
  implementation_status: 'stage3_2_execution_readiness_protocol_defined',
  stage3_readiness_state: executionReadiness.execution_readiness_state,
  external_adjudication_state: executionReadiness.external_adjudication_state,
  execution_state: executionReadiness.execution_state,
  remaining_blockers: executionReadiness.remaining_blockers,
  boundary_flags: {
    framework_internal_only: true,
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
    'Framework-internal only; this gate records the current Stage3-2 readiness boundary while keeping execution closed.',
  provenance: {
    generated_at: new Date().toISOString(),
    current_lineage: currentLineage
  },
  schema_ref: 'src/comparative_program/schemas/external_adjudication_readiness_gate.v1.json'
});

const buildVerificationMatrix = ({
  instantiationAssessment,
  preregistrationReadiness,
  matchedDatasetAssessment,
  negativeControlAssessment,
  reviewerAssessment,
  executionReadiness,
  paper10Status,
  currentLineage
}) => {
  const checks = [
    {
      id: 'human_channel_instantiation_real',
      status: instantiationAssessment.channel_assessments.length === 7 ? 'PASS' : 'FAIL'
    },
    {
      id: 'preregistration_templates_ready',
      status: preregistrationReadiness.preregistration_state === 'preregistration_ready_for_freeze' ? 'PASS' : 'FAIL'
    },
    {
      id: 'matched_intervention_contracts_ready',
      status: matchedDatasetAssessment.contract_state === 'dataset_contract_ready_but_uninstantiated' ? 'PASS' : 'FAIL'
    },
    {
      id: 'negative_control_contracts_ready',
      status: negativeControlAssessment.contract_state === 'negative_control_contract_ready_but_uninstantiated' ? 'PASS' : 'FAIL'
    },
    {
      id: 'reviewer_independence_ready',
      status: reviewerAssessment.reviewer_selection_state === 'reviewer_selection_ready' ? 'PASS' : 'FAIL'
    },
    {
      id: 'execution_remains_unexecuted',
      status: executionReadiness.execution_state === 'external_adjudication_not_executed' ? 'PASS' : 'FAIL'
    },
    {
      id: 'human_data_absent',
      status: executionReadiness.human_data_state === 'human_comparator_data_absent' ? 'PASS' : 'FAIL'
    },
    {
      id: 'paper10_protocol_grade_backbone',
      status: paper10Status.paper10_state === 'paper10_protocol_grade_backbone' ? 'PASS' : 'FAIL'
    },
    {
      id: 'paper10_final_claims_blocked',
      status: paper10Status.paper10_authorization_state === 'paper10_not_final_authorized' ? 'PASS' : 'FAIL'
    },
    {
      id: 'no_local_path_leaks',
      status:
        !containsLocalPathLeak({
          instantiationAssessment,
          preregistrationReadiness,
          matchedDatasetAssessment,
          negativeControlAssessment,
          reviewerAssessment,
          executionReadiness,
          paper10Status,
          currentLineage
        })
          ? 'PASS'
          : 'FAIL'
    },
    {
      id: 'stage3_internal_surface_allowed',
      status: checkSurfaceEligibility(
        STAGE3_SURFACE_POLICY,
        STAGE3_OUTPUT_NAMES,
        'internal_release_bundle_surface'
      ).pass
        ? 'PASS'
        : 'FAIL'
    }
  ];

  return {
    artifact_role: 'stage3_verification_matrix',
    artifact_name: 'stage3_verification_matrix.json',
    artifact_version: '2.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_2_external_adjudication_readiness',
    implementation_status: 'stage3_2_execution_readiness_protocol_defined',
    status: checks.every((entry) => entry.status === 'PASS') ? 'PASS' : 'FAIL',
    checks,
    failures: checks.filter((entry) => entry.status === 'FAIL').map((entry) => entry.id),
    boundary_flags: {
      framework_internal_only: true,
      external_adjudication_executed: false,
      human_comparator_data_present: false,
      paper10_final_authorized: false
    },
    non_implications: [
      'Verification pass is not external adjudication.',
      'Verification pass is not human equivalence.'
    ],
    interpretation_boundary:
      'Framework-internal only; this matrix verifies Stage3-1 and Stage3-2 protocol hardening, not execution.',
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: currentLineage
    },
    schema_ref: 'src/comparative_program/schemas/stage3_verification_matrix.v1.json'
  };
};

export class Stage3ExecutionReadinessBuilder {
  captureCurrentLineage() {
    const extraRefs = Object.fromEntries(
      STAGE3_1_DOC_REFS.map((ref) => [
        ref.replace(/^docs\//, '').replace(/[^A-Za-z0-9_]+/g, '_'),
        {
          ref,
          sha256: hashFileRelative(ref)
        }
      ])
    );

    return captureComparativeLineage({
      layerVersion: LAYER_VERSION,
      estimatorVersion: ESTIMATOR_VERSION,
      extraRefs: {
        ...extraRefs,
        paper10_main_tex: {
          ref: 'paper10_external_adjudication_and_human_comparators/main.tex',
          sha256: hashFileRelative('paper10_external_adjudication_and_human_comparators/main.tex')
        },
        paper10_section_status: {
          ref: 'paper10_external_adjudication_and_human_comparators/PAPER10_SECTION_STATUS.md',
          sha256: hashFileRelative(
            'paper10_external_adjudication_and_human_comparators/PAPER10_SECTION_STATUS.md'
          )
        }
      }
    });
  }

  buildArtifacts({ stage31Dir, stage32Dir, paper10CompileResult }) {
    createStage3ReadinessFulfillmentBuilder().buildArtifacts(
      path.join(PROJECT_ROOT, 'artifacts', 'comparative_program', 'stage3_readiness')
    );

    const currentLineage = {
      ...this.captureCurrentLineage(),
      stage2_m4_readiness_state: readJsonRelative(COMPARATIVE_CLOSURE_ARTIFACT_REFS.readiness_gate)
        .readiness_class,
      stage3_opening_state: readJsonRelative(
        'artifacts/comparative_program/stage3_readiness/stage3_opening_gate.json'
      ).stage3_opening_state
    };

    const stage2InstantiationReadiness = readJsonRelative(
      'artifacts/comparative_program/stage2m4/human_channel_instantiation_readiness.json'
    );

    const instantiationAssessment = createHumanChannelInstantiationEvaluator().evaluate({
      stage2InstantiationReadiness,
      currentLineage
    });
    const preregistrationReadiness = buildHumanChannelPreregistrationReadiness({
      instantiationAssessment,
      currentLineage
    });
    const matchedDatasetAssessment = buildMatchedInterventionDatasetContractAssessment({
      currentLineage
    });
    const negativeControlAssessment = buildNegativeControlDatasetContractAssessment({
      currentLineage
    });
    const reviewerAssessment = buildReviewerIndependenceAssessment({ currentLineage });
    const paper10Status = createPaper10ProtocolHardeningBuilder().build({
      compileResult: paper10CompileResult,
      currentLineage
    });
    const executionReadiness = buildExternalAdjudicationExecutionReadiness({
      instantiationAssessment,
      preregistrationReadiness,
      matchedDatasetAssessment,
      negativeControlAssessment,
      reviewerAssessment,
      paper10Status,
      currentLineage
    });
    const externalManifest = buildExternalManifest({
      executionReadiness,
      currentLineage
    });
    const externalReadinessGate = buildExternalReadinessGate({
      executionReadiness,
      currentLineage
    });
    const verificationMatrix = buildVerificationMatrix({
      instantiationAssessment,
      preregistrationReadiness,
      matchedDatasetAssessment,
      negativeControlAssessment,
      reviewerAssessment,
      executionReadiness,
      paper10Status,
      currentLineage
    });

    ensureDir(stage31Dir);
    ensureDir(stage32Dir);

    writeJson(path.join(stage31Dir, 'human_channel_instantiation_assessment.json'), instantiationAssessment);
    writeJson(
      path.join(stage31Dir, 'human_channel_preregistration_readiness.json'),
      preregistrationReadiness
    );
    writeJson(
      path.join(stage31Dir, 'matched_intervention_dataset_contract_assessment.json'),
      matchedDatasetAssessment
    );
    writeJson(
      path.join(stage31Dir, 'negative_control_dataset_contract_assessment.json'),
      negativeControlAssessment
    );

    writeJson(path.join(stage32Dir, 'reviewer_independence_assessment.json'), reviewerAssessment);
    writeJson(
      path.join(stage32Dir, 'external_adjudication_execution_readiness.json'),
      executionReadiness
    );
    writeJson(
      path.join(stage32Dir, 'paper10_protocol_hardening_status.json'),
      paper10Status
    );
    writeJson(path.join(stage32Dir, 'external_adjudication_manifest.json'), externalManifest);
    writeJson(
      path.join(stage32Dir, 'external_adjudication_readiness_gate.json'),
      externalReadinessGate
    );
    writeJson(path.join(stage32Dir, 'stage3_verification_matrix.json'), verificationMatrix);

    return {
      human_channel_instantiation_assessment: instantiationAssessment,
      human_channel_preregistration_readiness: preregistrationReadiness,
      matched_intervention_dataset_contract_assessment: matchedDatasetAssessment,
      negative_control_dataset_contract_assessment: negativeControlAssessment,
      reviewer_independence_assessment: reviewerAssessment,
      external_adjudication_execution_readiness: executionReadiness,
      paper10_protocol_hardening_status: paper10Status,
      external_adjudication_manifest: externalManifest,
      external_adjudication_readiness_gate: externalReadinessGate,
      stage3_verification_matrix: verificationMatrix
    };
  }
}

export const createStage3ExecutionReadinessBuilder = () =>
  new Stage3ExecutionReadinessBuilder();

export default {
  Stage3ExecutionReadinessBuilder,
  createStage3ExecutionReadinessBuilder
};
