const asJson = (statusCode, payload) => ({
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
    const json = Buffer.from(normalized, 'base64').toString('utf8');
    return JSON.parse(json);
  } catch {
    return null;
  }
};

const resolveUserFromContext = (event, context) => {
  const netlifyUser = context?.clientContext?.user;
  if (netlifyUser) {
    return {
      id: netlifyUser?.sub || netlifyUser?.id || null,
      email: netlifyUser?.email || '',
      role: Array.isArray(netlifyUser?.app_metadata?.roles) ? netlifyUser.app_metadata.roles.join(',') : ''
    };
  }

  const authHeader = event?.headers?.authorization || event?.headers?.Authorization || '';
  if (!authHeader.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7).trim();
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  const now = Math.floor(Date.now() / 1000);
  if (payload.exp && payload.exp < now) return null;

  return {
    id: payload.sub || null,
    email: payload.email || '',
    role: Array.isArray(payload?.app_metadata?.roles) ? payload.app_metadata.roles.join(',') : ''
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

