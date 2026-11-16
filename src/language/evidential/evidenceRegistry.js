// claim_scope: optional_internal_language_verification
// evidence_scope: internal_support_only
// interpretation_boundary: Verified internal clone records are not live evidence or external validation.
import { assertData, freezeData, dataDigest } from '../../experiments/workbench/contracts.js';
import { verifyWorkbenchResult } from '../../experiments/workbench/resultVerifier.js';
import { sha256Hex } from '../../utils/integrity.js';

const registries=new WeakSet();
export const EFFECT_MEASURES=Object.freeze(['maxAbsDiff','actionDivergence','deltaInTubeRate','deltaObjectiveScore']);
export function createEvidenceRegistry(attachments = []) {
  assertData(attachments);
  if(!Array.isArray(attachments) || attachments.length>4) throw new Error('v5_evidence_limit');
  const copies=structuredClone(attachments), entries=[],records=[];
  const ids=new Set();
  for(const attachment of copies) {
    if(Object.keys(attachment).some(key=>!['capture','protocol','result'].includes(key))) throw new Error('v5_evidence_fields');
    const {capture,protocol,result}=attachment;
    verifyWorkbenchResult(result,capture,protocol);
    if(ids.has(result.digest)) throw new Error('v5_duplicate_evidence');
    ids.add(result.digest);
    // B2's pure chain verifier is complemented by the inner v3 digest/header.
    if(sha256Hex(capture.dynamicRecord.text)!==capture.dynamicRecord.digest) throw new Error('v5_evidence_inner_digest');
    const inner=JSON.parse(capture.dynamicRecord.text);
    if(inner.schema!=='qicn.dynamic_state.v3' || inner.tick!==capture.sourceTick || inner.nodeCount!==capture.nodeCount || inner.build.version!==capture.sourceBuild.version || inner.build.signature!==capture.sourceBuild.signature || capture.evidence_scope!=='internal_support_only' || capture.external_support_certified!==false) throw new Error('v5_evidence_capture_context');
    records.push({resultDigest:result.digest,captureDigest:capture.digest,protocolDigest:protocol.digest});
    for(const comparison of result.comparisons) {
      if(protocol.branches.find(branch=>branch.id===comparison.branchId).intervention==='sham')continue;
      entries.push({resultDigest:result.digest,captureDigest:capture.digest,protocolDigest:protocol.digest,sourceTick:capture.sourceTick,endTick:capture.sourceTick+result.ticks,sourceBuild:capture.sourceBuild,branchId:comparison.branchId,intervention:protocol.branches.find(b=>b.id===comparison.branchId).intervention,measures:Object.fromEntries(EFFECT_MEASURES.map(key=>[key,comparison[key]])),evidence_scope:'internal_support_only',external_support_certified:false,scope:'isolated_copy_not_live_state'});
    }
  }
  const body={status:entries.length?'verified_internal_copy':'not_recorded',records,entries,evidence_scope:'internal_support_only',external_support_certified:false};
  const registry=freezeData({...body,digest:dataDigest('qicn.evidential_registry.v1',body)});
  registries.add(registry);
  return registry;
}
export const isEvidenceRegistry = value => registries.has(value);
export function lookupEffect(registry,resultDigest,branchId,measure) {
  if(!isEvidenceRegistry(registry) || !EFFECT_MEASURES.includes(measure)) throw new Error('v5_unverified_effect');
  const entry=registry.entries.find(row=>row.resultDigest===resultDigest && row.branchId===branchId);
  if(!entry || !Number.isFinite(entry.measures[measure])) throw new Error('v5_effect_not_recorded');
  return {entry,value:entry.measures[measure]};
}
