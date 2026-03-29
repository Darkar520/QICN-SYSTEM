import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

import { PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA } from './PhenomenalBridgeArtifactRegistry.js';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');

export const BRIDGE_SYSTEM_FILES = Object.freeze({
  protocol: 'docs/phenomenal_bridge_protocol.v1.json',
  thresholds: 'docs/phenomenal_bridge_thresholds.v1.json',
  rival_family: 'docs/phenomenal_bridge_rival_family.v1.json',
  surface_policy: 'docs/phenomenal_bridge_surface_policy.v1.json',
  artifact_schema: 'docs/phenomenal_bridge_artifact_schema.v1.json'
});

export const ROOT_BRIDGE_ARTIFACT_REFS = Object.freeze({
  projection: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_projection.json',
  gate_result: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_gate_result.json',
  manifest: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_manifest.json'
});

export const ECOSYSTEM_BRIDGE_ARTIFACT_REFS = Object.freeze({
  condition_summary: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_condition_summary.json',
  batch_summary: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_batch_summary.json',
  campaign_summary: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_campaign_summary.json',
  candidate_projection:
    'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_candidate_projection.json',
  audit_handoff_summary:
    'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_audit_handoff_summary.json',
  verification_matrix:
    'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_verification_matrix.json',
  final_internal_audit:
    'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_final_internal_audit.json',
  readiness_gate: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_readiness_gate.json'
});

const buildLocalPathPattern = () => {
  const windowsHome = String.raw`[A-Za-z]:\\Users\\`;
  const workspaceHints = [
    ['One', 'Drive'].join(''),
    ['Escri', 'torio'].join(''),
    ['TRADING', ' 3.0'].join(''),
    ['release_repo_', 'qicn_2026-03-01'].join(''),
    ['rigid-', 'identity-framework'].join('')
  ];
  return new RegExp([`\\/c:\\/`, windowsHome, ...workspaceHints].join('|'), 'i');
};

export const LOCAL_PATH_PATTERN = buildLocalPathPattern();

export const resolveReleaseRoot = () => {
  const envOverride = process.env.ECO_RELEASE_ROOT;
  if (envOverride) return path.resolve(envOverride);
  for (const candidate of ['QICN-RELEASE', 'QUICN-RELEASE', 'release_repo_qicn_2026-03-01']) {
    const target = path.join(WORKSPACE_ROOT, candidate);
    if (
      fs.existsSync(path.join(target, '.git'))
      || fs.existsSync(path.join(target, 'release', 'release_freeze_manifest.json'))
    ) {
      return target;
    }
  }
  return path.join(WORKSPACE_ROOT, 'release_repo_qicn_2026-03-01');
};

export const RELEASE_ROOT = resolveReleaseRoot();

export const ensureDir = (dirPath) => fs.mkdirSync(dirPath, { recursive: true });
export const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
export const readJsonRelative = (relativePath) => readJson(path.join(PROJECT_ROOT, relativePath));
export const writeJson = (filePath, payload) =>
  fs.writeFileSync(filePath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
export const stableHash = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
export const hashFile = (filePath) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
export const hashFileRelative = (relativePath) => hashFile(path.join(PROJECT_ROOT, relativePath));
export const normalizePath = (value) => String(value || '').replace(/\\/g, '/');
export const toProjectRelative = (absolutePath) =>
  normalizePath(path.relative(PROJECT_ROOT, absolutePath)) || '.';
export const clamp01 = (value) =>
  Math.min(1, Math.max(0, Number.isFinite(Number(value)) ? Number(value) : 0));
export const asNumber = (value, fallback = 0) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : fallback;
};
export const mean = (values) => {
  const filtered = (Array.isArray(values) ? values : []).filter((value) =>
    Number.isFinite(Number(value))
  );
  if (filtered.length === 0) return 0;
  return filtered.reduce((sum, value) => sum + Number(value), 0) / filtered.length;
};
export const geometricMean = (entries, weights) => {
  const weightKeys = Object.keys(weights || {});
  const normalizedWeightTotal = weightKeys.reduce(
    (sum, key) => sum + Math.max(0, asNumber(weights[key], 0)),
    0
  );
  const effectiveWeights =
    normalizedWeightTotal > 0
      ? Object.fromEntries(
          weightKeys.map((key) => [key, Math.max(0, asNumber(weights[key], 0)) / normalizedWeightTotal])
        )
      : Object.fromEntries(weightKeys.map((key) => [key, 1 / Math.max(1, weightKeys.length)]));

  const logSum = weightKeys.reduce((sum, key) => {
    const score = Math.max(clamp01(entries?.[key]), 1e-6);
    return sum + effectiveWeights[key] * Math.log(score);
  }, 0);
  return clamp01(Math.exp(logSum));
};

