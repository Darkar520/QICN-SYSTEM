/**
 * Render trace hashing utilities.
 * Goal: deterministic, operation-level evidence without pixel snapshots.
 */

const TRACE_METHODS = new Set([
  'beginPath',
  'closePath',
  'moveTo',
  'lineTo',
  'arc',
  'fill',
  'stroke',
  'fillRect',
  'clearRect',
  'fillText',
  'strokeText',
  'save',
  'restore',
  'translate',
  'rotate',
  'scale'
]);

const TRACE_SETTERS = new Set([
  'fillStyle',
  'strokeStyle',
  'lineWidth',
  'font',
  'textAlign',
  'globalAlpha',
  'globalCompositeOperation',
  'shadowBlur',
  'shadowColor'
]);

const normalizeNumber = (value) => {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Infinity) return 'Infinity';
  if (value === -Infinity) return '-Infinity';
  return Number(value).toFixed(6);
};

const normalizeValue = (value, getObjectId) => {
  if (typeof value === 'number') return normalizeNumber(value);
  if (typeof value === 'string') return JSON.stringify(value);
  if (typeof value === 'boolean') return value ? 'true' : 'false';
  if (value === null) return 'null';
  if (typeof value === 'undefined') return 'undefined';
  if (Array.isArray(value)) return `[${value.map((v) => normalizeValue(v, getObjectId)).join(',')}]`;
  if (typeof value === 'object') return getObjectId(value);
  return JSON.stringify(String(value));
};

export const canonicalizeRenderTrace = (ops) =>
  ops.map((op) => `${op.name}(${op.args.join(',')})`).join('\n');

// Synchronous SHA-256 (portable JS implementation for runtime + tests).
export const sha256Hex = (input) => {
  const ascii = unescape(encodeURIComponent(String(input)));
  const rightRotate = (value, amount) => (value >>> amount) | (value << (32 - amount));
  const maxWord = 0x100000000;
  let result = '';
  const words = [];
  const asciiBitLength = ascii.length * 8;
  let hash = [];
  let k = [];
  let primeCounter = 0;
  const isComposite = {};

  for (let candidate = 2; primeCounter < 64; candidate++) {
    if (!isComposite[candidate]) {
      for (let i = 0; i < 313; i += candidate) isComposite[i] = candidate;
      hash[primeCounter] = (Math.pow(candidate, 0.5) * maxWord) | 0;
      k[primeCounter++] = (Math.pow(candidate, 1 / 3) * maxWord) | 0;
    }
  }

  ascii.split('').forEach((char, i) => {
    words[i >> 2] |= char.charCodeAt(0) << ((3 - (i % 4)) * 8);
  });
  words[asciiBitLength >> 5] |= 0x80 << (24 - (asciiBitLength % 32));
  words[(((asciiBitLength + 64) >> 9) << 4) + 15] = asciiBitLength;

  for (let j = 0; j < words.length; j += 16) {
    const w = words.slice(j, j + 16);
    const oldHash = hash.slice(0);

    for (let i = 0; i < 64; i++) {
      const w15 = w[i - 15];
      const w2 = w[i - 2];
      const a = hash[0];
      const e = hash[4];
      const temp1 =
        (hash[7]
          + rightRotate(e, 6)
          + rightRotate(e, 11)
          + rightRotate(e, 25)
          + ((e & hash[5]) ^ (~e & hash[6]))
          + k[i]
          + (w[i] =
            i < 16
              ? w[i]
              : (w[i - 16]
                + (rightRotate(w15, 7) ^ rightRotate(w15, 18) ^ (w15 >>> 3))
                + w[i - 7]
                + (rightRotate(w2, 17) ^ rightRotate(w2, 19) ^ (w2 >>> 10))) | 0)) | 0;
      const temp2 =
        (rightRotate(a, 2)
          + rightRotate(a, 13)
          + rightRotate(a, 22)
          + ((a & hash[1]) ^ (a & hash[2]) ^ (hash[1] & hash[2]))) | 0;

      hash = [(temp1 + temp2) | 0].concat(hash);
      hash[4] = (hash[4] + temp1) | 0;
      hash.pop();
    }

    for (let i = 0; i < 8; i++) {
      hash[i] = (hash[i] + oldHash[i]) | 0;
    }
  }

  for (let i = 0; i < 8; i++) {
    for (let j = 3; j + 1; j--) {
      const b = (hash[i] >> (j * 8)) & 255;
      result += ((b < 16 ? 0 : '') + b.toString(16));
    }
  }
  return result;
};

export const shouldTraceRenderHash = (deterministic) =>
  Boolean(deterministic || (typeof globalThis !== 'undefined' && globalThis.TRACE_RENDER_HASH === true));

export const createCanvasTraceRecorder = (ctx, enabled) => {
  if (!ctx || !enabled) {
    return {
      ctx,
      getOpCount: () => 0,
      getTrace: () => '',
      finalizeTraceHash: () => null
    };
  }

  const ops = [];
  const objectIds = new WeakMap();
  let objectCounter = 0;
  const MAX_TRACE_OPS = 30000;

  const getObjectId = (objectRef) => {
    let existing = objectIds.get(objectRef);
    if (existing) return existing;
    objectCounter += 1;
    existing = `obj#${objectCounter}`;
    objectIds.set(objectRef, existing);
    return existing;
  };

  const record = (name, args = []) => {
    if (ops.length >= MAX_TRACE_OPS) return;
    ops.push({
      name,
      args: args.map((arg) => normalizeValue(arg, getObjectId))
    });
  };

  const wrapGradient = (gradient, methodName, args) => {
    const gradientId = getObjectId(gradient);
    record(methodName, args);
    return new Proxy(gradient, {
      get(target, prop, receiver) {
        const value = Reflect.get(target, prop, receiver);
        if (prop === 'addColorStop' && typeof value === 'function') {
          return (...innerArgs) => {
            record(`${methodName}.addColorStop@${gradientId}`, innerArgs);
            return value.apply(target, innerArgs);
          };
        }
        return value;
      }
    });
  };

  const tracedCtx = new Proxy(ctx, {
    get(target, prop, receiver) {
      const value = Reflect.get(target, prop, receiver);
      if (typeof value !== 'function') return value;
      return (...args) => {
        if (prop === 'createLinearGradient' || prop === 'createRadialGradient') {
          const gradient = value.apply(target, args);
          return wrapGradient(gradient, String(prop), args);
        }
        if (TRACE_METHODS.has(String(prop))) {
          record(String(prop), args);
        }
        return value.apply(target, args);
      };
    },
    set(target, prop, value, receiver) {
      if (TRACE_SETTERS.has(String(prop))) {
        record(`set:${String(prop)}`, [value]);
      }
      return Reflect.set(target, prop, value, receiver);
    }
  });

  return {
    ctx: tracedCtx,
    getTrace: () => canonicalizeRenderTrace(ops),
    getOpCount: () => ops.length,
    finalizeTraceHash: () => sha256Hex(canonicalizeRenderTrace(ops))
  };
};
