import fs from 'fs';
import path from 'path';
import {
  PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS,
  ensurePhenomenalBridgeBaselineReports,
  loadPhenomenalBridgeBaselineInputBundle
} from './PhenomenalBridgeInputBundleLoader.js';
import { createPhenomenalBridgeInterventionHarness } from './PhenomenalBridgeInterventionHarness.js';
import { createPhenomenalBridgeReducibilityComparator } from './PhenomenalBridgeReducibilityComparator.js';
import { runFullBodyWorldBridgeVerification } from './BridgeTransportAndBurdensEvaluator.js';
import { PHENOMENAL_BRIDGE_THRESHOLDS } from './PhenomenalBridgeThresholdRegistry.js';
import { PHENOMENAL_BRIDGE_SURFACE_POLICY } from './PhenomenalBridgeSurfacePolicy.js';
import { PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA } from './PhenomenalBridgeArtifactRegistry.js';
import {
  BRIDGE_PREDICATE_IDS,
  getBridgeBaselineEstimates
} from './BridgeAdversarialUtils.js';
import {
  BRIDGE_SYSTEM_FILES,
  ROOT_BRIDGE_ARTIFACT_REFS,
  PROJECT_ROOT,
  asNumber,
  captureBridgeLineage,
  clamp01,
  compareCoordinateDrift,
  compareLineage,
  geometricMean,
  readJson,
  writeJson
} from './PhenomenalBridgeRuntimeUtils.js';

const ROOT_LAYER_VERSION = 'phenomenal_bridge_formal_layer.bpfm3.root.v1';
const ROOT_ESTIMATOR_VERSION = 'phenomenal_bridge_root_evaluator.bpfm3.v1';
const ROOT_RUNTIME_STATUS = 'implemented_internal_bridge_root_evaluation_in_bpfm3';
const ROOT_IMPLEMENTATION_STATUS = 'bpfm3_root_bridge_evaluation_implemented';
const ROOT_OUTPUT_DIR = path.resolve(PROJECT_ROOT, 'artifacts', 'phenomenal_bridge', 'bpfm3');

const PROJECTION_BOUNDARY =
  'Framework-internal only; root bridge projection over implemented bridge reports and adversarial artifacts, not external validation, not human equivalence, not phenomenality proof, not metaphysical closure, not claim-facing evidence.';
const GATE_BOUNDARY =
  'Framework-internal only; root bridge gate result over implemented bridge reports, bridge intervention profile, and bridge reducibility report, not external validation, not human equivalence, not phenomenality proof, not metaphysical closure, and not sufficient for public claim promotion.';
const MANIFEST_BOUNDARY =
  'Framework-internal only; root bridge manifest for BPF-M3 lineage, thresholds, artifacts, and bounded classification, not external validation, not human equivalence, not phenomenality proof, and not claim-facing evidence.';

const BRIDGE_CLASSIFICATIONS = Object.freeze([
  'bridge_evaluation_unsupported',
  'bridge_drift_invalidated',
  'bridge_reducible',
  'bridge_interventionally_unstable',
  'bridge_gate_fail',
  'bridge_insufficient_support',
  'bridge_internal_formalized',
  'bridge_internal_admissible',
  'bridge_internal_strong_support'
]);

const clone = (value) => JSON.parse(JSON.stringify(value));

const getSurfaceSpec = (artifactName) =>
  PHENOMENAL_BRIDGE_SURFACE_POLICY.outputs?.[artifactName] || {
    allowed_surfaces: ['developer_inspection_surface', 'local_artifact_surface'],
    blocked_surfaces: ['controlled_statement_surface', 'external_claim_facing_surface']
  };

const createThresholdMap = () =>
  Object.fromEntries(
    (PHENOMENAL_BRIDGE_THRESHOLDS.local_threshold_slots || []).map((slot) => [
      slot.predicate,
      asNumber(slot.value, 0)
    ])
  );

