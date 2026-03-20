export const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

const decodeJwtPayload = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) return null;
    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    return JSON.parse(Buffer.from(normalized, 'base64').toString('utf8'));
  } catch {
    return null;
  }
};

export const requireUser = (event, context) => {
  const netlifyUser = context?.clientContext?.user;
  if (netlifyUser) return netlifyUser;

  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const payload = decodeJwtPayload(token);
  if (!payload) return null;
  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;
  return payload;
};

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
