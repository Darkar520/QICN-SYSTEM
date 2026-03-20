#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const artifactsRoot = path.join(root, 'artifacts');

const latestArtifactDir = () => {
  const dirs = fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(artifactsRoot, entry.name))
    .sort((a, b) => fs.statSync(b).mtimeMs - fs.statSync(a).mtimeMs);
  return dirs[0] || null;
};

const readJsonIfExists = (p) => (fs.existsSync(p) ? JSON.parse(fs.readFileSync(p, 'utf8')) : null);
const parseTicks = (ticksPath) => fs.readFileSync(ticksPath, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => JSON.parse(line));

const READINESS_RANK = Object.freeze({
  INSUFFICIENT_FOR_CLAIM_CLOSING: 0,
  PARTIAL_RUNTIME_CLOSURE: 1,
  PARTIAL_RUNTIME_PATH: 2,
  PARTIAL_RUNTIME_PATH_CLOSURE_STRENGTHENED: 3,
  NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE: 4,
  CLAIM_CLOSING_READY_RUNTIME_EVIDENCE: 5
});

const rankClosure = (closure = {}) => Math.max(
  READINESS_RANK[closure?.claimClosingReadiness] || 0,
  READINESS_RANK[closure?.readiness] || 0
);

const scoreBoundaryRuntime = (runtime = null) => {
  if (!runtime?.closureSummary) return -1;
  const closure = runtime.closureSummary;
  const diag = runtime.familyDiagnostics || {};
  return rankClosure(closure) * 100
    + (diag.passCount || 0) * 10
    + (diag.ambiguousCount || 0) * 12
    + (diag.failCount || 0) * 14
    - (diag.confoundedMembers || 0) * 25
    + (closure.firstFailingInvariant ? 20 : 0);
};

const scoreSubstrateFamily = (family = null) => {
  if (!family?.closureSummary) return -1;
  const closure = family.closureSummary;
  const pairCount = Array.isArray(family?.pairs) ? family.pairs.length : 0;
  const roles = new Set((family?.pairs || []).map((pair) => pair.role).filter(Boolean));
  return rankClosure(closure) * 100
    + pairCount * 15
    + (roles.has('positive') && roles.has('negative') ? 60 : 0)
    + (closure.positivePassCount || 0) * 20
    + (closure.negativeFailCount || 0) * 20
    + (closure.snoSupportedCount || 0) * 8
    + (closure.roeoSupportedCount || 0) * 8;
};

const discoverBestBoundaryRuntime = (artifactDir) => {
  const candidates = fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(artifactsRoot, entry.name, 'boundary_runtime_diagnostics.json'))
    .filter((candidate) => fs.existsSync(candidate))
    .filter((candidate) => path.dirname(candidate) !== artifactDir)
    .map((candidate) => {
      const runtimeBoundary = readJsonIfExists(candidate);
      return {
        path: candidate,
        runtimeBoundary,
        score: scoreBoundaryRuntime(runtimeBoundary),
        mtimeMs: fs.statSync(candidate).mtimeMs
      };
    })
    .filter((candidate) => candidate.runtimeBoundary)
    .sort((a, b) => (b.score - a.score) || (b.mtimeMs - a.mtimeMs));
  return candidates[0] || null;
};

