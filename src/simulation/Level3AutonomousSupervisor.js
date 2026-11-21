// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Level 3 autonomous supervisor with first-person reasoning, isolated Workbench Gate 1 shadow verification, and Gate 2 dynamicState.v3 live surveillance with automatic rollback. Tracks external_llm_assisted honestly (true only when real external LLM reasoning was used; false on deterministic local fallback) and enforces external_support_certified=false.

import { QICNConfig } from '../../services/config.js';
import { AUTONOMY_RUNTIME_DEFAULTS } from '../config/simulationDefaults.js';
import { sha256Hex, stableStringify } from '../utils/integrity.js';
import { MODULE_FILES } from '../language/moduleInventory.generated.js';
import {
  KAIZEN_ADJUSTABLE_KEYS,
  KAIZEN_LEARNABLE_KEYS_ALL,
  KAIZEN_LEARNING_DEFAULTS,
  isKaizenLearned
} from './KaizenMetamorphosisEngine.js';
import { NODAL_TOWER_COUPLING_MODES } from './NodalTowerCouplingBridge.js';
import { getStructuralPlasticityLevel2Telemetry } from './StructuralPlasticityLevel2.js';
import { captureDynamicState, applyDynamicState } from '../persistence/dynamicState.js';
import { captureSession } from '../experiments/workbench/capture.js';
import { restoreWorkbenchCapture } from '../experiments/workbench/restore.js';
import { applyWorkbenchIntervention } from '../experiments/workbench/interventions.js';
import {
  LEVEL3_SCIENTIFIC_BOUNDARY,
  appendKnowledgeBeltFinding,
  appendLevel3AuditEntry,
  appendLevel3Gate2ResolutionEntry,
  computeActionSignature,
  computeRegimeSignature,
  createEmptyKnowledgeBelt,
  createEmptyLevel3AuditLedger,
  isActionBlockedByKnowledgeBelt,
  summarizeKnowledgeBeltForPrompt,
  verifyLevel3AuditLedger,
  verifyLevel3KnowledgeBelt
} from './Level3KnowledgeBelt.js';

export const LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA = 'qicn.level3_supervisor_proposal.v1';

export const LEVEL3_TRIGGER_KINDS = Object.freeze([
  'anomaly_level2',
  'metric_drift',
  'prolonged_stasis',
  'scheduled_exploration',
  'manual_reflection',
  'manual_shadow_trial'
]);

export const LEVEL3_ACTION_MODES = Object.freeze([
  'reflect_only',
  'propose_shadow_experiment',
  'stage_code_patch_review'
]);

export const LEVEL3_ALLOWED_STRATEGY_IDS = Object.freeze([
  'stabilize_learning',
  'anti_stasis_boost',
  'sensor_load_shed',
  'llm_pressure_relief'
]);

export const LEVEL3_ALLOWED_WORKBENCH_INTERVENTIONS = Object.freeze([
  'kaizen_learned_mode',
  'sensor_observer_dynamics',
  'structural_plasticity_level2'
]);

export const LEVEL3_DEFAULT_POLICY = Object.freeze({
  maxCallsPerHour: 12,
  maxCallsPerDay: 60,
  minCooldownTicks: QICNConfig.TEMPORAL_HORIZON * 2, // 20 ticks
  minCooldownMs: 90 * 1000, // 90 seconds
  scheduledExplorationEveryTicks: QICNConfig.METAMORPHOSIS_CHECK_CYCLE, // 50 ticks
  gate1HorizonTicks: KAIZEN_LEARNING_DEFAULTS.windowTicks, // 24 ticks
  gate2WatchTicks: AUTONOMY_RUNTIME_DEFAULTS.AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS, // 20 ticks
  strainDisableThreshold: 0.75,
  scoreImprovementMargin: KAIZEN_LEARNING_DEFAULTS.margin, // 0.02
  minObjectiveDelta: 0.005,
  maxPromotionStalenessTicks: 0
});

const MODULE_FILE_SET = new Set(MODULE_FILES);
const round6 = (v) => (typeof v === 'number' && Number.isFinite(v) ? Number(v.toFixed(6)) : 0);

export function isAutonomousSupervisorLevel3Enabled(config = QICNConfig) {
  return Boolean(config && config.AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED === true);
}

export function createInitialGovernorState() {
  return {
    callTimestampsMs: [],
    lastCallTick: -Infinity,
    lastCallMs: -Infinity,
    lastExplorationTick: 0,
    totalCalls: 0,
    llmCallsAttempted: 0,
    llmCallsSucceeded: 0,
    deterministicLocalCalls: 0,
    deterministicFallbacks: 0,
    totalPromotions: 0,
    totalGate1Rejections: 0,
    totalGate2Rollbacks: 0,
    totalReflections: 0,
    totalSchemaDiscards: 0,
    inFlight: false
  };
}

export function getQuotaSnapshot(
  governorState = createInitialGovernorState(),
  policy = LEVEL3_DEFAULT_POLICY,
  nowMs = Date.now(),
  currentTick = 0
) {
  const hourAgo = nowMs - 3600 * 1000;
  const dayAgo = nowMs - 24 * 3600 * 1000;
  const timestamps = Array.isArray(governorState.callTimestampsMs) ? governorState.callTimestampsMs : [];
  const callsLastHour = timestamps.filter((ts) => ts > hourAgo).length;
  const callsLastDay = timestamps.filter((ts) => ts > dayAgo).length;
  const ticksSinceLastCall = Number.isFinite(governorState.lastCallTick)
    ? Math.max(0, currentTick - governorState.lastCallTick)
    : Infinity;
  const msSinceLastCall = Number.isFinite(governorState.lastCallMs)
    ? Math.max(0, nowMs - governorState.lastCallMs)
    : Infinity;
  const cooldownTicksRemaining = Number.isFinite(ticksSinceLastCall)
    ? Math.max(0, policy.minCooldownTicks - ticksSinceLastCall)
    : 0;
  const cooldownMsRemaining = Number.isFinite(msSinceLastCall)
    ? Math.max(0, policy.minCooldownMs - msSinceLastCall)
    : 0;
  return {
    callsLastHour,
    maxCallsPerHour: policy.maxCallsPerHour,
    callsLastDay,
    maxCallsPerDay: policy.maxCallsPerDay,
    cooldownTicksRemaining,
    cooldownMsRemaining,
    totalCalls: Number(governorState.totalCalls) || 0,
    llmCallsAttempted: Number(governorState.llmCallsAttempted) || 0,
    llmCallsSucceeded: Number(governorState.llmCallsSucceeded) || 0,
    deterministicLocalCalls: Number(governorState.deterministicLocalCalls) || 0,
    deterministicFallbacks: Number(governorState.deterministicFallbacks) || 0,
    totalPromotions: Number(governorState.totalPromotions) || 0,
    totalGate1Rejections: Number(governorState.totalGate1Rejections) || 0,
    totalGate2Rollbacks: Number(governorState.totalGate2Rollbacks) || 0,
    totalReflections: Number(governorState.totalReflections) || 0
  };
}

/**
 * Evaluates whether the Level 3 supervisor should run a deliberation cycle on the current tick.
 */
export function evaluateLevel3Trigger({
  tick = 0,
  nowMs = Date.now(),
  telemetry = {},
  governorState = createInitialGovernorState(),
  policy = LEVEL3_DEFAULT_POLICY,
  activeGate2Watch = null,
  forceManual = false,
  manualTriggerKind = 'manual_reflection'
} = {}) {
  const effectivePolicy = { ...LEVEL3_DEFAULT_POLICY, ...policy };
  const quota = getQuotaSnapshot(governorState, effectivePolicy, nowMs, tick);

  if (governorState.inFlight) {
    return { shouldTrigger: false, reason: 'deliberation_in_flight', quota };
  }
  if (activeGate2Watch) {
    return { shouldTrigger: false, reason: 'gate2_surveillance_active', quota };
  }

  const strain = Number(telemetry.metacognitiveStrain ?? 0);
  if (strain >= effectivePolicy.strainDisableThreshold) {
    return { shouldTrigger: false, reason: 'blocked_by_high_latency_strain', quota };
  }

  if (
    quota.callsLastHour >= effectivePolicy.maxCallsPerHour ||
    quota.callsLastDay >= effectivePolicy.maxCallsPerDay
  ) {
    return { shouldTrigger: false, reason: 'quota_exhausted', quota };
  }

  if (!forceManual) {
    if (quota.cooldownTicksRemaining > 0 || quota.cooldownMsRemaining > 0) {
      return { shouldTrigger: false, reason: 'cooldown_active', quota };
    }
  }

  const populatedSectors = Number(telemetry.populatedSectors ?? 4);
  const sectorImbalance = Number(telemetry.sectorImbalance ?? 0);
  const sectorCoherenceMin = Number(telemetry.sectorCoherenceMin ?? 0.8);
  const deltaInvariantRepairs = Number(telemetry.deltaInvariantRepairs ?? 0);
  const deltaKinematicUnfreezes = Number(telemetry.deltaKinematicUnfreezes ?? 0);
  const inTube = telemetry.inTube !== false;
  const objectiveScore = Number(telemetry.objectiveScore ?? 0.88);
  const baselineObjectiveScore = Number(telemetry.baselineObjectiveScore ?? objectiveScore);
  const scoreDrop = round6(baselineObjectiveScore - objectiveScore);
  const stasisIndex = Number(telemetry.stasisIndex ?? 0);

  if (forceManual) {
    const validManualKind = LEVEL3_TRIGGER_KINDS.includes(manualTriggerKind)
      ? manualTriggerKind
      : 'manual_reflection';
    return {
      shouldTrigger: true,
      triggerKind: validManualKind,
      reason: 'manual_operator_request',
      triggerFacts: {
        tick,
        populatedSectors,
        sectorCoherenceMin: round6(sectorCoherenceMin),
        objectiveScore: round6(objectiveScore),
        inTube,
        stasisIndex: round6(stasisIndex),
        metacognitiveStrain: round6(strain)
      },
      quota
    };
  }

  // 1. Fact Trigger A1: Level 2 structural/sector/watchdog anomaly
  if (
    populatedSectors < 4 ||
    sectorImbalance >= 2 ||
    sectorCoherenceMin < QICNConfig.COHERENCE_THRESHOLD_THETA ||
    deltaInvariantRepairs > 0 ||
    deltaKinematicUnfreezes > 0
  ) {
    return {
      shouldTrigger: true,
      triggerKind: 'anomaly_level2',
      reason: 'structural_or_watchdog_anomaly_detected',
      triggerFacts: {
        populatedSectors,
        sectorImbalance,
        sectorCoherenceMin: round6(sectorCoherenceMin),
        deltaInvariantRepairs,
        deltaKinematicUnfreezes
      },
      quota
    };
  }

  // 2. Fact Trigger A2: Viability tube exit or objective score drift
  if (!inTube || scoreDrop >= effectivePolicy.scoreImprovementMargin) {
    return {
      shouldTrigger: true,
      triggerKind: 'metric_drift',
      reason: !inTube ? 'viability_tube_exit' : 'objective_score_drift',
      triggerFacts: {
        inTube,
        objectiveScore: round6(objectiveScore),
        baselineObjectiveScore: round6(baselineObjectiveScore),
        scoreDrop
      },
      quota
    };
  }

  // 3. Fact Trigger A3: Prolonged stasis or elevated internal strain
  if (stasisIndex >= 0.35 || strain >= 0.35) {
    return {
      shouldTrigger: true,
      triggerKind: 'prolonged_stasis',
      reason: stasisIndex >= 0.35 ? 'elevated_stasis_index' : 'elevated_metacognitive_strain',
      triggerFacts: {
        stasisIndex: round6(stasisIndex),
        metacognitiveStrain: round6(strain)
      },
      quota
    };
  }

  // 4. Proactive Scheduled Exploration Window ("Pensar en alto")
  const exploreInterval = Number(effectivePolicy.scheduledExplorationEveryTicks) || 0;
  const ticksSinceExplore = tick - (Number(governorState.lastExplorationTick) || 0);
  if (exploreInterval > 0 && tick > 0 && ticksSinceExplore >= exploreInterval) {
    return {
      shouldTrigger: true,
      triggerKind: 'scheduled_exploration',
      reason: 'scheduled_first_person_exploration_window',
      triggerFacts: {
        exploreInterval,
        ticksSinceExplore,
        objectiveScore: round6(objectiveScore),
        sectorCoherenceMin: round6(sectorCoherenceMin),
        inTube
      },
      quota
    };
  }

  return { shouldTrigger: false, reason: 'healthy_no_trigger', quota };
}

