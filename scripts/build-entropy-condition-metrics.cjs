const path = require('path');

(async () => {
  const artifactsRoot = path.resolve(process.argv[2] || 'artifacts');
  const outputDir = path.resolve(process.argv[3] || artifactsRoot);
  const { buildConditionMetricsArtifacts } = await import('../src/experiments/EntropyConditionMetrics.js');
  const { buildConditionSupportLabelsArtifact } = await import('../src/experiments/OutputSupportLabels.js');
  const { buildConditionOutputConsumptionPolicyArtifact } = await import('../src/experiments/OutputConsumptionPolicy.js');
  const result = buildConditionMetricsArtifacts({ artifactsRoot, outputDir });
  const support = buildConditionSupportLabelsArtifact({
    outputDir,
    conditionSummary: result.conditionSummary,
    comparison: result.comparison
  });
  const consumptionPolicy = buildConditionOutputConsumptionPolicyArtifact({
    outputDir,
    conditionSummary: result.conditionSummary,
    comparison: result.comparison,
    conditionSupportLabels: support.artifact
  });
  process.stdout.write(`${JSON.stringify({
    artifactsRoot,
    outputDir,
    summaryPath: result.summaryPath,
    comparisonPath: result.comparisonPath,
    supportLabelsPath: support.outputPath,
    consumptionPolicyPath: consumptionPolicy.outputPath
  }, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
