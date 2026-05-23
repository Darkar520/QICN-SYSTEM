import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const text = fs.readFileSync(path.join(__dirname, '../src/components/SimulationEngine.jsx'), 'utf8');

const requiredLayoutTokens = [
  'max-w-[100vw]',
  'overflow-x-hidden',
  'grid min-w-0 grid-cols-1 lg:grid-cols-3',
  'min-w-0 lg:col-span-1',
  'lg:col-span-2 min-w-0 max-w-full overflow-hidden',
  'min-w-0 max-w-full overflow-hidden bg-gray-900/50',
  'relative min-w-0 max-w-full',
  'grid grid-cols-1 xl:grid-cols-2',
  'flex flex-wrap items-center justify-between gap-2'
];

for (const token of requiredLayoutTokens) {
  assert(text.includes(token), `SimulationEngine should preserve network layout containment token: ${token}`);
}

const forbiddenNetworkClaims = [
  'Nodos de Conciencia',
  '10M Nodos Conscientes',
  'Conciencia distribuida: No localizada',
  'La red nodal es la implementación computacional de la conciencia',
  'La red implementa el principio substrate-agnóstico donde la conciencia emerge'
];

for (const claim of forbiddenNetworkClaims) {
  assert(!text.includes(claim), `Network tab should not reintroduce inflated network claim: ${claim}`);
}

assert(
  text.includes('Diagnostico estructural interno')
    && text.includes('no constituye validacion externa ni certificacion ontologica'),
  'Network tab should keep an explicit internal diagnostic interpretation boundary'
);

console.log('OK: network layout and boundary guards passed');
