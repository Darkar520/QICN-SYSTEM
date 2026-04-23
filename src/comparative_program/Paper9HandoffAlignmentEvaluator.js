import fs from 'fs';
import path from 'path';
import cp from 'child_process';

import { PROJECT_ROOT, RELEASE_ROOT, containsLocalPathLeak } from './ComparativeRuntimeUtils.js';

const LAYER_VERSION = 'comparative_expansion_layer.stage3_readiness_fulfillment.paper9_handoff.v1';
const ESTIMATOR_VERSION = 'paper9_handoff_alignment_evaluator.stage3_readiness.v1';

const BOUNDARY =
  'Framework-internal only; the Paper 9 handoff alignment artifact records whether the local Paper 9-facing handoff substrate inside the allowed repos is semantically aligned with the current runtime and readiness gates. It is not a manuscript verdict, not external adjudication, and not Paper 10.';

const STANDARD_FLAGS = Object.freeze({
  framework_internal_only: true,
  not_human_equivalence_support: true,
  not_superiority_support: true,
  not_cross_substrate_equivalence_support: true,
  not_identity_preservation_support: true,
  not_external_adjudication: true,
  not_paper10_authorization: true,
  no_paper10_final_manuscript: true
});

const STALE_PATTERNS = [
  /must exist and stabilize first/i,
  /human comparator claims/i,
  /subjectivity superiority claims/i,
  /external validation narratives/i
];

const OVERCLAIM_PATTERNS = [
  /external adjudication already happened/i,
  /human equivalence already exists/i,
  /superiority\s+(already\s+exists|is\s+(achieved|established|demonstrated|supported))/i,
  /metaphysical closure\s+(already\s+exists|is\s+(achieved|established|open))/i,
  /Paper 10 authorized/i
];

const PAPER9_DOCS = Object.freeze({
  prerequisites: 'docs/PAPER9_PREREQUISITES.md',
  handoff_alignment: 'docs/PAPER9_HANDOFF_ALIGNMENT.md'
});

const PAPER9_MANUSCRIPT = Object.freeze({
  root: 'paper9_phenomenal_bridge_organization',
  mainTex: 'paper9_phenomenal_bridge_organization/main.tex',
  mainPdf: 'paper9_phenomenal_bridge_organization/main.pdf',
  mainLog: 'paper9_phenomenal_bridge_organization/main.log',
  sharedBib: 'paper9_phenomenal_bridge_organization/references.bib',
  localBib: 'paper9_phenomenal_bridge_organization/paper9_local_references.bib'
});

const rel = (absolutePath) => path.relative(PROJECT_ROOT, absolutePath).replace(/\\/g, '/');
const exists = (relativePath) => fs.existsSync(path.join(PROJECT_ROOT, relativePath));
const readText = (relativePath) => fs.readFileSync(path.join(PROJECT_ROOT, relativePath), 'utf8');

const isTracked = (repoRoot, relativePath) => {
  try {
    cp.execFileSync('git', ['ls-files', '--error-unmatch', relativePath], {
      cwd: repoRoot,
      stdio: 'ignore'
    });
    return true;
  } catch {
    return false;
  }
};

const walkForPaper9Candidates = (rootDir) => {
  const matches = [];
  const queue = [rootDir];
  while (queue.length > 0) {
    const current = queue.pop();
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.forEach((entry) => {
      const fullPath = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === '.git' || entry.name === 'node_modules' || entry.name === 'dist') return;
        queue.push(fullPath);
        return;
      }
      if (/paper\s*9|paper9/i.test(entry.name)) matches.push(fullPath);
    });
  }
  return matches;
};

