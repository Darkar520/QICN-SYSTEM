import assert from 'node:assert/strict';

const { handler } = await import('../netlify/functions/quantum-entropy.js');

const parseBody = (response) => JSON.parse(response?.body || '{}');

try {
  const customResponse = await handler({
    httpMethod: 'GET',
    queryStringParameters: { provider: 'custom' },
    headers: {}
  });
  const customPayload = parseBody(customResponse);

  assert.equal(customResponse.statusCode, 200, 'CASE 1 FAIL: expected HTTP 200 for custom provider.');
  assert.equal(customPayload.ok, true, 'CASE 1 FAIL: expected ok=true for custom provider.');
  assert.equal(customPayload.provider, 'custom', 'CASE 1 FAIL: expected provider=custom.');
  assert.equal(typeof customPayload.sample, 'object', 'CASE 1 FAIL: missing sample payload.');
  assert.equal(typeof customPayload.sample.entropyFloat01, 'number', 'CASE 1 FAIL: entropyFloat01 must be numeric.');
  assert.ok(customPayload.sample.entropyFloat01 >= 0 && customPayload.sample.entropyFloat01 <= 1, 'CASE 1 FAIL: entropyFloat01 out of range.');
  assert.equal(typeof customPayload.sample.quality, 'object', 'CASE 1 FAIL: quality object missing.');

  const ibmResponse = await handler({
    httpMethod: 'GET',
    queryStringParameters: { provider: 'ibm' },
    headers: {}
  });
  const ibmPayload = parseBody(ibmResponse);

  assert.equal(ibmResponse.statusCode, 200, 'CASE 2 FAIL: expected HTTP 200 for ibm provider.');
  assert.equal(ibmPayload.ok, true, 'CASE 2 FAIL: expected ok=true for ibm provider.');
  assert.equal(ibmPayload.provider, 'ibm', 'CASE 2 FAIL: expected provider=ibm.');
  assert.ok(
    ['simulated_fallback', 'upstream_quantum'].includes(String(ibmPayload.mode || '')),
    'CASE 2 FAIL: ibm mode must be simulated_fallback or upstream_quantum.'
  );
  assert.equal(typeof ibmPayload.sample?.quality?.valid, 'boolean', 'CASE 2 FAIL: sample quality.valid must be boolean.');

  console.log('ok netlify-quantum-entropy-contract.v50');
} catch (error) {
  console.error('fail netlify-quantum-entropy-contract.v50:', error.message);
  process.exit(1);
}
