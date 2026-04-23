import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

const EXECUTION_PILOT_DRY_RUN_POLICY = Object.freeze(
  readJson('../../docs/execution_pilot_dry_run_policy.v1.json')
);

const LAYER_VERSION = 'comparative_expansion_layer.stage3_4.execution_pilot_dry_run.v1';
const ESTIMATOR_VERSION = 'execution_pilot_dry_run_evaluator.stage3_4.v1';

const BOUNDARY =
  'Framework-internal only; the Stage3-4 dry-run layer opens operational validation only. It remains non-evidential and non-adjudicative.';

export class ExecutionPilotDryRunEvaluator {
  evaluate({ executionPilotOpeningGate, currentLineage }) {
    const dryRunOpen = executionPilotOpeningGate.execution_pilot_state === 'execution_pilot_ready_for_dry_run';

    const executionPilotDryRunStatus = {
      artifact_role: 'execution_pilot_dry_run_status',
      artifact_name: 'execution_pilot_dry_run_status.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4_execution_pilot_dry_run',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4_execution_pilot_dry_run_policy_defined',
      execution_pilot_state: dryRunOpen ? 'execution_pilot_dry_run_open' : 'execution_pilot_not_open',
      evidence_state: 'execution_pilot_not_evidential',
      adjudication_state: 'execution_pilot_not_adjudicative',
      collection_session_state: 'collection_sessions_not_started',
      allowed_action_count: (EXECUTION_PILOT_DRY_RUN_POLICY.allowed_actions || []).length,
      blocked_action_count: (EXECUTION_PILOT_DRY_RUN_POLICY.blocked_actions || []).length,
      boundary_flags: {
        framework_internal_only: true,
        execution_pilot_not_evidential: true,
        execution_pilot_not_adjudicative: true,
        human_collection_not_started: true
      },
      non_implications: [
        'Dry-run open is not evidence collection.',
        'Dry-run open is not reviewer or adjudicator output.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/execution_pilot_dry_run_status.v1.json'
    };

    const executionPilotManifest = {
      artifact_role: 'execution_pilot_manifest',
      artifact_name: 'execution_pilot_manifest.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4_execution_pilot_dry_run',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4_execution_pilot_manifest_defined',
      execution_pilot_state: executionPilotDryRunStatus.execution_pilot_state,
      evidence_state: executionPilotDryRunStatus.evidence_state,
      adjudication_state: executionPilotDryRunStatus.adjudication_state,
      paper10_authorization_state: 'paper10_not_final_authorized',
      boundary_flags: {
        framework_internal_only: true,
        execution_pilot_not_evidential: true,
        execution_pilot_not_adjudicative: true,
        no_external_validation: true,
        no_human_equivalence: true
      },
      non_implications: [
        'Pilot manifest is not an evidential package.',
        'Pilot manifest is not Paper 10 final authorization.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/execution_pilot_manifest.v1.json'
    };

    return {
      executionPilotDryRunStatus,
      executionPilotManifest
    };
  }
}

export const createExecutionPilotDryRunEvaluator = () =>
  new ExecutionPilotDryRunEvaluator();

export default {
  ExecutionPilotDryRunEvaluator,
  createExecutionPilotDryRunEvaluator
};