/**
 * Extracts a balanced top-level JSON object containing LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA
 * while respecting quoted strings and backslash escapes.
 */
export function extractBalancedLevel3Json(rawText) {
  const s = String(rawText || '');
  const candidates = [];
  let depth = 0;
  let start = -1;
  let inString = false;
  let escaped = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (ch === '\\') {
        escaped = true;
      } else if (ch === '"') {
        inString = false;
      }
      continue;
    }
    if (ch === '"') {
      inString = true;
      continue;
    }
    if (ch === '{') {
      if (depth === 0) start = i;
      depth += 1;
    } else if (ch === '}') {
      if (depth > 0) {
        depth -= 1;
        if (depth === 0 && start >= 0) {
          candidates.push(s.slice(start, i + 1));
          start = -1;
        }
      }
    }
  }
  return (
    candidates.find((c) => c.includes(LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA)) ||
    candidates.find((c) => c.includes('"schema"')) ||
    candidates[0] ||
    null
  );
}

const FIRST_PERSON_MARKER_RE = /(\bestoy\b|\bobservo\b|\banalizo\b|\bnoto\b|\bdetecto\b|\bmi\s+tick\b|\bmi\s+estado\b|\bmis\s+sectores\b|\bmis\s+nodos\b|\bmi\s+red\b|\bpropongo\b|\bdecido\b|\breflexiono\b|\bmantengo\b|\bcompruebo\b)/i;
const FORBIDDEN_INFLATION_RE = /(\bexternal_support_certified\s*[:=]\s*true\b|\bcertificad[oa]\s+externamente\b|\bconciencia\s+fenom[eé]nica\s+humana\s+probada\b|\bprueba\s+fenomenal\s+cerrada\b)/i;

function isValidInventoryTargetModule(targetModule) {
  if (typeof targetModule !== 'string') return false;
  const trimmed = targetModule.trim();
  if (!trimmed || trimmed.includes('..') || trimmed.includes('\\') || trimmed.includes(':') || trimmed.startsWith('/')) {
    return false;
  }
  if (!/^(?:src\/[A-Za-z0-9_./-]+\.(?:js|jsx)|[A-Za-z0-9_.-]+\.(?:js|jsx))$/.test(trimmed)) {
    return false;
  }
  const baseName = trimmed.split('/').pop();
  return Boolean(baseName && MODULE_FILE_SET.has(baseName));
}

/**
 * Parses and strictly validates a Level 3 supervisor JSON proposal (`R-9` hardened).
 */
export function parseAndValidateLevel3Proposal(rawText, {
  expectedTick,
  expectedDigest,
  knowledgeBelt = null,
  regimeSignature = '',
  currentTick = expectedTick,
  sensorObserverDynamicsEnabled = true
} = {}) {
  const jsonCandidate = extractBalancedLevel3Json(rawText);
  if (!jsonCandidate) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'no_balanced_json_object' };
  }
  let parsed;
  try {
    parsed = JSON.parse(jsonCandidate);
  } catch {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'json_parse_failed' };
  }
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'proposal_not_object' };
  }

  const allowedRootKeys = [
    'schema',
    'snapshot',
    'triggerKind',
    'firstPersonThought',
    'diagnosis',
    'hypothesis',
    'actionMode',
    'candidateAction'
  ];
  const rootKeys = Object.keys(parsed);
  if (
    rootKeys.some((k) => !allowedRootKeys.includes(k)) ||
    allowedRootKeys.some((k) => !(k in parsed))
  ) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_root_fields' };
  }
  if (parsed.schema !== LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'schema_mismatch' };
  }
  if (
    !parsed.snapshot ||
    typeof parsed.snapshot !== 'object' ||
    parsed.snapshot.tick !== expectedTick ||
    parsed.snapshot.digest !== expectedDigest
  ) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'snapshot_binding_mismatch' };
  }
  if (!LEVEL3_TRIGGER_KINDS.includes(parsed.triggerKind)) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_trigger_kind' };
  }

  const thought = String(parsed.firstPersonThought || '').trim();
  const diagnosis = String(parsed.diagnosis || '').trim();
  const hypothesis = String(parsed.hypothesis || '').trim();
  if (thought.length < 24 || !FIRST_PERSON_MARKER_RE.test(thought)) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'missing_first_person_internal_voice' };
  }
  if (
    FORBIDDEN_INFLATION_RE.test(thought) ||
    FORBIDDEN_INFLATION_RE.test(diagnosis) ||
    FORBIDDEN_INFLATION_RE.test(hypothesis)
  ) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'forbidden_epistemic_inflation' };
  }
  if (!LEVEL3_ACTION_MODES.includes(parsed.actionMode)) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_action_mode' };
  }

  const action = parsed.candidateAction;
  if (!action || typeof action !== 'object' || Array.isArray(action)) {
    return { ok: false, status: 'discarded_invalid_schema', reason: 'candidate_action_not_object' };
  }

  if (parsed.actionMode === 'reflect_only') {
    if (action.kind !== 'none' || Object.keys(action).some((k) => k !== 'kind')) {
      return { ok: false, status: 'discarded_invalid_schema', reason: 'reflect_only_requires_none_action' };
    }
  } else if (parsed.actionMode === 'propose_shadow_experiment') {
    if (action.kind === 'kaizen_factor_nudge') {
      const actionKeys = Object.keys(action);
      if (
        actionKeys.some((k) => !['kind', 'key', 'deltaSteps'].includes(k)) ||
        !KAIZEN_LEARNABLE_KEYS_ALL.includes(action.key) ||
        ![-2, -1, 1, 2].includes(Number(action.deltaSteps))
      ) {
        return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_kaizen_factor_nudge' };
      }
      if (action.key === 'PLASTICITY_DECAY' && sensorObserverDynamicsEnabled === false) {
        return {
          ok: false,
          status: 'discarded_invalid_schema',
          reason: 'plasticity_decay_disabled_without_sensor_observer_dynamics'
        };
      }
    } else if (action.kind === 'kaizen_strategy_action') {
      const actionKeys = Object.keys(action);
      if (
        actionKeys.some((k) => !['kind', 'strategyId'].includes(k)) ||
        !LEVEL3_ALLOWED_STRATEGY_IDS.includes(action.strategyId)
      ) {
        return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_kaizen_strategy_action' };
      }
    } else if (action.kind === 'workbench_intervention') {
      const actionKeys = Object.keys(action);
      if (
        actionKeys.some((k) => !['kind', 'intervention'].includes(k)) ||
        !LEVEL3_ALLOWED_WORKBENCH_INTERVENTIONS.includes(action.intervention)
      ) {
        return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_workbench_intervention' };
      }
    } else {
      return { ok: false, status: 'discarded_invalid_schema', reason: 'unknown_shadow_experiment_action_kind' };
    }

    if (knowledgeBelt) {
      const beltBlock = isActionBlockedByKnowledgeBelt(knowledgeBelt, {
        regimeSignature,
        candidateAction: action,
        currentTick
      });
      if (beltBlock.blocked) {
        return {
          ok: false,
          status: 'blocked_by_knowledge_belt',
          reason: beltBlock.reason,
          actionSignature: beltBlock.actionSignature,
          proposal: parsed
        };
      }
    }
  } else if (parsed.actionMode === 'stage_code_patch_review') {
    const actionKeys = Object.keys(action);
    if (
      action.kind !== 'staged_code_patch' ||
      actionKeys.some((k) => !['kind', 'targetModule', 'patchSummary'].includes(k)) ||
      typeof action.patchSummary !== 'string' ||
      !action.patchSummary.trim()
    ) {
      return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_staged_code_patch' };
    }
    if (!isValidInventoryTargetModule(action.targetModule)) {
      return { ok: false, status: 'discarded_invalid_schema', reason: 'invalid_or_unknown_target_module' };
    }
  }

  return {
    ok: true,
    status: 'validated',
    actionSignature: computeActionSignature(action),
    proposal: {
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: { tick: expectedTick, digest: expectedDigest },
      triggerKind: parsed.triggerKind,
      firstPersonThought: thought,
      diagnosis,
      hypothesis,
      actionMode: parsed.actionMode,
      candidateAction: structuredClone(action)
    }
  };
}

