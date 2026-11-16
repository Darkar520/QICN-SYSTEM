// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Atom verification does not certify open philosophy or external validation.
import { PARTS, EVIDENTIAL_SCHEMA, parseEvidentialRealization } from './claimGrammar.js';
import { verifyFactualAtom } from './factualVerifier.js';
import { inspectOpenProse, renderOpenArgument, SCOPE_TEXT, V5_GUARANTEE } from './epistemicPolicy.js';
import { freezeData } from '../../experiments/workbench/contracts.js';

const headings={measured_observation:'Observación anclada',applicable_model:'Modelo y propuestas abiertas',intervention_or_explicit_absence:'Intervención o ausencia registrada',symmetric_epistemic_scope:'Alcance epistémico'};
function coverage(spans) {
  return PARTS.every(part=>spans.some(span=>span.part===part && span.ok))
    && spans.some(span=>span.part==='measured_observation'&&span.ok&&span.observationEligible)
    && spans.some(span=>span.part==='applicable_model'&&span.ok&&span.modelEligible)
    && spans.some(span=>span.part==='intervention_or_explicit_absence'&&span.ok&&['measured_effect','absence'].includes(span.atomType));
}
export function verifyEvidentialRealization(parsed,context) {
  const envelope=parsed.snapshot.digest===context.snapshot.digest && parsed.snapshot.tick===context.snapshot.tick;
  const atoms=parsed.atoms.map(atom=>verifyFactualAtom(atom,context)),byId=new Map(atoms.map(atom=>[atom.id,atom]));
  const spans=[],seen=new Map();
  for(const part of PARTS)for(const span of parsed.parts[part]) {
    const reasons=[];let text='',atomType=null,cites=[],observationEligible=false,modelEligible=false;
    if(span.kind==='fact') {
      const atom=byId.get(span.atom);
      if(!atom?.ok)reasons.push('v5_invalid_fact_reference');
      else {text=atom.text;atomType=atom.type;cites=[span.atom];observationEligible=atom.observationEligible;modelEligible=atom.modelEligible;}
      if(part==='symmetric_epistemic_scope')reasons.push('v5_scope_required');
      if(part==='measured_observation'&&atom?.type!=='metric_value'&&atom?.type!=='comparison'&&atom?.type!=='algebraic_relation'&&atom?.type!=='analytical_bound'&&atom?.type!=='ledger_event')reasons.push('v5_observation_type');
    } else if(span.kind==='open') {
      if(part!=='applicable_model'&&part!=='intervention_or_explicit_absence')reasons.push('v5_open_part');
      reasons.push(...inspectOpenProse(span.text,context));
      for(const premise of span.premises)if(!byId.get(premise)?.ok)reasons.push('v5_invalid_premise');
      for(const dependency of span.dependsOn||[])if(!seen.get(dependency)?.ok)reasons.push('v5_invalid_dependency');
      cites=[...span.premises];text=renderOpenArgument(span);
    } else if(span.kind==='absence') {
      if(part!=='intervention_or_explicit_absence'||context.evidenceRegistry.status!=='not_recorded')reasons.push('v5_false_evidence_absence');
      text='Intervención verificada disponible: not_recorded. No se ha aportado un resultado de copia verificado; disponer de un mecanismo no sustituye una intervención.';atomType='absence';
    } else {
      if(part!=='symmetric_epistemic_scope')reasons.push('v5_scope_part');
      text=SCOPE_TEXT;atomType='scope';
    }
    const result={id:span.id,part,kind:span.kind,atomType,observationEligible,modelEligible,ok:!reasons.length,text,cites,reasons:[...new Set(reasons)],...(span.kind==='open'?{argumentStatus:'open_proposal_not_fact',premises:[...span.premises],dependsOn:span.dependsOn||[]}: {})};
    spans.push(result);seen.set(span.id,result);
  }
  // Scope is locally authored and cannot be omitted, replaced or appended to.
  const scopes=spans.filter(span=>span.part==='symmetric_epistemic_scope');
  const scopeValid=scopes.length===1&&scopes[0].kind==='scope'&&scopes[0].ok;
  const discrepancies=[...(!envelope?[{reason:'v5_full_snapshot_binding'}]:[]),...atoms.filter(atom=>!atom.ok).map(atom=>({atom:atom.id,reason:atom.reasons.join(',')})),...spans.filter(span=>!span.ok).map(span=>({span:span.id,reason:span.reasons.join(',')})),...(!scopeValid?[{reason:'v5_symmetric_scope_required'}]:[]),...(!coverage(spans)?[{reason:'v5_four_part_coverage'}]:[])];
  return freezeData({ok:!discrepancies.length,envelope,scopeValid,atoms,spans,discrepancies,guaranteeNote:V5_GUARANTEE,evidence_scope:'internal_support_only',external_support_certified:false});
}
export function evaluateEvidential(context,modelText) {
  try {const verification=verifyEvidentialRealization(parseEvidentialRealization(modelText),context);return {ok:verification.ok,verification,error:null};}
  catch(error){return {ok:false,verification:null,error:String(error.message||'v5_contract_error')};}
}
export function evidentialGracefulCandidate(verification) {
  if(!verification?.envelope||!verification.scopeValid)return null;
  const kept=verification.spans.filter(span=>span.ok);
  if(!coverage(kept))return null;
  return {kept,withheld:verification.spans.filter(span=>!span.ok),droppedAtoms:verification.atoms.filter(atom=>!atom.ok)};
}
export function renderEvidential(spans) {
  return PARTS.map(part=>`${headings[part]}\n${spans.filter(span=>span.part===part).map(span=>span.text).join('\n')}`).join('\n\n');
}

