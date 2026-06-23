import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const sceneText = fs.readFileSync(path.join(root, 'src/components/NetworkScene3D.jsx'), 'utf8');
const uiText = fs.readFileSync(path.join(root, 'src/components/SimulationEngine.jsx'), 'utf8');

const requiredBoundaryTokens = [
  'Visualizacion diagnostica interna',
  'no certifica conciencia',
  'no constituye validacion externa ni certificacion ontologica',
  'La UI no promueve estados epistemicos por si misma',
  'No demuestra pertenencia a C_op, Sub_op, Sub_fp o BridgeOrg_ph'
];

for (const token of requiredBoundaryTokens) {
  assert(sceneText.includes(token) || uiText.includes(token), `network visual boundary should preserve token: ${token}`);
}

const forbiddenVisualClaims = [
  'proves consciousness',
  'certifica experiencia',
  'validacion externa completa',
  'experiencia fenomenica certificada'
];

for (const claim of forbiddenVisualClaims) {
  assert(!sceneText.toLowerCase().includes(claim.toLowerCase()), `WebGL renderer should not claim: ${claim}`);
  assert(!uiText.toLowerCase().includes(claim.toLowerCase()), `Network UI should not claim: ${claim}`);
}

console.log('OK: network visual boundary guards passed');