const classifyInterventionStatus = (profile) => {
  if (!profile || profile.comparison_readiness !== true) {
    return {
      comparison_supported: false,
      status: 'bridge_intervention_unsupported',
      invalidation_reasons: ['bridge_intervention_profile_not_ready']
    };
  }

  const confounds = Array.isArray(profile.confound_flags) ? profile.confound_flags : [];
  if (confounds.length > 0) {
    return {
      comparison_supported: false,
      status: 'bridge_intervention_confounded',
      invalidation_reasons: confounds.map((flag) => `bridge_intervention:${flag}`)
    };
  }

  if (profile.profile_status !== 'selectivity_detected_pre_comparator') {
    return {
      comparison_supported: false,
      status: 'bridge_intervention_unstable',
      invalidation_reasons: [`bridge_intervention:${profile.profile_status}`]
    };
  }

  return {
    comparison_supported: true,
    status: 'bridge_intervention_supported_pre_gate',
    invalidation_reasons: []
  };
};

const normalizeInterventionSupport = (profile) => {
  const selectivity = clamp01(profile?.intervention_selectivity);
  const targetedNorm = clamp01(asNumber(profile?.targeted_bridge_drop) / 0.18);
  const collateralGuard = 1 - clamp01(asNumber(profile?.collateral_damage) / 0.08);
  const stableControlFraction =
    (Array.isArray(profile?.negative_control_runs) && profile.negative_control_runs.length > 0)
      ? clamp01(
          profile.negative_control_runs.filter(
            (run) => run.profile_status === 'negative_control_stable'
          ).length / profile.negative_control_runs.length
        )
      : 0;
  const confoundGuard =
    1
    - clamp01(
      (Array.isArray(profile?.confound_flags) ? profile.confound_flags.length : 0) / 6
    );

  return {
    selectivity,
    targeted_drop_normalized: targetedNorm,
    collateral_guard: Number(collateralGuard.toFixed(12)),
    stable_control_fraction: stableControlFraction,
    confound_guard: Number(confoundGuard.toFixed(12)),
    normalized_support: Number(
      clamp01(
        0.35 * selectivity
          + 0.25 * targetedNorm
          + 0.15 * collateralGuard
          + 0.15 * stableControlFraction
          + 0.1 * confoundGuard
      ).toFixed(12)
    )
  };
};

const normalizeReducibilitySupport = (report) => {
  const classificationScore = {
    bridge_partial_irreducibility_support: 0.78,
    bridge_irreducibility_not_supported: 0.38,
    bridge_weak_model_sufficient: 0.05,
    bridge_weak_composite_sufficient: 0.03,
    bridge_comparison_unsupported: 0
  }[report?.classification] ?? 0;

  const strongLoss = asNumber(report?.strong_model_loss?.total_loss, 1);
  const bestRivalLoss = asNumber(report?.best_weak_rival_loss, strongLoss);
  const bestCompositeLoss = asNumber(report?.best_bridge_composite_loss, strongLoss);
  const marginNorm = clamp01(asNumber(report?.bridge_irreducibility_margin) / 0.15);
  const rivalGapNorm = clamp01((bestRivalLoss - strongLoss) / 0.15);
  const compositeGapNorm = clamp01((bestCompositeLoss - strongLoss) / 0.15);

  const normalizedSupport = report?.comparison_supported
    ? clamp01(
      0.35 * marginNorm
        + 0.25 * classificationScore
        + 0.2 * rivalGapNorm
        + 0.2 * compositeGapNorm
    )
    : 0;

  return {
    classification_score: classificationScore,
    margin_normalized: Number(marginNorm.toFixed(12)),
    rival_gap_normalized: Number(rivalGapNorm.toFixed(12)),
    composite_gap_normalized: Number(compositeGapNorm.toFixed(12)),
    normalized_support: Number(normalizedSupport.toFixed(12))
  };
};

