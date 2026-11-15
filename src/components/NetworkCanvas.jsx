import React from 'react';
import BaseNetworkCanvas from '../index_network_canvas';
import { QICNErrorBoundary } from './ErrorBoundary.jsx';
import NetworkScene3D from './NetworkScene3D.jsx';

const canAttemptWebGL = () => {
  if (typeof window === 'undefined' || typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch {
    return false;
  }
};

// preferredRenderer: '2d' mounts the Canvas renderer (the original pseudo-3D
// aesthetic, evolved); '3d' mounts NetworkScene3D when WebGL is available and
// keeps BaseNetworkCanvas as the fallback. Both are visual-only surfaces.
export const NetworkCanvas = ({ preferredRenderer = '2d', ...props }) => {
  const [fallbackReason, setFallbackReason] = React.useState('');
  const [webglAvailable, setWebglAvailable] = React.useState(() => canAttemptWebGL());
  const { onTelemetry } = props;

  React.useEffect(() => {
    setWebglAvailable(canAttemptWebGL());
  }, []);

  React.useEffect(() => {
    // A new explicit 3D request gets a fresh attempt after an earlier fallback.
    if (preferredRenderer === '3d') setFallbackReason('');
  }, [preferredRenderer]);

  const handleFallback = React.useCallback((reason) => {
    setFallbackReason(reason || 'webgl_fallback_requested');
    onTelemetry?.({
      renderer_mode: 'canvas_fallback',
      fallback_reason: reason || 'webgl_fallback_requested',
      visual_renderer_boundary:
        'Canvas fallback: visualizacion diagnostica interna; no certifica conciencia, experiencia, subjetividad ni validacion externa.'
    });
  }, [onTelemetry]);

  const useWebGL = preferredRenderer === '3d' && webglAvailable && !fallbackReason;

  return (
    <QICNErrorBoundary boundaryName="NetworkCanvas">
      {useWebGL ? (
        <NetworkScene3D {...props} onFallback={handleFallback} />
      ) : (
        <BaseNetworkCanvas {...props} />
      )}
    </QICNErrorBoundary>
  );
};

export default NetworkCanvas;