export function finalizeEvidentialTurn(prepared,options,core,conversationSchema) {
  const context=prepared.evidentialContext,snapshot=context.snapshot;
  const tries=(Array.isArray(options.attempts)?options.attempts:options.modelText!=null||options.modelError?[{modelText:options.modelText,modelError:options.modelError}]:[]).slice(0,2);
  const mode=options.mode||(tries.length?'gemini':'local'),graceful=options.integrityMode==='graceful';
  const trace={schema:EVIDENTIAL_SCHEMA,contract:'evidential',snapshotTick:snapshot.tick,snapshotDigest:snapshot.digest,registryDigest:context.evidenceRegistry.digest,route:'local_evidential',mode,attempts:[],provider:options.provider||null,transportRetries:(options.transportRetries||[]).slice(0,4),reasoningPlan:prepared.reasoningPlan};
  const integrity={mode:graceful?'graceful':'strict',severity:'ok',banner:null,discrepancies:[],withheld:[],snapshotEcho:'full_match',guaranteeNote:V5_GUARANTEE};
  const localText=`Lectura local de la captura: tick ${snapshot.tick}, digest ${snapshot.digest}.\n${SCOPE_TEXT}`;
  let text=localText,spans=[],verification=null,bestPartial=null,localReading=null;
  if(mode==='gemini') {
    for(const attempt of tries) {
      if(attempt.modelError){trace.attempts.push({stage:'transport',code:String(attempt.modelError.code||attempt.modelError.message||'unknown')});continue;}
      const evaluation=evaluateEvidential(context,attempt.modelText);
      const v=evaluation.verification;
      trace.attempts.push({stage:evaluation.ok?'verified':'rejected',error:evaluation.error,discrepancies:v?.discrepancies||[],rejectedSpans:v?.spans.filter(span=>!span.ok)||[],failedAtoms:v?.atoms.filter(atom=>!atom.ok)||[]});
      if(evaluation.ok){verification=v;spans=v.spans;trace.route='gemini_evidential_checked';break;}
      const candidate=evidentialGracefulCandidate(v);
      if(candidate&&(!bestPartial||candidate.kept.length>bestPartial.candidate.kept.length))bestPartial={v,candidate};
    }
    if(!verification&&graceful&&bestPartial) {
      verification=bestPartial.v;spans=bestPartial.candidate.kept;trace.route='gemini_evidential_partial';
      integrity.severity='medium';integrity.withheld=bestPartial.candidate.withheld.map(span=>({id:span.id,reasons:span.reasons}));
      integrity.discrepancies=verification.discrepancies;integrity.banner='Propuestas y hechos inválidos y todos sus dependientes quedaron retenidos; se conservan las cuatro partes y ambos polos.';
    }
    if(verification)text=renderEvidential(spans);
    else {
      trace.route=trace.attempts.length&&trace.attempts.every(a=>a.stage==='transport')?'gemini_evidential_unavailable':'gemini_evidential_rejected';
      integrity.severity='high';integrity.discrepancies=trace.attempts.at(-1)?.discrepancies||[];
      integrity.banner='Sistema B retuvo la redacción; no se publica un argumento de sustitución.';
      text='No se publica la propuesta: no superó el contrato evidencial v5.';
      localReading={label:'Lectura local (sin argumento de Gemini)',text:localText,cites:[]};
    }
  }
  const citedIds=[...new Set(spans.flatMap(span=>span.cites))];
  const verifiedAtoms=verification?.atoms.filter(atom=>atom.ok&&citedIds.includes(atom.id))||[];
  trace.openArgumentStatus='open_proposal_not_semantically_certified';
  const rows=verifiedAtoms.map(atom=>({atom:atom.id,type:atom.type,inserted:atom.value,engine:atom.value,source:atom.source,status:'verified_atom',binding:atom.binding}));
  return {text,intent:prepared.intent.intent,sentences:spans.map((span,index)=>({...span,index:index+1,source:span.kind==='open'?'gemini_open_proposal':'local_verified_insertion'})),evidence:verifiedAtoms.map(atom=>({id:atom.id,kind:atom.type,evidenceClass:atom.evidenceClass,source:atom.source,provenance:atom.provenance,expressedBy:'local_verified_insertion'})),trace,integrity,localReading,core,concordance:{rows,summary:{total:rows.length,exact:rows.length,fromFact:rows.length,outOfTolerance:0}},controlProposal:null,record:{schema:conversationSchema,turnIndex:prepared.turnIndex,question:String(prepared.question||'').slice(0,500),intent:prepared.intent.intent,intentLabel:prepared.intent.intent,tick:snapshot.tick,snapshotDigest:snapshot.digest,metrics:{...snapshot.metrics},answerSummary:text.replace(/\s+/g,' ').slice(0,400),route:trace.route,sessionId:prepared.sessionId||null}};
}
