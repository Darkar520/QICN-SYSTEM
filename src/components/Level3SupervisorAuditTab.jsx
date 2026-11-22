// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Dedicated Level 3 autonomous supervisor audit ledger, first-person reflection stream, Gate 1 isolated Workbench comparison, Gate 2 append-only live surveillance/rollback, Knowledge Belt, and scientific separation UI with progressive disclosure ("Detalles").

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
import { CollapsibleSection } from './CollapsibleSection.jsx';
import {
  DetailToggleStrip,
  MetricDualLabel,
  TabPlainHeader
} from './ProgressiveDetailCard.jsx';

const TRIGGER_LABELS = {
  scheduled_exploration: 'Reflexión programada',
  manual_reflection: 'Reflexión manual',
  manual_shadow_trial: 'Prueba manual en copia segura',
  anomaly_level2: 'Anomalía estructural (Nivel 2)',
  metric_drift: 'Desviación de estabilidad',
  prolonged_stasis: 'Estancamiento prolongado'
};

const STATUS_BADGES = {
  reflect_only: {
    label: 'Solo reflexión',
    tech: 'REFLECT_ONLY',
    cls: 'border-cyan-400/45 bg-cyan-950/60 text-cyan-200'
  },
  promoted_watching: {
    label: 'Vigilando cambio (20 ticks)',
    tech: 'PROMOTED_WATCHING',
    cls: 'border-amber-400/50 bg-amber-950/65 text-amber-200'
  },
  promoted_confirmed: {
    label: 'Mejora confirmada',
    tech: 'PROMOTED_CONFIRMED',
    cls: 'border-emerald-400/50 bg-emerald-950/65 text-emerald-200'
  },
  rejected_gate1: {
    label: 'Rechazada en copia segura',
    tech: 'REJECTED_GATE1',
    cls: 'border-rose-400/45 bg-rose-950/65 text-rose-200'
  },
  rolled_back_gate2: {
    label: 'Revertida automáticamente',
    tech: 'ROLLED_BACK_GATE2',
    cls: 'border-fuchsia-400/55 bg-fuchsia-950/75 text-fuchsia-200'
  },
  aborted_stale_tick: {
    label: 'Abortada (cambio en vivo)',
    tech: 'ABORTED_STALE_TICK',
    cls: 'border-yellow-400/45 bg-yellow-950/65 text-yellow-200'
  },
  blocked_by_knowledge_belt: {
    label: 'Evitada por memoria',
    tech: 'BLOCKED_BELT',
    cls: 'border-orange-400/45 bg-orange-950/65 text-orange-200'
  },
  discarded_invalid_schema: {
    label: 'Descartada por formato',
    tech: 'DISCARDED_SCHEMA',
    cls: 'border-red-400/45 bg-red-950/65 text-red-200'
  },
  staged_requires_human_approval: {
    label: 'Borrador · Requiere visto bueno',
    tech: 'STAGED_PATCH',
    cls: 'border-violet-400/45 bg-violet-950/65 text-violet-200'
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

  const howItWorksExtra = (
    <div className="space-y-2.5">
      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
        <div className="rounded-md border border-cyan-500/25 bg-cyan-950/20 p-2.5">
          <div className="font-semibold text-cyan-200">1. Pensar en voz alta</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Lee las métricas actuales y redacta un diagnóstico en primera persona. Si todo va bien, solo reflexiona sin cambiar nada.
          </p>
        </div>
        <div className="rounded-md border border-emerald-500/25 bg-emerald-950/20 p-2.5">
          <div className="font-semibold text-emerald-200">2. Prueba en copia segura (Gate 1)</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Si propone un ajuste, el motor lo prueba 24 pasos en clones aislados frente a la línea base y controles negativos (η=0 y A=I).
          </p>
        </div>
        <div className="rounded-md border border-amber-500/25 bg-amber-950/20 p-2.5">
          <div className="font-semibold text-amber-200">3. Vigilancia con marcha atrás (Gate 2)</div>
          <p className="mt-1 text-[11px] leading-relaxed text-slate-300">
            Antes de aplicar el cambio en vivo guarda una copia exacta (dynamicState.v3). Vigila 20 pasos y si algo cae, revierte automáticamente.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
        <span className="rounded border border-amber-400/40 bg-amber-950/50 px-2 py-0.5 text-amber-200">
          external_llm_assisted: {anyExternalLlmAssisted ? 'true' : 'false'}
        </span>
        <span className="rounded border border-cyan-400/40 bg-cyan-950/50 px-2 py-0.5 text-cyan-200">
          evidence_scope: &quot;internal_support_only&quot;
        </span>
        <span className="rounded border border-slate-600 bg-slate-900 px-2 py-0.5 text-slate-300">
          external_support_certified: false
        </span>
        <span
          className={`rounded border px-2 py-0.5 ${
            ledgerVerification.ok
              ? 'border-emerald-400/40 bg-emerald-950/50 text-emerald-200'
              : 'border-rose-400/40 bg-rose-950/50 text-rose-200'
          }`}
        >
          Ledger SHA-256: {ledgerVerification.ok ? `VERIFIED (${ledgerVerification.count} reg · ${consolidatedCycles.length} ciclos)` : `ERROR (${ledgerVerification.reason})`}
        </span>
        <span
          className={`rounded border px-2 py-0.5 ${
            beltVerification.ok
              ? 'border-emerald-400/40 bg-emerald-950/50 text-emerald-200'
              : 'border-rose-400/40 bg-rose-950/50 text-rose-200'
          }`}
        >
          Cinto SHA-256: {beltVerification.ok ? `VERIFIED (${beltVerification.count})` : `ERROR (${beltVerification.reason})`}
        </span>
      </div>
    </div>
  );

  const supervisorStateLabel = activeGate2Watch
    ? `Vigilando mejora (${activeGate2Watch.observedTicks}/${activeGate2Watch.watchWindowTicks} ticks)`
    : (level3Enabled ? 'Activo · Observando' : 'En pausa (manual)');

  const integrityAllOk = ledgerVerification.ok && beltVerification.ok;

  return (
    <section
      aria-label="Bitácora Auditable y Separación Científica — Supervisor Nivel 3"
      className="space-y-4 rounded-xl border border-cyan-500/30 bg-slate-950/90 p-4 text-xs text-slate-100 shadow-xl"
    >
      {/* 1. Cabecera Minimalista con "Detalles ▾" */}
      <TabPlainHeader
        tabId="level3-supervisor"
        accent="cyan"
        detailsButtonLabel="¿Cómo funciona? · Detalles"
        extraDetails={howItWorksExtra}
        actions={(
          <button
            type="button"
            onClick={() => onToggleLevel3(!level3Enabled)}
            className={`rounded-lg border px-3 py-1.5 text-xs font-semibold transition ${
              level3Enabled
                ? 'border-emerald-400 bg-emerald-600/30 text-emerald-100 shadow-sm shadow-emerald-500/20'
                : 'border-slate-600 bg-slate-800 text-slate-300 hover:bg-slate-700'
            }`}
          >
            {level3Enabled ? 'Supervisor: ACTIVO' : 'Supervisor: INACTIVO'}
          </button>
        )}
      />

      {/* 2. Resumen limpio en 3 tarjetas (título cotidiano + sigla técnica) */}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
        <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 p-3">
          <MetricDualLabel casual="Estado actual" technical="Gate 2 & SHA-256" />
          <div className={`mt-1.5 text-sm font-bold ${activeGate2Watch ? 'text-amber-300' : (level3Enabled ? 'text-emerald-300' : 'text-slate-200')}`}>
            {supervisorStateLabel}
          </div>
          <div className="mt-1.5 flex flex-wrap items-center gap-1.5 font-mono text-[10px]">
            <span className={integrityAllOk ? 'text-emerald-300' : 'text-rose-300'}>
              {integrityAllOk ? '● Sellado SHA-256 íntegro' : '● Revisar integridad'}
            </span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">
              {anyExternalLlmAssisted ? 'con IA externa' : '100 % local'}
            </span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 p-3">
          <MetricDualLabel casual="Ciclos registrados" technical="Ledger append-only" />
          <div className="mt-1.5 font-mono text-lg font-bold text-cyan-200">
            {consolidatedCycles.length} <span className="text-xs font-normal text-slate-400">ciclos</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-400">
            <span className="text-emerald-300">{quota.totalPromotions} confirmados</span>
            {' · '}
            <span className="text-fuchsia-300">{quota.totalGate2Rollbacks} revertidos</span>
            {' · '}
            <span className="text-cyan-300">{quota.totalReflections} reflexiones</span>
          </div>
        </div>

        <div className="rounded-xl border border-slate-700/70 bg-slate-900/75 p-3">
          <MetricDualLabel casual="Uso de IA externa" technical="Cuota LLM / hora" />
          <div className="mt-1.5 font-mono text-lg font-bold text-white">
            {quota.callsLastHour} <span className="text-xs font-normal text-slate-400">/ {quota.maxCallsPerHour}</span>
          </div>
          <div className="mt-1 font-mono text-[10px] text-slate-400">
            {reasonerMode === 'deterministic_local'
              ? 'Modo local determinista (0 cuota LLM)'
              : `Gemini en vivo (${quota.llmCallsSucceeded}) · Local (${quota.deterministicLocalCalls + quota.deterministicFallbacks})`}
          </div>
        </div>
      </div>

      {/* 3. Barra de 2 acciones principales claras */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/65 p-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-xs font-semibold text-slate-100">Acciones rápidas</div>
            <p className="text-[11px] text-slate-400">
              Prueba una reflexión sin cambios o verifica una hipótesis en copias aisladas del Workbench.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onTriggerManualReflection}
              className="rounded-lg border border-cyan-400/55 bg-cyan-600/25 px-3 py-1.5 font-semibold text-cyan-100 transition hover:bg-cyan-600/45"
            >
              Pensar en alto ahora
            </button>
            <button
              type="button"
              onClick={onTriggerShadowTrialNow}
              disabled={currentTick < 1}
              title={
                currentTick < 1
                  ? 'Inicia o avanza al menos 1 paso real de simulación antes de probar en copia segura.'
                  : 'Formula una hipótesis y la prueba en copias aisladas del Workbench (Compuerta 1).'
              }
              className={`rounded-lg border px-3 py-1.5 font-semibold transition ${
                currentTick < 1
                  ? 'cursor-not-allowed border-slate-700 bg-slate-900 text-slate-500'
                  : 'border-emerald-400/55 bg-emerald-600/25 text-emerald-100 hover:bg-emerald-600/45'
              }`}
            >
              Probar mejora en copia segura
            </button>
          </div>
        </div>

        {activeGate2Watch && (
          <div className="mt-2.5 rounded-lg border border-amber-400/45 bg-amber-950/45 px-3 py-2 text-[11px] text-amber-200">
            <strong>Vigilancia activa (Gate 2):</strong> evaluando <code className="font-mono">{activeGate2Watch.cycleId}</code> ({activeGate2Watch.observedTicks}/{activeGate2Watch.watchWindowTicks} pasos · respaldo <code className="font-mono">{String(activeGate2Watch.prePromotionDigest || '').slice(0, 10)}…</code>). Si el rendimiento cae, se revierte automáticamente.
          </div>
        )}

        {(lastActionNotice || currentTick < 1) && (
          <div className="mt-2 text-[11px] text-amber-200/90">
            {lastActionNotice || 'Nota: para probar una mejora en copia segura (Gate 1), inicia la simulación al menos 1 paso.'}
          </div>
        )}
      </div>

      {/* 4. Flujo de Pensamientos Internos (limpio + botón "Detalles técnicos ▾" por tarjeta) */}
      <div className="rounded-xl border border-slate-700/70 bg-slate-900/60 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <MetricDualLabel
              casual={`Pensamientos y pruebas recientes (${entries.length})`}
              technical="Flujo en 1.ª persona"
            />
          </div>
          <div className="flex flex-wrap gap-1 text-[11px]">
            {[
              ['all', 'Todos'],
              ['reflect_only', 'Reflexiones'],
              ['promoted_confirmed', 'Confirmados'],
              ['promoted_watching', 'Vigilando'],
              ['rejected_gate1', 'Rechazados'],
              ['rolled_back_gate2', 'Revertidos'],
              ['aborted_stale_tick', 'Abortados'],
              ['blocked_by_knowledge_belt', 'Bloqueados']
            ].map(([val, lbl]) => (
              <button
                key={val}
                type="button"
                onClick={() => setFilterStatus(val)}
                className={`rounded-md border px-2 py-0.5 transition ${
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
          <div className="mt-3 rounded-lg border border-slate-800 bg-slate-950/70 p-4 text-center text-slate-400">
            Aún no hay pensamientos registrados. Pulsa <strong>&ldquo;Pensar en alto ahora&rdquo;</strong> para ver cómo razona el sistema sobre su estado actual.
          </div>
        ) : (
          <div className="mt-3 max-h-[520px] space-y-2.5 overflow-y-auto pr-1">
            {entries.map((entry) => {
              const badge = STATUS_BADGES[entry.finalStatus] || {
                label: entry.finalStatus,
                tech: entry.finalStatus,
                cls: 'border-slate-500 bg-slate-800 text-slate-200'
              };
              const g1 = entry.gate1Summary;
              const g2 = entry.gate2Summary;
              return (
                <article
                  key={entry.digest}
                  className="rounded-xl border border-slate-700/75 bg-slate-950/85 p-3 shadow-sm"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-mono text-xs font-bold text-cyan-300">
                        #{entry.seq} · Paso {entry.tick}
                      </span>
                      <span className="rounded-md border border-slate-700/80 bg-slate-900 px-2 py-0.5 text-[11px] text-slate-300">
                        {TRIGGER_LABELS[entry.triggerKind] || entry.triggerKind}
                      </span>
                      <span className="rounded-md border border-slate-700/60 bg-slate-900/70 px-1.5 py-0.5 font-mono text-[10px] text-slate-400">
                        {entry.external_llm_assisted ? 'IA externa (Gemini)' : 'Motor local'}
                      </span>
                    </div>
                    <span
                      title={badge.tech}
                      className={`rounded-md border px-2 py-0.5 text-[11px] font-semibold ${badge.cls}`}
                    >
                      {badge.label}
                    </span>
                  </div>

                  {/* Monólogo Interno en Primera Persona */}
                  <p className="mt-2.5 rounded-lg border border-cyan-500/20 bg-cyan-950/15 px-3 py-2 text-xs leading-relaxed text-slate-100">
                    &ldquo;{entry.firstPersonThought}&rdquo;
                  </p>

                  {entry.reasonerError && (
                    <div className="mt-1.5 rounded border border-amber-500/30 bg-amber-950/30 px-2 py-1 font-mono text-[10px] text-amber-200">
                      Se usó respaldo local porque falló la llamada remota: {entry.reasonerError}
                    </div>
                  )}

                  {/* Detalles técnicos colapsables por tarjeta (patrón Red Nodal) */}
                  <DetailToggleStrip
                    className="mt-2"
                    accent="cyan"
                    labelClosed="Detalles técnicos"
                    labelOpen="Ocultar detalles"
                    summary={(
                      <span className="font-mono text-[10px] text-slate-400">
                        acción: <span className="text-slate-200">{entry.actionSignature}</span>
                        {g1?.deltas ? ` · Δscore=${g1.deltas.deltaObjectiveScore}` : ''}
                        {` · ${badge.tech}`}
                      </span>
                    )}
                  >
                    <div className="space-y-2.5">
                      <div className="grid grid-cols-1 gap-2 md:grid-cols-3">
                        <div className="rounded bg-slate-900/70 p-2">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">Diagnóstico</span>
                          <p className="mt-0.5 text-[11px] text-slate-200">{entry.diagnosis}</p>
                        </div>
                        <div className="rounded bg-slate-900/70 p-2">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">Hipótesis falsable</span>
                          <p className="mt-0.5 text-[11px] text-slate-200">{entry.hypothesis}</p>
                        </div>
                        <div className="rounded bg-slate-900/70 p-2">
                          <span className="text-[10px] font-semibold uppercase text-slate-400">Acción tipada y régimen</span>
                          <div className="mt-0.5 font-mono text-[11px] text-cyan-200">modo: {entry.actionMode}</div>
                          <div className="font-mono text-[11px] text-emerald-300">firma: {entry.actionSignature}</div>
                          <div className="mt-0.5 font-mono text-[10px] text-slate-400">régimen: {entry.regimeSignature}</div>
                        </div>
                      </div>

                      {g1 && g1.branches && (
                        <div className="rounded border border-slate-700/80 bg-slate-900/60 p-2.5">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold text-cyan-200">
                              Compuerta 1 — Copia segura aislada ({g1.ticks} ticks · minΔ={g1.minObjectiveDelta ?? 0.005})
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
                                  <th className="py-1 pr-2">Aplicada</th>
                                  <th className="py-1 pr-2">Finitos</th>
                                  <th className="py-1 pr-2">InTube</th>
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
                                  <td className="py-1 pr-2">η={g1.branches.baseline?.effectiveEta} / {g1.branches.baseline?.crossSectorFluxShare}</td>
                                </tr>
                                <tr className="bg-cyan-950/25 font-semibold text-cyan-200">
                                  <td className="py-1 pr-2">candidate</td>
                                  <td className="py-1 pr-2">{String(Boolean(g1.branches.candidate?.candidateApplied))}</td>
                                  <td className="py-1 pr-2">{g1.branches.candidate?.finiteTickRate}</td>
                                  <td className="py-1 pr-2">{g1.branches.candidate?.meanInTubeRate}</td>
                                  <td className="py-1 pr-2">{g1.branches.candidate?.meanObjectiveScore}</td>
                                  <td className="py-1 pr-2">{g1.branches.candidate?.populatedSectors}/4</td>
                                  <td className="py-1 pr-2">{g1.branches.candidate?.sectorCoherenceMin}</td>
                                  <td className="py-1 pr-2">η={g1.branches.candidate?.effectiveEta} / {g1.branches.candidate?.crossSectorFluxShare}</td>
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

                      {g2 && (
                        <div className="rounded border border-slate-700/80 bg-slate-900/50 p-2 font-mono text-[11px] text-slate-300">
                          <strong>Compuerta 2 (Vigilancia):</strong> estado={g2.status} | respaldo={String(g2.prePromotionDigest || '').slice(0, 14)}… | ticks={g2.observedTicks ?? 0}/{g2.watchWindowTicks ?? 20} | rollback={String(Boolean(g2.rolledBack))}
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-2 font-mono text-[10px] text-slate-500">
                        <span>fuente: {entry.reasonerSource || 'deterministic_local'} (llm={String(Boolean(entry.external_llm_assisted))})</span>
                        <span>prevHash: {entry.prevHash.slice(0, 14)}…</span>
                        <span>digest: {entry.digest.slice(0, 18)}…</span>
                        {entry.gate2ResolutionDigest && (
                          <span className="text-emerald-400/80">
                            resolución Gate 2: {entry.gate2ResolutionDigest.slice(0, 16)}…
                          </span>
                        )}
                      </div>
                    </div>
                  </DetailToggleStrip>
                </article>
              );
            })}
          </div>
        )}
      </div>

      {/* 5. Tres cajones técnicos colapsados por defecto */}
      <div className="space-y-1">
        <CollapsibleSection
          sectionId="l3-settings-quota"
          title="Ajustes del Supervisor y Cuota LLM · Detalles"
          badge={`cada ${exploreEveryTicks} ticks · ${quota.callsLastHour}/${quota.maxCallsPerHour} h`}
          accent="cyan"
          defaultOpen={false}
        >
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-3">
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span>Reflexionar cada:</span>
                <select
                  aria-label="Intervalo de exploración programada Nivel 3"
                  value={exploreEveryTicks}
                  onChange={(e) => onChangeExploreEveryTicks(Number(e.target.value))}
                  className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100"
                >
                  <option value={25}>25 pasos</option>
                  <option value={50}>50 pasos (por defecto)</option>
                  <option value={100}>100 pasos</option>
                </select>
              </label>
              <label className="flex items-center gap-1.5 text-[11px] text-slate-300">
                <span>Motor de razonamiento:</span>
                <select
                  aria-label="Modo de razonador Nivel 3"
                  value={reasonerMode}
                  onChange={(e) => onChangeReasonerMode(e.target.value)}
                  className="rounded border border-slate-600 bg-slate-950 px-2 py-1 text-slate-100"
                >
                  <option value="gemini_with_fallback">Gemini 1.ª Persona (C2 + respaldo local)</option>
                  <option value="deterministic_local">Deliberador Local Determinista (0 cuota LLM)</option>
                </select>
              </label>
            </div>
            <div className="grid grid-cols-2 gap-2 font-mono text-[11px] sm:grid-cols-4">
              <div className="rounded bg-slate-950/70 p-2">
                <span className="text-slate-400">Cuota Hora:</span>
                <div className="text-sm text-white">{quota.callsLastHour} / {quota.maxCallsPerHour}</div>
              </div>
              <div className="rounded bg-slate-950/70 p-2">
                <span className="text-slate-400">Cuota Día:</span>
                <div className="text-sm text-white">{quota.callsLastDay} / {quota.maxCallsPerDay}</div>
              </div>
              <div className="rounded bg-slate-950/70 p-2">
                <span className="text-slate-400">LLM Live / Local:</span>
                <div className="text-sm text-cyan-200">{quota.llmCallsSucceeded} / {quota.deterministicLocalCalls + quota.deterministicFallbacks}</div>
              </div>
              <div className="rounded bg-slate-950/70 p-2">
                <span className="text-slate-400">Rechazos Gate 1:</span>
                <div className="text-sm text-rose-300">{quota.totalGate1Rejections}</div>
              </div>
            </div>
          </div>
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="l3-knowledge-belt"
          title="Memoria de Pruebas Pasadas (Cinto de Conocimiento SHA-256) · Detalles"
          badge={`${findings.length} hallazgos`}
          accent="emerald"
          defaultOpen={false}
        >
          <p className="mb-2 text-[11px] text-slate-400">
            Registro encadenado de lo que el sistema probó sobre sí mismo: impide volver a proponer hipótesis que ya fallaron en el mismo régimen.
          </p>
          {findings.length === 0 ? (
            <div className="rounded border border-slate-800 bg-slate-950/60 p-3 text-slate-400">
              El cinto de conocimiento está vacío en esta sesión.
            </div>
          ) : (
            <div className="max-h-56 overflow-y-auto">
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
                      <td className="py-1 pr-2 text-cyan-300">#{f.seq} · t={f.tick}</td>
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
        </CollapsibleSection>

        <CollapsibleSection
          sectionId="l3-worker-export"
          title="Ejecución en Segundo Plano (Worker) y Exportar / Importar Bitácora · Detalles"
          badge={workerRunning ? `Worker activo · t=${workerTick}` : 'SHA-256 JSON'}
          accent="violet"
          defaultOpen={false}
        >
          <p className="mb-2.5 text-[11px] text-slate-300">
            El Worker corre en un sandbox ligero paralelo (<code className="text-cyan-200">48 nodos · l3-worker</code>) para seguir explorando si minimizas la pestaña sin tocar jamás la red viva de 1500 nodos. También puedes usar <code className="text-cyan-200">node scripts/run-level3-autonomous-daemon.mjs</code> o exportar/importar la bitácora sellada.
          </p>
          <div className="flex flex-wrap gap-2">
            {!workerRunning ? (
              <button
                type="button"
                onClick={startWorkerDaemon}
                className="rounded-lg border border-violet-400/55 bg-violet-600/25 px-3 py-1.5 font-semibold text-violet-100 hover:bg-violet-600/45"
              >
                Activar Worker Anti-Throttling
              </button>
            ) : (
              <button
                type="button"
                onClick={stopWorkerDaemon}
                className="rounded-lg border border-amber-400/55 bg-amber-600/35 px-3 py-1.5 font-semibold text-amber-100 hover:bg-amber-600/55"
              >
                Detener Worker y Sincronizar (tick {workerTick})
              </button>
            )}
            <button
              type="button"
              onClick={handleExportBundle}
              className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
            >
              Exportar Bitácora JSON
            </button>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="rounded-lg border border-slate-500 bg-slate-800 px-3 py-1.5 font-semibold text-slate-200 hover:bg-slate-700"
            >
              Importar Bitácora JSON
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleImportFile}
              className="hidden"
            />
          </div>
          <div className="mt-2 font-mono text-[10px] text-slate-500">
            head SHA-256: {String(ledger?.headHash || '').slice(0, 32)}…
          </div>
          {statusMessage && (
            <div className="mt-2 rounded border border-cyan-500/30 bg-slate-950/80 p-2 text-[11px] text-cyan-200">
              {statusMessage}
            </div>
          )}
        </CollapsibleSection>
      </div>
    </section>
  );
}

export default Level3SupervisorAuditTab;
