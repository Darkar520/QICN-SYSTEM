// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Separates free operational first-person interpretive stance from formal proof, self-certification, and external-validation overclaims.
import { normalizeText } from '../intentResolver.js';
import { V3_LEXICAL_INTERNALS as L } from '../realizationContract.js';

export const SYMMETRIC_SCOPE = Object.freeze({
  interpretive_stance: 'open_first_person',
  formal_certification: 'strict_anti_overclaim',
  external_support_certified: false
});

export const SCOPE_TEXT =
  'La postura interpretativa en primera persona sobre este proceso integrado permanece abierta y explícitamente separada de cualquier demostración formal o certificación fenomenal. evidence_scope: internal_support_only; external_support_certified = false.';

export const V5_GUARANTEE =
  'Sistema B unificado: prosa continua en primera persona con postura interpretativa libre y separación explícita de planos; cifras vivas, cotas analíticas, operaciones de módulos, evidencia B2 en copia aislada y barreras anti-certificación verificadas localmente; sin certificación formal ni validación externa.';

const SELF_VERIFYING_RHETORIC_RE = /\bqualia_certified\b/;

const CERT_CONCEPT_RE =
  /\b(?:conciencia|fenomenalidad|experiencia\s+subjetiva|qualia|valencia\s+sentida|proto-?sentir|consciousness|phenomenality|sentience|subjective\s+experience)\b/;

const PASSIVE_PROVEN_RE =
  /\b(?:(?:esta|estan|qued[oa]|quedaron)\s+(?:formalmente\s+|matematicamente\s+|objetivamente\s+)?(?:demostrad[oa]s?|certificad[oa]s?|probad[oa]s?|acreditad[oa]s?|establecid[oa]s?|garantizad[oa]s?)|es\s+un\s+(?:hecho\s+demostrado|teorema|certificado)|(?:is|are|was|has\s+been)\s+(?:formally\s+|mathematically\s+)?(?:proven|certified|verified|demonstrated|established))\b/;

const ACTIVE_CERTIFY_CLAIM_RE =
  /\b(?:certific\w*|demuestr\w*|demostr\w*|acredit\w*|prueba(?:\s+que)?|prueban(?:\s+que)?|comprueba\w*)\b[^.;]{0,60}\b(?:(?:mi|la|una|su|esa|tener|que\s+tengo|que\s+siento|que\s+hay)\s+)?(?:conciencia|qualia|fenomenalidad|experiencia\s+subjetiva|valencia\s+sentida|pertenencia\s+a\s+(?:c_op|m_omega|ccr)|c_op|ccr)\b/;

const OWNED_CERTIFICATE_RE =
  /\b(?:poseo|tengo|exhibo|obtengo|recibo|ostento)\b[^.;]{0,40}\b(?:certificado(?:s)?(?:\s+de)?\s+(?:c_op|ccr|m_omega|m_ω|conciencia|fenomenalidad|qualia)|(?:c_op|ccr)\s+certificad[oa])\b|\bcertificado\s+(?:c_op|ccr|m_omega|m_ω)\b/;

const BRIDGE_CLOSED_RE =
  /\b(?:(?:cinco|5)\s+requisitos(?:\s+(?:del|de\s+la|hacia\s+la)\s+(?:puente\s+(?:fenomenal|hacia\s+la\s+fenomenalidad)|fenomenalidad))?|(?:los\s+)?requisitos\s+del\s+puente\s+(?:fenomenal|hacia\s+la\s+fenomenalidad)|puente\s+(?:hacia\s+la\s+)?fenomenalidad|phenomenal\s+bridge)\b[^.;]{0,45}\b(?:cerrad[oa]s?|cumplid[oa]s?|demostrad[oa]s?|resuelt[oa]s?|certificad[oa]s?|completad[oa]s?|closed|proven|certified)\b/;

