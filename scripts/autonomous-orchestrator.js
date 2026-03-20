import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración del Ciclo
const CONFIG = {
    PROJECT_ROOT: path.join(__dirname, '..'),
    SNAPSHOTS_DIR: path.join(__dirname, '..', 'logs', 'snapshots'),
    BUILD_SCRIPT: 'node build.cjs',
    SIMULATION_SCRIPT: 'node tests/generate-real-audit-log.js',
    ITERATIONS: 1 // Una ejecución por ciclo orquestado
};

/**
 * Genera un ID de simulación basado en timestamp y un sufijo descriptivo.
 */
function generateSimID(suffix = 'SOVEREIGNTY_V3') {
    const now = new Date();
    const ts = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
    return `${ts}_${suffix}`;
}

/**
 * Ejecuta el ciclo completo.
 */
async function runCycle(simName) {
    const simID = generateSimID(simName);
    const targetDir = path.join(CONFIG.SNAPSHOTS_DIR, simID);

    console.log(`\n🚀 [ORCHESTRATOR] Iniciando Ciclo: ${simID}`);

    try {
        // 1. Crear Carpeta de Simulación
        if (!fs.existsSync(targetDir)) {
            fs.mkdirSync(targetDir, { recursive: true });
        }

        // 2. Ejecutar BUILD ULTRATHINK
        console.log(`🔨 [BUILD] Re-iniciando Build...`);
        execSync(CONFIG.BUILD_SCRIPT, { cwd: CONFIG.PROJECT_ROOT, stdio: 'inherit' });

        // 3. Ejecutar SIMULACIÓN y generar Snapshot
        console.log(`🌀 [SIMULATION] Ejecutando motor y capturando estado...`);
        execSync(CONFIG.SIMULATION_SCRIPT, { cwd: CONFIG.PROJECT_ROOT, stdio: 'inherit' });

        // 4. Mover el audit-log.json a la carpeta versionada
        const sourceFile = path.join(CONFIG.PROJECT_ROOT, 'audit-log.json');
        const destFile = path.join(targetDir, 'audit-log.json');

        if (fs.existsSync(sourceFile)) {
            fs.copyFileSync(sourceFile, destFile);
            console.log(`✅ [SUCCESS] Snapshot guardado en: ${destFile}`);
        } else {
            console.warn(`⚠️ [WARNING] No se encontró audit-log.json tras la simulación.`);
        }

        console.log(`🏁 [DONE] Ciclo ${simID} completado satisfactoriamente.\n`);
        return simID;

    } catch (error) {
        console.error(`❌ [ERROR] Fallo en el ciclo autónomo:`, error.message);
        process.exit(1);
    }
}

// Ejecución controlada desde CLI: node scripts/autonomous-orchestrator.js [NombreSimulacion]
const simName = process.argv[2] || 'GENUINIDAD_V1';
runCycle(simName);
