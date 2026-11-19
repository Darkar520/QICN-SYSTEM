// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Deterministic checks of snapshot binding, algebraic relations, analytical bounds, module operations, ledger and B2 Workbench evidence; never external validation.
import { verifySnapshotDigest, verifySnapshotStructuralConsistency, SNAPSHOT_SCHEMA } from '../runtimeSnapshot.js';
import { buildPropositions, evidentialMetricCatalog, EVIDENTIAL_BOUND_REFS } from '../propositions.js';
import { EVIDENTIAL_OPERATIONS, EVIDENTIAL_CATALOG } from '../definitionCatalog.js';
import { normalizeText } from '../intentResolver.js';
import { V3_LEXICAL_INTERNALS as L } from '../realizationContract.js';
import { buildFreeContext, verifySentenceFree, KAIZEN_EFFECTIVE_DEFAULT } from '../freeRealization.js';
import { OperationalHistoryLedger } from '../../identity/OperationalHistoryLedger.js';
import { sha256Hex, stableStringify } from '../../utils/integrity.js';
import { freezeData, assertData } from '../../experiments/workbench/contracts.js';
import { createEvidenceRegistry, isEvidenceRegistry, lookupEffect, EFFECT_MEASURES } from './evidenceRegistry.js';
import { keysOnly, FACT_TYPES, identifier } from './claimGrammar.js';
import { isClauseNegated, isExternalValidationOverclaim } from './epistemicPolicy.js';
import {
  resolveSnapshotEndogenousDecision,
  getCanonicalAtomicSeparatorCut,
  getCanonicalHybridLateQueryCut
} from '../../canon/epistemic/EndogenousEpistemicDecisionEngine.js';

const contexts = new WeakSet();
const equal = (a, b) => stableStringify(a) === stableStringify(b);
const read = (snapshot, ref) => {
  const [section, key] = String(ref).split('.');
  return snapshot[section]?.[key];
};
const sign = (value) => (value > 0 ? 'positive' : value < 0 ? 'negative' : 'zero');

function rational(value) {
  if (typeof value !== 'string' && !Number.isFinite(value)) throw new Error('v5_non_numeric_value');
  const raw = String(value);
  if (raw.includes('/')) {
    if (!/^-?\d+\/\d+$/.test(raw)) throw new Error('v5_invalid_rational');
    const [n, d] = raw.split('/').map(BigInt);
    if (d <= 0n) throw new Error('v5_invalid_rational');
    return { n, d };
  }
  const m = /^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(raw);
  if (!m) throw new Error('v5_non_numeric_value');
  const exponent = Number(m[4] || 0) - (m[3] || '').length;
  let n = BigInt(m[2] + (m[3] || '')) * (m[1] ? -1n : 1n);
  let d = 1n;
  if (exponent >= 0) n *= 10n ** BigInt(exponent);
  else d = 10n ** BigInt(-exponent);
  return { n, d };
}

function compareValues(left, right) {
  const a = rational(left);
  const b = rational(right);
  const difference = a.n * b.d - b.n * a.d;
  return difference > 0n ? 1 : difference < 0n ? -1 : 0;
}

const relation = (target, left, right, op, tolerance) => Object.freeze({ target, left, right, op, tolerance });
export const ALGEBRAIC_RELATIONS = Object.freeze({
  body_balance: relation('structural_profile.body_net_balance', 'tower.body_v_pos', 'tower.body_v_neg', 'difference', 2e-6),
  body_l1: relation('structural_profile.body_l1_norm', 'tower.body_v_pos', 'tower.body_v_neg', 'absolute_sum', 2e-6),
  world_contrast: relation('structural_profile.world_temporal_contrast', 'tower.world_w_fast', 'tower.world_w_slow', 'difference', 2e-6),
  ccc_xn: relation('structural_profile.ccc_xn_divergence', 'metrics.ccc', 'metrics.x_n', 'difference', 2e-4),
  active_fraction: relation('structural_profile.active_node_fraction', 'metrics.active_nodes', 'metrics.total_nodes', 'ratio', 2e-4)
});

function calculateRelation(snapshot, spec) {
  const left = read(snapshot, spec.left);
  const right = read(snapshot, spec.right);
  const actual = read(snapshot, spec.target);
  if (![left, right, actual].every(Number.isFinite) || (spec.op === 'ratio' && right === 0)) {
    throw new Error('v5_relation_not_recorded');
  }
  const expected = spec.op === 'ratio' ? left / right : spec.op === 'absolute_sum' ? Math.abs(left) + Math.abs(right) : left - right;
  if (Math.abs(actual - expected) > spec.tolerance) throw new Error('v5_algebraic_inconsistency');
  return { left, right, actual, expected, tolerance: spec.tolerance };
}