const buildCoordinateDetails = ({ reportRefs, baselineReports, reducibilitySupport, interventionSupport }) => {
  const baselineEstimates = getBridgeBaselineEstimates(baselineReports);
  const details = {};
  for (const predicateId of BRIDGE_PREDICATE_IDS) {
    const reportKey = Object.entries({
      Pi_D: 'phenomenal_differentiation_report',
      Pi_V: 'valence_structure_report',
      Pi_W: 'world_richness_report',
      Pi_A: 'ambiguity_bearing_report',
      Pi_E: 'embodied_closure_report',
      Pi_T: 'temporal_lived_structure_report'
    }).find(([id]) => id === predicateId)?.[1];
    const report = baselineReports?.[reportKey];
    details[predicateId] = {
      predicate_id: predicateId,
      estimate: Number(asNumber(baselineEstimates[predicateId]).toFixed(12)),
      status: report?.estimator_status || 'unknown_status',
      weakness_markers: clone(report?.weakness_markers || []),
      uncertainty_markers: clone(report?.uncertainty_markers || []),
      warnings: clone(report?.warnings || []),
      report_ref: reportRefs?.[reportKey] || null
    };
  }
  details.R_b = {
    predicate_id: 'R_b',
    estimate: reducibilitySupport.normalized_support,
    status: 'normalized_reducibility_support',
    weakness_markers: [],
    uncertainty_markers: [],
    warnings: []
  };
  details.Delta_b = {
    predicate_id: 'Delta_b',
    estimate: interventionSupport.normalized_support,
    status: 'normalized_intervention_support',
    weakness_markers: [],
    uncertainty_markers: [],
    warnings: []
  };
  return details;
};

const buildManifestInventory = (rootOutputRefs, ecosystemOutputRefs = {}) => ({
  bridge_surface_reports: { ...PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS },
  bridge_adversarial_reports: {
    bridge_intervention_profile: 'artifacts/phenomenal_bridge/bpfm2/bridge_intervention_profile.json',
    bridge_reducibility_report: 'artifacts/phenomenal_bridge/bpfm2/bridge_reducibility_report.json'
  },
  bridge_root_artifacts: rootOutputRefs,
  bridge_ecosystem_artifacts: ecosystemOutputRefs
});

export class PhenomenalBridgeGateEvaluator {
  constructor({
    interventionHarness = createPhenomenalBridgeInterventionHarness(),
    reducibilityComparator = createPhenomenalBridgeReducibilityComparator()
  } = {}) {
    this.interventionHarness = interventionHarness;
    this.reducibilityComparator = reducibilityComparator;
    this.coordinateThresholds = Object.freeze(createThresholdMap());
    this.functionalWeights = Object.freeze({
      ...(PHENOMENAL_BRIDGE_THRESHOLDS.functional_weights || {})
    });
    this.globalThresholds = Object.freeze({
      Phi_bpf: asNumber(PHENOMENAL_BRIDGE_THRESHOLDS.global_thresholds?.Phi_bpf),
      Gamma_bpf: asNumber(PHENOMENAL_BRIDGE_THRESHOLDS.global_thresholds?.Gamma_bpf)
    });
    this.strongSupportThresholds = Object.freeze({
      ...(PHENOMENAL_BRIDGE_THRESHOLDS.support_class_thresholds?.bridge_internal_strong_support || {})
    });
    this.driftTolerances = Object.freeze({
      ...(PHENOMENAL_BRIDGE_THRESHOLDS.drift_tolerances || {})
    });
  }

  captureCurrentLineage() {
    return captureBridgeLineage({
      layerVersion: ROOT_LAYER_VERSION,
      estimatorVersion: ROOT_ESTIMATOR_VERSION
    });
  }

