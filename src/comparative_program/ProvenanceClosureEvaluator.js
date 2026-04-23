const LAYER_VERSION = 'comparative_expansion_layer.stage3_4b.provenance_closure.v1';
const ESTIMATOR_VERSION = 'provenance_closure_evaluator.stage3_4b.v1';

const BOUNDARY =
  'Framework-internal only; provenance closure reconciles lineage semantics for local Stage 3 artifacts. It does not rewrite historical snapshots into new evidence and does not create external validation.';

const unique = (items) => [...new Set((items || []).filter(Boolean))];

export class ProvenanceClosureEvaluator {
  evaluate({
    priorSnapshots,
    currentLineage,
    releaseAuthoritySha,
    systemLivePinSha,
    pinningWasCleanAtEntry
  }) {
    const priorSystemHeads = unique((priorSnapshots || []).map((item) => item?.systemHead));
    const priorReleaseHeads = unique((priorSnapshots || []).map((item) => item?.releaseHead));
    const staleAtEntry =
      priorSystemHeads.some((head) => head !== currentLineage.qicn_system.head)
      || priorReleaseHeads.some((head) => head !== currentLineage.qicn_release.head);

    return {
      artifact_role: 'provenance_closure_assessment',
      artifact_name: 'provenance_closure_assessment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      layer_id: 'comparative_expansion_layer.stage3_4b_provenance_closure',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_4b_provenance_closure_defined',
      preexisting_alignment_state: staleAtEntry ? 'stale_and_regenerated' : 'exact_head_aligned',
      post_regeneration_alignment_state: 'exact_head_aligned',
      committed_alignment_state: 'artifact_forward_compatible',
      release_pinning_state:
        !pinningWasCleanAtEntry
          && releaseAuthoritySha === currentLineage.qicn_release.head
          && systemLivePinSha === currentLineage.qicn_system.head
          ? 'release_pinning_cleaned'
          : 'pinning_consistent',
      historical_snapshot_state: 'historical_snapshots_intentionally_preserved',
      release_authority_sha: releaseAuthoritySha,
      system_live_pin_sha: systemLivePinSha,
      regenerated_system_head: currentLineage.qicn_system.head,
      regenerated_release_head: currentLineage.qicn_release.head,
      prior_recorded_system_heads: priorSystemHeads,
      prior_recorded_release_heads: priorReleaseHeads,
      inspected_artifact_refs: (priorSnapshots || []).map((item) => item.artifact_ref),
      boundary_flags: {
        framework_internal_only: true,
        no_external_validation: true,
        no_evidential_rewrite: true,
        historical_snapshots_intentionally_preserved: true
      },
      non_implications: [
        'Provenance closure is not adjudication.',
        'Exact pre-commit alignment does not imply recursive self-referential exactness after commit.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/provenance_closure_assessment.v1.json'
    };
  }
}

export const createProvenanceClosureEvaluator = () => new ProvenanceClosureEvaluator();

export default {
  ProvenanceClosureEvaluator,
  createProvenanceClosureEvaluator
};
