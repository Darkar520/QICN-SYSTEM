// claim_scope: isolated_internal_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Pure comparison of recorded copies; not external validation.
export function compareWorkbenchTrajectories(baseline, branch) {
  if (!baseline.length || baseline.length !== branch.length) throw new Error('trajectory_length_mismatch');
  let maxAbsDiff = 0;
  let differingActions = 0;
  let firstDivergentTick = null;
  let fullStateIdentical = true;
  for (let index=0; index<baseline.length; index++) {
    const a=baseline[index], b=branch[index];
    if (a.tick !== b.tick) throw new Error('trajectory_tick_mismatch');
    for (const key of Object.keys(a.values)) {
      if (!Number.isFinite(a.values[key]) || !Number.isFinite(b.values[key])) throw new Error('missing_trajectory_observable');
      maxAbsDiff = Math.max(maxAbsDiff, Math.abs(a.values[key]-b.values[key]));
    }
    if (a.action !== b.action) differingActions++;
    if (a.stateDigest !== b.stateDigest) {
      fullStateIdentical = false;
      if (firstDivergentTick === null) firstDivergentTick = a.tick;
    }
  }
  const rate = rows => rows.filter(row => row.inTube === true).length / rows.length;
  const score = rows => rows.reduce((sum,row) => sum+row.values.viabilityObjectiveScore,0)/rows.length;
  return {
    fullStateIdentical, firstDivergentTick, maxAbsDiff,
    actionDivergence: differingActions/baseline.length,
    baselineInTubeRate: rate(baseline), branchInTubeRate: rate(branch),
    deltaInTubeRate: rate(branch)-rate(baseline),
    deltaObjectiveScore: score(branch)-score(baseline)
  };
}