  evaluate({
    baselineBundle = loadPhenomenalBridgeBaselineInputBundle(),
    baselineReportResult = ensurePhenomenalBridgeBaselineReports(),
    interventionProfile = this.interventionHarness.buildProfile({
      baselineBundle,
      baselineReportResult
    }),
    reducibilityReport = this.reducibilityComparator.buildReducibilityReport({
      baselineBundle,
      baselineReportResult,
      interventionProfile
    }),
    previousManifest = null
  } = {}) {
    const baselineReports = baselineReportResult.reports;
    const baselineEstimates = getBridgeBaselineEstimates(baselineReports);
    const interventionStatus = classifyInterventionStatus(interventionProfile);
    const interventionSupport = normalizeInterventionSupport(interventionProfile);
    const reducibilitySupport = normalizeReducibilitySupport(reducibilityReport);
    const coordinateEstimates = {
      ...Object.fromEntries(
        BRIDGE_PREDICATE_IDS.map((predicateId) => [
          predicateId,
          Number(asNumber(baselineEstimates[predicateId]).toFixed(12))
        ])
      ),
      R_b: reducibilitySupport.normalized_support,
      Delta_b: interventionSupport.normalized_support
    };

    const currentLineage = this.captureCurrentLineage();
    const lineageStatus = compareLineage(previousManifest?.lineage || null, currentLineage);
    const driftStatus = compareCoordinateDrift(
      previousManifest?.projection_snapshot?.coordinate_estimates || null,
      coordinateEstimates,
      this.driftTolerances
    );

    const functionalInputs = {
      Pi_D: coordinateEstimates.Pi_D,
      Pi_V: coordinateEstimates.Pi_V,
      Pi_W: coordinateEstimates.Pi_W,
      Pi_A: coordinateEstimates.Pi_A,
      Pi_E: coordinateEstimates.Pi_E,
      Pi_T: coordinateEstimates.Pi_T,
      R_b: coordinateEstimates.R_b,
      Delta_b: coordinateEstimates.Delta_b
    };
    const phiBpf = Number(geometricMean(functionalInputs, this.functionalWeights).toFixed(12));
    const gammaBpf = Number(
      Math.min(...Object.values(functionalInputs).map((value) => asNumber(value, 0))).toFixed(12)
    );

    const localThresholdResults = Object.fromEntries(
      Object.entries(this.coordinateThresholds).map(([predicateId, threshold]) => [
        predicateId,
        {
          threshold: Number(threshold.toFixed(12)),
          observed: Number(asNumber(coordinateEstimates[predicateId]).toFixed(12)),
          pass: asNumber(coordinateEstimates[predicateId]) >= threshold
        }
      ])
    );
    const globalThresholdResults = {
      Phi_bpf: {
        threshold: Number(this.globalThresholds.Phi_bpf.toFixed(12)),
        observed: phiBpf,
        pass: phiBpf >= this.globalThresholds.Phi_bpf
      },
      Gamma_bpf: {
        threshold: Number(this.globalThresholds.Gamma_bpf.toFixed(12)),
        observed: gammaBpf,
        pass: gammaBpf >= this.globalThresholds.Gamma_bpf
      }
    };

    const invalidationReasons = [];
    if (lineageStatus.invalidated) {
      invalidationReasons.push(...lineageStatus.mismatch_reasons.map((reason) => `lineage:${reason}`));
    }
    if (driftStatus.invalidated) {
      invalidationReasons.push(...driftStatus.exceeded.map((item) => `drift:${item.coordinate_id}`));
    }
    if (!reducibilityReport.comparison_supported) {
      invalidationReasons.push('comparator_unsupported');
    }
    if (!interventionStatus.comparison_supported) {
      invalidationReasons.push(...interventionStatus.invalidation_reasons);
    }

    const localPass = Object.values(localThresholdResults).every((result) => result.pass);
    const gammaPass = globalThresholdResults.Gamma_bpf.pass;
    const phiPass = globalThresholdResults.Phi_bpf.pass;
    const gatePass =
      invalidationReasons.length === 0
      && localPass
      && gammaPass
      && phiPass;

    let classification = 'bridge_evaluation_unsupported';
    if (lineageStatus.invalidated || driftStatus.invalidated) {
      classification = 'bridge_drift_invalidated';
    } else if (!reducibilityReport.comparison_supported) {
      classification = 'bridge_evaluation_unsupported';
    } else if (
      ['bridge_weak_model_sufficient', 'bridge_weak_composite_sufficient'].includes(
        reducibilityReport.classification
      )
    ) {
      classification = 'bridge_reducible';
    } else if (!interventionStatus.comparison_supported) {
      classification = 'bridge_interventionally_unstable';
    } else if (!localPass || !gammaPass) {
      classification = 'bridge_gate_fail';
    } else if (!phiPass) {
      classification = 'bridge_insufficient_support';
    } else {
      const strongGamma = asNumber(this.strongSupportThresholds.Gamma_bpf, Number.POSITIVE_INFINITY);
      const strongPhi = asNumber(this.strongSupportThresholds.Phi_bpf, Number.POSITIVE_INFINITY);
      const strongSupportEligible = gammaBpf >= strongGamma && phiBpf >= strongPhi;
      classification = strongSupportEligible
        ? 'bridge_internal_strong_support'
        : 'bridge_internal_admissible';
    }

    if (!BRIDGE_CLASSIFICATIONS.includes(classification)) {
      classification = 'bridge_evaluation_unsupported';
    }

    const warnings = [
      ...new Set([
        ...(baselineReports.ambiguity_bearing_report?.warnings || []),
        ...(baselineReports.embodied_closure_report?.warnings || []),
        ...(interventionProfile.warnings || []),
        ...(reducibilityReport.warnings || [])
      ])
    ];

    const weaknessMarkers = [
      ...new Set(
        BRIDGE_PREDICATE_IDS.flatMap((predicateId) =>
          buildCoordinateDetails({
            reportRefs: PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS,
            baselineReports,
            reducibilitySupport,
            interventionSupport
          })[predicateId].weakness_markers
        )
      )
    ];
    const uncertaintyMarkers = [
      ...new Set(
        BRIDGE_PREDICATE_IDS.flatMap((predicateId) =>
          buildCoordinateDetails({
            reportRefs: PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS,
            baselineReports,
            reducibilitySupport,
            interventionSupport
          })[predicateId].uncertainty_markers
        )
      )
    ];

    const runId = 'bpfm3_bridge_root_baseline';
    const coordinateDetails = buildCoordinateDetails({
      reportRefs: PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS,
      baselineReports,
      reducibilitySupport,
      interventionSupport
    });

    const projectionSurfaceSpec = getSurfaceSpec('phenomenal_bridge_projection.json');
    const gateSurfaceSpec = getSurfaceSpec('phenomenal_bridge_gate_result.json');
    const manifestSurfaceSpec = getSurfaceSpec('phenomenal_bridge_manifest.json');

    const projection = {
      artifact_role: 'phenomenal_bridge_projection',
      artifact_name: 'phenomenal_bridge_projection.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
      layer_version: ROOT_LAYER_VERSION,
      estimator_version: ROOT_ESTIMATOR_VERSION,
      implementation_status: ROOT_IMPLEMENTATION_STATUS,
      bridge_status: 'framework_internal_bridge_root_projection',
      run_id: runId,
      coordinate_estimates: coordinateEstimates,
      coordinate_details: coordinateDetails,
      bridge_functional: {
        symbol: 'Phi_bpf',
        formula:
          'exp(sum_i w_i * log(max(s_i, 1e-6))) over Pi_D, Pi_V, Pi_W, Pi_A, Pi_E, Pi_T, R_b, Delta_b',
        weights: clone(this.functionalWeights),
        value: phiBpf,
        not_the_gate: true
      },
      bridge_gate_preview: {
        symbol: 'Gamma_bpf',
        formula: 'min(Pi_D, Pi_V, Pi_W, Pi_A, Pi_E, Pi_T, R_b, Delta_b)',
        value: gammaBpf
      },
      bridge_intervention_status_summary: {
        profile_status: interventionProfile.profile_status,
        targeted_bridge_drop: interventionProfile.targeted_bridge_drop,
        collateral_damage: interventionProfile.collateral_damage,
        intervention_selectivity: interventionProfile.intervention_selectivity,
        normalized_support: interventionSupport.normalized_support,
        comparison_supported: interventionStatus.comparison_supported
      },
      bridge_reducibility_status_summary: {
        classification: reducibilityReport.classification,
        bridge_irreducibility_margin: reducibilityReport.bridge_irreducibility_margin,
        best_weak_rival:
          reducibilityReport.best_weak_rival?.id
          || reducibilityReport.best_weak_rival?.rival_id
          || null,
        best_bridge_composite:
          reducibilityReport.best_bridge_composite?.id
          || reducibilityReport.best_bridge_composite?.composite_id
          || null,
        normalized_support: reducibilitySupport.normalized_support,
        comparison_supported: reducibilityReport.comparison_supported
      },
      weakness_markers: weaknessMarkers,
      uncertainty_markers: uncertaintyMarkers,
      warnings,
      boundary_flags: {
        framework_internal_only: true,
        not_bridge_public_claim: true,
        not_bridge_support: true,
        not_phenomenality_evidence: true,
        not_human_equivalence: true,
        not_external_validation: true
      },
      allowed_surfaces: clone(projectionSurfaceSpec.allowed_surfaces || []),
      blocked_surfaces: clone(projectionSurfaceSpec.blocked_surfaces || []),
      interpretation_boundary: PROJECTION_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        baseline_bundle_refs: clone(baselineBundle.refs || {}),
        baseline_report_refs: clone(PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS),
        intervention_profile_ref:
          'artifacts/phenomenal_bridge/bpfm2/bridge_intervention_profile.json',
        reducibility_report_ref:
          'artifacts/phenomenal_bridge/bpfm2/bridge_reducibility_report.json',
        current_lineage: currentLineage
      },
      schema_ref: PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.root_schema_refs?.['phenomenal_bridge_projection.json']
    };

