import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const indexFile = path.resolve('src/index.jsx');
const conceptsFile = path.resolve('src/content/groundedConcepts.js');

const indexText = fs.readFileSync(indexFile, 'utf8');
const conceptsText = fs.readFileSync(conceptsFile, 'utf8');

const requiredIndexTokens = [
  'const renderTabQuickHelp = () =>',
  'Iniciar tour (60s)',
  'Que es:',
  'Para que sirve:',
  'Que mirar primero:',
  'TOUR_DISMISS_STORAGE',
  'setDismissedTourByTab'
];

for (const token of requiredIndexTokens) {
  assert.ok(indexText.includes(token), `CASE 1 FAIL: missing token in index.jsx -> ${token}`);
}

const requiredConceptTokens = [
  'export const TAB_HELP_META = {',
  'whatIs',
  'whyItMatters',
  'firstCheck'
];

for (const token of requiredConceptTokens) {
  assert.ok(conceptsText.includes(token), `CASE 2 FAIL: missing token in groundedConcepts.js -> ${token}`);
}

console.log('ok guide-clarity.v49');
