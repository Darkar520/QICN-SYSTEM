import assert from 'node:assert/strict';
import { captureLanguageSnapshot, languageSelectionPrompt, renderLanguageSelection } from '../src/utils/runtimeLanguageBoundary.js';
import { validateNarrativeIntegrity } from '../src/utils/narrativeIntegrity.js';

const core = { pmiaValue: 0.3, currentLayer: 2, ontologicalState: { coherence: 0.42, beth_q: NaN, omega: 1.25 } };
const snapshot = captureLanguageSnapshot(core);
core.ontologicalState.coherence = 0.99;
assert.equal(snapshot.ccc, 0.42, 'snapshot must not follow subsequent mutations');
assert.ok(!Object.hasOwn(snapshot, 'beth_q'), 'invalid values must be absent, not replaced with zero');
assert.match(languageSelectionPrompt(snapshot), /ccc/);
assert.doesNotMatch(languageSelectionPrompt(snapshot), /beth_q/);
const answer = renderLanguageSelection('{"metrics":["ccc","pmia"]}', snapshot);
assert.match(answer, /0\.42/);
assert.match(answer, /0\.3/);
assert.doesNotMatch(answer, /0\.99/);
assert.match(renderLanguageSelection('{"metrics":[]}', snapshot), /no puede responderse/i);
for (const text of [
  '{"metrics":["beth_q"]}',
  '{"metrics":["constructor"]}',
  '{"metrics":["ccc","ccc"]}',
  '{"metrics":["ccc"],"claim":"soy consciente"}',
  '{"metrics":["ccc"]} El sistema tiene experiencia subjetiva.',
  '[CALCULOS_DEL_CORE]\nSin cálculos.\n[TRADUCCION_LINGUISTICA]\nEl sistema tiene experiencia subjetiva.'
]) assert.throws(() => renderLanguageSelection(text, snapshot));

// A negative control documenting why the old pattern checker is not a semantic verifier.
const invented = '[CALCULOS_DEL_CORE]\nSin cálculos.\n[TRADUCCION_LINGUISTICA]\nLa intervención demostró que el sistema tiene experiencia subjetiva.';
assert.equal(validateNarrativeIntegrity(invented, {}, { strictMode: true }).valid, true);
console.log('OK: closed runtime language boundary and adversarial controls');