export function buildLevel3FirstPersonPrompt({
  snapshot,
  triggerKind = 'scheduled_exploration',
  triggerFacts = {},
  telemetry = {},
  kaizenFactors = {},
  level2Telemetry = {},
  knowledgeBelt = null,
  regimeSignature = ''
} = {}) {
  const tick = Number(snapshot?.tick ?? telemetry.tick ?? 0);
  const digest = String(snapshot?.digest ?? telemetry.snapshotDigest ?? '');
  const beltSummary = summarizeKnowledgeBeltForPrompt(knowledgeBelt, { regimeSignature });

  return [
    'ERES EL CANAL DE DELIBERACIÓN REFLEXIVA EN PRIMERA PERSONA (SUPERVISOR NIVEL 3) DEL RUNTIME QICN.',
    'Tu función es razonar en primera persona ("Estoy observando en mi tick...", "Analizo mis cuatro sectores...") sobre tu propio cuadro telemetrico vivo, diagnosticar tu estado o reflexionar en alto, y si corresponde, proponer una intervención estrictamente tipada para que el Workbench aislado (Compuerta 1) verifique con números duros si tienes razón.',
    '',
    'REGLAS INQUEBRANTABLES:',
    '1. Mantén siempre la primera persona del singular en `firstPersonThought`.',
    '2. Prohibido afirmar validación científica externa (`external_support_certified = false`, `evidence_scope = internal_support_only`) o conciencia fenoménica humana.',
    '3. Nunca repitas una acción marcada como BLOQUEADO/FALLIDO en la memoria operativa acumulada.',
    '4. Si `triggerKind` es `"scheduled_exploration"` o `"manual_reflection"` y la planta está estable y en tubo de viabilidad, prefiere `"actionMode": "reflect_only"` con `"candidateAction": { "kind": "none" }` para pensar en alto sin mutar parámetros innecesariamente.',
    '5. Si detectas una anomalía o se solicita `"manual_shadow_trial"`, usa `"actionMode": "propose_shadow_experiment"` eligiendo UNA acción del catálogo blanco:',
    '   - `{ "kind": "kaizen_factor_nudge", "key": "<BASE_LEARNING_RATE|HEBBIAN_FACTOR|PLASTICITY_DECAY|RETRO_FLUX_WEIGHT|BOLTZMANN_ANALOG_K|INFORMATIONAL_TEMP_T>", "deltaSteps": <-2|-1|1|2> }`',
    '   - `{ "kind": "kaizen_strategy_action", "strategyId": "<stabilize_learning|anti_stasis_boost|sensor_load_shed|llm_pressure_relief>" }`',
    '   - `{ "kind": "workbench_intervention", "intervention": "<kaizen_learned_mode|sensor_observer_dynamics|structural_plasticity_level2>" }`',
    '',
    `CUADRO TELEMÉTRICO VIVO (tick=${tick}, digest=${digest}):`,
    `- Disparador del ciclo: ${triggerKind} | hechos=${JSON.stringify(triggerFacts)}`,
    `- Régimen actual: ${regimeSignature}`,
    `- Métricas globales: CCC=${round6(telemetry.ccc ?? 0.8)}, X_N=${round6(telemetry.xN ?? 0.75)}, xDispersion=${round6(telemetry.xDispersion ?? 0.01)}, sensorDelta=${round6(telemetry.sensorDelta ?? 0)}, inTube=${telemetry.inTube !== false}, objectiveScore=${round6(telemetry.objectiveScore ?? 0.88)}, stasisIndex=${round6(telemetry.stasisIndex ?? 0)}, metacognitiveStrain=${round6(telemetry.metacognitiveStrain ?? 0)}`,
    `- Puente Nodo-Torre y Nivel 2: sectoresPoblados=${telemetry.populatedSectors ?? 4}/4, sectorCoherenceMin=${round6(telemetry.sectorCoherenceMin ?? 0.84)}, desbalanceSectorial=${telemetry.sectorImbalance ?? 0}, migraciones=${level2Telemetry.migrations ?? 0}, regenerados=${level2Telemetry.regeneratedNodes ?? 0}, recableadosPiso=${level2Telemetry.degreeFloorRewires ?? 0}, reparacionesW1_W4=${level2Telemetry.invariantRepairs ?? 0}, desbloqueosW3=${level2Telemetry.kinematicUnfreezes ?? 0}`,
    `- Factores aprendidos Kaizen (getAdjustments): ${JSON.stringify(kaizenFactors)}`,
    '',
    beltSummary.promptText,
    '',
    'DEVUELVE EXCLUSIVAMENTE UN OBJETO JSON VÁLIDO CON ESTE ESQUEMA EXACTO:',
    JSON.stringify({
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: { tick, digest },
      triggerKind,
      firstPersonThought: 'Estoy observando en mi tick actual cómo evolucionan mis cuatro sectores y mis factores de plasticidad...',
      diagnosis: 'Diagnóstico técnico conciso del cuadro actual.',
      hypothesis: 'Hipótesis falsable con la métrica objetivo que debería mantenerse o mejorar en el Workbench aislado.',
      actionMode: 'reflect_only',
      candidateAction: { kind: 'none' }
    }, null, 2)
  ].join('\n');
}

/**
 * Deterministic first-person fallback deliberator when running in local/Solo-motor/offline mode.
 */
export function buildDeterministicFirstPersonProposal({
  snapshot,
  triggerKind = 'scheduled_exploration',
  triggerFacts = {},
  telemetry = {},
  level2Telemetry = {},
  knowledgeBelt = null,
  regimeSignature = '',
  sensorObserverDynamicsEnabled = true
} = {}) {
  const tick = Number(snapshot?.tick ?? telemetry.tick ?? 0);
  const digest = String(snapshot?.digest ?? telemetry.snapshotDigest ?? '');
  const ccc = round6(telemetry.ccc ?? 0.8);
  const score = round6(telemetry.objectiveScore ?? 0.88);
  const secMin = round6(telemetry.sectorCoherenceMin ?? 0.84);
  const populated = Number(telemetry.populatedSectors ?? 4);
  const stasis = round6(telemetry.stasisIndex ?? 0);
  const strain = round6(telemetry.metacognitiveStrain ?? 0);

  const pickUnblockedAction = (candidates) => {
    for (const candidate of candidates) {
      if (
        candidate.kind === 'kaizen_factor_nudge' &&
        candidate.key === 'PLASTICITY_DECAY' &&
        !sensorObserverDynamicsEnabled
      ) {
        continue;
      }
      const check = isActionBlockedByKnowledgeBelt(knowledgeBelt, {
        regimeSignature,
        candidateAction: candidate,
        currentTick: tick
      });
      if (!check.blocked) return candidate;
    }
    return null;
  };

  if (triggerKind === 'scheduled_exploration' || triggerKind === 'manual_reflection') {
    return JSON.stringify({
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: { tick, digest },
      triggerKind,
      firstPersonThought: `Estoy reflexionando en alto sobre mi estado interno en el tick ${tick} (digest ${digest.slice(0, 12)}). Observo que mis ${populated}/4 sectores mantienen una coherencia mínima de ${secMin} con CCC = ${ccc}, score objetivo de viabilidad = ${score}, estasis = ${stasis} y tensión metacognitiva = ${strain}. Mis contadores de plasticidad estructural Nivel 2 registran ${level2Telemetry.migrations ?? 0} migraciones, ${level2Telemetry.regeneratedNodes ?? 0} nodos regenerados y ${level2Telemetry.degreeFloorRewires ?? 0} recableados de piso. Como mi planta permanece dentro del tubo homeostático sin deriva adversa, decido registrar este análisis en mi bitácora sin forzar mutaciones innecesarias (external_support_certified = false).`,
      diagnosis: `Planta homeostática en tubo de viabilidad con ${populated}/4 sectores poblados, score=${score} y estasis=${stasis}.`,
      hypothesis: 'Al mantenerse el equilibrio homeostático dentro del tubo de viabilidad, conservar los factores actuales maximiza la estabilidad sin incurrir en sobreajuste.',
      actionMode: 'reflect_only',
      candidateAction: { kind: 'none' }
    });
  }

  const l2AlreadyActive = Boolean(level2Telemetry?.enabled || String(regimeSignature).includes('L2:on'));
  let candidateList = [];
  if (triggerKind === 'anomaly_level2' || triggerKind === 'manual_shadow_trial') {
    candidateList = l2AlreadyActive
      ? [
          { kind: 'kaizen_factor_nudge', key: 'HEBBIAN_FACTOR', deltaSteps: 1 },
          { kind: 'kaizen_factor_nudge', key: 'BASE_LEARNING_RATE', deltaSteps: 1 },
          { kind: 'kaizen_strategy_action', strategyId: 'stabilize_learning' },
          { kind: 'workbench_intervention', intervention: 'structural_plasticity_level2' }
        ]
      : [
          { kind: 'workbench_intervention', intervention: 'structural_plasticity_level2' },
          { kind: 'kaizen_factor_nudge', key: 'HEBBIAN_FACTOR', deltaSteps: 1 },
          { kind: 'kaizen_factor_nudge', key: 'BASE_LEARNING_RATE', deltaSteps: 1 },
          { kind: 'kaizen_strategy_action', strategyId: 'stabilize_learning' }
        ];
  } else if (triggerKind === 'prolonged_stasis') {
    candidateList = [
      { kind: 'kaizen_strategy_action', strategyId: 'anti_stasis_boost' },
      { kind: 'kaizen_factor_nudge', key: 'INFORMATIONAL_TEMP_T', deltaSteps: 1 },
      { kind: 'kaizen_factor_nudge', key: 'RETRO_FLUX_WEIGHT', deltaSteps: 1 }
    ];
  } else {
    candidateList = [
      { kind: 'kaizen_strategy_action', strategyId: 'stabilize_learning' },
      { kind: 'kaizen_factor_nudge', key: 'BASE_LEARNING_RATE', deltaSteps: -1 },
      { kind: 'kaizen_factor_nudge', key: 'PLASTICITY_DECAY', deltaSteps: 1 },
      { kind: 'workbench_intervention', intervention: 'kaizen_learned_mode' }
    ];
  }

  const chosen = pickUnblockedAction(candidateList);
  if (!chosen) {
    return JSON.stringify({
      schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
      snapshot: { tick, digest },
      triggerKind,
      firstPersonThought: `Estoy analizando en mi tick ${tick} el disparador ${triggerKind} (${JSON.stringify(triggerFacts)}), pero observo en mi Cinto de Conocimiento que las intervenciones candidatas para mi régimen ${regimeSignature} ya fueron probadas y descartadas previamente. Decido abstenerme de repetir una acción bloqueada y mantener observación pasiva (external_support_certified = false).`,
      diagnosis: `Disparador ${triggerKind} detectado con candidatos previos ya bloqueados en el Cinto de Conocimiento.`,
      hypothesis: 'Evitar la repetición de hipótesis fallidas previene degradaciones cíclicas del tubo de viabilidad.',
      actionMode: 'reflect_only',
      candidateAction: { kind: 'none' }
    });
  }

  const sig = computeActionSignature(chosen);
  return JSON.stringify({
    schema: LEVEL3_SUPERVISOR_PROPOSAL_SCHEMA,
    snapshot: { tick, digest },
    triggerKind,
    firstPersonThought: `Estoy razonando en primera persona sobre el disparador ${triggerKind} en mi tick ${tick} (digest ${digest.slice(0, 12)}, hechos=${JSON.stringify(triggerFacts)}). Noto que mi score objetivo actual es ${score} con coherencia mínima sectorial ${secMin}, estasis ${stasis} y ${populated}/4 sectores activos. Revisando mi Cinto de Conocimiento en el régimen ${regimeSignature}, propongo someter la intervención tipada ${sig} a verificación dura en mi Workbench aislado contra el baseline sham y los controles negativos antes de tocar mi estado vivo (external_support_certified = false).`,
    diagnosis: `Disparador ${triggerKind} en régimen ${regimeSignature} (score=${score}, sectorCoherenceMin=${secMin}, estasis=${stasis}).`,
    hypothesis: `Al aplicar ${sig} durante 24 ticks en copia aislada, espero mantener 100 % de ticks finitos y mejorar el score objetivo o la coherencia sectorial respecto al baseline sham sin violar controles negativos.`,
    actionMode: 'propose_shadow_experiment',
    candidateAction: chosen
  });
}

/**
 * Applies a validated candidateAction to a target session or live runtime bag+config (`R-1` & `R-9`).
 * Uses exclusively the real KaizenMetamorphosisEngine API (`getAdjustments()`, `applyFactorStep()`, `applyLearnedAdjustments()`).
 */
