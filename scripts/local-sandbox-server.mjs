import http from 'node:http';
import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import dotenv from 'dotenv';
import { isLocalRuntimeRequest, serveRuntimeStatic } from './runtime-static-server.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PROJECT_ROOT = path.resolve(__dirname, '..');
const PORT = Number(process.env.PORT || 3000);

dotenv.config({
  path: path.join(PROJECT_ROOT, '.env'),
  override: true
});

// Hard override from project .env to avoid inherited shell placeholders
// (e.g. OPENAI_API_KEY=tu_clave_openai in parent environment).
try {
  const rawEnv = fs.readFileSync(path.join(PROJECT_ROOT, '.env'), 'utf8');
  const parsedEnv = dotenv.parse(rawEnv);
  for (const [key, value] of Object.entries(parsedEnv)) {
    process.env[key] = value;
  }
} catch {
  // noop: dotenv.config above already attempted loading
}

const FUNCTION_MODULES = {
  'auth-introspection': 'netlify/functions/auth-introspection.js',
  'killswitch-state': 'netlify/functions/killswitch-state.js',
  'llm-proxy': 'netlify/functions/llm-proxy.js',
  'runtime-health': 'netlify/functions/runtime-health.js',
  'selfpatch-apply': 'netlify/functions/selfpatch-apply.js',
  'selfpatch-generate': 'netlify/functions/selfpatch-generate.js',
  'selfpatch-plan': 'netlify/functions/selfpatch-plan.js',
  'selfpatch-rollback': 'netlify/functions/selfpatch-rollback.js',
  'selfpatch-status': 'netlify/functions/selfpatch-status.js',
  'quantum-entropy': 'netlify/functions/quantum-entropy.js'
};

const functionCache = new Map();

const loadFunction = async (name) => {
  if (functionCache.has(name)) return functionCache.get(name);
  const relPath = FUNCTION_MODULES[name];
  if (!relPath) return null;
  const absPath = path.resolve(PROJECT_ROOT, relPath);
  const mod = await import(pathToFileURL(absPath).href);
  const handler = mod?.handler;
  if (typeof handler !== 'function') {
    throw new Error(`Function "${name}" does not export handler`);
  }
  functionCache.set(name, handler);
  return handler;
};

const parseBody = async (req) => {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return Buffer.concat(chunks).toString('utf8');
};

const send = (res, statusCode, headers = {}, body = '') => {
  const normalizedBody = typeof body === 'string' ? body : JSON.stringify(body ?? {});
  res.writeHead(statusCode, headers);
  res.end(normalizedBody);
};

const handleFunction = async (req, res, urlObj) => {
  const fnName = urlObj.pathname.replace('/.netlify/functions/', '').split('/')[0];
  const handler = await loadFunction(fnName);
  if (!handler) {
    send(res, 404, { 'content-type': 'application/json; charset=utf-8' }, { error: `Unknown function: ${fnName}` });
    return;
  }

  if (req.method === 'OPTIONS') {
    send(res, 204, {});
    return;
  }

  const body = ['GET', 'HEAD'].includes(req.method || '') ? null : await parseBody(req);
  const queryStringParameters = {};
  for (const [k, v] of urlObj.searchParams.entries()) queryStringParameters[k] = v;

  const event = {
    rawUrl: urlObj.toString(),
    path: urlObj.pathname,
    httpMethod: req.method,
    headers: req.headers,
    queryStringParameters,
    body,
    isBase64Encoded: false
  };

  try {
    const response = await handler(event, {});
    const statusCode = Number(response?.statusCode || 200);
    const headers = response?.headers || { 'content-type': 'application/json; charset=utf-8' };
    const responseBody = response?.body ?? '';
    send(res, statusCode, headers, responseBody);
  } catch (error) {
    send(res, 500, { 'content-type': 'application/json; charset=utf-8' }, {
      error: 'Local function execution failed',
      message: error?.message || String(error)
    });
  }
};

const server = http.createServer(async (req, res) => {
  try {
    if (!isLocalRuntimeRequest(req, server.address().port)) {
      send(res, 403, { 'content-type': 'text/plain; charset=utf-8' }, 'Forbidden');
      return;
    }
    const host = req.headers.host || `localhost:${PORT}`;
    const urlObj = new URL(req.url || '/', `http://${host}`);
    if (urlObj.pathname.startsWith('/.netlify/functions/')) {
      await handleFunction(req, res, urlObj);
      return;
    }
    await serveRuntimeStatic(req, res, urlObj.pathname, path.join(PROJECT_ROOT, 'dist'));
  } catch (error) {
    send(res, 500, { 'content-type': 'text/plain; charset=utf-8' }, `Server error: ${error?.message || error}`);
  }
});

server.listen(PORT, '127.0.0.1', () => {
  // eslint-disable-next-line no-console
  console.log(`[sandbox-local] listening on http://localhost:${PORT}`);
  // eslint-disable-next-line no-console
  console.log('[sandbox-local] functions path active: /.netlify/functions/*');
});