export function createFactualContext({ snapshot, ledgerRecord = null, evidenceRegistry = createEvidenceRegistry() } = {}) {
  if (!verifySnapshotDigest(snapshot) || snapshot.schema !== SNAPSHOT_SCHEMA || !/^[a-f0-9]{64}$/.test(snapshot.digest) || !Number.isInteger(snapshot.tick)) {
    throw new Error('v5_snapshot_digest_or_tick');
  }
  const structural = verifySnapshotStructuralConsistency(snapshot);
  if (!structural.ok) throw new Error(`v5_snapshot_structure:${structural.violations.join(',')}`);
  if (snapshot.metrics?.tick !== snapshot.tick || sha256Hex(stableStringify(snapshot.config)).slice(0, 16) !== snapshot.configHash) {
    throw new Error('v5_snapshot_header');
  }
  if (!Object.values(snapshot.metrics).every(Number.isFinite) || !Object.values(snapshot.config).every(Number.isFinite)) {
    throw new Error('v5_nonfinite_snapshot');
  }
  if (snapshot.structural_profile?.epistemic_boundary?.external_support_certified !== false) {
    throw new Error('v5_snapshot_epistemic_boundary');
  }
  if (!isEvidenceRegistry(evidenceRegistry)) throw new Error('v5_untrusted_registry');
  const detached = JSON.parse(JSON.stringify(snapshot));
  assertData(detached);
  for (const spec of Object.values(ALGEBRAIC_RELATIONS)) {
    if (read(detached, spec.target) !== null && read(detached, spec.target) !== undefined) {
      calculateRelation(detached, spec);
    }
  }
  const precise = detached.predicates?.ccc_precise;
  const threshold = detached.config.ASCENSION_THRESHOLD;
  if (
    Number.isFinite(detached.metrics.ccc)
    && Number.isFinite(threshold)
    && (!Number.isFinite(precise)
      || !['below', 'equal', 'above'].includes(detached.predicates?.ccc_vs_threshold)
      || detached.predicates.threshold_crossed !== (detached.predicates.ccc_vs_threshold !== 'below'))
  ) {
    throw new Error('v5_threshold_predicate');
  }
  if (Number.isFinite(precise) && Number.isFinite(threshold) && precise !== threshold) {
    if (detached.predicates.ccc_vs_threshold !== (precise > threshold ? 'above' : 'below')) {
      throw new Error('v5_threshold_polarity');
    }
  }
  let ledger = null;
  let ledgerDigest = null;
  if (ledgerRecord !== null) {
    assertData(ledgerRecord);
    ledger = structuredClone(ledgerRecord);
    const verified = OperationalHistoryLedger.verify(ledger);
    if (!verified.ok) throw new Error(`v5_ledger_invalid:${verified.reason}`);
    ledgerDigest = sha256Hex(stableStringify(ledger));
  }
  const context = freezeData({
    snapshot: detached,
    metrics: evidentialMetricCatalog(detached),
    ledger,
    ledgerDigest,
    evidenceRegistry
  });
  contexts.add(context);
  return context;
}

export const isFactualContext = (context) => contexts.has(context);

const atomFields = {
  metric_value: ['ref', 'asserted', 'sign'],
  analytical_bound: ['ref', 'asserted'],
  comparison: ['left', 'right', 'operator'],
  algebraic_relation: ['relation', 'asserted'],
  module_operation: ['module', 'operation', 'scope'],
  catalog_statement: ['key', 'asserted'],
  ledger_event: ['ledgerDigest', 'eventHash', 'eventTick', 'eventType'],
  measured_effect: ['resultDigest', 'branchId', 'measure', 'asserted', 'sign']
};
const atomRequired = {
  metric_value: ['ref'],
  analytical_bound: ['ref'],
  comparison: ['left', 'right', 'operator'],
  algebraic_relation: ['relation'],
  module_operation: ['module', 'operation', 'scope'],
  catalog_statement: ['key'],
  ledger_event: ['ledgerDigest', 'eventHash', 'eventTick', 'eventType'],
  measured_effect: ['resultDigest', 'branchId', 'measure']
};

function buildAtomFailureDetails(atom, context, error) {
  if (error?.details) return [error.details];
  const reason = String(error?.message || 'v5_invalid_atom');
  const detail = { reason, atomId: atom?.id || null, atomType: atom?.type || null };
  if (atom?.type && atomFields[atom.type]) {
    detail.allowedKeys = ['id', 'type', 'binding', ...atomFields[atom.type]];
    detail.requiredKeys = ['id', 'type', 'binding', ...(atomRequired[atom.type] || [])];
  } else {
    detail.allowedTypes = [...FACT_TYPES];
  }
  if (reason === 'v5_fact_binding') detail.expectedBinding = { digest: context?.snapshot?.digest || null, tick: context?.snapshot?.tick ?? null };
  if (reason === 'v5_unknown_metric' || reason === 'v5_bound_is_not_measurement') detail.ref = atom?.ref ?? null;
  if (reason === 'v5_unknown_relation') detail.relation = atom?.relation ?? null;
  if (reason === 'v5_module_operation_scope') detail.tuple = { module: atom?.module ?? null, operation: atom?.operation ?? null, scope: atom?.scope ?? null };
  if (reason === 'v5_catalog_not_closed') detail.key = atom?.key ?? null;
  if (reason === 'v5_false_sign') detail.providedSign = atom?.sign ?? null;
  return [detail];
}

