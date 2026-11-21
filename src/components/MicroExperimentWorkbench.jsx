// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Isolated copies, not live primary evidence or external validation.
import React, { useState } from 'react';
import { buildSealedWorkbenchExportBundle } from '../experiments/workbench/pheTransplantCampaign.js';

const historyAndSensorControls = [
  'block_history_read',
  'suspend_consolidation',
  'freeze_predictor_weights',
  'erase_declared_history',
  'sensor_impulse'
];
const dynamicsAndCutControls = [
  'kaizen_learned_mode',
  'kaizen_legacy_mode',
  'sensor_observer_dynamics',
  'td_cut_eta_zero',
  'reducible_control'
];
const level2AndLesionControls = [
  'structural_plasticity_level1',
  'structural_plasticity_level2',
  'lesion_sector_wipe',
  'lesion_sector_wipe_level2',
  'lesion_synaptic_cut',
  'lesion_synaptic_cut_level2',
  'fault_nan_injection_level2'
];

function isInterventionNoOpAgainstCapture(intervention, capturedConfig) {
  if (!capturedConfig || typeof capturedConfig !== 'object') return false;
  const coupling = capturedConfig.NODAL_TOWER_COUPLING_MODE;
  const l2 = capturedConfig.STRUCTURAL_PLASTICITY_LEVEL2_ENABLED === true;
  const kaizen = capturedConfig.KAIZEN_ADJUSTMENT_MODE;
  const sensorObs = capturedConfig.SENSOR_OBSERVER_DYNAMICS_ENABLED === true;
  if (intervention === 'structural_plasticity_level2') return coupling === 'bidirectional' && l2;
  if (intervention === 'structural_plasticity_level1') return coupling === 'bidirectional' && !l2;
  if (intervention === 'kaizen_learned_mode') return kaizen === 'learned' && sensorObs;
  if (intervention === 'kaizen_legacy_mode') return kaizen === 'legacy' && !sensorObs;
  if (intervention === 'td_cut_eta_zero') return coupling === 'td_cut_eta_zero';
  if (intervention === 'reducible_control') return coupling === 'reducible_control';
  return false;
}

