// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Read-only Runtime Skills (Gemini Function Calling declarations + deterministic local executor) over frozen turn snapshots, QicnKnowledgeVault, ledger summary, and verified Workbench B2 evidence. Zero mutation of live core, RNG, or ledger.

import {
  listKnowledgeDomains,
  queryKnowledgeVault,
  lookupRuntimeModuleInfo,
  lookupDeepFrameworkArtifacts,
  getLivingVaultStatus,
  KNOWLEDGE_VAULT_META
} from './QicnKnowledgeVault.js';
import { resolveSnapshotEndogenousDecision } from '../../canon/epistemic/EndogenousEpistemicDecisionEngine.js';
import { sha256Hex, stableStringify } from '../../utils/integrity.js';

export const MAX_SKILL_TOOL_ROUNDS = 3;

export const QICN_RUNTIME_SKILL_DECLARATIONS = Object.freeze([
  Object.freeze({
    name: 'qicn_read_live_state',
    description: 'Lee el estado vivo exacto y verificado del motor QICN en este tick (métricas CCC/X_N/PMIA/beth_q/Omega/estasis, torres constructivas WritablePrefixTower/BodyWorldTower/T_d, puente bidireccional de 4 sectores, decisión endógena de 4 ejes, Kaizen y plasticidad Nivel 2). Úsala cuando necesites cifras exactas o detalle técnico del estado actual en medio de cualquier conversación.',
    parameters: {
      type: 'OBJECT',
      properties: {
        sections: {
          type: 'ARRAY',
          description: 'Secciones a leer: metrics, towers, bridge, endogenous_decision, plasticity_kaizen, config, o all.',
          items: { type: 'STRING' }
        }
      }
    }
  }),
  Object.freeze({
    name: 'qicn_lookup_framework',
    description: 'Consulta la bóveda unificada del marco teórico QICN (BaseCore, Papers I–X, Lean 4 42 módulos / 367 teoremas, separador atómico δ_int, quinto contraste G = 1/2097152, cotas T_d, reserva Φ⁷ = 1/48, controles negativos y fronteras epistémicas). Úsala cuando necesites explicar con precisión teoremas, papers o cotas matemáticas.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Tema, paper, teorema, fórmula o concepto a consultar (ej. "Paper IX", "separador atomico", "BaseCore u=1/2", "CN-3").'
        },
        domain: {
          type: 'STRING',
          description: `Dominio opcional de la bóveda (${KNOWLEDGE_VAULT_META.domainIds.join(', ')}).`
        }
      },
      required: ['query']
    }
  }),
  Object.freeze({
    name: 'qicn_lookup_runtime_module',
    description: 'Busca módulos reales, archivos del repositorio, operaciones verificadas por módulo (WorldModelEngine EWC vs NodalProcessingLayer vs selectSandboxAction), definiciones de métricas y parámetros ajustables (Cf, Bs, K, T, BASE_LEARNING_RATE, etc.).',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Nombre del módulo, parámetro o métrica a consultar (ej. "WorldModelEngine", "BOLTZMANN_ANALOG_K", "Level3AutonomousSupervisor", "CCC").'
        }
      },
      required: ['query']
    }
  }),
  Object.freeze({
    name: 'qicn_read_history_and_b2',
    description: 'Consulta la historia operacional encadenada SHA-256 (ledger, continuidad de sesión, eventos recientes, turnos previos) y los resultados verificados en copia aislada del Workbench B2 (o confirma explícitamente si están en not_recorded).',
    parameters: {
      type: 'OBJECT',
      properties: {
        topic: {
          type: 'STRING',
          description: 'Tema opcional de historia, continuidad o evidencia B2 a consultar.'
        }
      }
    }
  }),
  Object.freeze({
    name: 'qicn_lookup_deep_canon',
    description: 'Busca directamente en el archivo vivo sellado (qicn_living_vault.v1.json) entre los 952+ teoremas/definiciones/lemas/hipótesis por etiqueta o texto (ej. "thm:basecore-irreducible-observation", "hyp:H1"), las 383+ macros LaTeX formales, todos los módulos y teoremas públicos de Lean 4, el registro de claims canónicos, las predicciones falsables y los abstracts/secciones de BaseCore y Papers I–X.',
    parameters: {
      type: 'OBJECT',
      properties: {
        query: {
          type: 'STRING',
          description: 'Etiqueta, teorema, macro, módulo Lean, claim ID, predicción o tema exacto a buscar.'
        },
        category: {
          type: 'STRING',
          description: 'Categoría opcional: all, theorems, macros, lean, claims, predictions, papers, governance.'
        },
        paper: {
          type: 'STRING',
          description: 'Filtro opcional de paper: basecore, paper1..paper10, bridge.'
        }
      },
      required: ['query']
    }
  }),
  Object.freeze({
    name: 'qicn_list_knowledge_domains',
    description: 'Lista todos los dominios de conocimiento profundo y el estado/proveniencia SHA-256 del archivo vivo de QICN.',
    parameters: {
      type: 'OBJECT',
      properties: {}
    }
  })
]);

