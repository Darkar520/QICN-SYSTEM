import React from 'react';
import BaseNetworkCanvas from '../index_network_canvas';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';
import NetworkScene3D from './NetworkScene3D.jsx';

const canAttemptWebGL = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (_error) {
    return false;
  }
};

export const NetworkCanvas = (props) => {
  const [fallbackReason, setFallbackReason] = React.useState('');
  const [webglAvailable, setWebglAvailable] = React.useState(() => canAttemptWebGL());
  const { onTelemetry } = props;

  React.useEffect(() => {
    setWebglAvailable(canAttemptWebGL());
  }, []);

  const handleFallback = React.useCallback((reason) => {
    setFallbackReason(reason || 'webgl_fallback_requested');
    onTelemetry?.({
      renderer_mode: 'canvas_fallback',
      fallback_reason: reason || 'webgl_fallback_requested',
      visual_renderer_boundary:
        'Canvas fallback: visualizacion diagnostica interna; no certifica conciencia, experiencia, subjetividad ni validacion externa.'
    });
  }, [onTelemetry]);

  return (
    <QICNErrorBoundary boundaryName="NetworkCanvas">
      {webglAvailable && !fallbackReason ? (
        <NetworkScene3D {...props} onFallback={handleFallback} />
      ) : (
        <BaseNetworkCanvas {...props} />
      )}
    </QICNErrorBoundary>
  );
};

export default NetworkCanvas;
