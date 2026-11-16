// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: No external validation or existing gate semantics.
import { sha256Hex, stableStringify } from '../../utils/integrity.js';
export const WORKBENCH_BOUNDARY = Object.freeze({ evidence_scope: 'internal_support_only', external_support_certified: false });
export const PROFILES = Object.freeze(['legacy_compatibility', 'paired_intervention']);
export const INTERVENTIONS = Object.freeze(['sham', 'block_history_read', 'suspend_consolidation', 'freeze_predictor_weights', 'erase_declared_history', 'sensor_impulse']);

export function assertData(value, ancestors = new Set()) {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object' || ancestors.has(value) || (!Array.isArray(value) && Object.getPrototypeOf(value) !== Object.prototype)) throw new Error('workbench_non_data_input');
  ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string' || !descriptor.enumerable || !('value' in descriptor)) throw new Error('workbench_non_data_input');
    assertData(descriptor.value, ancestors);
  }
  ancestors.delete(value);
}
export function freezeData(value) {
  if (value && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const item of Object.values(value)) freezeData(item);
  }
  return value;
}
export function dataDigest(domain, body) {
  assertData(body);
  // Hash the wire value, not JS alias identities or insertion order.
  return sha256Hex(`${domain}\n${stableStringify(JSON.parse(JSON.stringify(body)))}`);
}
export function sealData(body) {
  assertData(body);
  const data = JSON.parse(JSON.stringify(body));
  return freezeData({ ...data, digest: dataDigest(data.schema, data) });
}
export function verifyData(record, schema) {
  assertData(record);
  if (record.schema !== schema || typeof record.digest !== 'string') throw new Error('workbench_schema_mismatch');
  const { digest, ...body } = record;
  if (dataDigest(schema, body) !== digest) throw new Error('workbench_digest_mismatch');
  return body;
}
const keysOnly = (object, keys) => { if (Object.keys(object).some(k => !keys.includes(k))) throw new Error('unknown_protocol_field'); };
export function createWorkbenchProtocol(options = {}) {
  assertData(options);
  keysOnly(options, ['profile','ticks','inputTape','branches']);
  const { profile = 'legacy_compatibility', ticks = 12, inputTape = [], branches = [{ id: 'baseline', intervention: 'sham' }] } = options;
  const body = { schema: 'qicn.workbench_protocol.v1', ...WORKBENCH_BOUNDARY, profile, ticks, inputTape, branches };
  validateProtocolBody(body);
  return sealData(body);
}
export function validateProtocol(record) {
  const body = verifyData(record, 'qicn.workbench_protocol.v1');
  validateProtocolBody(body);
  return body;
}
function validateProtocolBody(body) {
  assertData(body);
  keysOnly(body, ['schema','evidence_scope','external_support_certified','profile','ticks','inputTape','branches']);
  if (body.evidence_scope !== 'internal_support_only' || body.external_support_certified !== false) throw new Error('workbench_boundary_violation');
  if (!PROFILES.includes(body.profile) || !Number.isInteger(body.ticks) || body.ticks < 1 || body.ticks > 1000) throw new Error('invalid_workbench_horizon_or_profile');
  if (!Array.isArray(body.inputTape) || (body.inputTape.length !== 0 && body.inputTape.length !== body.ticks)) throw new Error('input_tape_length');
  if (body.profile === 'paired_intervention' && body.inputTape.length !== body.ticks) throw new Error('paired_input_tape_required');
  for (const input of body.inputTape) {
    keysOnly(input, ['perception','entropyValue']);
    if (!input.perception || Array.isArray(input.perception) || typeof input.perception !== 'object') throw new Error('invalid_perception_frame');
    if ('entropyValue' in input && (!Number.isFinite(input.entropyValue) || input.entropyValue < 0 || input.entropyValue > 1)) throw new Error('invalid_entropy_input');
  }
  if (!Array.isArray(body.branches) || body.branches.length < 1 || body.branches.length > 16) throw new Error('invalid_branch_count');
  const ids = new Set();
  for (const branch of body.branches) {
    keysOnly(branch, ['id','intervention']);
    if (!/^[a-z][a-z0-9_-]{0,63}$/.test(branch.id) || ids.has(branch.id) || !INTERVENTIONS.includes(branch.intervention)) throw new Error('invalid_workbench_branch');
    ids.add(branch.id);
  }
  if (body.branches[0].intervention !== 'sham') throw new Error('baseline_sham_required');
}
