#!/usr/bin/env node
/* eslint-disable no-console */
const path = require('path');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');

const main = async () => {
  const bridgeModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'phenomenal_bridge', 'PhenomenalBridgeInterventionHarness.js')
    ).href
  );
  const reducibilityModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'phenomenal_bridge', 'PhenomenalBridgeReducibilityComparator.js')
    ).href
  );
  const loaderModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'phenomenal_bridge', 'PhenomenalBridgeInputBundleLoader.js')
    ).href
  );

  const baselineBundle = loaderModule.loadPhenomenalBridgeBaselineInputBundle();
  const baselineReportResult = loaderModule.ensurePhenomenalBridgeBaselineReports();

  const interventionHarness = bridgeModule.createPhenomenalBridgeInterventionHarness();
  const interventionResult = interventionHarness.writeProfile({
    baselineBundle,
    baselineReportResult
  });

  const reducibilityComparator = reducibilityModule.createPhenomenalBridgeReducibilityComparator({
    interventionHarness
  });
  const reducibilityResult = reducibilityComparator.writeReducibilityReport({
    baselineBundle,
    baselineReportResult,
    interventionProfile: interventionResult.profile
  });

  console.log(
    JSON.stringify(
      {
        status: 'PASS',
        output_dir: interventionResult.output_dir,
        bridge_intervention_profile: path.relative(ROOT, interventionResult.output_path).replace(/\\/g, '/'),
        bridge_reducibility_report: path.relative(ROOT, reducibilityResult.output_path).replace(/\\/g, '/')
      },
      null,
      2
    )
  );
};

main().catch((error) => {
  console.error(`FAIL build-phenomenal-bridge-adversarial: ${error.message}`);
  process.exitCode = 1;
});
