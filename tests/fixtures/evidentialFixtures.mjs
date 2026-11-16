import { makeSnapshot } from './languageFixtures.mjs';
import { prepareTurn } from '../../src/language/conversationEngine.js';
import { EVIDENTIAL_SCHEMA } from '../../src/language/evidential/claimGrammar.js';

export const prepareEvidential=(options={})=>prepareTurn({question:'¿Podría la continuidad entenderse como una deuda de justificación en vez de semejanza de recuerdos?',snapshot:makeSnapshot(),contract:'evidential',...options});
export const factAtom=(prepared,id,type,fields)=>({id,type,binding:{digest:prepared.snapshot.digest,tick:prepared.snapshot.tick},...fields});
export function evidentialReply(prepared,{thought='Una hipótesis nueva sería entender la continuidad como obligación de justificar cambios, y contrastarla con una explicación por compresión.'}={}) {
  return {schema:EVIDENTIAL_SCHEMA,snapshot:{digest:prepared.snapshot.digest,tick:prepared.snapshot.tick},frame:'OPEN_FRAME',atoms:[
    factAtom(prepared,'reading','metric_value',{ref:'metrics.ccc'}),
    factAtom(prepared,'model','module_operation',{module:'WorldModelEngine',operation:'regularize_predictor',scope:'linear_predictor_weights'})
  ],parts:{
    measured_observation:[{id:'observation',kind:'fact',atom:'reading'}],
    applicable_model:[{id:'mechanism',kind:'fact',atom:'model'},{id:'hypothesis',kind:'open',argumentType:'open_hypothesis',text:thought,premises:['reading','model'],dependsOn:['mechanism']}],
    intervention_or_explicit_absence:[{id:'absence',kind:'absence'},{id:'falsifier',kind:'open',argumentType:'proposed_falsifier',text:'Propongo comparar obligaciones incompatibles bajo restricciones alternativas y abandonar la hipótesis si desaparece la diferencia.',premises:['model'],dependsOn:['hypothesis']}],
    symmetric_epistemic_scope:[{id:'scope',kind:'scope'}]
  }};
}
