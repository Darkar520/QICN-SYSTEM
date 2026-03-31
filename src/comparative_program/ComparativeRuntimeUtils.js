import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import cp from 'child_process';
import { fileURLToPath } from 'url';

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
export const PROJECT_ROOT = path.resolve(MODULE_DIR, '..', '..');
const WORKSPACE_ROOT = path.resolve(PROJECT_ROOT, '..');

export const COMPARATIVE_SYSTEM_FILES = Object.freeze({
  comparator_protocol: 'docs/human_comparator_protocol.v1.json',
  equivalence_ladder: 'docs/human_equivalence_ladder.v1.json',
  transport_protocol: 'docs/cross_substrate_transport_protocol.v1.json',
  human_channel_requirements: 'docs/human_channel_requirements.v1.json',
  burden_matrix: 'docs/comparator_burden_matrix.v1.json',
  artifact_schema: 'docs/comparative_program_artifact_schema.v1.json',
  surface_policy: 'docs/comparative_program_surface_policy.v1.json'
});

export const COMPARATIVE_OPERATIONAL_SYSTEM_FILES = Object.freeze({
  human_channel_pathways: 'docs/human_channel_pathways.v1.json',
  counterpart_artifact_contracts: 'docs/counterpart_artifact_contracts.v1.json',
  homologation_contracts: 'docs/homologation_contracts.v1.json',
  cross_substrate_transition_contracts: 'docs/cross_substrate_transition_contracts.v1.json'
});

export const COMPARATIVE_CLOSURE_SYSTEM_FILES = Object.freeze({
  external_adjudication_opening_criteria:
    'docs/external_adjudication_opening_criteria.v1.json'
});

export const ROOT_BRIDGE_ARTIFACT_REFS = Object.freeze({
  projection: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_projection.json',
  gate_result: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_gate_result.json',
  manifest: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_manifest.json',
  final_internal_audit:
    'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_final_internal_audit.json',
  readiness_gate: 'artifacts/phenomenal_bridge/bpfm3/phenomenal_bridge_readiness_gate.json'
});

export const COMPARATIVE_RUNTIME_ARTIFACT_REFS = Object.freeze({
  manifest: 'artifacts/comparative_program/stage2m2/comparative_program_manifest.json',
  human_comparator_assessment:
    'artifacts/comparative_program/stage2m2/human_comparator_assessment.json',
  human_equivalence_assessment:
    'artifacts/comparative_program/stage2m2/human_equivalence_assessment.json',
  cross_substrate_transport_assessment:
    'artifacts/comparative_program/stage2m2/cross_substrate_transport_assessment.json',
  verification_matrix:
    'artifacts/comparative_program/stage2m2/comparative_program_verification_matrix.json',
  readiness_gate:
    'artifacts/comparative_program/stage2m2/comparative_program_readiness_gate.json'
});

export const COMPARATIVE_OPERATIONAL_ARTIFACT_REFS = Object.freeze({
  human_channel_pathway_assessment:
    'artifacts/comparative_program/stage2m3/human_channel_pathway_assessment.json',
  counterpart_artifact_contract_assessment:
    'artifacts/comparative_program/stage2m3/counterpart_artifact_contract_assessment.json',
  homologation_contract_assessment:
    'artifacts/comparative_program/stage2m3/homologation_contract_assessment.json',
  cross_substrate_transition_contract_assessment:
    'artifacts/comparative_program/stage2m3/cross_substrate_transition_contract_assessment.json',
  comparative_operational_readiness:
    'artifacts/comparative_program/stage2m3/comparative_operational_readiness.json',
  manifest: 'artifacts/comparative_program/stage2m3/comparative_program_manifest.json',
  verification_matrix:
    'artifacts/comparative_program/stage2m3/comparative_program_verification_matrix.json',
  readiness_gate:
    'artifacts/comparative_program/stage2m3/comparative_program_readiness_gate.json'
});

export const COMPARATIVE_CLOSURE_ARTIFACT_REFS = Object.freeze({
  comparative_final_internal_audit:
    'artifacts/comparative_program/stage2m4/comparative_final_internal_audit.json',
  human_channel_instantiation_readiness:
    'artifacts/comparative_program/stage2m4/human_channel_instantiation_readiness.json',
  paper10_comparative_readiness_gate:
    'artifacts/comparative_program/stage2m4/paper10_comparative_readiness_gate.json',
  manifest: 'artifacts/comparative_program/stage2m4/comparative_program_manifest.json',
  verification_matrix:
    'artifacts/comparative_program/stage2m4/comparative_program_verification_matrix.json',
  readiness_gate:
    'artifacts/comparative_program/stage2m4/comparative_program_readiness_gate.json'
});

