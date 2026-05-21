import React from 'react';
import { SimulationConfigProvider } from '../contexts/SimulationConfigContext.jsx';
import { SimulationStateProvider } from '../contexts/SimulationStateContext.jsx';

export const StateProvider = ({ children }) => (
  <SimulationConfigProvider>
    <SimulationStateProvider>
      {children}
    </SimulationStateProvider>
  </SimulationConfigProvider>
);

export default StateProvider;
