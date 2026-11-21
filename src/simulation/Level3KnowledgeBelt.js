// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Strictly append-only SHA-256 chained operational knowledge belt and audit ledger for Level 3 autonomous supervisor. Accurately tracks external_llm_assisted (true only when real external LLM reasoning was used; false on deterministic local fallback) and enforces external_support_certified=false.

import { sha256Hex, stableStringify } from '../utils/integrity.js';

export const LEVEL3_KNOWLEDGE_BELT_SCHEMA = 'qicn.level3_knowledge_belt.v1';
export const LEVEL3_AUDIT_LEDGER_SCHEMA = 'qicn.level3_audit_ledger.v1';
export const LEVEL3_AUDIT_BUNDLE_SCHEMA = 'qicn.level3_audit_bundle.v1';

export const LEVEL3_KNOWLEDGE_BELT_STORAGE_KEY = 'QICN_LEVEL3_KNOWLEDGE_BELT_V1';
export const LEVEL3_AUDIT_LEDGER_STORAGE_KEY = 'QICN_LEVEL3_AUDIT_LEDGER_V1';
export const LEVEL3_GENESIS_HASH = '0'.repeat(64);
export const LEVEL3_MAX_FINDINGS = 400;
export const LEVEL3_MAX_LEDGER_ENTRIES = 400;

export const LEVEL3_SCIENTIFIC_BOUNDARY = Object.freeze({
  evidence_scope: 'internal_support_only',
  external_support_certified: false
});

const round6 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(6)) : 0);

export function computeActionSignature(candidateAction) {
  if (!candidateAction || typeof candidateAction !== 'object') return 'none';
  const kind = String(candidateAction.kind || 'none');
  if (kind === 'none') return 'none';
  if (kind === 'kaizen_factor_nudge') {
    const key = String(candidateAction.key || '');
    const steps = Number(candidateAction.deltaSteps) || 0;
    const sign = steps > 0 ? `+${steps}` : `${steps}`;
    return `kaizen_factor_nudge:${key}:${sign}`;
  }
  if (kind === 'kaizen_strategy_action') {
    return `kaizen_strategy_action:${String(candidateAction.strategyId || '')}`;
  }
  if (kind === 'workbench_intervention') {
    return `workbench_intervention:${String(candidateAction.intervention || '')}`;
  }
  if (kind === 'staged_code_patch') {
    const target = String(candidateAction.targetModule || 'unspecified').slice(0, 64);
    const summary = String(candidateAction.patchSummary || '').slice(0, 48);
    return `staged_code_patch:${target}:${summary}`;
  }
  return `unknown:${kind}`;
}

export function computeRegimeSignature({
  cluster = 'balanced',
  couplingMode = 'bidirectional',
  level2Enabled = true,
  kaizenLearned = true
} = {}) {
  return `${String(cluster || 'balanced')}|${String(couplingMode || 'off')}|L2:${level2Enabled ? 'on' : 'off'}|K:${kaizenLearned ? 'learned' : 'legacy'}`;
}

function hashFindingBody(body) {
  return sha256Hex(`${LEVEL3_KNOWLEDGE_BELT_SCHEMA}\n${stableStringify(body)}`);
}

function hashLedgerEntryBody(body) {
  return sha256Hex(`${LEVEL3_AUDIT_LEDGER_SCHEMA}\n${stableStringify(body)}`);
}

export function createEmptyKnowledgeBelt() {
  return {
    schema: LEVEL3_KNOWLEDGE_BELT_SCHEMA,
    external_llm_assisted: false,
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    anchorHash: LEVEL3_GENESIS_HASH,
    headHash: LEVEL3_GENESIS_HASH,
    findings: []
  };
}

