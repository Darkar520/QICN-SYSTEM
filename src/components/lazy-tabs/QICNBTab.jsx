import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const QICNBTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="QICNBTab">
    {children}
  </QICNErrorBoundary>
);

export default QICNBTab;
