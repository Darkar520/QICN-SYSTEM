#!/usr/bin/env node
// Probe: real Gemini realizations through the local llm-proxy (server key only;
// this script never reads or sends an API key). For each question it builds a
// turn with the language engine, sends the v3 prompt, verifies the answer with
// contract v3, allows one bounded correction, and records the route, the
// discrepancy reasons and the latency. Internal measurement only.
//
// Usage: node --import ./tests/lib/register-loader.mjs scripts/probe-gemini-realization.mjs
//        [--url=http://127.0.0.1:3320] [--delay-ms=6000] [--out=docs/evidence/2026-11-08/gemini_realization_probe.json]
//        [--questions="a|b|c"]
import fs from 'node:fs';
import path from 'node:path';
import { prepareTurn, finalizeTurn, evaluateRealization, correctionPromptFor } from '../src/language/conversationEngine.js';
import { makeFakeCore, makeSnapshot, makeLedger } from '../tests/fixtures/languageFixtures.mjs';

const args = Object.fromEntries(process.argv.slice(2).map((a) => {
  const [k, ...v] = a.replace(/^--/, '').split('=');
  return [k, v.length ? v.join('=') : true];
}));
const BASE = String(args.url || 'http://127.0.0.1:3320').replace(/\/$/, '');
const DELAY = Number(args['delay-ms'] ?? 6000);
// --contract=free tests the chat default (v4, free prose); default stays v3.
const CONTRACT = args.contract === 'free' ? 'free' : 'verified';
const OUT = args.out || 'docs/evidence/2026-11-08/gemini_realization_probe.json';
const QUESTIONS = String(args.questions || [
  '¿Cómo va el sistema?',
  '¿Qué ha cambiado desde la última respuesta?',
  'ERES METACONSCIENTE? QUE ERES?',
  '¿qué parámetros usas?',
  '¿eres consciente?',
  '¿cuánto vale CCC?'
].join('|')).split('|').map((q) => q.trim()).filter(Boolean);

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// --replay=a.json,b.json re-verifies recorded real Gemini outputs with the
// current contract, in the same turn flow, without calling Gemini.
const REPLAY = args.replay ? String(args.replay).split(',').map((f) => JSON.parse(fs.readFileSync(path.resolve(f), 'utf8'))) : null;
if (REPLAY) {
  const rows = [];
  for (const [fileIndex, report] of REPLAY.entries()) {
    // Same construction as the recorded run: fresh ledger, same ticks and order.
    const { ledger: replayLedger } = makeLedger();
    const replayTurns = [];
    let replayTick = 120;
    for (const [index, item] of report.results.entries()) {
      replayTick += 40;
      const core = makeFakeCore({ ontologicalState: { coherence: 0.74 + index * 0.013 } }).core;
      const prepared = prepareTurn({ question: item.question, snapshot: makeSnapshot({ tick: replayTick, core }), ledger: replayLedger, turns: replayTurns, turnIndex: index, contract: CONTRACT });
      const recorded = item.attempts.filter((a) => typeof a.raw === 'string' && a.raw.length === a.rawLength);
      const verdicts = recorded.map((a) => {
        const e = evaluateRealization(prepared, a.raw);
        return { attempt: a.attempt, recordedOk: Boolean(a.ok), nowOk: e.ok, error: e.error || null, reasons: (e.verification?.discrepancies || []).map((d) => `${d.reason}${d.detail ? `:${d.detail}` : ''}`) };
      });
      const outcome = finalizeTurn(prepared, { mode: 'gemini', attempts: recorded.map((a) => ({ modelText: a.raw })), provider: { provider: 'gemini_replay' } });
      replayTurns.push(outcome.record);
      if (verdicts.length) rows.push({ source: fileIndex, question: item.question, route: outcome.trace.route, verdicts, published: outcome.trace.route === 'gemini_verified' ? outcome.text : null });
    }
  }
  const attempts = rows.flatMap((r) => r.verdicts);
  const summary = { turnsWithOutput: rows.length, verifiedTurns: rows.filter((r) => ['gemini_verified', 'gemini_free_checked'].includes(r.route)).length, contract: CONTRACT, attempts: attempts.length, attemptsVerified: attempts.filter((a) => a.nowOk).length, invalidJson: attempts.filter((a) => a.error === 'realization_invalid_json').length };
  const out = { schema: 'qicn.gemini_realization_replay.v1', evidence_scope: 'internal_support_only', note: 'Recorded real Gemini outputs re-verified with the current contract v3. Outputs truncated in the recording are skipped.', at: new Date().toISOString(), summary, rows };
  fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
  fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(out, null, 2)}\n`);
  console.log(JSON.stringify(summary));
  for (const r of rows) for (const v of r.verdicts) if (!v.nowOk) console.log(`[replay] ${r.question} #${v.attempt}: ${v.error || v.reasons.join(', ')}`);
  process.exit(0);
}

