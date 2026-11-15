import assert from 'node:assert/strict';
import { HolographicMemoryNexus } from '../src/simulation/HolographicMemoryNexus.js';

const memory = new HolographicMemoryNexus();
const question = 'Describe el estado operacional registrado';
memory.storeLearnedKnowledge(question, 'Respuesta anterior suficientemente extensa', 0.8, 1);
assert.equal(memory.retrieveLearnedAnswer(question), null, 'missing context must require generation');
assert.ok(memory.retrieveLearnedAnswer(question, 0.8, 1, 0.1, 0), 'runtime friction 0 is inactive');
assert.equal(memory.retrieveLearnedAnswer(question, 0.8, 4, 0.1, 0), null, 'cache must re-evaluate layer changes');
assert.ok(memory.retrieveLearnedAnswer(question, 0.8, 1, 0.1, 0));
assert.equal(memory.retrieveLearnedAnswer(question, 0.8, 1, 0.9, 2), null, 'cache must re-evaluate interventions');
memory.storeLearnedKnowledge(question, 'Respuesta actualizada suficientemente extensa', 0.85, 1);
assert.match(memory.retrieveLearnedAnswer(question, 0.85, 1, 0.1, 0).answer, /actualizada/);
assert.equal(memory.retrieveLearnedAnswer(question, NaN, 1, 0.1, 0), null);
const empty = new HolographicMemoryNexus();
empty.storeLearnedKnowledge(question, 'Sin contexto numerico suficiente', NaN, undefined);
assert.equal(empty.learnedKnowledge.size, 0, 'invalid state cannot become reusable memory');
console.log('[memory-context-boundary] PASS');
