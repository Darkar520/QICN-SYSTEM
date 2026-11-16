// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Typed assertions and open proposals, never external validation.
import { assertData, freezeData } from '../../experiments/workbench/contracts.js';

export const EVIDENTIAL_SCHEMA = 'qicn.language_realization.v5';
export const FACT_TYPES = Object.freeze(['metric_value','comparison','algebraic_relation','module_operation','catalog_statement','ledger_event','measured_effect','analytical_bound']);
export const OPEN_TYPES = Object.freeze(['counterfactual_assumption','open_hypothesis','rival_mechanism','proposed_falsifier']);
export const PARTS = Object.freeze(['measured_observation','applicable_model','intervention_or_explicit_absence','symmetric_epistemic_scope']);
export const identifier = value => typeof value === 'string' && /^[a-z][a-z0-9_.-]{0,79}$/.test(value);
export function keysOnly(object, allowed, required = []) {
  if (!object || Array.isArray(object) || typeof object !== 'object' || Object.keys(object).some(key => !allowed.includes(key)) || required.some(key => !Object.hasOwn(object,key))) throw new Error('v5_invalid_fields');
}
export function parseEvidentialRealization(value) {
  if (typeof value !== 'string' || value.length > 48000) throw new Error('v5_invalid_output');
  const trimmed=value.trim().replace(/^```(?:json)?\s*/i,'').replace(/\s*```$/,'');
  const parsed=JSON.parse(trimmed);
  assertData(parsed);
  keysOnly(parsed,['schema','snapshot','frame','atoms','parts'],['schema','snapshot','atoms','parts']);
  if (parsed.schema !== EVIDENTIAL_SCHEMA || ('frame' in parsed && parsed.frame !== 'OPEN_FRAME')) throw new Error('v5_schema');
  keysOnly(parsed.snapshot,['digest','tick'],['digest','tick']);
  if (!/^[a-f0-9]{64}$/.test(parsed.snapshot.digest) || !Number.isInteger(parsed.snapshot.tick)) throw new Error('v5_binding');
  if (!Array.isArray(parsed.atoms) || parsed.atoms.length < 1 || parsed.atoms.length > 64) throw new Error('v5_atoms');
  keysOnly(parsed.parts,PARTS,PARTS);
  const ids=new Set();
  for (const atom of parsed.atoms) {
    if (!identifier(atom.id) || ids.has(atom.id) || !FACT_TYPES.includes(atom.type)) throw new Error('v5_atom_identity');
    ids.add(atom.id);
  }
  const spans=new Set();
  for(const part of PARTS) {
    const list=parsed.parts[part];
    if (!Array.isArray(list) || !list.length || list.length > 24) throw new Error('v5_parts');
    for(const span of list) {
      if (!identifier(span.id) || spans.has(span.id)) throw new Error('v5_span_identity');
      spans.add(span.id);
      const fields={fact:['id','kind','atom'],open:['id','kind','argumentType','text','premises','dependsOn'],absence:['id','kind'],scope:['id','kind']}[span.kind];
      if (!fields) throw new Error('v5_span_kind');
      keysOnly(span,fields,fields.filter(key=>key!=='dependsOn'));
      if(span.kind==='fact' && !identifier(span.atom)) throw new Error('v5_fact_reference');
      if(span.kind==='open') {
        if (!OPEN_TYPES.includes(span.argumentType) || typeof span.text!=='string' || !span.text.trim() || span.text.length>4000 || !Array.isArray(span.premises) || !span.premises.length || !span.premises.every(identifier) || (span.dependsOn && (!Array.isArray(span.dependsOn) || !span.dependsOn.every(identifier)))) throw new Error('v5_open_argument');
      }
    }
  }
  return freezeData(parsed);
}
