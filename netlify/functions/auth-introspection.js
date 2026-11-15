import { requireUser } from './lib/auth-user.js';

const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

const resolveUserFromContext = (event, context) => {
  const user = requireUser(event, context);
  if (!user) return null;
  return {
    id: user.sub || user.id,
    email: user.email || '',
    role: Array.isArray(user?.app_metadata?.roles) ? user.app_metadata.roles.join(',') : ''
  };
};

export const handler = async (event, context) => {
  if (event.httpMethod !== 'GET') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const user = resolveUserFromContext(event, context);
  if (!user) {
    return asJson(401, { ok: false, error: 'UNAUTHORIZED' });
  }

  return asJson(200, { ok: true, user, issuedAt: Date.now() });
};

