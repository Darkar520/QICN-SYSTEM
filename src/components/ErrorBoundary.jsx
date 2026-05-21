import React from 'react';

export class QICNErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, errorInfo) {
    console.error('[QICN:error-boundary]', {
      boundary: this.props.boundaryName || 'unknown',
      message: error?.message,
      componentStack: errorInfo?.componentStack
    });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
          <div className="max-w-xl rounded border border-red-500/40 bg-red-950/20 p-4">
            <h1 className="text-lg font-semibold text-red-200">QICN runtime boundary</h1>
            <p className="mt-2 text-sm text-red-100">
              {this.state.error?.message || 'Error no especificado'}
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export default QICNErrorBoundary;