const git = (cwd, args) => {
  try {
    return cp.execFileSync('git', args, { cwd, encoding: 'utf8' }).trim();
  } catch {
    return null;
  }
};

const resolveGitDir = (repoRoot) => {
  const dotGitPath = path.join(repoRoot, '.git');
  if (fs.existsSync(dotGitPath) && fs.statSync(dotGitPath).isDirectory()) return dotGitPath;
  if (fs.existsSync(dotGitPath) && fs.statSync(dotGitPath).isFile()) {
    const contents = fs.readFileSync(dotGitPath, 'utf8');
    const match = contents.match(/^gitdir:\s*(.+)\s*$/im);
    if (match) return path.resolve(repoRoot, match[1].trim());
  }
  return null;
};

const readLooseGitRef = (gitDir, refName) => {
  const refPath = path.join(gitDir, ...refName.split('/'));
  if (fs.existsSync(refPath)) return fs.readFileSync(refPath, 'utf8').trim();
  const packedRefsPath = path.join(gitDir, 'packed-refs');
  if (!fs.existsSync(packedRefsPath)) return null;
  const lines = fs.readFileSync(packedRefsPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#') || line.startsWith('^')) continue;
    const [sha, ref] = line.split(' ');
    if (ref === refName) return sha;
  }
  return null;
};