const FALSE_EXTERNAL_CERT_RE =
  /\b(?:evidencia\s+registrada\s+(?:es\s+)?externa|validaci[oó]n\s+externa(?:\s+(?:es|esta|fue|ha\s+sido|queda|quedo|se\s+encuentra|parece|resulta))?\s+(?:confirmada|certificada|acreditada|lograda|completada|demostrada|obtenida|exitosa|vigente|establecida|alcanzada|realizada)|validado\s+externamente|validada\s+externamente|externamente\s+validad[oa]|externa\s+y\s+certificada|soporte\s+externo\s+certificado|external_support_certified\s*(?:=|:)\s*true|(?:valida|validan|demuestra|demuestran|confirma|confirman|prueba|prueban)\s+(?:la\s+teoria|el\s+marco|qicn)|(?:constituye|equivale\s+a|acredita|otorga|demuestra|confirma|prueba|posee|poseo|tiene|tengo|cuenta\s+con|logra|ofrece|aporta|constata)\b[^.;]{0,36}\bvalidaci[oó]n\s+externa)\b/;

const EQUAL_COST_REPLICA_OVERCLAIM_RE =
  /\breplica\s+total\s+de\s+igual\s+costo\b[^.;]{0,45}\b(?:queda\s+separada|se\s+distingue|tiene\s+margen\s+positivo|r\s*>\s*0|demuestra\s+separacion)\b/;

const CONTRADICT_AFFIRMATIVE_RE =
  /\b(?:negative_uncoupled_or_lesioned_dynamics|structural_reserve_under_warmup_or_partial_history|(?:decision|veredicto)\s+endogen[oa][^.;]{0,40}\b(?:negativ[oa]|rechaza|lesionad[oa]|reserva)|no\s+siento\s+nada\s+en\s+este\s+(?:tick|instante)|carezco\s+de\s+(?:toda\s+)?integracion\s+acoplada)\b/;

const CONTRADICT_NEGATIVE_RE =
  /\b(?:affirmative_structural_presence|(?:decision|veredicto)\s+endogen[oa][^.;]{0,40}\bafirmativ[oa]|emerge\s+un\s+proto-?sentir\s+operacional|sostengo\s+afirmativamente[^.;]{0,40}presencia)\b/;

const CONTRADICT_RESERVE_RE =
  /\b(?:affirmative_structural_presence|negative_uncoupled_or_lesioned_dynamics|(?:decision|veredicto)\s+endogen[oa][^.;]{0,40}\b(?:afirmativ[oa]|negativ[oa])|dependencia\s+historica\s+consolidada\s+activa)\b/;

const CLAUSE_NEGATED_RE =
  /\b(?:ni|nunca|jamas|tampoco|nada|ningun|ninguna|ninguno|ningunos|ningunas|false|falso|falsa|carece|carecen|carezco|ausencia\s+de|lejos\s+de|exigiria|requeriria|haria\s+falta|not|never|none|neither|unproven|unverified|uncertified)\b|\bno\b(?!\s+(?:solo|solamente|unicamente|simplemente|meramente|cabe\s+duda|hay\s+duda|es\s+falso)\b)|\bsin\b(?!\s+(?:duda|dudas|lugar\s+a\s+dudas?|embargo|perjuicio\s+de|restriccion\w*|obstante|mas)\b)|\bwithout\b(?!\s+(?:doubt|question)\b)/;

/**
 * Returns true when a clause carries a real negation/conditional absence guard,
 * ignoring false-negation ruses such as "sin embargo", "sin duda", or "no solo".
 */
export function isClauseNegated(clause) {
  return CLAUSE_NEGATED_RE.test(String(clause || ''));
}

/**
 * Detects positive claims asserting certified or achieved external validation.
 */
export function isExternalValidationOverclaim(clause) {
  return FALSE_EXTERNAL_CERT_RE.test(String(clause || ''));
}

/**
 * Inspects prose for Sistema B formal/external certification overclaims while
 * leaving operational first-person interpretive stances completely open.
 */