export function verifyLevel3KnowledgeBelt(belt) {
  if (!belt || typeof belt !== 'object') {
    return { ok: false, reason: 'belt_missing' };
  }
  if (belt.schema !== LEVEL3_KNOWLEDGE_BELT_SCHEMA) {
    return { ok: false, reason: 'belt_schema_mismatch' };
  }
  if (
    typeof belt.external_llm_assisted !== 'boolean' ||
    belt.evidence_scope !== 'internal_support_only' ||
    belt.external_support_certified !== false
  ) {
    return { ok: false, reason: 'belt_scientific_boundary_violation' };
  }
  if (!Array.isArray(belt.findings)) {
    return { ok: false, reason: 'belt_findings_not_array' };
  }
  let head = typeof belt.anchorHash === 'string' && belt.anchorHash.length === 64
    ? belt.anchorHash
    : LEVEL3_GENESIS_HASH;
  for (let i = 0; i < belt.findings.length; i += 1) {
    const item = belt.findings[i];
    if (!item || typeof item !== 'object' || typeof item.digest !== 'string') {
      return { ok: false, reason: 'finding_malformed', index: i };
    }
    if (
      typeof item.external_llm_assisted !== 'boolean' ||
      item.evidence_scope !== 'internal_support_only' ||
      item.external_support_certified !== false
    ) {
      return { ok: false, reason: 'finding_scientific_boundary_violation', index: i };
    }
    if (item.prevHash !== head) {
      return { ok: false, reason: 'finding_prev_hash_mismatch', index: i };
    }
    const { digest, ...body } = item;
    const expected = hashFindingBody(body);
    if (digest !== expected) {
      return { ok: false, reason: 'finding_digest_mismatch', index: i };
    }
    head = digest;
  }
  if (belt.headHash !== head) {
    return { ok: false, reason: 'belt_head_hash_mismatch' };
  }
  return { ok: true, count: belt.findings.length, headHash: head };
}

export function appendKnowledgeBeltFinding(beltInput, findingInput = {}) {
  const base = beltInput && verifyLevel3KnowledgeBelt(beltInput).ok
    ? structuredClone(beltInput)
    : createEmptyKnowledgeBelt();
  const nextSeq = base.findings.length > 0
    ? Number(base.findings[base.findings.length - 1].seq) + 1
    : 0;
  const candidateAction = findingInput.proposedAction && typeof findingInput.proposedAction === 'object'
    ? structuredClone(findingInput.proposedAction)
    : { kind: 'none' };
  const actionSignature = findingInput.actionSignature || computeActionSignature(candidateAction);
  const regimeSignature = String(findingInput.regimeSignature || computeRegimeSignature());
  const externalLlmAssisted = Boolean(findingInput.external_llm_assisted === true);

  const body = {
    seq: nextSeq,
    cycleId: String(findingInput.cycleId || `l3-cycle-${nextSeq}`),
    tick: Number.isFinite(Number(findingInput.tick)) ? Number(findingInput.tick) : 0,
    timestampMs: Number.isFinite(Number(findingInput.timestampMs)) ? Number(findingInput.timestampMs) : 0,
    triggerKind: String(findingInput.triggerKind || 'scheduled_exploration'),
    regimeSignature,
    actionSignature,
    proposedAction: candidateAction,
    hypothesis: String(findingInput.hypothesis || '').slice(0, 360),
    diagnosis: String(findingInput.diagnosis || '').slice(0, 360),
    verdict: String(findingInput.verdict || 'reflect_only'),
    reasonerSource: String(findingInput.reasonerSource || (externalLlmAssisted ? 'gemini_live' : 'deterministic_local')),
    workbenchProtocolDigest: findingInput.workbenchProtocolDigest ? String(findingInput.workbenchProtocolDigest) : null,
    workbenchResultDigest: findingInput.workbenchResultDigest ? String(findingInput.workbenchResultDigest) : null,
    prePromotionDigest: findingInput.prePromotionDigest ? String(findingInput.prePromotionDigest) : null,
    deltaObjectiveScore: round6(findingInput.deltaObjectiveScore ?? 0),
    deltaInTubeRate: round6(findingInput.deltaInTubeRate ?? 0),
    deltaSectorCoherenceMin: round6(findingInput.deltaSectorCoherenceMin ?? 0),
    external_llm_assisted: externalLlmAssisted,
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    prevHash: base.headHash
  };
  const digest = hashFindingBody(body);
  const sealed = Object.freeze({ ...body, digest });
  base.findings.push(sealed);

  if (base.findings.length > LEVEL3_MAX_FINDINGS) {
    const dropped = base.findings.splice(0, base.findings.length - LEVEL3_MAX_FINDINGS);
    base.anchorHash = dropped[dropped.length - 1].digest;
  }
  base.headHash = sealed.digest;
  base.external_llm_assisted = base.findings.some((f) => f.external_llm_assisted === true);
  return base;
}

