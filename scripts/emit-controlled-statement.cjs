const path = require('path');

(async () => {
  const rootDir = path.resolve(process.argv[2] || 'artifacts');
  const surface = process.argv[3] || 'controlled_statement_surface';
  const outputDir = path.resolve(process.argv[4] || rootDir);
  const scope = process.argv[5] || 'auto';
  const condition = process.argv[6] || null;
  const statementClass = process.argv[7] || 'local_descriptive_support_only';
  const requestedText = process.argv[8] || null;

  const { emitControlledStatementForSurface } = await import('../src/experiments/OutputSurfaceEnforcer.js');
  const result = emitControlledStatementForSurface({
    rootDir,
    surface,
    outputDir,
    scope,
    condition,
    statementClass,
    requestedText
  });
  process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
