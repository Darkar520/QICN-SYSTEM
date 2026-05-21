import React from 'react';
import { QICNErrorBoundary } from '../ErrorBoundary.jsx';

export const ApiControlTab = ({ children }) => (
  <QICNErrorBoundary boundaryName="ApiControlTab">
    {children}
  </QICNErrorBoundary>
);

export default ApiControlTab;