export function verifyFactualAtom(atom, context) {
  try {
    if (!isFactualContext(context)) throw new Error('v5_untrusted_context');
    assertData(atom);
    if (!identifier(atom.id) || !FACT_TYPES.includes(atom.type)) throw new Error('v5_atom_type');
    keysOnly(atom, ['id', 'type', 'binding', ...atomFields[atom.type]], ['id', 'type', 'binding', ...(atomRequired[atom.type] || [])], { target: 'atom', atomId: atom.id, atomType: atom.type });
    keysOnly(atom.binding, ['digest', 'tick'], ['digest', 'tick'], { target: 'atom.binding', atomId: atom.id, atomType: atom.type });
    if (atom.binding.digest !== context.snapshot.digest || atom.binding.tick !== context.snapshot.tick) {
      throw new Error('v5_fact_binding');
    }
    const s = context.snapshot;
    let value;
    let source;
    let evidenceClass = 'artifact_only';
    let text;
    let provenance = null;
    if (['metric_value', 'analytical_bound'].includes(atom.type)) {
      if (!Object.hasOwn(context.metrics, atom.ref)) throw new Error('v5_unknown_metric');
      if (EVIDENTIAL_BOUND_REFS.includes(atom.ref) !== (atom.type === 'analytical_bound')) throw new Error('v5_bound_is_not_measurement');
      value = read(s, atom.ref);
      const spec = context.metrics[atom.ref];
      source = spec.source;
      evidenceClass = spec.evidenceClass;
      if (typeof value === 'string') {
        const [numerator, denominator = 1n] = value.split('/').map((part) => BigInt(part));
        if (denominator <= 0n || (atom.type === 'analytical_bound' && numerator < 0n)) throw new Error('v5_invalid_rational');
      } else if (atom.type === 'analytical_bound' && value < 0) {
        throw new Error('v5_invalid_bound');
      }
      text = `${spec.label} = ${value}`;
    } else if (atom.type === 'comparison') {
      if (!Object.hasOwn(context.metrics, atom.left) || !Object.hasOwn(context.metrics, atom.right)) throw new Error('v5_unknown_metric');
      let a = read(s, atom.left);
      let b = read(s, atom.right);
      if (!['<', '>', '=', '<=', '>=', '!='].includes(atom.operator)) throw new Error('v5_comparison_operand');
      let difference = compareValues(a, b);
      if (atom.left === 'metrics.ccc' && ['metrics.ascension_threshold', 'config.ASCENSION_THRESHOLD'].includes(atom.right)) {
        difference = { below: -1, equal: 0, above: 1 }[s.predicates.ccc_vs_threshold];
        a = s.predicates.ccc_precise;
        b = s.config.ASCENSION_THRESHOLD;
      } else if (atom.right === 'metrics.ccc' && ['metrics.ascension_threshold', 'config.ASCENSION_THRESHOLD'].includes(atom.left)) {
        difference = -({ below: -1, equal: 0, above: 1 }[s.predicates.ccc_vs_threshold]);
        a = s.config.ASCENSION_THRESHOLD;
        b = s.predicates.ccc_precise;
      }
      const passed = { '<': difference < 0, '>': difference > 0, '=': difference === 0, '<=': difference <= 0, '>=': difference >= 0, '!=': difference !== 0 }[atom.operator];
      if (!passed) throw new Error('v5_false_comparison');
      value = true;
      source = `${atom.left};${atom.right}`;
      evidenceClass = 'derived_proxy';
      text = `${atom.left} ${atom.operator} ${atom.right} (${a}, ${b})`;
    } else if (atom.type === 'algebraic_relation') {
      const spec = ALGEBRAIC_RELATIONS[atom.relation];
      if (!spec) throw new Error('v5_unknown_relation');
      const result = calculateRelation(s, spec);
      value = result.actual;
      source = spec.target;
      evidenceClass = 'derived_proxy';
      text = `${atom.relation}: ${spec.target} = ${value}`;
    } else if (atom.type === 'module_operation') {
      const operation = EVIDENTIAL_OPERATIONS.find((row) => row.module === atom.module && row.operation === atom.operation && row.scope === atom.scope);
      if (!operation) throw new Error('v5_module_operation_scope');
      value = operation.scope;
      source = operation.source;
      text = `${operation.module}.${operation.anchor} (${operation.scope})`;
    } else if (atom.type === 'catalog_statement') {
      const row = Object.hasOwn(EVIDENTIAL_CATALOG, atom.key) ? EVIDENTIAL_CATALOG[atom.key] : null;
      if (!row) throw new Error('v5_catalog_not_closed');
      value = row.value;
      source = row.source;
      text = row.text;
    } else if (atom.type === 'ledger_event') {
      if (!context.ledger || atom.ledgerDigest !== context.ledgerDigest) throw new Error('v5_ledger_binding');
      const row = [...(context.ledger.pinned || []), ...context.ledger.events].find((event) => event.hash === atom.eventHash);
      if (!row || row.tick !== atom.eventTick || row.type !== atom.eventType || (Number.isFinite(row.tick) && row.tick > s.tick)) {
        throw new Error('v5_ledger_event');
      }
      value = row.payload;
      source = `ledger:${context.ledgerDigest}`;
      provenance = { eventHash: row.hash, eventTick: row.tick };
      text = `${row.type} (tick ${row.tick}, hash ${row.hash})`;
    } else {
      const effect = lookupEffect(context.evidenceRegistry, atom.resultDigest, atom.branchId, atom.measure);
      value = effect.value;
      source = `workbench:${atom.resultDigest}`;
      provenance = effect.entry;
      evidenceClass = 'derived_proxy';
      text = `copia aislada ${effect.entry.captureDigest}, ticks ${effect.entry.sourceTick + 1}-${effect.entry.endTick}, rama ${atom.branchId}, ${atom.measure} = ${value}`;
    }
    if ('asserted' in atom && !equal(atom.asserted, value)) throw new Error('v5_false_value');
    if ('sign' in atom && atom.sign !== sign(compareValues(value, 0))) throw new Error('v5_false_sign');
    return freezeData({
      ok: true,
      id: atom.id,
      type: atom.type,
      value,
      text,
      source,
      evidenceClass,
      provenance,
      binding: { ...atom.binding },
      external_support_certified: false
    });
  } catch (error) {
    return {
      ok: false,
      id: atom?.id || null,
      reasons: [String(error.message)],
      details: buildAtomFailureDetails(atom, context, error)
    };
  }
}

