import { buildCanonicalInvariantPackage, flattenInvariantScores } from '../invariants/CanonicalInvariantPackage.js';

export const BOUNDARY_PROBE_SCAFFOLD_VERSION = 'boundary-probe-scaffold.v1';
export const BOUNDARY_RUNTIME_VERSION = 'boundary-runtime.v8';

const toFinite = (value, fallback = 0) => {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
};

const clamp01 = (value) => Math.max(0, Math.min(1, toFinite(value, 0)));

export const BOUNDARY_DEFAULT_THRESHOLDS = Object.freeze({
  passFloor: 0.72,
  failFloor: 0.6,
  ambiguityBand: 0.08,
  backgroundGuardFloor: 0.2,
  confounderFloor: 0.35,
  targetDominanceFloor: 0.06,
  targetIsolationFloor: 0.06,
  cleanBoundaryConfidenceFloor: 0.7,
  invariantWeights: {
    I_per: 1,
    I_ri: 1.2,
    I_int: 1,
    I_cont: 1,
    I_diff: 1,
    I_leg: 1
  }
});

export const buildBoundaryProbeFamily = ({
  familyId,
  description,
  generatorPath,
  evaluationPath,
  decisionPath,
  targetedInvariant = 'I_ri',
  members = [],
  maturity = 'PARTIAL_RUNTIME_PATH'
}) => ({
  familyId,
  description,
  generatorPath,
  evaluationPath,
  decisionPath,
  targetedInvariant,
  members,
  maturity
});

export const buildBoundaryProbeTrace = ({ caseId, familyId, firstInvariantCrossing = null, decision = 'AMBIGUOUS', notes = [] }) => ({
  caseId,
  familyId,
  firstInvariantCrossing,
  decision,
  notes,
  scaffoldVersion: BOUNDARY_PROBE_SCAFFOLD_VERSION,
  separation: {
    caseGeneration: 'separate',
    evaluation: 'separate',
    decision: 'separate'
  }
});

const scoreOf = (member, invariantId) => clamp01(member?.invariantScores?.[invariantId]);

const classifyBoundaryDecision = ({ targetedScore, minScore, thresholds }) => {
  if (targetedScore >= thresholds.passFloor && minScore >= thresholds.backgroundGuardFloor) return 'PASS';
  if (targetedScore < thresholds.failFloor) return 'FAIL';
  if (minScore < thresholds.backgroundGuardFloor) return 'AMBIGUOUS';
  return 'AMBIGUOUS';
};

export const evaluateBoundaryProbeMember = ({
  caseId,
  familyId,
  position,
  targetedInvariant = 'I_ri',
  invariantScores = {},
  thresholds = BOUNDARY_DEFAULT_THRESHOLDS
}) => {
  const entries = Object.entries(invariantScores).map(([id, score]) => ({ id, score: clamp01(score) }));
  const ordered = [...entries].sort((a, b) => a.score - b.score);
  const targetedScore = scoreOf({ invariantScores }, targetedInvariant);
  const minScore = ordered.length ? ordered[0].score : 0;
  const backgroundEntries = ordered.filter((entry) => entry.id !== targetedInvariant);
  const backgroundMean = backgroundEntries.length
    ? backgroundEntries.reduce((sum, entry) => sum + entry.score, 0) / backgroundEntries.length
    : 0;
  const lowestBackground = backgroundEntries.length ? backgroundEntries[0] : null;
  const targetDominanceMargin = lowestBackground
    ? Number((targetedScore - lowestBackground.score).toFixed(6))
    : null;
  const targetIsolationMargin = lowestBackground
    ? Number((lowestBackground.score - targetedScore).toFixed(6))
    : null;
  const backgroundConfounders = ordered
    .filter((entry) => entry.id !== targetedInvariant && entry.score < thresholds.confounderFloor)
    .map((entry) => ({
      invariantId: entry.id,
      score: Number(entry.score.toFixed(6))
    }));
  const decision = classifyBoundaryDecision({ targetedScore, minScore, thresholds });
  const firstInvariantCrossing = ordered.length && ordered[0].score < thresholds.passFloor
    ? {
        invariantId: ordered[0].id,
        score: Number(ordered[0].score.toFixed(6)),
        crossingMargin: Number((thresholds.passFloor - ordered[0].score).toFixed(6))
      }
    : null;
  return {
    caseId,
    familyId,
    position,
    targetedInvariant,
    decision,
    targetedScore: Number(targetedScore.toFixed(6)),
    minimumInvariantScore: Number(minScore.toFixed(6)),
    backgroundMean: Number(backgroundMean.toFixed(6)),
    targetDominanceMargin,
    backgroundConfounders,
    backgroundStatus: backgroundConfounders.length === 0
      ? 'healthy'
      : (backgroundMean < thresholds.backgroundGuardFloor ? 'degraded' : 'confounded'),
    targetIsolationMargin,
    firstInvariantCrossing,
    stabilityWindow: decision === 'PASS' ? 'stable' : (decision === 'FAIL' ? 'broken' : 'transition'),
    diagnosticNotes: [
      targetIsolationMargin !== null && targetIsolationMargin >= thresholds.targetIsolationFloor
        ? 'target_invariant_cleanly_isolated'
        : 'target_invariant_not_cleanly_isolated',
      backgroundConfounders.length > 0
        ? 'background_confounders_present'
        : 'background_confounders_absent'
    ]
  };
};

