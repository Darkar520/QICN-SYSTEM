const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));
const toFinite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);
const asString = (value, fallback = '') => {
  if (value === undefined || value === null) return fallback;
  const normalized = String(value).trim();
  return normalized || fallback;
};

const VALID_MODES = new Set([
  'baseline',
  'replay',
  'shuffled',
  'prng_only',
  'delayed_entropy',
  'dropout'
]);

const cloneSample = (sample) => JSON.parse(JSON.stringify(sample || {}));

const createSeededRandom = (seed = 17057) => {
  let state = Math.max(1, Math.floor(toFinite(seed, 17057)) >>> 0);
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967295;
  };
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));

const buildBitsFromSeededRandom = (nextRandom, bitCount = 32) => {
  const bits = [];
  for (let index = 0; index < bitCount; index += 1) {
    bits.push(nextRandom() >= 0.5 ? '1' : '0');
  }
  return bits.join('');
};

const bitsToFloat01 = (bits) => {
  const normalizedBits = String(bits || '').replace(/[^01]/g, '');
  if (!normalizedBits) return 0.5;
  const slice = normalizedBits.slice(0, 32);
  const denominator = Math.pow(2, slice.length) - 1;
  if (!Number.isFinite(denominator) || denominator <= 0) return 0.5;
  const numerator = parseInt(slice, 2);
  if (!Number.isFinite(numerator)) return 0.5;
  return clamp01(numerator / denominator);
};

const computeBitBalance = (bits) => {
  const normalizedBits = String(bits || '').replace(/[^01]/g, '');
  if (!normalizedBits) return 0.5;
  const ones = normalizedBits.split('').reduce((count, bit) => (bit === '1' ? count + 1 : count), 0);
  return clamp01(ones / normalizedBits.length);
};

const normalizeReplaySequence = (sequence) => {
  if (!Array.isArray(sequence)) return [];
  return sequence
    .filter((entry) => entry && typeof entry === 'object')
    .map((entry) => cloneSample(entry));
};

const shuffleSequence = (sequence, seed) => {
  const nextRandom = createSeededRandom(seed);
  const copy = sequence.map((entry) => cloneSample(entry));
  for (let index = copy.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(nextRandom() * (index + 1));
    [copy[index], copy[swapIndex]] = [copy[swapIndex], copy[index]];
  }
  return copy;
};

export class EntropyExperimentController {
  constructor(config = {}) {
    this.sequenceCursor = 0;
    this.config = {
      mode: 'baseline',
      seed: 17057,
      delayMs: 0,
      dropoutRate: 0,
      replaySequence: [],
      replaySourceId: ''
    };
    this.nextRandom = createSeededRandom(this.config.seed);
    this.materializedSequence = [];
    this.configure(config);
  }

  buildConfig(nextConfig = {}, baseConfig = this.config) {
    const modeCandidate = asString(nextConfig.mode ?? baseConfig.mode, 'baseline').toLowerCase();
    const mode = VALID_MODES.has(modeCandidate) ? modeCandidate : 'baseline';
    const seed = Math.max(1, Math.floor(toFinite(nextConfig.seed ?? baseConfig.seed, baseConfig.seed)));
    const delayMs = Math.max(0, Math.floor(toFinite(nextConfig.delayMs ?? baseConfig.delayMs, baseConfig.delayMs)));
    const dropoutRate = clamp01(nextConfig.dropoutRate ?? baseConfig.dropoutRate);
    const replaySourceId = asString(nextConfig.replaySourceId ?? baseConfig.replaySourceId, '');
    const replaySequence = normalizeReplaySequence(nextConfig.replaySequence ?? baseConfig.replaySequence);
    return {
      mode,
      seed,
      delayMs,
      dropoutRate,
      replaySourceId,
      replaySequence
    };
  }

  configure(nextConfig = {}) {
    this.config = this.buildConfig(nextConfig, this.config);
    this.nextRandom = createSeededRandom(this.config.seed);
    this.sequenceCursor = 0;
    this.materializedSequence = this.config.mode === 'shuffled'
      ? shuffleSequence(this.config.replaySequence, this.config.seed)
      : this.config.replaySequence.map((entry) => cloneSample(entry));
    return this.snapshot();
  }

  getConfigSignature() {
    return JSON.stringify({
      mode: this.config.mode,
      seed: this.config.seed,
      delayMs: this.config.delayMs,
      dropoutRate: this.config.dropoutRate,
      replayLength: this.materializedSequence.length,
      replaySourceId: this.config.replaySourceId
    });
  }

  snapshot() {
    return {
      active: this.config.mode !== 'baseline',
      mode: this.config.mode,
      seed: this.config.seed,
      delayMs: this.config.delayMs,
      dropoutRate: this.config.dropoutRate,
      replayLength: this.materializedSequence.length,
      replaySourceId: this.config.replaySourceId || null,
      cursor: this.sequenceCursor
    };
  }

  usesSyntheticSource() {
    return this.config.mode === 'replay'
      || this.config.mode === 'shuffled'
      || this.config.mode === 'prng_only';
  }