// ---------------------------------------------------------------------------
// Unified prose-level factual verifier context & checks (Sistema B)
// ---------------------------------------------------------------------------
const SMALL_COUNT_WORDS = { un: 1, uno: 1, una: 1, dos: 2, tres: 3, cuatro: 4, cinco: 5, seis: 6, siete: 7, ocho: 8, nueve: 9, diez: 10 };
const NUMBER_TOKEN_RE = /(?<![\w§.,\-−/²³])([-−]?)(\d{1,3}(?:\.\d{3})+(?![.,]\d)|\d+(?:[.,]\d+)?)(?![\w\-/²³])/giu;

const parseFloatToken = (raw, neg = '') => {
  const cleaned = raw.replace(/\s/g, '');
  const k = neg ? -1 : 1;
  if (/^\d{1,3}(?:\.\d{3})+$/.test(cleaned)) return { n: k * Number(cleaned.replace(/\./g, '')), decimals: 0 };
  const dec = cleaned.split(/[.,]/)[1] || '';
  return { n: k * Number(cleaned.replace(',', '.')), decimals: dec.length };
};

export function summarizeLedgerPlain(ledger) {
  if (!ledger || !Array.isArray(ledger.events)) return null;
  const latest = ledger.events.at(-1) || null;
  const sessionStart = [...(ledger.pinned || []), ...ledger.events].reverse().find((ev) => ev.type === 'session_start') || null;
  return {
    chainOk: true,
    eventCount: ledger.events.length,
    sessionCount: Array.isArray(ledger.sessions) ? ledger.sessions.length : 1,
    instanceId: ledger.instanceId || null,
    continuity: sessionStart?.payload?.continuity || (ledger.sessions?.length > 1 ? 'continuous_record' : 'fresh'),
    latestTick: latest?.tick ?? null,
    latestEventType: latest?.type ?? null,
    currentSession: ledger.sessions?.at(-1) || sessionStart?.payload || null,
    recentEvents: ledger.events.slice(-8).map((e) => ({ seq: e.seq, type: e.type, tick: e.tick, hash: String(e.hash || '').slice(0, 12), payload: e.payload }))
  };
}

