import crypto from 'crypto';

export class IntegrityC2Error extends Error {
  constructor(message, context = {}) {
    super(message);
    this.name = 'IntegrityC2Error';
    this.context = context;
  }
}

export const C2_ECHO_MARKERS = {
  echoBegin: '[C2_INTEGRITY_ECHO_BEGIN]',
  echoEnd: '[C2_INTEGRITY_ECHO_END]',
  packetBegin: '[C2_INTEGRITY_PACKET_CANONICAL_BEGIN]',
  packetEnd: '[C2_INTEGRITY_PACKET_CANONICAL_END]',
  signatureKey: 'C2_INTEGRITY_SIGNATURE:',
  nonceKey: 'C2_INTEGRITY_NONCE:',
  requestIdKey: 'C2_INTEGRITY_REQUEST_ID:',
  runIdKey: 'C2_INTEGRITY_RUN_ID:',
  versionHashKey: 'C2_INTEGRITY_VERSION_HASH:',
  configHashKey: 'C2_INTEGRITY_CONFIG_HASH:'
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countOccurrences = (text, marker) => {
  const matches = String(text || '').match(new RegExp(escapeRegExp(marker), 'g'));
  return matches ? matches.length : 0;
};

export const stableStringify = (value) => {
  const seen = new WeakSet();
  const stringify = (input) => {
    if (input === null) return 'null';
    const t = typeof input;
    if (t === 'number') return Number.isFinite(input) ? String(input) : 'null';
    if (t === 'boolean') return input ? 'true' : 'false';
    if (t === 'string') return JSON.stringify(input);
    if (t !== 'object') return 'null';
    if (seen.has(input)) return 'null';
    seen.add(input);
    if (Array.isArray(input)) return `[${input.map((item) => stringify(item)).join(',')}]`;
    const keys = Object.keys(input).sort();
    return `{${keys.map((k) => `${JSON.stringify(k)}:${stringify(input[k])}`).join(',')}}`;
  };
  return stringify(value);
};

export const hmacSha256Hex = (secret, canonical) => {
  if (!secret || !String(secret).trim()) {
    throw new IntegrityC2Error('Missing INTEGRITY_HMAC_SECRET for C2 signing');
  }
  return crypto
    .createHmac('sha256', String(secret))
    .update(String(canonical), 'utf8')
    .digest('hex');
};

const normalizeContext = ({
  packetCanonical,
  nonce,
  requestId,
  runId,
  versionHash,
  configHash
}) => ({
  packetCanonical: String(packetCanonical || ''),
  nonce: String(nonce || ''),
  requestId: String(requestId || ''),
  runId: String(runId || ''),
  versionHash: String(versionHash || ''),
  configHash: String(configHash || '')
});

export const buildC2Signature = ({
  packetCanonical,
  nonce,
  requestId,
  runId,
  versionHash,
  configHash,
  secret
}) => {
  const normalized = normalizeContext({
    packetCanonical,
    nonce,
    requestId,
    runId,
    versionHash,
    configHash
  });
  if (!normalized.packetCanonical || !normalized.nonce || !normalized.requestId) {
    throw new IntegrityC2Error('C2 signature context missing required fields', normalized);
  }
  const canonical = stableStringify(normalized);
  return hmacSha256Hex(secret, canonical);
};

export const buildC2ContractBlock = ({
  packetCanonical,
  nonce,
  requestId,
  runId,
  versionHash,
  configHash,
  signature
}) => [
  'C2 INTEGRITY CONTRACT (SERVER-ENFORCED, MANDATORY):',
  '- Append EXACTLY the block below at the end of your response.',
  '- Do not change any character in packet canonical or metadata lines.',
  C2_ECHO_MARKERS.echoBegin,
  `${C2_ECHO_MARKERS.signatureKey} ${signature}`,
  `${C2_ECHO_MARKERS.nonceKey} ${nonce}`,
  `${C2_ECHO_MARKERS.requestIdKey} ${requestId}`,
  `${C2_ECHO_MARKERS.runIdKey} ${runId}`,
  `${C2_ECHO_MARKERS.versionHashKey} ${versionHash}`,
  `${C2_ECHO_MARKERS.configHashKey} ${configHash}`,
  C2_ECHO_MARKERS.packetBegin,
  packetCanonical,
  C2_ECHO_MARKERS.packetEnd,
  C2_ECHO_MARKERS.echoEnd
].join('\n');

const parseKeyLine = (line, key) => {
  const prefix = `${key} `;
  if (!line.startsWith(prefix)) {
    throw new IntegrityC2Error(`Invalid C2 line format for ${key}`);
  }
  return line.slice(prefix.length);
};

export const verifyC2Echo = (responseText, {
  expectedPacketCanonical,
  expectedNonce,
  expectedRequestId,
  expectedRunId,
  expectedVersionHash,
  expectedConfigHash,
  secret
}) => {
  const text = String(responseText || '');
  const requiredMarkers = [
    C2_ECHO_MARKERS.echoBegin,
    C2_ECHO_MARKERS.echoEnd,
    C2_ECHO_MARKERS.packetBegin,
    C2_ECHO_MARKERS.packetEnd,
    C2_ECHO_MARKERS.signatureKey,
    C2_ECHO_MARKERS.nonceKey,
    C2_ECHO_MARKERS.requestIdKey,
    C2_ECHO_MARKERS.runIdKey,
    C2_ECHO_MARKERS.versionHashKey,
    C2_ECHO_MARKERS.configHashKey
  ];
  for (const marker of requiredMarkers) {
    if (countOccurrences(text, marker) !== 1) {
      throw new IntegrityC2Error(`C2 marker occurrence mismatch: ${marker}`);
    }
  }

  const blockRegex = new RegExp(
    `${escapeRegExp(C2_ECHO_MARKERS.echoBegin)}\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.signatureKey)}\\s*[0-9a-fA-F]{64})\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.nonceKey)}\\s*.*)\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.requestIdKey)}\\s*.*)\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.runIdKey)}\\s*.*)\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.versionHashKey)}\\s*.*)\\s*\\n` +
    `(${escapeRegExp(C2_ECHO_MARKERS.configHashKey)}\\s*.*)\\s*\\n` +
    `${escapeRegExp(C2_ECHO_MARKERS.packetBegin)}\\s*\\n` +
    `([\\s\\S]*?)\\n\\s*` +
    `${escapeRegExp(C2_ECHO_MARKERS.packetEnd)}\\s*\\n` +
    `${escapeRegExp(C2_ECHO_MARKERS.echoEnd)}`
  );
  const match = text.match(blockRegex);
  if (!match) {
    throw new IntegrityC2Error('C2 echo block missing or malformed');
  }

  const parsed = {
    signature: parseKeyLine(match[1], C2_ECHO_MARKERS.signatureKey).toLowerCase(),
    nonce: parseKeyLine(match[2], C2_ECHO_MARKERS.nonceKey),
    requestId: parseKeyLine(match[3], C2_ECHO_MARKERS.requestIdKey),
    runId: parseKeyLine(match[4], C2_ECHO_MARKERS.runIdKey),
    versionHash: parseKeyLine(match[5], C2_ECHO_MARKERS.versionHashKey),
    configHash: parseKeyLine(match[6], C2_ECHO_MARKERS.configHashKey),
    packetCanonical: match[7]
  };

  if (parsed.packetCanonical.includes(C2_ECHO_MARKERS.echoBegin)
    || parsed.packetCanonical.includes(C2_ECHO_MARKERS.echoEnd)
    || parsed.packetCanonical.includes(C2_ECHO_MARKERS.packetBegin)
    || parsed.packetCanonical.includes(C2_ECHO_MARKERS.packetEnd)) {
    throw new IntegrityC2Error('Nested C2 markers inside packet canonical');
  }

  if (parsed.packetCanonical !== String(expectedPacketCanonical)) {
    throw new IntegrityC2Error('C2 packet canonical mismatch');
  }
  if (parsed.nonce !== String(expectedNonce)) {
    throw new IntegrityC2Error('C2 nonce mismatch');
  }
  if (parsed.requestId !== String(expectedRequestId)) {
    throw new IntegrityC2Error('C2 requestId mismatch');
  }
  if (parsed.runId !== String(expectedRunId)) {
    throw new IntegrityC2Error('C2 runId mismatch');
  }
  if (parsed.versionHash !== String(expectedVersionHash)) {
    throw new IntegrityC2Error('C2 versionHash mismatch');
  }
  if (parsed.configHash !== String(expectedConfigHash)) {
    throw new IntegrityC2Error('C2 configHash mismatch');
  }

  const expectedSignature = buildC2Signature({
    packetCanonical: parsed.packetCanonical,
    nonce: parsed.nonce,
    requestId: parsed.requestId,
    runId: parsed.runId,
    versionHash: parsed.versionHash,
    configHash: parsed.configHash,
    secret
  }).toLowerCase();

  if (parsed.signature !== expectedSignature) {
    throw new IntegrityC2Error('C2 signature mismatch');
  }

  return {
    ok: true,
    signature: parsed.signature
  };
};
