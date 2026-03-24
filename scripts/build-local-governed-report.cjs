const path = require('path');

(async () => {
  const rootDir = path.resolve(process.argv[2] || 'artifacts');
  const scope = process.argv[3] || 'auto';
  const outputPath = process.argv[4] ? path.resolve(process.argv[4]) : null;

  const { buildLocalReportForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');
  const result = buildLocalReportForSurface({ rootDir, scope, outputPath });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
