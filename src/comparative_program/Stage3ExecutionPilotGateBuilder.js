import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const STAGE3_EXECUTION_PILOT_OPENING_CRITERIA = Object.freeze(
  readJson('../../docs/stage3_execution_pilot_opening_criteria.v1.json')
);

const LAYER_VERSION = 'comparative_expansion_layer.stage3_4.execution_pilot_gate.v1';
const ESTIMATOR_VERSION = 'stage3_execution_pilot_gate_builder.stage3_4.v1';

const BOUNDARY =
  'Framework-internal only; the Stage3-4 pilot gate records dry-run authorization only. It does not authorize evidential collection or adjudication.';

export class Stage3ExecutionPilotGateBuilder {
  build({
    frozenPreregistrationReadiness,
    reviewerSelectionReadiness,
    adjudicatorAssignmentReadiness,
    executionPilotPackageAssessment,
    currentLineage
  }) {
    const readyForDryRun =
      frozenPreregistrationReadiness.freeze_state === 'local_freeze_ready'
      && reviewerSelectionReadiness.reviewer_selection_state === 'reviewer_selection_package_ready'
      && adjudicatorAssignmentReadiness.adjudicator_assignment_state === 'adjudicator_assignment_package_ready'
      && executionPilotPackageAssessment.package_state === 'pilot_package_ready_but_unexecuted';

    return {
      artifact_role: 'execution_pilot_opening_gate',
      artifact_name: 'execution_pilot_opening_gate.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4_execution_pilot_dry_run',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4_execution_pilot_opening_gate_defined',
      execution_pilot_state: readyForDryRun
        ? 'execution_pilot_ready_for_dry_run'
        : 'execution_pilot_not_open',
      dry_run_requirements: STAGE3_EXECUTION_PILOT_OPENING_CRITERIA.opening_requirements || [],
      dry_run_blockers: readyForDryRun
        ? []
        : [...(STAGE3_EXECUTION_PILOT_OPENING_CRITERIA.opening_blockers || [])],
      remaining_evidence_blockers: [
        'human_data_absent',
        'reviewer_selection_not_started',
        'adjudicator_assignment_not_started',
        'reproducibility_package_unpopulated',
        'decision_record_absent'
      ],
      boundary_flags: {
        framework_internal_only: true,
        execution_pilot_not_evidential: true,
        execution_pilot_not_adjudicative: true,
        human_collection_not_started: true
      },
      non_implications: [
        'Dry-run readiness is not evidential execution.',
        'Dry-run readiness is not adjudication.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/execution_pilot_opening_gate.v1.json'
    };
  }
}

export const createStage3ExecutionPilotGateBuilder = () =>
  new Stage3ExecutionPilotGateBuilder();

export default {
  Stage3ExecutionPilotGateBuilder,
  createStage3ExecutionPilotGateBuilder
};
