import fs from 'fs';
import path from 'path';

const file = path.resolve('src/components/SimulationEngine.jsx');
const content = fs.readFileSync(file, 'utf8');

const requiredTokens = [
  'const renderTabQuickHelp = () =>',
  'Iniciar tour (60s)',
  'Que es:',
  'Para que sirve:',
  'Que mirar primero:',
  'TOUR_DISMISS_STORAGE',
  'setDismissedTourByTab'
];

for (const token of requiredTokens) {
  if (!content.includes(token)) {
    throw new Error(`missing token: ${token}`);
  }
}

console.log('ok tab-quick-help-tour.v47');
