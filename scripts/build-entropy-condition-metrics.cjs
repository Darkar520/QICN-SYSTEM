const path = require('path');

(async () => {
  const artifactsRoot = path.resolve(process.argv[2] || 'artifacts');
  const outputDir = path.resolve(process.argv[3] || artifactsRoot);
  const { buildConditionMetricsArtifacts } = await import('../src/experiments/EntropyConditionMetrics.js');
  const result = buildConditionMetricsArtifacts({ artifactsRoot, outputDir });
  process.stdout.write(`${JSON.stringify({
    artifactsRoot,
    outputDir,
    summaryPath: result.summaryPath,
    comparisonPath: result.comparisonPath
  }, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
