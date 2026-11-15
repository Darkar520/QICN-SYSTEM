import fs from 'node:fs';
import fsp from 'node:fs/promises';
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'application/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg', '.webp': 'image/webp', '.ico': 'image/x-icon',
  '.webmanifest': 'application/manifest+json; charset=utf-8'
};
const within = (root, target) => {
  const relative = path.relative(root, target);
  return relative !== '..' && !relative.startsWith(`..${path.sep}`) && !path.isAbsolute(relative);
};
const reject = (res, status, text) => {
  res.writeHead(status, { 'content-type': 'text/plain; charset=utf-8' });
  res.end(text);
};

export const isLocalRuntimeRequest = (req, port) => {
  const host = String(req.headers.host || '').toLowerCase();
  const hosts = [`127.0.0.1:${port}`, `localhost:${port}`];
  if (port === 80) hosts.push('127.0.0.1', 'localhost');
  if (!hosts.includes(host)) return false;
  // Prevent third-party pages from invoking a loopback server running in local dev mode.
  const origin = req.headers.origin;
  return (!origin || origin === `http://${host}`) && req.headers['sec-fetch-site'] !== 'cross-site';
};

// Serve only build outputs. Repository files and dotfiles are never public.
export const serveRuntimeStatic = async (req, res, pathname, publicRoot) => {
  if (!['GET', 'HEAD'].includes(req.method)) return reject(res, 405, 'Method not allowed');
  let decoded;
  try { decoded = decodeURIComponent(pathname); }
  catch { return reject(res, 400, 'Invalid path'); }
  if (decoded.includes('\0') || decoded.includes('\\') ||
      decoded.split('/').some((part) => part.startsWith('.'))) {
    return reject(res, 403, 'Forbidden');
  }
  let root;
  try { root = await fsp.realpath(publicRoot); }
  catch { return reject(res, 503, 'Build unavailable. Run npm run build.'); }
  let target = path.resolve(root, `.${decoded === '/' ? '/index.html' : decoded}`);
  if (!within(root, target)) return reject(res, 403, 'Forbidden');
  try {
    const stat = await fsp.stat(target);
    if (stat.isDirectory()) target = path.join(target, 'index.html');
    target = await fsp.realpath(target);
  } catch {
    // SPA fallback is only for routes, never for missing assets or private files.
    if (path.extname(decoded)) return reject(res, 404, 'Not found');
    try { target = await fsp.realpath(path.join(root, 'index.html')); }
    catch { return reject(res, 503, 'Build unavailable. Run npm run build.'); }
  }
  if (!within(root, target)) return reject(res, 403, 'Forbidden');
  if (!(await fsp.stat(target)).isFile()) return reject(res, 404, 'Not found');
  res.writeHead(200, { 'content-type': TYPES[path.extname(target)] || 'application/octet-stream' });
  if (req.method === 'HEAD') return res.end();
  const stream = fs.createReadStream(target);
  stream.on('error', () => res.destroy());
  stream.pipe(res);
};
