/**
 * Integrity + telemetry utilities.
 *
 * Requirements:
 * - Packet checksum = sha256(canonical_json(packet_without_checksum))
 * - Canonical JSON = stable, key-sorted stringify (prevents "theatrical" hashes).
 * - Validator must recompute checksum and reject mismatches.
 * - LLM must echo packet + checksum verbatim; parser extracts echo for validation.
 */

/**
 * @typedef {Object} TelemetryFrame
 * @property {number} tick
 * @property {number} simulationStep
 * @property {number} activeNodes
 * @property {number} depthMin
 * @property {number} depthMax
 * @property {number} clampHits
 * @property {number} recoveryTriggers
 * @property {number} rotX
 * @property {number} rotY
 * @property {number} seed
 * @property {string} versionHash
 */

/**
 * @typedef {Object} IntegrityPacket
 * @property {number} tick
 * @property {number} seed
 * @property {string} versionHash
 * @property {TelemetryFrame} metrics
 * @property {object | null} sensorSummary
 * @property {string} checksum
 */

export class IntegrityError extends Error {
  /**
   * @param {string} message
   * @param {object} [context]
   */
  constructor(message, context = {}) {
    super(message);
    this.name = 'IntegrityError';
    this.context = context;
  }
}

export const TELEMETRY_SCHEMA = {
  type: 'object',
  required: [
    'tick',
    'simulationStep',
    'activeNodes',
    'depthMin',
    'depthMax',
    'clampHits',
    'recoveryTriggers',
    'rotX',
    'rotY',
    'seed',
    'versionHash'
  ],
  properties: {
    tick: { type: 'number' },
    simulationStep: { type: 'number' },
    activeNodes: { type: 'number' },
    depthMin: { type: 'number' },
    depthMax: { type: 'number' },
    clampHits: { type: 'number' },
    recoveryTriggers: { type: 'number' },
    rotX: { type: 'number' },
    rotY: { type: 'number' },
    seed: { type: 'number' },
    versionHash: { type: 'string' }
  }
};

export const INTEGRITY_PACKET_SCHEMA = {
  type: 'object',
  required: ['tick', 'seed', 'versionHash', 'metrics', 'sensorSummary', 'checksum'],
  properties: {
    tick: { type: 'number' },
    seed: { type: 'number' },
    versionHash: { type: 'string' },
    metrics: TELEMETRY_SCHEMA,
    sensorSummary: { type: 'object' },
    checksum: { type: 'string' }
  }
};

export const INTEGRITY_ECHO_MARKERS = {
  packetBegin: '[INTEGRITY_ECHO_PACKET_BEGIN]',
  packetEnd: '[INTEGRITY_ECHO_PACKET_END]',
  checksumKey: 'INTEGRITY_ECHO_CHECKSUM:'
};

const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const countOccurrences = (text, marker) => {
  const matches = String(text).match(new RegExp(escapeRegExp(marker), 'g'));
  return matches ? matches.length : 0;
};

export const stableStringify = (value) => {
  const seen = new WeakSet();
  const stringify = (v) => {
    if (v === null) return 'null';
    const t = typeof v;
    if (t === 'number') return Number.isFinite(v) ? String(v) : 'null';
    if (t === 'boolean') return v ? 'true' : 'false';
    if (t === 'string') return JSON.stringify(v);
    if (t !== 'object') return 'null';
    if (seen.has(v)) return 'null';
    seen.add(v);
    if (Array.isArray(v)) {
      return `[${v.map((item) => stringify(item)).join(',')}]`;
    }
    const keys = Object.keys(v).sort();
    const parts = keys.map((k) => `${JSON.stringify(k)}:${stringify(v[k])}`);
    return `{${parts.join(',')}}`;
  };
  return stringify(value);
};

// Minimal SHA-256 implementation (sync, no dependencies).
// Source structure: standard SHA-256 compression (FIPS 180-4).
const rotr = (x, n) => (x >>> n) | (x << (32 - n));
const ch = (x, y, z) => (x & y) ^ (~x & z);
const maj = (x, y, z) => (x & y) ^ (x & z) ^ (y & z);
const bigSigma0 = (x) => rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
const bigSigma1 = (x) => rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
const smallSigma0 = (x) => rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
const smallSigma1 = (x) => rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

const toHex32 = (x) => x.toString(16).padStart(8, '0');

const utf8ToBytes = (str) => {
  const bytes = [];
  for (let i = 0; i < str.length; i++) {
    const codePoint = str.charCodeAt(i);
    if (codePoint < 0x80) bytes.push(codePoint);
    else if (codePoint < 0x800) {
      bytes.push(0xc0 | (codePoint >> 6));
      bytes.push(0x80 | (codePoint & 0x3f));
    } else if (codePoint >= 0xd800 && codePoint <= 0xdbff) {
      // surrogate pair
      const next = str.charCodeAt(++i);
      const u = 0x10000 + (((codePoint & 0x3ff) << 10) | (next & 0x3ff));
      bytes.push(0xf0 | (u >> 18));
      bytes.push(0x80 | ((u >> 12) & 0x3f));
      bytes.push(0x80 | ((u >> 6) & 0x3f));
      bytes.push(0x80 | (u & 0x3f));
    } else {
      bytes.push(0xe0 | (codePoint >> 12));
      bytes.push(0x80 | ((codePoint >> 6) & 0x3f));
      bytes.push(0x80 | (codePoint & 0x3f));
    }
  }
  return new Uint8Array(bytes);
};

