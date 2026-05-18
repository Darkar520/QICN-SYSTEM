#!/usr/bin/env node
import fs from 'fs';
import path from 'path';

const runtimeRoot = process.cwd();
const invariantFile = path.join(runtimeRoot, 'src/canon/invariants/CanonicalInvariantPackage.js');
const source = fs.existsSync(invariantFile) ? fs.readFileSync(invariantFile, 'utf8') : '';
const weightTerms = (source.match(/\b0\.\d+\b/g) || []).length;
const invariantRows = (source.match(/\bid:\s*'I_/g) || []).length;

const report = {
  artifact_role: 'invariant_computation_complexity_benchmark_v1',
  evidence_scope: 'INTERNAL_SUPPORT_ONLY',
  interpretation_boundary: 'Static complexity profile only; not runtime performance proof and not external validation.',
  source_module: 'src/canon/invariants/CanonicalInvariantPackage.js',
  estimates: {
    invariant_rows_detected: invariantRows,
    weighted_terms_detected: weightTerms,
    per_run_summary_invariant_order: 'O(k)',
    tick_series_preaggregation_order: 'O(n)',
    roeo_pair_order: 'O(p*d)',
    sno_centroid_order: 'O(n*d*c)'
  }
};

console.log(JSON.stringify(report, null, 2));
