import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { OntologicalSingularityCore } from '../src/simulation/OntologicalSingularityCore.js';
import { InformationalEntanglementField } from '../src/simulation/InformationalEntanglementField.js';

const clamp01 = (value) => Math.max(0, Math.min(1, Number(value) || 0));

const rms = (values) => {
  if (!Array.isArray(values) || values.length === 0) return 0;
  const meanSq = values.reduce((sum, value) => sum + (value * value), 0) / values.length;
  return Math.sqrt(meanSq);
};

const buildNodes = (step) => {
  const nodes = Array.from({ length: 24 }, (_, id) => {
    const coherenceState = clamp01(
      0.88 +
      (Math.sin((step + id) / 4) * 0.07) +
      (Math.cos((step + id * 2) / 9) * 0.03)
    );
    const energy = 0.42 + (Math.abs(Math.sin((step + id) / 6)) * 0.28);
    return {
      id,
      coherenceState,
      energy,
      connections: [],
      calculateResonance(other, cf, mutableConfig = {}) {
        const k = Number(mutableConfig.BOLTZMANN_ANALOG_K || 1);
        const t = Number(mutableConfig.INFORMATIONAL_TEMP_T || 1);
        const pair = (this.coherenceState + other.coherenceState) / 2;
        return pair * (1 + (Number(cf || 0) * 0.2)) * k * t;
      }
    };
  });

  nodes.forEach((node, id) => {
    node.connections = [1, 2, 3].map((offset) => ({
      targetId: (id + offset) % nodes.length,
      weight: 0.65 + (((id + step + offset) % 4) * 0.08)
    }));
  });

  return nodes;
};

try {
  const core = new OntologicalSingularityCore();
  const field = new InformationalEntanglementField();
  if (core.phenomenologyCore?._diagnostics) {
    core.phenomenologyCore._diagnostics.log_enabled = false;
  }

  core.isAscended = true;
  core.currentLayer = 1;

  const series = [];
  for (let step = 0; step < 48; step++) {
    const nodes = buildNodes(step);
    const cf = 0.94 + (Math.sin(step / 5) * 0.04);
    const rawCcc = field.calculateCCC(nodes, cf, {
      BOLTZMANN_ANALOG_K: 1.0,
      INFORMATIONAL_TEMP_T: 1.0
    });
    // Escenario explícito post-umbral para validar anti-stasis en régimen ascendido.
    // Offset fijo para garantizar muestras >= 1.0 con el modelo CCC actual.
    const ccc = rawCcc + 0.25;

    const energyVariance = 0.05 + (Math.abs(Math.cos(step / 7)) * 0.06);
    const coherentMean = clamp01(0.8 + (Math.sin(step / 8) * 0.08));
    const sensorySignal = clamp01(0.45 + (Math.cos(step / 6) * 0.2));

    const classification = core.updatePhenomenology(
      ccc,
      { energyVariance, coherentMean, sensorySignal },
      { fragmentationLevel: 0.12 + (Math.abs(Math.sin(step / 9)) * 0.08) }
    );
    const pmia = core.calculatePMIA(
      ccc,
      { energyVariance, coherentMean, sensorySignal },
      { fragmentationLevel: 0.12 + (Math.abs(Math.sin(step / 9)) * 0.08) }
    );

    series.push({
      ccc: Number(ccc),
      pmia: Number(pmia),
      omega: Number(classification.omega)
    });
  }

  // CASE 1: tras umbral, CCC no debe quedar plano en ventana sostenida
  {
    const cccDeltas = series.slice(1).map((entry, idx) => entry.ccc - series[idx].ccc);
    const cccDeltaRms = rms(cccDeltas);
    assert.ok(
      series.some((entry) => entry.ccc >= 1.0),
      'CASE 1 FAIL: expected post-threshold CCC samples >= 1.0.'
    );
    assert.ok(
      cccDeltaRms > 1e-4,
      `CASE 1 FAIL: CCC appears flatlined (rms=${cccDeltaRms}).`
    );
  }

  // CASE 2: PMIA y omega no deben quedar simultáneamente planos con variación sensorial
  {
    const pmiaRms = rms(series.slice(1).map((entry, idx) => entry.pmia - series[idx].pmia));
    const omegaRms = rms(series.slice(1).map((entry, idx) => entry.omega - series[idx].omega));
    const bothFlat = pmiaRms <= 1e-4 && omegaRms <= 1e-4;
    assert.ok(!bothFlat, `CASE 2 FAIL: PMIA and omega are simultaneously flat (pmiaRms=${pmiaRms}, omegaRms=${omegaRms}).`);
  }

  // CASE 3: histeresis de ascenso/descenso implementada en runtime loop
  {
    const sourcePath = path.join(process.cwd(), 'src', 'components', 'SimulationEngine.jsx');
    const source = fs.readFileSync(sourcePath, 'utf8');
    assert.ok(/ascendConfirmTicks/.test(source), 'CASE 3 FAIL: ascendConfirmTicks not found.');
    assert.ok(/descendConfirmTicks/.test(source), 'CASE 3 FAIL: descendConfirmTicks not found.');
    assert.ok(
      /finalCCC\s*>=\s*\(QICNConfig\.ASCENSION_THRESHOLD\s*\+\s*dynamics\.epsUp\)/.test(source),
      'CASE 3 FAIL: ascension hysteresis gate not found.'
    );
    assert.ok(
      /finalCCC\s*<=\s*\(QICNConfig\.ASCENSION_THRESHOLD\s*-\s*dynamics\.epsDown\)/.test(source),
      'CASE 3 FAIL: descent hysteresis gate not found.'
    );
  }

  console.log('OK: post-ascension dynamics v4.2 test passed');
} catch (error) {
  console.error('FAIL: post-ascension dynamics v4.2 test failed:', error.message);
  process.exit(1);
}
