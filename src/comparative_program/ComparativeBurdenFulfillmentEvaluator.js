import fs from 'fs';
import path from 'path';

import { listComparatorBurdens } from './ComparatorBurdenMatrixRegistry.js';
import { listCounterpartArtifactContracts } from './CounterpartArtifactContractsRegistry.js';
import { listHomologationContracts } from './HomologationContractsRegistry.js';
import { listCrossSubstrateTransitionContracts } from './CrossSubstrateTransitionContractsRegistry.js';
import {
  listHumanChannelInstantiationProtocols
} from './HumanChannelInstantiationProtocolsRegistry.js';
import {
  listComparativeCounterpartSchemas
} from './ComparativeCounterpartSchemaRegistry.js';
import {
  listComparativeErrorBudgetBindings
} from './ComparativeErrorBudgetBindingsRegistry.js';
import {
  PROJECT_ROOT,
  containsLocalPathLeak,
  stableHash
} from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_readiness_fulfillment.burden_fulfillment.v1';
const ESTIMATOR_VERSION = 'comparative_burden_fulfillment_evaluator.stage3_readiness.v1';

const BOUNDARY =
  'Framework-internal only; comparative burden fulfillment records whether Stage 3 prerequisites have been closed structurally and contractually without fabricating human evidence. It does not instantiate comparator evidence, does not authorize external adjudication, does not authorize equivalence, and does not authorize Paper 10.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_fabricated_human_evidence: true
});

const BURDEN_STATUS_CLASSIFICATIONS = Object.freeze({
  human_channel_burden: 'closable_now_internally',
  burden_symmetry: 'closable_now_internally',
  artifact_homology_burden: 'closable_now_internally',
  intervention_homology_burden: 'closable_now_internally',
  typing_contract_burden: 'closable_now_internally',
  error_budget_burden: 'closable_now_internally',
  transport_preservation_burden: 'closable_now_internally'
});