export const evaluateBoundaryProbeFamily = ({
  family,
  thresholds = BOUNDARY_DEFAULT_THRESHOLDS
}) => {
  const members = (family?.members || []).map((member, index) => evaluateBoundaryProbeMember({
    caseId: member.caseId || `${family.familyId}_case_${index}`,
    familyId: family.familyId,
    position: toFinite(member.position, index),
    targetedInvariant: family.targetedInvariant || 'I_ri',
    invariantScores: member.invariantScores || {},
    thresholds
  }));
  const transitionIndex = members.findIndex((member) => member.decision !== 'PASS');
  const diagnostics = {
    passCount: members.filter((member) => member.decision === 'PASS').length,
    ambiguousCount: members.filter((member) => member.decision === 'AMBIGUOUS').length,
    failCount: members.filter((member) => member.decision === 'FAIL').length,
    confoundedMembers: members.filter((member) => member.backgroundConfounders.length > 0).length
  };
  const cleanMembers = members.filter((member) => member.backgroundConfounders.length === 0);
  const firstCrossing = transitionIndex >= 0 ? members[transitionIndex] : null;
  const targetedFirstCrossing = firstCrossing?.firstInvariantCrossing?.invariantId === (family.targetedInvariant || 'I_ri');
  const cleanIsolation = targetedFirstCrossing
    && toFinite(firstCrossing?.targetIsolationMargin, -1) >= thresholds.targetIsolationFloor;
  const confidence = members.length
    ? (
      ((diagnostics.passCount > 0 ? 0.3 : 0)
      + (diagnostics.failCount > 0 ? 0.25 : 0)
      + (firstCrossing?.firstInvariantCrossing?.invariantId === (family.targetedInvariant || 'I_ri') ? 0.25 : 0)
      + (diagnostics.confoundedMembers === 0 ? 0.2 : Math.max(0, 0.2 - (diagnostics.confoundedMembers / members.length))))
    )
    : 0;
  const closureSummary = {
    targetedInvariant: family.targetedInvariant || 'I_ri',
    transitionDetected: transitionIndex >= 0,
    firstFailingInvariant: firstCrossing?.firstInvariantCrossing?.invariantId || null,
    firstCrossingIsolationMargin: firstCrossing?.targetIsolationMargin ?? null,
    confounderState: !members.length ? 'NOT_RECORDED' : diagnostics.confoundedMembers === 0 ? 'BACKGROUND_HEALTHY' : 'BACKGROUND_MIXED',
    closureConfidence: Number(confidence.toFixed(6)),
    cleanliness: !members.length ? 'not_recorded' : diagnostics.confoundedMembers === 0 ? 'clean' : 'confounded',
    boundaryEventType: !members.length ? 'NOT_RECORDED' : cleanIsolation
      ? 'TRUE_TARGET_CROSSING'
      : (targetedFirstCrossing ? 'TARGET_CROSSING_WITH_WEAK_ISOLATION' : 'MIXED_OR_BACKGROUND_EVENT'),
    supportInterpretation: (
      diagnostics.passCount > 0
      && diagnostics.failCount > 0
      && targetedFirstCrossing
      && diagnostics.confoundedMembers === 0
      && cleanIsolation
    ) ? 'runtime_boundary_claim_closing_ready'
      : (
        diagnostics.passCount > 0
        && diagnostics.failCount > 0
        && targetedFirstCrossing
        && diagnostics.confoundedMembers === 0
      ) ? 'runtime_boundary_strengthened'
      : (transitionIndex >= 0 ? 'runtime_boundary_partial' : 'runtime_boundary_unresolved'),
    readiness: (
      diagnostics.passCount > 0
      && diagnostics.ambiguousCount > 0
      && diagnostics.failCount > 0
      && diagnostics.confoundedMembers === 0
      && cleanIsolation
    ) ? 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
      : confidence >= thresholds.cleanBoundaryConfidenceFloor
      ? 'PARTIAL_RUNTIME_PATH_CLOSURE_STRENGTHENED'
      : 'PARTIAL_RUNTIME_PATH',
    claimClosingReadiness: (
      diagnostics.passCount > 0
      && diagnostics.ambiguousCount > 0
      && diagnostics.failCount > 0
      && diagnostics.confoundedMembers === 0
      && targetedFirstCrossing
      && cleanIsolation
    ) ? 'CLAIM_CLOSING_READY_RUNTIME_EVIDENCE'
      : (
        diagnostics.passCount > 0
        && diagnostics.ambiguousCount > 0
        && diagnostics.failCount > 0
        && diagnostics.confoundedMembers === 0
        && targetedFirstCrossing
      ) ? 'NEAR_CLAIM_CLOSING_RUNTIME_EVIDENCE'
      : 'INSUFFICIENT_FOR_CLAIM_CLOSING'
  };
  return {
    familyId: family.familyId,
    description: family.description,
    targetedInvariant: family.targetedInvariant || 'I_ri',
    maturity: 'PARTIAL_RUNTIME_PATH',
    thresholds,
    members,
    transitionIndex,
    firstBoundaryCrossing: firstCrossing,
    familyDiagnostics: diagnostics,
    closureSummary,
    cleanMembers: cleanMembers.map((member) => member.caseId),
    externalMaterializationDependencies: [
      'final claim-ledger epistemic promotion remains outside runtime'
    ],
    notes: [
      'Boundary family evaluation now exposes a runtime-facing closure summary that separates true targeted crossing from background degradation.',
      'Claim promotion remains external to this module and must still respect the frozen release ledger.'
    ]
  };
};

