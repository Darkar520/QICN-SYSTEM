import React, { createContext, useContext, useMemo, useRef } from 'react';
import runtimeEnv from '../config/runtimeEnv.js';

const SimulationConfigContext = createContext(null);

export const SimulationConfigProvider = ({ children }) => {
  const simulationControllerRef = useRef(null);
  const value = useMemo(() => ({
    simulationControllerRef,
    isRunning: false,
    currentPhase: 'shell',
    sensorsMode: 'runtime-detected',
    appEnv: runtimeEnv.APP_ENV || 'runtime_unfrozen',
    strictGeminiModel: runtimeEnv.GEMINI_STRICT_MODEL !== false,
    quantumEntropyEnabled: runtimeEnv.QUANTUM_ENTROPY_ENABLED !== false
  }), [simulationControllerRef]);

  return (
    <SimulationConfigContext.Provider value={value}>
      {children}
    </SimulationConfigContext.Provider>
  );
};

export const useSimulationConfigContext = () => {
  const value = useContext(SimulationConfigContext);
  if (!value) {
    throw new Error('useSimulationConfigContext must be used within SimulationConfigProvider');
  }
  return value;
};

export default SimulationConfigContext;
