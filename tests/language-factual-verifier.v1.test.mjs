import assert from 'node:assert/strict';
import fs from 'node:fs';
import { makeSnapshot, makeLedger } from './fixtures/languageFixtures.mjs';
import { prepareEvidential, factAtom } from './fixtures/evidentialFixtures.mjs';
import { createFactualContext, verifyFactualAtom } from '../src/language/evidential/factualVerifier.js';
import { EVIDENTIAL_OPERATIONS } from '../src/language/definitionCatalog.js';
import { sha256Hex, stableStringify } from '../src/utils/integrity.js';

let checks=0;
const prepared=prepareEvidential(),context=prepared.evidentialContext;
const check=(atom,ok,pattern)=>{const result=verifyFactualAtom(atom,context);assert.equal(result.ok,ok,JSON.stringify(result));if(pattern)assert.match(result.reasons.join(','),pattern);checks++;return result;};
check(factAtom(prepared,'ccc','metric_value',{ref:'metrics.ccc',asserted:prepared.snapshot.metrics.ccc}),true);
check(factAtom(prepared,'pmia','metric_value',{ref:'metrics.pmia',sign:'negative'}),true);
check(factAtom(prepared,'pmia','metric_value',{ref:'metrics.pmia',sign:'positive'}),false,/false_sign/);
for(const value of [0,1,2,-1,0.99])check(factAtom(prepared,'ccc','metric_value',{ref:'metrics.ccc',asserted:value}),false,/false_value/);
check(factAtom(prepared,'comparison','comparison',{left:'metrics.ccc',right:'metrics.ascension_threshold',operator:'<'}),true);
check(factAtom(prepared,'comparison','comparison',{left:'metrics.ccc',right:'metrics.ascension_threshold',operator:'>'}),false,/false_comparison/);
check(factAtom(prepared,'algebra','algebraic_relation',{relation:'ccc_xn'}),true);
check(factAtom(prepared,'algebra','algebraic_relation',{relation:'ccc_xn',asserted:20}),false,/false_value/);
for(const binding of [{digest:prepared.snapshot.digest.slice(0,12),tick:120},{digest:'0'.repeat(64),tick:120},{digest:prepared.snapshot.digest,tick:119}])check({...factAtom(prepared,'wrong','metric_value',{ref:'metrics.ccc'}),binding},false,/fact_binding/);
check(factAtom(prepared,'wrong','module_operation',{module:'NodalProcessingLayer',operation:'regularize_predictor',scope:'linear_predictor_weights'}),false,/module_operation_scope/);
check(factAtom(prepared,'wrong','module_operation',{module:'WorldModelEngine',operation:'regularize_predictor',scope:'all_nodal_weights'}),false,/module_operation_scope/);
for(const operation of EVIDENTIAL_OPERATIONS) {
  check(factAtom(prepared,'module','module_operation',{module:operation.module,operation:operation.operation,scope:operation.scope}),true);
  assert.ok(fs.readFileSync(operation.source,'utf8').includes(operation.anchor),`authority source anchor missing: ${operation.source}#${operation.anchor}`);
}
check(factAtom(prepared,'cn3','catalog_statement',{key:'historical_v1_cn3',asserted:false}),true);
check(factAtom(prepared,'cn3','catalog_statement',{key:'historical_v1_cn3',asserted:true}),false,/false_value/);
check(factAtom(prepared,'closed','catalog_statement',{key:'consciousness_certified'}),false,/catalog_not_closed/);
const {ledger}=makeLedger();ledger.record('parameter_change',{key:'HEBBIAN_FACTOR',value:0.05},50);
const withLedger=prepareEvidential({ledger});
const event=ledger.data.events.at(-1);
const ledgerAtom=factAtom(withLedger,'event','ledger_event',{ledgerDigest:withLedger.evidentialContext.ledgerDigest,eventHash:event.hash,eventTick:event.tick,eventType:event.type});
assert.equal(verifyFactualAtom(ledgerAtom,withLedger.evidentialContext).ok,true);checks++;
for(const change of [{eventTick:51},{eventHash:'a'.repeat(64)},{ledgerDigest:'b'.repeat(64)},{eventType:'system_reset'}]){assert.equal(verifyFactualAtom({...ledgerAtom,...change},withLedger.evidentialContext).ok,false);checks++;}
const corruptLedger=structuredClone(ledger.data);corruptLedger.events.at(-1).payload.value=0.4;
assert.throws(()=>createFactualContext({snapshot:makeSnapshot(),ledgerRecord:corruptLedger}),/ledger_invalid/);checks++;
const resign=snapshot=>{delete snapshot.digest;snapshot.digest=sha256Hex(stableStringify(snapshot));return snapshot;};
const inconsistent=structuredClone(prepared.snapshot);inconsistent.structural_profile.ccc_xn_divergence=20;
assert.throws(()=>createFactualContext({snapshot:resign(inconsistent)}),/structure|algebraic/);checks++;
const changed=structuredClone(prepared.snapshot);changed.tick++;
assert.throws(()=>createFactualContext({snapshot:resign(changed)}),/snapshot_header/);checks++;
const missingPredicate=structuredClone(prepared.snapshot);delete missingPredicate.predicates.ccc_vs_threshold;
assert.throws(()=>createFactualContext({snapshot:resign(missingPredicate)}),/threshold_predicate/);checks++;
const externalSnapshot=structuredClone(prepared.snapshot);externalSnapshot.structural_profile.epistemic_boundary.external_support_certified=true;
assert.throws(()=>createFactualContext({snapshot:resign(externalSnapshot)}),/epistemic_boundary/);checks++;
const tower=structuredClone(prepared.snapshot);tower.tower={sigma_exact_defect:'0',sigma_defect_bound:2/2187,sigma_defect_bound_rational:'2/2187'};
const towerContext=createFactualContext({snapshot:resign(tower)});
const towerAtom=(type,ref,asserted)=>({id:'tower',type,ref,binding:{digest:tower.digest,tick:tower.tick},...(asserted===undefined?{}:{asserted})});
assert.equal(verifyFactualAtom(towerAtom('analytical_bound','tower.sigma_defect_bound_rational'),towerContext).ok,true);checks++;
assert.equal(verifyFactualAtom(towerAtom('metric_value','tower.sigma_defect_bound_rational'),towerContext).ok,false);checks++;
assert.equal(verifyFactualAtom(towerAtom('metric_value','tower.sigma_exact_defect','2/2187'),towerContext).ok,false);checks++;
assert.equal(verifyFactualAtom(towerAtom('metric_value','tower.sigma_exact_defect','0'),towerContext).ok,true);checks++;
assert.equal(verifyFactualAtom({...towerAtom('metric_value','tower.sigma_exact_defect','0'),sign:'zero'},towerContext).ok,true);checks++;
for(const [operator,ok] of [['<',true],['>',false],['=',false]]) {
  const atom={id:'rational',type:'comparison',binding:{digest:tower.digest,tick:tower.tick},left:'tower.sigma_exact_defect',right:'tower.sigma_defect_bound_rational',operator};
  assert.equal(verifyFactualAtom(atom,towerContext).ok,ok);checks++;
}
console.log(`OK: factual verifier ${checks} checks; complete digest/tick, numbers/signs/comparisons/algebra, ledger, bound/measurement separation and module-operation-scope authority`);
