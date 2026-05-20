import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const indexPath = path.join(__dirname, '../src/App.jsx');
const gatePath = path.join(__dirname, '../src/components/AccessGate.jsx');
const authPath = path.join(__dirname, '../src/auth/AuthContext.jsx');

const indexText = fs.readFileSync(indexPath, 'utf8');
const gateText = fs.readFileSync(gatePath, 'utf8');
const authText = fs.readFileSync(authPath, 'utf8');

assert(indexText.includes('<AuthProvider>'), 'index.jsx must wrap app in AuthProvider');
assert(indexText.includes('<AccessGate>'), 'index.jsx must wrap app in AccessGate');
assert(gateText.includes('isAuthenticated'), 'AccessGate should check authentication state');
assert(authText.includes('AUTH_REQUIRED'), 'AuthContext should honor runtime AUTH_REQUIRED flag');

console.log('OK: auth gate tests passed');