const buildLocalPathPattern = () => {
  const windowsHome = String.raw`[A-Za-z]:\\Users\\`;
  const workspaceHints = [
    'OneDrive',
    'Escritorio',
    'TRADING 3.0',
    'Sistema Canon Sandbox',
    'rigid-identity-framework'
  ];
  return new RegExp([`\\/c:\\/`, windowsHome, ...workspaceHints].join('|'), 'i');
};

export const LOCAL_PATH_PATTERN = buildLocalPathPattern();

const resolveReleaseRoot = () => {
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
export const hashFile = (filePath) =>
  crypto.createHash('sha256').update(fs.readFileSync(filePath)).digest('hex');
export const hashFileRelative = (relativePath) => hashFile(path.join(PROJECT_ROOT, relativePath));
export const normalizePath = (value) => String(value || '').replace(/\\/g, '/');
export const toProjectRelative = (absolutePath) =>
  normalizePath(path.relative(PROJECT_ROOT, absolutePath)) || '.';
export const stableHash = (value) =>
  crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');

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
  for (const line of fs.readFileSync(packedRefsPath, 'utf8').split(/\r?\n/)) {
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
  if (branch && head) return { branch, head, upstream };
  return (
    readGitHeadState(repoRoot) || {
      branch: 'unknown_branch',
      head: 'unknown_commit',
      upstream: null
    }
  );
};

export const buildComparativeRootSchemaHashes = () => {
  const registry = readJsonRelative(COMPARATIVE_SYSTEM_FILES.artifact_schema);
  return Object.fromEntries(
    Object.entries(registry.root_schema_refs || {}).map(([artifactName, ref]) => [
      artifactName,
      {
        ref,
        sha256: ref ? hashFileRelative(ref) : null
      }
    ])
  );
};

export const captureComparativeLineage = ({ layerVersion, estimatorVersion, extraRefs = {} }) => ({
  layer_version: layerVersion,
  estimator_version: estimatorVersion,
  comparator_protocol: {
    ref: COMPARATIVE_SYSTEM_FILES.comparator_protocol,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.comparator_protocol)
  },
  equivalence_ladder: {
    ref: COMPARATIVE_SYSTEM_FILES.equivalence_ladder,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.equivalence_ladder)
  },
  transport_protocol: {
    ref: COMPARATIVE_SYSTEM_FILES.transport_protocol,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.transport_protocol)
  },
  human_channel_requirements: {
    ref: COMPARATIVE_SYSTEM_FILES.human_channel_requirements,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.human_channel_requirements)
  },
  burden_matrix: {
    ref: COMPARATIVE_SYSTEM_FILES.burden_matrix,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.burden_matrix)
  },
  artifact_schema: {
    ref: COMPARATIVE_SYSTEM_FILES.artifact_schema,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.artifact_schema)
  },
  surface_policy: {
    ref: COMPARATIVE_SYSTEM_FILES.surface_policy,
    sha256: hashFileRelative(COMPARATIVE_SYSTEM_FILES.surface_policy)
  },
  root_schema_hashes: buildComparativeRootSchemaHashes(),
  qicn_system: getRepoState(PROJECT_ROOT),
  qicn_release: getRepoState(RELEASE_ROOT),
  ...extraRefs
});

export const containsLocalPathLeak = (value) =>
  LOCAL_PATH_PATTERN.test(JSON.stringify(value));

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

export const loadBridgeComparativeBaseline = () => ({
  projection: readJsonRelative(ROOT_BRIDGE_ARTIFACT_REFS.projection),
  gate_result: readJsonRelative(ROOT_BRIDGE_ARTIFACT_REFS.gate_result),
  manifest: readJsonRelative(ROOT_BRIDGE_ARTIFACT_REFS.manifest),
  final_internal_audit: readJsonRelative(ROOT_BRIDGE_ARTIFACT_REFS.final_internal_audit),
  readiness_gate: readJsonRelative(ROOT_BRIDGE_ARTIFACT_REFS.readiness_gate)
});

