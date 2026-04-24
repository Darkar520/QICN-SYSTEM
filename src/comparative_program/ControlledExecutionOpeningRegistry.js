import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const CONTROLLED_EXECUTION_OPENING_POLICY = Object.freeze(
  readJson('../../docs/controlled_execution_opening_policy.v1.json')
);
export const SESSION_ZERO_PROTOCOL = Object.freeze(
  readJson('../../docs/session_zero_protocol.v1.json')
);
export const PRE_COLLECTION_ADMISSIBILITY_GATE = Object.freeze(
  readJson('../../docs/pre_collection_admissibility_gate.v1.json')
);
export const CONTAMINATION_AND_ABORT_POLICY = Object.freeze(
  readJson('../../docs/contamination_and_abort_policy.v1.json')
);
export const LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY = Object.freeze(
  readJson('../../docs/live_but_unpopulated_artifact_policy.v1.json')
);
export const SESSION_ZERO_GATE_CRITERIA = Object.freeze(
  readJson('../../docs/session_zero_gate_criteria.v1.json')
);
export const SESSION_ZERO_OPERATOR_CHECKLIST = Object.freeze(
  readJson('../../docs/session_zero_operator_checklist.v1.json')
);
export const SESSION_ZERO_FAILURE_MODES = Object.freeze(
  readJson('../../docs/session_zero_failure_modes.v1.json')
);
export const SESSION_ZERO_RESET_POLICY = Object.freeze(
  readJson('../../docs/session_zero_reset_policy.v1.json')
);
export const PRE_COLLECTION_GATE_CRITERIA = Object.freeze(
  readJson('../../docs/pre_collection_gate_criteria.v1.json')
);
export const PRE_COLLECTION_INVALIDATION_POLICY = Object.freeze(
  readJson('../../docs/pre_collection_invalidation_policy.v1.json')
);
export const PRE_COLLECTION_CONTAMINATION_CHECKLIST = Object.freeze(
  readJson('../../docs/pre_collection_contamination_checklist.v1.json')
);
export const STAGE3_6_CONTROLLED_EXECUTION_OPENING_CRITERIA = Object.freeze(
  readJson('../../docs/stage3_6_controlled_execution_opening_criteria.v1.json')
);
export const FIRST_ADMISSIBLE_COLLECTION_UNLOCK_MAP = Object.freeze(
  readJson('../../docs/first_admissible_collection_unlock_map.v1.json')
);

export const listControlledExecutionStates = () => [
  ...(CONTROLLED_EXECUTION_OPENING_POLICY.controlled_execution_states || [])
];

export const listLiveArtifactRoles = () => [
  ...((LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY.live_artifact_families || []).map(
    (family) => family.artifact_role
  ))
];

export default {
  CONTROLLED_EXECUTION_OPENING_POLICY,
  SESSION_ZERO_PROTOCOL,
  PRE_COLLECTION_ADMISSIBILITY_GATE,
  CONTAMINATION_AND_ABORT_POLICY,
  LIVE_BUT_UNPOPULATED_ARTIFACT_POLICY,
  SESSION_ZERO_GATE_CRITERIA,
  SESSION_ZERO_OPERATOR_CHECKLIST,
  SESSION_ZERO_FAILURE_MODES,
  SESSION_ZERO_RESET_POLICY,
  PRE_COLLECTION_GATE_CRITERIA,
  PRE_COLLECTION_INVALIDATION_POLICY,
  PRE_COLLECTION_CONTAMINATION_CHECKLIST,
  STAGE3_6_CONTROLLED_EXECUTION_OPENING_CRITERIA,
  FIRST_ADMISSIBLE_COLLECTION_UNLOCK_MAP,
  listControlledExecutionStates,
  listLiveArtifactRoles
};
