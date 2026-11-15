import { requireUser } from './auth-user.js';
export { requireUser };

export const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

export const parseJsonBody = (event) => {
  try {
    return { ok: true, body: JSON.parse(event?.body || '{}') };
  } catch {
    return { ok: false, error: 'INVALID_JSON', body: null };
  }
};

export const envBool = (name, fallback = false) => {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  const normalized = String(raw).trim().toLowerCase();
  if (normalized === 'true' || normalized === '1' || normalized === 'yes' || normalized === 'on') return true;
  if (normalized === 'false' || normalized === '0' || normalized === 'no' || normalized === 'off') return false;
  return fallback;
};

export const envNumber = (name, fallback) => {
  const raw = Number(process.env[name]);
  return Number.isFinite(raw) ? raw : fallback;
};

export default {
  asJson,
  requireUser,
  parseJsonBody,
  envBool,
  envNumber
};
