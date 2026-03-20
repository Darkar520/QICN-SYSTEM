export const FEATURE_SELF_PATCH_EXPERIMENTAL = true;

export const DEFAULT_SELF_PATCH_POLICY = {
  enabled: FEATURE_SELF_PATCH_EXPERIMENTAL,
  environment: 'experimental',
  requiresHumanApproval: false,
  requiresSnapshot: false,
  allowedScopes: [
    ''
  ]
};

const normalizeScope = (scope) => String(scope || '').replace(/\\/g, '/');

export const canExecuteSelfPatch = ({
  featureFlag = FEATURE_SELF_PATCH_EXPERIMENTAL,
  environment = 'production',
  approved = false,
  hasSnapshot = false,
  scope = '',
  policy = DEFAULT_SELF_PATCH_POLICY
} = {}) => {
  if (!featureFlag || !policy.enabled) {
    return { allowed: false, reason: 'feature_flag_disabled' };
  }
  if (environment !== 'experimental') {
    return { allowed: false, reason: 'environment_not_experimental' };
  }
  if (policy.requiresHumanApproval && !approved) {
    return { allowed: false, reason: 'human_approval_required' };
  }
  if (policy.requiresSnapshot && !hasSnapshot) {
    return { allowed: false, reason: 'snapshot_required' };
  }

  const normalized = normalizeScope(scope);
  const withinAllowedScope = (policy.allowedScopes || []).some((prefix) =>
    normalized.startsWith(normalizeScope(prefix))
  );
  if (!withinAllowedScope) {
    return { allowed: false, reason: 'scope_not_whitelisted' };
  }

  return { allowed: true, reason: 'allowed' };
};

export default {
  FEATURE_SELF_PATCH_EXPERIMENTAL,
  DEFAULT_SELF_PATCH_POLICY,
  canExecuteSelfPatch
};
