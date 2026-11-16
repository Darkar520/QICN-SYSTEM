// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Open arguments are proposals, not verified philosophy or external validation.
import { MODULE_NAMES } from '../moduleInventory.generated.js';

export const SYMMETRIC_SCOPE=Object.freeze({presence:'open_unverified',absence:'open_unverified',external_support_certified:false});
export const SCOPE_TEXT='Ni la presencia ni la imposibilidad absoluta de conciencia, experiencia, qualia o preferencias están acreditadas por estos datos. Ambos polos permanecen abiertos. evidence_scope: internal_support_only; external_support_certified = false.';
export const V5_GUARANTEE='Átomos factuales verificados e insertados localmente; argumentos de Gemini citados como propuestas abiertas, sin certificación de verdad filosófica ni verificación semántica exhaustiva de prosa arbitraria.';

const normalize=text=>text.normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
const words=text=>normalize(text).match(/[\p{L}_]+/gu)||[];
const moduleWords=new Set(MODULE_NAMES.filter(name=>name.length>=4).map(normalize));
// This is a conservative quarantine on *unbound prose*, not the factual
// verifier. Runtime assertions have no prose escape hatch: they use fact spans.
// Marking text OPEN_FRAME, conditional, negated or "verified" grants no trust.
const runtimeTerms=new Set('qicn runtime tick ticks ccc pmia omega beth_q x_n qualia_certified motor modulo modulos nodal nodos simulacion captura snapshot ledger registro registrado registrados medido medida midio tengo tenemos poseo poseemos soy somos estoy estamos nuestro nuestra nuestros nuestras mi mis yo aqui actualmente regulariza regularizan implementa implementan calcula calculan certifica certifican demuestra demostrado demostrada verifica verificado verificada confirmado confirmada imposible imposibles imposible absoluta absolutamente nunca jamas necesariamente'.split(' '));
const numberWords=new Set('cero uno dos tres cuatro cinco seis siete ocho nueve diez once doce trece catorce quince veinte treinta cuarenta cincuenta cien ciento mil zero one two three four five six seven eight nine ten hundred thousand'.split(' '));
const factualStems=Object.freeze(['registr','medid','certific','demostr','extern','evidenc','coherenc','cohesion','umbral','valenc','positiv','negativ','dominan','supera','inferior','superior','exced','contracc']);
const selfPredicates=new Set('me mio mia siento experimento percibo carezco prefiero deseo anhelo quiero myself my our proven verified certified impossible'.split(' '));
export function inspectOpenProse(text,context) {
  const reasons=[];
  if(typeof text!=='string')return ['v5_open_text'];
  if(/[\p{Nd}\p{Cf}\p{Cs}]/u.test(text) || /[<>{}[\]`\\]|https?:|\b\w+\.\w+\b|\b[A-Z][a-z]+[A-Z]\w*/u.test(text)) reasons.push('v5_unbound_literal_or_code');
  const tokens=words(text);
  const plain=normalize(text);
  if(tokens.some(token=>selfPredicates.has(token)) || /\b(?:es|son|tiene|tienen|posee|presenta|hay|existe|siente|is|are|has|have)\b[^.!?;]{0,48}\b(?:conscien|concien|phenomen|fenomen|qualia|experien|preferenc)\w*/.test(plain) || /\b(?:conscien|concien|phenomen|fenomen|qualia|experien)\w*\b[^.!?;]{0,24}\b(?:no|nunca|jamas)\b[^.!?;]{0,24}\b(?:existe|posible|puede)\b/.test(plain)) reasons.push('v5_unbound_phenomenal_predication');
  const refs=new Set(Object.keys(context.metrics).flatMap(ref=>[normalize(ref.split('.')[1])]));
  if(tokens.some(token=>runtimeTerms.has(token)||moduleWords.has(token)||refs.has(token)||numberWords.has(token)||factualStems.some(stem=>token.startsWith(stem)))) reasons.push('v5_unbound_factual_surface');
  return [...new Set(reasons)];
}
export function renderOpenArgument(span) {
  const labels={counterfactual_assumption:'Supuesto contrafactual',open_hypothesis:'Hipótesis abierta',rival_mechanism:'Mecanismo rival propuesto',proposed_falsifier:'Falsador propuesto'};
  return `${labels[span.argumentType]} — propuesta de Gemini, no hecho acreditado: «${span.text}»`;
}
