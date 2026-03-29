import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  buildActualBridgeComparisonTarget,
  buildAdmissiblePhenomenalBridgeComposites,
  computePhenomenalBridgeLoss,
  PHENOMENAL_BRIDGE_LOSS_WEIGHTS,
  PHENOMENAL_BRIDGE_COMPLEXITY_POLICY,
  PHENOMENAL_BRIDGE_RIVAL_MODELS
} from './PhenomenalBridgeComparatorFamily.js';
import {
  ensurePhenomenalBridgeBaselineReports,
  loadPhenomenalBridgeBaselineInputBundle,
  PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS
} from './PhenomenalBridgeInputBundleLoader.js';
import {
  createPhenomenalBridgeInterventionHarness,
  getPhenomenalBridgeAdversarialArtifactDir
} from './PhenomenalBridgeInterventionHarness.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..', '..');

const writeJson = (targetPath, payload) =>
  fs.writeFileSync(targetPath, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');

const buildStrongModelPrediction = ({ baselineReports, interventionProfile }) => ({
  predicted_baseline_estimates: Object.fromEntries(
    Object.entries(baselineReports).map(([, report]) => [report.predicate_id, report.provisional_estimate])
  ),
  predicted_runs: Object.fromEntries(
    [...(interventionProfile.intervention_runs || []), ...(interventionProfile.negative_control_runs || [])].map(
      (run) => [
        run.intervention_id,
        {
          targeted_bridge_drop: run.targeted_bridge_drop,
          collateral_damage: run.collateral_damage,
          intervention_selectivity: run.intervention_selectivity
        }
      ]
    )
  ),
  complexity_profile: {
    mechanism_count: 6,
    composite_size: 1,
    auxiliary_latent_flexibility: 0.22,
    narrative_decoder_slack: 0.1,
    bookkeeping_convenience: 0.12,
    ambiguity_absorption_capacity: 0.18
  }
});

export class PhenomenalBridgeReducibilityComparator {
  constructor({ interventionHarness = createPhenomenalBridgeInterventionHarness() } = {}) {
    this.interventionHarness = interventionHarness;
  }

  buildReducibilityReport({
    baselineBundle = loadPhenomenalBridgeBaselineInputBundle(),
    baselineReportResult = ensurePhenomenalBridgeBaselineReports(),
    interventionProfile = this.interventionHarness.buildProfile({
      baselineBundle,
      baselineReportResult
    })
  } = {}) {
    const baselineReports = baselineReportResult.reports;
    const actualTarget = buildActualBridgeComparisonTarget({
      baselineReports,
      interventionProfile
    });

    const strongModel = buildStrongModelPrediction({ baselineReports, interventionProfile });
    const strongModelLoss = computePhenomenalBridgeLoss({
      modelPrediction: strongModel,
      actualTarget,
      complexityProfile: strongModel.complexity_profile
    });

    const rivalComparisons = PHENOMENAL_BRIDGE_RIVAL_MODELS.map((model) => {
      const prediction = model.predict({ bundle: baselineBundle, baselineReports, interventionProfile });
      const loss = computePhenomenalBridgeLoss({
        modelPrediction: prediction,
        actualTarget,
        complexityProfile: model.complexity_profile
      });
      return {
        rival_id: model.id,
        targeted_predicates: model.targetedPredicates,
        complexity_profile: model.complexity_profile,
        loss
      };
    });

    const compositeComparisons = buildAdmissiblePhenomenalBridgeComposites({
      bundle: baselineBundle,
      baselineReports,
      interventionProfile
    }).map((composite) => ({
      composite_id: composite.id,
      components: composite.components,
      lhs_weight: composite.lhs_weight,
      rhs_weight: composite.rhs_weight,
      implemented_scope: composite.implemented_scope,
      complexity_profile: composite.complexity_profile,
      loss: computePhenomenalBridgeLoss({
        modelPrediction: composite,
        actualTarget,
        complexityProfile: composite.complexity_profile
      })
    }));

    const bestWeakRival = rivalComparisons.reduce((best, current) =>
      !best || current.loss.total_loss < best.loss.total_loss ? current : best
    , null);
    const bestWeakComposite = compositeComparisons.reduce((best, current) =>
      !best || current.loss.total_loss < best.loss.total_loss ? current : best
    , null);

    const comparisonSupported =
      interventionProfile.comparison_readiness === true
      && (interventionProfile.intervention_runs || []).length >= 6
      && (interventionProfile.negative_control_runs || []).length >= 8
      && !interventionProfile.confound_flags.includes('non_informative_target_drop');

    const bridgeIrreducibilityMargin = Number(
      (
        Math.min(
          bestWeakRival?.loss?.total_loss ?? Number.POSITIVE_INFINITY,
          bestWeakComposite?.loss?.total_loss ?? Number.POSITIVE_INFINITY
        ) - strongModelLoss.total_loss
      ).toFixed(12)
    );

    let classification = 'bridge_comparison_unsupported';
    const warnings = [];
    if (!comparisonSupported) {
      warnings.push('comparison_support_not_satisfied');
    } else if ((bestWeakRival?.loss?.total_loss ?? Infinity) <= strongModelLoss.total_loss + 0.015) {
      classification = 'bridge_weak_model_sufficient';
      warnings.push('best_weak_rival_matches_strong_model_within_margin');
    } else if ((bestWeakComposite?.loss?.total_loss ?? Infinity) <= strongModelLoss.total_loss + 0.015) {
      classification = 'bridge_weak_composite_sufficient';
      warnings.push('best_weak_composite_matches_strong_model_within_margin');
    } else if (bridgeIrreducibilityMargin < 0.03) {
      classification = 'bridge_irreducibility_not_supported';
      warnings.push('bridge_irreducibility_margin_below_reporting_floor');
    } else {
      classification = 'bridge_partial_irreducibility_support';
    }

    return {
      artifact_role: 'bridge_reducibility_report',
      artifact_name: 'bridge_reducibility_report.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      bridge_layer_id: 'phenomenal_bridge_formal_layer.bpfm2',
      implementation_status: 'bpfm2_adversarial_pre_gate',
      runtime_status: 'bridge_reducibility_runtime_implemented_pre_gate',
      baseline_bridge_bundle_reference: {
        bridge_report_refs: { ...PHENOMENAL_BRIDGE_BASELINE_REPORT_REFS },
        baseline_run_id: baselineBundle.run_id
      },
      bridge_intervention_profile_reference: {
        artifact_name: 'bridge_intervention_profile.json',
        profile_status: interventionProfile.profile_status,
        comparison_readiness: interventionProfile.comparison_readiness
      },
      implemented_rivals: rivalComparisons.map((entry) => entry.rival_id),
      implemented_composite_scope: 'pairwise_bridge_composites_with_weight_grid_0.35_0.50_0.65',
      implemented_loss_family: {
        formula: 'L_b(M)=w_f e_fit + w_i e_intervention + w_s e_selectivity + w_p e_Pi + w_c Omega(M)',
        weights: PHENOMENAL_BRIDGE_LOSS_WEIGHTS,
        complexity_policy: PHENOMENAL_BRIDGE_COMPLEXITY_POLICY
      },
      strong_model_loss: strongModelLoss,
      best_weak_rival: bestWeakRival,
      best_weak_rival_loss: bestWeakRival?.loss?.total_loss ?? null,
      best_bridge_composite: bestWeakComposite,
      best_bridge_composite_loss: bestWeakComposite?.loss?.total_loss ?? null,
      bridge_irreducibility_margin: bridgeIrreducibilityMargin,
      comparison_supported: comparisonSupported,
      classification,
      warnings,
      boundary_flags: {
        framework_internal_only: true,
        not_bridge_support: true,
        not_phenomenality_evidence: true,
        pre_gate_bridge_artifact: true,
        pre_ecosystem_bridge_artifact: true
      },
      non_implications: [
        'not_bridge_support',
        'not_bridge_admissibility',
        'not_phenomenality_evidence',
        'not_external_validation'
      ],
      allowed_surfaces: ['developer_inspection_surface', 'local_artifact_surface'],
      blocked_surfaces: [
        'local_report_surface',
        'internal_release_bundle_surface',
        'ecosystem_candidate_surface',
        'audit_facing_package_surface',
        'controlled_statement_surface',
        'external_claim_facing_surface'
      ],
      interpretation_boundary:
        'BPF-M2 reducibility comparison is an adversarial bridge burden only. It compares provisional bridge organization against weak bridge rivals and admissible composites, but it does not implement a bridge gate, a bridge root verdict, bridge admissibility, phenomenality evidence, or any candidate or audit-facing bridge conclusion.',
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/phenomenal_bridge_protocol.v1.json',
        rival_family_ref: 'docs/phenomenal_bridge_rival_family.v1.json',
        surface_policy_ref: 'docs/phenomenal_bridge_surface_policy.v1.json',
        artifact_schema_ref: 'docs/phenomenal_bridge_artifact_schema.v1.json',
        intervention_harness_ref: 'src/phenomenal_bridge/PhenomenalBridgeInterventionHarness.js',
        comparator_family_ref: 'src/phenomenal_bridge/PhenomenalBridgeComparatorFamily.js',
        reducibility_comparator_ref:
          'src/phenomenal_bridge/PhenomenalBridgeReducibilityComparator.js'
      },
      schema_ref: 'src/phenomenal_bridge/schemas/bridge_reducibility_report.v1.json'
    };
  }

  writeReducibilityReport(options = {}, outputDir = getPhenomenalBridgeAdversarialArtifactDir()) {
    const report = this.buildReducibilityReport(options);
    fs.mkdirSync(outputDir, { recursive: true });
    const targetPath = path.join(outputDir, 'bridge_reducibility_report.json');
    writeJson(targetPath, report);
    return {
      output_dir: outputDir,
      report,
      output_path: targetPath
    };
  }
}

export const createPhenomenalBridgeReducibilityComparator = (options) =>
  new PhenomenalBridgeReducibilityComparator(options);

export default {
  PhenomenalBridgeReducibilityComparator,
  createPhenomenalBridgeReducibilityComparator
};