  getInterventionSurface() {
    switch (this.config.mode) {
      case 'replay':
      case 'shuffled':
      case 'prng_only':
        return 'source_replacement';
      case 'delayed_entropy':
        return 'delivery_delay';
      case 'dropout':
        return 'delivery_dropout';
      default:
        return 'none';
    }
  }

  materializeSyntheticChunk({ ttlMs = 60000, nowMs = Date.now() } = {}) {
    if (!this.usesSyntheticSource()) {
      return { ok: false, reason: 'synthetic_source_not_enabled' };
    }
    if (this.config.mode === 'prng_only') {
      const entropyBits = buildBitsFromSeededRandom(this.nextRandom, 32);
      const entropyFloat01 = bitsToFloat01(entropyBits);
      const sample = {
        source: 'experimental_prng_only',
        jobId: `prng_only_${this.config.seed}_${this.sequenceCursor + 1}`,
        timestampMs: nowMs,
        receivedAtMs: nowMs,
        ttlMs: Math.max(1000, Math.floor(toFinite(ttlMs, 60000))),
        entropyBits,
        entropyFloat01,
        quality: {
          valid: true,
          bitBalance: computeBitBalance(entropyBits),
          shots: 32
        },
        meta: {
          experimentMode: 'prng_only',
          experimentInterventionSurface: this.getInterventionSurface()
        }
      };
      this.sequenceCursor += 1;
      return {
        ok: true,
        sample,
        responseMode: 'experimental_prng_only',
        requestMeta: {
          provider: 'experimental_prng_only',
          requestId: `prng_req_${this.config.seed}_${this.sequenceCursor}`,
          requestUrl: 'experimental://prng_only',
          fetchStartMs: nowMs,
          fetchEndMs: nowMs,
          latencyMs: 0
        }
      };
    }
    if (this.materializedSequence.length === 0) {
      return {
        ok: false,
        reason: this.config.mode === 'replay' ? 'missing_replay_sequence' : 'missing_shuffled_sequence'
      };
    }
    const sequenceIndex = this.sequenceCursor % this.materializedSequence.length;
    const baseSample = cloneSample(this.materializedSequence[sequenceIndex]);
    const sample = {
      ...baseSample,
      source: asString(baseSample.source, `experimental_${this.config.mode}`),
      jobId: asString(baseSample.jobId, `${this.config.mode}_${this.config.seed}_${sequenceIndex + 1}`),
      timestampMs: nowMs,
      receivedAtMs: nowMs,
      ttlMs: Math.max(1000, Number.isFinite(Number(baseSample.ttlMs)) ? Number(baseSample.ttlMs) : Number(ttlMs)),
      meta: {
        ...(baseSample.meta && typeof baseSample.meta === 'object' ? baseSample.meta : {}),
        experimentMode: this.config.mode,
        experimentInterventionSurface: this.getInterventionSurface(),
        replaySourceId: this.config.replaySourceId || null,
        replaySequenceIndex: sequenceIndex,
        originalTimestampMs: Number.isFinite(Number(baseSample.timestampMs)) ? Number(baseSample.timestampMs) : null,
        originalReceivedAtMs: Number.isFinite(Number(baseSample.receivedAtMs)) ? Number(baseSample.receivedAtMs) : null
      }
    };
    this.sequenceCursor += 1;
    return {
      ok: true,
      sample,
      responseMode: this.config.mode === 'replay' ? 'experimental_replay' : 'experimental_shuffled',
      requestMeta: {
        provider: `experimental_${this.config.mode}`,
        requestId: asString(sample.jobId, `${this.config.mode}_req_${this.sequenceCursor}`),
        requestUrl: `experimental://${this.config.mode}/${this.config.replaySourceId || 'inline_sequence'}`,
        fetchStartMs: nowMs,
        fetchEndMs: nowMs,
        latencyMs: 0
      }
    };
  }

  async applyPostFetchControls(result, nowMs = Date.now()) {
    const mode = this.config.mode;
    if (mode === 'delayed_entropy' && this.config.delayMs > 0 && result?.ok && result?.sample) {
      await sleep(this.config.delayMs);
      return {
        ...result,
        experimentalControl: {
          mode,
          delayAppliedMs: this.config.delayMs
        }
      };
    }
    if (mode === 'dropout' && result?.ok && result?.sample) {
      const draw = this.nextRandom();
      if (draw < this.config.dropoutRate) {
        return {
          ok: false,
          status: 'dropped',
          reason: 'experimental_dropout',
          requestMeta: {
            ...(result.requestMeta || {}),
            fetchEndMs: Number.isFinite(Number(result?.requestMeta?.fetchEndMs))
              ? Number(result.requestMeta.fetchEndMs)
              : nowMs
          },
          responseMode: result.responseMode || 'upstream_quantum',
          experimentalControl: {
            mode,
            dropoutRate: this.config.dropoutRate,
            draw
          }
        };
      }
      return {
        ...result,
        experimentalControl: {
          mode,
          dropoutRate: this.config.dropoutRate,
          draw
        }
      };
    }
    return {
      ...result,
      experimentalControl: mode !== 'baseline'
        ? {
          mode
        }
        : null
    };
  }
}

export default EntropyExperimentController;
