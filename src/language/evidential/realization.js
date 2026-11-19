// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Unified first-person evidential verifier and publisher; never certifies philosophy or external support.
import { EVIDENTIAL_SCHEMA, parseEvidentialRealization } from './claimGrammar.js';
import { buildEvidentialProseContext, verifyFactualAtom, verifySentenceEvidential } from './factualVerifier.js';
import { inspectOpenProseDetails, SCOPE_TEXT, V5_GUARANTEE } from './epistemicPolicy.js';
import { segmentAnswer, assembleText } from '../freeRealization.js';
import { planAnswer, composeLocalAnswer } from '../narrator.js';
import { resolveIntent } from '../intentResolver.js';
import { MODULE_NAMES } from '../moduleInventory.generated.js';
import { freezeData } from '../../experiments/workbench/contracts.js';
import { resolveSnapshotEndogenousDecision } from '../../canon/epistemic/EndogenousEpistemicDecisionEngine.js';

export function verifyEvidentialRealization(parsed, context, proseContext = null) {
  const envelope =
    parsed.snapshot.digest === context.snapshot.digest
    && parsed.snapshot.tick === context.snapshot.tick;

  const atoms = (parsed.atoms || []).map((atom) => verifyFactualAtom(atom, context));
  const resolvedProse = proseContext || buildEvidentialProseContext({
    snapshot: context.snapshot,
    factualContext: context
  });

  const segments = segmentAnswer(parsed.answer);
  const sentences = [];
  for (const seg of segments) {
    if (seg.blank) continue;
    const factual = verifySentenceEvidential(seg.text, resolvedProse);
    const epistemic = inspectOpenProseDetails(seg.text, context);
    const reasons = [...factual.reasons];
    for (const item of epistemic) {
      const key = `${item.reason}:${item.token || ''}`;
      if (!reasons.some((r) => `${r.reason}:${r.detail || ''}` === key)) {
        reasons.push({ reason: item.reason, detail: item.token || item.pattern });
      }
    }
    sentences.push({
      index: seg.index,
      lineIndex: seg.lineIndex,
      text: seg.text,
      ok: reasons.length === 0,
      reasons,
      diagnostics: epistemic,
      numbers: factual.numbers,
      b2Matches: factual.b2Matches
    });
  }

  const discrepancies = [
    ...(!envelope ? [{ reason: 'v5_full_snapshot_binding', detail: `${String(parsed.snapshot.digest).slice(0, 12)}@${parsed.snapshot.tick}` }] : []),
    ...atoms
      .filter((atom) => !atom.ok)
      .map((atom) => ({
        atom: atom.id,
        reason: atom.reasons.join(','),
        ...(atom.details?.length ? { details: atom.details } : {})
      })),
    ...sentences.flatMap((s) =>
      s.reasons.map((r) => ({
        sentence: s.index,
        reason: r.reason,
        detail: r.detail,
        ...(s.diagnostics?.length ? { details: s.diagnostics } : {})
      }))
    )
  ];

  return freezeData({
    ok: discrepancies.length === 0 && sentences.length > 0,
    envelope,
    atoms,
    segments,
    sentences,
    discrepancies,
    guaranteeNote: V5_GUARANTEE,
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  });
}

export function evaluateEvidential(context, modelText, proseContext = null) {
  try {
    const parsed = parseEvidentialRealization(modelText);
    const verification = verifyEvidentialRealization(parsed, context, proseContext);
    return { ok: verification.ok, verification, error: null, errorDetails: null };
  } catch (error) {
    return {
      ok: false,
      verification: null,
      error: String(error.message || 'v5_contract_error'),
      errorDetails: error?.details || null
    };
  }
}

export function evidentialGracefulCandidate(verification) {
  if (!verification?.envelope) return null;
  if (verification.atoms?.some((atom) => !atom.ok)) return null;
  const kept = verification.sentences.filter((s) => s.ok);
  if (!kept.length) return null;
  return {
    kept,
    withheld: verification.sentences.filter((s) => !s.ok),
    droppedAtoms: []
  };
}

function formatLocalEndogenousDecisionSummary(snapshot) {
  const eed = resolveSnapshotEndogenousDecision(snapshot);
  if (!eed || typeof eed.decision_code !== 'string') return '';
  return `${eed.canonical_first_person_verdict} [decision_code=${eed.decision_code}; decision_digest=${String(eed.decision_digest || '').slice(0, 16)}].`;
}

