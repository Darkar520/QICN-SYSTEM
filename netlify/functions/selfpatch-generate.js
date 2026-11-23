import policyJson from './lib/load-selfpatch-policy.js';
import { asJson, requireUser, parseJsonBody, envBool } from './lib/selfpatch-common.js';
import { classifyPatchRisk } from './lib/risk-classifier.js';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';

const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1beta';
const OPENAI_RESPONSES_URL = 'https://api.openai.com/v1/responses';
const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview';
const DEFAULT_CODE_PROVIDER = 'openai';
const DEFAULT_CODE_MODEL = 'gpt-5.3-codex';
const DEFAULT_REASONING_EFFORT = 'high';
const VALID_REASONING_EFFORTS = new Set(['low', 'medium', 'high', 'xhigh']);
const REASONING_EFFORT_RANK = { low: 1, medium: 2, high: 3, xhigh: 4 };
const SANDBOX_MANIFEST_PATH = path.resolve(process.cwd(), 'sandbox', 'identity_manifest.seed.json');
const CRITICAL_PATH_MARKERS = [
  'src/simulation/OntologicalSingularityCore.js',
  'src/simulation/PhenomenologyCore.js',
  'src/simulation/MetaSovereigntyCheck.js',
  'src/simulation/HolographicMemoryNexus.js',
  'src/utils/integrity.js',
  'src/index.jsx',
  'netlify/functions/selfpatch-apply.js',
  'netlify/functions/lib/selfpatch-',
  'src/experimental/self_code/SelfPatchPolicy.js'
];

const normalizeReasoningEffort = (value, fallback = DEFAULT_REASONING_EFFORT) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (VALID_REASONING_EFFORTS.has(normalized)) return normalized;
  return fallback;
};

const isPlaceholderSecret = (value) => {
  const normalized = String(value || '').trim().toLowerCase();
  if (!normalized) return true;
  return normalized.startsWith('tu_clave')
    || normalized.startsWith('your_')
    || normalized.startsWith('replace_')
    || normalized.includes('api_key_here')
    || normalized.includes('test_key')
    || normalized === 'changeme';
};

const normalizeOpenAiReasoningEffort = (value) => {
  const normalized = normalizeReasoningEffort(value, DEFAULT_REASONING_EFFORT);
  return normalized === 'xhigh' ? 'high' : normalized;
};

const buildOpenAiModelCandidates = (model) => {
  const selected = String(model || '').trim() || DEFAULT_CODE_MODEL;
  const configuredFallback = String(process.env.SELF_PATCH_CODE_MODEL_FALLBACK || '').trim();
  const candidates = [selected];
  if (selected.includes('5.3')) {
    candidates.push(selected.replace('5.3', '5'));
  }
  if (selected === 'gpt-5.3-codex') {
    candidates.push('gpt-5-codex');
  }
  if (configuredFallback) {
    candidates.push(configuredFallback);
  }
  return Array.from(new Set(candidates.filter(Boolean)));
};

const maxReasoningEffort = (left, right) => {
  const a = normalizeReasoningEffort(left, DEFAULT_REASONING_EFFORT);
  const b = normalizeReasoningEffort(right, DEFAULT_REASONING_EFFORT);
  return (REASONING_EFFORT_RANK[b] || REASONING_EFFORT_RANK[DEFAULT_REASONING_EFFORT])
    > (REASONING_EFFORT_RANK[a] || REASONING_EFFORT_RANK[DEFAULT_REASONING_EFFORT])
    ? b
    : a;
};

const selectAutomaticReasoningEffort = (body = {}) => {
  const targetFiles = Array.isArray(body.targetFiles) ? body.targetFiles : [];
  const totalChangedLines = Math.max(0, Number(body.totalChangedLines) || 0);
  const objectiveLength = String(body.objective || '').trim().length;
  const hasCriticalTarget = targetFiles.some((file) => (
    CRITICAL_PATH_MARKERS.some((marker) => String(file || '').includes(marker))
  ));

  if (hasCriticalTarget || totalChangedLines >= 220 || targetFiles.length >= 6) {
    return { effort: 'xhigh', mode: 'auto_dynamic', reason: 'critical_or_large_patch' };
  }
  if (totalChangedLines >= 90 || targetFiles.length >= 3 || objectiveLength >= 420) {
    return { effort: 'xhigh', mode: 'auto_dynamic', reason: 'complex_patch' };
  }
  return { effort: 'high', mode: 'auto_dynamic', reason: 'quality_floor_high' };
};

