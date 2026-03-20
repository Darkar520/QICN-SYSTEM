import React from 'react';
import { useAuth } from '../auth/AuthContext.jsx';
import runtimeEnv from '../config/runtimeEnv.js';

const AccessGate = ({ children }) => {
  const { loading, isAuthenticated, user, login, logout } = useAuth();

  if (!runtimeEnv.AUTH_REQUIRED) {
    return children;
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-200 flex items-center justify-center p-6">
        <div className="rounded-xl border border-cyan-500/40 bg-cyan-950/20 p-5 text-sm">
          Validando sesion privada de QICN...
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full rounded-xl border border-purple-500/40 bg-purple-950/20 p-6">
          <h1 className="text-xl font-bold text-purple-200 mb-3">QICN Private Access</h1>
          <p className="text-sm text-purple-100/90 mb-5">
            Esta instancia requiere autenticacion para acceso remoto seguro.
          </p>
          <button
            type="button"
            onClick={login}
            className="w-full px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 text-white font-semibold"
          >
            Iniciar sesion
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-40 bg-slate-950/85 backdrop-blur border-b border-slate-800 px-3 py-2 text-[11px] text-slate-300 flex items-center justify-between">
        <span>Sesion activa: {user?.email || user?.id || 'qicn-user'}</span>
        <button type="button" onClick={logout} className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200">
          Cerrar sesion
        </button>
      </div>
      {children}
    </div>
  );
};

export default AccessGate;
