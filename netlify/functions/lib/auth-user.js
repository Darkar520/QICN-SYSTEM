// Authentication boundary for Lambda-compatible Netlify handlers.
// clientContext.user is supplied by the platform after Identity verification.
// Never promote a decoded Authorization header into a verified identity.
export const requireUser = (_event, context) => {
  const user = context?.clientContext?.user;
  if (!user || typeof user !== 'object') return null;
  const id = user.sub || user.id;
  if (typeof id !== 'string' || !id.trim()) return null;
  if (user.exp !== undefined && (!Number.isFinite(user.exp) || user.exp <= Date.now() / 1000)) {
    return null;
  }
  return user;
};
