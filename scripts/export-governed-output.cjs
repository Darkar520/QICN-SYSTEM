const path = require('path');

(async () => {
  const rootDir = path.resolve(process.argv[2] || 'artifacts');
  const artifactName = process.argv[3];
  const surface = process.argv[4] || 'descriptive_export_surface';
  const outputDir = path.resolve(process.argv[5] || path.join(rootDir, 'exports'));
  const scope = process.argv[6] || 'auto';

  if (!artifactName) {
    throw new Error('artifactName is required');
  }

  const { exportOutputForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');
  const result = exportOutputForSurface({ rootDir, artifactName, surface, outputDir, scope });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