const discoverBestSubstrateEvidence = (artifactDir) => {
  const candidates = [];

  const phase2Path = path.join(root, 'artifacts', 'phase2_runtime_substrate_check', 'operational_equivalence.json');
  if (fs.existsSync(phase2Path)) {
    const operationalEquivalence = readJsonIfExists(phase2Path);
    const runtimeSubstrateFamily = operationalEquivalence?.runtime_substrate_family || null;
    const snoPath = path.join(path.dirname(phase2Path), 'sno_report.json');
    candidates.push({
      sourceType: 'operational_equivalence_embedded_family',
      path: phase2Path,
      runtimeSubstrateFamily,
      operationalEquivalence,
      snoReport: readJsonIfExists(snoPath),
      score: scoreSubstrateFamily(runtimeSubstrateFamily),
      mtimeMs: fs.statSync(phase2Path).mtimeMs
    });
  }

  const runtimeDiagCandidates = fs.readdirSync(artifactsRoot, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .flatMap((entry) => {
      const dir = path.join(artifactsRoot, entry.name);
      if (dir === artifactDir) return [];
      return [
        path.join(dir, 'substrate_runtime_diagnostics.json'),
        path.join(dir, 'claim_mapping_snapshot.json')
      ].filter((candidate) => fs.existsSync(candidate));
    });

  for (const candidatePath of runtimeDiagCandidates) {
    const payload = readJsonIfExists(candidatePath);
    if (!payload) continue;
    const runtimeSubstrateFamily = payload?.familyId && payload?.closureSummary
      ? payload
      : (payload?.substrateRuntime?.familyId && payload?.substrateRuntime?.closureSummary ? payload.substrateRuntime : null);
    if (!runtimeSubstrateFamily) continue;
    candidates.push({
      sourceType: 'runtime_internalized_family',
      path: candidatePath,
      runtimeSubstrateFamily,
      operationalEquivalence: null,
      snoReport: null,
      score: scoreSubstrateFamily(runtimeSubstrateFamily),
      mtimeMs: fs.statSync(candidatePath).mtimeMs
    });
  }

  return candidates
    .filter((candidate) => candidate.runtimeSubstrateFamily)
    .sort((a, b) => (b.score - a.score) || (b.mtimeMs - a.mtimeMs))[0] || null;
};

const buildExternalEvidence = (artifactDir) => {
  const bestBoundary = discoverBestBoundaryRuntime(artifactDir);
  const bestSubstrate = discoverBestSubstrateEvidence(artifactDir);
  return {
    runtimeBoundaryRuntime: bestBoundary?.runtimeBoundary || null,
    runtimeSubstrateFamily: bestSubstrate?.runtimeSubstrateFamily || null,
    operationalEquivalence: bestSubstrate?.operationalEquivalence || null,
    snoReport: bestSubstrate?.snoReport || null,
    evidenceSource: {
      boundary: bestBoundary ? {
        sourceType: bestBoundary.sourceType || 'runtime_boundary_diagnostics',
        path: bestBoundary.path,
        score: bestBoundary.score
      } : null,
      substrate: bestSubstrate ? {
        sourceType: bestSubstrate.sourceType,
        path: bestSubstrate.path,
        score: bestSubstrate.score
      } : null
    }
  };
};

const main = async () => {
  const artifactDir = process.argv[2] ? path.resolve(process.argv[2]) : latestArtifactDir();
  if (!artifactDir) throw new Error('NO_ARTIFACT_DIR_AVAILABLE');

  const verdictPath = path.join(artifactDir, 'run_verdict.json');
  const invariantPath = path.join(artifactDir, 'invariant_package.json');
  if (!fs.existsSync(verdictPath) || !fs.existsSync(invariantPath)) {
    const admissibilityMod = await import(`file:///${path.join(root, 'src', 'experiments', 'AdmissibilityEngine.js').replace(/\\/g, '/')}`);
    const engine = new admissibilityMod.AdmissibilityEngine();
    engine.evaluateRun({ artifactDir });
  }

  const header = JSON.parse(fs.readFileSync(path.join(artifactDir, 'run_header.json'), 'utf8'));
  const summary = JSON.parse(fs.readFileSync(path.join(artifactDir, 'run_summary.json'), 'utf8'));
  const verdict = JSON.parse(fs.readFileSync(path.join(artifactDir, 'run_verdict.json'), 'utf8'));
  const ticks = parseTicks(path.join(artifactDir, 'ticks.ndjson'));
  const sourceOfTruthCheck = readJsonIfExists(path.join(root, 'artifacts', 'runtime_source_of_truth_check.json'));

  const externalEvidence = buildExternalEvidence(artifactDir);

  const claimMappingMod = await import(`file:///${path.join(root, 'src', 'canon', 'claimMapping', 'runtimeClaimMapping.js').replace(/\\/g, '/')}`);
  const claimMappingSnapshot = claimMappingMod.buildCanonicalClaimMappingSnapshot({
    header,
    summary,
    verdict,
    ticks,
    externalEvidence
  });

  const invariantPackage = claimMappingSnapshot.invariantPackage;
  const invariantSignalProvenance = Object.fromEntries(
    Object.entries(invariantPackage?.invariants || {}).map(([id, record]) => [id, {
      maturity: record?.maturity || 'UNKNOWN',
      runtimeSignals: record?.runtimeSignals || [],
      directSignals: Object.keys(record?.directSignals || {}),
      proxySignals: Object.keys(record?.proxySignals || {}),
      judgeDependent: Boolean(record?.judgeDependent),
      provenance: record?.provenance || {}
    }])
  );

  const payload = {
    artifactDir,
    evidenceSource: externalEvidence.evidenceSource,
    boundaryRuntime: claimMappingSnapshot.boundaryRuntime,
    substrateRuntime: claimMappingSnapshot.substrateRuntime,
    invariantSignalProvenance,
    legacyIsolationCheck: sourceOfTruthCheck,
    fullNativeInvariantStatus: claimMappingSnapshot.fullNativeInvariantStatus || null,
    claimClosureRuntimeDiagnostics: claimMappingSnapshot.claimClosingRuntime || null,
    runtimeClaimProjection: claimMappingSnapshot.runtimeClaimProjection || null,
    releaseMaterializationMap: claimMappingSnapshot.releaseMaterializationMap || null,
    p503ThresholdRuntime: claimMappingSnapshot.p503ThresholdRuntime || null
  };

  fs.writeFileSync(path.join(artifactDir, 'claim_mapping_snapshot.json'), `${JSON.stringify(claimMappingSnapshot, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'invariant_package.json'), `${JSON.stringify(invariantPackage, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'canon_runtime_phase7_check.json'), `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'boundary_runtime_diagnostics.json'), `${JSON.stringify(claimMappingSnapshot.boundaryRuntime, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'substrate_runtime_diagnostics.json'), `${JSON.stringify(claimMappingSnapshot.substrateRuntime, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'invariant_signal_provenance.json'), `${JSON.stringify(invariantSignalProvenance, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'boundary_closure_runtime_diagnostics.json'), `${JSON.stringify(claimMappingSnapshot.boundaryRuntime, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'substrate_closure_runtime_diagnostics.json'), `${JSON.stringify(claimMappingSnapshot.substrateRuntime, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'invariant_semantics_provenance.json'), `${JSON.stringify(invariantSignalProvenance, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'legacy_isolation_check.json'), `${JSON.stringify(sourceOfTruthCheck, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'full_native_invariant_status.json'), `${JSON.stringify(payload.fullNativeInvariantStatus, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'claim_closure_runtime_diagnostics.json'), `${JSON.stringify(payload.claimClosureRuntimeDiagnostics, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'runtime_claim_projection.json'), `${JSON.stringify(payload.runtimeClaimProjection, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'release_materialization_map.json'), `${JSON.stringify(payload.releaseMaterializationMap, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'canon_p5_03_threshold_diagnostics.json'), `${JSON.stringify(payload.p503ThresholdRuntime, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'i_ri_closure_diagnostics.json'), `${JSON.stringify({
    invariant: payload.fullNativeInvariantStatus?.I_ri || null,
    provenance: payload.invariantSignalProvenance?.I_ri || null
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'runtime_closure_final_diagnostics.json'), `${JSON.stringify({
    boundary: claimMappingSnapshot.boundaryRuntime?.closureSummary || null,
    substrate: claimMappingSnapshot.substrateRuntime?.closureSummary || null,
    runtimeClaimProjection: payload.runtimeClaimProjection || null,
    p503ThresholdRuntime: payload.p503ThresholdRuntime || null,
    externalEvidenceSummary: claimMappingSnapshot.externalEvidenceSummary || null
  }, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'release_materialization_final_map.json'), `${JSON.stringify(payload.releaseMaterializationMap, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(artifactDir, 'legacy_consolidation_execution_map.json'), `${JSON.stringify(sourceOfTruthCheck, null, 2)}\n`, 'utf8');
  console.log(JSON.stringify({ artifactDir, evidenceSource: externalEvidence.evidenceSource }, null, 2));
};

main().catch((error) => {
  console.error(error?.stack || String(error));
  process.exit(1);
});