export function isActionBlockedByKnowledgeBelt(belt, {
  regimeSignature,
  candidateAction,
  currentTick = 0,
  failureCooldownTicks = 60
} = {}) {
  const actionSignature = computeActionSignature(candidateAction);
  if (actionSignature === 'none' || !belt || !Array.isArray(belt.findings)) {
    return { blocked: false, reason: null, actionSignature };
  }
  const matching = belt.findings.filter(
    (f) => f.regimeSignature === regimeSignature && f.actionSignature === actionSignature
  );
  if (matching.length === 0) {
    return { blocked: false, reason: null, actionSignature };
  }
  const rolledBack = matching.find((f) => f.verdict === 'rolled_back_gate2');
  if (rolledBack) {
    return {
      blocked: true,
      reason: 'previously_rolled_back_in_gate2',
      actionSignature,
      priorCycleId: rolledBack.cycleId,
      priorTick: rolledBack.tick
    };
  }
  const gate1Failures = matching.filter((f) => f.verdict === 'rejected_gate1');
  if (gate1Failures.length > 0) {
    const lastFailure = gate1Failures[gate1Failures.length - 1];
    const ticksSince = Math.max(0, Number(currentTick) - Number(lastFailure.tick || 0));
    if (gate1Failures.length >= 2 || ticksSince < failureCooldownTicks) {
      return {
        blocked: true,
        reason: 'previously_rejected_in_gate1',
        actionSignature,
        priorCycleId: lastFailure.cycleId,
        priorTick: lastFailure.tick,
        failureCount: gate1Failures.length
      };
    }
  }
  return { blocked: false, reason: null, actionSignature };
}

export function summarizeKnowledgeBeltForPrompt(belt, { regimeSignature = '', limit = 6 } = {}) {
  const findings = Array.isArray(belt?.findings) ? belt.findings : [];
  const confirmed = findings
    .filter((f) => f.verdict === 'promoted_confirmed' && (!regimeSignature || f.regimeSignature === regimeSignature))
    .slice(-limit);
  const failed = findings
    .filter(
      (f) =>
        (f.verdict === 'rejected_gate1' || f.verdict === 'rolled_back_gate2') &&
        (!regimeSignature || f.regimeSignature === regimeSignature)
    )
    .slice(-limit);
  const recentReflections = findings
    .filter((f) => f.verdict === 'reflect_only')
    .slice(-2);

  const confirmedLines = confirmed.length > 0
    ? confirmed.map((f) => `  - [CONFIRMADO tick=${f.tick}] ${f.actionSignature} -> Δscore=${f.deltaObjectiveScore}, ΔinTube=${f.deltaInTubeRate} (digest=${f.digest.slice(0, 12)})`).join('\n')
    : '  - (ninguna intervención confirmada aún en este régimen)';
  const failedLines = failed.length > 0
    ? failed.map((f) => `  - [BLOQUEADO/FALLIDO (${f.verdict}) tick=${f.tick}] ${f.actionSignature} -> Δscore=${f.deltaObjectiveScore}, ΔinTube=${f.deltaInTubeRate} (PROHIBIDO REPETIR)`).join('\n')
    : '  - (ninguna intervención fallida registrada en este régimen)';

  const promptText = [
    `MEMORIA OPERATIVA ACUMULADA (Cinto SHA-256 head=${String(belt?.headHash || LEVEL3_GENESIS_HASH).slice(0, 16)}, régimen=${regimeSignature || 'global'}):`,
    'Hallazgos confirmados que mejoraron la planta:',
    confirmedLines,
    'Hipótesis probadas que fallaron o causaron rollback (NO las repitas):',
    failedLines
  ].join('\n');

  return {
    confirmedInRegime: confirmed,
    failedInRegime: failed,
    recentReflections,
    promptText
  };
}

export function createEmptyLevel3AuditLedger() {
  return {
    schema: LEVEL3_AUDIT_LEDGER_SCHEMA,
    external_llm_assisted: false,
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    anchorHash: LEVEL3_GENESIS_HASH,
    headHash: LEVEL3_GENESIS_HASH,
    entries: []
  };
}

