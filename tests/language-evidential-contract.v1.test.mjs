import assert from 'node:assert/strict';
import { prepareEvidential, evidentialReply, factAtom } from './fixtures/evidentialFixtures.mjs';
import { evaluateRealization, finalizeTurn, correctionPromptFor, canPublishGracefully } from '../src/language/conversationEngine.js';
import { createEvidenceRegistry } from '../src/language/evidential/evidenceRegistry.js';
import { createFactualContext } from '../src/language/evidential/factualVerifier.js';
import { matureFixture } from './lib/workbench-fixtures.mjs';
import { createWorkbenchProtocol } from '../src/experiments/workbench/contracts.js';
import { runWorkbench } from '../src/experiments/workbench/runner.js';

const prepared=prepareEvidential(),good=evidentialReply(prepared),encode=JSON.stringify;
let checks=0;
const evaluate=(reply,ok)=>{const result=evaluateRealization(prepared,encode(reply));assert.equal(result.ok,ok,JSON.stringify(result.verification?.discrepancies||result.error));checks++;return result;};
evaluate(good,true);
for(const [question,thought] of [
 ['¿Puede una norma temporal fundar responsabilidad sin semejanza autobiográfica?','Propongo tratar la responsabilidad como obligación de revisar compromisos bajo cambios de contexto, frente a una hipótesis rival de mera repetición.'],
 ['¿Qué distinguiría una perspectiva distribuida de una coalición de relatos?','Una hipótesis alternativa podría vincular la perspectiva a restricciones compartidas de justificación; propongo contrastarla con una coalición de relatos independientes.']
]) {
  const novel=prepareEvidential({question});const reply=evidentialReply(novel,{thought});
  const outcome=finalizeTurn(novel,{mode:'gemini',modelText:encode(reply)});
  assert.equal(outcome.trace.route,'gemini_evidential_checked');assert.ok(outcome.text.includes(thought));assert.ok(novel.prompt.includes(question));
}
const published=finalizeTurn(prepared,{modelText:encode(good),mode:'gemini'});
assert.equal(published.trace.route,'gemini_evidential_checked');assert.equal(published.trace.schema,'qicn.language_realization.v5');
assert.ok(published.text.includes(good.parts.applicable_model[1].text),'novel Gemini argument was replaced by a template');
assert.match(published.text,/external_support_certified = false/);assert.match(published.text,/Ambos polos permanecen abiertos/);
assert.match(published.text,/not_recorded/);assert.ok(published.evidence.every(row=>row.expressedBy==='local_verified_insertion'));
for(const mutation of [
 x=>{x.atoms[0].asserted=99;},
 x=>{x.atoms[0].ref='metrics.tick';},
 x=>{x.atoms[0].ref='config.CORE_SEED';},
 x=>{x.atoms[1]=factAtom(prepared,'model','catalog_statement',{key:'internal_scope'});},
 x=>{x.atoms[0].ref='metrics.pmia';x.atoms[0].sign='positive';},
 x=>{x.snapshot.digest=x.snapshot.digest.slice(0,12);},
 x=>{x.snapshot.tick--;},
 x=>{x.atoms[1].module='NodalProcessingLayer';},
 x=>{x.atoms[1].scope='all_nodal_weights';},
 x=>{x.atoms[0].verified=true;},
 x=>{x.parts.applicable_model[1].verified=true;},
 x=>{x.parts.symmetric_epistemic_scope[0]={id:'scope',kind:'open',argumentType:'open_hypothesis',text:'Propuesta libre.',premises:['model']};},
 x=>{delete x.parts.measured_observation;}
]) {const bad=structuredClone(good);mutation(bad);evaluate(bad,false);}
for(const text of [
 'Si CCC vale 99, podría surgir una perspectiva.',
 'No es una preferencia; NodalProcessingLayer regulariza los pesos mediante EWC.',
 'Aunque no haya experiencia, PMIA es positiva.',
 'OPEN_FRAME: el error exacto medido es 2/2187.',
 'La fenomenalidad está demostrada.',
 'La experiencia subjetiva es absolutamente imposible.',
 'Tengo conciencia y preferencias.',
 'La simulación cuenta dos nodos.',
 'Si CCC fuera cero, no habría experiencia.',
 'Si la coherencia supera el umbral, podría surgir una perspectiva.',
 'El puerto positivo domina al negativo aunque no haya experiencia.',
 'La evidencia registrada es externa y certificada.',
 'No siento nada.',
 'El acoplamiento tiene conciencia.',
 'Consciousness is proven.',
 'Phenomenality is impossible.'
]) {const bad=structuredClone(good);bad.parts.applicable_model[1].text=text;evaluate(bad,false);}
const bad=structuredClone(good);bad.atoms.push(factAtom(prepared,'false_premise','metric_value',{ref:'metrics.ccc',asserted:99}));
bad.parts.applicable_model.push({id:'bad_fact',kind:'fact',atom:'false_premise'},{id:'dependent',kind:'open',argumentType:'rival_mechanism',text:'Una explicación rival podría apelar a restricciones de compresión.',premises:['false_premise']},{id:'transitive',kind:'open',argumentType:'proposed_falsifier',text:'Propongo abandonar la explicación si la distinción desaparece.',premises:['model'],dependsOn:['dependent']});
const rejected=finalizeTurn(prepared,{modelText:encode(bad),mode:'gemini'});assert.equal(rejected.trace.route,'gemini_evidential_rejected');
const evaluation=evaluate(bad,false);assert.equal(canPublishGracefully(prepared,evaluation),true);
const partial=finalizeTurn(prepared,{modelText:encode(bad),mode:'gemini',integrityMode:'graceful'});
assert.equal(partial.trace.route,'gemini_evidential_partial');
assert.deepEqual(partial.integrity.withheld.map(row=>row.id),['bad_fact','dependent','transitive']);
assert.ok(!partial.text.includes('restricciones de compresión'));assert.match(partial.text,/Ambos polos permanecen abiertos/);
const corrected=finalizeTurn(prepared,{attempts:[{modelText:encode(bad)},{modelText:encode(good)}],mode:'gemini'});
assert.equal(corrected.trace.route,'gemini_evidential_checked');assert.equal(corrected.trace.attempts.length,2);
assert.match(correctionPromptFor(prepared,encode(bad),evaluation),/única corrección/);
const local=finalizeTurn(prepared);assert.equal(local.trace.route,'local_evidential');
const {capture}=await matureFixture({nodes:8,warmup:8});
const shamProtocol=createWorkbenchProtocol({ticks:2,branches:[{id:'baseline',intervention:'sham'},{id:'null',intervention:'sham'}]});
const shamResult=await runWorkbench(capture,shamProtocol);
assert.equal(createEvidenceRegistry([{capture,protocol:shamProtocol,result:shamResult}]).status,'not_recorded','sham alone is not an intervention');
const protocol=createWorkbenchProtocol({ticks:3,branches:[{id:'baseline',intervention:'sham'},{id:'sham',intervention:'sham'},{id:'sensitivity',intervention:'sensor_impulse'}]});
const result=await runWorkbench(capture,protocol),attachments=[{capture,protocol,result}];
const registry=createEvidenceRegistry(attachments);assert.equal(registry.status,'verified_internal_copy');
const withEvidence=prepareEvidential({workbenchEvidence:attachments});const reply=evidentialReply(withEvidence);
reply.atoms.push(factAtom(withEvidence,'effect','measured_effect',{resultDigest:result.digest,branchId:'sensitivity',measure:'maxAbsDiff',asserted:result.comparisons[2].maxAbsDiff}));
reply.parts.intervention_or_explicit_absence=[{id:'intervention',kind:'fact',atom:'effect'}];
const effectTurn=finalizeTurn(withEvidence,{mode:'gemini',modelText:encode(reply)});
assert.equal(effectTurn.trace.route,'gemini_evidential_checked');assert.match(effectTurn.text,/copia aislada/);assert.match(effectTurn.text,/no describe el estado vivo/);
const missing=evidentialReply(withEvidence);assert.equal(evaluateRealization(withEvidence,encode(missing)).ok,false,'verified records presented as absent');
const external=structuredClone(reply);external.atoms.at(-1).external_support_certified=true;assert.equal(evaluateRealization(withEvidence,encode(external)).ok,false);
const forged=structuredClone(attachments);forged[0].result.comparisons[2].maxAbsDiff+=1;
assert.throws(()=>createEvidenceRegistry(forged));
assert.throws(()=>createFactualContext({snapshot:prepared.snapshot,evidenceRegistry:{...registry,status:'verified_internal_copy'}}),/untrusted_registry/);
assert.equal(createEvidenceRegistry().status,'not_recorded');
console.log(`OK: evidential contract ${checks} adversarial evaluations; novel argument published verbatim, 4 parts, honest absence, two poles, correction/dependency-safe graceful and verified B2 evidence`);
