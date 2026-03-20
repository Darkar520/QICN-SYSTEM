import { asJson } from './lib/selfpatch-common.js';

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  return asJson(200, {
    ok: true,
    build_hash: process.env.BUILD_HASH || 'unknown',
    integrity_contract_version: process.env.INTEGRITY_CONTRACT_VERSION || 'v1',
    functions_ok: true,
    selfpatch_mode: process.env.SELF_PATCH_MODE || 'semi_auto',
    timestamp: Date.now()
  });
};

export default { handler };
