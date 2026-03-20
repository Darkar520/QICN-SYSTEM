import {
  FEATURE_SELF_PATCH_EXPERIMENTAL,
  DEFAULT_SELF_PATCH_POLICY,
  canExecuteSelfPatch
} from './SelfPatchPolicy.js';

export class SelfPatchOrchestrator {
  constructor(policy = DEFAULT_SELF_PATCH_POLICY) {
    this.policy = { ...DEFAULT_SELF_PATCH_POLICY, ...policy };
    this.patchLedger = [];
  }

  evaluateRequest(request = {}) {
    const hasSnapshot =
      request.hasSnapshot !== undefined
        ? Boolean(request.hasSnapshot)
        : Boolean(request.snapshotId);
    const environment =
      request.environment ?? this.policy.environment;

    return canExecuteSelfPatch({
      featureFlag: request.featureFlag ?? FEATURE_SELF_PATCH_EXPERIMENTAL,
      environment,
      approved: Boolean(request.approved),
      hasSnapshot,
      scope: request.scope || '',
      policy: this.policy
    });
  }

  stagePatch(request = {}) {
    const decision = this.evaluateRequest(request);
    if (!decision.allowed) {
      return {
        ok: false,
        reason: decision.reason,
        staged: false,
        entry: null
      };
    }

    const scope = request.scope || '';
    const timestamp = Date.now();
    const entry = {
      id: `self-patch-${timestamp}-${Math.random().toString(36).slice(2, 8)}`,
      createdAt: timestamp,
      scope,
      description: request.description || '',
      snapshotId: request.snapshotId || null,
      status: 'staged'
    };

    this.patchLedger.push(entry);
    if (this.patchLedger.length > 100) {
      this.patchLedger = this.patchLedger.slice(-100);
    }
    return {
      ok: true,
      reason: decision.reason,
      staged: true,
      entry
    };
  }
}












