// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Dedicated Level 3 autonomous supervisor audit ledger, first-person reflection stream, Gate 1 isolated Workbench comparison, Gate 2 append-only live surveillance/rollback, Knowledge Belt, and scientific separation UI.

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  LEVEL3_DEFAULT_POLICY,
  getQuotaSnapshot
} from '../simulation/Level3AutonomousSupervisor.js';
import {
  exportLevel3SealedAuditBundle,
  projectLedgerCyclesWithGate2,
  verifyLevel3AuditLedger,
  verifyLevel3KnowledgeBelt,
  verifyLevel3SealedAuditBundle
} from '../simulation/Level3KnowledgeBelt.js';

const TRIGGER_LABELS = {
  scheduled_exploration: 'Ventana Programada ("Pensar en Alto")',
  manual_reflection: 'Reflexión Manual en 1.ª Persona',
  manual_shadow_trial: 'Prueba Manual de Hipótesis en Workbench',
  anomaly_level2: 'Anomalía Persistente Nivel 2',
  metric_drift: 'Deriva de Métricas / Tubo de Viabilidad',
  prolonged_stasis: 'Estancamiento / Tensión Prolongada'
};

const STATUS_BADGES = {
  reflect_only: {
    label: 'REFLECT_ONLY · Pensar en Alto',
    cls: 'border-cyan-400/50 bg-cyan-950/70 text-cyan-200'
  },
  promoted_watching: {
    label: 'PROMOTED_WATCHING · Vigilancia Gate 2 (20 ticks)',
    cls: 'border-amber-400/50 bg-amber-950/70 text-amber-200'
  },
  promoted_confirmed: {
    label: 'PROMOTED_CONFIRMED · Superó Gate 1 + Gate 2',
    cls: 'border-emerald-400/50 bg-emerald-950/70 text-emerald-200'
  },
  rejected_gate1: {
    label: 'REJECTED_GATE1 · Rechazado por Workbench Aislado',
    cls: 'border-rose-400/50 bg-rose-950/70 text-rose-200'
  },
  rolled_back_gate2: {
    label: 'ROLLED_BACK_GATE2 · Rollback Automático dynamicState.v3',
    cls: 'border-fuchsia-400/60 bg-fuchsia-950/80 text-fuchsia-200'
  },
  aborted_stale_tick: {
    label: 'ABORTED_STALE_TICK · Abortado por Avance de Tick Vivo',
    cls: 'border-yellow-400/50 bg-yellow-950/70 text-yellow-200'
  },
  blocked_by_knowledge_belt: {
    label: 'BLOCKED_BELT · Evitado por Memoria Acumulada',
    cls: 'border-orange-400/50 bg-orange-950/70 text-orange-200'
  },
  discarded_invalid_schema: {
    label: 'DISCARDED_SCHEMA · Descartado por Esquema Tipado',
    cls: 'border-red-400/50 bg-red-950/70 text-red-200'
  },
  staged_requires_human_approval: {
    label: 'STAGED_PATCH · Requiere Visto Bueno Humano',
    cls: 'border-violet-400/50 bg-violet-950/70 text-violet-200'
  }
};