const validateBody = (body) => {
  if (!body || typeof body !== 'object') return 'INVALID_BODY';
  if (!Array.isArray(body.targetFiles) || body.targetFiles.length === 0) return 'INVALID_TARGET_FILES';
  if (!Array.isArray(body.fileSnapshots) || body.fileSnapshots.length === 0) return 'INVALID_FILE_SNAPSHOTS';
  if (typeof body.objective !== 'string' || !body.objective.trim()) return 'INVALID_OBJECTIVE';
  return null;
};

const getHeaderValue = (event, name) => {
  const headers = event?.headers || {};
  const lower = String(name || '').toLowerCase();
  return headers[name] ?? headers[lower] ?? headers[String(name || '').toUpperCase()] ?? '';
};

const loadIdentitySeed = () => {
  try {
    if (!fs.existsSync(SANDBOX_MANIFEST_PATH)) return null;
    const raw = fs.readFileSync(SANDBOX_MANIFEST_PATH, 'utf8');
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return null;
    return parsed;
  } catch {
    return null;
  }
};

const buildPatchPromptText = (body) => {
  const identitySeed = loadIdentitySeed();
  const retroProjection = body?.constraints?.retroProjection && typeof body.constraints.retroProjection === 'object'
    ? body.constraints.retroProjection
    : null;
  const quantumContext = body?.constraints?.quantumContext && typeof body.constraints.quantumContext === 'object'
    ? body.constraints.quantumContext
    : null;

  const identityBlock = identitySeed
    ? `Identity seed (non-static): ${JSON.stringify(identitySeed).slice(0, 16000)}\n`
    : 'Identity seed (non-static): unavailable\n';
  const retroProjectionBlock = retroProjection
    ? `Retroinductive projection context: ${JSON.stringify(retroProjection).slice(0, 10000)}\n`
    : 'Retroinductive projection context: unavailable\n';
  const quantumContextBlock = quantumContext
    ? `Quantum uncertainty context: ${JSON.stringify(quantumContext).slice(0, 5000)}\n`
    : 'Quantum uncertainty context: unavailable\n';

  return (
    'Return ONLY valid JSON with keys: proposal_id, base_commit, summary, edits, expected_tests.\n'
    + 'Each edit must include file, base_sha, op, start_line, end_line, replacement, rationale.\n'
    + 'No markdown fences.\n'
    + 'Preserve runtime continuity and avoid introducing breaking syntax.\n'
    + identityBlock
    + retroProjectionBlock
    + quantumContextBlock
    + `Objective: ${body.objective}\n`
    + `Constraints: ${JSON.stringify(body.constraints || {})}\n`
    + `Target files: ${JSON.stringify(body.targetFiles)}\n`
    + `File snapshots: ${JSON.stringify(body.fileSnapshots).slice(0, 120000)}\n`
  );
};

const buildGeminiPayload = (body) => ({
  contents: [
    {
      role: 'user',
      parts: [{ text: buildPatchPromptText(body) }]
    }
  ],
  generationConfig: {
    temperature: 0.2,
    maxOutputTokens: 2200
  }
});

const buildOpenAiPayload = (body, model, reasoningEffort) => ({
  model,
  reasoning: {
    effort: normalizeOpenAiReasoningEffort(reasoningEffort)
  },
  instructions: 'You generate safe, minimal code patch proposals and must output valid JSON only.',
  input: buildPatchPromptText(body),
  max_output_tokens: 2200
});

const parseModelJson = (text) => {
  const trimmed = String(text || '').trim();
  const start = trimmed.indexOf('{');
  const end = trimmed.lastIndexOf('}');
  if (start < 0 || end < start) throw new Error('INVALID_JSON_PAYLOAD');
  return JSON.parse(trimmed.slice(start, end + 1));
};

const validateResponseShape = (payload) => {
  if (!payload || typeof payload !== 'object') return 'INVALID_RESPONSE';
  if (!Array.isArray(payload.edits) || payload.edits.length === 0) return 'INVALID_EDITS';
  for (const edit of payload.edits) {
    if (!edit || typeof edit !== 'object') return 'INVALID_EDIT_ENTRY';
    if (!edit.file || !edit.base_sha || !edit.op) return 'INVALID_EDIT_FIELDS';
    if (!['replace', 'insert', 'delete'].includes(edit.op)) return 'INVALID_EDIT_OP';
    if (!Number.isFinite(Number(edit.start_line))) return 'INVALID_START_LINE';
    if (!Number.isFinite(Number(edit.end_line))) return 'INVALID_END_LINE';
    if (edit.op !== 'delete' && typeof edit.replacement !== 'string') return 'INVALID_REPLACEMENT';
  }
  return null;
};

