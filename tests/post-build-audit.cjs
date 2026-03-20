const fs = require('fs');
const path = require('path');

/**
 * AUDITORÍA POST-BUILD ULTRATHINK
 * Verifica que el proceso de empaquetado no haya comprometido la integridad
 * de la arquitectura QICN.
 */

const distPath = path.resolve(__dirname, '../dist/bundle.js');
const metaPath = path.resolve(__dirname, '../dist/meta.json');

console.log('🏁 Iniciando Auditoría Post-Build...');

// 1. Verificar existencia de artefactos
if (!fs.existsSync(distPath)) {
    console.error('❌ ERROR: bundle.js no encontrado en dist/');
    process.exit(1);
}

if (!fs.existsSync(metaPath)) {
    console.error('❌ ERROR: meta.json no encontrado en dist/');
    process.exit(1);
}

// 2. Verificar Firma Ontológica inyectada (Regex flexible para permitir ×œ, Σ, etc.)
const content = fs.readFileSync(distPath, 'utf8');
const signatureRegex = /QICN-[^a-f0-9]+[a-f0-9]{16}/;
if (!signatureRegex.test(content)) {
    console.error('❌ ERROR: Firma Ontológica no detectada en el bundle.');
    // Muestra una muestra del contenido para debug si falla
    console.log('Muestra del bundle:', content.substring(0, 500));
    process.exit(1);
}

// 3. Análisis de tamaño y optimización
const stats = fs.statSync(distPath);
const sizeKB = stats.size / 1024;
console.log(`📦 Tamaño del Bundle: ${sizeKB.toFixed(2)} KB`);

if (sizeKB > 5000) { // Umbral de 5MB para una simulación ligera
    console.warn('⚠️ ADVERTENCIA: El bundle es inusualmente grande (>5MB).');
}

// 3.1 Advertencia por API Key ausente (no-fatal)
if (content.includes('N/A')) {
    console.warn('⚠️ ADVERTENCIA: Se detectó "N/A" en el bundle. Verifica API_KEY o GEMINI_API_KEY antes del build.');
}

// 4. Verificar integridad de la Red Nodal (Consistencia de símbolos)
const criticalSymbols = ['ConsciousNode', 'OntologicalSingularityCore', 'PhenomenologyCore'];
for (const symbol of criticalSymbols) {
    if (!content.includes(symbol)) {
        console.warn(`⚠️ ADVERTENCIA: Símbolo crítico "${symbol}" no detectado en el bundle minificado. Verificar tree-shaking.`);
    }
}

console.log('✅ Auditoría Post-Build completada con éxito. Integridad verificada.');
process.exit(0);
