import assert from 'node:assert/strict';
import {
  MATURITY_STATUS,
  RUNTIME_MATURITY_BOUNDARY,
  RUNTIME_THEORY_OBJECTS,
  buildRuntimeMaturityLedger
} from '../src/canon/maturity/RuntimeMaturityLedger.js';

try {
  assert.match(RUNTIME_MATURITY_BOUNDARY, /not external validation/i);
  assert.ok(RUNTIME_THEORY_OBJECTS.length >= 10, 'CASE 1 FAIL: ledger must cover core theory objects.');
  for (const item of RUNTIME_THEORY_OBJECTS) {
    assert.ok(item.id, 'CASE 2 FAIL: missing id.');
    assert.ok(item.theoreticalOwner, `CASE 2 FAIL: ${item.id} missing owner.`);
    assert.ok(Object.values(MATURITY_STATUS).includes(item.status), `CASE 2 FAIL: ${item.id} invalid status.`);
    assert.ok(item.strongestAllowedClaim, `CASE 2 FAIL: ${item.id} missing allowed claim.`);
    assert.ok(item.forbiddenClaim, `CASE 2 FAIL: ${item.id} missing forbidden claim.`);
    assert.match(item.interpretation_boundary, /not external validation|not formal proof/i);
    if (item.status === MATURITY_STATUS.SCAFFOLD_DEFINED) {
      assert.doesNotMatch(item.strongestAllowedClaim, /certified|validated|proved/i, `CASE 3 FAIL: ${item.id} scaffold overclaims.`);
    }
  }
  const ledger = buildRuntimeMaturityLedger();
  assert.equal(ledger.status, 'diagnostic_internal_only');
  assert.equal(ledger.objects.length, RUNTIME_THEORY_OBJECTS.length);
  const mOmega = ledger.objects.find((item) => item.id === 'M_Omega');
  assert.equal(mOmega.status, MATURITY_STATUS.UPPER_BOUND_SUPPORT, 'CASE 3B FAIL: M_Omega must report UPPER_BOUND_SUPPORT (C-11).');
  assert.equal(mOmega.evidenceType, 'family_specific_upper_bound');
  const paper10 = ledger.objects.find((item) => item.id === 'Paper10');
  assert.equal(paper10.status, MATURITY_STATUS.SCAFFOLD_DEFINED, 'CASE 4 FAIL: Paper10 must remain scaffold.');
  assert.match(paper10.forbiddenClaim, /Human-comparator validation/i);
  console.log('OK: runtime maturity ledger v1 tests passed');
} catch (error) {
  console.error('FAIL: runtime maturity ledger v1 tests failed:', error.message);
  process.exit(1);
}