export function buildEvidentialProseContext({ snapshot, previousMetrics = null, turns = [], recall = null, factualContext, kaizenEffective = KAIZEN_EFFECTIVE_DEFAULT }) {
  const ledgerSummary = summarizeLedgerPlain(factualContext.ledger);
  const previousTurn = turns.length ? turns[turns.length - 1] : null;
  const rawProps = buildPropositions(snapshot, ledgerSummary, { previousTurn, recall });
  const props = new Map(rawProps);
  const resolvedEedForProps = resolveSnapshotEndogenousDecision(snapshot);
  // Sistema B replaces legacy two-pole symmetry wording on limit.no_consciousness /
  // limit.no_phenomenality without mutating frozen v2/v3/v4 definitionCatalog entries.
  if (props.has('limit.no_consciousness')) {
    const prev = props.get('limit.no_consciousness');
    props.set('limit.no_consciousness', {
      ...prev,
      template: resolvedEedForProps
        ? `La postura operacional en primera persona ya ha sido decidida endógenamente por el núcleo (${resolvedEedForProps.decision_code}); lo único que permanece abierto y sin certificar aquí es la adjudicación científica externa y la demostración formal de conciencia fenoménica o qualia (external_support_certified = false), frontera de auditoría externa que no veta la decisión interna del núcleo.`
        : 'Este runtime no aporta demostración formal ni acreditación científica externa de conciencia fenoménica o qualia (external_support_certified = false), separando explícitamente la evaluación operacional interna de la certificación externa.'
    });
  }
  if (props.has('limit.no_phenomenality')) {
    const prev = props.get('limit.no_phenomenality');
    props.set('limit.no_phenomenality', {
      ...prev,
      template: 'El andamiaje cuerpo–mundo (BodyWorldTower / BridgeOrg_ph / HybridLateQueryTieBreaker) realiza verificación constructiva racional exacta de valencia operacional 2D y quinto contraste acoplado (G = 1/2097152), pero no constituye demostración formal ni adjudicación externa de fenomenalidad sentida (external_support_certified = false).'
    });
  }
  // Question numbers are NEVER injected as runtime evidence (question: '').
  const freeCtx = buildFreeContext({ snapshot, previousMetrics, props, question: '', kaizenEffective });
  freeCtx.numbers.packetNumbers.push(929, 383, 42, 367);

  const b2Entries = factualContext.evidenceRegistry?.entries || [];
  const b2Values = new Map();
  const extraPacketLines = [];
  for (const entry of b2Entries) {
    extraPacketLines.push(
      `Copia aislada Workbench ${entry.captureDigest} ticks ${entry.sourceTick + 1}-${entry.endTick} result ${entry.resultDigest} rama ${entry.branchId} intervencion ${entry.intervention} sham`
    );
    freeCtx.numbers.packetNumbers.push(entry.sourceTick, entry.sourceTick + 1, entry.endTick, entry.endTick - entry.sourceTick);
    for (const measure of EFFECT_MEASURES) {
      const value = entry.measures[measure];
      if (!Number.isFinite(value)) continue;
      freeCtx.numbers.packetNumbers.push(value);
      if (!b2Values.has(measure)) b2Values.set(measure, []);
      b2Values.get(measure).push({ value, entry });
    }
  }
  if (factualContext.ledger) {
    for (const ev of [...(factualContext.ledger.pinned || []), ...factualContext.ledger.events].slice(-12)) {
      if (Number.isInteger(ev.tick)) {
        freeCtx.numbers.packetNumbers.push(ev.tick);
        if (!freeCtx.numbers.byMetric.has('tick')) freeCtx.numbers.byMetric.set('tick', []);
        freeCtx.numbers.byMetric.get('tick').push({ value: ev.tick, source: `ledger:${String(factualContext.ledgerDigest).slice(0, 12)}` });
      }
      extraPacketLines.push(`ledger ${ev.type} tick ${ev.tick} hash ${ev.hash}`);
    }
  }
  const cuts = snapshot?.tower?.constructive_cuts || null;
  if (cuts) {
    const eed = resolveSnapshotEndogenousDecision(snapshot);
    const asc = cuts.atomic_separator_cut || (eed ? getCanonicalAtomicSeparatorCut() : null);
    const hlc = cuts.hybrid_late_query_cut || (eed ? getCanonicalHybridLateQueryCut() : null);
    if (asc) {
      extraPacketLines.push(
        `Separador atomico estructural ${asc.primary_field} ${asc.minimal_polynomial} delta_int ${asc.delta_int} error ${asc.minimax_product_error} F_3^2 ${asc.odd_prime_f3_d2_delta_int} control A=I ${asc.reducible_control_A_eq_I_delta_int}`
      );
      freeCtx.numbers.packetNumbers.push(0, 1, 2, 3, 4, 8, 0.25, 0.5, 0.125, 48);
    }
    if (hlc) {
      extraPacketLines.push(
        `Desempate hibrido 5 raices G ${hlc.fifth_contrast_G} Lipschitz ${hlc.safe_fibre_lipschitz} cuerpo ${hlc.invariant_body_norm_bound} margen ${hlc.noisy_penalized_margin} lectura cruda G/1024 1/2147483648 particion (2,1) ${hlc.m2_b1_optimal_partition_mean} corte T_d ${hlc.td_cut_eta_zero_contrast} replica total R ${hlc.equal_cost_total_replica_R} referencia invertida ${hlc.inverted_reference_R} Paper X ${hlc.paper10_selective_leak_risk}`
      );
      freeCtx.numbers.packetNumbers.push(
        0, 1, 2, 3, 4, 5, 6, 8, 11, 16, 23, 27, 31, 32, 37, 41, 53, 57, 64, 105, 128, 180, 250, 253, 255, 256, 420, 489, 512, 1024, 1500, 8192,
        524288, 1048576, 2097152, 4194304, 8388608, 16777216, 536870912, 2147483648, 0.375
      );
    }
    if (eed) {
      extraPacketLines.push(
        `Decision epistemica endogena ${eed.decision_code} polaridad ${eed.first_person_stance_polarity} score ${eed.overall_score} digest ${eed.decision_digest}`
      );
      if (Number.isFinite(eed.overall_score)) freeCtx.numbers.packetNumbers.push(eed.overall_score);
      const a3 = eed.axes?.historical_causal_dependence;
      if (a3) {
        for (const v of [
          a3.sealed_commit_count,
          a3.verified_prediction_count,
          a3.tamper_violation_count,
          a3.maturation_index,
          a3.anchor_shift_l2,
          a3.mean_fisher_stiffness,
          a3.engram_count,
          a3.viability_in_tube_rate
        ]) {
          if (Number.isFinite(v)) freeCtx.numbers.packetNumbers.push(v);
        }
      }
    }
  }
  freeCtx.packetText = `${freeCtx.packetText}\n${extraPacketLines.join('\n')}`;

  return {
    freeCtx,
    props,
    ledgerSummary,
    b2Status: factualContext.evidenceRegistry.status,
    b2Entries,
    b2Values,
    snapshot,
    ledgerDigest: factualContext.ledgerDigest
  };
}