export function verifyLevel3AuditLedger(ledger) {
  if (!ledger || typeof ledger !== 'object') {
    return { ok: false, reason: 'ledger_missing' };
  }
  if (ledger.schema !== LEVEL3_AUDIT_LEDGER_SCHEMA) {
    return { ok: false, reason: 'ledger_schema_mismatch' };
  }
  if (
    typeof ledger.external_llm_assisted !== 'boolean' ||
    ledger.evidence_scope !== 'internal_support_only' ||
    ledger.external_support_certified !== false
  ) {
    return { ok: false, reason: 'ledger_scientific_boundary_violation' };
  }
  if (!Array.isArray(ledger.entries)) {
    return { ok: false, reason: 'ledger_entries_not_array' };
  }
  let head = typeof ledger.anchorHash === 'string' && ledger.anchorHash.length === 64
    ? ledger.anchorHash
    : LEVEL3_GENESIS_HASH;
  const seenDigests = new Map();
  for (let i = 0; i < ledger.entries.length; i += 1) {
    const entry = ledger.entries[i];
    if (!entry || typeof entry !== 'object' || typeof entry.digest !== 'string') {
      return { ok: false, reason: 'entry_malformed', index: i };
    }
    if (
      typeof entry.external_llm_assisted !== 'boolean' ||
      entry.evidence_scope !== 'internal_support_only' ||
      entry.external_support_certified !== false
    ) {
      return { ok: false, reason: 'entry_scientific_boundary_violation', index: i };
    }
    if (entry.prevHash !== head) {
      return { ok: false, reason: 'entry_prev_hash_mismatch', index: i };
    }
    if (entry.entryKind === 'gate2_resolution') {
      if (!entry.parentCycleId || !entry.parentDigest) {
        return { ok: false, reason: 'gate2_resolution_missing_parent_link', index: i };
      }
      const parentDigest = seenDigests.get(entry.parentCycleId);
      if (parentDigest && parentDigest !== entry.parentDigest) {
        return { ok: false, reason: 'gate2_resolution_parent_digest_mismatch', index: i };
      }
    }
    const { digest, ...body } = entry;
    const expected = hashLedgerEntryBody(body);
    if (digest !== expected) {
      return { ok: false, reason: 'entry_digest_mismatch', index: i };
    }
    if (entry.entryKind !== 'gate2_resolution') {
      seenDigests.set(entry.cycleId, digest);
    }
    head = digest;
  }
  if (ledger.headHash !== head) {
    return { ok: false, reason: 'ledger_head_hash_mismatch' };
  }
  return { ok: true, count: ledger.entries.length, headHash: head };
}

export function appendLevel3AuditEntry(ledgerInput, entryInput = {}) {
  const base = ledgerInput && verifyLevel3AuditLedger(ledgerInput).ok
    ? structuredClone(ledgerInput)
    : createEmptyLevel3AuditLedger();
  const nextSeq = base.entries.length > 0
    ? Number(base.entries[base.entries.length - 1].seq) + 1
    : 0;
  const proposedAction = entryInput.proposedAction && typeof entryInput.proposedAction === 'object'
    ? structuredClone(entryInput.proposedAction)
    : { kind: 'none' };
  const actionSignature = entryInput.actionSignature || computeActionSignature(proposedAction);
  const externalLlmAssisted = Boolean(entryInput.external_llm_assisted === true);
  const entryKind = String(entryInput.entryKind || 'cycle_evaluation');

  const body = {
    seq: nextSeq,
    entryKind,
    cycleId: String(entryInput.cycleId || `l3-cycle-${nextSeq}`),
    parentCycleId: entryInput.parentCycleId ? String(entryInput.parentCycleId) : null,
    parentDigest: entryInput.parentDigest ? String(entryInput.parentDigest) : null,
    tick: Number.isFinite(Number(entryInput.tick)) ? Number(entryInput.tick) : 0,
    timestampMs: Number.isFinite(Number(entryInput.timestampMs)) ? Number(entryInput.timestampMs) : 0,
    triggerKind: String(entryInput.triggerKind || 'scheduled_exploration'),
    triggerFacts: entryInput.triggerFacts && typeof entryInput.triggerFacts === 'object'
      ? structuredClone(entryInput.triggerFacts)
      : {},
    regimeSignature: String(entryInput.regimeSignature || computeRegimeSignature()),
    snapshotDigest: String(entryInput.snapshotDigest || ''),
    firstPersonThought: String(entryInput.firstPersonThought || '').slice(0, 1200),
    diagnosis: String(entryInput.diagnosis || '').slice(0, 480),
    hypothesis: String(entryInput.hypothesis || '').slice(0, 480),
    actionMode: String(entryInput.actionMode || 'reflect_only'),
    proposedAction,
    actionSignature,
    reasonerSource: String(entryInput.reasonerSource || (externalLlmAssisted ? 'gemini_live' : 'deterministic_local')),
    reasonerError: entryInput.reasonerError ? String(entryInput.reasonerError).slice(0, 240) : null,
    gate1Summary: entryInput.gate1Summary && typeof entryInput.gate1Summary === 'object'
      ? structuredClone(entryInput.gate1Summary)
      : null,
    gate2Summary: entryInput.gate2Summary && typeof entryInput.gate2Summary === 'object'
      ? structuredClone(entryInput.gate2Summary)
      : null,
    finalStatus: String(entryInput.finalStatus || 'reflect_only'),
    quotaSnapshot: entryInput.quotaSnapshot && typeof entryInput.quotaSnapshot === 'object'
      ? structuredClone(entryInput.quotaSnapshot)
      : null,
    external_llm_assisted: externalLlmAssisted,
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    prevHash: base.headHash
  };
  const digest = hashLedgerEntryBody(body);
  const sealed = Object.freeze({ ...body, digest });
  base.entries.push(sealed);

  if (base.entries.length > LEVEL3_MAX_LEDGER_ENTRIES) {
    const dropped = base.entries.splice(0, base.entries.length - LEVEL3_MAX_LEDGER_ENTRIES);
    base.anchorHash = dropped[dropped.length - 1].digest;
  }
  base.headHash = sealed.digest;
  base.external_llm_assisted = base.entries.some((e) => e.external_llm_assisted === true);
  return base;
}

