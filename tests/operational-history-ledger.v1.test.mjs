// Operational history ledger: continuity classes, tamper detection, restarts,
// truncation anchor and observer-only transitions.
// Scope: the hash chain detects inconsistent edits. Without a secret key it
// cannot detect a forger who rewrites the whole chain consistently.
import assert from 'node:assert/strict';
import { OperationalHistoryLedger, LEDGER_STORAGE_KEY, LEDGER_MAX_EVENTS } from '../src/identity/OperationalHistoryLedger.js';
import { makeMemoryStorage } from './fixtures/languageFixtures.mjs';

const makeClock = () => {
  let clock = 1_800_000_000_000;
  let ids = 0;
  return { now: () => (clock += 1000), makeId: () => `id${(ids += 1)}` };
};

// One "page load": a new ledger instance over the same storage.
const boot = (storage, clock, session = {}) => {
  const ledger = new OperationalHistoryLedger({ storage, ...clock });
  const loadStatus = ledger.load();
  const continuity = ledger.startSession({ buildVersion: 'b1', signature: 'sig', configHash: 'cfg-a', seed: 1, ...session });
  return { ledger, loadStatus, continuity };
};

try {
  assert.equal(typeof LEDGER_STORAGE_KEY, 'string', 'fixture: storage key export');

  // CASE 1: fresh → continuous_record → config_changed → build_changed.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const first = boot(storage, clock);
    assert.equal(first.loadStatus.status, 'fresh', 'CASE 1 FAIL: first load must be fresh.');
    assert.equal(first.continuity, 'fresh', 'CASE 1 FAIL: first continuity.');
    const instanceId = first.ledger.summary().instanceId;

    const second = boot(storage, clock);
    assert.equal(second.loadStatus.status, 'verified', 'CASE 1 FAIL: second load must verify.');
    assert.equal(second.continuity, 'continuous_record', 'CASE 1 FAIL: same config/build must be continuous.');
    assert.equal(second.ledger.summary().instanceId, instanceId, 'CASE 1 FAIL: instance id must persist across restarts.');
    assert.equal(second.ledger.summary().sessionCount, 2, 'CASE 1 FAIL: session count.');

    const third = boot(storage, clock, { configHash: 'cfg-b' });
    assert.equal(third.continuity, 'config_changed', 'CASE 1 FAIL: config change not classified.');
    const fourth = boot(storage, clock, { configHash: 'cfg-b', buildVersion: 'b2' });
    assert.equal(fourth.continuity, 'build_changed', 'CASE 1 FAIL: build change not classified.');
  }

  // CASE 2: tampering with a stored event is a record rupture; history is not trusted.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    ledger.record('run_started', { source: 'test' }, 1);
    ledger.record('band_transition', { from: 0, to: 1, ccc: 1.01 }, 40);
    const stored = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
    stored.events[1].payload.to = 3; // edit a recorded fact
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(stored));
    const after = boot(storage, clock);
    assert.equal(after.loadStatus.status, 'record_rupture', 'CASE 2 FAIL: tampered record accepted.');
    assert.equal(after.loadStatus.reason, 'hash_mismatch', 'CASE 2 FAIL: rupture reason.');
    assert.equal(after.continuity, 'record_rupture', 'CASE 2 FAIL: continuity must declare the rupture.');
    const summary = after.ledger.summary();
    assert.notEqual(summary.instanceId, stored.instanceId, 'CASE 2 FAIL: a ruptured record must not keep its identity.');
    assert.equal(summary.priorRuptureReason, 'hash_mismatch', 'CASE 2 FAIL: rupture must be reported.');
    assert.ok(summary.chainOk, 'CASE 2 FAIL: the new record must verify.');

    // Removing an event in the middle breaks the chain too.
    const { ledger: l2 } = boot(storage, clock);
    l2.record('run_started', {}, 1);
    l2.record('run_paused', {}, 2);
    const s2 = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
    s2.events.splice(1, 1);
    assert.equal(OperationalHistoryLedger.verify(s2).ok, false, 'CASE 2 FAIL: deleted event not detected.');
    // Garbage in storage is a rupture, not a crash.
    storage.setItem(LEDGER_STORAGE_KEY, '{not json');
    assert.equal(boot(storage, clock).loadStatus.reason, 'unparseable', 'CASE 2 FAIL: unparseable storage.');
  }

  // CASE 3: truncation keeps a verifiable chain through the anchor hash.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    for (let i = 0; i < LEDGER_MAX_EVENTS + 25; i += 1) ledger.record('observer_interaction', { channel: 'test' }, i);
    const summary = ledger.summary();
    assert.equal(summary.eventCount, LEDGER_MAX_EVENTS, 'CASE 3 FAIL: event cap.');
    assert.ok(summary.firstRetainedSeq > 1, 'CASE 3 FAIL: oldest events must be dropped.');
    assert.ok(summary.chainOk, 'CASE 3 FAIL: truncated chain must verify through the anchor.');
    assert.equal(boot(storage, clock).loadStatus.status, 'verified', 'CASE 3 FAIL: truncated ledger must reload as verified.');
  }

  // CASE 4: state origin. Restarts reinitialize; only a verified restore is "restored_verified".
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    assert.equal(ledger.summary().currentSession.stateOrigin, 'reinitialized', 'CASE 4 FAIL: default origin.');
    // The stored field alone does not establish a restore: the hashed event does.
    ledger.markStateOrigin('restored_verified');
    assert.equal(ledger.summary().currentSession.stateOrigin, 'reinitialized', 'CASE 4 FAIL: origin accepted without a snapshot_restored event.');
    ledger.record('snapshot_restored', { digest: 'abc' }, 10);
    assert.equal(ledger.summary().currentSession.stateOrigin, 'restored_verified', 'CASE 4 FAIL: verified restore origin.');
    ledger.markStateOrigin('magically_continuous');
    assert.equal(ledger.summary().currentSession.stateOrigin, 'restored_verified', 'CASE 4 FAIL: unknown origin accepted.');
    ledger.record('system_reset', { source: 'test' }, 11);
    assert.equal(ledger.summary().currentSession.stateOrigin, 'reinitialized', 'CASE 4 FAIL: reset after restore.');
    ledger.record('snapshot_restored', { digest: 'abc' }, 12);
    const next = boot(storage, clock);
    assert.equal(next.ledger.summary().currentSession.stateOrigin, 'reinitialized', 'CASE 4 FAIL: a restart must not inherit the dynamic state.');
    assert.equal(next.ledger.summary().previousSession.stateOrigin, 'restored_verified', 'CASE 4 FAIL: previous session origin kept in the record.');
  }

  // CASE 5: observer transitions are recorded once per change and only from plain values.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    const base = { layer: 0, ccc: 0.8, threshold: 1, isAscended: false, regime: 'PRE_CONSCIOUS', phenomenologyClass: 'C', bethQMode: 'warmup_derived', spectralGapMode: 'warmup' };
    assert.deepEqual(ledger.observeTick({ tick: 1, ...base }), [], 'CASE 5 FAIL: first observation must only seed.');
    assert.deepEqual(ledger.observeTick({ tick: 2, ...base }), [], 'CASE 5 FAIL: unchanged state recorded.');
    const crossing = ledger.observeTick({ tick: 3, ...base, layer: 1, ccc: 1.02, isAscended: true, regime: 'POST_THRESHOLD' });
    assert.deepEqual(crossing.map((e) => e.type), ['band_transition', 'threshold_crossing', 'regime_change'], 'CASE 5 FAIL: transition set.');
    assert.equal(crossing[1].payload.direction, 'up', 'CASE 5 FAIL: crossing direction.');
    ledger.resetObservation();
    assert.deepEqual(ledger.observeTick({ tick: 0, ...base }), [], 'CASE 5 FAIL: a reset must not record a spurious transition.');
    assert.throws(() => ledger.record('self_awareness_event', {}, 1), /Unknown ledger event type/, 'CASE 5 FAIL: unknown event type accepted.');
  }

  // CASE 6: payloads are bounded and flat; nested objects are dropped.
  {
    const { ledger } = boot(makeMemoryStorage(), makeClock());
    const event = ledger.record('parameter_change', { key: 'X'.repeat(500), nested: { a: 1 }, 'bad key': 1, to: 0.2 }, 5);
    assert.equal(event.payload.key.length, 160, 'CASE 6 FAIL: string bound.');
    assert.ok(!('nested' in event.payload) && !('bad key' in event.payload), 'CASE 6 FAIL: unsafe payload kept.');
  }

  // CASE 7 (F3): every session field that decides continuity is bound to the
  // hashed session_start event; editing it is a rupture, not continuity.
  {
    const tamperings = [
      ['configHash', (s) => { s.configHash = 'cfg-forged'; }, 'session_config_mismatch'],
      ['buildVersion', (s) => { s.buildVersion = 'b9'; }, 'session_build_mismatch'],
      ['signature', (s) => { s.signature = 'forged'; }, 'session_signature_mismatch'],
      ['seed', (s) => { s.seed = 999; }, 'session_seed_mismatch'],
      ['startedAt', (s) => { s.startedAt += 60_000; }, 'session_start_time_mismatch'],
      ['sessionId', (s) => { s.sessionId = 's-forged'; }, 'session_without_start_event']
    ];
    for (const [field, mutate, reason] of tamperings) {
      const storage = makeMemoryStorage();
      const clock = makeClock();
      boot(storage, clock);
      boot(storage, clock);
      const stored = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
      assert.equal(OperationalHistoryLedger.verify(stored).ok, true, `fixture: untouched ledger must verify (${field})`);
      mutate(stored.sessions[0]);
      const verdict = OperationalHistoryLedger.verify(stored);
      assert.deepEqual([verdict.ok, verdict.reason], [false, reason], `CASE 7 FAIL: tampered ${field} gave ${JSON.stringify(verdict)}`);
      storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(stored));
      assert.equal(boot(storage, clock).continuity, 'record_rupture', `CASE 7 FAIL: tampered ${field} must be a rupture.`);
    }
    // Stored stateOrigin edits are ignored in favour of hashed events.
    const storage = makeMemoryStorage();
    const clock = makeClock();
    boot(storage, clock);
    const stored = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
    stored.sessions[0].stateOrigin = 'restored_verified';
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(stored));
    const next = boot(storage, clock);
    assert.equal(next.ledger.summary().previousSession.stateOrigin, 'reinitialized', 'CASE 7 FAIL: forged stateOrigin trusted.');
  }

  // CASE 8: a record written before pinning (no `pinned` field) whose previous
  // session start was truncated away cannot be checked: continuity is not
  // asserted.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    for (let i = 0; i < LEDGER_MAX_EVENTS + 5; i += 1) ledger.record('observer_interaction', { channel: 'test' }, i);
    const legacy = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
    delete legacy.pinned;
    storage.setItem(LEDGER_STORAGE_KEY, JSON.stringify(legacy));
    const next = boot(storage, clock);
    assert.equal(next.loadStatus.status, 'verified', 'CASE 8 FAIL: truncated legacy ledger must still verify.');
    assert.equal(next.continuity, 'previous_unanchored', 'CASE 8 FAIL: unanchored previous session classified as continuous.');
    assert.equal(next.ledger.summary().previousSession.anchored, false, 'CASE 8 FAIL: anchored flag.');
  }

  // CASE 9 (2026-11-08): the start event is pinned when the window drops it,
  // so continuity is still checked after long runs; edits to pinned events or
  // to the bound session metadata are ruptures.
  {
    const storage = makeMemoryStorage();
    const clock = makeClock();
    const { ledger } = boot(storage, clock);
    for (let i = 0; i < LEDGER_MAX_EVENTS + 25; i += 1) ledger.record('observer_interaction', { channel: 'test' }, i);
    const stored = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
    assert.equal(stored.pinned.length, 1, 'CASE 9 FAIL: the dropped session_start must be pinned.');
    assert.equal(stored.pinned[0].type, 'session_start', 'CASE 9 FAIL: pinned type.');
    assert.ok(!stored.events.some((e) => e.type === 'session_start'), 'fixture: start must be outside the window.');
    const next = boot(storage, clock);
    assert.equal(next.loadStatus.status, 'verified', 'CASE 9 FAIL: pinned ledger must verify.');
    assert.equal(next.continuity, 'continuous_record', `CASE 9 FAIL: continuity ${next.continuity}.`);
    assert.equal(next.ledger.summary().previousSession.anchoredBy, 'pinned', 'CASE 9 FAIL: anchoredBy.');
    const tamperings = [
      ['pinned payload', (d) => { d.pinned[0].payload.configHash = 'cfg-forged'; }, 'pinned_hash_mismatch'],
      ['session metadata', (d) => { d.sessions[0].configHash = 'cfg-forged'; }, 'session_config_mismatch'],
      ['pinned order', (d) => { d.pinned[0].seq = d.events[0].seq + 1; }, 'pinned_hash_mismatch'],
      ['pinned type', (d) => { d.pinned[0].type = 'observer_interaction'; }, 'pinned_unknown_type'],
      ['pinned duplicate', (d) => { d.pinned.push({ ...d.pinned[0] }); }, 'pinned_order']
    ];
    for (const [label, mutate, reason] of tamperings) {
      const copy = JSON.parse(storage.getItem(LEDGER_STORAGE_KEY));
      mutate(copy);
      const verdict = OperationalHistoryLedger.verify(copy);
      assert.deepEqual([verdict.ok, verdict.reason], [false, reason], `CASE 9 FAIL: ${label} gave ${JSON.stringify(verdict)}`);
    }
  }

  console.log('OK: operational history ledger v1 test passed');
} catch (error) {
  console.error('FAIL: operational history ledger v1 test failed:', error.message);
  process.exit(1);
}
