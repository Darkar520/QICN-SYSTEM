import React, { createContext, useContext, useMemo, useState } from 'react';

const SimulationStateContext = createContext(null);

export const SimulationStateProvider = ({ children }) => {
  const [shellState, setShellState] = useState({
    mountedAt: Date.now(),
    runtimeStatus: 'bootstrapping'
  });

  const value = useMemo(() => ({
    shellState,
    setShellState
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
