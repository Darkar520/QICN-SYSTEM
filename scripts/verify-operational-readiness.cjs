const fs = require('fs');
const path = require('path');
const { verifyEnvironmentContract } = require('./verify-env-contract.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const REQUIRED_CANONICAL_SCRIPTS = [
  'build:js',
  'verify:env-contract',
  'verify:artifacts',
  'verify:policies',
  'verify:evaluation-protocol',
  'verify:evaluation-metrics',
  'verify:evaluation-comparisons',
  'verify:evaluation-phase',
  'verify:operational-readiness',
  'smoke:operational',
  'regression:minimal',
  'release:bundle',
  'aggregate:small-batch',
  'evaluate:protocolized',
  'evaluate:campaign'
];

const REQUIRED_DOCS = [
  'docs/REPRODUCIBILITY_CONTRACT.md',
  'docs/OPERATIONAL_READINESS.md',
  'docs/RELEASE_PROCESS.md',
  'docs/PROTOCOLIZED_EVALUATION_PROTOCOL.md',
  'docs/PROTOCOLIZED_EVALUATION_FREEZE_BASELINE.md',
  'docs/EVALUATION_COMPARISON_MATRIX.md',
  'docs/EVALUATION_METRICS_BASELINE.md',
  'docs/EVALUATION_CONTROLS_AND_INTERVENTIONS.md',
  'docs/EVALUATION_STATISTICAL_POLICY.md',
  'docs/EVALUATION_INTERPRETATION_BOUNDARY.md'
];

const REQUIRED_SCRIPTS = [
  'scripts/verify-env-contract.cjs',
  'scripts/verify-artifacts.cjs',
  'scripts/verify-evaluation-protocol.cjs',
  'scripts/verify-evaluation-metrics.cjs',
  'scripts/verify-evaluation-comparisons.cjs',
  'scripts/verify-operational-readiness.cjs',
  'scripts/run-operational-smoke-suite.cjs',
  'scripts/build-internal-release-bundle.cjs',
  'scripts/build-entropy-condition-metrics.cjs',
  'scripts/run-protocolized-evaluation.cjs',
  'scripts/run-execution-campaign.cjs',
  'scripts/evaluation-phase-common.cjs',
  'scripts/export-governed-output.cjs',
  'scripts/emit-controlled-statement.cjs',
  'scripts/build-local-governed-report.cjs'
];

const REQUIRED_ENTRYPOINTS = [
  'build.cjs',
  'scripts/run-episode.cjs',
  'scripts/evaluate-admissibility.cjs'
];

function verifyOperationalReadiness({
  projectRoot = PROJECT_ROOT,
  outputPath = path.join(projectRoot, 'artifacts', 'operational_readiness_manifest.json')
} = {}) {
  const packageJsonPath = path.join(projectRoot, 'package.json');
  const workflowPath = path.join(projectRoot, '.github', 'workflows', 'ci.yml');
  const packageJson = readJson(packageJsonPath);
  const scripts = packageJson.scripts || {};

  const envContract = verifyEnvironmentContract({
    projectRoot,
    outputPath: path.join(projectRoot, 'artifacts', 'operational_readiness', 'environment_contract_manifest.json')
  });

  const missingScripts = REQUIRED_CANONICAL_SCRIPTS.filter((name) => !Object.prototype.hasOwnProperty.call(scripts, name));
  const missingDocs = REQUIRED_DOCS.filter((relPath) => !fs.existsSync(path.join(projectRoot, relPath)));
  const missingScriptFiles = REQUIRED_SCRIPTS.filter((relPath) => !fs.existsSync(path.join(projectRoot, relPath)));
  const missingEntrypoints = REQUIRED_ENTRYPOINTS.filter((relPath) => !fs.existsSync(path.join(projectRoot, relPath)));
  const workflowPresent = fs.existsSync(workflowPath);
  const workflowContent = workflowPresent ? fs.readFileSync(workflowPath, 'utf8') : '';

  const manifest = {
    artifact_role: 'operational_readiness_manifest',
    project_root: '.',
    canonical_scripts: REQUIRED_CANONICAL_SCRIPTS,
    missing_canonical_scripts: missingScripts,
    docs_required: REQUIRED_DOCS,
    docs_missing: missingDocs,
    scripts_required: REQUIRED_SCRIPTS,
    scripts_missing: missingScriptFiles,
    entrypoints_required: REQUIRED_ENTRYPOINTS,
    entrypoints_missing: missingEntrypoints,
    environment_contract: {
      ok: envContract.ok,
      output: path.relative(projectRoot, envContract.outputPath)
    },
    workflow: {
      path: path.relative(projectRoot, workflowPath),
      present: workflowPresent,
      runs_on_node_22: /node-version:\s*["']?22(?:\.x)?["']?/i.test(workflowContent),
      verifies_operational_readiness: /npm run verify:operational-readiness/.test(workflowContent),
      runs_smoke_operational: /npm run smoke:operational/.test(workflowContent),
      covers_codex_branches: /codex\/\*\*/.test(workflowContent)
    },
    package_engines: packageJson.engines || null,
    interpretation_boundary: 'Operational readiness manifest only; not external validation, not framework confirmation, not claim closure.',
    non_claim_restrictions: [
      'CI green does not imply theoretical closure.',
      'Canonical commands do not imply external validation.',
      'Release readiness is an internal operational property only.'
    ]
  };

  const ok = envContract.ok
    && missingScripts.length === 0
    && missingDocs.length === 0
    && missingScriptFiles.length === 0
    && missingEntrypoints.length === 0
    && workflowPresent
    && manifest.workflow.runs_on_node_22
    && manifest.workflow.verifies_operational_readiness
    && manifest.workflow.runs_smoke_operational
    && manifest.workflow.covers_codex_branches
    && String(packageJson.engines?.node || '') === '22.x';

  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  return { ok, outputPath, manifest };
}

if (require.main === module) {
  try {
    const projectRoot = path.resolve(parseArg('project-root', PROJECT_ROOT));
    const outputPath = path.resolve(parseArg('output', path.join(projectRoot, 'artifacts', 'operational_readiness_manifest.json')));
    const result = verifyOperationalReadiness({ projectRoot, outputPath });
    if (!result.ok) {
      throw new Error(`Operational readiness verification failed. missingScripts=${result.manifest.missing_canonical_scripts.join(',') || 'none'} missingDocs=${result.manifest.docs_missing.join(',') || 'none'}`);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`FAIL verify-operational-readiness: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  verifyOperationalReadiness
};