function formatLocalWorkbenchSummary(registry) {
  if (!registry || registry.status !== 'verified_internal_copy' || !registry.entries?.length) {
    return 'Evidencia experimental B2 en copia aislada: not_recorded.';
  }
  const lines = registry.entries.map(
    (e) =>
      `Copia aislada ${e.captureDigest.slice(0, 12)} (ticks ${e.sourceTick + 1}-${e.endTick}, rama ${e.branchId}, intervención ${e.intervention}): maxAbsDiff = ${e.measures.maxAbsDiff}, actionDivergence = ${e.measures.actionDivergence}, deltaInTubeRate = ${e.measures.deltaInTubeRate}, deltaObjectiveScore = ${e.measures.deltaObjectiveScore} (resultado en copia aislada, no del estado vivo ni soporte externo).`
  );
  return lines.join(' ');
}

function buildEvidentialConcordance(publishedSentences, verifiedAtoms, context) {
  const rows = [];
  const seen = new Set();

  for (const s of publishedSentences) {
    for (const m of s.b2Matches || []) {
      const atomKey = `b2:${s.index}:${m.entry.branchId}:${m.measure}:${m.token}`;
      if (seen.has(atomKey)) continue;
      seen.add(atomKey);
      rows.push({
        atom: `${m.entry.branchId}.${m.measure}`,
        sentence: s.index,
        type: 'measured_effect',
        inserted: m.token,
        engine: m.value,
        source: `workbench:${m.entry.resultDigest.slice(0, 12)} (ticks ${m.entry.sourceTick + 1}-${m.entry.endTick})`,
        status: 'verified_b2',
        binding: { digest: context.snapshot.digest, tick: context.snapshot.tick }
      });
    }
    for (const n of s.numbers || []) {
      // Skip duplicating numbers already logged as verified B2 effects.
      if ((s.b2Matches || []).some((m) => m.token === n.token)) continue;
      const rowStatus = n.status === 'exact_match' ? 'exact_match' : 'from_fact';
      const key = `num:${s.index}:${n.metric || 'literal'}:${n.token}`;
      if (seen.has(key)) continue;
      seen.add(key);
      rows.push({
        atom: n.metric || `f${s.index}:${n.token}`,
        sentence: s.index,
        type: n.metric?.includes('sigma_defect_bound') ? 'analytical_bound' : 'metric_value',
        inserted: n.token,
        engine: n.engine ?? n.token,
        source: n.engineSource || n.status || 'paquete',
        status: rowStatus,
        binding: { digest: context.snapshot.digest, tick: context.snapshot.tick }
      });
    }
  }

  for (const atom of verifiedAtoms || []) {
    rows.push({
      atom: atom.id,
      sentence: '—',
      type: atom.type,
      inserted: atom.value,
      engine: atom.value,
      source: atom.source,
      status: 'verified_atom',
      binding: atom.binding
    });
  }

  const outOfTolerance = rows.filter((r) => r.status === 'out_of_tolerance').length;
  const exact = rows.filter((r) => r.status === 'exact_match' || r.status === 'verified_b2' || r.status === 'verified_atom').length;
  const fromFact = rows.filter((r) => r.status === 'from_fact').length;
  return {
    rows,
    summary: {
      total: rows.length,
      exact,
      fromFact,
      outOfTolerance
    }
  };
}

function buildEvidenceList(publishedText, verifiedAtoms, context, proseContext) {
  const list = [];
  for (const atom of verifiedAtoms || []) {
    list.push({
      id: atom.id,
      kind: atom.type,
      evidenceClass: atom.evidenceClass,
      source: atom.source,
      provenance: atom.provenance,
      expressedBy: 'verified_atom'
    });
  }
  if (context.evidenceRegistry.status === 'verified_internal_copy') {
    for (const entry of context.evidenceRegistry.entries) {
      list.push({
        id: `workbench.${entry.branchId}`,
        kind: 'measured_effect',
        evidenceClass: 'derived_proxy',
        source: `workbench:${entry.resultDigest.slice(0, 12)} (copia ${entry.captureDigest.slice(0, 12)})`,
        provenance: entry,
        expressedBy: 'b2_verified_registry'
      });
    }
  } else {
    list.push({
      id: 'workbench.b2_absence',
      kind: 'explicit_absence',
      evidenceClass: 'artifact_only',
      source: 'evidenceRegistry:not_recorded',
      provenance: null,
      expressedBy: 'b2_verified_registry'
    });
  }
  if (context.ledgerDigest) {
    list.push({
      id: 'ledger.record',
      kind: 'ledger_event',
      evidenceClass: 'direct_signal',
      source: `ledger:${context.ledgerDigest.slice(0, 12)}`,
      provenance: proseContext?.ledgerSummary || null,
      expressedBy: 'verified_ledger_digest'
    });
  }
  const citedModules = MODULE_NAMES.filter(
    (name) => name.length >= 4 && /^[A-Z][a-z0-9]+[A-Z]/.test(name) && new RegExp(`\\b${name}\\b`).test(publishedText)
  );
  for (const mod of citedModules.slice(0, 12)) {
    list.push({
      id: `module.${mod}`,
      kind: 'module_attribution',
      evidenceClass: 'catalog',
      source: 'src/language/moduleInventory.generated.js',
      provenance: null,
      expressedBy: 'gemini_prose_verified'
    });
  }
  return list;
}