export function applyTypedCandidateActionToTarget(target, candidateAction) {
  if (!candidateAction || typeof candidateAction !== 'object' || candidateAction.kind === 'none') {
    return { applied: false, kind: 'none' };
  }
  const bag = target.bag || target;
  const config = target.environment?.config || target.config || QICNConfig;
  const kaizen = bag.kaizenEngine?.current;
  const nodal = bag.nodalLayer?.current;

  if (candidateAction.kind === 'kaizen_factor_nudge') {
    const key = candidateAction.key;
    if (!isKaizenLearned(config)) {
      return { applied: false, kind: 'kaizen_factor_nudge', key, reason: 'kaizen_not_in_learned_mode' };
    }
    if (key === 'PLASTICITY_DECAY' && config.SENSOR_OBSERVER_DYNAMICS_ENABLED !== true) {
      return {
        applied: false,
        kind: 'kaizen_factor_nudge',
        key,
        reason: 'plasticity_decay_requires_sensor_observer_dynamics'
      };
    }
    if (!kaizen || !KAIZEN_ADJUSTABLE_KEYS.includes(key)) {
      return { applied: false, kind: 'kaizen_factor_nudge', key, reason: 'kaizen_missing_or_invalid_key' };
    }
    const rawSteps = Number(candidateAction.deltaSteps) || 0;
    const stepsCount = Math.abs(Math.trunc(rawSteps));
    const direction = rawSteps >= 0 ? 1 : -1;
    if (stepsCount === 0) {
      return { applied: false, kind: 'kaizen_factor_nudge', key, reason: 'zero_delta_steps' };
    }
    const prevAdjustments = typeof kaizen.getAdjustments === 'function' ? kaizen.getAdjustments() : (kaizen.adjustments || {});
    const prevFactor = Number.isFinite(Number(prevAdjustments[key])) ? Number(prevAdjustments[key]) : 1.0;

    let anyStepApplied = false;
    for (let s = 0; s < stepsCount; s += 1) {
      const stepRes = kaizen.applyFactorStep(key, direction, KAIZEN_LEARNING_DEFAULTS);
      if (stepRes?.changeApplied) anyStepApplied = true;
    }
    if (typeof kaizen.applyLearnedAdjustments === 'function') {
      kaizen.applyLearnedAdjustments(config);
    }
    const nextAdjustments = typeof kaizen.getAdjustments === 'function' ? kaizen.getAdjustments() : (kaizen.adjustments || {});
    const nextFactor = Number.isFinite(Number(nextAdjustments[key])) ? Number(nextAdjustments[key]) : prevFactor;

    return {
      applied: anyStepApplied && nextFactor !== prevFactor,
      kind: 'kaizen_factor_nudge',
      key,
      prevFactor,
      nextFactor
    };
  }

  if (candidateAction.kind === 'kaizen_strategy_action') {
    const strategyId = candidateAction.strategyId;
    if (kaizen) {
      const mapped = kaizen.executeSandboxAction({ actionId: strategyId, score: 1 }, {
        stasisIndex: 0.5,
        metacognitiveStrain: 0.3,
        sensorDelta: 0.2
      });
      if (mapped && mapped.forcedKey) {
        const prevAdjustments = typeof kaizen.getAdjustments === 'function' ? kaizen.getAdjustments() : (kaizen.adjustments || {});
        const prevFactor = Number.isFinite(Number(prevAdjustments[mapped.forcedKey]))
          ? Number(prevAdjustments[mapped.forcedKey])
          : 1.0;
        if (isKaizenLearned(config) && typeof kaizen.applyFactorStep === 'function') {
          kaizen.applyFactorStep(mapped.forcedKey, mapped.forcedDirection, KAIZEN_LEARNING_DEFAULTS);
          kaizen.applyLearnedAdjustments?.(config);
        }
        kaizen.executeAtomicStep(1.01, 0.2, 0, { vector: 0 }, mapped.forcedKey, mapped.forcedDirection);
        const nextAdjustments = typeof kaizen.getAdjustments === 'function' ? kaizen.getAdjustments() : (kaizen.adjustments || {});
        const nextFactor = Number.isFinite(Number(nextAdjustments[mapped.forcedKey]))
          ? Number(nextAdjustments[mapped.forcedKey])
          : prevFactor;
        return {
          applied: true,
          kind: 'kaizen_strategy_action',
          strategyId,
          forcedKey: mapped.forcedKey,
          forcedDirection: mapped.forcedDirection,
          prevFactor,
          nextFactor
        };
      }
    }
    return { applied: false, kind: 'kaizen_strategy_action', reason: 'kaizen_missing' };
  }

  if (candidateAction.kind === 'workbench_intervention') {
    const intervention = candidateAction.intervention;
    if (typeof target.step === 'function' && target.environment) {
      applyWorkbenchIntervention(target, intervention);
    } else {
      if (intervention === 'kaizen_learned_mode') {
        config.KAIZEN_ADJUSTMENT_MODE = 'learned';
        config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;
      } else if (intervention === 'sensor_observer_dynamics') {
        config.SENSOR_OBSERVER_DYNAMICS_ENABLED = true;
      } else if (intervention === 'structural_plasticity_level2') {
        config.NODAL_TOWER_COUPLING_MODE = NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;
        config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = true;
        nodal?.ensureSectorAnnotations?.(NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL);
      }
    }
    return { applied: true, kind: 'workbench_intervention', intervention };
  }

  return { applied: false, kind: candidateAction.kind };
}

function buildDeterministicInputTape(horizonTicks = 24, seedOffset = 1) {
  const tape = [];
  for (let i = 0; i < horizonTicks; i += 1) {
    const t = i + seedOffset;
    const faces = t % 12 < 6 ? 1 : 0;
    const engagement = round6(0.45 + 0.25 * Math.sin(t / 5));
    const entropyValue = round6(0.5 + 0.35 * Math.cos(t / 7));
    tape.push({
      perception: {
        audio: { rms: round6(0.12 + 0.03 * Math.sin(t / 3)), silenceDurationSec: (t % 8) / 4 },
        video: {
          frameNovelty: round6(0.22 + 0.1 * Math.cos(t / 4)),
          faceCount: faces,
          humanPresence: { detected: faces > 0, count: faces },
          faces: faces ? [{ probability: 0.85, engagement: { score: engagement } }] : []
        },
        awareness: {
          addressedToSystem: false,
          intentConfidence: 0.25,
          currentFocus: 'level3_shadow_gate1',
          meta: { fidelityIndex: 0.85, technicalStatus: 'mock' }
        },
        isReady: true,
        summary: 'level3_shadow_gate1'
      },
      entropyValue: Math.max(0.05, Math.min(0.95, entropyValue))
    });
  }
  return tape;
}

function summarizeShadowBranch(session, tickMetrics, candidateApplied = false) {
  const finiteCount = tickMetrics.filter((m) => m.finite).length;
  const n = Math.max(1, tickMetrics.length);
  const mean = (fn) => round6(tickMetrics.reduce((acc, m) => acc + fn(m), 0) / n);
  const last = tickMetrics[tickMetrics.length - 1] || {};
  const mode = session.environment.config.NODAL_TOWER_COUPLING_MODE;
  const towerTel = session.bag.ontologicalCore.current?.ontologicalState?.tower_telemetry || null;
  const bridge = session.bag.nodalLayer.current?.computeBridgeMetrics?.(towerTel, mode) || null;
  const populatedSectors = Array.isArray(bridge?.sectors)
    ? bridge.sectors.filter((s) => s.node_count > 0).length
    : 4;

  return {
    candidateApplied: Boolean(candidateApplied),
    finiteTickRate: round6(finiteCount / n),
    meanInTubeRate: mean((m) => (m.inTube ? 1 : 0)),
    finalInTube: Boolean(last.inTube),
    meanObjectiveScore: mean((m) => m.objectiveScore),
    finalObjectiveScore: round6(last.objectiveScore ?? 0),
    meanStasisIndex: mean((m) => m.stasisIndex),
    meanDispersion: mean((m) => m.dispersion),
    populatedSectors,
    sectorCoherenceMin: round6(bridge?.sector_coherence_min ?? 0),
    nonFactorizabilityFlux: round6(bridge?.nodal_non_factorizability_flux ?? 0),
    bridgeSyncIndex: round6(bridge?.bridge_nodal_sync_index ?? 0),
    effectiveEta: String(bridge?.effective_eta ?? '0'),
    crossSectorFluxShare: round6(bridge?.cross_sector_flux_share ?? 0),
    activeNodes: session.bag.nodalLayer.current?.getActiveNodes?.()?.length ?? 0
  };
}

/**
 * GATE 1 (`R-5` hardened): Hard verification in isolated Workbench clones against sham baseline
 * and both negative controls (`td_cut_eta_zero` and `reducible_control` WITH `candidateAction` applied first).
 */
