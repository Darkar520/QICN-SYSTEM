// Operational budgets, not model capability claims or scientific thresholds.
// 65 536 is the output-token limit of gemini-3-flash-preview (thinking tokens
// included). High thinking with that budget can take minutes; the deadline is
// 5 min. A hosted Netlify synchronous function has its own shorter limit.
export const MAX_OUTPUT_TOKENS = 65536;
export const UPSTREAM_TIMEOUT_MS = 300000;

const isValidGeminiPart = (part) => {
  if (!part || typeof part !== 'object' || Array.isArray(part)) return false;
  if (typeof part.text === 'string') return true;
  if (part.functionCall && typeof part.functionCall === 'object' && typeof part.functionCall.name === 'string') return true;
  if (part.functionResponse && typeof part.functionResponse === 'object' && typeof part.functionResponse.name === 'string') return true;
  return false;
};

export const boundGeminiPayload = (payload) => {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload) ||
      !Array.isArray(payload.contents) || payload.contents.length === 0 ||
      payload.contents.some((entry) => !entry || !['user', 'model'].includes(entry.role) ||
        !Array.isArray(entry.parts) || entry.parts.length === 0 ||
        entry.parts.some((part) => !isValidGeminiPart(part)))) {
    throw new Error('INVALID_GEMINI_PAYLOAD');
  }
  const config = payload.generationConfig ?? {};
  if (typeof config !== 'object' || Array.isArray(config)) throw new Error('INVALID_GENERATION_CONFIG');
  const requested = config.maxOutputTokens ?? 1024;
  if (!Number.isInteger(requested) || requested < 1) throw new Error('INVALID_MAX_TOKENS');
  return {
    ...payload,
    // Clone before injecting C2 instructions or enforcing generation policy.
    ...(payload.systemInstruction ? { systemInstruction: structuredClone(payload.systemInstruction) } : {}),
    contents: structuredClone(payload.contents),
    generationConfig: { ...config, maxOutputTokens: Math.min(requested, MAX_OUTPUT_TOKENS) }
  };
};
