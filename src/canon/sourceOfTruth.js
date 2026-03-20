export const CANON_RUNTIME_SOURCE_OF_TRUTH = Object.freeze({
  activeRoot: 'src',
  buildAuthority: 'build.cjs',
  buildEntry: 'src/index.jsx',
  verificationScript: 'scripts/verify-source-of-truth.cjs'
});

export const CANON_LEGACY_PATH_DECISIONS = Object.freeze([
  {
    path: 'SISTEMA CANON',
    decision: 'LEGACY_TO_ARCHIVE',
    rationale: 'Runtime-safe to archive, but broader workspace references still require one more consolidation pass before physical move.',
    phase4ConsolidationStatus: 'READY_TO_ARCHIVE_NEXT'
  },
  {
    path: 'simulation',
    decision: 'LEGACY_TO_BLOCK_FROM_RUNTIME',
    rationale: 'Mirror tree inside active package; build authority must remain src/.',
    phase4ConsolidationStatus: 'BLOCKED_KEEP_ONE_MORE_PHASE'
  },
  {
    path: 'js',
    decision: 'LEGACY_TO_BLOCK_FROM_RUNTIME',
    rationale: 'Legacy mirror tree inside active package; not part of build entry graph.',
    phase4ConsolidationStatus: 'BLOCKED_KEEP_ONE_MORE_PHASE'
  }
]);

export const LEGACY_RUNTIME_TOKENS = Object.freeze([
  'SISTEMA CANON',
  '/simulation/',
  '\\simulation\\',
  '/js/',
  '\\js\\'
]);

export const summarizeSourceOfTruthDecision = () => ({
  ...CANON_RUNTIME_SOURCE_OF_TRUTH,
  legacyPathDecisions: CANON_LEGACY_PATH_DECISIONS
});