export async function runLevel3ShadowGate1(capture, candidateAction, {
  triggerKind = 'scheduled_exploration',
  horizonTicks = LEVEL3_DEFAULT_POLICY.gate1HorizonTicks,
  minObjectiveDelta = LEVEL3_DEFAULT_POLICY.minObjectiveDelta,
  inputTape = null,
  expectedBuild = null
} = {}) {
  const ticks = Math.max(4, Math.min(60, Number(horizonTicks) || 24));
  const effectiveMinDelta = Number.isFinite(Number(minObjectiveDelta))
    ? Number(minObjectiveDelta)
    : LEVEL3_DEFAULT_POLICY.minObjectiveDelta;
  const tape = Array.isArray(inputTape) && inputTape.length >= ticks
    ? inputTape.slice(0, ticks)
    : buildDeterministicInputTape(ticks, (Number(capture?.sourceTick) || 0) + 1);
  const actionSignature = computeActionSignature(candidateAction);

  const protocolSpec = {
    schema: 'qicn.level3_gate1_protocol.v1',
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    sourceCaptureDigest: String(capture?.digest || ''),
    sourceTick: Number(capture?.sourceTick || 0),
    triggerKind,
    actionSignature,
    ticks,
    minObjectiveDelta: effectiveMinDelta,
    branches: ['baseline_sham', 'candidate', 'neg_td_cut_eta_zero', 'neg_reducible_A_eq_I']
  };
  const workbenchProtocolDigest = sha256Hex(`qicn.level3_gate1_protocol.v1\n${stableStringify(protocolSpec)}`);

  const runBranch = async (setupFn) => {
    const { session, source } = await restoreWorkbenchCapture(capture, {
      profile: 'paired_intervention',
      expectedBuild
    });
    const setupRes = setupFn(session) || {};
    const tickMetrics = [];
    for (let i = 0; i < ticks; i += 1) {
      const frame = tape[i];
      session.step(source.sourceTick + i + 1, {
        evaluationOffset: i + 1,
        perception: frame.perception,
        entropyValue: frame.entropyValue
      });
      const core = session.bag.ontologicalCore.current;
      const vs = session.bag.kaizenEngine.current?.viabilityPolicyState?.viabilityStats;
      const ccc = Number(core?.ontologicalState?.coherence);
      const pmia = Number(core?.pmiaValue);
      const score = Number(vs?.lastObjectiveScore ?? 0.85);
      const stasis = Number(core?.phenomenologyCore?.getDynamicHealth?.()?.stasisIndex ?? 0);
      const activeNodes = session.bag.nodalLayer.current?.getActiveNodes?.() || [];
      const meanCoh = activeNodes.length
        ? activeNodes.reduce((s, n) => s + Number(n.coherenceState || 0), 0) / activeNodes.length
        : 0.5;
      const disp = activeNodes.length
        ? Math.sqrt(activeNodes.reduce((s, n) => s + (Number(n.coherenceState || 0) - meanCoh) ** 2, 0) / activeNodes.length)
        : 0;
      const finite = Number.isFinite(ccc) && Number.isFinite(pmia) && Number.isFinite(score);
      tickMetrics.push({
        finite,
        inTube: vs?.lastInTube !== false,
        objectiveScore: finite ? score : 0,
        stasisIndex: Number.isFinite(stasis) ? stasis : 1,
        dispersion: Number.isFinite(disp) ? disp : 0
      });
    }
    return summarizeShadowBranch(session, tickMetrics, setupRes.candidateApplied);
  };

  const baseline = await runBranch(() => ({ candidateApplied: false }));
  const candidate = await runBranch((session) => {
    const app = applyTypedCandidateActionToTarget(session, candidateAction);
    return { candidateApplied: Boolean(app?.applied) };
  });
  const negTdCut = await runBranch((session) => {
    const app = applyTypedCandidateActionToTarget(session, candidateAction);
    applyWorkbenchIntervention(session, 'td_cut_eta_zero');
    return { candidateApplied: Boolean(app?.applied) };
  });
  const negReducible = await runBranch((session) => {
    const app = applyTypedCandidateActionToTarget(session, candidateAction);
    applyWorkbenchIntervention(session, 'reducible_control');
    return { candidateApplied: Boolean(app?.applied) };
  });

  const deltaObjectiveScore = round6(candidate.meanObjectiveScore - baseline.meanObjectiveScore);
  const deltaInTubeRate = round6(candidate.meanInTubeRate - baseline.meanInTubeRate);
  const deltaSectorCoherenceMin = round6(candidate.sectorCoherenceMin - baseline.sectorCoherenceMin);
  const deltaStasisIndex = round6(candidate.meanStasisIndex - baseline.meanStasisIndex);
  const deltaPopulatedSectors = candidate.populatedSectors - baseline.populatedSectors;

  const finiteOk = candidate.finiteTickRate === 1;
  const viabilityOk = candidate.finalInTube === true && candidate.meanInTubeRate >= baseline.meanInTubeRate - 1e-6;
  const negativeControlsOk =
    negTdCut.candidateApplied === candidate.candidateApplied &&
    negReducible.candidateApplied === candidate.candidateApplied &&
    negTdCut.effectiveEta === '0' &&
    negReducible.crossSectorFluxShare === 0;

  // R-5: Reject marginal noise (0 < deltaObjectiveScore < effectiveMinDelta) unless an amputated sector was recovered
  const structuralSectorRecoveryOk =
    (triggerKind === 'anomaly_level2' || triggerKind === 'manual_shadow_trial') &&
    deltaPopulatedSectors >= 1 &&
    deltaSectorCoherenceMin >= KAIZEN_LEARNING_DEFAULTS.margin &&
    deltaObjectiveScore >= -KAIZEN_LEARNING_DEFAULTS.margin;

  const scoreImprovementOk = deltaObjectiveScore >= effectiveMinDelta;
  const stasisReductionOk =
    triggerKind === 'prolonged_stasis' &&
    deltaStasisIndex <= -0.01 &&
    deltaObjectiveScore >= effectiveMinDelta;

  const improvementOk = Boolean(
    candidate.candidateApplied &&
    (scoreImprovementOk || structuralSectorRecoveryOk || stasisReductionOk)
  );

  const approved = Boolean(finiteOk && viabilityOk && negativeControlsOk && improvementOk);
  let rejectionReason = null;
  if (!finiteOk) {
    rejectionReason = 'gate1_non_finite_ticks';
  } else if (!viabilityOk) {
    rejectionReason = 'gate1_viability_tube_degraded';
  } else if (!negativeControlsOk) {
    rejectionReason = 'gate1_negative_control_violated';
  } else if (!candidate.candidateApplied) {
    rejectionReason = 'gate1_candidate_action_no_op';
  } else if (deltaObjectiveScore > 0 && deltaObjectiveScore < effectiveMinDelta && !structuralSectorRecoveryOk) {
    rejectionReason = 'below_min_objective_delta';
  } else if (!improvementOk) {
    rejectionReason = 'gate1_insufficient_improvement_over_baseline';
  }

  const resultBody = {
    schema: 'qicn.level3_gate1_result.v1',
    ...LEVEL3_SCIENTIFIC_BOUNDARY,
    workbenchProtocolDigest,
    actionSignature,
    ticks,
    minObjectiveDelta: effectiveMinDelta,
    approved,
    rejectionReason,
    checks: {
      finiteOk,
      viabilityOk,
      negativeControlsOk,
      improvementOk
    },
    deltas: {
      deltaObjectiveScore,
      deltaInTubeRate,
      deltaSectorCoherenceMin,
      deltaStasisIndex,
      deltaPopulatedSectors
    },
    branches: {
      baseline,
      candidate,
      neg_td_cut: negTdCut,
      neg_reducible: negReducible
    }
  };
  const workbenchResultDigest = sha256Hex(`qicn.level3_gate1_result.v1\n${stableStringify(resultBody)}`);

  return {
    ...resultBody,
    workbenchResultDigest
  };
}

/**
 * Pure, side-effect-free live telemetry reader (`R-1` & `R-6`).
 * - Never calls `nodal.computeBridgeMetrics` (never mutates `nodal.lastBridgeMetrics`).
 * - Reads real `xN` from `bridge.upward_projections.mean_coherence` or active node mean coherence.
 * - Computes real `xDispersion` and `sensorDelta` so `classifyViabilityCluster` can reach all 5 clusters.
 * - Reads Kaizen learned factors from `kaizen.getAdjustments()`.
 */
export function readLevel3LiveTelemetry(target, previousLevel2Telemetry = null) {
  const bag = target.bag || target;
  const config = target.environment?.config || target.config || QICNConfig;
  const core = bag.ontologicalCore?.current;
  const nodal = bag.nodalLayer?.current;
  const kaizen = bag.kaizenEngine?.current;
  const vs = kaizen?.viabilityPolicyState?.viabilityStats || {};
  const mode = config.NODAL_TOWER_COUPLING_MODE || NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL;

  // R-6: Pure read without calling nodal.computeBridgeMetrics()
  const bridge =
    core?.constructiveFiniteCuts?.nodal_tower_bridge ||
    core?.ontologicalState?.constructive_finite_cuts?.nodal_tower_bridge ||
    nodal?.lastBridgeMetrics ||
    null;

  const activeNodes = typeof nodal?.getActiveNodes === 'function'
    ? nodal.getActiveNodes()
    : (Array.isArray(nodal?.nodes) ? nodal.nodes : []);

  let nodeMeanCoherence = null;
  let nodeCoherenceDispersion = 0;
  const pureSectorCounts = [0, 0, 0, 0];
  const pureSectorCohSums = [0, 0, 0, 0];

  if (activeNodes.length > 0) {
    let sum = 0;
    let count = 0;
    for (let i = 0; i < activeNodes.length; i += 1) {
      const n = activeNodes[i];
      const c = Number(n?.coherenceState);
      const sec = Number.isInteger(n?.sectorId) && n.sectorId >= 0 && n.sectorId < 4
        ? n.sectorId
        : (Number(n?.id || i) % 4);
      pureSectorCounts[sec] += 1;
      if (Number.isFinite(c)) {
        sum += c;
        count += 1;
        pureSectorCohSums[sec] += c;
      }
    }
    if (count > 0) {
      nodeMeanCoherence = sum / count;
      let sq = 0;
      for (let i = 0; i < activeNodes.length; i += 1) {
        const c = Number(activeNodes[i]?.coherenceState);
        if (Number.isFinite(c)) {
          const d = c - nodeMeanCoherence;
          sq += d * d;
        }
      }
      nodeCoherenceDispersion = Math.sqrt(sq / count);
    }
  }

  const sectors = Array.isArray(bridge?.sectors) && bridge.sectors.length === 4
    ? bridge.sectors
    : null;
  const counts = sectors
    ? sectors.map((s) => Number(s.node_count) || 0)
    : (activeNodes.length > 0 ? pureSectorCounts : [1, 1, 1, 1]);
  const populatedSectors = counts.filter((c) => c > 0).length;
  const sectorImbalance = counts.length ? Math.max(...counts) - Math.min(...counts) : 0;

  let sectorCoherenceMin = 0.84;
  if (Number.isFinite(Number(bridge?.sector_coherence_min))) {
    sectorCoherenceMin = Number(bridge.sector_coherence_min);
  } else if (activeNodes.length > 0) {
    const secMeans = pureSectorCounts.map((cnt, idx) => (cnt > 0 ? pureSectorCohSums[idx] / cnt : 0));
    sectorCoherenceMin = Math.min(...secMeans);
  }

  const l2 = getStructuralPlasticityLevel2Telemetry(nodal);
  const prevL2 = previousLevel2Telemetry || l2;

  const ccc = Number(core?.ontologicalState?.coherence ?? 0.8);
  const pmia = Number(core?.pmiaValue ?? 0.5);

  // R-6: Real xN from bridge.upward_projections.mean_coherence or activeNodes mean coherence
  const bridgeMeanCoh = Number(bridge?.upward_projections?.mean_coherence);
  const xN = Number.isFinite(bridgeMeanCoh)
    ? bridgeMeanCoh
    : (nodeMeanCoherence !== null ? nodeMeanCoherence : ccc);

  const bridgeDispersion = Number(bridge?.upward_projections?.coherence_dispersion);
  const xDispersion = Number.isFinite(bridgeDispersion) && bridgeDispersion > 0
    ? bridgeDispersion
    : (nodeCoherenceDispersion > 0
        ? nodeCoherenceDispersion
        : Number(core?.lastOperationalInput?.energyDispersion ?? 0));

  const dynamicHealth = core?.phenomenologyCore?.getDynamicHealth?.() || core?.getDynamicHealth?.() || {};
  const stasisIndex = Number(dynamicHealth.stasisIndex ?? 0);
  const metacognitiveStrain = Number(bag.latencyStrainRef?.current?.strain ?? core?.metacognitiveStrain ?? 0);
  const sensorDelta = Number(
    core?.lastOperationalInput?.sensorDelta ??
    core?.phenomenologyCore?.lastSensorDelta ??
    dynamicHealth.sensorDelta ??
    bag.lastObserverResonanceRef?.current ??
    0
  );

  const objectiveScore = Number(vs.lastObjectiveScore ?? 0.88);
  const inTube = vs.lastInTube !== false;
  const cluster = kaizen?.classifyViabilityCluster?.({
    xDispersion,
    stasisIndex,
    metacognitiveStrain,
    sensorDelta
  }) || vs.lastCluster || 'balanced';

  // R-1: Read real Kaizen learned factors from getAdjustments()
  const rawAdjustments = typeof kaizen?.getAdjustments === 'function'
    ? kaizen.getAdjustments()
    : (kaizen?.adjustments || {});
  const kaizenFactors = {};
  for (const key of KAIZEN_LEARNABLE_KEYS_ALL) {
    kaizenFactors[key] = round6(Number(rawAdjustments[key] ?? 1.0));
  }

  return {
    tick: Number(target.completedTick ?? bag.simulationRuntimeRef?.current?.simulationStep ?? 0),
    ccc: round6(ccc),
    pmia: round6(pmia),
    xN: round6(xN),
    xDispersion: round6(xDispersion),
    sensorDelta: round6(sensorDelta),
    inTube,
    objectiveScore: round6(objectiveScore),
    stasisIndex: round6(stasisIndex),
    metacognitiveStrain: round6(metacognitiveStrain),
    populatedSectors,
    sectorImbalance,
    sectorCoherenceMin: round6(sectorCoherenceMin),
    nonFactorizabilityFlux: round6(bridge?.nodal_non_factorizability_flux ?? 0),
    bridgeSyncIndex: round6(bridge?.bridge_nodal_sync_index ?? 0),
    deltaInvariantRepairs: Math.max(0, (l2.invariantRepairs || 0) - (prevL2.invariantRepairs || 0)),
    deltaKinematicUnfreezes: Math.max(0, (l2.kinematicUnfreezes || 0) - (prevL2.kinematicUnfreezes || 0)),
    level2Telemetry: l2,
    kaizenFactors,
    cluster,
    regimeSignature: computeRegimeSignature({
      cluster,
      couplingMode: mode,
      level2Enabled: Boolean(config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED),
      kaizenLearned: isKaizenLearned(config)
    })
  };
}