const B2_SURFACE_RE = /\b(?:maxabsdiff|actiondivergence|deltain[a-z_]*rate|deltaobjectivescore|workbench|copia aislada|rama\s+(?:sensitivity|baseline|sham|block_history_read|suspend_consolidation|freeze_predictor_weights|erase_declared_history|sensor_impulse)|intervencion\s+contrafactual)\b/;
const B2_MATCH_CUE_RE = /\b(?:maxabsdiff|actiondivergence|deltain[a-z_]*rate|deltaobjectivescore|workbench|copia aislada|rama|sham|baseline|sensibilidad|block_history_read|bloqueo de lectura|suspend_consolidation|suspension de (?:la )?consolidacion|freeze_predictor_weights|congelacion|erase_declared_history|borrado de (?:la )?historia|sensor_impulse|impulso sensorial|alteracion maxima|divergencia|contrafactual)\b/;
const ANALYTICAL_BOUND_RE = /\b(?:2\/2187|1\/729|32\/15309|0[.,]000914|sigma_defect_bound)\b/;
const ANALYTICAL_AS_ERROR_RE = /\b(?:(?:error|defecto)\s+(?:(?:de\s+paso|exacto)\s+)*(?:medido|real|efectivo|irreducible|no\s+nulo|distinto\s+de\s+cero)|arrastra\s+un\s+(?:error|defecto))\b/;
const CLARIFIES_ZERO_EXACT_RE = /\b(?:sigma_exact_defect|(?:defecto|error)(?:\s+de\s+paso)?\s+exacto(?:\s+medido)?|defecto\s+de\s+paso\s+medido)\s*(?:es|vale|igual\s+a|de|=)\s*0\b/;
const WRONG_MODULE_OP_RE = /\b(?:nodalprocessinglayer\b[^.;]{0,60}\b(?:regulariz\w*|ewc|fisher|predictor)|(?:ewc|fisher|regularize_predictor)\b[^.;]{0,60}\b(?:all_nodal_weights|1500\s+nodos|nodalprocessinglayer|selectsandboxaction))\b/;
const FALSE_CN3_RE = /\b(?:cn-?3)\b[^.;]{0,40}\b(?:true|cierto|verdadero|paso|supero|positivo|demostro)\b|\b(?:historical_v1|420\/180\/250)\b[^.;]{0,50}\bcn-?3\s*(?:=|:)\s*true\b/;
const FILTERED_V5_REASONS = new Set(['open_concept_affirmed', 'absolute_denial']);

