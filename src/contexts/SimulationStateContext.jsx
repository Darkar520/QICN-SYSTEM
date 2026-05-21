import React, { createContext, useContext, useMemo, useState } from 'react';

const SimulationStateContext = createContext(null);

export const SimulationStateProvider = ({ children }) => {
  const [shellState, setShellState] = useState({
    mountedAt: Date.now(),
    runtimeStatus: 'bootstrapping',
    tickCount: 0,
    ccc: 0,
    pmia: 0,
    omega: 0,
    beth_q: 0,
    spectral_gap: 0,
    stasisIndex: 0
  });

  const value = useMemo(() => ({
    shellState,
    setShellState,
    tickCount: shellState.tickCount,
    ccc: shellState.ccc,
    pmia: shellState.pmia,
    omega: shellState.omega,
    beth_q: shellState.beth_q,
    spectral_gap: shellState.spectral_gap,
    stasisIndex: shellState.stasisIndex
  }), [shellState]);

  return (
    <SimulationStateContext.Provider value={value}>
      {children}
    </SimulationStateContext.Provider>
  );
};

export const useSimulationStateContext = () => {
  const value = useContext(SimulationStateContext);
  if (!value) {
    throw new Error('useSimulationStateContext must be used within SimulationStateProvider');
  }
  return value;
};

export default SimulationStateContext;