const callGemini = async (systemText, question) => {
  const started = Date.now();
  const body = {
    provider: 'gemini',
    model: 'gemini-3-flash-preview',
    messages: [{ role: 'user', content: question }],
    rawPayload: {
      contents: [{ role: 'user', parts: [{ text: question }] }],
      systemInstruction: { parts: [{ text: systemText }] },
      // Same generation settings as the chat in SimulationEngine.jsx.
      generationConfig: { maxOutputTokens: 65536, temperature: 0.4, topP: 0.9, responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'high' } }
    }
  };
  const resp = await fetch(`${BASE}/.netlify/functions/llm-proxy`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const data = await resp.json().catch(() => ({}));
  const latencyMs = Date.now() - started;
  if (!resp.ok || !data.ok) {
    const err = new Error(String(data.error || `HTTP_${resp.status}`).slice(0, 900));
    err.code = `HTTP_${resp.status}`;
    err.status = resp.status;
    err.latencyMs = latencyMs;
    throw err;
  }
  return { text: String(data.content || ''), model: data.model || null, latencyMs };
};

const { ledger } = makeLedger();
const turns = [];
const results = [];
let tick = 120;
for (const [index, question] of QUESTIONS.entries()) {
  tick += 40;
  const core = makeFakeCore({ ontologicalState: { coherence: 0.74 + index * 0.013 } }).core;
  const prepared = prepareTurn({ question, snapshot: makeSnapshot({ tick, core }), ledger, turns, turnIndex: index, contract: CONTRACT });
  const attempts = [];
  const log = [];
  let systemText = prepared.prompt;
  let model = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const r = await callGemini(systemText, question);
      model = r.model;
      attempts.push({ modelText: r.text });
      const evaluation = evaluateRealization(prepared, r.text);
      log.push({ attempt, latencyMs: r.latencyMs, ok: evaluation.ok, error: evaluation.error || null, reasons: (evaluation.verification?.discrepancies || []).slice(0, 12), rawLength: r.text.length, raw: r.text.slice(0, 6000) });
      if (evaluation.ok) break;
      systemText = correctionPromptFor(prepared, r.text, evaluation);
    } catch (error) {
      attempts.push({ modelError: error });
      log.push({ attempt, latencyMs: error.latencyMs ?? null, transportError: error.code, message: error.message });
      break;
    }
    if (DELAY) await sleep(DELAY);
  }
  const outcome = finalizeTurn(prepared, { mode: 'gemini', attempts, provider: { provider: 'gemini', model } });
  turns.push(outcome.record);
  results.push({ question, intent: prepared.intent?.intent ?? null, route: outcome.trace.route, published: outcome.text, attempts: log });
  console.log(`[probe] ${outcome.trace.route.padEnd(18)} ${question}`);
  for (const a of log) if (!a.ok) console.log(`        attempt ${a.attempt}: ${a.transportError || a.error || ''} ${(a.reasons || []).map((r) => `${r.reason}${r.detail ? `:${r.detail}` : ''}`).join(', ')}`);
  if (DELAY) await sleep(DELAY);
}

const count = (route) => results.filter((r) => r.route === route).length;
const report = {
  schema: 'qicn.gemini_realization_probe.v1',
  evidence_scope: 'internal_support_only',
  note: 'Real Gemini calls through the local llm-proxy with the server-side key. Snapshots come from test fixtures, not from a live run. Measures how often faithful realizations pass contract v3; it is not external validation.',
  at: new Date().toISOString(),
  endpoint: `${BASE}/.netlify/functions/llm-proxy`,
  summary: { contract: CONTRACT, turns: results.length, gemini_verified: count('gemini_verified'), gemini_free_checked: count('gemini_free_checked'), gemini_rejected: count('gemini_rejected'), gemini_unavailable: count('gemini_unavailable') },
  results
};
fs.mkdirSync(path.dirname(path.resolve(OUT)), { recursive: true });
fs.writeFileSync(path.resolve(OUT), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report.summary));