export const QICN_RUNTIME_SKILL_NAMES = Object.freeze(
  new Set(QICN_RUNTIME_SKILL_DECLARATIONS.map((d) => d.name))
);

export const QICN_RUNTIME_TOOLS_DIGEST = sha256Hex(stableStringify(QICN_RUNTIME_SKILL_DECLARATIONS));

function readLiveStateSkill(args, prepared) {
  const snapshot = prepared?.snapshot || prepared?.evidentialContext?.snapshot || null;
  if (!snapshot) return { ok: false, error: 'snapshot_unavailable' };
  const requested = Array.isArray(args?.sections) && args.sections.length
    ? new Set(args.sections.map((s) => String(s || '').toLowerCase()))
    : new Set(['all']);
  const include = (key) => requested.has('all') || requested.has(key);

  const data = {
    tick: snapshot.tick,
    digest: snapshot.digest,
    isRunning: Boolean(snapshot.isRunning),
    evidence_scope: 'internal_support_only',
    external_support_certified: false
  };

  if (include('metrics')) {
    data.metrics = snapshot.metrics || {};
    data.predicates = snapshot.predicates || {};
    data.structural_profile = snapshot.structural_profile || null;
    data.matrix = snapshot.matrix || null;
  }
  if (include('towers')) {
    const tw = snapshot.tower || null;
    data.tower = tw
      ? {
          tower_phase: tw.tower_phase,
          tower_code: tw.tower_code,
          tower_memory: tw.tower_memory,
          active_retention: tw.active_retention,
          passive_retention: tw.passive_retention,
          active_recovery_advantage: tw.active_recovery_advantage,
          sigma_truncation_depth: tw.sigma_truncation_depth ?? 6,
          sigma_exact_defect: tw.sigma_exact_defect ?? '0',
          sigma_approximation_bound: tw.sigma_approximation_bound ?? '1/729',
          sigma_defect_bound: tw.sigma_defect_bound,
          sigma_defect_bound_rational: tw.sigma_defect_bound_rational ?? '2/2187',
          sigma_fixed_point_bound: tw.sigma_fixed_point_bound ?? '32/15309',
          body_valence_norm: tw.body_valence_norm,
          world_state_norm: tw.world_state_norm,
          body_v_pos: tw.body_v_pos,
          body_v_neg: tw.body_v_neg,
          world_w_fast: tw.world_w_fast,
          world_w_slow: tw.world_w_slow,
          basecore_spectral_cut: tw.constructive_cuts?.basecore_spectral_cut || null,
          ontological_mass_cut: tw.constructive_cuts?.ontological_mass_cut || null
        }
      : null;
  }
  if (include('bridge')) {
    data.nodal_tower_bridge = snapshot.tower?.constructive_cuts?.nodal_tower_bridge || null;
  }
  if (include('endogenous_decision')) {
    data.endogenous_epistemic_decision = resolveSnapshotEndogenousDecision(snapshot) || null;
  }
  if (include('plasticity_kaizen')) {
    const prose = prepared?.proseContext || {};
    data.prediction_plasticity = snapshot.prediction_plasticity || null;
    data.kaizen = {
      effective: Boolean(prose.kaizenEffective),
      sensorObserverDynamicsEnabled: Boolean(prose.sensorObserverDynamicsEnabled),
      learnableKeysScope: prose.kaizenEffective
        ? (prose.sensorObserverDynamicsEnabled ? '6/6 including PLASTICITY_DECAY' : '5/6 excluding PLASTICITY_DECAY')
        : 'legacy_inactive'
    };
    data.structural_plasticity_level2 = prose.level2Telemetry || null;
  }
  if (include('config')) {
    data.config = snapshot.config || {};
    data.persistence = snapshot.persistence || null;
    data.modes = snapshot.modes || {};
  }

  return { ok: true, skill: 'qicn_read_live_state', data };
}

