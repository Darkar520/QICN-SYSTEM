import crypto from 'crypto';

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const makeBody = () => ({
  provider: 'gemini',
  model: 'gemini-3-flash-preview',
  messages: [
    { role: 'system', content: 'SYSTEM BASE' },
    { role: 'user', content: 'hello' }
  ],
  integrity: {
    packet: {
      tick: 101,
      seed: 17057,
      versionHash: 'qicn_v56',
      metrics: {
        tick: 101,
        simulationStep: 101,
        activeNodes: 150,
        depthMin: -0.2,
        depthMax: 0.9,
        clampHits: 0,
        recoveryTriggers: 0,
        rotX: 0,
        rotY: 0,
        seed: 17057,
        versionHash: 'qicn_v56'
      },
      sensorSummary: null
    },
    nonce: 'nonce_abc_101',
    requestId: 'c2req_abc_101',
    runId: 'run_17057_101',
    versionHash: 'qicn_v56',
    configHash: 'cfg_hash_101',
    threatModelRequested: 'C2'
  }
});

const extractBlock = (systemText) => {
  const match = String(systemText || '').match(
    /\[C2_INTEGRITY_ECHO_BEGIN\][\s\S]*?\[C2_INTEGRITY_ECHO_END\]/
  );
  if (!match) throw new Error('CASE FAIL: C2 block not injected in systemInstruction');
  return match[0];
};

const tamperBlockWithSha256 = (block) => {
  const packetMatch = block.match(
    /\[C2_INTEGRITY_PACKET_CANONICAL_BEGIN\]\n([\s\S]*?)\n\[C2_INTEGRITY_PACKET_CANONICAL_END\]/
  );
  if (!packetMatch) throw new Error('CASE FAIL: packet canonical block missing');
  const originalPacketCanonical = packetMatch[1];
  const tamperedPacketCanonical = originalPacketCanonical.includes('"activeNodes":150')
    ? originalPacketCanonical.replace('"activeNodes":150', '"activeNodes":151')
    : `${originalPacketCanonical} `;
  const sha256Only = crypto
    .createHash('sha256')
    .update(tamperedPacketCanonical, 'utf8')
    .digest('hex');

  return block
    .replace(
      /C2_INTEGRITY_SIGNATURE:\s*[0-9a-fA-F]{64}/,
      `C2_INTEGRITY_SIGNATURE: ${sha256Only}`
    )
    .replace(originalPacketCanonical, tamperedPacketCanonical);
};

const makeUpstreamResponse = (text) => ({
  ok: true,
  status: 200,
  json: async () => ({
    candidates: [
      { content: { parts: [{ text }] } }
    ],
    usageMetadata: { totalTokenCount: 123 }
  })
});

const previousEnv = {
  AUTH_REQUIRED: process.env.AUTH_REQUIRED,
  GEMINI_API_KEY: process.env.GEMINI_API_KEY,
  GEMINI_MODEL_ID: process.env.GEMINI_MODEL_ID,
  GEMINI_STRICT_MODEL: process.env.GEMINI_STRICT_MODEL,
  INTEGRITY_THREAT_MODEL: process.env.INTEGRITY_THREAT_MODEL,
  INTEGRITY_HMAC_SECRET: process.env.INTEGRITY_HMAC_SECRET
};
const previousFetch = global.fetch;

try {
  process.env.AUTH_REQUIRED = 'false';
  process.env.GEMINI_API_KEY = 'server-key';
  process.env.GEMINI_MODEL_ID = 'gemini-3-flash-preview';
  process.env.GEMINI_STRICT_MODEL = 'true';
  process.env.INTEGRITY_THREAT_MODEL = 'C2';
  process.env.INTEGRITY_HMAC_SECRET = 'super-secret-hmac';

  const { handler } = await import('../netlify/functions/llm-proxy.js');

  // CASE 1: OK path — valid C2 echo block should pass.
  global.fetch = async (_url, opts) => {
    const payload = JSON.parse(String(opts?.body || '{}'));
    const systemText = payload?.systemInstruction?.parts?.[0]?.text || '';
    const c2Block = extractBlock(systemText);
    return makeUpstreamResponse(`analysis\n${c2Block}`);
  };

  const okRes = await handler(
    {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify(makeBody())
    },
    {}
  );
  const okBody = JSON.parse(okRes.body);
  assert(okRes.statusCode === 200, 'CASE 1 FAIL: valid C2 echo must pass');
  assert(okBody.ok === true, 'CASE 1 FAIL: expected ok=true');
  assert(okBody.integrityThreatModel === 'C2', 'CASE 1 FAIL: threat model should be C2');

  // CASE 2: attack path — altered packet + recomputed SHA-256 should fail in C2.
  global.fetch = async (_url, opts) => {
    const payload = JSON.parse(String(opts?.body || '{}'));
    const systemText = payload?.systemInstruction?.parts?.[0]?.text || '';
    const c2Block = extractBlock(systemText);
    const forgedBlock = tamperBlockWithSha256(c2Block);
    return makeUpstreamResponse(`forged\n${forgedBlock}`);
  };

  const forgedRes = await handler(
    {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify(makeBody())
    },
    {}
  );
  const forgedBody = JSON.parse(forgedRes.body);
  assert(forgedRes.statusCode === 422, 'CASE 2 FAIL: forged C2 response must be rejected');
  assert(forgedBody.error === 'C2_INTEGRITY_REJECTED', 'CASE 2 FAIL: expected C2_INTEGRITY_REJECTED');

  // CASE 3: misconfiguration — C2 without secret must fail hard.
  process.env.INTEGRITY_HMAC_SECRET = '';
  global.fetch = async () => {
    throw new Error('CASE 3 FAIL: upstream fetch must not be called when secret is missing');
  };
  const miscfgRes = await handler(
    {
      httpMethod: 'POST',
      headers: {},
      body: JSON.stringify(makeBody())
    },
    {}
  );
  const miscfgBody = JSON.parse(miscfgRes.body);
  assert(miscfgRes.statusCode === 500, 'CASE 3 FAIL: missing C2 secret must fail hard');
  assert(miscfgBody.error === 'C2_SECRET_MISSING', 'CASE 3 FAIL: expected C2_SECRET_MISSING');

  console.log('OK: integrity-c2-proxy.v56 tests passed');
} catch (error) {
  console.error('FAIL: integrity-c2-proxy.v56 tests failed:', error.message);
  process.exit(1);
} finally {
  global.fetch = previousFetch;
  Object.entries(previousEnv).forEach(([key, value]) => {
    if (typeof value === 'undefined') delete process.env[key];
    else process.env[key] = value;
  });
}
