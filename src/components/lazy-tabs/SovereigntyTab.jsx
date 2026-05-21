import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const SovereigntyTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="SovereigntyTab">
    {children}
  </QICNErrorBoundary>
);

export default SovereigntyTab;