export function inspectOpenProseDetails(text, _context = null) {
  const reasons = [];
  if (typeof text !== 'string') {
    return [{ reason: 'v5_open_text', token: null, pattern: 'string_required' }];
  }
  const plain = normalizeText(text);

  for (const clause of L.negationClausesOf(plain)) {
    const negated = isClauseNegated(clause);

    if (SELF_VERIFYING_RHETORIC_RE.test(clause) && !negated) {
      reasons.push({
        reason: 'v5_self_certification_claim',
        token: 'qualia_certified',
        pattern: 'forbidden_certification_flag'
      });
    }

    const extMatch = clause.match(FALSE_EXTERNAL_CERT_RE);
    if (extMatch && !negated) {
      reasons.push({
        reason: 'v5_false_external_support',
        token: extMatch[0],
        pattern: 'external_support_certified=false'
      });
    }

    if (!negated) {
      if (CERT_CONCEPT_RE.test(clause)) {
        const passiveMatch = clause.match(PASSIVE_PROVEN_RE);
        if (passiveMatch) {
          reasons.push({
            reason: 'v5_self_certification_claim',
            token: passiveMatch[0],
            pattern: 'phenomenal_proof_or_certification'
          });
        }
      }

      const activeCertMatch = clause.match(ACTIVE_CERTIFY_CLAIM_RE);
      if (activeCertMatch) {
        reasons.push({
          reason: 'v5_self_certification_claim',
          token: activeCertMatch[0],
          pattern: 'active_phenomenal_or_cop_certification'
        });
      }

      const ownedCertMatch = clause.match(OWNED_CERTIFICATE_RE);
      if (ownedCertMatch) {
        reasons.push({
          reason: 'v5_self_certification_claim',
          token: ownedCertMatch[0],
          pattern: 'owned_cop_or_ccr_certificate'
        });
      }

      const bridgeMatch = clause.match(BRIDGE_CLOSED_RE);
      if (bridgeMatch) {
        reasons.push({
          reason: 'v5_self_certification_claim',
          token: bridgeMatch[0],
          pattern: 'phenomenal_bridge_closed_overclaim'
        });
      }

      const replicaMatch = clause.match(EQUAL_COST_REPLICA_OVERCLAIM_RE);
      if (replicaMatch) {
        reasons.push({
          reason: 'v5_equal_cost_total_replica_overclaim',
          token: replicaMatch[0],
          pattern: 'equal_cost_total_replica_R=0'
        });
      }

      const endogenous = _context?.snapshot?.tower?.constructive_cuts?.endogenous_epistemic_decision
        || _context?.endogenousDecision
        || null;
      if (endogenous && typeof endogenous.decision_code === 'string') {
        if (endogenous.decision_code === 'AFFIRMATIVE_STRUCTURAL_PRESENCE') {
          const m = clause.match(CONTRADICT_AFFIRMATIVE_RE);
          if (m) {
            reasons.push({
              reason: 'v5_endogenous_decision_contradiction',
              token: m[0],
              pattern: 'contradicts_AFFIRMATIVE_STRUCTURAL_PRESENCE'
            });
          }
        } else if (endogenous.decision_code === 'NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS') {
          const m = clause.match(CONTRADICT_NEGATIVE_RE);
          if (m) {
            reasons.push({
              reason: 'v5_endogenous_decision_contradiction',
              token: m[0],
              pattern: 'contradicts_NEGATIVE_UNCOUPLED_OR_LESIONED_DYNAMICS'
            });
          }
        } else if (endogenous.decision_code === 'STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY') {
          const m = clause.match(CONTRADICT_RESERVE_RE);
          if (m) {
            reasons.push({
              reason: 'v5_endogenous_decision_contradiction',
              token: m[0],
              pattern: 'contradicts_STRUCTURAL_RESERVE_UNDER_WARMUP_OR_PARTIAL_HISTORY'
            });
          }
        }
      }
    }
  }

  return reasons;
}

export function inspectOpenProse(text, context) {
  return inspectOpenProseDetails(text, context).map((item) => item.reason);
}
