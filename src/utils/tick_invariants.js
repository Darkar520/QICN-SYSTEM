/**
 * Tick invariants utilities (no React/DOM dependencies).
 */

/**
 * L1 (liveness): advance is invoked exactly once per tick, even on early returns or exceptions.
 * @template T
 * @param {(ctx:{advanceOnce: () => boolean}) => T} tickFn
 * @param {() => void} advanceFn
 * @returns {T}
 */
export const runWithLivenessInvariant = (tickFn, advanceFn) => {
  let advanced = false;
  const advanceOnce = () => {
    if (advanced) return false;
    advanced = true;
    advanceFn();
    return true;
  };
  try {
    return tickFn({ advanceOnce });
  } finally {
    advanceOnce();
  }
};

/**
 * Recovery trigger: if activeNodes is empty, activate and re-fetch.
 * @param {{
 *  activeNodes: Array<any>,
 *  getActiveNodes: () => Array<any>,
 *  activateRandomNodes: (count:number) => void,
 *  activateCount: number,
 *  recoveryCounterRef: { current: number }
 * }} args
 * @returns {{ activeNodes: Array<any>, recoveryTriggered: boolean }}
 */
export const recoverIfEmpty = ({
  activeNodes,
  getActiveNodes,
  activateRandomNodes,
  activateCount,
  recoveryCounterRef
}) => {
  if (activeNodes.length !== 0) return { activeNodes, recoveryTriggered: false };
  recoveryCounterRef.current += 1;
  activateRandomNodes(activateCount);
  const recovered = getActiveNodes();
  return { activeNodes: recovered, recoveryTriggered: true };
};