const STAGE3_RELEVANT_BURDENS = Object.freeze({
  human_channel_burden: {
    required_channels: ['self_report_channel', 'temporal_structure_channel', 'valence_topology_channel'],
    required_contracts: [
      'self_report_counterpart_contract',
      'temporal_structure_counterpart_contract',
      'valence_topology_counterpart_contract'
    ],
    required_homologation_units: [
      'self_report_structural_homologation',
      'temporal_structure_homologation',
      'valence_topology_homologation'
    ],
    required_counterpart_artifacts: [
      'human_self_report_trace.json',
      'human_self_report_channel_manifest.json',
      'human_temporal_structure_report.json',
      'human_valence_topology_report.json'
    ],
    required_budget_ids: [],
    required_transition_contracts: [],
    later_external_blockers: [
      'human_counterpart_artifacts_uninstantiated',
      'human_collection_sessions_uninstantiated'
    ],
    partial_internal_fulfillment: [
      'declare bounded human-side instantiation protocols',
      'bind typed schemas for required human artifact families'
    ],
    full_internal_fulfillment: [
      'all required Stage 3 channel protocols are defined with governance guards',
      'all required counterpart artifact families are schema-bound',
      'all required homologation units are declared against those counterpart families'
    ]
  },
  burden_symmetry: {
    required_channels: ['self_report_channel', 'intervention_response_channel', 'embodiment_boundary_channel'],
    required_contracts: [
      'self_report_counterpart_contract',
      'intervention_response_counterpart_contract',
      'embodiment_boundary_counterpart_contract'
    ],
    required_homologation_units: [
      'self_report_structural_homologation',
      'intervention_response_homologation',
      'embodiment_boundary_homologation'
    ],
    required_counterpart_artifacts: [
      'human_self_report_trace.json',
      'human_self_report_channel_manifest.json',
      'human_intervention_profile.json',
      'human_negative_control_profile.json',
      'human_embodiment_boundary_report.json'
    ],
    required_budget_ids: ['self_index_drift_budget', 'bridge_coordinate_distortion_budget'],
    required_transition_contracts: ['embodiment_boundary_transition_contract'],
    later_external_blockers: [
      'human_counterpart_artifacts_uninstantiated',
      'matched_human_side_measurements_absent'
    ],
    partial_internal_fulfillment: [
      'declare symmetric machine/human-side channel contracts',
      'bind embodiment-side error budgets and invalidation rules'
    ],
    full_internal_fulfillment: [
      'all symmetry-relevant channels are protocolized',
      'embodiment-side budget bindings are explicit',
      'paired homologation units exist for all symmetry-relevant channels'
    ]
  },
  artifact_homology_burden: {
    required_channels: ['self_report_channel', 'temporal_structure_channel', 'valence_topology_channel'],
    required_contracts: [
      'self_report_counterpart_contract',
      'temporal_structure_counterpart_contract',
      'valence_topology_counterpart_contract'
    ],
    required_homologation_units: [
      'self_report_structural_homologation',
      'temporal_structure_homologation',
      'valence_topology_homologation'
    ],
    required_counterpart_artifacts: [
      'human_self_report_trace.json',
      'human_self_report_channel_manifest.json',
      'human_temporal_structure_report.json',
      'human_valence_topology_report.json'
    ],
    required_budget_ids: [],
    required_transition_contracts: [],
    later_external_blockers: [
      'homologous_artifact_instances_absent',
      'paired_session_lineage_absent'
    ],
    partial_internal_fulfillment: [
      'bind counterpart artifact schemas to each required artifact family',
      'declare lineage fields required for homologation'
    ],
    full_internal_fulfillment: [
      'all artifact families are schema-bound',
      'all artifact families are tied to homologation units with lineage requirements'
    ]
  },
  intervention_homology_burden: {
    required_channels: ['intervention_response_channel'],
    required_contracts: ['intervention_response_counterpart_contract'],
    required_homologation_units: ['intervention_response_homologation'],
    required_counterpart_artifacts: ['human_intervention_profile.json', 'human_negative_control_profile.json'],
    required_budget_ids: ['intervention_signature_deviation_budget', 'lineage_break_budget'],
    required_transition_contracts: ['intervention_signature_transition_contract'],
    later_external_blockers: [
      'matched_human_intervention_profiles_uninstantiated',
      'matched_human_negative_controls_uninstantiated'
    ],
    partial_internal_fulfillment: [
      'declare matched intervention and negative-control schemas',
      'bind the intervention-signature transition contract and deviation budget'
    ],
    full_internal_fulfillment: [
      'matched intervention-side counterpart schemas exist',
      'the intervention homologation unit is declared',
      'the intervention transition contract is bound with explicit budget references'
    ]
  },
  typing_contract_burden: {
    required_channels: ['self_report_channel', 'temporal_structure_channel', 'ambiguity_load_channel'],
    required_contracts: [
      'self_report_counterpart_contract',
      'temporal_structure_counterpart_contract',
      'ambiguity_load_counterpart_contract',
      'transport_counterpart_contract'
    ],
    required_homologation_units: [
      'self_report_structural_homologation',
      'temporal_structure_homologation',
      'ambiguity_load_homologation',
      'transport_transition_homologation'
    ],
    required_counterpart_artifacts: [
      'human_self_report_trace.json',
      'human_self_report_channel_manifest.json',
      'human_temporal_structure_report.json',
      'human_ambiguity_load_report.json',
      'cross_substrate_transport_contract.json',
      'cross_substrate_lineage_map.json',
      'target_substrate_counterpart_manifest.json'
    ],
    required_budget_ids: ['lineage_break_budget'],
    required_transition_contracts: ['bridge_coordinate_transition_contract', 'lineage_continuity_transition_contract'],
    later_external_blockers: [
      'typed_counterpart_artifacts_uninstantiated',
      'typed_target_transition_counterpart_absent'
    ],
    partial_internal_fulfillment: [
      'bind typed schemas for all required human and transport artifact families',
      'declare the transition and lineage maps required by the typed domain'
    ],
    full_internal_fulfillment: [
      'the shared typed domain is explicit in schemas and contracts',
      'all typing-sensitive homologation units and transition contracts are declared'
    ]
  },
  error_budget_burden: {
    required_channels: ['embodiment_boundary_channel', 'transport_preservation_channel'],
    required_contracts: ['embodiment_boundary_counterpart_contract', 'transport_counterpart_contract'],
    required_homologation_units: ['embodiment_boundary_homologation', 'transport_transition_homologation'],
    required_counterpart_artifacts: [
      'human_embodiment_boundary_report.json',
      'cross_substrate_transport_contract.json',
      'cross_substrate_lineage_map.json',
      'target_substrate_counterpart_manifest.json'
    ],
    required_budget_ids: [
      'self_index_drift_budget',
      'bridge_coordinate_distortion_budget',
      'intervention_signature_deviation_budget',
      'lineage_break_budget'
    ],
    required_transition_contracts: [
      'bridge_coordinate_transition_contract',
      'intervention_signature_transition_contract',
      'lineage_continuity_transition_contract',
      'embodiment_boundary_transition_contract'
    ],
    later_external_blockers: [
      'budgets_not_yet_exercised_on_real_counterparts',
      'stage3_instantiation_required_to_measure_budget_consumption'
    ],
    partial_internal_fulfillment: [
      'bind Stage 3 budgets against already-implemented upstream subjectivity and bridge thresholds',
      'declare zero-tolerance lineage invalidation before any transition verdict'
    ],
    full_internal_fulfillment: [
      'all Stage 3 error budgets are explicitly bound',
      'relevant protocols and contracts reference those bindings',
      'no silent tolerance expansion remains'
    ]
  },
  transport_preservation_burden: {
    required_channels: ['transport_preservation_channel'],
    required_contracts: ['transport_counterpart_contract'],
    required_homologation_units: ['transport_transition_homologation'],
    required_counterpart_artifacts: [
      'cross_substrate_transport_contract.json',
      'cross_substrate_lineage_map.json',
      'target_substrate_counterpart_manifest.json'
    ],
    required_budget_ids: [
      'self_index_drift_budget',
      'bridge_coordinate_distortion_budget',
      'intervention_signature_deviation_budget',
      'lineage_break_budget'
    ],
    required_transition_contracts: [
      'bridge_coordinate_transition_contract',
      'intervention_signature_transition_contract',
      'lineage_continuity_transition_contract',
      'embodiment_boundary_transition_contract'
    ],
    later_external_blockers: [
      'target_substrate_counterpart_uninstantiated',
      'transport_verdict_still_blocked_until_stage3_execution'
    ],
    partial_internal_fulfillment: [
      'declare source-target remap schemas and lineage maps',
      'bind preservation axes and axis-specific budgets'
    ],
    full_internal_fulfillment: [
      'transport-side schemas, contracts, and lineage maps are declared',
      'all required transition contracts are present',
      'transport invalidation and fracture-accounting rules are explicit'
    ]
  }
});

