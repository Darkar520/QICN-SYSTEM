import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { isLocalRuntimeRequest, serveRuntimeStatic } from '../scripts/runtime-static-server.mjs';

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'qicn-public-boundary-'));
const publicRoot = path.join(root, 'dist');
await fs.mkdir(publicRoot);
await fs.writeFile(path.join(root, '.env'), 'SYNTHETIC_SECRET=never-public');
await fs.writeFile(path.join(root, 'package.json'), '{"private":true}');
await fs.writeFile(path.join(publicRoot, 'index.html'), '<main>QICN fixture</main>');
await fs.writeFile(path.join(publicRoot, 'bundle.js'), '// synthetic bundle');
const server = http.createServer((req, res) => {
  if (!isLocalRuntimeRequest(req, server.address().port)) {
    res.writeHead(403);
    res.end();
    return;
  }
  serveRuntimeStatic(req, res, new URL(req.url, 'http://localhost').pathname, publicRoot)
    .catch(() => { res.writeHead(500); res.end(); });
});
try {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  for (const route of ['/', '/console']) {
    const response = await fetch(base + route);
    assert.equal(response.status, 200);
    assert.match(await response.text(), /QICN fixture/);
  }
  for (const route of ['/.env', '/%2eenv', '/.git/config', '/%2e%2e%5c.env']) {
    assert.equal((await fetch(base + route)).status, 403, route);
  }
  assert.equal((await fetch(base + '/package.json')).status, 404);
  assert.equal((await fetch(base + '/missing.js')).status, 404);
  assert.equal((await fetch(base + '/bundle.js', { method: 'HEAD' })).status, 200);
  assert.equal((await fetch(base + '/', { method: 'POST' })).status, 405);
  assert.equal((await fetch(base + '/bad%ZZ')).status, 400);
  assert.equal((await fetch(base + '/', { headers: { Origin: 'https://fixture.invalid' } })).status, 403);
  assert.equal((await fetch(base + '/', { headers: { Origin: base } })).status, 200);
  assert.equal(isLocalRuntimeRequest({ headers: { host: `fixture.invalid:${server.address().port}` } }, server.address().port), false);
} finally {
  await new Promise((resolve) => server.close(resolve));
  await fs.rm(root, { recursive: true, force: true });
}
console.log('[local-static-boundary] PASS');
