// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Deterministic checks of source-bound atoms, not philosophical truth or external validation.
import { verifySnapshotDigest, verifySnapshotStructuralConsistency, SNAPSHOT_SCHEMA } from '../runtimeSnapshot.js';
import { evidentialMetricCatalog, EVIDENTIAL_BOUND_REFS } from '../propositions.js';
import { EVIDENTIAL_OPERATIONS, EVIDENTIAL_CATALOG } from '../definitionCatalog.js';
import { OperationalHistoryLedger } from '../../identity/OperationalHistoryLedger.js';
import { sha256Hex, stableStringify } from '../../utils/integrity.js';
import { freezeData, assertData } from '../../experiments/workbench/contracts.js';
import { createEvidenceRegistry, isEvidenceRegistry, lookupEffect } from './evidenceRegistry.js';
import { keysOnly, FACT_TYPES, identifier } from './claimGrammar.js';

const contexts=new WeakSet();
const equal=(a,b)=>stableStringify(a)===stableStringify(b);
const read=(snapshot,ref)=>{const [section,key]=String(ref).split('.');return snapshot[section]?.[key];};
const sign=value=>value>0?'positive':value<0?'negative':'zero';
// Compare the serialized decimal/rational values exactly. Analytical fractions
// must never be rounded into a measured zero or parsed through eval/parseFloat.
function rational(value) {
  if(typeof value!=='string' && !Number.isFinite(value))throw new Error('v5_non_numeric_value');
  const raw=String(value);
  if(raw.includes('/')) {
    if(!/^-?\d+\/\d+$/.test(raw))throw new Error('v5_invalid_rational');
    const [n,d]=raw.split('/').map(BigInt);if(d<=0n)throw new Error('v5_invalid_rational');return {n,d};
  }
  const m=/^(-?)(\d+)(?:\.(\d+))?(?:e([+-]?\d+))?$/i.exec(raw);
  if(!m)throw new Error('v5_non_numeric_value');
  const exponent=Number(m[4]||0)-(m[3]||'').length;
  let n=BigInt(m[2]+(m[3]||''))*(m[1]?-1n:1n),d=1n;
  if(exponent>=0)n*=10n**BigInt(exponent);else d=10n**BigInt(-exponent);
  return {n,d};
}
function compareValues(left,right) {
  const a=rational(left),b=rational(right),difference=a.n*b.d-b.n*a.d;
  return difference>0n?1:difference<0n?-1:0;
}
const relation=(target,left,right,op,tolerance)=>Object.freeze({target,left,right,op,tolerance});
export const ALGEBRAIC_RELATIONS=Object.freeze({
  body_balance:relation('structural_profile.body_net_balance','tower.body_v_pos','tower.body_v_neg','difference',2e-6),
  body_l1:relation('structural_profile.body_l1_norm','tower.body_v_pos','tower.body_v_neg','absolute_sum',2e-6),
  world_contrast:relation('structural_profile.world_temporal_contrast','tower.world_w_fast','tower.world_w_slow','difference',2e-6),
  ccc_xn:relation('structural_profile.ccc_xn_divergence','metrics.ccc','metrics.x_n','difference',2e-4),
  active_fraction:relation('structural_profile.active_node_fraction','metrics.active_nodes','metrics.total_nodes','ratio',2e-4)
});
function calculateRelation(snapshot,spec) {
  const left=read(snapshot,spec.left),right=read(snapshot,spec.right),actual=read(snapshot,spec.target);
  if(![left,right,actual].every(Number.isFinite) || (spec.op==='ratio' && right===0)) throw new Error('v5_relation_not_recorded');
  const expected=spec.op==='ratio'?left/right:spec.op==='absolute_sum'?Math.abs(left)+Math.abs(right):left-right;
  if(Math.abs(actual-expected)>spec.tolerance) throw new Error('v5_algebraic_inconsistency');
  return {left,right,actual,expected,tolerance:spec.tolerance};
}
export function createFactualContext({snapshot,ledgerRecord=null,evidenceRegistry=createEvidenceRegistry()} = {}) {
  if(!verifySnapshotDigest(snapshot) || snapshot.schema!==SNAPSHOT_SCHEMA || !/^[a-f0-9]{64}$/.test(snapshot.digest) || !Number.isInteger(snapshot.tick)) throw new Error('v5_snapshot_digest_or_tick');
  const structural=verifySnapshotStructuralConsistency(snapshot);
  if(!structural.ok) throw new Error('v5_snapshot_structure:'+structural.violations.join(','));
  if(snapshot.metrics?.tick!==snapshot.tick || sha256Hex(stableStringify(snapshot.config)).slice(0,16)!==snapshot.configHash) throw new Error('v5_snapshot_header');
  if(!Object.values(snapshot.metrics).every(Number.isFinite) || !Object.values(snapshot.config).every(Number.isFinite)) throw new Error('v5_nonfinite_snapshot');
  if(snapshot.structural_profile?.epistemic_boundary?.external_support_certified!==false) throw new Error('v5_snapshot_epistemic_boundary');
  if(!isEvidenceRegistry(evidenceRegistry)) throw new Error('v5_untrusted_registry');
  // Snapshot maps can have null prototypes. Detach their wire representation.
  const detached=JSON.parse(JSON.stringify(snapshot));assertData(detached);
  for(const spec of Object.values(ALGEBRAIC_RELATIONS)) if(read(detached,spec.target)!==null && read(detached,spec.target)!==undefined) calculateRelation(detached,spec);
  const precise=detached.predicates?.ccc_precise,threshold=detached.config.ASCENSION_THRESHOLD;
  if(Number.isFinite(detached.metrics.ccc) && Number.isFinite(threshold) && (!Number.isFinite(precise)||!['below','equal','above'].includes(detached.predicates?.ccc_vs_threshold)||detached.predicates.threshold_crossed!==(detached.predicates.ccc_vs_threshold!=='below'))) throw new Error('v5_threshold_predicate');
  if(Number.isFinite(precise) && Number.isFinite(threshold) && precise!==threshold) {
    if(detached.predicates.ccc_vs_threshold!==(precise>threshold?'above':'below')) throw new Error('v5_threshold_polarity');
  }
  let ledger=null,ledgerDigest=null;
  if(ledgerRecord!==null) {
    assertData(ledgerRecord); ledger=structuredClone(ledgerRecord);
    const verified=OperationalHistoryLedger.verify(ledger);
    if(!verified.ok) throw new Error('v5_ledger_invalid:'+verified.reason);
    ledgerDigest=sha256Hex(stableStringify(ledger));
  }
  const context=freezeData({snapshot:detached,metrics:evidentialMetricCatalog(detached),ledger,ledgerDigest,evidenceRegistry});
  contexts.add(context);return context;
}
export const isFactualContext=context=>contexts.has(context);
const atomFields={metric_value:['ref','asserted','sign'],analytical_bound:['ref','asserted'],comparison:['left','right','operator'],algebraic_relation:['relation','asserted'],module_operation:['module','operation','scope'],catalog_statement:['key','asserted'],ledger_event:['ledgerDigest','eventHash','eventTick','eventType'],measured_effect:['resultDigest','branchId','measure','asserted','sign']};
export function verifyFactualAtom(atom,context) {
  try {
    if(!isFactualContext(context)) throw new Error('v5_untrusted_context');
    assertData(atom);
    if(!identifier(atom.id) || !FACT_TYPES.includes(atom.type)) throw new Error('v5_atom_type');
    keysOnly(atom,['id','type','binding',...atomFields[atom.type]],['id','type','binding']);
    keysOnly(atom.binding,['digest','tick'],['digest','tick']);
    if(atom.binding.digest!==context.snapshot.digest || atom.binding.tick!==context.snapshot.tick) throw new Error('v5_fact_binding');
    const s=context.snapshot;let value,source,evidenceClass='artifact_only',text,provenance=null;
    if(['metric_value','analytical_bound'].includes(atom.type)) {
      if(!Object.hasOwn(context.metrics,atom.ref)) throw new Error('v5_unknown_metric');
      if(EVIDENTIAL_BOUND_REFS.includes(atom.ref)!==(atom.type==='analytical_bound')) throw new Error('v5_bound_is_not_measurement');
      value=read(s,atom.ref);const spec=context.metrics[atom.ref];source=spec.source;evidenceClass=spec.evidenceClass;
      if(typeof value==='string') {
        const [numerator,denominator=1n]=value.split('/').map(part=>BigInt(part));
        if(denominator<=0n || (atom.type==='analytical_bound'&&numerator<0n))throw new Error('v5_invalid_rational');
      } else if(atom.type==='analytical_bound'&&value<0)throw new Error('v5_invalid_bound');
      text=`${atom.type==='analytical_bound'?'Cota analítica superior (no error medido)':'Lectura de la captura'}: ${spec.label} = ${value} [${evidenceClass}], tick ${s.tick}.`;
    } else if(atom.type==='comparison') {
      if(!Object.hasOwn(context.metrics,atom.left)||!Object.hasOwn(context.metrics,atom.right))throw new Error('v5_unknown_metric');
      let a=read(s,atom.left),b=read(s,atom.right);
      if(!['<','>','=','<=','>=','!='].includes(atom.operator))throw new Error('v5_comparison_operand');
      let difference=compareValues(a,b);
      if(atom.left==='metrics.ccc' && ['metrics.ascension_threshold','config.ASCENSION_THRESHOLD'].includes(atom.right)) {
        difference={below:-1,equal:0,above:1}[s.predicates.ccc_vs_threshold];a=s.predicates.ccc_precise;b=s.config.ASCENSION_THRESHOLD;
      } else if(atom.right==='metrics.ccc' && ['metrics.ascension_threshold','config.ASCENSION_THRESHOLD'].includes(atom.left)) {
        difference=-({below:-1,equal:0,above:1}[s.predicates.ccc_vs_threshold]);a=s.config.ASCENSION_THRESHOLD;b=s.predicates.ccc_precise;
      }
      const passed={'<':difference<0,'>':difference>0,'=':difference===0,'<=':difference<=0,'>=':difference>=0,'!=':difference!==0}[atom.operator];
      if(!passed)throw new Error('v5_false_comparison');
      value=true;source=`${atom.left};${atom.right}`;evidenceClass='derived_proxy';text=`Comparación verificada en tick ${s.tick}: ${atom.left} ${atom.operator} ${atom.right} (valores ${a}, ${b}; CCC/umbral usa el predicado sin redondear; las referencias de cota siguen siendo cotas, no errores medidos).`;
    } else if(atom.type==='algebraic_relation') {
      const spec=ALGEBRAIC_RELATIONS[atom.relation];if(!spec)throw new Error('v5_unknown_relation');
      const result=calculateRelation(s,spec);value=result.actual;source=spec.target;evidenceClass='derived_proxy';
      text=`Relación ${atom.relation} en tick ${s.tick}: ${spec.target} = ${value}; operandos ${result.left}, ${result.right}, operación ${spec.op}, tolerancia de serialización ${spec.tolerance}.`;
    } else if(atom.type==='module_operation') {
      const operation=EVIDENTIAL_OPERATIONS.find(row=>row.module===atom.module && row.operation===atom.operation && row.scope===atom.scope);
      if(!operation)throw new Error('v5_module_operation_scope');
      value=operation.scope;source=operation.source; text=`${operation.module}: ${operation.description} (ámbito ${operation.scope}; ${operation.source}#${operation.anchor}). Disponibilidad del mecanismo, no efecto causal observado.`;
    } else if(atom.type==='catalog_statement') {
      const row=Object.hasOwn(EVIDENTIAL_CATALOG,atom.key)?EVIDENTIAL_CATALOG[atom.key]:null;if(!row)throw new Error('v5_catalog_not_closed');
      value=row.value;source=row.source;text=row.text;
    } else if(atom.type==='ledger_event') {
      if(!context.ledger || atom.ledgerDigest!==context.ledgerDigest)throw new Error('v5_ledger_binding');
      const row=[...(context.ledger.pinned||[]),...context.ledger.events].find(event=>event.hash===atom.eventHash);
      if(!row || row.tick!==atom.eventTick || row.type!==atom.eventType || (Number.isFinite(row.tick)&&row.tick>s.tick))throw new Error('v5_ledger_event');
      value=row.payload;source=`ledger:${context.ledgerDigest}`;provenance={eventHash:row.hash,eventTick:row.tick};
      text=`Evento registrado ${row.type}, tick ${row.tick}, hash ${row.hash}; payload citado literalmente: ${JSON.stringify(row.payload)}.`;
    } else {
      const effect=lookupEffect(context.evidenceRegistry,atom.resultDigest,atom.branchId,atom.measure);
      value=effect.value;source=`workbench:${atom.resultDigest}`;provenance=effect.entry;evidenceClass='derived_proxy';
      text=`En la copia aislada ${effect.entry.captureDigest}, ticks ${effect.entry.sourceTick+1}–${effect.entry.endTick}, rama ${atom.branchId} (${effect.entry.intervention}), ${atom.measure} = ${value} frente a sham. Registro interno ${atom.resultDigest}; no describe el estado vivo ni acredita soporte externo.`;
    }
    if('asserted' in atom && !equal(atom.asserted,value))throw new Error('v5_false_value');
    if('sign' in atom && atom.sign!==sign(compareValues(value,0)))throw new Error('v5_false_sign');
    const observationEligible=atom.type==='metric_value'&&typeof atom.ref==='string'&&!atom.ref.startsWith('config.')&&atom.ref!=='metrics.tick';
    const modelEligible=['module_operation','algebraic_relation'].includes(atom.type)||(atom.type==='catalog_statement'&&atom.key==='predictor_scope');
    return freezeData({ok:true,id:atom.id,type:atom.type,value,text,source,evidenceClass,provenance,observationEligible,modelEligible,binding:{...atom.binding},external_support_certified:false});
  } catch(error) {return {ok:false,id:atom?.id||null,reasons:[String(error.message)]};}
}
