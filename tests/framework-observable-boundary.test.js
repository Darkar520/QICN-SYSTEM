import assert from 'node:assert/strict';
import { InformationalEntanglementField } from '../src/simulation/InformationalEntanglementField.js';

// Controlled counterexample to identifying the runtime CCC with BaseCore's
// discrete mean X_N. With no edges, resonance contributes nothing.
const nodes = [
  {id: 1, coherenceState: 0.5, energy: 0.5, connections: []},
  {id: 2, coherenceState: 0.5, energy: 0.5, connections: []}
];
const meanCoherence = nodes.reduce((sum, node) => sum + node.coherenceState, 0) / nodes.length;
const ccc = new InformationalEntanglementField().calculateCCC(nodes, 0, {});
assert.equal(meanCoherence, 0.5);
assert.ok(Math.abs(ccc - 0.39) < 1e-12);
assert.notEqual(ccc, meanCoherence);
console.log('OK: runtime field CCC is distinct from the discrete mean observable');
