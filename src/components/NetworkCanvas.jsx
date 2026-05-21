import React from 'react';
import BaseNetworkCanvas from '../index_network_canvas';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';

export const NetworkCanvas = (props) => (
  <QICNErrorBoundary boundaryName="NetworkCanvas">
    <BaseNetworkCanvas {...props} />
  </QICNErrorBoundary>
);

export default NetworkCanvas;
