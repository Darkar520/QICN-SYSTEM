#!/usr/bin/env node
// Headless UI capture through the Chrome DevTools Protocol (Edge or Chrome).
// Used for the visual comparison between the ZIP runtime and the current one.
// No dependencies: Node 22+ built-in WebSocket and fetch.
//
// Usage:
//   node scripts/capture-ui-screenshots.mjs --url=http://127.0.0.1:3320/ --label=current \
//     --out=docs/visual-evidence/2026-11-07 [--tabs=default,network,chat,memory] \
//     [--viewports=desktop,mobile] [--chat="¿Cómo estás ahora?"] [--chat-mode=local|gemini]
//
// Output: PNG per (viewport, tab) plus <label>-capture-report.json with console
// errors, uncaught exceptions and, if --chat is given, the published answers.
import { spawn } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const args = Object.fromEntries(process.argv.slice(2).map((arg) => {
  const [key, ...rest] = arg.replace(/^--/, '').split('=');
  return [key, rest.length ? rest.join('=') : 'true'];
}));

const URL_TARGET = args.url || 'http://127.0.0.1:3320/';
const LABEL = args.label || 'capture';
const OUT_DIR = path.resolve(args.out || 'docs/visual-evidence');
const TABS = (args.tabs || 'default,network,chat').split(',').map((t) => t.trim()).filter(Boolean);
const VIEWPORTS = {
  desktop: { width: 1440, height: 900, mobile: false, deviceScaleFactor: 1 },
  mobile: { width: 390, height: 844, mobile: true, deviceScaleFactor: 2 }
};
const VIEWPORT_NAMES = (args.viewports || 'desktop,mobile').split(',').map((v) => v.trim()).filter((v) => VIEWPORTS[v]);
const CHAT_QUESTIONS = args.chat ? args.chat.split('|').map((q) => q.trim()).filter(Boolean) : [];
const CHAT_MODE = args['chat-mode'] === 'gemini' ? 'gemini' : 'local';
const SETTLE_MS = Number(args.settle || 3500);
const PORT = Number(args.port || 9333);

const BROWSERS = [
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Microsoft/Edge/Application/msedge.exe',
  'C:/Program Files/Google/Chrome/Application/chrome.exe'
];

if (args['self-test']) {
  if (!VIEWPORTS.desktop || !VIEWPORTS.mobile) throw new Error('viewport table missing');
  if (TABS.length === 0) throw new Error('tab list empty');
  console.log('OK: capture-ui-screenshots self-test passed');
  process.exit(0);
}

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function waitForJson(url, attempts = 50) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      const res = await fetch(url);
      if (res.ok) return await res.json();
    } catch {
      // browser not ready yet
    }
    await sleep(200);
  }
  throw new Error(`DevTools endpoint not reachable: ${url}`);
}

class CdpClient {
  constructor(wsUrl) {
    this.ws = new WebSocket(wsUrl);
    this.nextId = 1;
    this.pending = new Map();
    this.listeners = [];
    this.ready = new Promise((resolve, reject) => {
      this.ws.addEventListener('open', resolve, { once: true });
      this.ws.addEventListener('error', reject, { once: true });
    });
    this.ws.addEventListener('message', (event) => {
      const msg = JSON.parse(typeof event.data === 'string' ? event.data : Buffer.from(event.data).toString('utf8'));
      if (msg.id && this.pending.has(msg.id)) {
        const { resolve, reject } = this.pending.get(msg.id);
        this.pending.delete(msg.id);
        if (msg.error) reject(new Error(`${msg.error.message} (${msg.error.code})`));
        else resolve(msg.result);
      } else if (msg.method) {
        for (const listener of this.listeners) listener(msg);
      }
    });
  }

  send(method, params = {}, sessionId = undefined) {
    const id = this.nextId++;
    const payload = { id, method, params };
    if (sessionId) payload.sessionId = sessionId;
    this.ws.send(JSON.stringify(payload));
    return new Promise((resolve, reject) => this.pending.set(id, { resolve, reject }));
  }

  on(listener) {
    this.listeners.push(listener);
  }

  close() {
    try { this.ws.close(); } catch { /* ignore */ }
  }
}

async function evaluate(client, sessionId, expression) {
  const result = await client.send('Runtime.evaluate', { expression, awaitPromise: true, returnByValue: true }, sessionId);
  if (result.exceptionDetails) throw new Error(`evaluate failed: ${result.exceptionDetails.text}`);
  return result.result?.value;
}

