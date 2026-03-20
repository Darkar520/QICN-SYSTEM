import policyJson from './load-selfpatch-policy.js';

const normalizePath = (input = '') => String(input).replace(/\\/g, '/').replace(/^\/+/, '');

const startsWithAny = (value, prefixes = []) => prefixes.some((prefix) => value.startsWith(normalizePath(prefix)));

export const isProtectedPath = (filePath, policy = policyJson) => {
  const normalized = normalizePath(filePath);
  return (policy?.protectedPaths || []).some((protectedPath) => normalized === normalizePath(protectedPath));
};

export const classifyPatchRisk = ({
  targetFiles = [],
  totalChangedLines = 0
} = {}, policy = policyJson) => {
  if (String(policy?.mode || '').toLowerCase() === 'sandbox_unrestricted') {
    return {
      riskLevel: 'low',
      allowed: true,
      reasons: ['sandbox_unrestricted_mode']
    };
  }

  const files = Array.isArray(targetFiles) ? targetFiles.map((path) => normalizePath(path)) : [];
  const reasons = [];
  if (files.length === 0) {
    return { riskLevel: 'high', allowed: false, reasons: ['no_target_files'] };
  }

  if (files.some((filePath) => isProtectedPath(filePath, policy))) {
    reasons.push('protected_path_touched');
    return { riskLevel: 'high', allowed: false, reasons };
  }

  const lineCount = Math.max(0, Number(totalChangedLines) || 0);
  const inLowScopes = files.every((filePath) => startsWithAny(filePath, policy?.lowAutoScopes || []));
  const inMediumScopes = files.every((filePath) => startsWithAny(filePath, [
    ...(policy?.lowAutoScopes || []),
    ...(policy?.mediumManualScopes || [])
  ]));

  if (!inMediumScopes) {
    reasons.push('out_of_allowed_scopes');
    return { riskLevel: 'high', allowed: false, reasons };
  }

  if (lineCount > 180) {
    reasons.push('diff_too_large');
    return { riskLevel: 'high', allowed: false, reasons };
  }

  if (!inLowScopes || lineCount > 80) {
    reasons.push(!inLowScopes ? 'touches_medium_scope' : 'large_diff_medium');
    return { riskLevel: 'medium', allowed: true, reasons };
  }

  reasons.push('within_low_scope');
  return { riskLevel: 'low', allowed: true, reasons };
};

export default {
  normalizePath,
  isProtectedPath,
  classifyPatchRisk
};
