# External Audit Profile Matrix

## Purpose

This matrix separates external audit roles by scope so that the ecosystem is not
handed to a single reviewer as one undifferentiated task.

## Profiles

### 1. Technical reproducibility, software, pipelines, and artifacts

- Reviews:
  - pinned SHAs, setup path, commands, manifests, candidate bundle, campaign
    artifacts, path portability, and reproducibility surfaces
- Reads first:
  - `artifacts/external_audit_package/external_audit_package_manifest.json`
  - `docs/EXTERNAL_AUDIT_SETUP.md`
  - `docs/EXTERNAL_AUDIT_QUICKSTART.md`
  - `docs/EXTERNAL_AUDIT_REVIEWER_MAP.md`
  - `ecosystem_candidate/ecosystem_release_candidate_manifest.json`
- Must answer:
  - can the pinned package be reproduced from the listed SHAs?
  - are the candidate, campaign artifacts, and copied manifests traceable?
  - does the route require private local context or platform-specific hacks?
- Relevant findings:
  - `blocker`: pinned SHAs do not reproduce the listed package
  - `material_issue`: mutable refs are used where frozen authority is required
  - `note`: setup wording is clear enough to recover but still awkward
  - `no_issue`: the package is reproducible and portable as documented
- Not asked to judge:
  - theorem truth
  - phenomenology
  - ontology

### 2. Semantic claims, philosophy of science, and epistemic boundary

- Reviews:
  - non-claims, claim registry, wording discipline, interpretive boundaries,
    support-label overread risk, and external-readiness framing
- Reads first:
  - `docs/EXTERNAL_AUDIT_QUICKSTART.md`
  - `docs/EXTERNAL_AUDIT_GLOSSARY.md`
  - `docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md`
  - `ecosystem_candidate/release/docs/CLAIM_REGISTRY.md`
  - `ecosystem_candidate/release/docs/CANON_SOURCE_OF_TRUTH.md`
  - `ecosystem_candidate/release/docs/THEORY_SYSTEM_INTERFACE.md`
- Must answer:
  - do the package docs overclaim what the runtime or corpus establishes?
  - are non-claims explicit where external readers would need them?
  - does the package collapse internal support into external validation?
- Relevant findings:
  - `blocker`: the package presents internal outputs as external validation
  - `material_issue`: boundary wording permits a plausible overclaim
  - `note`: a term is legible but still rhetorically hotter than necessary
  - `no_issue`: the package remains semantically bounded
- Not asked to judge:
  - raw software correctness except where wording depends on it
  - scientific truth of the formal theory

### 3. Corpus formal consistency, freeze, and canonical boundary

- Reviews:
  - corpus freeze manifests, claim registry, layer boundaries, system-interface
    boundary, release notes, and source-of-truth documentation
- Reads first:
  - `ecosystem_candidate/release/manifests/release_freeze_manifest.json`
  - `ecosystem_candidate/release/manifests/claim_registry.v1.json`
  - `ecosystem_candidate/release/manifests/layer_boundaries.v1.json`
  - `ecosystem_candidate/release/manifests/system_interface_boundary.v1.json`
  - `ecosystem_candidate/release/docs/CANONICAL_RELEASE_NOTES.md`
  - `ecosystem_candidate/release/docs/CANON_SOURCE_OF_TRUTH.md`
- Must answer:
  - is the public corpus freeze coherent and traceable?
  - do registry, layer boundaries, and freeze docs agree?
  - is the canonical release boundary still explicit and non-ambiguous?
- Relevant findings:
  - `blocker`: the claimed canonical boundary is internally contradictory
  - `material_issue`: one canonical doc contradicts the machine-readable freeze
  - `note`: wording is defensible but could mislead a careful outsider
  - `no_issue`: freeze and canonical boundaries remain coherent
- Not asked to judge:
  - runtime quality
  - execution campaign admissibility details

### 4. Theory-to-system interface, overclaim, and prohibited inference

- Reviews:
  - cross-repo interface docs, candidate bundle, blocked outputs, comparable
    campaign surfaces, and forbidden theory/runtime jumps
- Reads first:
  - `ecosystem_candidate/release/docs/THEORY_SYSTEM_INTERFACE.md`
  - `ecosystem_candidate/release/manifests/system_interface_boundary.v1.json`
  - `ecosystem_candidate/ecosystem/manifests/execution_campaign_audit_readout.json`
  - `system_authoritative/latest_accepted_comparable/execution_campaign_readout.json`
  - `system_authoritative/latest_accepted_comparable/condition_comparison_report.json`
  - `docs/EXTERNAL_AUDIT_TECHNICAL_PATH.md`
- Must answer:
  - do package materials let the runtime be read as theory confirmation?
  - do package materials let the theory be read as runtime validation?
  - are blocked outputs and mutable pointers sufficiently contained?
- Relevant findings:
  - `blocker`: the package authorizes a prohibited cross-layer inference
  - `material_issue`: a document or artifact creates a plausible collapse risk
  - `note`: the boundary is correct but still too implicit in one location
  - `no_issue`: interface discipline remains explicit and one-way by default
- Not asked to judge:
  - whether the theory is true
  - whether the runtime proves consciousness or identity

## Recommended audit order

1. technical reproducibility
2. corpus freeze and canonical boundary
3. theory-to-system interface
4. semantic and epistemic boundary

This order reduces the risk of purely semantic argument before the package and
artifact chain are verified.
