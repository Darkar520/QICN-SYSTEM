// React adapter over the single imperative cycle. Keep the original two
// useCallback invocations and dependency arrays in the driver.
import { useCallback } from 'react';
import { createSimulationCycleDriver } from '../runtime/SimulationCycleDriver.js';
export function useSimulationCycle(deps) {
  return createSimulationCycleDriver(deps, { bindCallback: useCallback });
}
export default useSimulationCycle;