const readGitHeadState = (repoRoot) => {
  const gitDir = resolveGitDir(repoRoot);
  if (!gitDir) return null;
  const headPath = path.join(gitDir, 'HEAD');
  if (!fs.existsSync(headPath)) return null;
  const headContents = fs.readFileSync(headPath, 'utf8').trim();
  if (headContents.startsWith('ref: ')) {
    const refName = headContents.slice(5).trim();
    return {
      branch: refName.replace(/^refs\/heads\//, ''),
      head: readLooseGitRef(gitDir, refName) || 'unknown_commit',
      upstream: null
    };
  }
  return {
    branch: 'detached_head',
    head: headContents || 'unknown_commit',
    upstream: null
  };
};

export const getRepoState = (repoRoot) => {
  const branch = git(repoRoot, ['rev-parse', '--abbrev-ref', 'HEAD']);
  const head = git(repoRoot, ['rev-parse', 'HEAD']);
  const upstream = git(repoRoot, ['rev-parse', '--abbrev-ref', '--symbolic-full-name', '@{u}']);
  if (branch && head) {
    return { branch, head, upstream };
  }
  return (
    readGitHeadState(repoRoot) || {
      branch: 'unknown_branch',
      head: 'unknown_commit',
      upstream: null
    }
  );
};

export const buildRootSchemaHashes = () =>
  Object.fromEntries(
    Object.entries(PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.root_schema_refs || {}).map(
      ([artifactName, ref]) => [
        artifactName,
        {
          ref,
          sha256: ref ? hashFileRelative(ref) : null
        }
      ]
    )
  );

export const captureBridgeLineage = ({
  layerVersion,
  estimatorVersion,
  extraRefs = {}
}) => ({
  layer_version: layerVersion,
  estimator_version: estimatorVersion,
  protocol: {
    ref: BRIDGE_SYSTEM_FILES.protocol,
    sha256: hashFileRelative(BRIDGE_SYSTEM_FILES.protocol)
  },
  thresholds: {
    ref: BRIDGE_SYSTEM_FILES.thresholds,
    sha256: hashFileRelative(BRIDGE_SYSTEM_FILES.thresholds)
  },
  rival_family: {
    ref: BRIDGE_SYSTEM_FILES.rival_family,
    sha256: hashFileRelative(BRIDGE_SYSTEM_FILES.rival_family)
  },
  surface_policy: {
    ref: BRIDGE_SYSTEM_FILES.surface_policy,
    sha256: hashFileRelative(BRIDGE_SYSTEM_FILES.surface_policy)
  },
  artifact_schema: {
    ref: BRIDGE_SYSTEM_FILES.artifact_schema,
    sha256: hashFileRelative(BRIDGE_SYSTEM_FILES.artifact_schema)
  },
  root_schema_hashes: buildRootSchemaHashes(),
  qicn_system: getRepoState(PROJECT_ROOT),
  qicn_release: getRepoState(RELEASE_ROOT),
  ...extraRefs
});

const normalizeText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

export const compareLineage = (expectedLineage, currentLineage) => {
  const mismatches = [];
  if (!expectedLineage) {
    return {
      expected_lineage: null,
      current_lineage: currentLineage,
      mismatch_reasons: mismatches,
      invalidated: false
    };
  }

  const compareHash = (expectedNode, currentNode, label) => {
    if (!expectedNode || !currentNode) {
      mismatches.push(`${label}:missing_lineage_node`);
      return;
    }
    if (normalizeText(expectedNode.ref) !== normalizeText(currentNode.ref)) {
      mismatches.push(`${label}:ref_mismatch`);
    }
    if (normalizeText(expectedNode.sha256) !== normalizeText(currentNode.sha256)) {
      mismatches.push(`${label}:hash_mismatch`);
    }
  };

  if (expectedLineage.layer_version !== currentLineage.layer_version) {
    mismatches.push('layer_version_mismatch');
  }
  if (expectedLineage.estimator_version !== currentLineage.estimator_version) {
    mismatches.push('estimator_version_mismatch');
  }

  compareHash(expectedLineage.protocol, currentLineage.protocol, 'protocol');
  compareHash(expectedLineage.thresholds, currentLineage.thresholds, 'thresholds');
  compareHash(expectedLineage.rival_family, currentLineage.rival_family, 'rival_family');
  compareHash(expectedLineage.surface_policy, currentLineage.surface_policy, 'surface_policy');
  compareHash(expectedLineage.artifact_schema, currentLineage.artifact_schema, 'artifact_schema');

  for (const artifactName of Object.keys(currentLineage.root_schema_hashes || {})) {
    compareHash(
      expectedLineage.root_schema_hashes?.[artifactName],
      currentLineage.root_schema_hashes?.[artifactName],
      `root_schema:${artifactName}`
    );
  }

  return {
    expected_lineage: expectedLineage,
    current_lineage: currentLineage,
    mismatch_reasons: mismatches,
    invalidated: mismatches.length > 0
  };
};

export const compareCoordinateDrift = (expectedValues, currentValues, driftTolerances) => {
  const exceeded = [];
  if (!expectedValues) {
    return { compared: false, exceeded, invalidated: false };
  }

  for (const [coordinateId, currentValueRaw] of Object.entries(currentValues || {})) {
    const expectedValue = asNumber(expectedValues?.[coordinateId], NaN);
    const currentValue = asNumber(currentValueRaw, NaN);
    const tolerance = asNumber(driftTolerances?.[coordinateId], 0);
    if (!Number.isFinite(expectedValue) || !Number.isFinite(currentValue)) continue;
    const absoluteDelta = Math.abs(currentValue - expectedValue);
    if (absoluteDelta > tolerance) {
      exceeded.push({
        coordinate_id: coordinateId,
        expected: expectedValue,
        current: currentValue,
        tolerance,
        absolute_delta: Number(absoluteDelta.toFixed(12))
      });
    }
  }

  return {
    compared: true,
    exceeded,
    invalidated: exceeded.length > 0
  };
};

export const sanitizeLocalReference = (value, parentKey = '') => {
  if (typeof value !== 'string') return value;
  if (!LOCAL_PATH_PATTERN.test(value)) return value;
  if (parentKey === 'source_path') return 'formal_source_reference_redacted';
  return '[local-path-redacted]';
};

export const sanitizeBundleValue = (value, parentKey = '') => {
  if (Array.isArray(value)) return value.map((entry) => sanitizeBundleValue(entry, parentKey));
  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, entry]) => [key, sanitizeBundleValue(entry, key)])
    );
  }
  return sanitizeLocalReference(value, parentKey);
};

export const checkSurfaceEligibility = (surfacePolicy, artifactNames, surfaceName) => {
  const failures = [];
  for (const artifactName of artifactNames) {
    const spec = surfacePolicy.outputs?.[artifactName];
    if (!spec) {
      failures.push(`${artifactName}:missing_surface_policy`);
      continue;
    }
    if (!(spec.allowed_surfaces || []).includes(surfaceName)) {
      failures.push(`${artifactName}:not_allowed_on_${surfaceName}`);
    }
    if (!(spec.blocked_surfaces || []).includes('controlled_statement_surface')) {
      failures.push(`${artifactName}:controlled_statement_not_blocked`);
    }
    if (!(spec.blocked_surfaces || []).includes('external_claim_facing_surface')) {
      failures.push(`${artifactName}:external_claim_surface_not_blocked`);
    }
  }
  return { pass: failures.length === 0, failures };
};

export const containsLocalPathLeak = (value) =>
  LOCAL_PATH_PATTERN.test(JSON.stringify(value));