    const gateResult = {
      artifact_role: 'phenomenal_bridge_gate_result',
      artifact_name: 'phenomenal_bridge_gate_result.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
      layer_version: ROOT_LAYER_VERSION,
      estimator_version: ROOT_ESTIMATOR_VERSION,
      implementation_status: ROOT_IMPLEMENTATION_STATUS,
      bridge_status: 'framework_internal_bridge_gate',
      run_id: runId,
      gate_inputs: coordinateEstimates,
      threshold_values: {
        coordinate_thresholds: clone(this.coordinateThresholds),
        global_thresholds: clone(this.globalThresholds),
        strong_support_thresholds: clone(this.strongSupportThresholds)
      },
      local_threshold_results: localThresholdResults,
      global_threshold_results: globalThresholdResults,
      gate_status: gatePass ? 'pass' : 'fail',
      gate_definition: {
        symbol: 'Gamma_bpf',
        non_compensatory: true,
        functional_is_not_gate: true,
        hard_requirements: [
          'all_coordinate_thresholds_pass',
          'gamma_threshold_pass',
          'phi_threshold_pass',
          'reducibility_comparison_supported',
          'intervention_profile_supported',
          'no_lineage_invalidation',
          'no_drift_invalidation'
        ]
      },
      classification,
      invalidation_reasons: invalidationReasons,
      drift_status: driftStatus,
      lineage_status: lineageStatus,
      comparator_status: {
        comparison_supported: reducibilityReport.comparison_supported,
        classification: reducibilityReport.classification,
        normalized_support: reducibilitySupport.normalized_support
      },
      intervention_status: {
        comparison_supported: interventionStatus.comparison_supported,
        status: interventionStatus.status,
        normalized_support: interventionSupport.normalized_support
      },
      warnings,
      non_implications: [
        'No external validation follows from this gate result.',
        'No human phenomenal equivalence follows from this gate result.',
        'No metaphysical closure follows from this gate result.',
        'No candidate or audit inclusion may be read as public proof.'
      ],
      allowed_surfaces: clone(gateSurfaceSpec.allowed_surfaces || []),
      blocked_surfaces: clone(gateSurfaceSpec.blocked_surfaces || []),
      interpretation_boundary: GATE_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        projection_ref: ROOT_BRIDGE_ARTIFACT_REFS.projection,
        baseline_report_refs: clone(PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS),
        intervention_profile_ref:
          'artifacts/phenomenal_bridge/bpfm2/bridge_intervention_profile.json',
        reducibility_report_ref:
          'artifacts/phenomenal_bridge/bpfm2/bridge_reducibility_report.json',
        current_lineage: currentLineage
      },
      schema_ref: PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.root_schema_refs?.['phenomenal_bridge_gate_result.json']
    };

    const manifest = {
      artifact_role: 'phenomenal_bridge_manifest',
      artifact_name: 'phenomenal_bridge_manifest.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm3',
      layer_version: ROOT_LAYER_VERSION,
      estimator_version: ROOT_ESTIMATOR_VERSION,
      implementation_status: ROOT_IMPLEMENTATION_STATUS,
      bridge_status: 'framework_internal_bridge_root_manifest',
      run_id: runId,
      support_class: classification,
      authority_status: 'authoritative_when_emitted_in_bpfm3',
      threshold_binding_status: PHENOMENAL_BRIDGE_THRESHOLDS.status,
      protocol_ref: BRIDGE_SYSTEM_FILES.protocol,
      threshold_ref: BRIDGE_SYSTEM_FILES.thresholds,
      rival_family_ref: BRIDGE_SYSTEM_FILES.rival_family,
      surface_policy_ref: BRIDGE_SYSTEM_FILES.surface_policy,
      artifact_schema_ref: BRIDGE_SYSTEM_FILES.artifact_schema,
      artifact_inventory: buildManifestInventory(ROOT_BRIDGE_ARTIFACT_REFS),
      projection_snapshot: {
        coordinate_estimates: coordinateEstimates,
        Phi_bpf: phiBpf,
        Gamma_bpf: gammaBpf
      },
      lineage: currentLineage,
      source_shas: {
        qicn_system_head: currentLineage.qicn_system.head,
        qicn_release_head: currentLineage.qicn_release.head
      },
      drift_sensitive_refs: {
        protocol: currentLineage.protocol,
        thresholds: currentLineage.thresholds,
        rival_family: currentLineage.rival_family,
        surface_policy: currentLineage.surface_policy,
        artifact_schema: currentLineage.artifact_schema
      },
      authority_notes: [
        'Bridge root artifacts are authoritative only inside the framework-internal bridge layer.',
        'Bridge root artifacts remain subordinate to surface policy, threshold lineage, rival-family lineage, and drift invalidation.'
      ],
      bounded_interpretation_notes: [
        'Support class is an internal bridge classification only.',
        'Bridge gate pass does not imply phenomenality achieved.',
        'Bridge gate pass does not imply external validation or human equivalence.'
      ],
      warnings,
      allowed_surfaces: clone(manifestSurfaceSpec.allowed_surfaces || []),
      blocked_surfaces: clone(manifestSurfaceSpec.blocked_surfaces || []),
      interpretation_boundary: MANIFEST_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        baseline_bundle_refs: clone(baselineBundle.refs || {}),
        current_lineage: currentLineage
      },
      schema_ref: PHENOMENAL_BRIDGE_ARTIFACT_SCHEMA.root_schema_refs?.['phenomenal_bridge_manifest.json']
    };

    const towerBridgeVerification = runFullBodyWorldBridgeVerification();

    return {
      projection,
      gate_result: gateResult,
      manifest,
      coordinate_estimates: coordinateEstimates,
      phi_bpf: phiBpf,
      gamma_bpf: gammaBpf,
      classification,
      gate_pass: gatePass,
      mathematical_tower_verification: towerBridgeVerification
    };
  }

  writeArtifacts(input = {}, outputDir = ROOT_OUTPUT_DIR) {
    fs.mkdirSync(outputDir, { recursive: true });
    const previousManifestPath = path.join(outputDir, 'phenomenal_bridge_manifest.json');
    const previousManifest = fs.existsSync(previousManifestPath)
      ? readJson(previousManifestPath)
      : null;
    const result = this.evaluate({
      ...input,
      previousManifest: input.previousManifest || previousManifest
    });

    const outputPaths = {
      projection: path.join(outputDir, 'phenomenal_bridge_projection.json'),
      gate_result: path.join(outputDir, 'phenomenal_bridge_gate_result.json'),
      manifest: path.join(outputDir, 'phenomenal_bridge_manifest.json')
    };

    writeJson(outputPaths.projection, result.projection);
    writeJson(outputPaths.gate_result, result.gate_result);
    writeJson(outputPaths.manifest, result.manifest);

    return {
      ...result,
      outputs: outputPaths
    };
  }
}

export const createPhenomenalBridgeGateEvaluator = (options = {}) =>
  new PhenomenalBridgeGateEvaluator(options);

export default {
  PhenomenalBridgeGateEvaluator,
  createPhenomenalBridgeGateEvaluator
};