const unique = (items) => [...new Set((items || []).filter(Boolean))];
const countBy = (entries, key) => {
  const counts = {};
  (entries || []).forEach((entry) => {
    const value = entry[key];
    counts[value] = (counts[value] || 0) + 1;
  });
  return counts;
};
const existsRelative = (relativePath) => fs.existsSync(path.join(PROJECT_ROOT, relativePath));

const createRegistryMaps = () => ({
  protocols: new Map(listHumanChannelInstantiationProtocols().map((entry) => [entry.channel_id, entry])),
  counterpartSchemas: new Map(
    listComparativeCounterpartSchemas().map((entry) => [entry.artifact_name, entry])
  ),
  budgets: new Map(listComparativeErrorBudgetBindings().map((entry) => [entry.budget_id, entry])),
  contracts: new Map(listCounterpartArtifactContracts().map((entry) => [entry.contract_id, entry])),
  homologationUnits: new Map(listHomologationContracts().map((entry) => [entry.homologation_unit_id, entry])),
  transitionContracts: new Map(
    listCrossSubstrateTransitionContracts().map((entry) => [entry.contract_id, entry])
  )
});

const resolveStage2OpenBurden = (finalInternalAudit, burdenId) =>
  (finalInternalAudit.failed_or_open_burdens || []).find((entry) => entry.burden_id === burdenId) || null;

