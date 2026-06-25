/**
 * RuntimeRecoveryBoundary.jsx
 * Error boundary de recuperación de runtime con limpieza de localStorage.
 * Extraído como parte del refactor de descomposición (Fase 2).
 *
 * NOTA: Distinto del QICNErrorBoundary de ErrorBoundary.jsx (que es el boundary
 * genérico con boundaryName). Este incluye botón de recovery + limpieza de estado.
 * Se re-exporta desde SimulationEngine.jsx como QICNErrorBoundary para preservar
 * el contrato de export existente.
 */
import React from 'react';

export class RuntimeRecoveryBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, message: '', stack: '' };
  }

  static getDerivedStateFromError(error) {
    return {
      hasError: true,
      message: error?.message || 'Error desconocido de render.'
    };
  }

  componentDidCatch(error, info) {
    const stack = (error?.stack || '') + (info?.componentStack || '');
    this.setState({ stack });
    console.error('[QICN][FATAL_RENDER_ERROR]', error, info);
  }

  handleRecovery = () => {
    try {
      window.localStorage.removeItem('QICN_INTEGRITY_AUDIT_LOG');
      window.localStorage.removeItem('QICN_CHAT_HISTORY');
    } catch (err) {
      console.warn('[QICN][RECOVERY] localStorage cleanup warning:', err?.message || err);
    }
    window.location.reload();
  };

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-3xl w-full rounded-xl border border-red-500/40 bg-red-950/20 p-6">
          <h1 className="text-xl font-bold text-red-300 mb-2">QICN Runtime Recovery Guard</h1>
          <p className="text-sm text-red-100 mb-4">
            Se detectó un error de render crítico. El sistema bloqueó el pantallazo vacío y activó modo de recuperación.
          </p>
          <div className="text-xs font-mono text-red-200 bg-black/40 rounded p-3 mb-4 break-all">
            {this.state.message}
          </div>
          <button
            type="button"
            onClick={this.handleRecovery}
            className="px-4 py-2 rounded bg-red-600 hover:bg-red-500 text-white font-semibold"
          >
            Recuperar y recargar
          </button>
          {this.state.stack ? (
            <pre className="mt-4 text-[10px] leading-relaxed text-red-200/80 overflow-auto max-h-64 bg-black/40 rounded p-3">
              {this.state.stack}
            </pre>
          ) : null}
        </div>
      </div>
    );
  }
}

export default RuntimeRecoveryBoundary;
