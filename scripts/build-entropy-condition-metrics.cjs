const path = require('path');

(async () => {
  const artifactsRoot = path.resolve(process.argv[2] || 'artifacts');
  const outputDir = path.resolve(process.argv[3] || artifactsRoot);
  const { buildConditionMetricsArtifacts } = await import('../src/experiments/EntropyConditionMetrics.js');
  const { buildConditionSupportLabelsArtifact } = await import('../src/experiments/OutputSupportLabels.js');
  const { buildConditionOutputConsumptionPolicyArtifact } = await import('../src/experiments/OutputConsumptionPolicy.js');
  const { buildConditionOutputSurfacePolicyArtifact } = await import('../src/experiments/OutputSurfacePolicy.js');
  const { buildConditionControlledStatementsArtifact } = await import('../src/experiments/ControlledStatements.js');
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
  const surfacePolicy = buildConditionOutputSurfacePolicyArtifact({
    outputDir,
    conditionSummary: result.conditionSummary,
    comparison: result.comparison,
    conditionSupportLabels: support.artifact,
    conditionConsumptionPolicy: consumptionPolicy.artifact
  });
  const controlledStatements = buildConditionControlledStatementsArtifact({
    outputDir,
    conditionSupportLabels: support.artifact,
    conditionConsumptionPolicy: consumptionPolicy.artifact,
    conditionSurfacePolicy: surfacePolicy.artifact
  });
  process.stdout.write(`${JSON.stringify({
    artifactsRoot,
    outputDir,
    summaryPath: result.summaryPath,
    comparisonPath: result.comparisonPath,
    supportLabelsPath: support.outputPath,
    consumptionPolicyPath: consumptionPolicy.outputPath,
    surfacePolicyPath: surfacePolicy.outputPath,
    controlledStatementsPath: controlledStatements.outputPath
  }, null, 2)}\n`);
})().catch((error) => {
  console.error(error?.message || String(error));
  process.exit(1);
});
