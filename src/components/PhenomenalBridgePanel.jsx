import React, { memo, useMemo } from 'react';

const BRIDGE_PREDICATES = Object.freeze([
  { id: 'Pi_D', label: 'Differentiation', status: 'runtime_proxy_available' },
  { id: 'Pi_V', label: 'Valence structure', status: 'runtime_proxy_available' },
  { id: 'Pi_W', label: 'World richness', status: 'runtime_proxy_available' },
  { id: 'Pi_A', label: 'Ambiguity bearing', status: 'runtime_proxy_available' },
  { id: 'Pi_E', label: 'Embodied closure', status: 'runtime_proxy_available' },
  { id: 'Pi_T', label: 'Temporal lived structure', status: 'runtime_proxy_available' }
]);

const PAPER9_BOUNDARY =
  'Framework-internal Paper 9 bridge diagnostics only. These UI fields are not phenomenality evidence, not human equivalence, not metaphysical closure, and not Paper 9 final authorization.';

const PAPER10_BOUNDARY =
  'Comparative Program and Paper 10 surfaces remain non-evidential until external adjudication, human comparator data, frozen preregistration records, and reviewer/adjudicator records are actually executed.';

const BRIDGE_DIAGNOSTIC_BOUNDARY =
  'Bridge diagnostics are internal telemetry proxies only. They are not formal proofs, not external validation, not Sub_bridge gates, not C_op evidence by themselves, and not consciousness evidence.';

const StatusPill = ({ children, tone = 'cyan' }) => {
  const toneClass = tone === 'emerald'
    ? 'border-emerald-500/40 text-emerald-200 bg-emerald-950/40'
    : tone === 'amber'
      ? 'border-amber-500/40 text-amber-200 bg-amber-950/40'
      : 'border-cyan-500/40 text-cyan-200 bg-cyan-950/40';
  return (
    <span className={`inline-flex items-center rounded-md border px-2 py-1 text-[11px] font-mono ${toneClass}`}>
      {children}
    </span>
  );
};

const PhenomenalBridgePanel = memo(function PhenomenalBridgePanel({
  simulationStep = 0,
  runtimeHealth = null,
  bridgeDiagnostics = null
}) {
  const throttleWindow = Math.floor(Number(simulationStep || 0) / 10);

  const snapshot = useMemo(() => ({
    tick_bucket: throttleWindow * 10,
    paper9_status: 'internal_bridge_closure_layer_implemented',
    paper9_authorization: 'not_paper9_authorization',
    paper10_status: 'stage3_6b_runtime_health_and_stage3_7_opening_defined',
    comparative_status: 'non_evidential_pre_adjudication_surface',
    run_verdict_status: runtimeHealth?.status || 'runtime_health_not_available',
    source_boundary: 'internal_support_only'
  }), [throttleWindow, runtimeHealth?.status]);

  const diagnosticSnapshot = useMemo(() => {
    const source = bridgeDiagnostics || {};
    return {
      phase: source.phase?.classification || 'diagnostic_not_connected',
      trajectory: source.trajectory?.classification || 'diagnostic_not_connected',
      galerkin: source.galerkin?.classification || 'diagnostic_not_connected',
      fixedPoint: source.fixedPoint?.classification || 'diagnostic_not_connected',
      epistemicStatus: source.epistemicStatus || 'internal_diagnostic_proxy_only'
    };
  }, [bridgeDiagnostics, throttleWindow]);

  return (
    <section className="mb-6 rounded-xl border border-fuchsia-500/30 bg-gray-900/70 p-4 shadow-lg">
      <div className="mb-3 flex flex-col gap-2 md:flex-row md:items-start md:justify-between">
        <div>
          <h3 className="text-lg font-semibold text-fuchsia-200">Phenomenal Bridge + Comparative Program</h3>
          <p className="mt-1 text-xs text-gray-400">
            Paper 9 bridge predicates and Paper 10 comparative readiness are exposed here as diagnostic governance surfaces.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <StatusPill tone="cyan">tick_bucket={snapshot.tick_bucket}</StatusPill>
          <StatusPill tone={snapshot.run_verdict_status === 'healthy' ? 'emerald' : 'amber'}>
            run={snapshot.run_verdict_status}
          </StatusPill>
        </div>
      </div>

      <div className="grid gap-3 lg:grid-cols-3">
        <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-fuchsia-300">Paper 9 predicates</div>
          <div className="grid grid-cols-2 gap-2">
            {BRIDGE_PREDICATES.map((predicate) => (
              <div key={predicate.id} className="rounded-md border border-gray-700 bg-gray-900/80 p-2">
                <div className="font-mono text-xs text-fuchsia-100">{predicate.id}</div>
                <div className="text-[11px] text-gray-400">{predicate.label}</div>
                <div className="mt-1 text-[10px] text-cyan-300">{predicate.status}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-cyan-300">Runtime bridge status</div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Implementation</dt>
              <dd className="text-right font-mono text-cyan-100">{snapshot.paper9_status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Paper status</dt>
              <dd className="text-right font-mono text-amber-100">{snapshot.paper9_authorization}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Claim surface</dt>
              <dd className="text-right font-mono text-amber-100">{snapshot.source_boundary}</dd>
            </div>
          </dl>
        </div>

        <div className="rounded-lg border border-gray-700 bg-gray-950/60 p-3">
          <div className="mb-2 text-xs uppercase tracking-wide text-teal-300">Paper 10 comparative state</div>
          <dl className="space-y-2 text-xs">
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Stage</dt>
              <dd className="text-right font-mono text-teal-100">{snapshot.paper10_status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Evidence</dt>
              <dd className="text-right font-mono text-amber-100">{snapshot.comparative_status}</dd>
            </div>
            <div className="flex justify-between gap-3">
              <dt className="text-gray-400">Human data</dt>
              <dd className="text-right font-mono text-amber-100">absent_until_execution</dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="mt-3 space-y-2 rounded-lg border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-100">
        <p><strong>Interpretation boundary.</strong> {PAPER9_BOUNDARY}</p>
        <p>{PAPER10_BOUNDARY}</p>
      </div>

      <div className="mt-3 rounded-lg border border-slate-600 bg-slate-950/50 p-3 text-xs text-slate-200">
        <div className="mb-2 text-xs uppercase tracking-wide text-slate-300">Bridge diagnostics</div>
        <dl className="grid gap-2 md:grid-cols-2">
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Phase transversality</dt>
            <dd className="text-right font-mono text-slate-100">{diagnosticSnapshot.phase}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Trajectory contraction</dt>
            <dd className="text-right font-mono text-slate-100">{diagnosticSnapshot.trajectory}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Galerkin relative error</dt>
            <dd className="text-right font-mono text-slate-100">{diagnosticSnapshot.galerkin}</dd>
          </div>
          <div className="flex justify-between gap-3">
            <dt className="text-slate-400">Fixed point drift</dt>
            <dd className="text-right font-mono text-slate-100">{diagnosticSnapshot.fixedPoint}</dd>
          </div>
        </dl>
        <p className="mt-2 text-amber-100"><strong>Diagnostic boundary.</strong> {BRIDGE_DIAGNOSTIC_BOUNDARY}</p>
      </div>
    </section>
  );
});

export default PhenomenalBridgePanel;
