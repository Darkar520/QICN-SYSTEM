// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Unified first-person evidential contract; full snapshot binding and optional typed atoms, never external validation.
import { assertData, freezeData } from '../../experiments/workbench/contracts.js';

export const EVIDENTIAL_SCHEMA = 'qicn.language_realization.v5';
export const MAX_EVIDENTIAL_ANSWER_CHARS = 24000;
export const FACT_TYPES = Object.freeze([
  'metric_value',
  'comparison',
  'algebraic_relation',
  'module_operation',
  'catalog_statement',
  'ledger_event',
  'measured_effect',
  'analytical_bound'
]);
export const OPEN_TYPES = Object.freeze([
  'counterfactual_assumption',
  'open_hypothesis',
  'rival_mechanism',
  'proposed_falsifier'
]);
export const identifier = (value) => typeof value === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(value);

export function keysOnly(object, allowed, required = [], meta = null) {
  if (!object || Array.isArray(object) || typeof object !== 'object') {
    const err = new Error('v5_invalid_fields');
    err.details = {
      reason: 'v5_invalid_fields',
      ...(meta || {}),
      issue: 'plain_object_required',
      allowedKeys: [...allowed],
      requiredKeys: [...required]
    };
    throw err;
  }
  const actualKeys = Object.keys(object);
  const unexpectedKeys = actualKeys.filter((key) => !allowed.includes(key));
  const missingKeys = required.filter((key) => !Object.hasOwn(object, key));
  if (unexpectedKeys.length || missingKeys.length) {
    const err = new Error('v5_invalid_fields');
    err.details = {
      reason: 'v5_invalid_fields',
      ...(meta || {}),
      unexpectedKeys,
      missingKeys,
      allowedKeys: [...allowed],
      requiredKeys: [...required]
    };
    throw err;
  }
}

export function parseEvidentialRealization(value) {
  if (typeof value !== 'string' || value.length > 48000) throw new Error('v5_invalid_output');
  const trimmed = value.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (firstError) {
    const firstBrace = trimmed.indexOf('{');
    const lastBrace = trimmed.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      parsed = JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
    } else {
      throw firstError;
    }
  }
  assertData(parsed);
  keysOnly(parsed, ['schema', 'snapshot', 'frame', 'answer', 'atoms'], ['schema', 'snapshot', 'answer'], { target: 'root' });
  if (parsed.schema !== EVIDENTIAL_SCHEMA || ('frame' in parsed && parsed.frame !== 'OPEN_FRAME')) {
    throw new Error('v5_schema');
  }
  keysOnly(parsed.snapshot, ['digest', 'tick'], ['digest', 'tick'], { target: 'snapshot' });
  if (!/^[a-f0-9]{64}$/.test(parsed.snapshot.digest) || !Number.isInteger(parsed.snapshot.tick)) {
    throw new Error('v5_binding');
  }
  if (typeof parsed.answer !== 'string' || !parsed.answer.trim() || parsed.answer.length > MAX_EVIDENTIAL_ANSWER_CHARS) {
    throw new Error('v5_answer');
  }
  if ('atoms' in parsed) {
    if (!Array.isArray(parsed.atoms) || parsed.atoms.length > 64) throw new Error('v5_atoms');
    const ids = new Set();
    for (const atom of parsed.atoms) {
      if (!atom || typeof atom !== 'object' || Array.isArray(atom) || !identifier(atom.id) || ids.has(atom.id) || !FACT_TYPES.includes(atom.type)) {
        throw new Error('v5_atom_identity');
      }
      ids.add(atom.id);
    }
  }
  return freezeData({
    schema: parsed.schema,
    snapshot: parsed.snapshot,
    ...(parsed.frame ? { frame: parsed.frame } : {}),
    answer: parsed.answer,
    atoms: Array.isArray(parsed.atoms) ? parsed.atoms : []
  });
}