export function MicroExperimentWorkbench({ workbench }) {
  const [profile, setProfile] = useState('paired_intervention');
  const [ticks, setTicks] = useState(12);
  const [selected, setSelected] = useState(historyAndSensorControls);
  const [exportStatus, setExportStatus] = useState('');
  const busy = ['capturing', 'running'].includes(workbench.status);
  const bundle = workbench.bundle;

  const toggleControl = (control, checked) => {
    setSelected((previous) => (
      checked
        ? (previous.includes(control) ? previous : [...previous, control])
        : previous.filter((item) => item !== control)
    ));
  };

  const handleExportSealedBundle = () => {
    if (!bundle) return;
    try {
      const sealedExport = buildSealedWorkbenchExportBundle(bundle);
      const json = JSON.stringify(sealedExport, null, 2);
      const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `qicn-workbench-tick-${sealedExport.sourceTick}-${sealedExport.digest.slice(0, 12)}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      setExportStatus(`Paquete sellado exportado (${sealedExport.digest.slice(0, 16)}…).`);
    } catch (error) {
      setExportStatus(`No se pudo exportar: ${error?.message || String(error)}`);
    }
  };

  const phe = bundle?.result?.pheTransplantCampaign || null;

  return (
    <section aria-label="Workbench de copias aisladas" className="my-3 rounded border border-cyan-600 bg-gray-950 p-3 text-xs text-cyan-50">
      <h3 className="text-base font-semibold">Workbench de micro-experimentos</h3>
      <p>Copia aislada — no es evidencia primaria en vivo ni validación externa. external_support_certified = false.</p>
      <p>El estado actual se copia; reloj/RNG futuros y sensores son sintéticos nuevos, nunca una continuación del azar, reloj o sensores vivos. El perfil legacy conserva las fórmulas, no reconstruye esos cursores externos.</p>
      <div className="my-2 flex flex-wrap items-center gap-3">
        <label>
          Perfil{' '}
          <select aria-label="Perfil Workbench" value={profile} disabled={busy} onChange={(e) => setProfile(e.target.value)} className="bg-gray-800">
            <option>paired_intervention</option>
            <option>legacy_compatibility</option>
          </select>
        </label>
        <label>
          Ticks{' '}
          <input aria-label="Ticks Workbench" className="w-16 bg-gray-800" type="number" min="1" max="60" value={ticks} disabled={busy} onChange={(e) => setTicks(Number(e.target.value))} />
        </label>
        <button
          type="button"
          disabled={busy || !Number.isInteger(ticks) || ticks < 1 || ticks > 60}
          onClick={() => { setExportStatus(''); workbench.run({ profile, ticks, interventions: selected }); }}
          className="rounded bg-cyan-800 px-3 py-1 hover:bg-cyan-700 disabled:opacity-50"
        >
          Capturar y ejecutar copia
        </button>
        <button type="button" disabled={!busy} onClick={workbench.cancel} className="rounded bg-red-900 px-3 py-1 disabled:opacity-50">
          Cancelar Workbench
        </button>
        <button
          type="button"
          data-testid="workbench-export-sealed"
          disabled={busy || !bundle}
          onClick={handleExportSealedBundle}
          className="rounded bg-emerald-800 px-3 py-1 hover:bg-emerald-700 disabled:opacity-40"
        >
          Exportar paquete sellado (.json)
        </button>
      </div>
      <fieldset disabled={busy} className="space-y-1">
        <legend>Sham obligatorio + intervenciones separadas</legend>
        <div>
          <span className="font-semibold text-cyan-200">baseline / sham (identidad)</span>
          {historyAndSensorControls.map((control) => (
            <label key={control} className="mx-2 inline-block">
              <input type="checkbox" checked={selected.includes(control)} onChange={(e) => toggleControl(control, e.target.checked)} />
              {' '}{control}
            </label>
          ))}
        </div>
        <div>
          <span className="font-semibold text-pink-200">Kaizen / Sensores / Cortes físicos:</span>
          {dynamicsAndCutControls.map((control) => (
            <label key={control} className="mx-2 inline-block">
              <input type="checkbox" checked={selected.includes(control)} onChange={(e) => toggleControl(control, e.target.checked)} />
              {' '}{control}
            </label>
          ))}
        </div>
        <div>
          <span className="font-semibold text-emerald-200">Nivel 2 / Lesiones y Autoreparación:</span>
          {level2AndLesionControls.map((control) => (
            <label key={control} className="mx-2 inline-block">
              <input type="checkbox" checked={selected.includes(control)} onChange={(e) => toggleControl(control, e.target.checked)} />
              {' '}{control}
            </label>
          ))}
        </div>
      </fieldset>
      <p>Sham por sí solo no cuenta como intervención: evidencia not_recorded. Los resultados adjuntos corresponden al tick capturado, no al tick vivo posterior.</p>
      <p role="status">Estado: {workbench.status} · evidencia: {workbench.evidenceStatus}{exportStatus ? ` · ${exportStatus}` : ''}</p>
      {workbench.error && (
        <p role="alert" className="text-amber-200">
          {workbench.error.includes('external_entropy')
            ? 'Captura rechazada: hay entropía externa habilitada/en polling. Es necesario un contrato de replay capture; no se desactiva ni modifica el proveedor vivo.'
            : workbench.error.includes('completed_committed')
              ? 'Espera una frontera de tick completado y confirmado en React, sin errores de ciclo.'
              : workbench.error}
        </p>
      )}
      {bundle && (
        <>
          <p className="break-all">
            Captura (tick {bundle.capture.sourceTick}): {bundle.capture.digest}<br />
            Protocolo: {bundle.protocol.digest}<br />
            Resultado: {bundle.result.digest}
          </p>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  {['Rama', 'maxAbsDiff', 'actionDivergence', 'inTubeRate (base/copia)', 'meanObjectiveScore (base/copia)', 'Delta objetivo', 'Topología final (nodos/sectores/grado)'].map((label) => (
                    <th key={label} className="p-1 text-left">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {bundle.result.comparisons.map((row) => {
                  const branch = bundle.result.branches.find((b) => b.id === row.branchId);
                  const base = bundle.result.branches[0];
                  const mean = (b) => b.trajectory.reduce((sum, p) => sum + p.values.viabilityObjectiveScore, 0) / b.trajectory.length;
                  const termTopo = branch?.trajectory?.at(-1)?.topology || null;
                  const matchesCapture = branch && branch.intervention?.intervention !== 'sham'
                    && isInterventionNoOpAgainstCapture(branch.intervention?.intervention, bundle.capture?.configuration);
                  return (
                    <tr key={row.branchId}>
                      <td>
                        {row.branchId}
                        {matchesCapture && (
                          <span className="ml-1 rounded bg-amber-900/60 px-1 text-[10px] text-amber-200" title="Esta rama fija el mismo modo que ya estaba activo en la captura viva; usa la rama opuesta como ablación.">
                            (= config capturada)
                          </span>
                        )}
                      </td>
                      <td>{row.maxAbsDiff}</td>
                      <td>{row.actionDivergence}</td>
                      <td>{row.baselineInTubeRate} / {row.branchInTubeRate}</td>
                      <td>{mean(base)} / {mean(branch)}</td>
                      <td>{row.deltaObjectiveScore}</td>
                      <td>
                        {termTopo
                          ? `${termTopo.activeNodes}n · ${termTopo.populatedSectors}/4s · g=${termTopo.meanDegree}${termTopo.orphanCount > 0 ? ` · h=${termTopo.orphanCount}` : ''}`
                          : '—'}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {(() => {
            const byId = Object.fromEntries((bundle.result.branches || []).map((b) => [b.id, b]));
            const pairs = [
              ['Amputación sector 0 (25 %)', byId.lesion_sector_wipe, byId.lesion_sector_wipe_level2],
              ['Tormenta sináptica (85 %)', byId.lesion_synaptic_cut, byId.lesion_synaptic_cut_level2]
            ].filter(([, n1, n2]) => n1 && n2);
            if (!pairs.length) return null;
            const meanScore = (b) => b.trajectory.reduce((sum, p) => sum + p.values.viabilityObjectiveScore, 0) / b.trajectory.length;
            return (
              <div data-testid="workbench-level2-lesion-contrast" className="my-2 rounded border border-cyan-700/70 bg-gray-900 p-2">
                <div className="font-semibold text-cyan-200">Contraste directo de recuperación terminal bajo lesión (Nivel 2 vs Nivel 1)</div>
                {pairs.map(([label, n1, n2]) => {
                  const t1 = n1.trajectory.at(-1)?.topology || {};
                  const t2 = n2.trajectory.at(-1)?.topology || {};
                  const s1 = meanScore(n1);
                  const s2 = meanScore(n2);
                  return (
                    <p key={label} className="text-[11px] text-cyan-100">
                      {label}: Nivel 1 ({t1.activeNodes}n, {t1.populatedSectors}/4 sectores, grado={t1.meanDegree}, score={s1.toFixed(6)}) vs Nivel 2 ({t2.activeNodes}n, {t2.populatedSectors}/4 sectores, grado={t2.meanDegree}, score={s2.toFixed(6)}, Δ(N2−N1)={(s2 - s1 >= 0 ? '+' : '') + (s2 - s1).toFixed(6)})
                    </p>
                  );
                })}
              </div>
            );
          })()}
          {bundle.result.hybridLateQueryTieBreaker && (
            <div data-testid="workbench-hybrid-late-query" className="my-2 rounded border border-cyan-800 bg-gray-900 p-2">
              <div className="font-semibold text-cyan-200">Desempate Híbrido Paper IX/X (5 raíces acopladas + consulta tardía de paridad + separador atómico)</div>
              <p className="text-[11px] text-cyan-100">
                5.º contraste G = {bundle.result.hybridLateQueryTieBreaker.fifthContrastG} · Lipschitz = {bundle.result.hybridLateQueryTieBreaker.safeFibreLipschitz} · cota cuerpo = {bundle.result.hybridLateQueryTieBreaker.invariantBodyNormBound} · margen ruidoso penalizado = {bundle.result.hybridLateQueryTieBreaker.noisyPenalizedMargin} (&gt; G/2 ante lectura cruda ε ≤ G/1024 + costo B·w_c en la subplanta de 5 raíces) · óptimo partición (m,B)=(2,1) = {bundle.result.hybridLateQueryTieBreaker.m2_b1_best_mean} · separador atómico δ_int(F₂²) = {bundle.result.hybridLateQueryTieBreaker.atomicSeparator.primaryDeltaInt} (F₃²: {bundle.result.hybridLateQueryTieBreaker.atomicSeparator.oddPrimeDeltaInt}) vs A=I ({bundle.result.hybridLateQueryTieBreaker.atomicSeparator.reducibleIdentityDeltaInt})
              </p>
              <p className="text-[11px] text-cyan-300">
                Controles negativos: corte físico T_d (η=0) = {bundle.result.hybridLateQueryTieBreaker.negativeControls.tdCutContrast} · presupuesto suficiente (B=m) = {bundle.result.hybridLateQueryTieBreaker.negativeControls.sufficientBudgetBEqualsMError} · réplica total igual costo R = {bundle.result.hybridLateQueryTieBreaker.negativeControls.equalCostTotalReplicaR} · referencia invertida R = {bundle.result.hybridLateQueryTieBreaker.negativeControls.invertedReferenceR} · fuga selectiva Paper X = {bundle.result.hybridLateQueryTieBreaker.negativeControls.knownSelectiveLeakRisk} · always_tie coverage = {bundle.result.hybridLateQueryTieBreaker.negativeControls.alwaysTieCoverage} · digest: {bundle.result.hybridLateQueryTieBreaker.digest.slice(0, 16)}…
              </p>
            </div>
          )}
          {phe && (
            <div data-testid="workbench-phe-campaign" className="my-2 rounded border border-emerald-700/70 bg-gray-900 p-2">
              <div className="font-semibold text-emerald-300">Campaña comparativa P / H / E + Trasplante sellado + Separador atómico dinámico (copia aislada)</div>
              <p className="text-[11px] text-emerald-100">
                Brazo P (acoplado η={phe.armP.effectiveEta}, {phe.campaignTicks} ticks): flujo inter-sector = {phe.armP.bridge.crossSectorFluxShare} · no-factorizabilidad = {phe.armP.bridge.nodalNonFactorizabilityFlux} · sync torre-red = {phe.armP.bridge.bridgeNodalSyncIndex} · Brazo E (réplica igual costo): maxAbsDiff = {phe.armE.maxAbsDiff}, R = {phe.armE.replicaSeparationR} (identidad bit-a-bit: {String(phe.armE.fullStateIdentical)})
              </p>
              <p className="text-[11px] text-emerald-200">
                Brazo H (cuello de botella m={phe.armH.m}, x={phe.armH.retainedWordX}, q={phe.armH.lateQueryQ}): B&lt;m ⇒ R_unif = {phe.armH.transcriptSweep[0]?.uniformSeparationR} ({phe.armH.transcriptSweep.map((r) => `B=${r.B}:${r.uniformSeparationR}`).join(' · ')}) · corte T_d = {phe.armH.tdCutParityResponse}
              </p>
              <p className="text-[11px] text-cyan-200">
                Trasplante sellado (tick medio {phe.sealedTransplant.midpointTick}, digest {phe.sealedTransplant.midpointDynamicDigest.slice(0, 14)}…): continuación trasplantada maxAbsDiff = {phe.sealedTransplant.transplantedVsSourceMaxAbsDiff} (idéntica: {String(phe.sealedTransplant.transplantedFullStateIdentical)}) vs control sin trasplante maxAbsDiff = {phe.sealedTransplant.untransplantedVsSourceMaxAbsDiff}
              </p>
              <p className="text-[11px] text-amber-200">
                Separador atómico dinámico en copia viva: bidireccional vs corte T_d (η=0) maxAbsDiff = {phe.dynamicAtomicSeparator.bidirectionalVsTdCutMaxAbsDiff} · vs reducible (A=I) maxAbsDiff = {phe.dynamicAtomicSeparator.bidirectionalVsReducibleMaxAbsDiff} · contraste integrativo = {phe.dynamicAtomicSeparator.integrationFluxContrast} (flujo inter-sector A=I = {phe.dynamicAtomicSeparator.reducibleInterSectorFluxShare}) · digest: {phe.digest.slice(0, 16)}…
              </p>
            </div>
          )}
          {bundle.result.branches.map((branch) => (
            <details key={branch.id}>
              <summary>{branch.id}: márgenes top-2, pesos, Fisher, engramas y procedencia</summary>
              <pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all">
                {JSON.stringify({
                  intervention: branch.intervention,
                  chainHead: branch.chain.headHash,
                  trajectory: branch.trajectory.map((p) => ({
                    tick: p.tick,
                    margin: p.policyDiagnostic?.topTwoMargin ?? 'not_recorded',
                    weights: p.predictorWeights,
                    engrams: p.engramCount,
                    viability: p.viabilityEvaluation
                  }))
                }, null, 2)}
              </pre>
            </details>
          ))}
        </>
      )}
    </section>
  );
}
export default MicroExperimentWorkbench;