// Opens a tab by its visible label. Primary tabs are direct buttons; the rest
// sit behind the "Mas" menu in both runtimes.
const openTabScript = (label) => `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const find = () => [...document.querySelectorAll('button')].find((b) => {
    const first = b.querySelector('span span, span');
    const text = (first ? first.textContent : b.textContent || '').trim();
    return text === ${JSON.stringify(label)} || (b.textContent || '').trim().startsWith(${JSON.stringify(label)});
  });
  let button = find() || [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes(${JSON.stringify(label)}));
  if (!button) {
    const more = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').trim() === 'Mas');
    if (more) { more.click(); await sleep(400); }
    button = find();
  }
  if (!button) return false;
  button.click();
  await sleep(300);
  window.scrollTo(0, 0);
  return true;
})()`;

// Clicks the start button once (both runtimes label it "Iniciar ...").
const startScript = `(async () => {
  const buttons = [...document.querySelectorAll('button')];
  const button = buttons.find((b) => /Iniciar (simulaci|Singularidad)/i.test(b.textContent || ''));
  if (!button) return { started: false, candidates: buttons.map((b) => (b.textContent || '').trim()).filter(Boolean).slice(0, 40) };
  button.click();
  return { started: true };
})()`;

// Scroll to a heading (or the top) and wait for two frames so the capture is
// fully painted. The same anchor text exists in both runtimes.
const settleScript = (anchorText) => `(async () => {
  const anchor = ${JSON.stringify(anchorText || '')}
    ? [...document.querySelectorAll('h2, h3')].find((h) => (h.textContent || '').includes(${JSON.stringify(anchorText || '')}))
    : null;
  if (anchor) window.scrollTo(0, Math.max(0, anchor.getBoundingClientRect().top + window.scrollY - 8));
  else window.scrollTo(0, 0);
  await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)));
  await new Promise((r) => setTimeout(r, 500));
  return document.body.scrollHeight;
})()`;

const chatTurnScript = (question) => `(async () => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const field = document.querySelector('textarea[name="chatInput"], input[name="chatInput"]');
  if (!field) return { ok: false, reason: 'chat_input_not_found' };
  const log = document.querySelector('[role="log"]') || field.form?.previousElementSibling;
  const before = document.querySelectorAll('article, .max-w-\\\\[80\\\\%\\\\]').length;
  const setter = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(field), 'value').set;
  setter.call(field, ${JSON.stringify(question)});
  field.dispatchEvent(new Event('input', { bubbles: true }));
  field.form.requestSubmit();
  for (let i = 0; i < 120; i += 1) {
    await sleep(500);
    const items = document.querySelectorAll('article, .max-w-\\\\[80\\\\%\\\\]');
    const busy = document.querySelector('[role="status"]');
    if (items.length >= before + 2 && !(busy && /Consultando|Componiendo/.test(busy.textContent || ''))) {
      const last = items[items.length - 1];
      return { ok: true, text: (last.textContent || '').replace(/\\s+/g, ' ').trim().slice(0, 1600), waitedMs: (i + 1) * 500 };
    }
  }
  return { ok: false, reason: 'timeout' };
})()`;

