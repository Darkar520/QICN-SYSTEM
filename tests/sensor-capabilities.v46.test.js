import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const hookText = fs.readFileSync(path.join(__dirname, '../src/hooks/useDeviceCapabilities.js'), 'utf8');
const indexText = fs.readFileSync(path.join(__dirname, '../src/components/SimulationEngine.jsx'), 'utf8');

assert(hookText.includes('supportsCamera'), 'device capabilities must expose camera support');
assert(hookText.includes('supportsMicrophone'), 'device capabilities must expose microphone support');
assert(hookText.includes('supportsSpeechRecognition'), 'device capabilities must expose speech recognition support');
assert(indexText.includes('FEATURE_SENSORS'), 'index should gate sensors by runtime feature flag');
assert(indexText.includes('setSensoryEnabled'), 'index should still maintain graceful sensor state');

console.log('OK: sensor capabilities tests passed');
