import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const indexText = fs.readFileSync(path.join(__dirname, '../src/components/SimulationEngine.jsx'), 'utf8');
const hookText = fs.readFileSync(path.join(__dirname, '../src/hooks/useBreakpoint.js'), 'utf8');

assert(indexText.includes('overflow-x-auto'), 'tab navigation should support horizontal scroll on narrow screens');
assert(indexText.includes('lg:grid-cols-3'), 'layout should be mobile-first with desktop enhancement');
assert(indexText.includes("viewportMode={isMobile ? 'mobile'"), 'network canvas should receive responsive viewport mode');
assert(indexText.includes('mobile-live-control-bar'), 'layout should provide sticky mobile/tablet live control bar');
assert(indexText.includes('qicn-responsive-shell'), 'layout should scale gracefully for wide and 4K/TV displays');
assert(hookText.includes('BREAKPOINTS'), 'breakpoint hook should define canonical breakpoints');
assert(hookText.includes('tv:'), 'breakpoint hook should define TV/large-screen breakpoint');

console.log('OK: responsive layout tests passed');
