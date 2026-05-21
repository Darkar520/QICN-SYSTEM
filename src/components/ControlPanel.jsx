import React from 'react';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';

export const ControlPanel = ({ children }) => (
  <QICNErrorBoundary boundaryName="ControlPanel">
    {children}
  </QICNErrorBoundary>
);

export default ControlPanel;
