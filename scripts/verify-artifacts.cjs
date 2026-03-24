const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const RUN_REQUIRED = [
  'run_verdict.json',
  'run_metrics.json',
  'support_labels.json',
  'output_consumption_policy.json',
  'output_surface_policy.json',
  'controlled_statements.json'
];
const RUN_OPTIONAL = [
  'entropy_run_diagnostics.json',
  'entropy_preverdict.json'
];
const CONDITION_REQUIRED = [
  'condition_metrics_summary.json',
  'condition_comparison.json',
  'condition_support_labels.json',
  'condition_output_consumption_policy.json',
  'condition_output_surface_policy.json',
  'condition_controlled_statements.json'
];

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));
const hasText = (value) => typeof value === 'string' && value.trim().length > 0;
const hasArray = (value) => Array.isArray(value) && value.length > 0;
const getByPath = (value, pathExpression) => String(pathExpression || '')
  .split('.')
  .filter(Boolean)
  .reduce((acc, key) => (acc && acc[key] !== undefined ? acc[key] : undefined), value);

const detectScope = (artifactsRoot, requestedScope = 'auto') => {
  const normalized = String(requestedScope || 'auto').toLowerCase();
  if (normalized === 'run' || normalized === 'run_level') return 'run_level';
  if (normalized === 'condition' || normalized === 'small_batch') return 'small_batch';
  if (fs.existsSync(path.join(artifactsRoot, 'output_surface_policy.json'))) return 'run_level';
  if (fs.existsSync(path.join(artifactsRoot, 'condition_output_surface_policy.json'))) return 'small_batch';
  throw new Error(`Unable to detect artifact scope under ${artifactsRoot}`);
};

async function verifyArtifacts({
  artifactsRoot = path.join(PROJECT_ROOT, 'artifacts'),
  scope = 'auto',
  outputPath = null
} = {}) {
  const rootDir = path.resolve(artifactsRoot);
  const resolvedScope = detectScope(rootDir, scope);
  const requiredFiles = resolvedScope === 'run_level' ? RUN_REQUIRED : CONDITION_REQUIRED;
  const optionalFiles = resolvedScope === 'run_level' ? RUN_OPTIONAL : [];
  const surfacePolicyName = resolvedScope === 'run_level' ? 'output_surface_policy.json' : 'condition_output_surface_policy.json';
  const { assessOutputForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');

  const missingRequiredFiles = requiredFiles.filter((fileName) => !fs.existsSync(path.join(rootDir, fileName)));
  if (missingRequiredFiles.length > 0) {
    throw new Error(`Missing required artifacts: ${missingRequiredFiles.join(', ')}`);
  }

  const surfacePolicy = readJson(path.join(rootDir, surfacePolicyName));
  const governedOutputs = Array.isArray(surfacePolicy.governed_outputs) ? surfacePolicy.governed_outputs : [];

  const outputChecks = {};
  for (const artifactName of governedOutputs) {
    const artifactPath = path.join(rootDir, artifactName);
    const entry = surfacePolicy.outputs?.[artifactName] || {};
    const artifactPresent = fs.existsSync(artifactPath);
    const artifact = artifactPresent ? readJson(artifactPath) : null;
    const requiredRefs = Array.isArray(entry.required_refs) ? entry.required_refs : [];
    const requiredBoundaries = Array.isArray(entry.required_boundaries) ? entry.required_boundaries : [];
    const refsPresent = Object.fromEntries(requiredRefs.map((refKey) => [refKey, hasText(getByPath(artifact, refKey))]));
    const boundariesPresent = Object.fromEntries(requiredBoundaries.map((boundaryKey) => {
      const value = getByPath(artifact, boundaryKey);
      return [boundaryKey, hasText(value) || hasArray(value)];
    }));
    const localReportAssessment = assessOutputForSurface({
      rootDir,
      artifactName,
      surface: 'local_report_surface',
      scope: resolvedScope
    }).decision;

    outputChecks[artifactName] = {
      artifact_present: artifactPresent,
      required_refs: requiredRefs,
      refs_present: refsPresent,
      required_boundaries: requiredBoundaries,
      boundaries_present: boundariesPresent,
      local_report_decision: {
        allowed: localReportAssessment.allowed,
        reason_code: localReportAssessment.reason_code
      }
    };
  }

  const manifest = {
    artifact_role: 'artifact_manifest',
    scope: resolvedScope,
    artifacts_root: rootDir,
    required_files: requiredFiles,
    optional_files: optionalFiles,
    missing_required_files: missingRequiredFiles,
    missing_optional_files: optionalFiles.filter((fileName) => !fs.existsSync(path.join(rootDir, fileName))),
    governed_outputs: governedOutputs,
    output_checks: outputChecks,
    interpretation_boundary: 'Artifact manifest only; operational structure and refs, not claim support, not external validation.',
    non_claim_restrictions: [
      'Presence and refs do not imply theoretical closure.',
      'Governed artifacts remain policy-bound outputs, not truth claims.',
      'Local report accessibility does not imply claim-facing exportability.'
    ]
  };

  const resolvedOutputPath = path.resolve(outputPath || path.join(rootDir, 'artifact_manifest.json'));
  fs.mkdirSync(path.dirname(resolvedOutputPath), { recursive: true });
  fs.writeFileSync(resolvedOutputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const hasRefGap = Object.values(outputChecks).some((check) => Object.values(check.refs_present).some((present) => !present));
  const hasBoundaryGap = Object.values(outputChecks).some((check) => Object.values(check.boundaries_present).some((present) => !present));
  const ok = missingRequiredFiles.length === 0 && !hasRefGap && !hasBoundaryGap;

  return { ok, outputPath: resolvedOutputPath, manifest };
}

if (require.main === module) {
  (async () => {
    try {
      const artifactsRoot = path.resolve(parseArg('artifacts-root', process.argv[2] || path.join(PROJECT_ROOT, 'artifacts')));
      const scope = parseArg('scope', 'auto');
      const outputPath = parseArg('output', null);
      const result = await verifyArtifacts({ artifactsRoot, scope, outputPath });
      if (!result.ok) {
        throw new Error(`Artifact verification failed for ${result.manifest.scope}`);
      }
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      console.error(`FAIL verify-artifacts: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {
  verifyArtifacts
};
