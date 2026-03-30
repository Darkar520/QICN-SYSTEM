import { listHumanChannelRequirements } from './HumanChannelRequirementsRegistry.js';

const deriveMachineArtifactAvailability = (bridgeBaseline) => ({
  'phenomenal_bridge_projection.json': Boolean(bridgeBaseline?.projection),
  'phenomenal_bridge_gate_result.json': Boolean(bridgeBaseline?.gate_result),
  'phenomenal_bridge_manifest.json': Boolean(bridgeBaseline?.manifest),
  'bridge_intervention_profile.json': Boolean(
    bridgeBaseline?.projection?.bridge_intervention_status_summary
  ),
  'bridge_reducibility_report.json': Boolean(
    bridgeBaseline?.projection?.bridge_reducibility_status_summary
  ),
  'cross_substrate_transport_assessment.json': false
});

const resolveChannelRuntimeState = ({ machineArtifactsAvailable, channel }) => {
  const machineReady = (channel.required_machine_artifact_family || []).every(
    (artifactName) => machineArtifactsAvailable[artifactName] === true
  );

  if (!machineReady) return 'structural_mapping_blocked';

  switch (channel.current_human_channel_state) {
    case 'blocked_by_missing_human_measurement_route':
      return 'human_channel_absent';
    case 'theoretically_specifiable_but_non_instantiated':
      return 'structurally_open_but_not_adjudicated';
    case 'transport_counterpart_not_instantiated':
      return 'transport_not_open';
    default:
      return 'comparator_underdefined';
  }
};

export class HumanChannelStatusEvaluator {
  evaluate({ bridgeBaseline }) {
    const machineArtifactsAvailable = deriveMachineArtifactAvailability(bridgeBaseline);
    const channelStatuses = listHumanChannelRequirements().map((channel) => {
      const runtime_state = resolveChannelRuntimeState({
        machineArtifactsAvailable,
        channel
      });

      return {
        channel_id: channel.channel_id,
        comparator_domain: channel.comparator_domain,
        required_human_measurement_class: channel.required_human_measurement_class,
        required_artifact_family: [...(channel.required_artifact_family || [])],
        minimum_symmetry_burden: [...(channel.minimum_symmetry_burden || [])],
        machine_artifact_availability: Object.fromEntries(
          (channel.required_machine_artifact_family || []).map((artifactName) => [
            artifactName,
            machineArtifactsAvailable[artifactName] === true ? 'available' : 'missing'
          ])
        ),
        human_channel_state: channel.current_human_channel_state,
        specifiability_status: channel.specifiability_status,
        runtime_state,
        blocked_state:
          runtime_state === 'human_channel_absent'
            ? channel.missing_channel_blocked_state
            : runtime_state === 'transport_not_open'
              ? 'transport_not_open'
              : null,
        forbidden_proxy_substitutions: [...(channel.forbidden_proxy_substitutions || [])],
        non_implications: [...(channel.non_implications || [])],
        status: channel.status
      };
    });

    return {
      channel_statuses: channelStatuses,
      machine_artifacts_available: machineArtifactsAvailable,
      summary: {
        human_channel_absent_count: channelStatuses.filter(
          (entry) => entry.runtime_state === 'human_channel_absent'
        ).length,
        structurally_open_but_not_adjudicated_count: channelStatuses.filter(
          (entry) => entry.runtime_state === 'structurally_open_but_not_adjudicated'
        ).length,
        transport_not_open_count: channelStatuses.filter(
          (entry) => entry.runtime_state === 'transport_not_open'
        ).length
      }
    };
  }
}

export const createHumanChannelStatusEvaluator = () => new HumanChannelStatusEvaluator();

export default {
  HumanChannelStatusEvaluator,
  createHumanChannelStatusEvaluator
};