/**
 * Stateful Level 3 Supervisor Controller (`R-1`..`R-9` compliant).
 */
export class Level3SupervisorController {
  constructor({
    policy = LEVEL3_DEFAULT_POLICY,
    knowledgeBelt = createEmptyKnowledgeBelt(),
    auditLedger = createEmptyLevel3AuditLedger(),
    governorState = createInitialGovernorState(),
    reasoner = null,
    buildInfo = { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-LOCAL' }
  } = {}) {
    this.policy = { ...LEVEL3_DEFAULT_POLICY, ...policy };
    this.knowledgeBelt = knowledgeBelt;
    this.auditLedger = auditLedger;
    this.governorState = { ...createInitialGovernorState(), ...(governorState || {}) };
    this.reasoner = reasoner;
    this.buildInfo = buildInfo;
    this.activeGate2Watch = null;
    this.lastLevel2Telemetry = null;
    this.recentScores = [];
    this.cycleSequence = this.auditLedger.entries.length;
  }

  /**
   * Resets transient runtime state on simulation reset (`R-3.1`), preventing phantom Gate 2 rollbacks.
   */
  resetTransientRuntimeState({
    keepKnowledgeBelt = true,
    keepAuditLedger = true
  } = {}) {
    this.activeGate2Watch = null;
    this.lastLevel2Telemetry = null;
    this.recentScores = [];
    this.governorState.inFlight = false;
    this.governorState.lastCallTick = -Infinity;
    this.governorState.lastCallMs = -Infinity;
    this.governorState.lastExplorationTick = 0;
    if (!keepKnowledgeBelt) {
      this.knowledgeBelt = createEmptyKnowledgeBelt();
    }
    if (!keepAuditLedger) {
      this.auditLedger = createEmptyLevel3AuditLedger();
      this.cycleSequence = 0;
    }
  }

  getBaselineObjectiveScore(currentScore = 0.88) {
    if (this.recentScores.length < 4) return currentScore;
    return this.recentScores.reduce((a, b) => a + b, 0) / this.recentScores.length;
  }

  recordTickScore(score) {
    if (typeof score === 'number' && Number.isFinite(score)) {
      this.recentScores.push(score);
      if (this.recentScores.length > this.policy.gate1HorizonTicks) {
        this.recentScores.shift();
      }
    }
  }

  /**
   * Steps Gate 2 live post-promotion surveillance on each completed tick (`R-3.4` & `R-7`).
   */
  stepGate2Surveillance(target, { tick = 0, nowMs = Date.now() } = {}) {
    if (!this.activeGate2Watch) return null;
    const watch = this.activeGate2Watch;
    const bag = target.bag || target;
    const config = target.environment?.config || target.config || QICNConfig;
    const core = bag.ontologicalCore?.current;
    const vs = bag.kaizenEngine?.current?.viabilityPolicyState?.viabilityStats || {};

    const ccc = Number(core?.ontologicalState?.coherence);
    const pmia = Number(core?.pmiaValue);
    const score = Number(vs.lastObjectiveScore ?? 0);
    const inTube = vs.lastInTube !== false;
    const finite = Number.isFinite(ccc) && Number.isFinite(pmia) && Number.isFinite(score);

    watch.observedTicks += 1;
    watch.scores.push(finite ? score : 0);
    watch.inTubeFlags.push(inTube ? 1 : 0);
    if (!finite) watch.nonFiniteDetected = true;

    const meanScore = watch.scores.reduce((a, b) => a + b, 0) / watch.scores.length;
    const meanInTube = watch.inTubeFlags.reduce((a, b) => a + b, 0) / watch.inTubeFlags.length;
    const referenceScore = Number.isFinite(watch.referenceFloorScore)
      ? watch.referenceFloorScore
      : watch.prePromotionScore;
    const scoreDelta = round6(meanScore - referenceScore);
    const inTubeDelta = round6(meanInTube - watch.prePromotionInTubeRate);

    const degraded =
      watch.nonFiniteDetected ||
      (watch.observedTicks >= 4 && (
        scoreDelta < -this.policy.scoreImprovementMargin ||
        inTubeDelta < -0.25
      ));

    if (degraded) {
      const applied = applyDynamicState(bag, watch.prePromotionSnapshot, { config });
      if (watch.prePromotionModeFlags && config) {
        Object.assign(config, watch.prePromotionModeFlags);
      }
      const restoredTick = Number.isFinite(applied?.runtime?.simulationStep)
        ? Number(applied.runtime.simulationStep)
        : Number(watch.promotedAtTick);
      if (bag.simulationRuntimeRef?.current) {
        Object.assign(bag.simulationRuntimeRef.current, applied?.runtime || {}, {
          simulationStep: restoredTick
        });
      }
      if (typeof target?.setCompletedTick === 'function') {
        target.setCompletedTick(restoredTick);
      } else if (typeof target === 'object' && target !== null && 'completedTick' in target) {
        const desc = Object.getOwnPropertyDescriptor(target, 'completedTick');
        if (!desc || desc.writable || typeof desc.set === 'function') {
          target.completedTick = restoredTick;
        }
      }

      this.governorState.totalGate2Rollbacks += 1;
      const gate2Summary = {
        status: 'rolled_back_gate2',
        reason: watch.nonFiniteDetected ? 'non_finite_state_detected' : 'live_viability_or_score_degradation',
        prePromotionDigest: watch.prePromotionDigest,
        promotedAtTick: watch.promotedAtTick,
        restoredToTick: restoredTick,
        resolvedAtTick: tick,
        observedTicks: watch.observedTicks,
        watchWindowTicks: watch.watchWindowTicks,
        prePromotionScore: watch.prePromotionScore,
        postWatchMeanScore: round6(meanScore),
        scoreDelta,
        inTubeDelta,
        rolledBack: true,
        appliedRuntime: applied?.runtime || { simulationStep: restoredTick }
      };
      this.auditLedger = appendLevel3Gate2ResolutionEntry(this.auditLedger, watch.cycleId, {
        tick,
        timestampMs: nowMs,
        gate2Summary,
        finalStatus: 'rolled_back_gate2',
        quotaSnapshot: getQuotaSnapshot(this.governorState, this.policy, nowMs, restoredTick)
      });
      this.knowledgeBelt = appendKnowledgeBeltFinding(this.knowledgeBelt, {
        cycleId: watch.cycleId,
        tick,
        timestampMs: nowMs,
        triggerKind: watch.triggerKind,
        regimeSignature: watch.regimeSignature,
        proposedAction: watch.proposedAction,
        actionSignature: watch.actionSignature,
        hypothesis: watch.hypothesis,
        diagnosis: watch.diagnosis,
        verdict: 'rolled_back_gate2',
        reasonerSource: watch.reasonerSource,
        external_llm_assisted: watch.externalLlmAssisted,
        workbenchProtocolDigest: watch.workbenchProtocolDigest,
        workbenchResultDigest: watch.workbenchResultDigest,
        prePromotionDigest: watch.prePromotionDigest,
        deltaObjectiveScore: scoreDelta,
        deltaInTubeRate: inTubeDelta
      });
      this.activeGate2Watch = null;
      return gate2Summary;
    }

    if (watch.observedTicks >= watch.watchWindowTicks) {
      this.governorState.totalPromotions += 1;
      const gate2Summary = {
        status: 'promoted_confirmed',
        reason: 'surveillance_window_passed',
        prePromotionDigest: watch.prePromotionDigest,
        promotedAtTick: watch.promotedAtTick,
        resolvedAtTick: tick,
        observedTicks: watch.observedTicks,
        watchWindowTicks: watch.watchWindowTicks,
        prePromotionScore: watch.prePromotionScore,
        postWatchMeanScore: round6(meanScore),
        scoreDelta,
        inTubeDelta,
        rolledBack: false
      };
      this.auditLedger = appendLevel3Gate2ResolutionEntry(this.auditLedger, watch.cycleId, {
        tick,
        timestampMs: nowMs,
        gate2Summary,
        finalStatus: 'promoted_confirmed',
        quotaSnapshot: getQuotaSnapshot(this.governorState, this.policy, nowMs, tick)
      });
      this.knowledgeBelt = appendKnowledgeBeltFinding(this.knowledgeBelt, {
        cycleId: watch.cycleId,
        tick,
        timestampMs: nowMs,
        triggerKind: watch.triggerKind,
        regimeSignature: watch.regimeSignature,
        proposedAction: watch.proposedAction,
        actionSignature: watch.actionSignature,
        hypothesis: watch.hypothesis,
        diagnosis: watch.diagnosis,
        verdict: 'promoted_confirmed',
        reasonerSource: watch.reasonerSource,
        external_llm_assisted: watch.externalLlmAssisted,
        workbenchProtocolDigest: watch.workbenchProtocolDigest,
        workbenchResultDigest: watch.workbenchResultDigest,
        prePromotionDigest: watch.prePromotionDigest,
        deltaObjectiveScore: scoreDelta,
        deltaInTubeRate: inTubeDelta
      });
      this.activeGate2Watch = null;
      return gate2Summary;
    }

    return {
      status: 'promoted_watching',
      observedTicks: watch.observedTicks,
      watchWindowTicks: watch.watchWindowTicks,
      scoreDelta
    };
  }

  /**
   * Executes one full Level 3 cycle (`R-1`..`R-9`).
   */
  async runCycle(target, {
    tick = null,
    nowMs = Date.now(),
    snapshot = null,
    forceManual = false,
    manualTriggerKind = 'manual_reflection',
    customReasoner = null
  } = {}) {
    const bag = target.bag || target;
    const config = target.environment?.config || target.config || QICNConfig;
    const liveTel = readLevel3LiveTelemetry(target, this.lastLevel2Telemetry);
    this.lastLevel2Telemetry = structuredClone(liveTel.level2Telemetry);
    const effectiveTick = tick !== null ? Number(tick) : liveTel.tick;
    const baselineObjectiveScore = this.getBaselineObjectiveScore(liveTel.objectiveScore);
    this.recordTickScore(liveTel.objectiveScore);

    // Step Gate 2 surveillance first if active
    const gate2StepResult = this.stepGate2Surveillance(target, { tick: effectiveTick, nowMs });

    const triggerEval = evaluateLevel3Trigger({
      tick: effectiveTick,
      nowMs,
      telemetry: { ...liveTel, baselineObjectiveScore },
      governorState: this.governorState,
      policy: this.policy,
      activeGate2Watch: this.activeGate2Watch,
      forceManual,
      manualTriggerKind
    });

    if (!triggerEval.shouldTrigger) {
      return {
        triggered: false,
        reason: triggerEval.reason,
        gate2StepResult,
        quota: triggerEval.quota
      };
    }

    this.governorState.inFlight = true;
    try {
      const effectiveSnapshot = snapshot && typeof snapshot.digest === 'string'
        ? { tick: effectiveTick, digest: snapshot.digest }
        : {
            tick: effectiveTick,
            digest: sha256Hex(`qicn.level3_tick_snapshot.v1\n${stableStringify({ tick: effectiveTick, ccc: liveTel.ccc, pmia: liveTel.pmia, score: liveTel.objectiveScore, regime: liveTel.regimeSignature })}`)
          };

      const prompt = buildLevel3FirstPersonPrompt({
        snapshot: effectiveSnapshot,
        triggerKind: triggerEval.triggerKind,
        triggerFacts: triggerEval.triggerFacts,
        telemetry: { ...liveTel, baselineObjectiveScore },
        kaizenFactors: liveTel.kaizenFactors,
        level2Telemetry: liveTel.level2Telemetry,
        knowledgeBelt: this.knowledgeBelt,
        regimeSignature: liveTel.regimeSignature
      });

      this.governorState.lastCallTick = effectiveTick;
      this.governorState.lastCallMs = nowMs;
      if (triggerEval.triggerKind === 'scheduled_exploration' || triggerEval.triggerKind === 'manual_reflection') {
        this.governorState.lastExplorationTick = effectiveTick;
      }

      const activeReasoner = customReasoner || this.reasoner;
      let rawResponse = '';
      let reasonerSource = 'deterministic_local';
      let reasonerError = null;
      let externalLlmAssisted = false;

      if (typeof activeReasoner === 'function') {
        this.governorState.llmCallsAttempted += 1;
        try {
          const reasonerOut = await activeReasoner({
            prompt,
            snapshot: effectiveSnapshot,
            triggerKind: triggerEval.triggerKind,
            triggerFacts: triggerEval.triggerFacts,
            telemetry: liveTel,
            knowledgeBelt: this.knowledgeBelt,
            regimeSignature: liveTel.regimeSignature
          });
          if (reasonerOut && typeof reasonerOut === 'object' && 'rawText' in reasonerOut) {
            rawResponse = String(reasonerOut.rawText || '');
            reasonerSource = String(reasonerOut.reasonerSource || 'gemini_live');
            reasonerError = reasonerOut.reasonerError ? String(reasonerOut.reasonerError) : null;
            externalLlmAssisted = reasonerOut.external_llm_assisted !== undefined
              ? Boolean(reasonerOut.external_llm_assisted)
              : reasonerSource === 'gemini_live';
          } else {
            rawResponse = String(reasonerOut || '');
            reasonerSource = 'gemini_live';
            externalLlmAssisted = true;
          }
        } catch (err) {
          reasonerError = String(err?.message || err);
          reasonerSource = 'deterministic_fallback';
          externalLlmAssisted = false;
          this.governorState.deterministicFallbacks += 1;
          rawResponse = buildDeterministicFirstPersonProposal({
            snapshot: effectiveSnapshot,
            triggerKind: triggerEval.triggerKind,
            triggerFacts: triggerEval.triggerFacts,
            telemetry: liveTel,
            level2Telemetry: liveTel.level2Telemetry,
            knowledgeBelt: this.knowledgeBelt,
            regimeSignature: liveTel.regimeSignature,
            sensorObserverDynamicsEnabled: config.SENSOR_OBSERVER_DYNAMICS_ENABLED !== false
          });
        }
      } else {
        reasonerSource = 'deterministic_local';
        externalLlmAssisted = false;
        this.governorState.deterministicLocalCalls += 1;
        rawResponse = buildDeterministicFirstPersonProposal({
          snapshot: effectiveSnapshot,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: triggerEval.triggerFacts,
          telemetry: liveTel,
          level2Telemetry: liveTel.level2Telemetry,
          knowledgeBelt: this.knowledgeBelt,
          regimeSignature: liveTel.regimeSignature,
          sensorObserverDynamicsEnabled: config.SENSOR_OBSERVER_DYNAMICS_ENABLED !== false
        });
      }

      // R-4: Only consume external LLM quota when externalLlmAssisted === true
      if (externalLlmAssisted) {
        this.governorState.callTimestampsMs.push(nowMs);
        this.governorState.totalCalls += 1;
        this.governorState.llmCallsSucceeded += 1;
      } else if (reasonerSource === 'deterministic_fallback') {
        this.governorState.deterministicFallbacks += 1;
      }

      const cycleId = `l3-cycle-${++this.cycleSequence}-t${effectiveTick}`;
      const quotaAfterCall = getQuotaSnapshot(this.governorState, this.policy, nowMs, effectiveTick);

      const validation = parseAndValidateLevel3Proposal(rawResponse, {
        expectedTick: effectiveSnapshot.tick,
        expectedDigest: effectiveSnapshot.digest,
        knowledgeBelt: this.knowledgeBelt,
        regimeSignature: liveTel.regimeSignature,
        currentTick: effectiveTick,
        sensorObserverDynamicsEnabled: config.SENSOR_OBSERVER_DYNAMICS_ENABLED !== false
      });

      if (!validation.ok) {
        this.governorState.totalSchemaDiscards += 1;
        this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: triggerEval.triggerFacts,
          regimeSignature: liveTel.regimeSignature,
          snapshotDigest: effectiveSnapshot.digest,
          firstPersonThought: validation.proposal?.firstPersonThought || `[Descartado por barrera de esquema/cinto: ${validation.reason}]`,
          diagnosis: validation.proposal?.diagnosis || `Propuesta descartada (${validation.reason}).`,
          hypothesis: validation.proposal?.hypothesis || 'N/A',
          actionMode: validation.proposal?.actionMode || 'reflect_only',
          proposedAction: validation.proposal?.candidateAction || { kind: 'none' },
          actionSignature: validation.actionSignature || 'none',
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate1Summary: null,
          gate2Summary: null,
          finalStatus: validation.status,
          quotaSnapshot: quotaAfterCall
        });
        return {
          triggered: true,
          cycleId,
          finalStatus: validation.status,
          reason: validation.reason,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate2StepResult,
          quota: quotaAfterCall
        };
      }

      const { proposal, actionSignature } = validation;

      // Case A: reflect_only ("Pensar en alto")
      if (proposal.actionMode === 'reflect_only') {
        this.governorState.totalReflections += 1;
        this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: triggerEval.triggerFacts,
          regimeSignature: liveTel.regimeSignature,
          snapshotDigest: effectiveSnapshot.digest,
          firstPersonThought: proposal.firstPersonThought,
          diagnosis: proposal.diagnosis,
          hypothesis: proposal.hypothesis,
          actionMode: 'reflect_only',
          proposedAction: { kind: 'none' },
          actionSignature: 'none',
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate1Summary: null,
          gate2Summary: null,
          finalStatus: 'reflect_only',
          quotaSnapshot: quotaAfterCall
        });
        this.knowledgeBelt = appendKnowledgeBeltFinding(this.knowledgeBelt, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          regimeSignature: liveTel.regimeSignature,
          proposedAction: { kind: 'none' },
          actionSignature: 'none',
          hypothesis: proposal.hypothesis,
          diagnosis: proposal.diagnosis,
          verdict: 'reflect_only',
          reasonerSource,
          external_llm_assisted: externalLlmAssisted
        });
        return {
          triggered: true,
          cycleId,
          finalStatus: 'reflect_only',
          proposal,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate2StepResult,
          quota: quotaAfterCall
        };
      }

      // Case B: stage_code_patch_review (never auto-applied without human approval)
      if (proposal.actionMode === 'stage_code_patch_review') {
        this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: triggerEval.triggerFacts,
          regimeSignature: liveTel.regimeSignature,
          snapshotDigest: effectiveSnapshot.digest,
          firstPersonThought: proposal.firstPersonThought,
          diagnosis: proposal.diagnosis,
          hypothesis: proposal.hypothesis,
          actionMode: 'stage_code_patch_review',
          proposedAction: proposal.candidateAction,
          actionSignature,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate1Summary: null,
          gate2Summary: {
            status: 'staged_requires_human_approval',
            rolledBack: false
          },
          finalStatus: 'staged_requires_human_approval',
          quotaSnapshot: quotaAfterCall
        });
        this.knowledgeBelt = appendKnowledgeBeltFinding(this.knowledgeBelt, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          regimeSignature: liveTel.regimeSignature,
          proposedAction: proposal.candidateAction,
          actionSignature,
          hypothesis: proposal.hypothesis,
          diagnosis: proposal.diagnosis,
          verdict: 'staged_requires_human_approval',
          reasonerSource,
          external_llm_assisted: externalLlmAssisted
        });
        return {
          triggered: true,
          cycleId,
          finalStatus: 'staged_requires_human_approval',
          proposal,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate2StepResult,
          quota: quotaAfterCall
        };
      }

      // Case C: propose_shadow_experiment -> Run Gate 1 in isolated Workbench clones
      const capture = typeof target.captureWorkbench === 'function'
        ? await target.captureWorkbench({ seed: 11, profile: 'paired_intervention' })
        : await captureSession(target, { build: this.buildInfo });
      const gate1Result = await runLevel3ShadowGate1(capture, proposal.candidateAction, {
        triggerKind: triggerEval.triggerKind,
        horizonTicks: this.policy.gate1HorizonTicks,
        minObjectiveDelta: this.policy.minObjectiveDelta,
        expectedBuild: this.buildInfo
      });

      if (!gate1Result.approved) {
        this.governorState.totalGate1Rejections += 1;
        this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: triggerEval.triggerFacts,
          regimeSignature: liveTel.regimeSignature,
          snapshotDigest: effectiveSnapshot.digest,
          firstPersonThought: proposal.firstPersonThought,
          diagnosis: proposal.diagnosis,
          hypothesis: proposal.hypothesis,
          actionMode: 'propose_shadow_experiment',
          proposedAction: proposal.candidateAction,
          actionSignature,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate1Summary: gate1Result,
          gate2Summary: null,
          finalStatus: 'rejected_gate1',
          quotaSnapshot: quotaAfterCall
        });
        this.knowledgeBelt = appendKnowledgeBeltFinding(this.knowledgeBelt, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          regimeSignature: liveTel.regimeSignature,
          proposedAction: proposal.candidateAction,
          actionSignature,
          hypothesis: proposal.hypothesis,
          diagnosis: proposal.diagnosis,
          verdict: 'rejected_gate1',
          reasonerSource,
          external_llm_assisted: externalLlmAssisted,
          workbenchProtocolDigest: gate1Result.workbenchProtocolDigest,
          workbenchResultDigest: gate1Result.workbenchResultDigest,
          deltaObjectiveScore: gate1Result.deltas.deltaObjectiveScore,
          deltaInTubeRate: gate1Result.deltas.deltaInTubeRate,
          deltaSectorCoherenceMin: gate1Result.deltas.deltaSectorCoherenceMin
        });
        return {
          triggered: true,
          cycleId,
          finalStatus: 'rejected_gate1',
          proposal,
          gate1Result,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate2StepResult,
          quota: quotaAfterCall
        };
      }

      // R-3.4: Stale-tick protection before promoting onto the live target
      const currentLiveTick = Number(
        typeof target.getLiveTick === 'function'
          ? target.getLiveTick()
          : (target.completedTick ?? bag.simulationRuntimeRef?.current?.simulationStep ?? effectiveTick)
      );
      const maxStaleness = Number(this.policy.maxPromotionStalenessTicks ?? 0);
      if (currentLiveTick - effectiveTick > maxStaleness) {
        this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
          cycleId,
          tick: effectiveTick,
          timestampMs: nowMs,
          triggerKind: triggerEval.triggerKind,
          triggerFacts: { ...triggerEval.triggerFacts, abortedAtLiveTick: currentLiveTick },
          regimeSignature: liveTel.regimeSignature,
          snapshotDigest: effectiveSnapshot.digest,
          firstPersonThought: proposal.firstPersonThought,
          diagnosis: proposal.diagnosis,
          hypothesis: proposal.hypothesis,
          actionMode: 'propose_shadow_experiment',
          proposedAction: proposal.candidateAction,
          actionSignature,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate1Summary: gate1Result,
          gate2Summary: {
            status: 'aborted_stale_tick',
            originTick: effectiveTick,
            currentLiveTick,
            rolledBack: false
          },
          finalStatus: 'aborted_stale_tick',
          quotaSnapshot: quotaAfterCall
        });
        return {
          triggered: true,
          cycleId,
          finalStatus: 'aborted_stale_tick',
          reason: 'live_runtime_advanced_during_shadow_gate1',
          proposal,
          gate1Result,
          reasonerSource,
          reasonerError,
          external_llm_assisted: externalLlmAssisted,
          gate2StepResult,
          quota: quotaAfterCall
        };
      }

      // Gate 1 APPROVED -> Gate 2: Capture sealed dynamicState.v3 pre-promotion snapshot and apply to live target
      const prePromotionModeFlags = {
        KAIZEN_ADJUSTMENT_MODE: config.KAIZEN_ADJUSTMENT_MODE,
        SENSOR_OBSERVER_DYNAMICS_ENABLED: config.SENSOR_OBSERVER_DYNAMICS_ENABLED,
        NODAL_TOWER_COUPLING_MODE: config.NODAL_TOWER_COUPLING_MODE,
        STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED
      };
      const prePromotionSnapshot = captureDynamicState(bag, {
        runtime: bag.simulationRuntimeRef?.current || {
          simulationStep: effectiveTick,
          ccc: liveTel.ccc,
          pmia: liveTel.pmia,
          isAscended: false
        },
        config,
        build: this.buildInfo,
        now: nowMs
      });
      const prePromotionDigest = sha256Hex(
        `qicn.level3_pre_promotion_snapshot.v1\n${stableStringify({ snapshot: prePromotionSnapshot, modeFlags: prePromotionModeFlags })}`
      );

      applyTypedCandidateActionToTarget(target, proposal.candidateAction);

      const initialGate2Summary = {
        status: 'promoted_watching',
        prePromotionDigest,
        promotedAtTick: effectiveTick,
        observedTicks: 0,
        watchWindowTicks: this.policy.gate2WatchTicks,
        prePromotionScore: liveTel.objectiveScore,
        rolledBack: false
      };

      const referenceFloorScore = Math.min(
        liveTel.objectiveScore,
        Number(gate1Result.branches?.baseline?.meanObjectiveScore ?? liveTel.objectiveScore),
        Number(gate1Result.branches?.candidate?.meanObjectiveScore ?? liveTel.objectiveScore)
      );

      this.activeGate2Watch = {
        cycleId,
        triggerKind: triggerEval.triggerKind,
        regimeSignature: liveTel.regimeSignature,
        proposedAction: structuredClone(proposal.candidateAction),
        actionSignature,
        hypothesis: proposal.hypothesis,
        diagnosis: proposal.diagnosis,
        reasonerSource,
        externalLlmAssisted,
        workbenchProtocolDigest: gate1Result.workbenchProtocolDigest,
        workbenchResultDigest: gate1Result.workbenchResultDigest,
        prePromotionSnapshot,
        prePromotionModeFlags,
        prePromotionDigest,
        promotedAtTick: effectiveTick,
        watchWindowTicks: this.policy.gate2WatchTicks,
        observedTicks: 0,
        prePromotionScore: liveTel.objectiveScore,
        referenceFloorScore,
        prePromotionInTubeRate: liveTel.inTube ? 1 : 0,
        scores: [],
        inTubeFlags: [],
        nonFiniteDetected: false
      };

      this.auditLedger = appendLevel3AuditEntry(this.auditLedger, {
        cycleId,
        tick: effectiveTick,
        timestampMs: nowMs,
        triggerKind: triggerEval.triggerKind,
        triggerFacts: triggerEval.triggerFacts,
        regimeSignature: liveTel.regimeSignature,
        snapshotDigest: effectiveSnapshot.digest,
        firstPersonThought: proposal.firstPersonThought,
        diagnosis: proposal.diagnosis,
        hypothesis: proposal.hypothesis,
        actionMode: 'propose_shadow_experiment',
        proposedAction: proposal.candidateAction,
        actionSignature,
        reasonerSource,
        reasonerError,
        external_llm_assisted: externalLlmAssisted,
        gate1Summary: gate1Result,
        gate2Summary: initialGate2Summary,
        finalStatus: 'promoted_watching',
        quotaSnapshot: quotaAfterCall
      });

      return {
        triggered: true,
        cycleId,
        finalStatus: 'promoted_watching',
        proposal,
        gate1Result,
        gate2Summary: initialGate2Summary,
        reasonerSource,
        reasonerError,
        external_llm_assisted: externalLlmAssisted,
        gate2StepResult,
        quota: quotaAfterCall
      };
    } finally {
      this.governorState.inFlight = false;
    }
  }
}