const parsePageCountFromLog = (relativePath) => {
  if (!exists(relativePath)) return null;
  const logText = readText(relativePath);
  const match = logText.match(/Output written on main\.pdf \((\d+) pages?,/i);
  return match ? Number(match[1]) : null;
};

export class Paper9HandoffAlignmentEvaluator {
  evaluate({ stage3OpeningReadiness, currentLineage }) {
    const prereqPresent = exists(PAPER9_DOCS.prerequisites);
    const handoffPresent = exists(PAPER9_DOCS.handoff_alignment);
    const prereqText = prereqPresent ? readText(PAPER9_DOCS.prerequisites) : '';
    const handoffText = handoffPresent ? readText(PAPER9_DOCS.handoff_alignment) : '';
    const manuscriptPresent = exists(PAPER9_MANUSCRIPT.mainTex);
    const manuscriptPdfPresent = exists(PAPER9_MANUSCRIPT.mainPdf);
    const manuscriptText = manuscriptPresent ? readText(PAPER9_MANUSCRIPT.mainTex) : '';
    const pageCount = parsePageCountFromLog(PAPER9_MANUSCRIPT.mainLog);
    const staleWordingFlags = [
      ...STALE_PATTERNS.filter((pattern) => pattern.test(prereqText)).map((pattern) => pattern.source),
      ...STALE_PATTERNS.filter((pattern) => pattern.test(handoffText)).map((pattern) => `handoff:${pattern.source}`),
      ...STALE_PATTERNS.filter((pattern) => pattern.test(manuscriptText)).map((pattern) => `manuscript:${pattern.source}`)
    ];
    const overclaimFlags = [
      ...OVERCLAIM_PATTERNS.filter((pattern) => pattern.test(prereqText)).map((pattern) => pattern.source),
      ...OVERCLAIM_PATTERNS.filter((pattern) => pattern.test(handoffText)).map((pattern) => `handoff:${pattern.source}`),
      ...OVERCLAIM_PATTERNS.filter((pattern) => pattern.test(manuscriptText)).map((pattern) => `manuscript:${pattern.source}`)
    ];

    const systemDocCandidates = walkForPaper9Candidates(path.join(PROJECT_ROOT, 'docs'));
    const systemManuscriptCandidates = fs.existsSync(path.join(PROJECT_ROOT, PAPER9_MANUSCRIPT.root))
      ? walkForPaper9Candidates(path.join(PROJECT_ROOT, PAPER9_MANUSCRIPT.root))
      : [];
    const releaseDocCandidates = fs.existsSync(path.join(RELEASE_ROOT, 'docs'))
      ? walkForPaper9Candidates(path.join(RELEASE_ROOT, 'docs'))
      : [];
    const manuscriptCandidates = [
      ...(manuscriptPresent ? [path.join(PROJECT_ROOT, PAPER9_MANUSCRIPT.mainTex)] : []),
      ...(manuscriptPdfPresent ? [path.join(PROJECT_ROOT, PAPER9_MANUSCRIPT.mainPdf)] : []),
      ...systemDocCandidates,
      ...systemManuscriptCandidates,
      ...releaseDocCandidates
    ].filter((absolutePath) => /\.(tex|pdf)$/i.test(absolutePath));

    const requiredRevisions = [
      ...(!/Stage 2-M4/i.test(prereqText) ? ['paper9_prerequisites_missing_stage2m4_reference'] : []),
      ...(!/Stage 3/i.test(handoffText) ? ['paper9_handoff_missing_stage3_reference'] : []),
      ...(!/not external adjudication/i.test(handoffText) ? ['paper9_handoff_missing_external_adjudication_boundary'] : []),
      ...(!/not Paper 10/i.test(handoffText) ? ['paper9_handoff_missing_paper10_boundary'] : []),
      ...(!manuscriptPresent ? ['paper9_manuscript_source_absent'] : []),
      ...(!manuscriptPdfPresent ? ['paper9_compiled_pdf_absent'] : []),
      ...(!/BPF-M3/i.test(manuscriptText) ? ['paper9_manuscript_missing_bpfm3_reference'] : []),
      ...(!/Stage 2-M4/i.test(manuscriptText) ? ['paper9_manuscript_missing_stage2m4_reference'] : []),
      ...(!/Stage 3 readiness fulfillment/i.test(manuscriptText) ? ['paper9_manuscript_missing_stage3_readiness_reference'] : []),
      ...(!/Paper 10/i.test(manuscriptText) ? ['paper9_manuscript_missing_paper10_boundary'] : [])
    ];

    const aligned = prereqPresent
      && handoffPresent
      && manuscriptPresent
      && manuscriptPdfPresent
      && staleWordingFlags.length === 0
      && overclaimFlags.length === 0
      && requiredRevisions.length === 0
      && stage3OpeningReadiness.stage3_opening_state === 'ready_for_stage3_opening';

    return {
      artifact_role: 'paper9_handoff_alignment',
      artifact_name: 'paper9_handoff_alignment.json',
      artifact_version: '1.0.0',
      schema_version: '1.0.0',
      comparative_layer_id: 'comparative_expansion_layer.stage3_readiness_fulfillment',
      layer_version: LAYER_VERSION,
      estimator_version: ESTIMATOR_VERSION,
      implementation_status: 'stage3_readiness_fulfillment_implemented',
      paper9_handoff_state: aligned
        ? 'paper9_handoff_ready_after_second_pass'
        : 'paper9_handoff_misaligned',
      paper9_location: {
        prerequisites_ref: PAPER9_DOCS.prerequisites,
        handoff_alignment_ref: PAPER9_DOCS.handoff_alignment,
        prerequisites_tracked: prereqPresent ? isTracked(PROJECT_ROOT, PAPER9_DOCS.prerequisites) : false,
        handoff_alignment_tracked: handoffPresent ? isTracked(PROJECT_ROOT, PAPER9_DOCS.handoff_alignment) : false,
        manuscript_source_ref: PAPER9_MANUSCRIPT.mainTex,
        manuscript_pdf_ref: PAPER9_MANUSCRIPT.mainPdf,
        manuscript_shared_bib_ref: PAPER9_MANUSCRIPT.sharedBib,
        manuscript_local_bib_ref: PAPER9_MANUSCRIPT.localBib,
        manuscript_source_tracked: manuscriptPresent ? isTracked(PROJECT_ROOT, PAPER9_MANUSCRIPT.mainTex) : false,
        manuscript_pdf_tracked: manuscriptPdfPresent ? isTracked(PROJECT_ROOT, PAPER9_MANUSCRIPT.mainPdf) : false,
        manuscript_page_count_from_log: pageCount,
        manuscript_candidates_in_allowed_roots: manuscriptCandidates.map(rel),
        manuscript_present_in_allowed_roots: manuscriptPresent
      },
      alignment_summary: {
        stage2_m4_state_reflected: /Stage 2-M4/i.test(prereqText) && /Stage 2-M4/i.test(manuscriptText),
        stage3_handoff_reflected: /Stage 3/i.test(handoffText) && /Stage 3/i.test(manuscriptText),
        external_adjudication_boundary_reflected: /not external adjudication/i.test(handoffText) && /external adjudication/i.test(manuscriptText),
        paper10_boundary_reflected: /not Paper 10/i.test(handoffText) && /Paper 10/i.test(manuscriptText),
        stale_writing_absent: staleWordingFlags.length === 0,
        overclaim_absent: overclaimFlags.length === 0,
        local_path_leak_absent: !containsLocalPathLeak({ prereqText, handoffText, manuscriptText }),
        manuscript_present_in_allowed_roots: manuscriptPresent,
        compiled_pdf_present: manuscriptPdfPresent,
        page_count_detected: pageCount !== null
      },
      stale_wording_flags: staleWordingFlags,
      overclaim_flags: overclaimFlags,
      required_revisions: requiredRevisions,
      warnings: [
        'paper9_handoff_is_local_runtime_alignment_only',
        ...(manuscriptPresent ? [] : ['no_paper9_manuscript_source_in_allowed_roots']),
        ...(manuscriptPdfPresent ? [] : ['no_compiled_paper9_pdf_in_allowed_roots']),
        'paper9_handoff_is_not_external_adjudication',
        'paper9_handoff_is_not_paper10'
      ],
      boundary_flags: {
        ...STANDARD_FLAGS,
        manuscript_source_present_in_allowed_roots: manuscriptPresent,
        compiled_pdf_present_in_allowed_roots: manuscriptPdfPresent
      },
      non_implications: [
        'Paper 9 handoff alignment is not a human-equivalence result.',
        'Paper 9 handoff alignment is not external adjudication.',
        'Paper 9 handoff alignment is not Paper 10 authorization.'
      ],
      interpretation_boundary: BOUNDARY,
      provenance: {
        generated_at: new Date().toISOString(),
        stage3_opening_readiness_state: stage3OpeningReadiness.stage3_opening_state,
        current_lineage: currentLineage
      },
      schema_ref: 'src/comparative_program/schemas/paper9_handoff_alignment.v1.json'
    };
  }
}

export const createPaper9HandoffAlignmentEvaluator = () =>
  new Paper9HandoffAlignmentEvaluator();

export default {
  Paper9HandoffAlignmentEvaluator,
  createPaper9HandoffAlignmentEvaluator
};