async function main() {
  const browserPath = BROWSERS.find((candidate) => fs.existsSync(candidate));
  if (!browserPath) throw new Error('No Edge/Chrome executable found.');
  fs.mkdirSync(OUT_DIR, { recursive: true });
  const profileDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qicn-cdp-'));
  const browser = spawn(browserPath, [
    '--headless=new',
    `--remote-debugging-port=${PORT}`,
    `--user-data-dir=${profileDir}`,
    '--no-first-run',
    '--no-default-browser-check',
    '--disable-extensions',
    ...(args['disable-gpu'] ? ['--disable-gpu'] : ['--use-angle=swiftshader', '--enable-unsafe-swiftshader']),
    'about:blank'
  ], { stdio: 'ignore' });

  const report = { label: LABEL, url: URL_TARGET, capturedAt: new Date().toISOString(), browser: path.basename(browserPath), captures: [], consoleErrors: [], exceptions: [], chat: [] };
  let client;
  try {
    const version = await waitForJson(`http://127.0.0.1:${PORT}/json/version`);
    client = new CdpClient(version.webSocketDebuggerUrl);
    await client.ready;
    client.on((msg) => {
      if (msg.method === 'Runtime.exceptionThrown') {
        report.exceptions.push(String(msg.params?.exceptionDetails?.exception?.description || msg.params?.exceptionDetails?.text || 'exception').slice(0, 400));
      }
      if (msg.method === 'Runtime.consoleAPICalled' && msg.params?.type === 'error') {
        const text = (msg.params.args || []).map((a) => a.value ?? a.description ?? '').join(' ');
        report.consoleErrors.push(String(text).slice(0, 300));
      }
    });

    for (const viewportName of VIEWPORT_NAMES) {
      const viewport = VIEWPORTS[viewportName];
      const { targetId } = await client.send('Target.createTarget', { url: 'about:blank' });
      const { sessionId } = await client.send('Target.attachToTarget', { targetId, flatten: true });
      await client.send('Page.enable', {}, sessionId);
      await client.send('Runtime.enable', {}, sessionId);
      await client.send('Emulation.setDeviceMetricsOverride', { ...viewport }, sessionId);
      if (viewport.mobile) await client.send('Emulation.setTouchEmulationEnabled', { enabled: true }, sessionId);
      // Chat realization mode is chosen before the app boots.
      await client.send('Page.addScriptToEvaluateOnNewDocument', {
        source: `try { localStorage.setItem('QICN_CHAT_REALIZATION_MODE', ${JSON.stringify(CHAT_MODE)}); } catch (e) {}`
      }, sessionId);
      // Optional: exercise the "own key" route with a key read from an
      // environment variable. The key lives only in the temporary profile and
      // is never written to the report.
      const keyName = args['frontend-key-from-env'];
      if (keyName && process.env[keyName]) {
        await client.send('Page.addScriptToEvaluateOnNewDocument', {
          source: `try { localStorage.setItem('QICN_FRONTEND_GEMINI_KEY', ${JSON.stringify(process.env[keyName])}); } catch (e) {}`
        }, sessionId);
        report.frontendKeyInjected = true;
      }
      await client.send('Page.navigate', { url: URL_TARGET }, sessionId);
      await sleep(SETTLE_MS);
      if (args.start) {
        report.started = await evaluate(client, sessionId, startScript);
        await sleep(Number(args['run-ms'] || 6000));
      }

      for (const tab of TABS) {
        const labels = { network: 'Red Nodal', chat: 'Chat', memory: 'Memoria', core: 'Núcleo', api: 'API', history: 'Historial' };
        let opened = true;
        if (tab !== 'default') opened = await evaluate(client, sessionId, openTabScript(labels[tab] || tab));
        await sleep(tab === 'network' ? 2500 : 900);
        if (tab === 'chat' && CHAT_QUESTIONS.length) {
          for (const question of CHAT_QUESTIONS) {
            const answer = await evaluate(client, sessionId, chatTurnScript(question));
            report.chat.push({ viewport: viewportName, mode: CHAT_MODE, question, ...answer });
          }
          await sleep(400);
        }
        const anchors = { chat: 'Comunicación', network: 'Red Nodal', memory: 'Registro operacional' };
        await evaluate(client, sessionId, settleScript(args['scroll-to-panel'] ? anchors[tab] : ''));
        if (args['dump-ledger'] && tab === TABS[TABS.length - 1]) {
          report.ledger = report.ledger || {};
          report.ledger[viewportName] = await evaluate(client, sessionId, `(() => {
            try {
              const data = JSON.parse(localStorage.getItem('QICN_OPERATIONAL_LEDGER_V1') || 'null');
              if (!data) return null;
              return { sessions: data.sessions.length, events: data.events.map((e) => ({ seq: e.seq, type: e.type, tick: e.tick, payload: e.payload })) };
            } catch (e) { return { error: String(e) }; }
          })()`);
        }
        const shot = await client.send('Page.captureScreenshot', { format: 'png', fromSurface: true }, sessionId);
        const file = path.join(OUT_DIR, `${LABEL}-${viewportName}-${tab}.png`);
        fs.writeFileSync(file, Buffer.from(shot.data, 'base64'));
        report.captures.push({ viewport: viewportName, tab, opened, file: path.relative(process.cwd(), file).replace(/\\/g, '/') });
      }
      await client.send('Target.closeTarget', { targetId });
    }
  } finally {
    client?.close();
    browser.kill();
    await sleep(300);
    try { fs.rmSync(profileDir, { recursive: true, force: true }); } catch { /* profile lock */ }
  }
  const reportFile = path.join(OUT_DIR, `${LABEL}-capture-report.json`);
  let serialized = `${JSON.stringify(report, null, 2)}\n`;
  const injectedKey = args['frontend-key-from-env'] ? process.env[args['frontend-key-from-env']] : '';
  if (injectedKey) serialized = serialized.split(injectedKey).join('[clave]');
  fs.writeFileSync(reportFile, serialized);
  console.log(JSON.stringify({ captures: report.captures.length, exceptions: report.exceptions.length, consoleErrors: report.consoleErrors.length, chat: report.chat.length, report: reportFile }, null, 2));
}

main().catch((error) => {
  console.error('[capture-ui-screenshots]', error.message);
  process.exit(1);
});
