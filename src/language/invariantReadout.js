// Read-only readout of the six C_op invariants for the language packet.
// It runs the existing CanonicalInvariantPackage over the recent tick
// timeline the UI already keeps (tick, ccc, pmia, omega, spectral gap,
// stasis) plus the current beth_q. It does not touch the engine, the RNG or
// the clock. Scores are internal composites (INTERNAL_SUPPORT_ONLY); no
// certificate Cert(S) is produced, so membership in C_op stays undecided.
import { buildCanonicalInvariantPackage } from '../canon/invariants/CanonicalInvariantPackage.js';

export const INVARIANT_READOUT_SCHEMA = 'qicn.invariant_readout.v1';

const NAMES_ES = Object.freeze({
  I_per: 'persistencia estructural',
  I_ri: 'identidad rígida',
  I_int: 'integración causal',
  I_cont: 'continuidad de régimen',
  I_diff: 'diferenciación no nula',
  I_leg: 'legibilidad operacional'
});

// What each invariant needs on the 1500-node heuristic network vs what the
// coupled WritablePrefixTower + BodyWorldTower subplant already certifies
// (Papers I–IX, Frentes 1–5; CanonicalInvariantPackage residualDependencies).
const MISSING_ES = Object.freeze({
  I_per: 'en la red de 1500 nodos falta un certificado global de soporte invariante; en la torre acoplada WritablePrefixTower sí se verifica contracción activa 9/16 sobre el soporte viable [−1/2, 1/2]',
  I_ri: 'en la red de 1500 nodos solo hay compatibilidad finita entre estados adyacentes; en la torre acoplada sí se verifica compatibilidad proyectiva exacta en 7062 cortes finitos y resolución de identidad',
  I_int: 'en la red de 1500 nodos falta el oráculo de factorización sobre el grafo completo; en la torre acoplada sí se certifican ganancia común g = 1/80, cotas de lectura dividida [1/216, 1/24] y defecto de interacción mixta 2·TAP',
  I_cont: 'en la red de 1500 nodos la asignación Π_S es finita por ventana; en la torre ternaria acoplada sí se verifica el módulo de escala fija ω_T(r) = r² en 4032 pares',
  I_diff: 'en la red de 1500 nodos la diferenciación es un compuesto heurístico; en la torre acoplada sí se verifica sensibilidad diádica 2^{-j} y las cinco lesiones selectivas en los sitios 3..7 con Φ⁷ = 1/48',
  I_leg: 'en la red de 1500 nodos no hay decodificador L1–L6 certificado en vivo; en la torre acoplada sí se certifica el horizonte exacto de legibilidad D_{j,t} = 2·3^{-(j+t)} en 105 ensayos'
});

const finite = (v) => (typeof v === 'number' && Number.isFinite(v) ? v : null);

const round4 = (v) => (v === null ? null : Math.round(v * 10000) / 10000);

/**
 * @param {Array<object>} timeline points {tick, ccc, pmia, omega, spectralGap, stasisIndex}
 * @param {object} current { beth_q }
 */
export function buildInvariantReadout(timeline = [], current = {}) {
  const points = Array.isArray(timeline) ? timeline.slice(-120) : [];
  const ticks = points
    .filter((p) => finite(Number(p?.tick)) !== null)
    .map((p) => ({
      tick: Number(p.tick),
      metrics: {
        ccc: finite(Number(p.ccc)),
        pmia: finite(Number(p.pmia)),
        omega: finite(Number(p.omega)),
        spectral_gap: finite(Number(p.spectralGap)),
        stasis_index: finite(Number(p.stasisIndex))
      }
    }));
  const summary = { metrics: { beth_q: finite(current?.beth_q) }, flags: {} };
  const pkg = buildCanonicalInvariantPackage({ header: { sourceOfTruth: 'src' }, summary, verdict: {}, ticks });
  const items = Object.keys(NAMES_ES).map((id) => {
    const record = pkg.invariants?.[id] || {};
    const status = record.provenance?.scoreEvidenceStatus || 'not_recorded';
    return {
      id,
      name: NAMES_ES[id],
      evidenceStatus: status,
      score: status === 'not_recorded' ? null : round4(finite(record.score)),
      maturity: record.maturity || null,
      missing: MISSING_ES[id]
    };
  });
  return {
    schema: INVARIANT_READOUT_SCHEMA,
    evidenceScope: 'internal_support_only',
    windowTicks: ticks.length,
    firstTick: ticks.length ? ticks[0].tick : null,
    lastTick: ticks.length ? ticks[ticks.length - 1].tick : null,
    items,
    certificate: 'not_recorded',
    note: 'Puntuaciones compuestas internas de la red de 1500 nodos; la subplanta acoplada WritablePrefixTower + BodyWorldTower realiza localmente los testigos exactos de los Frentes 1–5 y las 6 cargas de Paper IX (margen 13/96, empate 0 frente al rival híbrido compartido), pero la red nodal completa no tiene Cert(S) global y external_support_certified = false.'
  };
}
