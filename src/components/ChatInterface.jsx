import React from 'react';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';

export const ChatInterface = ({ children }) => (
  <QICNErrorBoundary boundaryName="ChatInterface">
    {children}
  </QICNErrorBoundary>
);

export default ChatInterface;