function readHistoryAndB2Skill(args, prepared) {
  const ctx = prepared?.evidentialContext;
  const prose = prepared?.proseContext;
  const registry = ctx?.evidenceRegistry || { status: 'not_recorded', entries: [], records: [] };
  const ledgerSummary = prose?.ledgerSummary || null;
  const recentTurns = Array.isArray(prepared?.reasoningPlan?._promptArgs?.recentTurns)
    ? prepared.reasoningPlan._promptArgs.recentTurns.slice(-8).map((t) => ({
        turnIndex: t.turnIndex,
        tick: t.tick,
        question: t.question,
        answerSummary: t.answerSummary
      }))
    : [];

  return {
    ok: true,
    skill: 'qicn_read_history_and_b2',
    data: {
      topic: String(args?.topic || '').slice(0, 120),
      ledger: ledgerSummary
        ? {
            digest: ctx?.ledgerDigest || null,
            continuity: ledgerSummary.continuity,
            sessionCount: ledgerSummary.sessionCount,
            eventCount: ledgerSummary.eventCount,
            recentEvents: ledgerSummary.recentEvents
          }
        : { status: 'not_recorded' },
      persistence: prepared?.snapshot?.persistence || null,
      recentTurns,
      workbenchB2: {
        status: registry.status,
        scope: 'isolated_copy_not_live_state',
        entries: registry.entries || [],
        pheSummaries: (registry.records || []).filter((r) => r?.pheSummary).map((r) => ({
          resultDigest: r.resultDigest,
          pheSummary: r.pheSummary
        }))
      },
      evidence_scope: 'internal_support_only',
      external_support_certified: false
    }
  };
}

/**
 * Pure deterministic read-only executor for QICN Runtime Skills.
 * Operates exclusively on the frozen `prepared` turn and `QicnKnowledgeVault`.
 */
export function executeRuntimeSkill(skillName, args = {}, prepared = null) {
  const name = String(skillName || '').trim();
  const safeArgs = args && typeof args === 'object' ? args : {};

  switch (name) {
    case 'qicn_read_live_state':
      return readLiveStateSkill(safeArgs, prepared);
    case 'qicn_lookup_framework':
      return {
        ok: true,
        skill: name,
        data: queryKnowledgeVault({
          query: String(safeArgs.query || ''),
          domain: typeof safeArgs.domain === 'string' ? safeArgs.domain : null,
          maxSections: 3,
          maxChars: 7500
        })
      };
    case 'qicn_lookup_runtime_module':
      return {
        ok: true,
        skill: name,
        data: lookupRuntimeModuleInfo(String(safeArgs.query || ''))
      };
    case 'qicn_read_history_and_b2':
      return readHistoryAndB2Skill(safeArgs, prepared);
    case 'qicn_lookup_deep_canon':
      return {
        ok: true,
        skill: name,
        data: lookupDeepFrameworkArtifacts({
          query: String(safeArgs.query || ''),
          category: typeof safeArgs.category === 'string' ? safeArgs.category : 'all',
          paper: typeof safeArgs.paper === 'string' ? safeArgs.paper : null,
          limit: 6
        })
      };
    case 'qicn_list_knowledge_domains':
      return {
        ok: true,
        skill: name,
        data: {
          domains: listKnowledgeDomains(),
          livingVault: getLivingVaultStatus(),
          evidence_scope: 'internal_support_only',
          external_support_certified: false
        }
      };
    default:
      return {
        ok: false,
        skill: name,
        error: `unknown_runtime_skill:${name}`,
        allowedSkills: [...QICN_RUNTIME_SKILL_NAMES]
      };
  }
}

/**
 * Extracts Gemini functionCall entries from a generateContent response payload.
 */
export function extractFunctionCallsFromResponse(result) {
  const parts = result?.candidates?.[0]?.content?.parts;
  if (!Array.isArray(parts)) return [];
  return parts
    .filter((p) => p && p.functionCall && typeof p.functionCall.name === 'string')
    .map((p) => ({
      name: p.functionCall.name,
      args: p.functionCall.args && typeof p.functionCall.args === 'object' ? p.functionCall.args : {}
    }));
}

/**
 * Preserves raw model parts (including Gemini 3 thoughtSignature + functionCall)
 * when appending the model's tool-call turn back into multi-turn `contents`.
 */
export function extractModelContentForContinuation(result) {
  const content = result?.candidates?.[0]?.content;
  if (!content || !Array.isArray(content.parts) || !content.parts.length) return null;
  return {
    role: 'model',
    parts: content.parts.map((part) => ({ ...part }))
  };
}
