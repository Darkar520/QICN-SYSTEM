const fs = require('fs');
const path = require('path');

const {
  EVALUATION_ROOT,
  loadDefinitions,
  readJson,
  writeJson,
  toProjectRelative,
  detectLocalPathMatches
} = require('./evaluation-phase-common.cjs');

const exists = (filePath) => fs.existsSync(filePath);

(() => {
  try {
    const { comparisonMatrix } = loadDefinitions();
    const reportPath = path.join(EVALUATION_ROOT, 'condition_comparison_report.json');
    const batchReportPath = path.join(EVALUATION_ROOT, 'evaluation_batch_report.json');
    const requiredFiles = [reportPath, batchReportPath];
    const missingFiles = requiredFiles.filter((filePath) => !exists(filePath)).map((filePath) => toProjectRelative(filePath));
    const failures = [];
    const warnings = [];

    let report = null;
    if (missingFiles.length === 0) {
      report = readJson(reportPath);
      const reportById = new Map((report.comparisons || []).map((entry) => [entry.id, entry]));
      const expectedIds = (comparisonMatrix.comparisons || []).map((entry) => entry.id);
      const missingComparisons = expectedIds.filter((id) => !reportById.has(id));
      const unknownComparisons = (report.comparisons || []).map((entry) => entry.id).filter((id) => !expectedIds.includes(id));
      if (missingComparisons.length > 0) failures.push('missing_matrix_comparisons_in_report');
      if (unknownComparisons.length > 0) failures.push('unknown_comparisons_in_report');

      for (const matrixEntry of comparisonMatrix.comparisons || []) {
        const realized = reportById.get(matrixEntry.id);
        if (!realized) continue;
        if (matrixEntry.support_level === 'description_only') {
          if (realized.realized_support_level !== 'description_only') {
            failures.push(`description_only_support_mismatch:${matrixEntry.id}`);
          }
        } else if (matrixEntry.support_level === 'minimal_contrast') {
          if (realized.realized_support_level === 'unsupported') {
            failures.push(`minimal_contrast_unsupported:${matrixEntry.id}`);
          } else if (realized.realized_support_level !== 'minimal_contrast') {
            warnings.push(`minimal_contrast_not_realized:${matrixEntry.id}`);
          }
        }
      }

      const unsupportedIds = (report.unsupported_comparisons || []).map((entry) => entry.id);
      const matrixUnsupportedIds = (comparisonMatrix.unsupported_comparisons || []).map((entry) => entry.id);
      const unsupportedMismatch = matrixUnsupportedIds.filter((id) => !unsupportedIds.includes(id))
        .concat(unsupportedIds.filter((id) => !matrixUnsupportedIds.includes(id)));
      if (unsupportedMismatch.length > 0) failures.push('unsupported_comparison_registry_mismatch');
    } else {
      failures.push('missing_required_comparison_artifacts');
    }

    const portabilityMatches = detectLocalPathMatches(requiredFiles.filter(exists));
    if (portabilityMatches.length > 0) failures.push('local_path_leak_in_comparison_artifacts');

    const status = failures.length > 0 ? 'FAIL' : warnings.length > 0 ? 'PASS_WITH_WARNINGS' : 'PASS';
    const artifact = {
      artifact_role: 'evaluation_comparisons_check',
      checked_at: new Date().toISOString(),
      status,
      failures,
      warnings,
      checks: {
        missing_files: missingFiles,
        portability_matches: portabilityMatches
      },
      interpretation_boundary: 'Evaluation comparison check only; verifies allowed contrast structure, not claim semantics.'
    };

    const outputPath = path.join(EVALUATION_ROOT, 'evaluation_comparisons_check.json');
    writeJson(outputPath, artifact);
    if (status === 'FAIL') {
      throw new Error(`evaluation comparison check failed: ${failures.join(', ')}`);
    }
    process.stdout.write(`${JSON.stringify({ status, outputPath: toProjectRelative(outputPath), warnings }, null, 2)}\n`);
  } catch (error) {
    console.error(`FAIL verify-evaluation-comparisons: ${error.message}`);
    process.exit(1);
  }
})();