export const createBoundaryFamilyFromInvariantPackage = ({
  familyId,
  description,
  invariantPackage,
  targetedInvariant = 'I_ri',
  deltas = [0, 0.08, 0.16],
  targetScores = null
}) => {
  const baseScores = Object.fromEntries(
    Object.entries(invariantPackage?.invariants || {}).map(([id, record]) => [id, clamp01(record?.score)])
  );
  const ladder = Array.isArray(targetScores) && targetScores.length > 0 ? targetScores : deltas.map((delta) => clamp01(baseScores[targetedInvariant] - delta));
  const members = ladder.map((targetScore, index) => {
    const nextScores = { ...baseScores };
    nextScores[targetedInvariant] = clamp01(targetScore);
    return {
      caseId: `${familyId}_member_${index}`,
      position: index,
      invariantScores: nextScores
    };
  });
  return buildBoundaryProbeFamily({
    familyId,
    description,
    generatorPath: 'src/canon/boundary/BoundaryProbeScaffold.js#createBoundaryFamilyFromInvariantPackage',
    evaluationPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeFamily',
    decisionPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeMember',
    targetedInvariant,
    members,
    maturity: 'PARTIAL_RUNTIME_PATH'
  });
};

const uniqueSorted = (values = []) => [...new Set(values.filter((value) => Number.isFinite(value)))].sort((a, b) => a - b);

const buildWindowEnds = (ticks = [], memberCount = 5) => {
  if (!Array.isArray(ticks) || ticks.length === 0) return [];
  if (ticks.length === 1) return [1];
  const desired = Math.max(3, Math.min(memberCount, ticks.length));
  const ends = [];
  for (let idx = 1; idx <= desired; idx += 1) {
    const ratio = idx / desired;
    const end = Math.max(1, Math.round(ratio * ticks.length));
    ends.push(Math.min(ticks.length, end));
  }
  const normalized = uniqueSorted(ends);
  if (normalized[normalized.length - 1] !== ticks.length) normalized.push(ticks.length);
  return normalized;
};

