import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const AutonomyEvolutionTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="AutonomyEvolutionTab">
    {children}
  </QICNErrorBoundary>
);

export default AutonomyEvolutionTab;
