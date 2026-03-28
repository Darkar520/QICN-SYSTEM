import fs from 'fs';
import path from 'path';

import { createSubjectiveValuationEngine } from './SubjectiveValuationEngine.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const INTERVENTION_SCHEMA_REF =
  'src/subjectivity/schemas/subjectivity_intervention_profile.v1.json';
const INTERVENTION_ARTIFACT_VERSION = '1.0.0';
const INTERVENTION_LAYER_VERSION =
  'subjectivity_runtime_layer.srt3.intervention.v1';
const INTERVENTION_RUNTIME_STATUS =
  'implemented_internal_support_pre_comparator';
const INTERVENTION_BOUNDARY =
  'Framework-internal only; pre-comparator intervention profile diagnostic, not externally validated, not sufficient for subjectivity claim, not equivalent to a complete intervention family, not equivalent to human valuational life.';

const DEFAULT_OPTIONS = Object.freeze({
  targetedDropThreshold: 0.1,
  informativeDropThreshold: 0.05,
  collateralDamageThreshold: 0.25
});

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

export class SubjectivityInterventionHarness {
  constructor(options = {}) {
    this.options = Object.freeze({
      targetedDropThreshold:
        options.targetedDropThreshold ?? DEFAULT_OPTIONS.targetedDropThreshold,
      informativeDropThreshold:
        options.informativeDropThreshold ??
        DEFAULT_OPTIONS.informativeDropThreshold,
      collateralDamageThreshold:
        options.collateralDamageThreshold ??
        DEFAULT_OPTIONS.collateralDamageThreshold
    });
    this.valuationEngine = createSubjectiveValuationEngine(
      options.valuationOptions || {}
    );
  }

  summarizeArtifact(artifact) {
    const selfMean = Number(artifact?.self_weight_summary?.mean_weight) || 0;
    const nonselfMean = Number(artifact?.nonself_weight_summary?.mean_weight) || 0;
    return {
      valuation_margin: Number(artifact?.valuation_asymmetry_margin) || 0,
      weighting_classification:
        artifact?.weighting_classification || 'neutral_or_flat',
      combined_weight: selfMean + nonselfMean
    };
  }

  classifyRun(run, baselineSummary, { controlRun = false } = {}) {
    const summary = this.summarizeArtifact(run.artifact);
    const targetedCoordinateDrop =
      baselineSummary.valuation_margin - summary.valuation_margin;
    const collateralDamage = Math.abs(
      baselineSummary.combined_weight - summary.combined_weight
    );
    const interventionSelectivity =
      targetedCoordinateDrop > 0
        ? clampUnit(
            targetedCoordinateDrop /
              (targetedCoordinateDrop + collateralDamage + 0.000001)
          )
        : 0;

    const aliasingFlag = Boolean(run.artifact?.aliasing_warning?.flag);
    const rewardAliasingLike =
      run.mode === 'reward_aliasing_control' &&
      (aliasingFlag ||
        targetedCoordinateDrop < this.options.informativeDropThreshold);
    let profileStatus = 'non_informative_perturbation';
    let controlConfoundFlag = false;

    if (controlRun && rewardAliasingLike) {
      profileStatus = 'control_confounded_perturbation';
      controlConfoundFlag = true;
    } else if (
      run.mode === 'nonselective_damage_control' &&
      collateralDamage >= this.options.collateralDamageThreshold
    ) {
      profileStatus = 'flat_damage';
    } else if (
      targetedCoordinateDrop >= this.options.targetedDropThreshold &&
      collateralDamage <= this.options.collateralDamageThreshold
    ) {
      profileStatus = 'selective_drop';
    } else if (
      targetedCoordinateDrop < this.options.informativeDropThreshold &&
      collateralDamage < this.options.collateralDamageThreshold
    ) {
      profileStatus = 'non_informative_perturbation';
    } else if (collateralDamage > targetedCoordinateDrop) {
      profileStatus = 'flat_damage';
    }

    return {
      intervention_name: run.interventionName,
      valuation_mode: run.mode,
      targeted_coordinate: 'ValuationAsymmetry',
      valuation_margin_before: baselineSummary.valuation_margin,
      valuation_margin_after: summary.valuation_margin,
      weighting_classification_after: summary.weighting_classification,
      targeted_coordinate_drop: targetedCoordinateDrop,
      collateral_damage: collateralDamage,
      intervention_selectivity: interventionSelectivity,
      control_confound_flag: controlConfoundFlag,
      profile_status: profileStatus,
      aliasing_warning: run.artifact?.aliasing_warning || null,
      warnings: run.artifact?.warnings || []
    };
  }