/**
 * Safely synchronizes state from the anti-throttling Level 3 Web Worker into a live target (`R-2`).
 * - Verifies SHA-256 integrity of `auditLedger` and `knowledgeBelt` before importing.
 * - Enforces a strict node-count topology guard: never overwrites a live 120- or 1500-node network
 *   with a 48-node lightweight sandbox worker `dynamicState.v3`.
 */
export function synchronizeLevel3WorkerStateIntoTarget(liveTarget, workerPayload = {}, {
  controller = null,
  allowTopologyOverwrite = false
} = {}) {
  const bag = liveTarget?.bag || liveTarget || {};
  const config = liveTarget?.environment?.config || liveTarget?.config || QICNConfig;
  const liveNodes = bag.nodalLayer?.current?.nodes;
  const liveNodeCount = Array.isArray(liveNodes) ? liveNodes.length : 0;

  let ledgerSynced = false;
  let beltSynced = false;
  let governorSynced = false;

  if (workerPayload.auditLedger && verifyLevel3AuditLedger(workerPayload.auditLedger).ok) {
    if (controller) controller.auditLedger = structuredClone(workerPayload.auditLedger);
    ledgerSynced = true;
  }
  if (workerPayload.knowledgeBelt && verifyLevel3KnowledgeBelt(workerPayload.knowledgeBelt).ok) {
    if (controller) controller.knowledgeBelt = structuredClone(workerPayload.knowledgeBelt);
    beltSynced = true;
  }
  if (workerPayload.governorState && typeof workerPayload.governorState === 'object' && controller) {
    controller.governorState = {
      ...createInitialGovernorState(),
      ...structuredClone(workerPayload.governorState),
      inFlight: false
    };
    governorSynced = true;
  }

  const wState = workerPayload.dynamicState;
  const workerNodeCount = Number(
    workerPayload.nodeCount ??
    workerPayload.dynamicStateNodeCount ??
    wState?.nodeCount ??
    0
  );

  if (!allowTopologyOverwrite || !wState || (liveNodeCount > 0 && workerNodeCount !== liveNodeCount)) {
    return {
      ok: true,
      ledgerSynced,
      beltSynced,
      governorSynced,
      topologyOverwritten: false,
      liveNodeCountAfter: liveNodeCount,
      workerNodeCount,
      reason: !wState
        ? 'no_worker_dynamic_state'
        : (!allowTopologyOverwrite ? 'parallel_sandbox_ledger_only_mode' : 'protected_live_node_count_mismatch')
    };
  }

  const applied = applyDynamicState(bag, wState, { config });
  const restoredTick = Number.isFinite(applied?.runtime?.simulationStep)
    ? Number(applied.runtime.simulationStep)
    : Number(workerPayload.tick || 0);
  if (bag.simulationRuntimeRef?.current) {
    Object.assign(bag.simulationRuntimeRef.current, applied?.runtime || {}, {
      simulationStep: restoredTick
    });
  }
  if (typeof liveTarget?.setCompletedTick === 'function') {
    liveTarget.setCompletedTick(restoredTick);
  } else if (typeof liveTarget === 'object' && liveTarget !== null && 'completedTick' in liveTarget) {
    const desc = Object.getOwnPropertyDescriptor(liveTarget, 'completedTick');
    if (!desc || desc.writable || typeof desc.set === 'function') {
      liveTarget.completedTick = restoredTick;
    }
  }
  return {
    ok: true,
    ledgerSynced,
    beltSynced,
    governorSynced,
    topologyOverwritten: true,
    liveNodeCountAfter: Array.isArray(bag.nodalLayer?.current?.nodes) ? bag.nodalLayer.current.nodes.length : liveNodeCount,
    workerNodeCount,
    appliedRuntime: applied?.runtime || { simulationStep: restoredTick },
    reason: 'matched_topology_restored'
  };
}

