const asJson = (statusCode, payload) => ({
  statusCode,
  headers: {
    'Content-Type': 'application/json',
    'Cache-Control': 'no-store'
  },
  body: JSON.stringify(payload)
});

const normalizeState = (value) => {
  const normalized = String(value || '').trim().toUpperCase();
  if (normalized === 'ON' || normalized === 'TRUE' || normalized === '1') return 'ON';
  return 'OFF';
};

export const handler = async (event) => {
  if (event.httpMethod !== 'GET') {
    return asJson(405, { ok: false, error: 'METHOD_NOT_ALLOWED' });
  }

  const state = normalizeState(process.env.QICN_BLOB_KILLSWITCH_STATE || 'OFF');
  return asJson(200, {
    ok: true,
    state,
    source: 'env',
    timestamp: Date.now()
  });
};

export default { handler };
