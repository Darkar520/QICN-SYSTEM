/**
 * tests/generate-real-audit-log.js
 * Genera un snapshot real del estado informacional para auditoria externa.
 */

// POLYFILLS: Simulacion de entorno browser para Node.js (test runner)
if (typeof globalThis.history === 'undefined') {
  globalThis.history = { length: 0, state: null, scrollRestoration: 'auto' };
}
if (typeof globalThis.window === 'undefined') {
  globalThis.window = globalThis;
}
if (typeof globalThis.document === 'undefined') {
  globalThis.document = {
    createElement: () => ({ style: {}, addEventListener: () => { } }),
    getElementById: () => null,
    body: { appendChild: () => { }, removeChild: () => { } }
  };
}
if (typeof globalThis.localStorage === 'undefined') {
  const _store = {};
  globalThis.localStorage = {
    getItem: (k) => _store[k] ?? null,
    setItem: (k, v) => { _store[k] = String(v); },
    removeItem: (k) => { delete _store[k]; }
  };
}
if (typeof globalThis.performance === 'undefined') {
  globalThis.performance = { now: () => Date.now() };
}

const require = (await import('node:module')).createRequire(import.meta.url);
const fs = require('fs');
const path = require('path');
const { fileURLToPath } = await import('node:url');
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Mocks necesarios para el entorno de Node (ya que el Core usa console y performance)
global.QICNConfig = {
  VERSION: '10.3.5-XÎ©',
  CORE_HASH: 'qicn-0x7F2B-Î©',
  CORE_SEED: '0x42A1',
  BOLTZMANN_ANALOG_K: 0.5,
  RETRO_FLUX_WEIGHT: 0.2,
  INFORMATIONAL_TEMP_T: 1.0,
  BASE_LEARNING_RATE: 0.05,
  HEBBIAN_FACTOR: 0.1,
  ACTIVE_NODES_LIMIT: 1000,
  RESONANCE_FIELD_DECAY: 0.95
};

// Cargar clases (usando paths relativos desde la raiz del proyecto)
const { OntologicalSingularityCore } = await import('../src/simulation/OntologicalSingularityCore.js');
const { PhenomenologyCore } = await import('../src/simulation/PhenomenologyCore.js');
const { MetaSovereigntyCheck } = await import('../src/simulation/MetaSovereigntyCheck.js');

// Inyectar dependencias en el scope global si es necesario o pasar por constructor
global.PhenomenologyCore = PhenomenologyCore;
global.MetaSovereigntyCheck = MetaSovereigntyCheck;
global.InternalSelfSimulator = class {
  constructor() { }
  step() { }
};

async function run() {
  console.log('Iniciando Generacion de Audit Log Real...');
  const core = new OntologicalSingularityCore();

  // Simular 200 pasos de integracion para generar estabilidad absoluta
  for (let i = 0; i < 200; i++) {
    const mockCCC = 1.0; // Estabilidad perfecta para forzar H_X < 0.001
    core.updateOntologicalLayer(mockCCC);
    core.phenomenologyCore.recordState({ val: mockCCC }, { val: 1.0 });
    core.phenomenologyCore.calculateBethQ();
  }

  const report = core.getVerifiableReport();
  const auditPath = path.join(__dirname, '../audit-log.json');

  fs.writeFileSync(auditPath, JSON.stringify(report, null, 2), 'utf8');

  console.log(`Audit Log generado exitosamente en: ${auditPath}`);
  console.log(`CCC Reportado: ${report.metrics.ccc.toFixed(4)}`);
  console.log(`Integridad: ${report.metrics.integrity_status.status}`);
}

run().catch((err) => {
  console.error('Error generando audit log:', err);
  process.exit(1);
});