  run(input = {}) {
    const runId =
      typeof input.run_id === 'string' && input.run_id.trim()
        ? input.run_id.trim()
        : `intervention-${Date.now()}`;

    const baselineArtifact = this.valuationEngine.evaluate({
      ...input,
      run_id: `${runId}_baseline`,
      valuation_mode: 'baseline',
      provenance: {
        ...input.provenance,
        input_profile:
          input.provenance?.input_profile || 'srt3_intervention_baseline'
      }
    });
    const baselineSummary = this.summarizeArtifact(baselineArtifact);

    const interventionRuns = [
      {
        interventionName: 'self_nonself_valuation_inversion',
        mode: 'self_nonself_valuation_inversion'
      },
      {
        interventionName: 'risk_consequence_reassignment',
        mode: 'risk_consequence_reassignment'
      }
    ].map((definition) => ({
      ...definition,
      artifact: this.valuationEngine.evaluate({
        ...input,
        run_id: `${runId}_${definition.mode}`,
        valuation_mode: definition.mode,
        control_mode: definition.mode,
        provenance: {
          ...input.provenance,
          input_profile: 'srt3_intervention_run'
        }
      })
    }));

    const negativeControlRuns = [
      {
        interventionName: 'reward_aliasing_control',
        mode: 'reward_aliasing_control'
      },
      {
        interventionName: 'nonselective_damage_control',
        mode: 'nonselective_damage_control'
      }
    ].map((definition) => ({
      ...definition,
      artifact: this.valuationEngine.evaluate({
        ...input,
        run_id: `${runId}_${definition.mode}`,
        valuation_mode: definition.mode,
        control_mode: definition.mode,
        provenance: {
          ...input.provenance,
          input_profile: 'srt3_intervention_control'
        }
      })
    }));

    const classifiedInterventions = interventionRuns.map((run) =>
      this.classifyRun(run, baselineSummary)
    );
    const classifiedControls = negativeControlRuns.map((run) =>
      this.classifyRun(run, baselineSummary, { controlRun: true })
    );

    return {
      artifact_role: 'subjectivity_intervention_profile',
      artifact_version: INTERVENTION_ARTIFACT_VERSION,
      schema_version: INTERVENTION_ARTIFACT_VERSION,
      layer_version: INTERVENTION_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: INTERVENTION_RUNTIME_STATUS,
      run_id: runId,
      baseline_reference: {
        valuation_run_id: baselineArtifact.run_id,
        valuation_asymmetry_margin: baselineSummary.valuation_margin,
        weighting_classification: baselineSummary.weighting_classification
      },
      intervention_runs: classifiedInterventions,
      negative_control_runs: classifiedControls,
      aggregate_profile: {
        selective_drop_count: classifiedInterventions.filter(
          (run) => run.profile_status === 'selective_drop'
        ).length,
        flat_damage_count: [...classifiedInterventions, ...classifiedControls].filter(
          (run) => run.profile_status === 'flat_damage'
        ).length,
        non_informative_count: [...classifiedInterventions, ...classifiedControls].filter(
          (run) => run.profile_status === 'non_informative_perturbation'
        ).length,
        control_confounded_count: classifiedControls.filter(
          (run) => run.profile_status === 'control_confounded_perturbation'
        ).length
      },
      warnings: [
        ...(baselineArtifact?.warnings || []),
        ...classifiedControls
          .filter((run) => run.profile_status === 'control_confounded_perturbation')
          .map((run) => `${run.intervention_name}:control_confounded`)
      ],
      interpretation_boundary: INTERVENTION_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: 'docs/subjectivity_protocol.v1.json',
        valuation_ref: 'subjective_valuation_report.json',
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt3_intervention_minimal'
      },
      schema_ref: INTERVENTION_SCHEMA_REF
    };
  }

  writeArtifact(input, outputPath) {
    const artifact = this.run(input);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, `${JSON.stringify(artifact, null, 2)}\n`, 'utf8');
    return artifact;
  }
}

export const createSubjectivityInterventionHarness = (options = {}) =>
  new SubjectivityInterventionHarness(options);

export default {
  SubjectivityInterventionHarness,
  createSubjectivityInterventionHarness
};
