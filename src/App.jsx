import React, { Suspense } from 'react';
import { AuthProvider } from './auth/AuthContext.jsx';
import AccessGate from './components/AccessGate.jsx';
import { QICNErrorBoundary } from './components/ErrorBoundary.jsx';
import { StateProvider } from './components/StateProvider.jsx';

const SimulationEngine = React.lazy(() => import('./components/SimulationEngine.jsx'));

const AppFallback = () => (
  <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center">
    <div className="text-sm tracking-wide text-cyan-200">Inicializando QICN...</div>
  </div>
);

export const App = () => (
  <QICNErrorBoundary boundaryName="App">
    <AuthProvider>
      <AccessGate>
        <StateProvider>
          <Suspense fallback={<AppFallback />}>
            <SimulationEngine />
          </Suspense>
        </StateProvider>
      </AccessGate>
    </AuthProvider>
  </QICNErrorBoundary>
);

export default App;
