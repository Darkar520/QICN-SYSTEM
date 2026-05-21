import React from 'react';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';

export const TabRouter = ({ children }) => (
  <QICNErrorBoundary boundaryName="TabRouter">
    {children}
  </QICNErrorBoundary>
);

export default TabRouter;