const checkProtocols = (maps, channelIds) => {
  const missing = [];
  channelIds.forEach((channelId) => {
    const protocol = maps.protocols.get(channelId);
    if (!protocol) {
      missing.push(`protocol:${channelId}`);
      return;
    }
    (protocol.required_schema_refs || []).forEach((schemaRef) => {
      if (!existsRelative(schemaRef)) missing.push(`schema_ref:${schemaRef}`);
    });
    if (!protocol.collection_route) missing.push(`collection_route:${channelId}`);
    if (!Array.isArray(protocol.required_lineage_fields) || protocol.required_lineage_fields.length === 0) {
      missing.push(`lineage_fields:${channelId}`);
    }
  });
  return missing;
};
const checkContracts = (maps, contractIds) => contractIds.filter((contractId) => !maps.contracts.has(contractId)).map((contractId) => `contract:${contractId}`);
const checkHomologationUnits = (maps, unitIds) => unitIds.filter((unitId) => !maps.homologationUnits.has(unitId)).map((unitId) => `homologation:${unitId}`);
const checkTransitionContracts = (maps, contractIds) => contractIds.filter((contractId) => !maps.transitionContracts.has(contractId)).map((contractId) => `transition:${contractId}`);
const checkBudgets = (maps, budgetIds) => budgetIds.filter((budgetId) => maps.budgets.get(budgetId)?.status !== 'bound').map((budgetId) => `budget:${budgetId}`);
const checkCounterpartSchemas = (maps, artifactNames) => {
  const missing = [];
  artifactNames.forEach((artifactName) => {
    const schemaBinding = maps.counterpartSchemas.get(artifactName);
    if (!schemaBinding) {
      missing.push(`counterpart_schema:${artifactName}`);
      return;
    }
    if (!existsRelative(schemaBinding.schema_ref)) missing.push(`schema_ref:${schemaBinding.schema_ref}`);
  });
  return missing;
};

const buildCriterionSupportRefs = (definition, maps) => ({
  protocol_refs: definition.required_channels.map((channelId) => maps.protocols.get(channelId)?.protocol_id || null).filter(Boolean),
  contract_refs: definition.required_contracts,
  homologation_refs: definition.required_homologation_units,
  transition_refs: definition.required_transition_contracts,
  budget_refs: definition.required_budget_ids,
  schema_refs: definition.required_counterpart_artifacts
    .map((artifactName) => maps.counterpartSchemas.get(artifactName)?.schema_ref || null)
    .filter(Boolean)
});

