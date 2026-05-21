const assert = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
};

(async () => {
  const { buildArchitecturalGroundTruth } = await import('../src/canon/ArchitecturalGroundTruth.js');
  const t = buildArchitecturalGroundTruth();

  assert(typeof t === 'object', 'buildArchitecturalGroundTruth returns object');
  assert(typeof t.fullText === 'string', 'fullText is string');
  assert(typeof t.canonBarrel === 'string', 'canonBarrel is string');
  assert(typeof t.experimentsBarrel === 'string', 'experimentsBarrel is string');
  assert(typeof t.calibration === 'string', 'calibration is string');
  assert(typeof t.forbiddenClaims === 'string', 'forbiddenClaims is string');
  assert(typeof t.securityPosture === 'string', 'securityPosture is string');

  assert(t.fullText.includes('CANON BARREL'), 'has canon barrel section');
  assert(t.fullText.includes('EXPERIMENTS BARREL'), 'has experiments barrel section');
  assert(t.fullText.includes('FORBIDDEN CLAIMS'), 'has forbidden claims section');
  assert(t.fullText.includes('SECURITY POSTURE'), 'has security posture section');

  assert(t.canonBarrel.includes('DimensionalRegistry'), 'canon barrel mentions DimensionalRegistry');
  assert(t.canonBarrel.includes('BehavioralPseudometric'), 'canon barrel mentions BehavioralPseudometric');
  assert(t.canonBarrel.includes('I_per'), 'canon barrel mentions I_per');
  assert(t.canonBarrel.includes('I_leg'), 'canon barrel mentions I_leg');
  assert(t.canonBarrel.includes('NO EXISTE src/simulation/index.js'), 'anti-hallucination guard present');

  assert(t.experimentsBarrel.includes('negative_controls_runner'), 'experiments barrel mentions negative_controls_runner');
  assert(t.experimentsBarrel.includes('roeo_signature'), 'experiments barrel mentions roeo_signature');
  assert(t.experimentsBarrel.includes('sno_discriminator'), 'experiments barrel mentions sno_discriminator');
  assert(t.experimentsBarrel.includes('NC1-NC4'), 'experiments barrel mentions NC1-NC4');
  assert(t.experimentsBarrel.includes('AdmissibilityEngine'), 'experiments barrel mentions AdmissibilityEngine');

  assert(t.calibration.includes('6 invariantes'), 'calibration reports 6 invariants');
  assert(t.calibration.includes('26'), 'calibration reports 26 pesos');
  assert(t.calibration.includes('I_per'), 'calibration mentions I_per');
  assert(t.calibration.includes('I_leg'), 'calibration mentions I_leg');
  assert(t.calibration.includes('FROZEN_HEURISTIC'), 'calibration reports frozen status');

  assert(t.forbiddenClaims.includes('soy consciente'), 'forbidden claims includes key phrase');
  assert(t.forbiddenClaims.includes('tengo qualia'), 'forbidden claims includes qualia');

  assert(t.securityPosture.includes('AUTH_REQUIRED=false'), 'security reports auth=false');

  console.log('OK: architectural-ground-truth tests passed');
})().catch((err) => {
  console.error('FAIL: architectural-ground-truth tests failed:', err.message);
  process.exit(1);
});