export function Level3SupervisorAuditTab({
  level3Enabled,
  onToggleLevel3,
  controllerRef,
  ledger,
  knowledgeBelt,
  governorState,
  activeGate2Watch,
  exploreEveryTicks,
  onChangeExploreEveryTicks,
  reasonerMode,
  onChangeReasonerMode,
  onTriggerManualReflection,
  onTriggerShadowTrialNow,
  onImportSealedBundle,
  onSyncFromWorkerState,
  lastActionNotice = '',
  currentTick = 0,
  buildInfo = { version: '2.1.0-REINFORCED', signature: 'QICN-SIG-LOCAL' }
}) {
  const [filterStatus, setFilterStatus] = useState('all');
  const [statusMessage, setStatusMessage] = useState('');
  const [workerRunning, setWorkerRunning] = useState(false);
  const [workerTick, setWorkerTick] = useState(currentTick);
  const workerRef = useRef(null);
  const fileInputRef = useRef(null);

  const ledgerVerification = useMemo(() => verifyLevel3AuditLedger(ledger), [ledger]);
  const beltVerification = useMemo(() => verifyLevel3KnowledgeBelt(knowledgeBelt), [knowledgeBelt]);
  const quota = useMemo(() => {
    const policy = controllerRef?.current?.policy || {
      ...LEVEL3_DEFAULT_POLICY,
      scheduledExplorationEveryTicks: exploreEveryTicks
    };
    return getQuotaSnapshot(governorState, policy, Date.now(), currentTick);
  }, [controllerRef, governorState, exploreEveryTicks, currentTick]);

  const consolidatedCycles = useMemo(() => projectLedgerCyclesWithGate2(ledger), [ledger]);

  const entries = useMemo(() => {
    const list = [...consolidatedCycles].reverse();
    if (filterStatus === 'all') return list;
    return list.filter((e) => e.finalStatus === filterStatus);
  }, [consolidatedCycles, filterStatus]);

  const findings = useMemo(
    () => (Array.isArray(knowledgeBelt?.findings) ? [...knowledgeBelt.findings].reverse() : []),
    [knowledgeBelt]
  );

  const anyExternalLlmAssisted = Boolean(
    ledger?.external_llm_assisted === true ||
    knowledgeBelt?.external_llm_assisted === true
  );

  const stopWorkerDaemon = useCallback(() => {
    if (!workerRef.current) {
      setWorkerRunning(false);
      return;
    }
    try {
      workerRef.current.postMessage({ id: 'stop-level3', type: 'level3_stop_loop' });
    } catch {
      workerRef.current.terminate();
      workerRef.current = null;
      setWorkerRunning(false);
    }
  }, []);

  const startWorkerDaemon = useCallback(() => {
    if (typeof Worker === 'undefined') {
      setStatusMessage('Web Worker no disponible en este entorno; usa scripts/run-level3-autonomous-daemon.mjs.');
      return;
    }
    try {
      if (workerRef.current) {
        workerRef.current.terminate();
      }
      const worker = new Worker('/level3Autonomous.worker.js', { type: 'module' });
      workerRef.current = worker;
      worker.onmessage = ({ data }) => {
        if (!data) return;
        if (data.type === 'level3_loop_started') {
          setWorkerRunning(true);
          setStatusMessage(
            `Worker sandbox paralelo activo (${data.nodeCount || 48} nodos · ${data.reasonerSource || 'deterministic_local_worker'} · topología viva de 1500 nodos protegida).`
          );
        } else if (data.type === 'level3_loop_tick') {
          setWorkerTick(data.tick);
          if (data.auditLedger && data.knowledgeBelt && typeof onSyncFromWorkerState === 'function') {
            onSyncFromWorkerState({
              auditLedger: data.auditLedger,
              knowledgeBelt: data.knowledgeBelt,
              governorState: data.governorState || null,
              activeGate2Watch: data.activeGate2Watch || null,
              dynamicState: data.dynamicState || null,
              nodeCount: data.nodeCount,
              workerMode: data.workerMode
            });
          }
        } else if (data.type === 'level3_loop_stopped') {
          setWorkerRunning(false);
          if (typeof onSyncFromWorkerState === 'function') {
            onSyncFromWorkerState({
              auditLedger: data.auditLedger,
              knowledgeBelt: data.knowledgeBelt,
              governorState: data.governorState || null,
              activeGate2Watch: data.activeGate2Watch || null,
              dynamicState: data.dynamicState || null,
              nodeCount: data.nodeCount,
              workerMode: data.workerMode
            });
          }
          worker.terminate();
          workerRef.current = null;
          setStatusMessage(
            `Worker detenido en tick ${data.tick}; Ledger y Cinto sincronizados sin sobrescribir la topología viva.`
          );
        } else if (data.type === 'level3_worker_error') {
          setStatusMessage(`Error en Worker Nivel 3: ${data.error}`);
        }
      };
      worker.postMessage({
        id: 'start-level3',
        type: 'level3_start_loop',
        intervalMs: 450,
        policy: {
          ...LEVEL3_DEFAULT_POLICY,
          scheduledExplorationEveryTicks: exploreEveryTicks
        },
        knowledgeBelt,
        auditLedger: ledger,
        governorState
      });
    } catch (err) {
      setStatusMessage(`No se pudo iniciar Worker Nivel 3: ${err?.message || String(err)}`);
    }
  }, [exploreEveryTicks, knowledgeBelt, ledger, governorState, onSyncFromWorkerState]);

  useEffect(() => () => {
    if (workerRef.current) {
      workerRef.current.terminate();
      workerRef.current = null;
    }
  }, []);

  const handleExportBundle = () => {
    try {
      const sealed = exportLevel3SealedAuditBundle({
        ledger,
        belt: knowledgeBelt,
        sourceTick: currentTick,
        sourceBuild: buildInfo
      });
      const json = JSON.stringify(sealed, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qicn-level3-audit-ledger-t${currentTick}-${sealed.digest.slice(0, 12)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setStatusMessage(
        `Bitácora sellada exportada (SHA-256: ${sealed.digest.slice(0, 16)}… · external_llm_assisted=${String(sealed.external_llm_assisted)}).`
      );
    } catch (err) {
      setStatusMessage(`No se pudo exportar bitácora: ${err?.message || String(err)}`);
    }
  };

  const handleImportFile = async (event) => {
    const file = event.target?.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      const check = verifyLevel3SealedAuditBundle(parsed);
      if (!check.ok) {
        setStatusMessage(`Rechazado: integridad SHA-256 inválida (${check.reason}).`);
        return;
      }
      if (typeof onImportSealedBundle === 'function') {
        onImportSealedBundle(parsed);
      }
      setStatusMessage(
        `Paquete importado y verificado (${check.ledgerEntries} registros, ${check.beltFindings} hallazgos, digest ${check.digest.slice(0, 14)}…).`
      );
    } catch (err) {
      setStatusMessage(`Error al importar archivo JSON: ${err?.message || String(err)}`);
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <section
      aria-label="Bitácora Auditable y Separación Científica — Supervisor Nivel 3"
      className="space-y-4 rounded-xl border border-cyan-500/40 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-xl"
    >
      {/* 1. Banner de Separación Científica y Control Maestro */}
      <div className="rounded-lg border border-cyan-400/40 bg-gradient-to-r from-slate-900 via-cyan-950/40 to-slate-900 p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-base font-bold text-cyan-200">
              Bitácora Auditable Nivel 3 — Supervisor Autónomo + Shadow Promotion
            </h2>
            <p className="mt-1 text-slate-300">
              Sección dedicada e independiente del Chat. Razonamiento interno en primera persona (&ldquo;Pensar en alto&rdquo;), verificación dura en copias aisladas del Workbench (Compuerta 1) y vigilancia en vivo con rollback automático <code className="text-cyan-300">dynamicState.v3</code> (Compuerta 2, registro estrictamente <em>append-only</em>).
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleLevel3(!level3Enabled)}
              className={`rounded-lg border px-3 py-1.5 font-semibold transition ${
                level3Enabled
                  ? 'border-emerald-400 bg-emerald-600/30 text-emerald-100 shadow-sm shadow-emerald-500/30'
                  : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
              }`}
            >
              {level3Enabled ? 'Supervisor Nivel 3: ACTIVO' : 'Supervisor Nivel 3: INACTIVO'}
            </button>
          </div>
        </div>

        {/* Etiquetas científicas inmutables */}
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px]">
          <span className="rounded border border-amber-400/50 bg-amber-950/60 px-2 py-0.5 font-mono text-amber-200">
            external_llm_assisted: {anyExternalLlmAssisted ? 'true' : 'false'}
          </span>
          <span className="rounded border border-cyan-400/50 bg-cyan-950/60 px-2 py-0.5 font-mono text-cyan-200">
            evidence_scope: &quot;internal_support_only&quot;
          </span>
          <span className="rounded border border-slate-500/60 bg-slate-900 px-2 py-0.5 font-mono text-slate-300">
            external_support_certified: false
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-mono ${
              ledgerVerification.ok
                ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-200'
                : 'border-rose-400/50 bg-rose-950/60 text-rose-200'
            }`}
          >
            Ledger SHA-256: {ledgerVerification.ok ? `VERIFIED (${ledgerVerification.count} registros / ${consolidatedCycles.length} ciclos)` : `ERROR (${ledgerVerification.reason})`}
          </span>
          <span
            className={`rounded border px-2 py-0.5 font-mono ${
              beltVerification.ok
                ? 'border-emerald-400/50 bg-emerald-950/60 text-emerald-200'
                : 'border-rose-400/50 bg-rose-950/60 text-rose-200'
            }`}
          >
            Cinto SHA-256: {beltVerification.ok ? `VERIFIED (${beltVerification.count} hallazgos)` : `ERROR (${beltVerification.reason})`}
          </span>
        </div>
      </div>

      {/* 2. Gobernador de Cuota, Ventana Programada ("Pensar en Alto") y Modo Anti-Throttling */}
      <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        {/* Gobernador y Cuota */}
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
          <div className="font-semibold text-cyan-300">Gobernador de Cuota LLM y Disparadores</div>
          <div className="mt-2 grid grid-cols-2 gap-2 text-[11px]">
            <div className="rounded bg-slate-950/70 p-2">
              <span className="text-slate-400">Cuota LLM / Hora:</span>
              <div className="font-mono text-sm text-white">
                {quota.callsLastHour} / {quota.maxCallsPerHour}
              </div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <span className="text-slate-400">Cuota LLM / Día:</span>
              <div className="font-mono text-sm text-white">
                {quota.callsLastDay} / {quota.maxCallsPerDay}
              </div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <span className="text-slate-400">LLM Live / Local Det.:</span>
              <div className="font-mono text-sm text-cyan-200">
                {quota.llmCallsSucceeded} / {quota.deterministicLocalCalls + quota.deterministicFallbacks}
              </div>
            </div>
            <div className="rounded bg-slate-950/70 p-2">
              <span className="text-slate-400">Promovidos / Rollback:</span>
              <div className="font-mono text-sm text-emerald-300">
                {quota.totalPromotions} / <span className="text-fuchsia-300">{quota.totalGate2Rollbacks}</span>
              </div>
            </div>
          </div>
          {activeGate2Watch && (
            <div className="mt-2 rounded border border-amber-400/50 bg-amber-950/50 p-2 text-[11px] text-amber-200">
              <strong>Compuerta 2 Activa:</strong> vigilando promoción <code className="font-mono">{activeGate2Watch.cycleId}</code> ({activeGate2Watch.observedTicks}/{activeGate2Watch.watchWindowTicks} ticks, snapshot <code className="font-mono">{String(activeGate2Watch.prePromotionDigest || '').slice(0, 10)}…</code>).
            </div>
          )}
        </div>

        {/* Ventana Programada de Exploración ("Pensar en Alto") */}
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
          <div className="font-semibold text-cyan-300">Ventana Programada de Exploración (&ldquo;Pensar en Alto&rdquo;)</div>
          <p className="mt-1 text-[11px] text-slate-300">
            Cada cierto intervalo el sistema reflexiona en primera persona sobre su cuadro actual sin necesidad de fallo, o propone un micro-experimento aislado.
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1 text-[11px] text-slate-300">
              <span>Explorar cada:</span>
              <select
                aria-label="Intervalo de exploración programada Nivel 3"
                value={exploreEveryTicks}
                onChange={(e) => onChangeExploreEveryTicks(Number(e.target.value))}
                className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100"
              >
                <option value={25}>25 ticks</option>
                <option value={50}>50 ticks (por defecto)</option>
                <option value={100}>100 ticks</option>
              </select>
            </label>
            <label className="flex items-center gap-1 text-[11px] text-slate-300">
              <span>Razonador:</span>
              <select
                aria-label="Modo de razonador Nivel 3"
                value={reasonerMode}
                onChange={(e) => onChangeReasonerMode(e.target.value)}
                className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100"
              >
                <option value="gemini_with_fallback">Gemini 1.ª Persona (C2 + respaldo determinista)</option>
                <option value="deterministic_local">Deliberador 1.ª Persona Local Determinista (0 cuota LLM)</option>
              </select>
            </label>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTriggerManualReflection}
              className="rounded border border-cyan-400/60 bg-cyan-600/30 px-2.5 py-1.5 font-semibold text-cyan-100 hover:bg-cyan-600/50"
            >
              Pensar en alto ahora (1.ª persona)
            </button>
            <button
              type="button"
              onClick={onTriggerShadowTrialNow}
              disabled={currentTick < 1}
              title={
                currentTick < 1
                  ? 'Inicia o avanza al menos 1 tick real de simulación antes de capturar el Workbench en vivo.'
                  : 'Ejecuta un ciclo de hipótesis + verificación dura en copias aisladas del Workbench (Compuerta 1).'
              }
              className={`rounded border px-2.5 py-1.5 font-semibold ${
                currentTick < 1
                  ? 'cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500'
                  : 'border-emerald-400/60 bg-emerald-600/30 text-emerald-100 hover:bg-emerald-600/50'
              }`}
            >
              Probar Hipótesis en Workbench (Gate 1 + 2)
            </button>
          </div>
          {(lastActionNotice || currentTick < 1) && (
            <div className="mt-2 text-[11px] text-amber-200">
              {lastActionNotice || 'Nota: para ejecutar el Workbench en vivo (Compuerta 1), la simulación debe haber completado al menos 1 tick real.'}
            </div>
          )}
        </div>

        {/* Ejecución Anti-Throttling y Persistencia de Bitácora */}
        <div className="rounded-lg border border-slate-700/80 bg-slate-900/80 p-3">
          <div className="font-semibold text-cyan-300">Ejecución Continua Anti-Throttling y Exportación</div>
          <p className="mt-1 text-[11px] text-slate-300">
            El Worker corre en modo <em>sandbox paralelo ligero</em> (<code className="text-cyan-200">48 nodos · deterministic_local_worker</code>) sincronizando Ledger y Cinto sin sobrescribir la red viva de 1500 nodos, o usa <code className="text-cyan-200">node scripts/run-level3-autonomous-daemon.mjs</code>.
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {!workerRunning ? (
              <button
                type="button"
                onClick={startWorkerDaemon}
                className="rounded border border-violet-400/60 bg-violet-600/30 px-2.5 py-1.5 font-semibold text-violet-100 hover:bg-violet-600/50"
              >
                Activar Worker Anti-Throttling
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWorkerDaemon}
                className="rounded border border-amber-400/60 bg-amber-600/40 px-2.5 py-1.5 font-semibold text-amber-100 hover:bg-amber-600/60"
              >
                Detener Worker y Sincronizar (tick {workerTick})
              </button>
            )}
            <button
              type="button"
              onClick={handleExportBundle}
              className="rounded border border-slate-500 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
            >
              Exportar Ledger Sellado JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded border border-slate-500 bg-slate-800 px-2.5 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
            >
              Importar Ledger JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          {statusMessage && (
            <div className="mt-2 rounded border border-cyan-500/30 bg-slate-950/80 p-1.5 text-[11px] text-cyan-200">
              {statusMessage}
            </div>
          )}
        </div>
      </div>

      {/* 3. Flujo de Pensamiento Interno en Primera Persona y Ciclos Auditados */}
      <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-cyan-200">
              Flujo de Pensamiento Interno en Primera Persona y Verificación de Compuertas ({entries.length})
            </h3>
            <p className="text-[11px] text-slate-400">
              Cadena SHA-256 head: <code className="font-mono text-cyan-300">{String(ledger?.headHash || '').slice(0, 24)}…</code>
            </p>
          </div>
          <div className="flex flex-wrap gap-1.5 text-[11px]">
            {[
              ['all', 'Todos'],
              ['reflect_only', 'Pensar en Alto'],
              ['promoted_confirmed', 'Confirmados'],
              ['promoted_watching', 'En Vigilancia'],
              ['rejected_gate1', 'Rechazados Gate 1'],
              ['rolled_back_gate2', 'Rollback Gate 2']
            ].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilterStatus(val)}
                className={`rounded border px-2 py-1 ${
                  filterStatus === val
                    ? 'border-cyan-400 bg-cyan-700/40 text-white'
                    : 'border-slate-700 bg-slate-950/70 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {lbl}
              </button>
            ))}
          </div>
        </div>

        {entries.length === 0 ? (
          <div className="mt-3 rounded border border-slate-800 bg-slate-950/70 p-4 text-center text-slate-400">
            Aún no hay ciclos registrados en la bitácora. Pulsa <strong>&ldquo;Pensar en alto ahora (1.ª persona)&rdquo;</strong> o <strong>&ldquo;Probar Hipótesis en Workbench (Gate 1 + 2)&rdquo;</strong>, o deja correr la simulación con el Supervisor Nivel 3 activo.
          </div>
        ) : (
          <div className="mt-3 max-h-[520px] space-y-3 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const badge = STATUS_BADGES[entry.finalStatus] || {
                label: entry.finalStatus,
                cls: 'border-slate-500 bg-slate-800 text-slate-200'
              };
              const g1 = entry.gate1Summary;
              const g2 = entry.gate2Summary;
              return (
                <article
                  key={entry.digest}
                  className="rounded-lg border border-slate-700/80 bg-slate-950/85 p-3 shadow"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 pb-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        #{entry.seq} · Tick {entry.tick}
                      </span>
                      <span className="rounded border border-slate-700 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                        {TRIGGER_LABELS[entry.triggerKind] || entry.triggerKind}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        régimen: {entry.regimeSignature}
                      </span>
                      <span className="rounded border border-slate-700/80 bg-slate-900/90 px-1.5 py-0.5 font-mono text-[10px] text-cyan-200">
                        fuente: {entry.reasonerSource || 'deterministic_local'} (llm={String(Boolean(entry.external_llm_assisted))})
                      </span>
                    </div>
                    <span className={`rounded border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}>
                      {badge.label}
                    </span>
                  </div>

                  {entry.reasonerError && (
                    <div className="mt-1.5 rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 font-mono text-[10px] text-amber-200">
                      Respaldo determinístico activado por fallo de canal remoto: {entry.reasonerError}
                    </div>
                  )}

                  {/* Monólogo Interno en Primera Persona */}
                  <div className="mt-2.5 rounded border border-cyan-500/30 bg-cyan-950/20 p-2.5">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-cyan-300">
                      Pensamiento Interno en Primera Persona (Snapshot {String(entry.snapshotDigest || '').slice(0, 12)}…)
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-slate-100">
                      &ldquo;{entry.firstPersonThought}&rdquo;
                    </p>
                  </div>

                  {/* Diagnóstico, Hipótesis y Acción Tipada */}
                  <div className="mt-2 grid grid-cols-1 gap-2 md:grid-cols-3">
                    <div className="rounded bg-slate-900/70 p-2">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Diagnóstico</span>
                      <p className="mt-0.5 text-[11px] text-slate-200">{entry.diagnosis}</p>
                    </div>
                    <div className="rounded bg-slate-900/70 p-2">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Hipótesis Falsable</span>
                      <p className="mt-0.5 text-[11px] text-slate-200">{entry.hypothesis}</p>
                    </div>
                    <div className="rounded bg-slate-900/70 p-2">
                      <span className="text-[10px] font-semibold uppercase text-slate-400">Acción Estrictamente Tipada</span>
                      <div className="mt-0.5 font-mono text-[11px] text-cyan-200">
                        modo: {entry.actionMode}
                      </div>
                      <div className="font-mono text-[11px] text-emerald-300">
                        firma: {entry.actionSignature}
                      </div>
                    </div>
                  </div>

                  {/* Tabla de Compuerta 1 (Workbench Aislado) si se ejecutó */}
                  {g1 && g1.branches && (
                    <div className="mt-2.5 rounded border border-slate-700/80 bg-slate-900/60 p-2.5">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[11px] font-semibold text-cyan-200">
                          Compuerta 1 — Verificación Dura en Workbench Aislado ({g1.ticks} ticks · minΔ={g1.minObjectiveDelta ?? 0.005} · digest {String(g1.workbenchResultDigest || '').slice(0, 12)}…)
                        </span>
                        <span className="font-mono text-[11px] text-slate-300">
                          Δscore={g1.deltas?.deltaObjectiveScore} | ΔinTube={g1.deltas?.deltaInTubeRate} | ΔsecCohMin={g1.deltas?.deltaSectorCoherenceMin}
                        </span>
                      </div>
                      <div className="mt-1.5 overflow-x-auto">
                        <table className="w-full border-collapse text-left font-mono text-[11px]">
                          <thead>
                            <tr className="border-b border-slate-700 text-slate-400">
                              <th className="py-1 pr-2">Rama Aislada</th>
                              <th className="py-1 pr-2">AcciónAplicada</th>
                              <th className="py-1 pr-2">Finitos</th>
                              <th className="py-1 pr-2">InTubeRate</th>
                              <th className="py-1 pr-2">ObjScore</th>
                              <th className="py-1 pr-2">Sectores</th>
                              <th className="py-1 pr-2">SecCohMin</th>
                              <th className="py-1 pr-2">η / FlujoCruzado</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-800/70">
                            <tr>
                              <td className="py-1 pr-2 text-slate-300">baseline (sham)</td>
                              <td className="py-1 pr-2">{String(Boolean(g1.branches.baseline?.candidateApplied))}</td>
                              <td className="py-1 pr-2">{g1.branches.baseline?.finiteTickRate}</td>
                              <td className="py-1 pr-2">{g1.branches.baseline?.meanInTubeRate}</td>
                              <td className="py-1 pr-2">{g1.branches.baseline?.meanObjectiveScore}</td>
                              <td className="py-1 pr-2">{g1.branches.baseline?.populatedSectors}/4</td>
                              <td className="py-1 pr-2">{g1.branches.baseline?.sectorCoherenceMin}</td>
                              <td className="py-1 pr-2">
                                η={g1.branches.baseline?.effectiveEta} / {g1.branches.baseline?.crossSectorFluxShare}
                              </td>
                            </tr>
                            <tr className="bg-cyan-950/25 font-semibold text-cyan-200">
                              <td className="py-1 pr-2">candidate ({entry.actionSignature})</td>
                              <td className="py-1 pr-2">{String(Boolean(g1.branches.candidate?.candidateApplied))}</td>
                              <td className="py-1 pr-2">{g1.branches.candidate?.finiteTickRate}</td>
                              <td className="py-1 pr-2">{g1.branches.candidate?.meanInTubeRate}</td>
                              <td className="py-1 pr-2">{g1.branches.candidate?.meanObjectiveScore}</td>
                              <td className="py-1 pr-2">{g1.branches.candidate?.populatedSectors}/4</td>
                              <td className="py-1 pr-2">{g1.branches.candidate?.sectorCoherenceMin}</td>
                              <td className="py-1 pr-2">
                                η={g1.branches.candidate?.effectiveEta} / {g1.branches.candidate?.crossSectorFluxShare}
                              </td>
                            </tr>
                            <tr className="text-slate-400">
                              <td className="py-1 pr-2">neg_td_cut (η=0 + acción)</td>
                              <td className="py-1 pr-2">{String(Boolean(g1.branches.neg_td_cut?.candidateApplied))}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_td_cut?.finiteTickRate}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_td_cut?.meanInTubeRate}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_td_cut?.meanObjectiveScore}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_td_cut?.populatedSectors}/4</td>
                              <td className="py-1 pr-2">{g1.branches.neg_td_cut?.sectorCoherenceMin}</td>
                              <td className="py-1 pr-2">η={g1.branches.neg_td_cut?.effectiveEta}</td>
                            </tr>
                            <tr className="text-slate-400">
                              <td className="py-1 pr-2">neg_reducible (A=I + acción)</td>
                              <td className="py-1 pr-2">{String(Boolean(g1.branches.neg_reducible?.candidateApplied))}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_reducible?.finiteTickRate}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_reducible?.meanInTubeRate}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_reducible?.meanObjectiveScore}</td>
                              <td className="py-1 pr-2">{g1.branches.neg_reducible?.populatedSectors}/4</td>
                              <td className="py-1 pr-2">{g1.branches.neg_reducible?.sectorCoherenceMin}</td>
                              <td className="py-1 pr-2">flux={g1.branches.neg_reducible?.crossSectorFluxShare}</td>
                            </tr>
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Compuerta 2 (Snapshot Pre-Promoción + Vigilancia / Rollback) */}
                  {g2 && (
                    <div className="mt-2 rounded border border-slate-700/80 bg-slate-900/50 p-2 font-mono text-[11px] text-slate-300">
                      <strong>Compuerta 2 (Vigilancia Post-Promoción):</strong> estado={g2.status} | snapshot pre-promoción={String(g2.prePromotionDigest || '').slice(0, 14)}… | ticks vigilados={g2.observedTicks ?? 0}/{g2.watchWindowTicks ?? 20} | rollback={String(Boolean(g2.rolledBack))}
                    </div>
                  )}

                  <div className="mt-2 flex flex-wrap items-center justify-between gap-2 text-[10px] font-mono text-slate-500">
                    <span>prevHash: {entry.prevHash.slice(0, 16)}…</span>
                    <span>digest inicial (inmutable): {entry.digest.slice(0, 20)}…</span>
                    {entry.gate2ResolutionDigest && (
                      <span className="text-emerald-400/80">
                        resolución Gate 2 (append-only): {entry.gate2ResolutionDigest.slice(0, 18)}…
                      </span>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 4. Cinto de Conocimiento Operativo Acumulado (Knowledge Belt) */}
      <div className="rounded-lg border border-slate-700/80 bg-slate-900/70 p-3">
        <h3 className="text-sm font-bold text-cyan-200">
          Cinto de Conocimiento Operativo Acumulado ({findings.length} hallazgos sellados)
        </h3>
        <p className="text-[11px] text-slate-400">
          Memoria empírica de lo que el sistema probó sobre sí mismo: las hipótesis confirmadas y las rechazadas/revertidas se inyectan en futuras consultas a Gemini y bloquean la repetición de errores.
        </p>
        {findings.length === 0 ? (
          <div className="mt-2 rounded border border-slate-800 bg-slate-950/60 p-3 text-slate-400">
            El cinto de conocimiento está vacío en esta sesión.
          </div>
        ) : (
          <div className="mt-2 max-h-56 overflow-y-auto">
            <table className="w-full border-collapse text-left font-mono text-[11px]">
              <thead>
                <tr className="border-b border-slate-700 text-slate-400">
                  <th className="py-1 pr-2"># / Tick</th>
                  <th className="py-1 pr-2">Régimen</th>
                  <th className="py-1 pr-2">Acción Tipada</th>
                  <th className="py-1 pr-2">Veredicto</th>
                  <th className="py-1 pr-2">Fuente / LLM</th>
                  <th className="py-1 pr-2">ΔObjScore</th>
                  <th className="py-1 pr-2">SHA-256</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70">
                {findings.slice(0, 30).map((f) => (
                  <tr key={f.digest}>
                    <td className="py-1 pr-2 text-cyan-300">
                      #{f.seq} · t={f.tick}
                    </td>
                    <td className="py-1 pr-2 text-slate-300">{f.regimeSignature}</td>
                    <td className="py-1 pr-2 text-slate-200">{f.actionSignature}</td>
                    <td className="py-1 pr-2">
                      <span
                        className={
                          f.verdict === 'promoted_confirmed'
                            ? 'text-emerald-300'
                            : f.verdict === 'rolled_back_gate2' || f.verdict === 'rejected_gate1'
                              ? 'text-rose-300'
                              : 'text-cyan-200'
                        }
                      >
                        {f.verdict}
                      </span>
                    </td>
                    <td className="py-1 pr-2 text-slate-300">
                      {f.reasonerSource || 'deterministic_local'} ({String(Boolean(f.external_llm_assisted))})
                    </td>
                    <td className="py-1 pr-2">{f.deltaObjectiveScore}</td>
                    <td className="py-1 pr-2 text-slate-400">{f.digest.slice(0, 12)}…</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </section>
  );
}

export default Level3SupervisorAuditTab;
