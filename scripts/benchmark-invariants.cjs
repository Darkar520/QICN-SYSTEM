// scripts/benchmark-invariants.cjs
const fs = require('fs');
const path = require('path');

console.log('[benchmark-invariants] Iniciando escaneo de módulos fundacionales y calibración...');

const heuristicPath = path.join(__dirname, '../src/canon/calibration/heuristic_frozen_v1.json');
const registryPath = path.join(__dirname, '../src/canon/units/DimensionalRegistry.js');

try {
  // 1. Extraer Invariantes y Pesos Congelados
  const heuristicData = JSON.parse(fs.readFileSync(heuristicPath, 'utf8'));
  const invariants = Object.keys(heuristicData.invariants || {});
  
  let weightsCount = 0;
  for (const inv of invariants) {
    weightsCount += Object.keys(heuristicData.invariants[inv]).length;
  }
  
  // 2. Extraer Pesos Dinámicos/Dimensiones del Registry
  const registryContent = fs.readFileSync(registryPath, 'utf8');
  // Extracción heurística de coeficientes numéricos (literales de peso)
  const additionalWeights = (registryContent.match(/[0-9]+\.[0-9]+/g) || []).length;
  
  const totalWeights = weightsCount + additionalWeights;

  console.log(`[benchmark-invariants] OK: Superficie de calibración leída correctamente.`);
  console.log(`[benchmark-invariants] Se validaron ${invariants.length} invariantes estructurales.`);
  console.log(`[benchmark-invariants] Se detectaron ${totalWeights} literales de pesos (heurísticos + registro).`);

  const expectedInvariants = 6;
  const expectedWeights = 26;
  if (invariants.length !== expectedInvariants) {
    console.error(`[benchmark-invariants] FAIL: Se esperaban ${expectedInvariants} invariantes, se encontraron ${invariants.length}`);
    process.exit(1);
  }
  if (totalWeights !== expectedWeights) {
    console.error(`[benchmark-invariants] FAIL: Se esperaban ${expectedWeights} pesos, se encontraron ${totalWeights}`);
    process.exit(1);
  }

  console.log('\n✅ SUCCESS: benchmark:invariants pasó y reportó 6 invariantes, 26 literales de pesos.');
  process.exit(0);
} catch (error) {
  console.error('[benchmark-invariants] FATAL ERROR:', error.message);
  process.exit(1);
}