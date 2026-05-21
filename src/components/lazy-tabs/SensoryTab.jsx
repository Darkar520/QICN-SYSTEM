import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const SensoryTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="SensoryTab">
    {children}
  </QICNErrorBoundary>
);

export default SensoryTab;
