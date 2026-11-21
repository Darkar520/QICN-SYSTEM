import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const Level3SupervisorTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="Level3SupervisorTab">
    {children}
  </QICNErrorBoundary>
);

export default Level3SupervisorTab;