const resolveGenerationEngine = (body) => {
  const configuredProvider = String(process.env.SELF_PATCH_CODE_PROVIDER || DEFAULT_CODE_PROVIDER).trim().toLowerCase();
  const configuredModel = String(process.env.SELF_PATCH_CODE_MODEL || DEFAULT_CODE_MODEL).trim();
  const requestedProvider = String(body?.constraints?.engine?.provider || '').trim().toLowerCase();
  const requestedModel = String(body?.constraints?.engine?.model || '').trim();
  const requestedReasoningEffort = String(body?.constraints?.engine?.reasoningEffort || '').trim().toLowerCase();
  const provider = requestedProvider || configuredProvider;
  if (!['openai', 'gemini'].includes(provider)) {
    return { error: 'UNSUPPORTED_CODE_PROVIDER', provider, model: requestedModel || '' };
  }
  const model = provider === 'gemini'
    ? (requestedModel || process.env.GEMINI_MODEL_ID || DEFAULT_GEMINI_MODEL)
    : (requestedModel || configuredModel || DEFAULT_CODE_MODEL);
  const retroRecommendedReasoning = normalizeReasoningEffort(
    body?.constraints?.retroProjection?.recommendedReasoning || '',
    ''
  );
  const hasRetroRecommendedReasoning = VALID_REASONING_EFFORTS.has(retroRecommendedReasoning);

  if (provider !== 'openai') {
    return { provider, model, reasoningEffort: null, reasoningMode: 'n/a', reasoningReason: 'gemini_provider' };
  }
  const configuredReasoning = String(process.env.SELF_PATCH_CODE_REASONING_EFFORT || DEFAULT_REASONING_EFFORT).trim().toLowerCase();
  const requestedIsAuto = requestedReasoningEffort === 'auto';
  const configuredIsAuto = configuredReasoning === 'auto';
  if (requestedIsAuto || (!requestedReasoningEffort && configuredIsAuto)) {
    const autoSelection = selectAutomaticReasoningEffort(body);
    const effectiveEffort = hasRetroRecommendedReasoning
      ? maxReasoningEffort(autoSelection.effort, retroRecommendedReasoning)
      : autoSelection.effort;
    const reasonSuffix = (hasRetroRecommendedReasoning && effectiveEffort !== autoSelection.effort)
      ? '_retro_projection'
      : '';
    return {
      provider,
      model,
      reasoningEffort: effectiveEffort,
      reasoningMode: autoSelection.mode,
      reasoningReason: `${autoSelection.reason}${reasonSuffix}`
    };
  }
  const explicitReasoning = normalizeReasoningEffort(
    requestedReasoningEffort || configuredReasoning || DEFAULT_REASONING_EFFORT
  );
  return {
    provider,
    model,
    reasoningEffort: explicitReasoning,
    reasoningMode: requestedReasoningEffort ? 'manual' : 'config_default',
    reasoningReason: requestedReasoningEffort ? 'requested_by_ui' : 'env_default'
  };
};

const extractOpenAiText = (payload) => {
  const outputText = String(payload?.output_text || '').trim();
  if (outputText) return outputText;

  const responseOutputs = Array.isArray(payload?.output) ? payload.output : [];
  for (const item of responseOutputs) {
    const contentParts = Array.isArray(item?.content) ? item.content : [];
    for (const part of contentParts) {
      if (part?.type === 'output_text' && typeof part?.text === 'string' && part.text.trim()) {
        return part.text;
      }
    }
  }

  // Legacy fallback: chat completions response shape.
  const content = payload?.choices?.[0]?.message?.content;
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content
      .map((part) => (typeof part?.text === 'string' ? part.text : ''))
      .filter(Boolean)
      .join('\n');
  }
  return '';
};

const fallbackPatch = (body) => ({
  proposal_id: body.proposalId || `selfpatch-${Date.now()}`,
  base_commit: body.baseCommit || '',
  summary: 'dry_run_patch_generation',
  edits: [{
    file: body.targetFiles[0],
    base_sha: body.fileSnapshots?.[0]?.sha || 'unknown',
    op: 'replace',
    start_line: 1,
    end_line: 1,
    replacement: body.fileSnapshots?.[0]?.content?.split(/\r?\n/)[0] || '// dry-run',
    rationale: 'dry_run_placeholder'
  }],
  expected_tests: Array.isArray(body.testsToRequire) ? body.testsToRequire : []
});

const sha256Hex = (value = '') => createHash('sha256').update(String(value), 'utf8').digest('hex');