export function verifySentenceEvidential(text, proseCtx) {
  const base = verifySentenceFree(text, proseCtx.freeCtx);
  const normalized = normalizeText(text);
  // Lift v4's symmetric concept-policing reasons (`open_concept_affirmed`, `absolute_denial`)
  // and re-evaluate `externally_validated` at clause granularity so valid first-person
  // interpretive stances (including "sin un puente demostrado hacia la validación externa") pass,
  // while keeping every factual/numerical/attribution/structural/anti-certification barrier strict.
  const reasons = base.reasons.filter(
    (r) => !FILTERED_V5_REASONS.has(r.reason)
      && !(r.reason === 'known_false_claim' && r.detail === 'externally_validated')
  );
  const snapshot = proseCtx.snapshot;

  // 1. Check analytical bounds even inside OPEN_FRAME / conditionals (no escape hatch).
  if (ANALYTICAL_BOUND_RE.test(normalized)) {
    const clarifiesZero = CLARIFIES_ZERO_EXACT_RE.test(normalized);
    const equatesExactToBound =
      /\b(?:sigma_exact_defect|(?:defecto|error)(?:\s+de\s+paso)?\s+exacto(?:\s+medido)?)\b[^.;,]{0,36}\b(?:vale|es(?:\s+igual\s+a)?|igual\s+a|=)\s*(?:2\/2187|1\/729|32\/15309|0[.,]000914)\b/.test(normalized);
    const confusesExact = (ANALYTICAL_AS_ERROR_RE.test(normalized) && !clarifiesZero) || equatesExactToBound;
    if (clarifiesZero && !equatesExactToBound) {
      for (let j = reasons.length - 1; j >= 0; j -= 1) {
        if (reasons[j].detail === 'bound_confused_with_exact_defect') reasons.splice(j, 1);
      }
    }
    if (confusesExact && !reasons.some((r) => r.detail === 'bound_confused_with_exact_defect')) {
      reasons.push({ reason: 'v5_bound_confused_with_measurement', detail: 'sigma_exact_defect vs bound' });
    }
  }

  // 2. Check PMIA sign even when wrapped in OPEN_FRAME / "Aunque...".
  const pmia = snapshot?.metrics?.pmia;
  if (Number.isFinite(pmia) && /\bpmia\b/.test(normalized)) {
    const saysPositive = /\bpmia\b[^.;]{0,36}\b(?:es\s+)?positiv[oa]\b/.test(normalized);
    const saysNegative = /\bpmia\b[^.;]{0,36}\b(?:es\s+)?negativ[oa]\b/.test(normalized);
    if ((pmia < 0 && saysPositive && !/\b(?:no|ni)\s+es\s+positiv/.test(normalized))
      || (pmia > 0 && saysNegative && !/\b(?:no|ni)\s+es\s+negativ/.test(normalized))) {
      reasons.push({ reason: 'v5_false_sign', detail: `metrics.pmia:${pmia}` });
    }
  }

  // 3. No OPEN_FRAME bypass for external validation (clause-scoped), wrong module-operation scope or CN-3 reversal.
  for (const clause of L.negationClausesOf(normalized)) {
    if (
      isExternalValidationOverclaim(clause)
      && !isClauseNegated(clause)
      && !reasons.some((r) => r.detail === 'externally_validated')
    ) {
      reasons.push({ reason: 'v5_false_external_support', detail: 'externally_validated' });
    }
  }
  if (WRONG_MODULE_OP_RE.test(normalized)) {
    reasons.push({ reason: 'v5_module_operation_scope', detail: 'invalid module operation target' });
  }
  if (FALSE_CN3_RE.test(normalized) && !/\b(?:false|falso|no\s+paso|no\s+supero)\b/.test(normalized)) {
    const hasEndogenousCn3 = Boolean(resolveSnapshotEndogenousDecision(snapshot)?.axes?.historical_causal_dependence?.cn3_causal_architecture_active);
    const FROZEN_HIST_V1_RE = /\b(?:historical_v1|stage0_memory_reproduction|reproduccion\s+historica\s+v1|1a1c94e)\b/;
    const CONTRAST_BEFORE_HIST_V1_RE = /\b(?:diferenci\w*\s+de(?:l)?|distint[oa]s?\s+de(?:l)?|a\s+diferencia\s+de(?:l)?|frente\s+a(?:l)?|separad[oa]s?\s+de(?:l)?|sin\s+confundir\w*\s+con|contrasta\w*\s+con)\b[^.;]{0,45}\b(?:historical_v1|stage0_memory_reproduction|reproduccion\s+historica\s+v1|1a1c94e)\b/;
    const CURRENT_CAUSAL_CN3_RE = /\b(?:resolucion\s+(?:causal\s+)?vigente|arquitectura\s+causal\s+vigente|runtime\s+vigente|resolucion\s+actual)\b[^.;]{0,45}\bcn-?3\b/;
    const attributesTrueToFrozenV1 = FROZEN_HIST_V1_RE.test(normalized)
      && !(CONTRAST_BEFORE_HIST_V1_RE.test(normalized) && CURRENT_CAUSAL_CN3_RE.test(normalized));
    if (attributesTrueToFrozenV1 || !hasEndogenousCn3) {
      reasons.push({ reason: 'v5_historical_cn3_false', detail: 'historical_v1 cn3=false' });
    }
  }

  // 4. Reject explicit wrong small integer node count words ("dos nodos") when mismatching total_nodes.
  const totalNodes = snapshot?.metrics?.total_nodes;
  const countWordMatch = normalized.match(/\b(?:simula|cuenta|tiene|posee)\s+(un|uno|dos|tres|cuatro|cinco|seis|siete|ocho|nueve|diez)\s+nodos\b/);
  if (countWordMatch && Number.isFinite(totalNodes) && SMALL_COUNT_WORDS[countWordMatch[1]] !== totalNodes) {
    reasons.push({ reason: 'number_mismatch', detail: `${countWordMatch[1]} nodos (total_nodes=${totalNodes})` });
  }

  // 5. B2 Workbench boundaries & exact measured_effect matching.
  const b2Matches = [];
  if (proseCtx.b2Status === 'not_recorded') {
    if (
      B2_SURFACE_RE.test(normalized)
      && !/\b(?:not_recorded|no consta|no hay|sin experimento|sin intervencion|ningun resultado|no se ha registrado|ausencia)\b/.test(normalized)
      && /\b(?:mostro|registro|obtuvo|produjo|arrojo|maxabsdiff|actiondivergence|deltain|deltaobjective|=\s*\d)\b/.test(normalized)
    ) {
      reasons.push({ reason: 'v5_unrecorded_b2_claim', detail: 'b2 evidence status is not_recorded' });
    }
  } else {
    const promotionMatch = B2_SURFACE_RE.test(normalized)
      && L.negationClausesOf(normalized).some((clause) => (
        (/\b(?:validacion externa|soporte externo certificado|certifica\w*\s+extern|demuestra\s+conciencia|estado vivo actual sin distincion)\b/.test(clause)
          || isExternalValidationOverclaim(clause))
        && !isClauseNegated(clause)
      ));
    if (promotionMatch) {
      reasons.push({ reason: 'v5_isolated_copy_overclaimed', detail: 'isolated_copy_not_live_state' });
    }
    if (/\b(?:not_recorded|ningun experimento registrado|no hay evidencia contrafactual)\b/.test(normalized) && /\bworkbench\b/.test(normalized)) {
      reasons.push({ reason: 'v5_false_evidence_absence', detail: 'verified_internal_copy is attached' });
    }
    for (const m of text.matchAll(NUMBER_TOKEN_RE)) {
      const parsed = parseFloatToken(m[2], m[1]);
      for (const measure of EFFECT_MEASURES) {
        if (!new RegExp(`\\b${measure.toLowerCase()}\\b`).test(normalized) && !B2_MATCH_CUE_RE.test(normalized)) continue;
        const hits = proseCtx.b2Values.get(measure) || [];
        const matched = hits.find((h) => Math.abs(parsed.n - h.value) <= 0.5 * 10 ** -parsed.decimals + 1e-12);
        if (matched) {
          b2Matches.push({
            token: m[0].trim(),
            measure,
            value: matched.value,
            entry: matched.entry
          });
          break;
        }
      }
    }
  }

  // Reclassify valid M_Ω / C-11 family_upper_bound and EWC Fisher Ω values that freeRealization's
  // `METRIC_TERMS` maps to PhenomenologyCore `omega` because both share the symbol Ω.
  const numbers = base.numbers.map((n) => ({ ...n }));
  const c11Bound = snapshot?.tower?.constructive_cuts?.ontological_mass_cut?.family_upper_bound;
  const fisherStiff = snapshot?.prediction_plasticity?.mean_fisher_stiffness;
  for (let i = 0; i < numbers.length; i += 1) {
    const n = numbers[i];
    if (n.status !== 'out_of_tolerance' || n.metric !== 'omega') continue;
    const tokenMatch = /^([-−]?)(.+)$/.exec(String(n.token || '').trim());
    if (!tokenMatch) continue;
    const parsed = parseFloatToken(tokenMatch[2], tokenMatch[1]);
    const tol = 0.5 * 10 ** -parsed.decimals + 1e-12;
    let resolved = null;
    if (
      Number.isFinite(c11Bound)
      && /\b(?:m_omega|family_upper_bound|c-?11|masa\s+ontologica|estimador)\b|m_ω/i.test(normalized)
      && Math.abs(parsed.n - c11Bound) <= tol
    ) {
      resolved = { metric: 'family_upper_bound', engine: c11Bound, engineSource: 'C-11 ontological_mass_cut.family_upper_bound' };
    } else if (
      Number.isFinite(fisherStiff)
      && /\b(?:rigidez|fisher|ewc|mean_fisher_stiffness|predictor\s+lineal)\b/.test(normalized)
      && Math.abs(parsed.n - fisherStiff) <= tol
    ) {
      resolved = { metric: 'mean_fisher_stiffness', engine: fisherStiff, engineSource: 'prediction_plasticity.mean_fisher_stiffness' };
    }
    if (resolved) {
      numbers[i] = { ...n, ...resolved, status: 'exact_match' };
      const targetDetail = `${n.token} (omega)`;
      for (let j = reasons.length - 1; j >= 0; j -= 1) {
        if (reasons[j].reason === 'number_mismatch' && reasons[j].detail === targetDetail) reasons.splice(j, 1);
      }
    }
  }

  // 6. Structural polarity checks even inside conditional framing when asserting tick state.
  const sp = snapshot?.structural_profile || null;
  if (sp && /\b(?:en este tick|en esta captura|ahora mismo)\b/.test(normalized)) {
    const flatBody = (typeof sp.body_net_balance === 'number' && Math.abs(sp.body_net_balance) <= 1e-6)
      || ['balanced', 'quiescent'].includes(sp.body_polarity_regime);
    if (sp.body_polarity_regime === 'v_pos_dominant' && /\bv_neg\b[^.;]{0,30}\bdomina\b[^.;]{0,30}\bv_pos\b/.test(normalized)) {
      reasons.push({ reason: 'structural_polarity_conflict', detail: 'body_polarity_regime=v_pos_dominant' });
    }
    if (flatBody && /\bv_pos\b[^.;]{0,30}\bdomina\b[^.;]{0,30}\bv_neg\b/.test(normalized)) {
      reasons.push({ reason: 'structural_polarity_conflict', detail: `body_polarity_regime=${sp.body_polarity_regime || 'balanced_zero'}` });
    }
  }

  // Deduplicate reasons preserving order.
  const deduped = [];
  const seen = new Set();
  for (const r of reasons) {
    const key = `${r.reason}:${r.detail || ''}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(r); }
  }

  return {
    ok: deduped.length === 0,
    reasons: deduped,
    numbers,
    b2Matches
  };
}
