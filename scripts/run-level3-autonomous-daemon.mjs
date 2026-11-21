#!/usr/bin/env node
/* global process, fetch, AbortSignal, console, URL */
// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Node headless daemon for unattended multi-hour Level 3 autonomous supervisor runs without browser timer throttling. Tracks external_llm_assisted honestly (true only when live external LLM is used; false on deterministic local fallback) and enforces external_support_certified=false.

import fs from 'node:fs';
import path from 'node:path';
import { QICNConfig } from '../services/config.js';
import { createHeadlessRuntimeSession } from '../src/runtime/HeadlessRuntimeSession.js';
import { NODAL_TOWER_COUPLING_MODES } from '../src/simulation/NodalTowerCouplingBridge.js';
import {
  LEVEL3_DEFAULT_POLICY,
  Level3SupervisorController,
  getQuotaSnapshot,
  readLevel3LiveTelemetry
} from '../src/simulation/Level3AutonomousSupervisor.js';
import {
  exportLevel3SealedAuditBundle,
  verifyLevel3SealedAuditBundle
} from '../src/simulation/Level3KnowledgeBelt.js';
import { sanitizeProviderMessage } from '../src/utils/llmTransport.js';

function parseArg(name, fallback = null) {
  const prefix = `--${name}=`;
  const hit = process.argv.find((a) => a.startsWith(prefix));
  return hit ? hit.slice(prefix.length) : fallback;
}

export async function callRemoteGeminiForDaemon(prompt, apiKey, {
  model = process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview',
  timeoutMs = 45000,
  fetchImpl = fetch
} = {}) {
  const safeModel = String(model || 'gemini-3-flash-preview').trim();
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(safeModel)}:generateContent`;
  const resp = await fetchImpl(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-goog-api-key': String(apiKey || '').trim()
    },
    signal: AbortSignal.timeout(Math.max(1000, Number(timeoutMs) || 45000)),
    body: JSON.stringify({
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      generationConfig: {
        temperature: 0.2,
        responseMimeType: 'application/json'
      }
    })
  });
  if (!resp.ok) {
    throw new Error(`gemini_http_${resp.status}`);
  }
  const data = await resp.json();
  const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
  return {
    rawText,
    reasonerSource: 'gemini_live',
    external_llm_assisted: true
  };
}

async function main() {
  const ticks = Math.max(1, Number(parseArg('ticks', '100')) || 100);
  const seed = Number(parseArg('seed', '17')) || 17;
  const nodes = Math.max(24, Number(parseArg('nodes', '64')) || 64);
  const exploreEvery = Math.max(5, Number(parseArg('explore-every', '25')) || 25);
  const minCooldownTicks = Math.max(1, Number(parseArg('cooldown-ticks', '10')) || 10);
  const minCooldownMs = Math.max(0, Number(parseArg('cooldown-ms', '0')) || 0);
  const injectLesionAt = Number(parseArg('inject-lesion-at', '-1'));
  const outPath = parseArg('out', null);
  const model = parseArg('model', process.env.GEMINI_MODEL || process.env.GEMINI_MODEL_ID || 'gemini-3-flash-preview');
  const timeoutMs = Math.max(1000, Number(parseArg('timeout-ms', '45000')) || 45000);
  const apiKey = process.env.GEMINI_API_KEY || '';
  const useLiveGemini = Boolean(apiKey && parseArg('live-gemini', 'false') === 'true');

  const session = createHeadlessRuntimeSession({
    config: {
      ...QICNConfig,
      KAIZEN_ADJUSTMENT_MODE: 'learned',
      SENSOR_OBSERVER_DYNAMICS_ENABLED: true,
      NODAL_TOWER_COUPLING_MODE: NODAL_TOWER_COUPLING_MODES.BIDIRECTIONAL,
      STRUCTURAL_PLASTICITY_LEVEL2_ENABLED: true,
      AUTONOMOUS_SUPERVISOR_LEVEL3_ENABLED: true
    },
    seed,
    nodes,
    profile: 'paired_intervention'
  });
  session.initialize();

  const controller = new Level3SupervisorController({
    policy: {
      ...LEVEL3_DEFAULT_POLICY,
      scheduledExplorationEveryTicks: exploreEvery,
      minCooldownTicks,
      minCooldownMs
    },
    reasoner: useLiveGemini
      ? async ({ prompt }) => callRemoteGeminiForDaemon(prompt, apiKey, { model, timeoutMs })
      : null
  });

  let simulatedNowMs = 1_800_000_000_000;
  for (let t = 1; t <= ticks; t += 1) {
    simulatedNowMs += 5_000;
    if (t === injectLesionAt) {
      session.environment.controls.lesionSectorWipe = true;
      session.environment.config.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED = false;
    }
    session.step(t, { evaluationOffset: t });
    if (t === injectLesionAt) {
      session.environment.controls.lesionSectorWipe = false;
    }
    await controller.runCycle(session, {
      tick: t,
      nowMs: simulatedNowMs
    });
  }

  const sealedBundle = exportLevel3SealedAuditBundle({
    ledger: controller.auditLedger,
    belt: controller.knowledgeBelt,
    sourceTick: session.completedTick
  });
  const verification = verifyLevel3SealedAuditBundle(sealedBundle);
  if (!verification.ok) {
    throw new Error(`level3_daemon_bundle_verification_failed:${verification.reason}`);
  }

  if (outPath) {
    const resolved = path.resolve(outPath);
    fs.mkdirSync(path.dirname(resolved), { recursive: true });
    fs.writeFileSync(resolved, JSON.stringify(sealedBundle, null, 2), 'utf8');
  }

  const finalTel = readLevel3LiveTelemetry(session);
  const summary = {
    schema: sealedBundle.schema,
    digest: sealedBundle.digest,
    external_llm_assisted: sealedBundle.external_llm_assisted,
    llmAssistedEntries: sealedBundle.llmAssistedEntries,
    deterministicLocalEntries: sealedBundle.deterministicLocalEntries,
    evidence_scope: sealedBundle.evidence_scope,
    external_support_certified: sealedBundle.external_support_certified,
    completedTick: session.completedTick,
    ledgerEntries: verification.ledgerEntries,
    beltFindings: verification.beltFindings,
    quota: getQuotaSnapshot(controller.governorState, controller.policy, simulatedNowMs, session.completedTick),
    finalTelemetry: {
      ccc: finalTel.ccc,
      xN: finalTel.xN,
      objectiveScore: finalTel.objectiveScore,
      inTube: finalTel.inTube,
      populatedSectors: finalTel.populatedSectors,
      sectorCoherenceMin: finalTel.sectorCoherenceMin
    },
    outPath: outPath ? path.resolve(outPath) : null
  };
  console.log(JSON.stringify(summary, null, 2));
}

const isDirectRun = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
if (isDirectRun) {
  main().catch((err) => {
    const safeMsg = sanitizeProviderMessage(String(err?.message || err)) || 'level3_daemon_error';
    console.error('[level3-daemon] ERROR:', safeMsg);
    process.exit(1);
  });
}