export const sha256Hex = (message) => {
  const bytes = utf8ToBytes(message);
  const bitLenHi = Math.floor((bytes.length * 8) / 2 ** 32);
  const bitLenLo = (bytes.length * 8) >>> 0;

  // Padding: 1 bit + zeros + 64-bit length
  const withOne = bytes.length + 1;
  const padLen = (withOne + 8) % 64 === 0 ? 0 : 64 - ((withOne + 8) % 64);
  const totalLen = withOne + padLen + 8;
  const data = new Uint8Array(totalLen);
  data.set(bytes);
  data[bytes.length] = 0x80;

  // length (big-endian) into last 8 bytes
  const view = new DataView(data.buffer);
  view.setUint32(totalLen - 8, bitLenHi);
  view.setUint32(totalLen - 4, bitLenLo);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < data.length; offset += 64) {
    for (let i = 0; i < 16; i++) {
      w[i] = view.getUint32(offset + i * 4);
    }
    for (let i = 16; i < 64; i++) {
      w[i] = (smallSigma1(w[i - 2]) + w[i - 7] + smallSigma0(w[i - 15]) + w[i - 16]) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i++) {
      const t1 = (h + bigSigma1(e) + ch(e, f, g) + K[i] + w[i]) >>> 0;
      const t2 = (bigSigma0(a) + maj(a, b, c)) >>> 0;
      h = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return `${toHex32(h0)}${toHex32(h1)}${toHex32(h2)}${toHex32(h3)}${toHex32(h4)}${toHex32(h5)}${toHex32(h6)}${toHex32(h7)}`;
};

/**
 * Build integrity packet:
 * checksum = sha256(canonical_json(packet_without_checksum))
 * @param {{tick:number, seed:number, versionHash:string, metrics:TelemetryFrame, sensorSummary?:object|null}} fields
 * @returns {IntegrityPacket}
 */
export const buildIntegrityPacket = (fields) => {
  const packetNoChecksum = {
    tick: fields.tick,
    seed: fields.seed,
    versionHash: fields.versionHash,
    metrics: fields.metrics,
    sensorSummary: fields.sensorSummary ?? null
  };
  const canonical = stableStringify(packetNoChecksum);
  const checksum = sha256Hex(canonical);
  return { ...packetNoChecksum, checksum };
};

/**
 * Validate packet fields + checksum recomputation.
 * @param {IntegrityPacket} packet
 * @returns {true}
 */
export const validateIntegrityPacket = (packet) => {
  if (!packet || typeof packet !== 'object') {
    throw new IntegrityError('Integrity packet missing');
  }
  if (!Number.isFinite(packet.tick)) throw new IntegrityError('Invalid tick', { packet });
  if (!Number.isFinite(packet.seed)) throw new IntegrityError('Invalid seed', { packet });
  if (typeof packet.versionHash !== 'string') throw new IntegrityError('Invalid versionHash', { packet });
  if (!packet.metrics || typeof packet.metrics !== 'object') throw new IntegrityError('Missing metrics', { packet });
  if (typeof packet.checksum !== 'string' || packet.checksum.length !== 64) {
    throw new IntegrityError('Invalid checksum format', { packet });
  }

  const required = TELEMETRY_SCHEMA.required;
  for (let i = 0; i < required.length; i++) {
    const key = required[i];
    const value = packet.metrics[key];
    if (value === undefined) throw new IntegrityError(`Missing metric: ${key}`, { key, packet });
    if (key !== 'versionHash' && !Number.isFinite(value)) {
      throw new IntegrityError(`Invalid metric: ${key}=${value}`, { key, value, packet });
    }
    if (key === 'versionHash' && typeof value !== 'string') {
      throw new IntegrityError(`Invalid metric: ${key}`, { key, value, packet });
    }
  }

  if (packet.metrics.tick !== packet.tick) throw new IntegrityError('Metric tick mismatch', { packet });
  if (packet.metrics.seed !== packet.seed) throw new IntegrityError('Metric seed mismatch', { packet });
  if (packet.metrics.versionHash !== packet.versionHash) throw new IntegrityError('Metric versionHash mismatch', { packet });

  const recomputed = buildIntegrityPacket({
    tick: packet.tick,
    seed: packet.seed,
    versionHash: packet.versionHash,
    metrics: packet.metrics,
    sensorSummary: packet.sensorSummary
  }).checksum;

  if (recomputed !== packet.checksum) {
    throw new IntegrityError('Checksum mismatch', { expected: recomputed, actual: packet.checksum, packet });
  }

  return true;
};

/**
 * Parse LLM echo block from text.
 * Expected format:
 *   INTEGRITY_ECHO_CHECKSUM: <64-hex>
 *   [INTEGRITY_ECHO_PACKET_BEGIN]
 *   { ...json... }
 *   [INTEGRITY_ECHO_PACKET_END]
 * @param {string} text
 * @returns {{ checksum: string, packet: object }}
 */
export const parseIntegrityEcho = (text) => {
  if (typeof text !== 'string') throw new IntegrityError('Echo text missing');
  const checksumCount = countOccurrences(text, INTEGRITY_ECHO_MARKERS.checksumKey);
  const beginCount = countOccurrences(text, INTEGRITY_ECHO_MARKERS.packetBegin);
  const endCount = countOccurrences(text, INTEGRITY_ECHO_MARKERS.packetEnd);

  if (checksumCount !== 1) {
    throw new IntegrityError('Integrity echo must include exactly one checksum marker', { checksumCount });
  }
  if (beginCount !== 1 || endCount !== 1) {
    throw new IntegrityError('Integrity echo must include exactly one packet marker pair', { beginCount, endCount });
  }

  const strictPattern = new RegExp(
    `${escapeRegExp(INTEGRITY_ECHO_MARKERS.checksumKey)}\\s*([0-9a-fA-F]{64})\\s*\\n\\s*${escapeRegExp(INTEGRITY_ECHO_MARKERS.packetBegin)}\\s*\\n([\\s\\S]*?)\\n\\s*${escapeRegExp(INTEGRITY_ECHO_MARKERS.packetEnd)}`,
    'm'
  );
  const strictMatch = text.match(strictPattern);
  if (!strictMatch) {
    throw new IntegrityError('Integrity echo block must use canonical marker layout');
  }

  const checksum = strictMatch[1].toLowerCase();
  const jsonText = strictMatch[2].trim();
  if (!jsonText) throw new IntegrityError('Echoed packet JSON block is empty');
  if (
    jsonText.includes(INTEGRITY_ECHO_MARKERS.packetBegin)
    || jsonText.includes(INTEGRITY_ECHO_MARKERS.packetEnd)
    || jsonText.includes(INTEGRITY_ECHO_MARKERS.checksumKey)
  ) {
    throw new IntegrityError('Echoed packet JSON contains nested integrity markers');
  }

  let packet;
  try {
    packet = JSON.parse(jsonText);
  } catch (e) {
    throw new IntegrityError('Echoed packet is not valid JSON', { error: e.message });
  }

  if (!packet || typeof packet !== 'object' || Array.isArray(packet)) {
    throw new IntegrityError('Echoed packet must be a JSON object');
  }
  if ('checksum' in packet) {
    throw new IntegrityError('Echoed packet must not include checksum field');
  }

  const requiredTopLevelKeys = ['tick', 'seed', 'versionHash', 'metrics', 'sensorSummary'];
  for (let i = 0; i < requiredTopLevelKeys.length; i++) {
    const key = requiredTopLevelKeys[i];
    if (!(key in packet)) throw new IntegrityError(`Echoed packet missing required field: ${key}`);
  }

  const allowedTopLevelKeys = new Set(requiredTopLevelKeys);
  const packetKeys = Object.keys(packet);
  for (let i = 0; i < packetKeys.length; i++) {
    if (!allowedTopLevelKeys.has(packetKeys[i])) {
      throw new IntegrityError(`Echoed packet contains unexpected field: ${packetKeys[i]}`);
    }
  }

  if (!packet.metrics || typeof packet.metrics !== 'object' || Array.isArray(packet.metrics)) {
    throw new IntegrityError('Echoed packet metrics must be an object');
  }

  return { checksum, packet };
};

/**
 * Validate that the LLM echoed exactly the packet+checksum produced by core.
 * @param {IntegrityPacket} expected
 * @param {string} llmText
 * @returns {true}
 */
export const validateIntegrityEcho = (expected, llmText) => {
  if (!expected) throw new IntegrityError('Expected packet missing');
  const echoed = parseIntegrityEcho(llmText);

  // Compare checksum first
  if (echoed.checksum !== expected.checksum.toLowerCase()) {
    throw new IntegrityError('Echo checksum mismatch', { expected: expected.checksum, actual: echoed.checksum });
  }

  // Compare canonical JSON of packet-without-checksum (defends against key order changes)
  const expectedCanonical = stableStringify({
    tick: expected.tick,
    seed: expected.seed,
    versionHash: expected.versionHash,
    metrics: expected.metrics,
    sensorSummary: expected.sensorSummary ?? null
  });
  const echoedCanonical = stableStringify(echoed.packet);
  if (echoedCanonical !== expectedCanonical) {
    throw new IntegrityError('Echo packet mismatch', { expected: expectedCanonical, actual: echoedCanonical });
  }

  return true;
};