function sanitizeLocalEvidentialBase(text, hasEndogenous) {
  const legacyOpenings = [
    'Lectura de mi organización estructural en este tick y estado simétrico de la cuestión abierta.',
    'Datos estructurales medibles en este instante y frontera epistémica sin sesgo.',
    'Frontera epistémica simétrica y alcance verificable del runtime.',
    'Lo que las lecturas sostienen y lo que el marco mantiene abierto.',
    'Te digo qué calcula el runtime y qué permanece abierto.'
  ];
  let cleaned = String(text || '');
  const replacement = hasEndogenous
    ? 'Lectura determinista local del motor (Sistema B · Solo motor) subordinada a la decisión epistémica endógena del núcleo.'
    : 'Lectura determinista local del motor (Sistema B · Solo motor) y alcance verificable del runtime.';
  for (const opening of legacyOpenings) {
    if (cleaned.startsWith(opening)) {
      cleaned = `${replacement}${cleaned.slice(opening.length)}`;
      break;
    }
  }
  return cleaned;
}

export function finalizeEvidentialTurn(prepared, options, core, conversationSchema) {
  const context = prepared.evidentialContext;
  const snapshot = context.snapshot;
  const proseContext = prepared.proseContext || buildEvidentialProseContext({ snapshot, factualContext: context });
  const tries = (
    Array.isArray(options.attempts)
      ? options.attempts
      : options.modelText != null || options.modelError
        ? [{ modelText: options.modelText, modelError: options.modelError }]
        : []
  ).slice(0, 2);
  const mode = options.mode || (tries.length ? 'gemini' : 'local');
  const graceful = options.integrityMode === 'graceful';

  const sanitizePlan = prepared.reasoningPlan
    ? (() => {
        const { _promptArgs: _omit, ...rest } = prepared.reasoningPlan;
        return rest;
      })()
    : null;

  const trace = {
    schema: EVIDENTIAL_SCHEMA,
    contract: 'evidential',
    snapshotTick: snapshot.tick,
    snapshotDigest: snapshot.digest,
    registryDigest: context.evidenceRegistry.digest,
    route: 'local_evidential',
    mode,
    attempts: [],
    provider: options.provider || null,
    transportRetries: (options.transportRetries || []).slice(0, 4),
    reasoningPlan: sanitizePlan
  };
  const integrity = {
    mode: graceful ? 'graceful' : 'strict',
    severity: 'ok',
    banner: null,
    discrepancies: [],
    withheld: [],
    snapshotEcho: 'full_match',
    guaranteeNote: V5_GUARANTEE
  };

  const intent = prepared.intent || resolveIntent(prepared.question || '');
  const localPlan = planAnswer(intent, proseContext.props);
  const rawBaseLocal = composeLocalAnswer({
    intentResult: intent,
    plan: localPlan,
    props: proseContext.props,
    turnIndex: prepared.turnIndex || 0,
    controlProposal: prepared.controlProposal || null
  });
  const endogenousSummary = formatLocalEndogenousDecisionSummary(snapshot);
  const baseLocal = sanitizeLocalEvidentialBase(rawBaseLocal, Boolean(endogenousSummary));
  const localText = [
    endogenousSummary,
    baseLocal,
    formatLocalWorkbenchSummary(context.evidenceRegistry),
    SCOPE_TEXT
  ].filter(Boolean).join('\n\n').trim();

  let text = localText;
  let publishedSentences = [];
  let verification = null;
  let bestPartial = null;
  let localReading = null;

  if (mode === 'gemini') {
    for (const attempt of tries) {
      if (attempt.modelError) {
        trace.attempts.push({
          stage: 'transport',
          code: String(attempt.modelError.code || attempt.modelError.message || 'unknown')
        });
        continue;
      }
      const evaluation = evaluateEvidential(context, attempt.modelText, proseContext);
      const v = evaluation.verification;
      trace.attempts.push({
        stage: evaluation.ok ? 'verified' : 'rejected',
        error: evaluation.error,
        ...(evaluation.errorDetails ? { errorDetails: evaluation.errorDetails } : {}),
        discrepancies: v?.discrepancies?.slice(0, 16) || [],
        rejectedSentences: v?.sentences?.filter((s) => !s.ok).map((s) => ({
          index: s.index,
          text: String(s.text).slice(0, 400),
          reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`)
        })) || [],
        failedAtoms: v?.atoms?.filter((atom) => !atom.ok) || []
      });
      if (evaluation.ok) {
        verification = v;
        publishedSentences = v.sentences;
        text = assembleText(v.segments);
        if (prepared.controlProposal) text = `${text}\n\n${prepared.controlProposal.text}`.trim();
        trace.route = 'gemini_evidential_checked';
        break;
      }
      const candidate = evidentialGracefulCandidate(v);
      if (candidate && (!bestPartial || candidate.kept.length > bestPartial.candidate.kept.length)) {
        bestPartial = { v, candidate };
      }
    }

    if (!verification && graceful && bestPartial) {
      verification = bestPartial.v;
      publishedSentences = bestPartial.candidate.kept;
      const keptIndex = new Set(publishedSentences.map((s) => s.index));
      text = assembleText(verification.segments, (seg) => keptIndex.has(seg.index));
      if (prepared.controlProposal) text = `${text}\n\n${prepared.controlProposal.text}`.trim();
      trace.route = 'gemini_evidential_partial';
      integrity.severity = 'medium';
      integrity.withheld = bestPartial.candidate.withheld.map((s) => ({
        index: s.index,
        text: s.text,
        reasons: s.reasons.map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`),
        diagnostics: s.diagnostics
      }));
      integrity.discrepancies = verification.discrepancies.slice(0, 12);
      integrity.banner = `Modo graceful: publico ${publishedSentences.length} de ${verification.sentences.length} frases; ${integrity.withheld.length} quedaron retenidas en la traza.`;
    }

    if (!verification) {
      const transportOnly = trace.attempts.length > 0 && trace.attempts.every((a) => a.stage === 'transport');
      trace.route = transportOnly ? 'gemini_evidential_unavailable' : 'gemini_evidential_rejected';
      const lastAttempt = trace.attempts.at(-1);
      integrity.severity = 'high';
      integrity.snapshotEcho = verification?.envelope === false ? 'mismatch' : (lastAttempt?.error === 'v5_binding' ? 'mismatch' : 'none');
      integrity.discrepancies = lastAttempt?.discrepancies?.length
        ? lastAttempt.discrepancies
        : (lastAttempt?.error
            ? [{ reason: lastAttempt.error, ...(lastAttempt.errorDetails ? { details: [lastAttempt.errorDetails] } : {}) }]
            : []);
      integrity.banner = transportOnly
        ? 'Canal de lenguaje no disponible; muestro lectura local determinista.'
        : 'Sistema B retuvo la redacción; no superó la verificación factual/epistémica.';
      text = transportOnly
        ? 'Mi canal de lenguaje no respondió en este turno, así que muestro la lectura directa del motor.'
        : 'No se publica la redacción de este turno porque no superó la verificación del contrato Sistema B.';
      localReading = { label: 'Lectura local del motor (Sistema B)', text: localText, cites: [...localPlan.ids] };
    }
  } else {
    publishedSentences = localText.split(/(?<=[.!?])\s+/).filter(Boolean).map((line, idx) => ({
      index: idx + 1,
      text: line,
      numbers: [],
      b2Matches: []
    }));
  }

  const verifiedAtoms = verification?.atoms?.filter((atom) => atom.ok) || [];
  const concordance = buildEvidentialConcordance(publishedSentences, verifiedAtoms, context);
  const evidence = buildEvidenceList(text, verifiedAtoms, context, proseContext);

  return {
    text,
    intent: intent.intent,
    sentences: publishedSentences.map((s) => ({
      index: s.index,
      kind: 'evidential_prose',
      text: s.text,
      raw: s.text,
      cites: [],
      source: mode === 'gemini' ? 'gemini_evidential' : 'local_evidential',
      numbers: s.numbers || [],
      b2Matches: s.b2Matches || []
    })),
    evidence,
    trace,
    integrity,
    localReading,
    core,
    concordance,
    controlProposal: prepared.controlProposal && prepared.controlProposal.action ? prepared.controlProposal : null,
    record: {
      schema: conversationSchema,
      turnIndex: prepared.turnIndex,
      question: String(prepared.question || '').slice(0, 500),
      intent: intent.intent,
      intentLabel: intent.intent,
      tick: snapshot.tick,
      snapshotDigest: snapshot.digest,
      metrics: { ...snapshot.metrics },
      answerSummary: text.replace(/\s+/g, ' ').slice(0, 400),
      route: trace.route,
      sessionId: prepared.sessionId || null
    }
  };
}
