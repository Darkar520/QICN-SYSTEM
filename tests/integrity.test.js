// Minimal unit tests for integrity packet + echo validation
// Run with: node tests/integrity.test.js

const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

(async () => {
  const {
    buildIntegrityPacket,
    validateIntegrityPacket,
    validateIntegrityEcho,
    IntegrityError,
    INTEGRITY_ECHO_MARKERS
  } = await import('../src/utils/integrity.js');

  const tick = 7;
  const seed = 123;
  const versionHash = 'test-version';
  const metrics = {
    tick,
    simulationStep: tick,
    activeNodes: 42,
    depthMin: -12.5,
    depthMax: 99.25,
    clampHits: 3,
    recoveryTriggers: 2,
    rotX: 0.5,
    rotY: 1.25,
    seed,
    versionHash
  };

  const packet = buildIntegrityPacket({ tick, seed, versionHash, metrics, sensorSummary: null });
  assert(typeof packet.checksum === 'string' && packet.checksum.length === 64, 'checksum must be 64-hex');
  validateIntegrityPacket(packet);

  const echoPacket = {
    tick: packet.tick,
    seed: packet.seed,
    versionHash: packet.versionHash,
    metrics: packet.metrics,
    sensorSummary: packet.sensorSummary ?? null
  };

  const llmOk = [
    'Some analysis text...',
    `${INTEGRITY_ECHO_MARKERS.checksumKey} ${packet.checksum}`,
    INTEGRITY_ECHO_MARKERS.packetBegin,
    JSON.stringify(echoPacket),
    INTEGRITY_ECHO_MARKERS.packetEnd,
    'Done.'
  ].join('\n');

  validateIntegrityEcho(packet, llmOk);

  // Missing echo block -> must reject hard
  let missingEchoRejected = false;
  try {
    validateIntegrityEcho(packet, 'Model answer without integrity echo markers.');
  } catch (e) {
    missingEchoRejected = true;
    assert(e instanceof IntegrityError, 'missing echo must throw IntegrityError');
  }
  assert(missingEchoRejected, 'response without integrity echo must be rejected');

  // Tamper metric but keep checksum -> must reject
  const tamperedPacket = {
    ...echoPacket,
    metrics: { ...echoPacket.metrics, activeNodes: echoPacket.metrics.activeNodes + 1 }
  };
  const llmTampered = [
    `${INTEGRITY_ECHO_MARKERS.checksumKey} ${packet.checksum}`,
    INTEGRITY_ECHO_MARKERS.packetBegin,
    JSON.stringify(tamperedPacket),
    INTEGRITY_ECHO_MARKERS.packetEnd
  ].join('\n');

  let rejected = false;
  try {
    validateIntegrityEcho(packet, llmTampered);
  } catch (e) {
    rejected = true;
    assert(e instanceof IntegrityError, 'tampered echo must throw IntegrityError');
  }
  assert(rejected, 'tampered echo must be rejected');

  // Ambiguous markers (duplicate checksum marker) -> must reject hard
  const llmDuplicateMarkers = [
    `${INTEGRITY_ECHO_MARKERS.checksumKey} ${packet.checksum}`,
    `${INTEGRITY_ECHO_MARKERS.checksumKey} ${packet.checksum}`,
    INTEGRITY_ECHO_MARKERS.packetBegin,
    JSON.stringify(echoPacket),
    INTEGRITY_ECHO_MARKERS.packetEnd
  ].join('\n');
  let duplicateMarkerRejected = false;
  try {
    validateIntegrityEcho(packet, llmDuplicateMarkers);
  } catch (e) {
    duplicateMarkerRejected = true;
    assert(e instanceof IntegrityError, 'duplicate markers must throw IntegrityError');
  }
  assert(duplicateMarkerRejected, 'ambiguous marker layout must be rejected');

  console.log('OK: integrity tests passed');
})().catch((err) => {
  console.error('FAIL: integrity tests failed:', err.message);
  process.exit(1);
});
