import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import {
  SUBJECTIVITY_PROTOCOL_MANIFEST,
  SUBJECTIVITY_ARTIFACT_SCHEMA
} from './SubjectivityArtifactRegistry.js';
import { SUBJECTIVITY_SURFACE_POLICY } from './SubjectivitySurfacePolicy.js';
import { SUBJECTIVITY_THRESHOLDS } from './SubjectivityThresholdRegistry.js';
import { SUBJECTIVITY_RIVAL_FAMILY } from './SubjectivityRivalFamilyRegistry.js';

const PAPER_SOURCE = Object.freeze({
  paper_id: 'paper8_first_person_subjectivity',
  title:
    'First-Person Indexed Subjectivity: Self-Binding, Ownership, Continuity, Irreducibility, and Cross-Substrate Consequence in a Causally Rigid Framework',
  source_path: 'rigid-identity-framework/paper8_first_person_subjectivity/main.tex'
});

const MODULE_DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(MODULE_DIR, '..', '..');

const PROTOCOL_REF = 'docs/subjectivity_protocol.v1.json';
const THRESHOLDS_REF = 'docs/subjectivity_thresholds.v1.json';
const SURFACE_POLICY_REF = 'docs/subjectivity_surface_policy.v1.json';
const ARTIFACT_SCHEMA_REF = 'docs/subjectivity_artifact_schema.v1.json';
const RIVAL_FAMILY_REF = 'docs/subjectivity_rival_family.v1.json';

const PROJECTION_SCHEMA_REF =
  'src/subjectivity/schemas/subjectivity_runtime_projection.v1.json';
const GATE_SCHEMA_REF =
  'src/subjectivity/schemas/subjectivity_gate_result.v1.json';
const MANIFEST_SCHEMA_REF =
  'src/subjectivity/schemas/subjectivity_manifest.v1.json';

const GATE_ARTIFACT_VERSION = '1.0.0';
const GATE_LAYER_VERSION = 'subjectivity_runtime_layer.srt5.gate.v1';
const ESTIMATOR_VERSION = 'subjectivity_runtime_estimators.srt5.v1';
const GATE_RUNTIME_STATUS = 'implemented_internal_gate_closure_in_srt5';

const PROJECTION_BOUNDARY =
  'Framework-internal only; normalized subjectivity-coordinate projection over SRT-5 available artifacts, not externally validated, not human equivalence, not phenomenality closure, not claim-facing evidence.';
const GATE_BOUNDARY =
  'Framework-internal only; final internal subjectivity gate verdict over SRT-5 available artifacts, not externally validated, not human equivalence, not phenomenality closure, not metaphysical closure, not sufficient for claim-facing promotion.';
const MANIFEST_BOUNDARY =
  'Framework-internal only; subjectivity bundle lineage and support-class manifest for SRT-5, not externally validated, not human equivalence, not phenomenality closure, not claim-facing evidence.';

const COORDINATE_KEYS = Object.freeze([
  'SelfIndex',
  'OwnershipField',
  'ContinuityField',
  'FirstPersonPerspective',
  'ValuationAsymmetry',
  'InterventionProfile',
  'IrreducibilityMargin'
]);

const COORDINATE_SYMBOLS = Object.freeze({
  SelfIndex: 'I',
  OwnershipField: 'O',
  ContinuityField: 'C',
  FirstPersonPerspective: 'P',
  ValuationAsymmetry: 'V',
  InterventionProfile: 'Delta',
  IrreducibilityMargin: 'R'
});

const ARTIFACT_NAMES = Object.freeze({
  SelfIndex: 'self_index_state.json',
  OwnershipField: 'ownership_attribution_report.json',
  ContinuityField: 'subjective_continuity_report.json',
  FirstPersonPerspective: 'first_person_perspective_report.json',
  ValuationAsymmetry: 'subjective_valuation_report.json',
  InterventionProfile: 'subjectivity_intervention_profile.json',
  IrreducibilityMargin: 'subjectivity_reducibility_report.json'
});

const DEFAULT_OPTIONS = Object.freeze({
  functionalWeights: {
    SelfIndex: 0.15,
    OwnershipField: 0.15,
    ContinuityField: 0.12,
    FirstPersonPerspective: 0.12,
    ValuationAsymmetry: 0.14,
    InterventionProfile: 0.16,
    IrreducibilityMargin: 0.16
  },
  localThresholdFallback: 0.5,
  gammaThresholdFallback: 0.5,
  phiThresholdFallback: 0.55,
  strongSupportThresholds: {
    Gamma_subj: 0.7,
    Phi_subj: 0.68
  }
});

