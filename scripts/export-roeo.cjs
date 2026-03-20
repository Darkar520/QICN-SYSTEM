const path = require('path');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

(async () => {
  const batchId = parseArg('batch-id', null);
  if (!batchId) throw new Error('batch-id is required');
  const roeoRoot = parseArg('roeo-root', 'artifacts/roeo_batches');
  const exportsRoot = parseArg('exports-root', 'artifacts/paper_exports');
  const preregPath = parseArg('preregister', 'config/roeo/roeo_preregister.v1.json');
  const { exportRoeoAssets } = await import('../src/experiments/latex_asset_generator_roeo.js');
  const { manifestPath, manifest } = exportRoeoAssets({
    batchId,
    roeoRoot: path.resolve(roeoRoot),
    exportsRoot: path.resolve(exportsRoot),
    preregPath: path.resolve(preregPath)
  });
  console.log(JSON.stringify({
    batchId,
    manifest_path: manifestPath,
    exported: manifest.exported,
    batch_status: manifest.batch_status,
    reasons: manifest.reasons,
    outputs: manifest.exports
  }));
})().catch((error) => {
  console.error(`FAIL export-roeo: ${error.message}`);
  process.exit(1);
});
