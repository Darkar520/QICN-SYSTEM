import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/App.jsx');
const content = fs.readFileSync(file, 'utf8');

assert.ok(content.includes("case 'guide':"), 'guide tab case must exist');
assert.ok(content.includes('return renderGroundedGuide();'), 'guide tab must render grounded guide');
assert.ok(!content.includes('renderContextualGuide()'), 'contextual quick guide must not render outside guide');

console.log('ok contextual-guide-scope.v410');
