const fs = require('fs');
const path = require('path');
const { verifyOperationalReadiness } = require('./verify-operational-readiness.cjs');
const { verifyArtifacts } = require('./verify-artifacts.cjs');

const PROJECT_ROOT = path.resolve(__dirname, '..');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const resolveGitDir = (projectRoot) => {
  const dotGitPath = path.join(projectRoot, '.git');
  if (fs.statSync(dotGitPath).isDirectory()) return dotGitPath;
  const raw = fs.readFileSync(dotGitPath, 'utf8').trim();
  const match = raw.match(/^gitdir:\s*(.+)$/i);
  if (!match) throw new Error(`Unable to resolve gitdir from ${dotGitPath}`);
  return path.resolve(projectRoot, match[1].trim());
};

const readFileIfExists = (filePath) => (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8').trim() : null);

const getGitMetadata = (projectRoot) => {
  try {
    const gitDir = resolveGitDir(projectRoot);
    const head = readFileIfExists(path.join(gitDir, 'HEAD'));
    if (!head) {
      return { branch: 'unknown_branch', commit: 'unknown_commit' };
    }
    if (head.startsWith('ref: ')) {
      const refPath = head.slice(5).trim();
      const branch = refPath.replace(/^refs\/heads\//, '') || 'unknown_branch';
      const looseRef = readFileIfExists(path.join(gitDir, refPath));
      if (looseRef) {
        return { branch, commit: looseRef };
      }
      const packedRefs = readFileIfExists(path.join(gitDir, 'packed-refs')) || '';
      const packedMatch = packedRefs.split(/\r?\n/).find((line) => line.endsWith(` ${refPath}`));
      return {
        branch,
        commit: packedMatch ? packedMatch.split(' ')[0] : 'unknown_commit'
      };
    }
    return { branch: 'detached_head', commit: head };
  } catch (_error) {
    return { branch: 'unknown_branch', commit: 'unknown_commit' };
  }
};

async function buildInternalReleaseBundle({
  projectRoot = PROJECT_ROOT,
  artifactsRoot = path.join(PROJECT_ROOT, 'artifacts'),
  outputDir = null
} = {}) {
  const repoRoot = path.resolve(projectRoot);
  const sourceArtifactsRoot = path.resolve(artifactsRoot);
  const bundleId = `internal_release_${new Date().toISOString().replace(/[:.]/g, '-')}`;
  const bundleRoot = path.resolve(outputDir || path.join(sourceArtifactsRoot, 'internal_release', bundleId));
  const exportsDir = path.join(bundleRoot, 'exports');
  const docsDir = path.join(bundleRoot, 'docs');

  fs.mkdirSync(exportsDir, { recursive: true });
  fs.mkdirSync(docsDir, { recursive: true });
  const toBundleRelative = (targetPath) => path.relative(bundleRoot, targetPath).replace(/\\/g, '/') || '.';
  const toRepoRelative = (targetPath) => path.relative(repoRoot, targetPath).replace(/\\/g, '/') || '.';

  const readiness = verifyOperationalReadiness({
    projectRoot: repoRoot,
    outputPath: path.join(bundleRoot, 'operational_readiness_manifest.json')
  });
  if (!readiness.ok) {
    throw new Error('Operational readiness verification failed before bundle build.');
  }

  const artifactVerification = await verifyArtifacts({
    artifactsRoot: sourceArtifactsRoot,
    scope: 'small_batch',
    outputPath: path.join(bundleRoot, 'artifact_manifest.json')
  });
  if (!artifactVerification.ok) {
    throw new Error('Artifact verification failed before bundle build.');
  }

  const { exportOutputForSurface, buildLocalReportForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');

  const summaryExport = exportOutputForSurface({
    rootDir: sourceArtifactsRoot,
    artifactName: 'condition_metrics_summary.json',
    surface: 'descriptive_export_surface',
    scope: 'small_batch',
    outputDir: exportsDir
  });

  const supportExport = exportOutputForSurface({
    rootDir: sourceArtifactsRoot,
    artifactName: 'condition_support_labels.json',
    surface: 'local_report_surface',
    scope: 'small_batch',
    outputDir: exportsDir
  });

  const comparisonExport = exportOutputForSurface({
    rootDir: sourceArtifactsRoot,
    artifactName: 'condition_comparison.json',
    surface: 'descriptive_export_surface',
    scope: 'small_batch',
    outputDir: exportsDir
  });

  const localReport = buildLocalReportForSurface({
    rootDir: sourceArtifactsRoot,
    scope: 'small_batch',
    outputPath: path.join(bundleRoot, 'condition_local_report.json')
  });

  const governanceFiles = [
    'condition_output_consumption_policy.json',
    'condition_output_surface_policy.json',
    'condition_controlled_statements.json'
  ];
  for (const fileName of governanceFiles) {
    fs.copyFileSync(path.join(sourceArtifactsRoot, fileName), path.join(bundleRoot, fileName));
  }

  const docsToCopy = [
    'docs/REPRODUCIBILITY_CONTRACT.md',
    'docs/OPERATIONAL_READINESS.md',
    'docs/RELEASE_PROCESS.md'
  ];
  for (const relPath of docsToCopy) {
    fs.copyFileSync(path.join(repoRoot, relPath), path.join(docsDir, path.basename(relPath)));
  }

  const manifest = {
    artifact_role: 'release_bundle_manifest',
    bundle_id: bundleId,
    bundle_root: '.',
    source_artifacts_root: toRepoRelative(sourceArtifactsRoot),
    git: getGitMetadata(repoRoot),
    included_outputs: [
      summaryExport.ok ? { artifact: 'condition_metrics_summary.json', path: toBundleRelative(summaryExport.outputPath), mode: 'descriptive_export_surface' } : null,
      supportExport.ok ? { artifact: 'condition_support_labels.json', path: toBundleRelative(supportExport.outputPath), mode: 'local_report_surface' } : null,
      { artifact: 'condition_local_report.json', path: toBundleRelative(localReport.outputPath), mode: 'local_report_surface' },
      ...governanceFiles.map((fileName) => ({ artifact: fileName, path: toBundleRelative(path.join(bundleRoot, fileName)), mode: 'governance_metadata' }))
    ].filter(Boolean),
    excluded_outputs: [
      comparisonExport.ok ? null : {
        artifact: 'condition_comparison.json',
        reason_code: comparisonExport.decision.reason_code,
        decision_path: toBundleRelative(comparisonExport.decisionPath)
      }
    ].filter(Boolean),
    copied_docs: docsToCopy.map((relPath) => `docs/${path.basename(relPath)}`),
    readiness_manifest: 'operational_readiness_manifest.json',
    artifact_manifest: 'artifact_manifest.json',
    interpretation_boundary: 'Internal release bundle only; bounded local descriptive package, not public claim-safe release, not external validation, not scientific closure.',
    non_claim_restrictions: [
      'Do not treat this bundle as external validation.',
      'Do not treat this bundle as theory confirmation.',
      'Do not promote excluded outputs into claim-facing material.',
      'This bundle is internal operational packaging only.'
    ]
  };

  const manifestPath = path.join(bundleRoot, 'release_bundle_manifest.json');
  fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  return {
    ok: true,
    bundleRoot,
    manifestPath,
    manifest
  };
}

if (require.main === module) {
  (async () => {
    try {
      const projectRoot = path.resolve(parseArg('project-root', PROJECT_ROOT));
      const artifactsRoot = path.resolve(parseArg('artifacts-root', path.join(projectRoot, 'artifacts')));
      const outputDir = parseArg('output-dir', null);
      const result = await buildInternalReleaseBundle({ projectRoot, artifactsRoot, outputDir });
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } catch (error) {
      console.error(`FAIL build-internal-release-bundle: ${error.message}`);
      process.exit(1);
    }
  })();
}

module.exports = {
  buildInternalReleaseBundle
};
