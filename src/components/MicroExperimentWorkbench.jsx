// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Isolated copies, not live primary evidence or external validation.
import React, { useState } from 'react';
const controls=['block_history_read','suspend_consolidation','freeze_predictor_weights','erase_declared_history','sensor_impulse'];
export function MicroExperimentWorkbench({workbench}) {
  const [profile,setProfile]=useState('paired_intervention'),[ticks,setTicks]=useState(12),[selected,setSelected]=useState(controls);
  const busy=['capturing','running'].includes(workbench.status),bundle=workbench.bundle;
  return <section aria-label="Workbench de copias aisladas" className="my-3 rounded border border-cyan-600 bg-gray-950 p-3 text-xs text-cyan-50">
    <h3 className="text-base font-semibold">Workbench de micro-experimentos</h3>
    <p>Copia aislada — no es evidencia primaria en vivo ni validación externa. external_support_certified = false.</p>
    <p>El estado actual se copia; reloj/RNG futuros y sensores son sintéticos nuevos, nunca una continuación del azar, reloj o sensores vivos. El perfil legacy conserva las fórmulas, no reconstruye esos cursores externos.</p>
    <div className="my-2 flex flex-wrap gap-3"><label>Perfil <select aria-label="Perfil Workbench" value={profile} disabled={busy} onChange={e=>setProfile(e.target.value)} className="bg-gray-800"><option>paired_intervention</option><option>legacy_compatibility</option></select></label>
      <label>Ticks <input aria-label="Ticks Workbench" className="w-16 bg-gray-800" type="number" min="1" max="60" value={ticks} disabled={busy} onChange={e=>setTicks(Number(e.target.value))}/></label>
      <button type="button" disabled={busy||!Number.isInteger(ticks)||ticks<1||ticks>60} onClick={()=>workbench.run({profile,ticks,interventions:selected})} className="rounded bg-cyan-800 px-3 py-1">Capturar y ejecutar copia</button>
      <button type="button" disabled={!busy} onClick={workbench.cancel} className="rounded bg-red-900 px-3 py-1">Cancelar Workbench</button></div>
    <fieldset disabled={busy}><legend>Sham obligatorio + intervenciones separadas</legend><span>baseline / sham (identidad)</span>{controls.map(control=><label key={control} className="mx-2 inline-block"><input type="checkbox" checked={selected.includes(control)} onChange={e=>setSelected(previous=>e.target.checked?[...previous,control]:previous.filter(item=>item!==control))}/>{control}</label>)}</fieldset>
    <p>Sham por sí solo no cuenta como intervención: evidencia not_recorded. Los resultados adjuntos corresponden al tick capturado, no al tick vivo posterior.</p>
    <p role="status">Estado: {workbench.status} · evidencia: {workbench.evidenceStatus}</p>
    {workbench.error&&<p role="alert" className="text-amber-200">{workbench.error.includes('external_entropy')?'Captura rechazada: hay entropía externa habilitada/en polling. Es necesario un contrato de replay capture; no se desactiva ni modifica el proveedor vivo.':workbench.error.includes('completed_committed')?'Espera una frontera de tick completado y confirmado en React, sin errores de ciclo.':workbench.error}</p>}
    {bundle&&<><p className="break-all">Captura (tick {bundle.capture.sourceTick}): {bundle.capture.digest}<br/>Protocolo: {bundle.protocol.digest}<br/>Resultado: {bundle.result.digest}</p>
      <div className="overflow-x-auto"><table className="w-full"><thead><tr>{['Rama','maxAbsDiff','actionDivergence','inTubeRate (base/copia)','meanObjectiveScore (base/copia)','Delta objetivo'].map(label=><th key={label} className="p-1 text-left">{label}</th>)}</tr></thead><tbody>{bundle.result.comparisons.map(row=>{
        const branch=bundle.result.branches.find(b=>b.id===row.branchId),base=bundle.result.branches[0];
        const mean=b=>b.trajectory.reduce((sum,p)=>sum+p.values.viabilityObjectiveScore,0)/b.trajectory.length;
        return <tr key={row.branchId}><td>{row.branchId}</td><td>{row.maxAbsDiff}</td><td>{row.actionDivergence}</td><td>{row.baselineInTubeRate} / {row.branchInTubeRate}</td><td>{mean(base)} / {mean(branch)}</td><td>{row.deltaObjectiveScore}</td></tr>;
      })}</tbody></table></div>
      {bundle.result.hybridLateQueryTieBreaker&&<div data-testid="workbench-hybrid-late-query" className="my-2 rounded border border-cyan-800 bg-gray-900 p-2">
        <div className="font-semibold text-cyan-200">Desempate Híbrido Paper IX/X (5 raíces acopladas + consulta tardía de paridad + separador atómico)</div>
        <p className="text-[11px] text-cyan-100">
          5.º contraste G = {bundle.result.hybridLateQueryTieBreaker.fifthContrastG} · Lipschitz = {bundle.result.hybridLateQueryTieBreaker.safeFibreLipschitz} · cota cuerpo = {bundle.result.hybridLateQueryTieBreaker.invariantBodyNormBound} · margen ruidoso penalizado = {bundle.result.hybridLateQueryTieBreaker.noisyPenalizedMargin} (&gt; G/2) · óptimo partición (m,B)=(2,1) = {bundle.result.hybridLateQueryTieBreaker.m2_b1_best_mean} · separador atómico δ_int(F₂²) = {bundle.result.hybridLateQueryTieBreaker.atomicSeparator.primaryDeltaInt} (F₃²: {bundle.result.hybridLateQueryTieBreaker.atomicSeparator.oddPrimeDeltaInt}) vs A=I ({bundle.result.hybridLateQueryTieBreaker.atomicSeparator.reducibleIdentityDeltaInt})
        </p>
        <p className="text-[11px] text-cyan-300">
          Controles negativos: corte físico T_d (η=0) = {bundle.result.hybridLateQueryTieBreaker.negativeControls.tdCutContrast} · presupuesto suficiente (B=m) = {bundle.result.hybridLateQueryTieBreaker.negativeControls.sufficientBudgetBEqualsMError} · réplica total igual costo R = {bundle.result.hybridLateQueryTieBreaker.negativeControls.equalCostTotalReplicaR} · referencia invertida R = {bundle.result.hybridLateQueryTieBreaker.negativeControls.invertedReferenceR} · fuga selectiva Paper X = {bundle.result.hybridLateQueryTieBreaker.negativeControls.knownSelectiveLeakRisk} · always_tie coverage = {bundle.result.hybridLateQueryTieBreaker.negativeControls.alwaysTieCoverage} · digest: {bundle.result.hybridLateQueryTieBreaker.digest.slice(0,16)}…
        </p>
      </div>}
      {bundle.result.branches.map(branch=><details key={branch.id}><summary>{branch.id}: márgenes top-2, pesos, Fisher, engramas y procedencia</summary><pre className="max-h-72 overflow-auto whitespace-pre-wrap break-all">{JSON.stringify({intervention:branch.intervention,chainHead:branch.chain.headHash,trajectory:branch.trajectory.map(p=>({tick:p.tick,margin:p.policyDiagnostic?.topTwoMargin??'not_recorded',weights:p.predictorWeights,engrams:p.engramCount,viability:p.viabilityEvaluation}))},null,2)}</pre></details>)}</>}
  </section>;
}
export default MicroExperimentWorkbench;