export class ComparativeBurdenFulfillmentEvaluator {
  evaluate({ comparativeRuntimeBaseline, comparativeOperationalBaseline, finalInternalAudit, currentLineage }) {
    const maps = createRegistryMaps();
    const stage2BurdenStatuses = comparativeRuntimeBaseline.human_comparator_assessment?.burden_statuses || {};
    const pathwayStatuses = comparativeOperationalBaseline.human_channel_pathway_assessment?.pathway_statuses || [];
    const burdenPathwayMap = new Map(pathwayStatuses.map((entry) => [entry.channel_id, entry.status]));

    const burdenEntries = listComparatorBurdens()
      .filter((entry) => Object.prototype.hasOwnProperty.call(STAGE3_RELEVANT_BURDENS, entry.burden_id))
      .map((burden) => {
        const definition = STAGE3_RELEVANT_BURDENS[burden.burden_id];
        const stage2Status = stage2BurdenStatuses[burden.burden_id] || {};
        const stage2OpenBurden = resolveStage2OpenBurden(finalInternalAudit, burden.burden_id);
        const stage3InternalGaps = unique([
          ...checkProtocols(maps, definition.required_channels),
          ...checkContracts(maps, definition.required_contracts),
          ...checkHomologationUnits(maps, definition.required_homologation_units),
          ...checkTransitionContracts(maps, definition.required_transition_contracts),
          ...checkBudgets(maps, definition.required_budget_ids),
          ...checkCounterpartSchemas(maps, definition.required_counterpart_artifacts)
        ]);
        const fulfilledForStage3Opening = stage3InternalGaps.length === 0;
        return {
          burden_id: burden.burden_id,
          burden_description: burden.burden_description,
          stage2_m4_status: stage2Status.status || stage2OpenBurden?.stage2_status || 'unknown',
          stage2_m4_blocked_reason: stage2Status.blocked_reason || stage2OpenBurden?.blocked_reason || null,
          stage2_m4_open_state: Boolean(stage2OpenBurden),
          stage3_prerequisite: true,
          stage3_closure_classification: fulfilledForStage3Opening
            ? BURDEN_STATUS_CLASSIFICATIONS[burden.burden_id]
            : 'partially_closable_now',
          can_advance_without_fake_human_evidence: true,
          true_stage3_prerequisite: true,
          later_external_prerequisite: true,
          partial_internal_fulfillment_criteria: definition.partial_internal_fulfillment,
          full_internal_fulfillment_criteria: definition.full_internal_fulfillment,
          criterion_support_refs: buildCriterionSupportRefs(definition, maps),
          required_pathway_states: definition.required_channels.map((channelId) => ({
            channel_id: channelId,
            stage2m3_pathway_status: burdenPathwayMap.get(channelId) || 'not_declared',
            protocol_defined: maps.protocols.has(channelId)
          })),
          stage3_internal_gaps: stage3InternalGaps,
          stage3_fulfillment_state: fulfilledForStage3Opening
            ? 'fulfilled_for_stage3_opening_but_uninstantiated'
            : 'stage3_prerequisite_still_open',
          fulfillment_delta_vs_stage2_m4: fulfilledForStage3Opening
            ? 'advanced_from_stage2_open_burden_to_stage3_ready_but_uninstantiated'
            : 'no_material_stage3_fulfillment_delta',
          open_external_blockers: definition.later_external_blockers,
          remaining_non_stage3_blockers: definition.later_external_blockers,
          does_not_license: [...(burden.does_not_license || [])]
        };
      });

    const fulfilledBurdens = burdenEntries.filter(
      (entry) => entry.stage3_fulfillment_state === 'fulfilled_for_stage3_opening_but_uninstantiated'
    );
    const stillOpenBurdens = burdenEntries.filter(
      (entry) => entry.stage3_fulfillment_state !== 'fulfilled_for_stage3_opening_but_uninstantiated'
    );
    const allFulfilledForStage3Opening = stillOpenBurdens.length === 0;

    return {
      artifact_role: 'comparative_burden_fulfillment',
      artifact_name: 'comparative_burden_fulfillment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_readiness_fulfillment_implemented',
      burden_fulfillment_state: allFulfilledForStage3Opening
        ? 'burden_fulfillment_substantive_but_incomplete'
        : 'burden_fulfillment_partial',
      burdens: burdenEntries,
      burden_summary: {
        burden_count: burdenEntries.length,
        stage2_m4_open_burden_count: burdenEntries.filter((entry) => entry.stage2_m4_open_state).length,
        fulfilled_for_stage3_opening_count: fulfilledBurdens.length,
        still_open_for_stage3_count: stillOpenBurdens.length,
        classification_counts: countBy(burdenEntries, 'stage3_closure_classification'),
        fulfillment_state_counts: countBy(burdenEntries, 'stage3_fulfillment_state'),
        outstanding_stage3_burdens: stillOpenBurdens.map((entry) => entry.burden_id),
        continuing_external_blockers: unique(
          burdenEntries.flatMap((entry) => entry.open_external_blockers || [])
        )
      },
      warnings: [
        'comparative_burden_fulfillment_is_contractual_only',
        'all_fulfilled_burdens_remain_uninstantiated',
        'external_adjudication_remains_blocked',
        'no_human_evidence_was_fabricated'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS,
        stage3_structural_prerequisites_fulfilled: allFulfilledForStage3Opening
      },
      non_implications: [
        'Burden fulfillment is not human evidence.',
        'Burden fulfillment is not human equivalence.',
        'Burden fulfillment is not external adjudication.',
        'Burden fulfillment is not a transport-preservation verdict.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage2_m2_human_comparator_ref:
          'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
        stage2_m3_operational_readiness_ref:
          'artifacts/comparative_program/stage2m3/comparative_operational_readiness.json',
        stage2_m4_final_audit_ref:
          'artifacts/comparative_program/stage2m4/comparative_final_internal_audit.json',
        supporting_registry_hash: stableHash({
          protocols: listHumanChannelInstantiationProtocols(),
          schemas: listComparativeCounterpartSchemas(),
          budgets: listComparativeErrorBudgetBindings()
        }),
        current_lineage: currentLineage,
        local_path_leak_absent: !containsLocalPathLeak({ currentLineage })
      },
      schema_ref: 'src/comparative_program/schemas/comparative_burden_fulfillment.v1.json'
    };
  }
}

export const createComparativeBurdenFulfillmentEvaluator = () =>
  new ComparativeBurdenFulfillmentEvaluator();

export default {
  ComparativeBurdenFulfillmentEvaluator,
  createComparativeBurdenFulfillmentEvaluator
};
