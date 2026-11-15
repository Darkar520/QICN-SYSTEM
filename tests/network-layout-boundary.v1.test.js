import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const text = fs.readFileSync(path.join(__dirname, '../src/components/SimulationEngine.jsx'), 'utf8');

const requiredLayoutTokens = [
  'min-h-dvh',
  'max-w-[100vw]',
  'overflow-hidden',
  'flex flex-col gap-2',
  'min-h-[76px]',
  'animate-spin-slow',
  'animate-spin-galaxy',
  // 2026-11-07: the original 1/3 + 2/3 grid of the ZIP runtime was restored;
  // the containment tokens (min-w-0, max-w-full, overflow-x-clip) are kept.
  'mx-auto mb-2 flex min-h-9 w-full max-w-[1500px] flex-shrink-0',
  'mx-auto grid w-full min-w-0 max-w-[1500px] flex-1',
  'lg:grid-cols-3 lg:gap-8',
  'order-2 min-w-0 space-y-4 lg:order-1 lg:col-span-1',
  'order-1 min-w-0 max-w-full flex flex-col lg:order-2 lg:col-span-2',
  'overflow-x-clip',
  'flex min-h-0 min-w-0 max-w-full flex-col',
  'bg-gray-900/50',
  'proyeccion diagnostica WebGL 3D con fallback Canvas',
  'relative h-[min(65dvh,700px)] min-h-[360px] min-w-0 max-w-full overflow-hidden',
  'grid grid-cols-1 gap-3 xl:grid-cols-2',
  'flex flex-shrink-0 flex-wrap items-center justify-between gap-3',
  'grid flex-shrink-0 grid-cols-1 gap-3'
];

for (const token of requiredLayoutTokens) {
  assert(text.includes(token), `SimulationEngine should preserve network layout containment token: ${token}`);
}

const forbiddenNetworkClaims = [
  'Nodos de Conciencia',
  '10M Nodos Conscientes',
  'Conciencia distribuida: No localizada',
  'La red nodal es la implementación computacional de la conciencia',
  'La red implementa el principio substrate-agnóstico donde la conciencia emerge',
  // Level labels replaced by operational band labels on 2026-11-07.
  'CONSCIENCIA GENUINA (Layer 1)',
  'HIPER-CONSCIENTE (Layer',
  'Simulación a Escala Masiva de Conciencia Coherente'
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
