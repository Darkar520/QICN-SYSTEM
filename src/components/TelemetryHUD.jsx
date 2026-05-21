import React from 'react';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';

export const TelemetryHUD = ({ children }) => (
  <QICNErrorBoundary boundaryName="TelemetryHUD">
    {children}
  </QICNErrorBoundary>
);

export default TelemetryHUD;