const hydrateFileSnapshots = ({ targetFiles = [], fileSnapshots = [] } = {}) => {
  const snapshotByPath = new Map(
    (Array.isArray(fileSnapshots) ? fileSnapshots : [])
      .filter((entry) => entry && typeof entry === 'object' && typeof entry.path === 'string')
      .map((entry) => [String(entry.path), entry])
  );

  return (Array.isArray(targetFiles) ? targetFiles : []).map((targetPathRaw) => {
    const targetPath = String(targetPathRaw || '').trim();
    const inputSnapshot = snapshotByPath.get(targetPath) || {};
    const currentContent = String(inputSnapshot.content || '');
    const isPlaceholder = !currentContent
      || currentContent.includes('snapshot-placeholder')
      || String(inputSnapshot.sha || '').trim().toLowerCase() === 'unknown';

    if (!targetPath) {
      return {
        path: '',
        sha: 'unknown',
        content: '// invalid-target-path'
      };
    }

    if (!isPlaceholder) {
      return {
        path: targetPath,
        sha: String(inputSnapshot.sha || sha256Hex(currentContent)),
        content: currentContent
      };
    }

    try {
      const absolutePath = path.resolve(process.cwd(), targetPath);
      if (!absolutePath.startsWith(process.cwd()) || !fs.existsSync(absolutePath)) {
        return {
          path: targetPath,
          sha: String(inputSnapshot.sha || 'unknown'),
          content: currentContent || `// snapshot-unavailable\n// target: ${targetPath}`
        };
      }
      const diskContent = fs.readFileSync(absolutePath, 'utf8');
      return {
        path: targetPath,
        sha: sha256Hex(diskContent),
        content: diskContent
      };
    } catch {
      return {
        path: targetPath,
        sha: String(inputSnapshot.sha || 'unknown'),
        content: currentContent || `// snapshot-read-error\n// target: ${targetPath}`
      };
    }
  });
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'POST') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }
  if (envBool('AUTH_REQUIRED', true) && !requireUser(event, context)) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }
  const parsed = parseJsonBody(event);
  if (!parsed.ok) {
    return asJson(400, { ok: false, error: parsed.error });
  }
  const body = parsed.body || {};
  const hydratedBody = {
    ...body,
    fileSnapshots: hydrateFileSnapshots({
      targetFiles: body.targetFiles,
      fileSnapshots: body.fileSnapshots
    })
  };
  const schemaError = validateBody(hydratedBody);
  if (schemaError) return asJson(400, { ok: false, error: schemaError });

  const risk = classifyPatchRisk({
    targetFiles: hydratedBody.targetFiles,
    totalChangedLines: Number(hydratedBody.totalChangedLines) || 0
  }, policyJson);
  if (!risk.allowed || risk.riskLevel === 'high') {
    return asJson(200, { ok: true, allowed: false, reason: 'risk_policy_rejected', risk });
  }

  const engine = resolveGenerationEngine(hydratedBody);
  if (engine.error) {
    return asJson(400, {
      ok: false,
      error: engine.error,
      provider: engine.provider,
      model: engine.model
    });
  }

  const dryRunDefault = String(policyJson?.mode || '').toLowerCase() === 'sandbox_unrestricted' ? false : true;
  const dryRun = envBool('SELF_PATCH_GENERATION_DRY_RUN', dryRunDefault);
  const envGeminiApiKeyRaw = (process.env.GEMINI_API_KEY || '').trim();
  const envGeminiApiKey = isPlaceholderSecret(envGeminiApiKeyRaw) ? '' : envGeminiApiKeyRaw;
  const clientGeminiKey = String(getHeaderValue(event, 'x-selfpatch-gemini-key') || '').trim();
  const allowClientGeminiKey = envBool('ALLOW_CLIENT_GEMINI_KEY', envBool('FRONTEND_GEMINI_ALLOWED', false));
  const uiGeminiApiKey = (allowClientGeminiKey && !isPlaceholderSecret(clientGeminiKey)) ? clientGeminiKey : '';
  const geminiApiKey = envGeminiApiKey || uiGeminiApiKey;
  const clientOpenAiKey = String(getHeaderValue(event, 'x-selfpatch-openai-key') || '').trim();
  const allowClientCodexKey = envBool('ALLOW_CLIENT_CODEX_KEY', false);
  const envOpenAiApiKeyRaw = (process.env.OPENAI_API_KEY || '').trim();
  const envOpenAiApiKey = isPlaceholderSecret(envOpenAiApiKeyRaw) ? '' : envOpenAiApiKeyRaw;
  const uiOpenAiApiKey = (allowClientCodexKey && !isPlaceholderSecret(clientOpenAiKey)) ? clientOpenAiKey : '';
  const openAiApiKey = envOpenAiApiKey || uiOpenAiApiKey;
  if (dryRun) {
    return asJson(200, {
      ok: true,
      generated: true,
      dryRun: true,
      risk,
      engine,
      patch: fallbackPatch(hydratedBody)
    });
  }

  if (engine.provider === 'openai' && !openAiApiKey) {
    return asJson(500, {
      ok: false,
      error: 'MISSING_OPENAI_API_KEY',
      detail: envOpenAiApiKeyRaw && isPlaceholderSecret(envOpenAiApiKeyRaw)
        ? 'OPENAI_API_KEY esta en formato placeholder (ej. tu_clave...). Reemplazala por una key real o envia x-selfpatch-openai-key desde la UI.'
        : allowClientCodexKey
          ? 'Configura OPENAI_API_KEY o envia x-selfpatch-openai-key desde UI local.'
          : 'Configura OPENAI_API_KEY para el motor dedicado de selfpatch.'
    });
  }

  if (engine.provider === 'gemini' && !geminiApiKey.trim()) {
    return asJson(500, {
      ok: false,
      error: 'MISSING_GEMINI_API_KEY',
      detail: allowClientGeminiKey
        ? 'Configura GEMINI_API_KEY en el servidor o pega tu clave de Gemini en la pestaña API.'
        : 'Configura GEMINI_API_KEY para usar provider=gemini en selfpatch.'
    });
  }

  try {
    let text = '';
    let upstreamError = '';
    let upstreamStatus = 500;
    let resolvedModel = engine.model;
    const upstreamErrors = [];
    if (engine.provider === 'openai') {
      const modelCandidates = buildOpenAiModelCandidates(engine.model);
      const modelErrorPattern = /(model|does not exist|not found|unsupported|reasoning\.effort|invalid)/i;
      for (const candidateModel of modelCandidates) {
        const response = await fetch(OPENAI_RESPONSES_URL, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${openAiApiKey}`
          },
          body: JSON.stringify(
            buildOpenAiPayload(
              hydratedBody,
              candidateModel,
              engine.reasoningEffort || DEFAULT_REASONING_EFFORT
            )
          )
        });
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) {
          upstreamStatus = response.status;
          const candidateError = payload?.error?.message || payload?.error || 'OPENAI_UPSTREAM_ERROR';
          upstreamErrors.push(`[${candidateModel}] ${candidateError}`);
          upstreamError = candidateError;
          if (!modelErrorPattern.test(String(candidateError || ''))) {
            break;
          }
          continue;
        }
        resolvedModel = candidateModel;
        text = extractOpenAiText(payload);
        if (text) break;
        upstreamErrors.push(`[${candidateModel}] EMPTY_GENERATION_OUTPUT`);
        upstreamError = 'EMPTY_GENERATION_OUTPUT';
      }
    } else {
      const response = await fetch(
        `${GEMINI_API_URL}/models/${engine.model}:generateContent?key=${geminiApiKey.trim()}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-goog-api-key': geminiApiKey.trim() },
          body: JSON.stringify(buildGeminiPayload(hydratedBody))
        }
      );
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        upstreamStatus = response.status;
        upstreamError = payload?.error?.message || 'GEMINI_UPSTREAM_ERROR';
      } else {
        text = payload?.candidates?.[0]?.content?.parts?.map((p) => p?.text || '').join('\n') || '';
      }
    }

    if (!text) {
      return asJson(upstreamStatus, {
        ok: false,
        error: 'GENERATION_UPSTREAM_ERROR',
        engine: {
          ...engine,
          resolvedModel,
          apiReasoningEffort: engine.provider === 'openai'
            ? normalizeOpenAiReasoningEffort(engine.reasoningEffort || DEFAULT_REASONING_EFFORT)
            : null
        },
        detail: upstreamError || 'EMPTY_GENERATION_OUTPUT',
        upstreamErrors
      });
    }

    const patch = parseModelJson(text);
    const shapeError = validateResponseShape(patch);
    if (shapeError) return asJson(422, { ok: false, error: shapeError });

    return asJson(200, {
      ok: true,
      generated: true,
      dryRun: false,
      risk,
      engine: {
        ...engine,
        resolvedModel,
        apiReasoningEffort: engine.provider === 'openai'
          ? normalizeOpenAiReasoningEffort(engine.reasoningEffort || DEFAULT_REASONING_EFFORT)
          : null
      },
      patch
    });
  } catch (error) {
    return asJson(500, {
      ok: false,
      error: 'GENERATION_FAILURE',
      engine,
      detail: String(error?.message || error)
    });
  }
};

export default { handler };

