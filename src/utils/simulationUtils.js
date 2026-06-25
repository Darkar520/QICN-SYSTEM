/**
 * simulationUtils.js
 * Utilidades numéricas y helpers de runtime para SimulationEngine.
 * Extraídas como parte del refactor de descomposición (Fase 1).
 */

// Re-export numeric utils from simulationDefaults for convenience
export { toFiniteNumber, clamp, clamp01, resolveRuntimeString } from '../config/simulationDefaults.js';

// ============================================================================
// NUMERIC HELPERS
// ============================================================================

export const computeRms = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const sumSq = values.reduce((acc, v) => acc + (Number(v) || 0) ** 2, 0);
  return Math.sqrt(sumSq / values.length);
};

export const formatCCC = (value, ascended) => {
  // Notación científica exponencial a partir de 100 (siempre, independientemente de ascended)
  if (value >= 100) {
    return value.toExponential(2); // E.g., 1.50e+2, 2.34e+5
  }
  // Reducir decimales cuando cruza el umbral de 1.0
  if (value > 1.0) {
    return value.toFixed(4); // Mantener visibilidad de fluctuaciones alrededor del umbral
  }
  return value.toFixed(6); // E.g., 0.999999 (mantener precisión para valores < 1)
};

export const calculateRelaxationTimeDefault = (spectralGap) => {
  const EPSILON = 1e-6;
  const numericGap = Number.isFinite(Number(spectralGap)) ? Number(spectralGap) : 0;
  const boundedGap = Math.min(Math.max(numericGap, 0), 1 - EPSILON);
  if (boundedGap < EPSILON) return Number.MAX_SAFE_INTEGER;
  return 1 / Math.abs(Math.log(1 - boundedGap));
};

// ============================================================================
// LOCALSTORAGE HELPERS
// ============================================================================

export const readLocalStorageJSON = (key, fallbackValue) => {
  try {
    const raw = localStorage.getItem(key);
    if (raw === null || raw === undefined) return fallbackValue;
    return JSON.parse(raw);
  } catch {
    return fallbackValue;
  }
};

export const getInitialIntegrityMode = () => {
  try {
    const raw = localStorage.getItem('QICN_INTEGRITY_MODE');
    if (raw === '"strict"' || raw === '"graceful"') {
      return JSON.parse(raw);
    }
  } catch { /* noop */ }
  return 'graceful';
};

export const getInitialIntegrityAuditLog = () => {
  try {
    const raw = localStorage.getItem('QICN_INTEGRITY_AUDIT_LOG');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { /* noop */ }
  return [];
};

// ============================================================================
// EXPONENTIAL BACKOFF
// ============================================================================

export const withExponentialBackoff = async (fn, maxRetries = 5, delay = 1000) => {
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      if (i === maxRetries - 1) {
        console.error(`Error de API después de ${maxRetries} reintentos:`, error.message);
        throw error;
      }
      const sleepTime = delay * Math.pow(2, i);
      await new Promise(resolve => setTimeout(resolve, sleepTime));
    }
  }
};