const buildRuntimeWindowCandidates = ({ header = {}, summary = {}, verdict = {}, ticks = [], targetedInvariant = 'I_ri', memberCount = 5 }) => {
  const prefixWindows = buildWindowEnds(ticks, memberCount).map((end) => ({ start: 0, end }));
  const rollingSize = Math.max(4, Math.min(ticks.length, Math.floor(ticks.length / 3) || ticks.length));
  const rollingStep = Math.max(1, Math.floor(rollingSize / 2));
  const rollingWindows = [];
  if (ticks.length > rollingSize) {
    for (let start = 0; start + rollingSize <= ticks.length; start += rollingStep) {
      rollingWindows.push({ start, end: start + rollingSize });
    }
    const finalStart = Math.max(0, ticks.length - rollingSize);
    if (!rollingWindows.some((window) => window.start === finalStart && window.end === ticks.length)) {
      rollingWindows.push({ start: finalStart, end: ticks.length });
    }
  }
  const uniqueWindows = [];
  const seen = new Set();
  for (const window of [...prefixWindows, ...rollingWindows]) {
    const key = `${window.start}:${window.end}`;
    if (seen.has(key)) continue;
    seen.add(key);
    uniqueWindows.push(window);
  }
  return uniqueWindows.map((window, candidateIndex) => {
    const windowTicks = ticks.slice(window.start, window.end);
    const windowPackage = buildCanonicalInvariantPackage({ header, summary, verdict, ticks: windowTicks });
    if (['I_per', 'I_ri', 'I_int', 'I_cont', 'I_diff', 'I_leg'].some((id) =>
      windowPackage.invariants[id]?.provenance?.scoreEvidenceStatus !== 'complete_recorded')) return null;
    const invariantScores = flattenInvariantScores(windowPackage);
    return {
      candidateIndex,
      windowStart: window.start,
      windowEnd: window.end,
      tickCount: windowTicks.length,
      terminalTick: windowTicks[windowTicks.length - 1]?.tick ?? (window.end - 1),
      targetedScore: clamp01(invariantScores[targetedInvariant]),
      invariantScores
    };
  }).filter(Boolean);
};

const sampleBoundaryRepresentatives = (candidates = [], targetedInvariant = 'I_ri', memberCount = 5) => {
  if (!candidates.length) return [];
  const sorted = [...candidates].sort((a, b) => b.targetedScore - a.targetedScore);
  const desired = Math.max(3, Math.min(memberCount, sorted.length));
  if (sorted.length <= desired) return sorted;
  const picks = [];
  for (let idx = 0; idx < desired; idx += 1) {
    const ratio = desired === 1 ? 0 : idx / (desired - 1);
    const selected = Math.min(sorted.length - 1, Math.round(ratio * (sorted.length - 1)));
    picks.push(sorted[selected]);
  }
  const deduped = [];
  const seen = new Set();
  for (const pick of picks) {
    const key = `${pick.windowStart}:${pick.windowEnd}`;
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(pick);
  }
  return deduped.sort((a, b) => b.targetedScore - a.targetedScore);
};

export const createBoundaryFamilyFromRuntimeTrajectory = ({
  familyId,
  description,
  header = {},
  summary = {},
  verdict = {},
  ticks = [],
  targetedInvariant = 'I_ri',
  memberCount = 5
}) => {
  const candidates = buildRuntimeWindowCandidates({ header, summary, verdict, ticks, targetedInvariant, memberCount });
  if (!candidates.length) {
    return buildBoundaryProbeFamily({
      familyId,
      description,
      generatorPath: 'src/canon/boundary/BoundaryProbeScaffold.js#createBoundaryFamilyFromRuntimeTrajectory',
      evaluationPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeFamily',
      decisionPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeMember',
      targetedInvariant,
      members: []
    });
  }

  const representatives = sampleBoundaryRepresentatives(candidates, targetedInvariant, memberCount);
  const members = representatives.map((candidate, index) => ({
    caseId: `${familyId}_window_${index}`,
    position: index,
    tickCount: candidate.tickCount,
    windowStart: candidate.windowStart,
    windowEnd: candidate.windowEnd,
    terminalTick: candidate.terminalTick,
    targetedScore: candidate.targetedScore,
    invariantScores: candidate.invariantScores
  }));

  return buildBoundaryProbeFamily({
    familyId,
    description,
    generatorPath: 'src/canon/boundary/BoundaryProbeScaffold.js#createBoundaryFamilyFromRuntimeTrajectory',
    evaluationPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeFamily',
    decisionPath: 'src/canon/boundary/BoundaryProbeScaffold.js#evaluateBoundaryProbeMember',
    targetedInvariant,
    members,
    maturity: 'PARTIAL_RUNTIME_PATH'
  });
};
