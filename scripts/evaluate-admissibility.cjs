const fs = require('fs');
const path = require('path');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

(async () => {
  const { AdmissibilityEngine, exportPaperAssets } = await import('../src/experiments/AdmissibilityEngine.js');
  const artifactArg = parseArg('artifact', null);
  const artifactsRoot = path.resolve(parseArg('artifacts-root', path.resolve(__dirname, '../artifacts')));
  if (!artifactArg) {
    throw new Error('Missing --artifact=<artifact_dir>');
  }
  const artifactDir = path.resolve(artifactArg);
  if (!fs.existsSync(artifactDir)) {
    throw new Error(`Artifact dir not found: ${artifactDir}`);
  }
  const capP95Ms = Number(parseArg('cap', '50'));
  const hardCapMs = Number(parseArg('hard-cap', '100'));
  const flakeCommand = parseArg('flake-cmd', null);
  const engine = new AdmissibilityEngine({ capP95Ms, hardCapMs });
  const { verdictPath, verdict } = engine.evaluateRun({
    artifactDir,
    flakeCommand,
    flakeCwd: path.resolve(__dirname, '..')
  });

  const batchId = parseArg('export-batch', null);
  let exportInfo = null;
  if (batchId) {
    exportInfo = exportPaperAssets({ artifactsRoot, batchId });
  }
  console.log(JSON.stringify({
    artifactDir,
    verdictPath,
    status: verdict.status,
    reasons: verdict.reasons,
    hashes: verdict.hashes,
    export: exportInfo
  }));
})().catch((error) => {
  console.error(`FAIL evaluate-admissibility: ${error.message}`);
  process.exit(1);
});