const clampUnit = (value) => {
  if (!Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
};

const safeMean = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

const hashFileRelative = (relativePath) => {
  const buffer = fs.readFileSync(path.join(ROOT, relativePath));
  return crypto.createHash('sha256').update(buffer).digest('hex');
};

const normalizeText = (value) =>
  typeof value === 'string' && value.trim() ? value.trim() : null;

const stabilityHintScore = (hint) => {
  if (hint === 'stable') return 1;
  if (hint === 'weakly_stable') return 0.65;
  if (hint === 'unstable') return 0.2;
  return 0.35;
};

const continuityStatusScore = (status) => {
  if (status === 'continuity_sufficient') return 1;
  if (status === 'continuity_ambiguous') return 0.55;
  if (status === 'fork') return 0.35;
  if (status === 'fracture') return 0.12;
  if (status === 'insufficient_history') return 0.05;
  return 0;
};

const perspectiveStatusScore = (status) => {
  if (status === 'minimal_support') return 1;
  if (status === 'no_difference') return 0.4;
  if (status === 'failure') return 0.08;
  return 0.25;
};

const valuationClassScore = (classification) => {
  if (classification === 'self-preserving') return 1;
  if (classification === 'neutral_or_flat') return 0.35;
  if (classification === 'non-self-preserving') return 0.12;
  return 0.2;
};

const inversionResponseScore = (status) => {
  if (status === 'responsive') return 1;
  if (status === 'weak_or_absorbed') return 0.35;
  return 0;
};

const reducibilityClassScore = (classification) => {
  if (classification === 'partial_irreducibility_support') return 0.8;
  if (classification === 'irreducibility_not_yet_supported') return 0.4;
  if (classification === 'weak_model_sufficient') return 0.05;
  if (classification === 'weak_hybrid_sufficient') return 0.02;
  return 0;
};

const ensureArray = (value) => (Array.isArray(value) ? value : []);

const clone = (value) => JSON.parse(JSON.stringify(value));

const normalizeWeights = (weights) => {
  const sanitized = {};
  let total = 0;
  for (const key of COORDINATE_KEYS) {
    const value = Number(weights?.[key]);
    const positiveValue = Number.isFinite(value) && value > 0 ? value : 0;
    sanitized[key] = positiveValue;
    total += positiveValue;
  }

  if (total <= 0) {
    const uniform = 1 / COORDINATE_KEYS.length;
    return Object.fromEntries(COORDINATE_KEYS.map((key) => [key, uniform]));
  }

  return Object.fromEntries(
    COORDINATE_KEYS.map((key) => [key, sanitized[key] / total])
  );
};

const buildRootSchemaHashes = () => {
  const relevantRootSchemas = [
    'subjectivity_manifest.json',
    'subjectivity_runtime_projection.json',
    'subjectivity_gate_result.json',
    'subjectivity_reducibility_report.json'
  ];

  return Object.fromEntries(
    relevantRootSchemas.map((artifactName) => {
      const ref = SUBJECTIVITY_ARTIFACT_SCHEMA.root_schema_refs?.[artifactName];
      return [
        artifactName,
        {
          ref,
          sha256: ref ? hashFileRelative(ref) : null
        }
      ];
    })
  );
};

export class SubjectivityGateEvaluator {
  constructor(options = {}) {
    this.coordinateThresholds = Object.freeze({
      ...SUBJECTIVITY_THRESHOLDS.coordinate_thresholds
    });
    this.globalThresholds = Object.freeze({
      ...SUBJECTIVITY_THRESHOLDS.global_thresholds
    });
    this.driftTolerances = Object.freeze({
      ...SUBJECTIVITY_THRESHOLDS.drift_tolerances
    });
    this.functionalWeights = Object.freeze(
      normalizeWeights(
        options.functionalWeights ||
          SUBJECTIVITY_THRESHOLDS.functional_weights ||
          DEFAULT_OPTIONS.functionalWeights
      )
    );
    this.strongSupportThresholds = Object.freeze({
      ...DEFAULT_OPTIONS.strongSupportThresholds,
      ...(SUBJECTIVITY_THRESHOLDS.support_class_thresholds?.subjectivity_internal_strong_support ||
        {})
    });
    this.options = Object.freeze({
      localThresholdFallback:
        options.localThresholdFallback ??
        DEFAULT_OPTIONS.localThresholdFallback,
      gammaThresholdFallback:
        options.gammaThresholdFallback ??
        DEFAULT_OPTIONS.gammaThresholdFallback,
      phiThresholdFallback:
        options.phiThresholdFallback ?? DEFAULT_OPTIONS.phiThresholdFallback
    });
  }

  captureCurrentLineage() {
    return {
      estimator_version: ESTIMATOR_VERSION,
      layer_version: GATE_LAYER_VERSION,
      protocol: {
        ref: PROTOCOL_REF,
        sha256: hashFileRelative(PROTOCOL_REF)
      },
      thresholds: {
        ref: THRESHOLDS_REF,
        sha256: hashFileRelative(THRESHOLDS_REF)
      },
      rival_family: {
        ref: RIVAL_FAMILY_REF,
        sha256: hashFileRelative(RIVAL_FAMILY_REF)
      },
      surface_policy: {
        ref: SURFACE_POLICY_REF,
        sha256: hashFileRelative(SURFACE_POLICY_REF)
      },
      artifact_schema: {
        ref: ARTIFACT_SCHEMA_REF,
        sha256: hashFileRelative(ARTIFACT_SCHEMA_REF)
      },
      root_schema_hashes: buildRootSchemaHashes()
    };
  }

  compareLineage(expectedLineage) {
    const currentLineage = this.captureCurrentLineage();
    const mismatches = [];

    if (!expectedLineage) {
      return {
        expected_lineage: null,
        current_lineage: currentLineage,
        mismatch_reasons: mismatches,
        invalidated: false
      };
    }

    const compareHash = (expectedNode, currentNode, label) => {
      if (!expectedNode || !currentNode) {
        mismatches.push(`${label}:missing_lineage_node`);
        return;
      }
      if (normalizeText(expectedNode.ref) !== normalizeText(currentNode.ref)) {
        mismatches.push(`${label}:ref_mismatch`);
      }
      if (normalizeText(expectedNode.sha256) !== normalizeText(currentNode.sha256)) {
        mismatches.push(`${label}:hash_mismatch`);
      }
    };

    if (expectedLineage.estimator_version !== currentLineage.estimator_version) {
      mismatches.push('estimator_version_mismatch');
    }
    if (expectedLineage.layer_version !== currentLineage.layer_version) {
      mismatches.push('layer_version_mismatch');
    }

    compareHash(expectedLineage.protocol, currentLineage.protocol, 'protocol');
    compareHash(
      expectedLineage.thresholds,
      currentLineage.thresholds,
      'thresholds'
    );
    compareHash(
      expectedLineage.rival_family,
      currentLineage.rival_family,
      'rival_family'
    );
    compareHash(
      expectedLineage.surface_policy,
      currentLineage.surface_policy,
      'surface_policy'
    );
    compareHash(
      expectedLineage.artifact_schema,
      currentLineage.artifact_schema,
      'artifact_schema'
    );

    for (const artifactName of Object.keys(currentLineage.root_schema_hashes)) {
      compareHash(
        expectedLineage.root_schema_hashes?.[artifactName],
        currentLineage.root_schema_hashes[artifactName],
        `root_schema:${artifactName}`
      );
    }

    return {
      expected_lineage: expectedLineage,
      current_lineage: currentLineage,
      mismatch_reasons: mismatches,
      invalidated: mismatches.length > 0
    };
  }

  compareCoordinateDrift(expectedEstimates, currentEstimates) {
    const exceeded = [];
    if (!expectedEstimates) {
      return { compared: false, exceeded, invalidated: false };
    }

    for (const coordinateId of COORDINATE_KEYS) {
      const expectedValue = Number(expectedEstimates?.[coordinateId]?.estimate);
      const currentValue = Number(currentEstimates?.[coordinateId]?.estimate);
      const tolerance = Number(this.driftTolerances?.[coordinateId]) || 0;
      if (!Number.isFinite(expectedValue) || !Number.isFinite(currentValue)) {
        continue;
      }
      const absoluteDelta = Math.abs(currentValue - expectedValue);
      if (absoluteDelta > tolerance) {
        exceeded.push({
          coordinate_id: coordinateId,
          expected: expectedValue,
          current: currentValue,
          tolerance,
          absolute_delta: absoluteDelta
        });
      }
    }

    return {
      compared: true,
      exceeded,
      invalidated: exceeded.length > 0
    };
  }

  buildMissingEstimate(coordinateId) {
    return {
      coordinate_id: coordinateId,
      symbol: COORDINATE_SYMBOLS[coordinateId],
      artifact_role: null,
      artifact_ref: ARTIFACT_NAMES[coordinateId] || null,
      fields_used: [],
      normalization_rule: 'not_computed_missing_artifact',
      estimate: null,
      warnings: ['missing_required_artifact'],
      limitations: ['Estimator unavailable because the required upstream artifact is missing.']
    };
  }

  getLocalThreshold(coordinateId) {
    return (
      Number(this.coordinateThresholds?.[coordinateId]) ||
      this.options.localThresholdFallback
    );
  }

  getGlobalThreshold(key) {
    const fallback =
      key === 'Phi_subj'
        ? this.options.phiThresholdFallback
        : this.options.gammaThresholdFallback;
    return Number(this.globalThresholds?.[key]) || fallback;
  }

  buildSelfIndexEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('SelfIndex');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const selectedIndexPresent = artifact.selected_index ? 1 : 0;
    const stabilityMargin = clampUnit(Number(artifact.stability_margin) || 0);
    const hintScore = stabilityHintScore(artifact.stability_hint);

    let estimate = clampUnit(
      0.45 * selectedIndexPresent +
        0.25 * hintScore +
        0.3 * stabilityMargin
    );

    if (artifact.ambiguity_flag) {
      estimate *= 0.6;
      warnings.push('self_index_ambiguity_penalty_applied');
    }

    return {
      coordinate_id: 'SelfIndex',
      symbol: COORDINATE_SYMBOLS.SelfIndex,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.SelfIndex,
      fields_used: [
        'selected_index',
        'ambiguity_flag',
        'stability_hint',
        'stability_margin'
      ],
      normalization_rule:
        '0.45*selected_index_presence + 0.25*stability_hint_score + 0.30*stability_margin, with ambiguity penalty multiplier 0.60.',
      estimate: clampUnit(estimate),
      warnings,
      limitations: [
        'Depends on SRT-1 self-candidate selection and stability heuristics.',
        'Does not establish metaphysical selfhood or final self-index closure.'
      ]
    };
  }

  buildOwnershipEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('OwnershipField');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const coherence = clampUnit(Number(artifact.ownership_coherence) || 0);
    const uncertainFraction = clampUnit(
      Number(artifact.uncertain_fraction) || 0
    );
    const relabelingSensitivity = clampUnit(
      Number(artifact.relabeling_sensitivity) || 0
    );

    let estimate = clampUnit(
      0.65 * coherence +
        0.2 * (1 - uncertainFraction) +
        0.15 * (1 - relabelingSensitivity)
    );

    if (artifact.self_index_dependency?.ambiguity_flag) {
      estimate *= 0.72;
      warnings.push('ownership_dependency_ambiguity_penalty_applied');
    }

    return {
      coordinate_id: 'OwnershipField',
      symbol: COORDINATE_SYMBOLS.OwnershipField,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.OwnershipField,
      fields_used: [
        'ownership_coherence',
        'uncertain_fraction',
        'relabeling_sensitivity',
        'self_index_dependency.ambiguity_flag'
      ],
      normalization_rule:
        '0.65*ownership_coherence + 0.20*(1-uncertain_fraction) + 0.15*(1-relabeling_sensitivity), with dependency-ambiguity penalty multiplier 0.72.',
      estimate: clampUnit(estimate),
      warnings,
      limitations: [
        'Tracks only minimal runtime ownership coherence over SRT-1 entries.',
        'Does not establish phenomenal ownership or complete constitutive ownness.'
      ]
    };
  }

  buildContinuityEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('ContinuityField');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const continuityMargin = clampUnit(Number(artifact.continuity_margin) || 0);
    const statusScore = continuityStatusScore(artifact.continuity_status);
    const privilegedLinePresent = artifact.privileged_line ? 1 : 0;
    const rivalPenalty = clampUnit((Number(artifact.rival_line_count) || 0) / 4);

    let estimate = clampUnit(
      0.5 * continuityMargin +
        0.25 * statusScore +
        0.15 * privilegedLinePresent +
        0.1 * (1 - rivalPenalty)
    );

    if (artifact.fracture_flag) {
      estimate *= 0.25;
      warnings.push('continuity_fracture_penalty_applied');
    }
    if (artifact.fork_flag) {
      estimate *= 0.65;
      warnings.push('continuity_fork_penalty_applied');
    }
    if (artifact.ambiguity_flag) {
      estimate *= 0.75;
      warnings.push('continuity_ambiguity_penalty_applied');
    }

    return {
      coordinate_id: 'ContinuityField',
      symbol: COORDINATE_SYMBOLS.ContinuityField,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.ContinuityField,
      fields_used: [
        'continuity_status',
        'continuity_margin',
        'privileged_line',
        'rival_line_count',
        'fracture_flag',
        'fork_flag',
        'ambiguity_flag'
      ],
      normalization_rule:
        '0.50*continuity_margin + 0.25*status_score + 0.15*privileged_line_presence + 0.10*(1-rival_penalty), with fracture/fork/ambiguity penalties.',
      estimate: clampUnit(estimate),
      warnings,
      limitations: [
        'Continuity is limited to explicit history-window lines already emitted by SRT-2.',
        'Does not establish metaphysical persistence or human autobiographical continuity.'
      ]
    };
  }

  buildPerspectiveEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('FirstPersonPerspective');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const gain = clampUnit(Number(artifact.first_person_gain) || 0);
    const flatteningVulnerability = clampUnit(
      Number(artifact.flattening_vulnerability) || 0
    );
    const comparisonScore = perspectiveStatusScore(artifact.comparison_status);

    const estimate = clampUnit(
      0.4 * gain +
        0.25 * (artifact.factorization_supported ? 1 : 0) +
        0.2 * (1 - flatteningVulnerability) +
        0.15 * comparisonScore
    );

    if (!artifact.factorization_supported) {
      warnings.push('first_person_factorization_not_supported');
    }

    return {
      coordinate_id: 'FirstPersonPerspective',
      symbol: COORDINATE_SYMBOLS.FirstPersonPerspective,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.FirstPersonPerspective,
      fields_used: [
        'first_person_gain',
        'factorization_supported',
        'flattening_vulnerability',
        'comparison_status'
      ],
      normalization_rule:
        '0.40*first_person_gain + 0.25*factorization_supported + 0.20*(1-flattening_vulnerability) + 0.15*comparison_status_score.',
      estimate,
      warnings,
      limitations: [
        'Perspective estimate is only a minimal indexed-vs-neutral factorization comparison.',
        'Does not establish strong phenomenal first-person perspective.'
      ]
    };
  }

  buildValuationEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('ValuationAsymmetry');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const valuationMargin = clampUnit(
      Number(artifact.valuation_asymmetry_margin) || 0
    );
    const selfWeightMean = clampUnit(
      Number(artifact.self_weight_summary?.mean_weight) || 0
    );
    const classScore = valuationClassScore(artifact.weighting_classification);
    const inversionScore = inversionResponseScore(
      artifact.inversion_response?.status
    );

    let estimate = clampUnit(
      0.4 * valuationMargin +
        0.2 * selfWeightMean +
        0.2 * classScore +
        0.2 * inversionScore
    );

    if (artifact.aliasing_warning?.flag) {
      estimate *= 0.8;
      warnings.push('valuation_aliasing_penalty_applied');
    }

    return {
      coordinate_id: 'ValuationAsymmetry',
      symbol: COORDINATE_SYMBOLS.ValuationAsymmetry,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.ValuationAsymmetry,
      fields_used: [
        'valuation_asymmetry_margin',
        'self_weight_summary.mean_weight',
        'weighting_classification',
        'inversion_response.status',
        'aliasing_warning.flag'
      ],
      normalization_rule:
        '0.40*valuation_margin + 0.20*self_weight_mean + 0.20*valuation_class_score + 0.20*inversion_response_score, with aliasing penalty multiplier 0.80.',
      estimate: clampUnit(estimate),
      warnings,
      limitations: [
        'Captures only SRT-3 valuation asymmetry over explicit tradeoff cases.',
        'Does not establish affect, suffering, or moral valuation.'
      ]
    };
  }

  buildInterventionEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('InterventionProfile');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    const interventionRuns = ensureArray(artifact.intervention_runs);
    const controlRuns = ensureArray(artifact.negative_control_runs);
    const selectiveDropCount =
      Number(artifact.aggregate_profile?.selective_drop_count) || 0;
    const flatDamageCount =
      Number(artifact.aggregate_profile?.flat_damage_count) || 0;
    const controlConfoundedCount =
      Number(artifact.aggregate_profile?.control_confounded_count) || 0;
    const targetedDropMean = clampUnit(
      safeMean(
        interventionRuns.map(
          (run) => Number(run?.targeted_coordinate_drop) || 0
        )
      )
    );
    const selectiveRatio = interventionRuns.length
      ? clampUnit(selectiveDropCount / interventionRuns.length)
      : 0;
    const totalProfileRuns = interventionRuns.length + controlRuns.length;
    const flatDamageRatio = totalProfileRuns
      ? clampUnit(flatDamageCount / totalProfileRuns)
      : 1;
    const controlConfoundRatio = controlRuns.length
      ? clampUnit(controlConfoundedCount / controlRuns.length)
      : 0;

    const estimate = clampUnit(
      0.4 * selectiveRatio +
        0.35 * targetedDropMean +
        0.15 * (1 - flatDamageRatio) +
        0.1 * (1 - controlConfoundRatio)
    );

    if (selectiveRatio === 0) {
      warnings.push('intervention_selectivity_absent');
    }
    if (flatDamageRatio >= 0.5) {
      warnings.push('intervention_flat_damage_dominant');
    }
    if (controlConfoundRatio > 0.5) {
      warnings.push('intervention_control_confounds_dominant');
    }

    return {
      coordinate_id: 'InterventionProfile',
      symbol: COORDINATE_SYMBOLS.InterventionProfile,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.InterventionProfile,
      fields_used: [
        'intervention_runs[*].targeted_coordinate_drop',
        'aggregate_profile.selective_drop_count',
        'aggregate_profile.flat_damage_count',
        'aggregate_profile.control_confounded_count'
      ],
      normalization_rule:
        '0.40*selective_ratio + 0.35*targeted_drop_mean + 0.15*(1-flat_damage_ratio) + 0.10*(1-control_confound_ratio).',
      estimate,
      warnings,
      limitations: [
        'Intervention profile is limited to the minimal SRT-3 perturbation family.',
        'Does not establish full interventional closure over all Paper 8 burdens.'
      ]
    };
  }

  buildReducibilityEstimate(artifact) {
    if (!artifact) {
      return this.buildMissingEstimate('IrreducibilityMargin');
    }

    const warnings = [...ensureArray(artifact.warnings)];
    if (!artifact.comparison_supported) {
      warnings.push('reducibility_comparison_not_supported');
    }

    const marginScore = clampUnit(
      (Number(artifact.irreducibility_margin) || 0) / 0.25
    );
    const classScore = reducibilityClassScore(artifact.classification);
    const estimate = artifact.comparison_supported
      ? clampUnit(0.65 * marginScore + 0.35 * classScore)
      : 0;

    return {
      coordinate_id: 'IrreducibilityMargin',
      symbol: COORDINATE_SYMBOLS.IrreducibilityMargin,
      artifact_role: artifact.artifact_role,
      artifact_ref: ARTIFACT_NAMES.IrreducibilityMargin,
      fields_used: [
        'irreducibility_margin',
        'comparison_supported',
        'classification',
        'best_weak_loss',
        'best_hybrid_loss',
        'strong_model_loss.total_loss'
      ],
      normalization_rule:
        'If comparison_supported=true, 0.65*normalized_irreducibility_margin + 0.35*classification_score; otherwise 0.',
      estimate: clampUnit(estimate),
      warnings,
      limitations: [
        'Irreducibility remains partial and limited to SRT-4 available coordinates and weak-family scope.',
        'Does not establish final irreducibility proof.'
      ]
    };
  }

  deriveCoordinateEstimates(input = {}) {
    return {
      SelfIndex: this.buildSelfIndexEstimate(input.self_index_state),
      OwnershipField: this.buildOwnershipEstimate(
        input.ownership_attribution_report
      ),
      ContinuityField: this.buildContinuityEstimate(
        input.subjective_continuity_report
      ),
      FirstPersonPerspective: this.buildPerspectiveEstimate(
        input.first_person_perspective_report
      ),
      ValuationAsymmetry: this.buildValuationEstimate(
        input.subjective_valuation_report
      ),
      InterventionProfile: this.buildInterventionEstimate(
        input.subjectivity_intervention_profile
      ),
      IrreducibilityMargin: this.buildReducibilityEstimate(
        input.subjectivity_reducibility_report
      )
    };
  }

  computePhiSubj(coordinateEstimates) {
    const estimates = COORDINATE_KEYS.map(
      (coordinateId) => coordinateEstimates?.[coordinateId]?.estimate
    );
    if (estimates.some((value) => !Number.isFinite(value))) {
      return null;
    }

    let phi = 1;
    for (const coordinateId of COORDINATE_KEYS) {
      const estimate = clampUnit(coordinateEstimates[coordinateId].estimate);
      const weight = this.functionalWeights[coordinateId];
      phi *= estimate ** weight;
    }

    return clampUnit(phi);
  }

  computeGammaSubj(coordinateEstimates) {
    const estimates = COORDINATE_KEYS.map(
      (coordinateId) => coordinateEstimates?.[coordinateId]?.estimate
    );
    if (estimates.some((value) => !Number.isFinite(value))) {
      return null;
    }
    return Math.min(...estimates.map((value) => clampUnit(value)));
  }

  buildLocalThresholdResults(coordinateEstimates) {
    return Object.fromEntries(
      COORDINATE_KEYS.map((coordinateId) => {
        const estimate = coordinateEstimates?.[coordinateId]?.estimate;
        const threshold = this.getLocalThreshold(coordinateId);
        const finiteEstimate = Number.isFinite(estimate);
        return [
          coordinateId,
          {
            symbol: COORDINATE_SYMBOLS[coordinateId],
            estimate: finiteEstimate ? estimate : null,
            threshold,
            pass: finiteEstimate ? estimate >= threshold : false,
            margin: finiteEstimate ? estimate - threshold : null
          }
        ];
      })
    );
  }

  buildConditionAggregation(currentGateResult, conditionRuns = []) {
    const runs = [
      {
        classification: currentGateResult.classification,
        gamma_subj: currentGateResult.gamma_subj,
        phi_subj: currentGateResult.phi_subj,
        gate_status: currentGateResult.gate_status
      },
      ...ensureArray(conditionRuns)
    ].filter((entry) => entry && typeof entry === 'object');

    const classificationCounts = {};
    for (const run of runs) {
      const classification = normalizeText(run.classification) || 'unknown';
      classificationCounts[classification] =
        (classificationCounts[classification] || 0) + 1;
    }

    return {
      condition_id:
        normalizeText(currentGateResult.condition_id) ||
        normalizeText(currentGateResult.run_id) ||
        'single_run_condition',
      evaluated_runs: runs.length,
      mean_gamma_subj: safeMean(
        runs
          .map((entry) => Number(entry.gamma_subj))
          .filter((value) => Number.isFinite(value))
      ),
      mean_phi_subj: safeMean(
        runs
          .map((entry) => Number(entry.phi_subj))
          .filter((value) => Number.isFinite(value))
      ),
      gate_pass_count: runs.filter((entry) => entry.gate_status === 'pass').length,
      classification_counts: classificationCounts
    };
  }

  evaluate(input = {}) {
    const runId =
      normalizeText(input.run_id) || `subjectivity-gate-${Date.now()}`;
    const coordinateEstimates = this.deriveCoordinateEstimates(input);
    const localThresholdResults = this.buildLocalThresholdResults(
      coordinateEstimates
    );
    const phiSubj = this.computePhiSubj(coordinateEstimates);
    const gammaSubj = this.computeGammaSubj(coordinateEstimates);
    const phiThreshold = this.getGlobalThreshold('Phi_subj');
    const gammaThreshold = this.getGlobalThreshold('Gamma_subj');
    const phiPass = Number.isFinite(phiSubj) ? phiSubj >= phiThreshold : false;
    const gammaPass = Number.isFinite(gammaSubj)
      ? gammaSubj >= gammaThreshold
      : false;
    const localThresholdPass = Object.values(localThresholdResults).every(
      (entry) => entry.pass
    );

    const missingCoordinates = COORDINATE_KEYS.filter(
      (coordinateId) =>
        !Number.isFinite(coordinateEstimates?.[coordinateId]?.estimate)
    );

    const reducerArtifact = input.subjectivity_reducibility_report || null;
    const interventionArtifact = input.subjectivity_intervention_profile || null;

    const unsupportedReasons = [];
    if (missingCoordinates.length > 0) {
      unsupportedReasons.push(
        `missing_required_coordinates:${missingCoordinates.join(',')}`
      );
    }
    if (reducerArtifact && reducerArtifact.comparison_supported === false) {
      unsupportedReasons.push('comparator_unsupported');
    }

    const manifestMismatchReasons = [];
    const artifactInputMap = {
      SelfIndex: 'self_index_state',
      OwnershipField: 'ownership_attribution_report',
      ContinuityField: 'subjective_continuity_report',
      FirstPersonPerspective: 'first_person_perspective_report',
      ValuationAsymmetry: 'subjective_valuation_report',
      InterventionProfile: 'subjectivity_intervention_profile',
      IrreducibilityMargin: 'subjectivity_reducibility_report'
    };

    for (const coordinateId of COORDINATE_KEYS) {
      const artifact = input[artifactInputMap[coordinateId]];
      const expectedSchemaRef =
        SUBJECTIVITY_ARTIFACT_SCHEMA.root_schema_refs?.[ARTIFACT_NAMES[coordinateId]];
      if (
        artifact &&
        normalizeText(artifact.schema_ref) !== normalizeText(expectedSchemaRef)
      ) {
        manifestMismatchReasons.push(`${coordinateId}:schema_ref_mismatch`);
      }
    }
    if (manifestMismatchReasons.length > 0) {
      unsupportedReasons.push(...manifestMismatchReasons);
    }

    const lineageStatus = this.compareLineage(input.expected_lineage || null);
    const estimateDriftStatus = this.compareCoordinateDrift(
      input.expected_coordinate_estimates || null,
      coordinateEstimates
    );
    const driftInvalidated =
      lineageStatus.invalidated || estimateDriftStatus.invalidated;

    const interventionWarnings = new Set(
      ensureArray(interventionArtifact?.warnings)
    );
    const flatDamageDominant =
      Number(interventionArtifact?.aggregate_profile?.flat_damage_count) >
      Number(interventionArtifact?.aggregate_profile?.selective_drop_count);
    const interventionallyUnstable =
      unsupportedReasons.includes('comparator_unsupported')
        ? false
        : coordinateEstimates.InterventionProfile.estimate !== null &&
          (coordinateEstimates.InterventionProfile.estimate <
            this.getLocalThreshold('InterventionProfile') ||
            flatDamageDominant ||
            interventionWarnings.has('intervention_flat_damage_dominant'));

    const reducibilityClassification = reducerArtifact?.classification || null;
    const weakRivalReducible =
      reducibilityClassification === 'weak_model_sufficient' ||
      reducibilityClassification === 'weak_hybrid_sufficient';

    const invalidationReasons = [
      ...unsupportedReasons,
      ...(lineageStatus.invalidated
        ? lineageStatus.mismatch_reasons.map((reason) => `lineage_drift:${reason}`)
        : []),
      ...(estimateDriftStatus.invalidated
        ? estimateDriftStatus.exceeded.map(
            (entry) => `coordinate_drift:${entry.coordinate_id}`
          )
        : [])
    ];

    let classification = 'insufficient_subjectivity_support';
    if (unsupportedReasons.length > 0) {
      classification = 'subjectivity_evaluation_unsupported';
    } else if (driftInvalidated) {
      classification = 'drift_invalidated';
    } else if (weakRivalReducible) {
      classification = 'weak_rival_reducible';
    } else if (interventionallyUnstable) {
      classification = 'interventionally_unstable';
    } else if (!(localThresholdPass && gammaPass)) {
      classification = 'subjectivity_gate_fail';
    } else if (!(phiPass && gammaPass)) {
      classification = 'insufficient_subjectivity_support';
    } else if (
      gammaSubj >= this.strongSupportThresholds.Gamma_subj &&
      phiSubj >= this.strongSupportThresholds.Phi_subj &&
      reducerArtifact?.classification === 'partial_irreducibility_support'
    ) {
      classification = 'subjectivity_internal_strong_support';
    } else {
      classification = 'subjectivity_admissible';
    }

    const gateStatus =
      classification === 'subjectivity_admissible' ||
      classification === 'subjectivity_internal_strong_support'
        ? 'pass'
        : classification === 'drift_invalidated' ||
            classification === 'subjectivity_evaluation_unsupported'
          ? 'invalidated'
          : 'fail';

    const projectionWarnings = [
      ...new Set(
        COORDINATE_KEYS.flatMap((coordinateId) =>
          ensureArray(coordinateEstimates[coordinateId].warnings)
        )
      )
    ];

    const projectionArtifact = {
      artifact_role: 'subjectivity_runtime_projection',
      artifact_version: GATE_ARTIFACT_VERSION,
      schema_version: GATE_ARTIFACT_VERSION,
      layer_version: GATE_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: GATE_RUNTIME_STATUS,
      run_id: runId,
      coordinate_estimates: coordinateEstimates,
      functional_status: 'executed_internal_multiplicative_noncompensatory',
      global_functional_result: {
        phi_subj: Number.isFinite(phiSubj) ? phiSubj : null,
        weights: this.functionalWeights,
        threshold: phiThreshold,
        pass: phiPass
      },
      warnings: projectionWarnings,
      implementation_status: 'partial_runtime_path',
      interpretation_boundary: PROJECTION_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: PROTOCOL_REF,
        thresholds_ref: THRESHOLDS_REF,
        rival_family_ref: RIVAL_FAMILY_REF,
        source_artifacts: Object.values(ARTIFACT_NAMES),
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt5_gate_minimal',
        estimator_version: ESTIMATOR_VERSION
      },
      schema_ref: PROJECTION_SCHEMA_REF
    };

    const gateArtifact = {
      artifact_role: 'subjectivity_gate_result',
      artifact_version: GATE_ARTIFACT_VERSION,
      schema_version: GATE_ARTIFACT_VERSION,
      layer_version: GATE_LAYER_VERSION,
      paper_source: PAPER_SOURCE,
      runtime_status: GATE_RUNTIME_STATUS,
      run_id: runId,
      condition_id: normalizeText(input.condition_id) || runId,
      gamma_subj: Number.isFinite(gammaSubj) ? gammaSubj : null,
      phi_subj: Number.isFinite(phiSubj) ? phiSubj : null,
      local_threshold_results: localThresholdResults,
      global_gate_result: {
        gamma_subj: Number.isFinite(gammaSubj) ? gammaSubj : null,
        threshold: gammaThreshold,
        pass: localThresholdPass && gammaPass
      },
      global_functional_result: {
        phi_subj: Number.isFinite(phiSubj) ? phiSubj : null,
        threshold: phiThreshold,
        pass: phiPass
      },
      drift_status: {
        lineage_status: lineageStatus,
        coordinate_drift_status: estimateDriftStatus,
        invalidated: driftInvalidated
      },
      gate_status: gateStatus,
      runtime_status_class: classification,
      classification,
      invalidation_reasons: invalidationReasons,
      warnings: [
        ...projectionWarnings,
        ...(interventionallyUnstable ? ['intervention_instability_detected'] : [])
      ],
      implementation_status: 'partial_runtime_path',
      interpretation_boundary: GATE_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        projection_ref: 'subjectivity_runtime_projection.json',
        protocol_ref: PROTOCOL_REF,
        thresholds_ref: THRESHOLDS_REF,
        rival_family_ref: RIVAL_FAMILY_REF,
        estimator_version: ESTIMATOR_VERSION,
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt5_gate_minimal'
      },
      schema_ref: GATE_SCHEMA_REF
    };

    const conditionLevelSummary = this.buildConditionAggregation(
      gateArtifact,
      input.condition_runs
    );
    gateArtifact.condition_level_summary = conditionLevelSummary;

    const manifestArtifact = {
      artifact_role: 'subjectivity_manifest',
      artifact_version: GATE_ARTIFACT_VERSION,
      schema_version: GATE_ARTIFACT_VERSION,
      subjectivity_layer_version: GATE_LAYER_VERSION,
      runtime_status: GATE_RUNTIME_STATUS,
      support_class: classification,
      artifact_inventory: [
        ...Object.values(ARTIFACT_NAMES),
        'subjectivity_runtime_projection.json',
        'subjectivity_gate_result.json',
        'subjectivity_manifest.json'
      ],
      emitted_artifacts: [
        'subjectivity_runtime_projection.json',
        'subjectivity_gate_result.json',
        'subjectivity_manifest.json'
      ],
      protocol_ref: PROTOCOL_REF,
      thresholds_ref: THRESHOLDS_REF,
      surface_policy_ref: SURFACE_POLICY_REF,
      artifact_schema_ref: ARTIFACT_SCHEMA_REF,
      rival_family_ref: RIVAL_FAMILY_REF,
      evaluator_version: GATE_LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      support_summary: {
        classification,
        gate_status: gateStatus,
        gamma_subj: Number.isFinite(gammaSubj) ? gammaSubj : null,
        phi_subj: Number.isFinite(phiSubj) ? phiSubj : null
      },
      lineage: this.captureCurrentLineage(),
      consumed_artifacts: Object.fromEntries(
        Object.entries(ARTIFACT_NAMES).map(([coordinateId, artifactName]) => {
          const artifact = input[artifactInputMap[coordinateId]];
          return [
            coordinateId,
            {
              artifact_name: artifactName,
              artifact_role: artifact?.artifact_role || null,
              run_id: artifact?.run_id || null,
              schema_ref: artifact?.schema_ref || null,
              artifact_version: artifact?.artifact_version || null
            }
          ];
        })
      ),
      drift_summary: gateArtifact.drift_status,
      condition_level_summary: conditionLevelSummary,
      interpretation_boundary: MANIFEST_BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        protocol_ref: PROTOCOL_REF,
        thresholds_ref: THRESHOLDS_REF,
        surface_policy_ref: SURFACE_POLICY_REF,
        artifact_schema_ref: ARTIFACT_SCHEMA_REF,
        rival_family_ref: RIVAL_FAMILY_REF,
        source_trace_ref: input.provenance?.source_trace_ref || null,
        input_profile: input.provenance?.input_profile || 'srt5_gate_minimal'
      },
      schema_ref: MANIFEST_SCHEMA_REF
    };

    return {
      projection: projectionArtifact,
      gate_result: gateArtifact,
      manifest: manifestArtifact
    };
  }

  writeArtifacts(input, outputDirectory) {
    const bundle = this.evaluate(input);
    fs.mkdirSync(outputDirectory, { recursive: true });

    const outputPaths = {
      projection: path.join(outputDirectory, 'subjectivity_runtime_projection.json'),
      gate_result: path.join(outputDirectory, 'subjectivity_gate_result.json'),
      manifest: path.join(outputDirectory, 'subjectivity_manifest.json')
    };

    fs.writeFileSync(
      outputPaths.projection,
      `${JSON.stringify(bundle.projection, null, 2)}\n`,
      'utf8'
    );
    fs.writeFileSync(
      outputPaths.gate_result,
      `${JSON.stringify(bundle.gate_result, null, 2)}\n`,
      'utf8'
    );
    fs.writeFileSync(
      outputPaths.manifest,
      `${JSON.stringify(bundle.manifest, null, 2)}\n`,
      'utf8'
    );

    return { ...bundle, output_paths: clone(outputPaths) };
  }
}

export const createSubjectivityGateEvaluator = (options = {}) =>
  new SubjectivityGateEvaluator(options);

export default {
  SubjectivityGateEvaluator,
  createSubjectivityGateEvaluator
};
