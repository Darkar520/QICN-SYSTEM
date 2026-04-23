const LAYER_VERSION = 'comparative_expansion_layer.stage2_m4.paper10_gate.v1';
const ESTIMATOR_VERSION = 'paper10_comparative_readiness_gate_builder.stage2_m4.v1';

const BOUNDARY =
  'Framework-internal only; the Paper 10 comparative readiness gate records whether comparative scoping could be discussed later and under what future conditions. It does not authorize Paper 10, does not open a manuscript, and does not open external adjudication.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_paper10_final_manuscript: true
});

export class Paper10ComparativeReadinessGateBuilder {
  build({ finalInternalAudit, stage3CriteriaAssessment, instantiationReadiness, currentLineage }) {
    let paper10ReadinessStatus = 'paper10_scoping_not_open';
    if (
      finalInternalAudit.current_comparative_readiness_class
        === 'comparative_internal_closure_ready'
    ) {
      paper10ReadinessStatus =
        stage3CriteriaAssessment.stage3_opening_state === 'ready_for_stage3_opening'
          ? 'paper10_scoping_conditionally_open'
          : 'paper10_scoping_ready_after_stage3_only';
    }

    return {
      artifact_role: 'paper10_comparative_readiness_gate',
      artifact_name: 'paper10_comparative_readiness_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage2_m4_internal_closure',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'comparative_internal_closure_implemented',
      paper10_readiness_status: paper10ReadinessStatus,
      paper10_authorization_state: 'not_paper10_authorized',
      comparative_internal_closure_state:
        finalInternalAudit.current_comparative_readiness_class,
      adjudication_criteria_status: stage3CriteriaAssessment.adjudication_criteria_status,
      stage3_opening_state: stage3CriteriaAssessment.stage3_opening_state,
      human_channel_instantiation_state:
        instantiationReadiness.instantiation_summary?.overall_state,
      blocking_reasons: [...stage3CriteriaAssessment.unsatisfied_requirements],
      warnings: [
        'paper10_authorization_remains_blocked',
        'paper10_scoping_depends_on_stage3',
        'no_paper10_final_or_public_claim_surface_is_open'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS
      },
      non_implications: [
        'Paper 10 readiness is not Paper 10 authorization.',
        'Paper 10 readiness is not external adjudication.',
        'Paper 10 readiness is not human equivalence.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        comparative_final_internal_audit_ref:
          'artifacts/comparative_program/stage2m4/comparative_final_internal_audit.json',
        current_lineage: currentLineage
      },
      schema_ref:
        'src/comparative_program/schemas/paper10_comparative_readiness_gate.v1.json'
    };
  }
}

export const createPaper10ComparativeReadinessGateBuilder = () =>
  new Paper10ComparativeReadinessGateBuilder();

export default {
  Paper10ComparativeReadinessGateBuilder,
  createPaper10ComparativeReadinessGateBuilder
};