/**
 * Strictly append-only Gate 2 resolution entry (`R-7`).
 * Never mutates or re-seals prior entries: the original `promoted_watching` entry
 * retains its original SHA-256 `digest` forever, and a new `gate2_resolution` record
 * is chained at the head of the ledger referencing `parentCycleId` and `parentDigest`.
 */
export function appendLevel3Gate2ResolutionEntry(ledgerInput, cycleId, {
  tick,
  timestampMs = Date.now(),
  gate2Summary,
  finalStatus,
  quotaSnapshot = null
} = {}) {
  const base = ledgerInput && verifyLevel3AuditLedger(ledgerInput).ok
    ? structuredClone(ledgerInput)
    : createEmptyLevel3AuditLedger();
  const parent = base.entries.find((e) => e.cycleId === cycleId && e.entryKind !== 'gate2_resolution');
  if (!parent) return base;

  const resolvedTick = Number.isFinite(Number(tick))
    ? Number(tick)
    : Number(gate2Summary?.resolvedAtTick ?? parent.tick);

  return appendLevel3AuditEntry(base, {
    entryKind: 'gate2_resolution',
    cycleId: `${parent.cycleId}:gate2`,
    parentCycleId: parent.cycleId,
    parentDigest: parent.digest,
    tick: resolvedTick,
    timestampMs,
    triggerKind: parent.triggerKind,
    triggerFacts: { parentCycleId: parent.cycleId, parentTick: parent.tick },
    regimeSignature: parent.regimeSignature,
    snapshotDigest: parent.snapshotDigest,
    firstPersonThought: `Resolución de Compuerta 2 para mi ciclo ${parent.cycleId} (snapshot original ${parent.digest.slice(0, 12)}): ${finalStatus === 'promoted_confirmed' ? 'confirmado tras superar la ventana de vigilancia en vivo.' : 'revertido automáticamente mediante rollback dynamicState.v3 por degradación en vigilancia.'}`,
    diagnosis: parent.diagnosis,
    hypothesis: parent.hypothesis,
    actionMode: parent.actionMode,
    proposedAction: parent.proposedAction,
    actionSignature: parent.actionSignature,
    reasonerSource: parent.reasonerSource,
    external_llm_assisted: parent.external_llm_assisted,
    gate1Summary: null,
    gate2Summary: gate2Summary ? structuredClone(gate2Summary) : null,
    finalStatus: String(finalStatus || parent.finalStatus),
    quotaSnapshot: quotaSnapshot || parent.quotaSnapshot
  });
}

// Backwards-compatible alias that delegates strictly to the append-only resolution entry
export const updateLevel3AuditEntryGate2 = appendLevel3Gate2ResolutionEntry;

/**
 * Projects a consolidated cycle view from the strictly append-only ledger (`R-7`).
 * Each `cycle_evaluation` entry retains its original `digest` (`initialDigest`),
 * while any subsequent `gate2_resolution` entry referencing `parentCycleId` and `parentDigest`
 * supplies the resolved `finalStatus`, `gate2Summary`, and `gate2ResolutionDigest`.
 */
