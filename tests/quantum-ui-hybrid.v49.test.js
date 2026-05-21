import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const indexPath = path.resolve('src/components/SimulationEngine.jsx');
const bridgePath = path.resolve('src/simulation/QuantumEntropyBridge.js');

const indexText = fs.readFileSync(indexPath, 'utf8');
const bridgeText = fs.readFileSync(bridgePath, 'utf8');

assert.ok(indexText.includes('const [quantumUiConfig, setQuantumUiConfig] = useState(() => {'), 'CASE 1 FAIL: quantumUiConfig state missing.');
assert.ok(indexText.includes('runQuantumConnectionTest'), 'CASE 2 FAIL: runQuantumConnectionTest handler missing.');
assert.ok(indexText.includes('Entropía Cuántica (Híbrido UI + Bridge)'), 'CASE 3 FAIL: quantum UI panel title missing.');
assert.ok(indexText.includes("appendIntegrityAudit('quantum_ui_config_change'"), 'CASE 4 FAIL: quantum_ui_config_change audit missing.');
assert.ok(indexText.includes("appendIntegrityAudit('quantum_connection_test'"), 'CASE 5 FAIL: quantum_connection_test audit missing.');

assert.ok(bridgeText.includes('setConfig(partialConfig = {})'), 'CASE 6 FAIL: QuantumEntropyBridge.setConfig missing.');
assert.ok(bridgeText.includes('getConnectionDiagnostics(nowMs = Date.now())'), 'CASE 7 FAIL: QuantumEntropyBridge.getConnectionDiagnostics missing.');
assert.ok(bridgeText.includes('async testConnection(config = {}, options = {})'), 'CASE 8 FAIL: QuantumEntropyBridge.testConnection missing.');

console.log('ok quantum-ui-hybrid.v49');
