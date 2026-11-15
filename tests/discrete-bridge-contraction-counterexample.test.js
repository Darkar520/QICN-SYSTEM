import assert from 'node:assert/strict';

// A permitted instance of the framework's displayed discrete transition:
// two connected nodes, fixed phases 0, I_j = 0, B = 0, Gamma = 0.
// Every term in rho_N vanishes, yet clamp(x) is the identity inside [0,1]^2.
const clamp = x => Math.max(0, Math.min(1, x));
const norm = xs => Math.sqrt(xs.reduce((sum, x) => sum + x * x, 0) / xs.length);
const transition = xs => xs.map(x => clamp(x + 0 + 0 + 0));
const x = [0.25, 0.25];
const y = [0.75, 0.75];
const rho = 0;
const before = norm(x.map((value, i) => value - y[i]));
const tx = transition(x);
const ty = transition(y);
const after = norm(tx.map((value, i) => value - ty[i]));
assert.equal(after, before);
assert.ok(after > rho * before, 'the proposed rho bound fails for this admissible instance');
console.log('OK: explicit counterexample to the stated discrete contraction bound');