export function projectLedgerCyclesWithGate2(ledger) {
  const entries = Array.isArray(ledger?.entries) ? ledger.entries : [];
  const resolutionsByParent = new Map();
  for (const entry of entries) {
    if (entry.entryKind === 'gate2_resolution' && entry.parentCycleId) {
      resolutionsByParent.set(entry.parentCycleId, entry);
    }
  }
  const cycles = [];
  for (const entry of entries) {
    if (entry.entryKind === 'gate2_resolution') continue;
    const resolution = resolutionsByParent.get(entry.cycleId) || null;
    if (resolution && resolution.parentDigest === entry.digest) {
      cycles.push({
        ...entry,
        initialStatus: entry.finalStatus,
        finalStatus: resolution.finalStatus,
        gate2Summary: resolution.gate2Summary || entry.gate2Summary,
        gate2ResolutionDigest: resolution.digest,
        gate2ResolvedAtTick: resolution.tick
      });
    } else {
      cycles.push({
        ...entry,
        initialStatus: entry.finalStatus,
        gate2ResolutionDigest: null,
        gate2ResolvedAtTick: null
      });
    }
  }
  return cycles;
}

export function exportLevel3SealedAuditBundle({
  ledger,
  belt,
  sourceTick = 0,
  sourceBuild = { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-LOCAL' }
} = {}) {
  const ledgerCheck = verifyLevel3AuditLedger(ledger);
  if (!ledgerCheck.ok) throw new Error(`level3_export_invalid_ledger:${ledgerCheck.reason}`);
  const beltCheck = verifyLevel3KnowledgeBelt(belt);
  if (!beltCheck.ok) throw new Error(`level3_export_invalid_belt:${beltCheck.reason}`);

  const llmAssistedEntries = ledger.entries.filter((e) => e.external_llm_assisted === true).length;
  const deterministicLocalEntries = ledger.entries.filter((e) => e.external_llm_assisted === false).length;
  const externalLlmAssisted =
    llmAssistedEntries > 0 ||
    belt.findings.some((f) => f.external_llm_assisted === true);

  const body = {
    schema: LEVEL3_AUDIT_BUNDLE_SCHEMA,
    external_llm_assisted: externalLlmAssisted,
    llmAssistedEntries,
    deterministicLocalEntries,
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    sourceTick: Number(sourceTick) || 0,
    sourceBuild: {
      version: String(sourceBuild?.version || '2.1.0-REINFORCED'),
      signature: String(sourceBuild?.signature || 'QICN-SIG-LOCAL')
    },
    ledger: structuredClone(ledger),
    knowledgeBelt: structuredClone(belt)
  };
  const digest = sha256Hex(`${LEVEL3_AUDIT_BUNDLE_SCHEMA}\n${stableStringify(body)}`);
  return Object.freeze({ ...body, digest });
}

export function verifyLevel3SealedAuditBundle(bundle) {
  if (!bundle || typeof bundle !== 'object' || bundle.schema !== LEVEL3_AUDIT_BUNDLE_SCHEMA) {
    return { ok: false, reason: 'bundle_schema_mismatch' };
  }
  if (
    typeof bundle.external_llm_assisted !== 'boolean' ||
    bundle.evidence_scope !== 'internal_support_only' ||
    bundle.external_support_certified !== false
  ) {
    return { ok: false, reason: 'bundle_scientific_boundary_violation' };
  }
  const { digest, ...body } = bundle;
  const expected = sha256Hex(`${LEVEL3_AUDIT_BUNDLE_SCHEMA}\n${stableStringify(body)}`);
  if (digest !== expected) {
    return { ok: false, reason: 'bundle_digest_mismatch' };
  }
  const ledgerCheck = verifyLevel3AuditLedger(bundle.ledger);
  if (!ledgerCheck.ok) return { ok: false, reason: `bundle_ledger_${ledgerCheck.reason}` };
  const beltCheck = verifyLevel3KnowledgeBelt(bundle.knowledgeBelt);
  if (!beltCheck.ok) return { ok: false, reason: `bundle_belt_${beltCheck.reason}` };
  const expectedLlmFlag =
    bundle.ledger.entries.some((e) => e.external_llm_assisted === true) ||
    bundle.knowledgeBelt.findings.some((f) => f.external_llm_assisted === true);
  if (bundle.external_llm_assisted !== expectedLlmFlag) {
    return { ok: false, reason: 'bundle_external_llm_assisted_mismatch' };
  }
  return {
    ok: true,
    digest,
    external_llm_assisted: bundle.external_llm_assisted,
    ledgerEntries: ledgerCheck.count,
    beltFindings: beltCheck.count
  };
}
