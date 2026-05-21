// @ts-check

const defaultEnabled = () => {
  const runtimeFlag = globalThis?.__QICN_STRUCTURED_LOGS__;
  const processFlag = globalThis?.process?.env?.QICN_STRUCTURED_LOGS;
  return runtimeFlag === true || processFlag === '1' || processFlag === 'true';
};

const safeData = (data) => (data && typeof data === 'object' && !Array.isArray(data) ? data : {});

const emit = (sink, method, payload) => {
  const line = JSON.stringify(payload);
  const fn = sink?.[method] || console[method] || console.log;
  fn(line);
  return payload;
};

/**
 * Creates a structured JSON logger for internal runtime diagnostics.
 *
 * This logger is intentionally operational: it does not produce scientific
 * evidence or claim closure, only machine-readable diagnostic events.
 *
 * @param {string} module
 * @param {{ enabled?: boolean, sink?: Partial<Console>, now?: () => number }} [options]
 */
export const createLogger = (module, options = {}) => {
  const enabled = options.enabled ?? defaultEnabled();
  const sink = options.sink || console;
  const now = options.now || Date.now;

  const write = (level, msg, data) => {
    const payload = {
      level,
      module,
      msg,
      ...safeData(data),
      ts: now()
    };
    if (!enabled) return payload;
    return emit(sink, level === 'error' ? 'error' : level === 'warn' ? 'warn' : 'log', payload);
  };

  return {
    info: (msg, data) => write('info', msg, data),
    warn: (msg, data) => write('warn', msg, data),
    error: (msg, data) => write('error', msg, data)
  };
};

export default createLogger;
