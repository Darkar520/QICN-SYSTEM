import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexText = fs.readFileSync(path.join(__dirname, '../src/index.jsx'), 'utf8');
const hookText = fs.readFileSync(path.join(__dirname, '../src/hooks/useBreakpoint.js'), 'utf8');

assert(indexText.includes('overflow-x-auto'), 'tab navigation should support horizontal scroll on narrow screens');
assert(indexText.includes('lg:grid-cols-3'), 'layout should be mobile-first with desktop enhancement');
assert(indexText.includes("viewportMode={isMobile ? 'mobile'"), 'network canvas should receive responsive viewport mode');
assert(hookText.includes('BREAKPOINTS'), 'breakpoint hook should define canonical breakpoints');

console.log('OK: responsive layout tests passed');