export const loadComparativeRuntimeBaseline = () => ({
  human_comparator_assessment: readJsonRelative(
    COMPARATIVE_RUNTIME_ARTIFACT_REFS.human_comparator_assessment
  ),
  human_equivalence_assessment: readJsonRelative(
    COMPARATIVE_RUNTIME_ARTIFACT_REFS.human_equivalence_assessment
  ),
  cross_substrate_transport_assessment: readJsonRelative(
    COMPARATIVE_RUNTIME_ARTIFACT_REFS.cross_substrate_transport_assessment
  ),
  comparative_program_manifest: readJsonRelative(COMPARATIVE_RUNTIME_ARTIFACT_REFS.manifest),
  comparative_program_verification_matrix: readJsonRelative(
    COMPARATIVE_RUNTIME_ARTIFACT_REFS.verification_matrix
  ),
  comparative_program_readiness_gate: readJsonRelative(
    COMPARATIVE_RUNTIME_ARTIFACT_REFS.readiness_gate
  )
});

export const loadComparativeOperationalBaseline = () => ({
  human_channel_pathway_assessment: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.human_channel_pathway_assessment
  ),
  counterpart_artifact_contract_assessment: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.counterpart_artifact_contract_assessment
  ),
  homologation_contract_assessment: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.homologation_contract_assessment
  ),
  cross_substrate_transition_contract_assessment: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.cross_substrate_transition_contract_assessment
  ),
  comparative_operational_readiness: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.comparative_operational_readiness
  ),
  comparative_program_manifest: readJsonRelative(COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.manifest),
  comparative_program_verification_matrix: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.verification_matrix
  ),
  comparative_program_readiness_gate: readJsonRelative(
    COMPARATIVE_OPERATIONAL_ARTIFACT_REFS.readiness_gate
  )
});

export const deriveComparativeMachineArtifactAvailability = ({
  bridgeBaseline,
  comparativeRuntimeBaseline
}) => ({
  'phenomenal_bridge_projection.json': Boolean(bridgeBaseline?.projection),
  'phenomenal_bridge_gate_result.json': Boolean(bridgeBaseline?.gate_result),
  'phenomenal_bridge_manifest.json': Boolean(bridgeBaseline?.manifest),
  'bridge_intervention_profile.json': Boolean(
    bridgeBaseline?.projection?.bridge_intervention_status_summary
  ),
  'bridge_reducibility_report.json': Boolean(
    bridgeBaseline?.projection?.bridge_reducibility_status_summary
  ),
  'human_comparator_assessment.json': Boolean(
    comparativeRuntimeBaseline?.human_comparator_assessment
  ),
  'human_equivalence_assessment.json': Boolean(
    comparativeRuntimeBaseline?.human_equivalence_assessment
  ),
  'cross_substrate_transport_assessment.json': Boolean(
    comparativeRuntimeBaseline?.cross_substrate_transport_assessment
  ),
  'comparative_program_manifest.json': Boolean(
    comparativeRuntimeBaseline?.comparative_program_manifest
  ),
  'comparative_program_readiness_gate.json': Boolean(
    comparativeRuntimeBaseline?.comparative_program_readiness_gate
  )
});

export default {
  COMPARATIVE_SYSTEM_FILES,
  COMPARATIVE_OPERATIONAL_SYSTEM_FILES,
  COMPARATIVE_CLOSURE_SYSTEM_FILES,
  ROOT_BRIDGE_ARTIFACT_REFS,
  COMPARATIVE_RUNTIME_ARTIFACT_REFS,
  COMPARATIVE_OPERATIONAL_ARTIFACT_REFS,
  COMPARATIVE_CLOSURE_ARTIFACT_REFS,
  PROJECT_ROOT,
  RELEASE_ROOT,
  ensureDir,
  readJson,
  readJsonRelative,
  writeJson,
  hashFileRelative,
  normalizePath,
  toProjectRelative,
  stableHash,
  getRepoState,
  buildComparativeRootSchemaHashes,
  captureComparativeLineage,
  containsLocalPathLeak,
  checkSurfaceEligibility,
  loadBridgeComparativeBaseline,
  loadComparativeRuntimeBaseline,
  loadComparativeOperationalBaseline,
  deriveComparativeMachineArtifactAvailability
};
