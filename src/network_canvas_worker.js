import { projectWithTrig } from './utils/pinhole.js';
import { createRng, computeNodesKeyUnordered, compareDepthDesc, computeOrbitalAngle } from './utils/determinism.js';

let canvas = null;
let ctx = null;
let perspective = 800;
let center = { x: 450, y: 325 };
let projectionLimits = { sMin: 0.02, sMax: 4.0, depthOffset: 800, denomEps: 1e-3 };
let camera = { zoom: 1, panX: 0, panY: 0 };

let particles = [];
let particlesKey = 0;
let lastFrameTick = -1;
let projectionSmoothingCache = new Map();

const computeNodesKeyOrdered = (nodes) => {
  let key = nodes.length | 0;
  for (let i = 0; i < nodes.length; i++) {
    key = (key * 31 + (nodes[i]?.id || 0)) | 0;
  }
  return key | 0;
};

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));

const fract = (value) => value - Math.floor(value);

const pseudoRandomUnit = (a, b = 0) => fract(Math.sin((a * 12.9898) + (b * 78.233)) * 43758.5453123);

const getCoherenceColor = (coherence) => {
  const c = clamp(Number(coherence) || 0, 0, 1);
  const hue = 10 + (c * 190);
  const light = 46 + (c * 16);
  return `hsl(${hue.toFixed(1)} 90% ${light.toFixed(1)}%)`;
};

// ============================================================
// PALETA SEMÁNTICA DE ESTADOS ONTOLÓGICOS (ULTRATHINK v2)
// ============================================================
const SEMANTIC_STATES = [
  { min: 0.00, hue: 4, sat: 96, coreL: 50, name: 'Turbulencia' },
  { min: 0.15, hue: 20, sat: 95, coreL: 54, name: 'Caos' },
  { min: 0.30, hue: 44, sat: 98, coreL: 58, name: 'Exploracion' },
  { min: 0.44, hue: 84, sat: 92, coreL: 56, name: 'Emergencia' },
  { min: 0.57, hue: 138, sat: 86, coreL: 54, name: 'Armonia' },
  { min: 0.70, hue: 174, sat: 88, coreL: 56, name: 'Coherencia' },
  { min: 0.82, hue: 264, sat: 90, coreL: 62, name: 'Alta coherencia' },
  { min: 0.92, hue: 47, sat: 100, coreL: 62, name: 'Coherencia maxima' },
];
const getSemanticState = (coh) => {
  const c = clamp(Number(coh) || 0, 0, 1);
  let st = SEMANTIC_STATES[0];
  for (let i = SEMANTIC_STATES.length - 1; i >= 0; i--) {
    if (c >= SEMANTIC_STATES[i].min) { st = SEMANTIC_STATES[i]; break; }
  }
  const { hue, sat, coreL } = st;
  return {
    hue,
    sat,
    coreL,
    name: st.name,
    core: `hsl(${hue} ${sat}% ${coreL}%)`,
    edge: `hsl(${hue} ${sat}% ${Math.min(88, coreL + 14)}%)`,
    phase: `hsla(${hue} ${sat}% 74% / 0.55)`,
    haloLight: Math.min(88, coreL + 18)
  };
};
const getCoherenceStyle = (coh) => getSemanticState(coh);
const getNodeHueVariant = (h) => h;

const SECTOR_HUES = [164, 322, 194, 262];
const SECTOR_LABELS = ['Cuerpo v+', 'Cuerpo v-', 'Mundo w_rap', 'Mundo w_lento'];
const SECTOR_ACCENTS = ['#24ebb8', '#f05cb8', '#2eccfa', '#9966fa'];

const resolveSectorId = (node) => {
  if (Number.isInteger(node?.sectorId)) return ((node.sectorId % 4) + 4) % 4;
  return (((Number(node?.id) || 0) % 4) + 4) % 4;
};

const buildNodeSummary = (node) => {
  if (!node) return null;
  const coherence = clamp(Number(node.coherenceState) || 0, 0, 1);
  const intensity = clamp(Number(node.intensity) || 0, 0, 1);
  const degree = Number.isFinite(Number(node.degree))
    ? Number(node.degree)
    : (Array.isArray(node.connections) ? node.connections.length : 0);
  const sectorId = resolveSectorId(node);
  return {
    id: node.id,
    coherence,
    intensity,
    degree,
    sectorId,
    sectorLabel: SECTOR_LABELS[sectorId],
    sectorAccent: SECTOR_ACCENTS[sectorId],
    signalPulse: Number(node.signalPulse || 0),
    stateName: getSemanticState(coherence).name
  };
};

const buildNeighborhoodSet = (focusId, nodes, edges) => {
  const ids = new Set();
  if (focusId === null || focusId === undefined) return ids;
  ids.add(focusId);
  if (Array.isArray(edges)) {
    for (let i = 0; i < edges.length; i++) {
      const edge = edges[i];
      if (edge?.fromId === focusId) ids.add(edge.toId);
      if (edge?.toId === focusId) ids.add(edge.fromId);
    }
  }
  if (Array.isArray(nodes)) {
    for (let i = 0; i < nodes.length; i++) {
      if (nodes[i]?.id === focusId) ids.add(nodes[i].id);
    }
  }
  return ids;
};

const findNearestProjectedNode = (projectedNodes, pointer, maxDistance = 28) => {
  if (!pointer || !Number.isFinite(pointer.x) || !Number.isFinite(pointer.y)) return null;
  let nearest = null;
  let nearestScore = Infinity;
  for (let i = 0; i < projectedNodes.length; i++) {
    const pn = projectedNodes[i];
    if (!pn || pn.scale < 0.12) continue;
    const intensity = clamp(Number(pn.node?.intensity) || 0, 0, 1);
    const radius = (5 + intensity * 10) * pn.scale;
    const hitRadius = clamp(radius + 12, 12, maxDistance);
    const dx = pn.x2d - pointer.x;
    const dy = pn.y2d - pointer.y;
    const dist = Math.sqrt((dx * dx) + (dy * dy));
    if (dist <= hitRadius && dist < nearestScore) {
      nearest = pn;
      nearestScore = dist;
    }
  }
  return nearest;
};


const createParticles = (nodes, seedValue, deterministic) => {
  const out = [];
  const sortedNodes = deterministic ? [...nodes].sort((a, b) => (a?.id || 0) - (b?.id || 0)) : nodes;
  for (let i = 0; i < sortedNodes.length; i++) {
    const node = sortedNodes[i];
    if (!node || node.coherenceState < 0.6) continue;
    const rng = deterministic ? createRng((seedValue ^ node.id) >>> 0) : Math.random;
    const numParticles = Math.floor(node.coherenceState * 6);
    for (let j = 0; j < numParticles; j++) {
      const baseAngle = rng() * Math.PI * 2;
      out.push({
        nodeId: node.id,
        baseAngle,
        angle: baseAngle,
        speed: 0.01 + rng() * 0.02,
        radius: 12 + rng() * 15,
        size: 1 + rng() * 1.5,
        color: getCoherenceColor(node.coherenceState)
      });
    }
  }
  return out;
};

const drawCinematicDepthBackground = (nowMs = 0, visualPerf = 1) => {
  if (!ctx || !canvas) return;
  const panX = Number(camera?.panX) || 0;
  const panY = Number(camera?.panY) || 0;
  const width = canvas.width;
  const height = canvas.height;
  const maxDim = Math.max(width, height);
  const minDim = Math.min(width, height);
  const perf = clamp(Number(visualPerf) || 1, 0.35, 1);
  const richBg = perf > 0.46;
  const cosmicT = nowMs * 0.00016;
  const vanishX = center.x + panX * 0.18 + Math.sin(cosmicT * 0.71) * width * 0.035;
  const vanishY = center.y + panY * 0.12 + Math.cos(cosmicT * 0.59) * height * 0.03;

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const bg = ctx.createLinearGradient(0, 0, width, height);
  bg.addColorStop(0, '#030916');
  bg.addColorStop(0.28, '#041327');
  bg.addColorStop(0.62, '#070817');
  bg.addColorStop(1, '#010106');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, width, height);

  const well = ctx.createRadialGradient(vanishX, vanishY, minDim * 0.02, vanishX, vanishY, maxDim * 0.68);
  well.addColorStop(0, 'rgba(56,189,248,0.24)');
  well.addColorStop(0.24, 'rgba(14,165,233,0.10)');
  well.addColorStop(0.55, 'rgba(79,70,229,0.08)');
  well.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = well;
  ctx.fillRect(0, 0, width, height);

  const nebulaA = ctx.createRadialGradient(
    vanishX - width * 0.28 + Math.sin(cosmicT * 0.9) * width * 0.08,
    vanishY + height * 0.06 + Math.cos(cosmicT * 0.7) * height * 0.05,
    0,
    vanishX - width * 0.28,
    vanishY + height * 0.06,
    maxDim * 0.52
  );
  nebulaA.addColorStop(0, `rgba(34,211,238,${(0.16 * perf).toFixed(3)})`);
  nebulaA.addColorStop(0.42, `rgba(14,116,144,${(0.07 * perf).toFixed(3)})`);
  nebulaA.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaA;
  ctx.fillRect(0, 0, width, height);

  const nebulaB = ctx.createRadialGradient(
    vanishX + width * 0.34 + Math.cos(cosmicT * 0.6) * width * 0.06,
    vanishY - height * 0.22 + Math.sin(cosmicT * 0.77) * height * 0.05,
    0,
    vanishX + width * 0.34,
    vanishY - height * 0.22,
    maxDim * 0.44
  );
  nebulaB.addColorStop(0, `rgba(217,70,239,${(0.13 * perf).toFixed(3)})`);
  nebulaB.addColorStop(0.5, `rgba(99,102,241,${(0.07 * perf).toFixed(3)})`);
  nebulaB.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = nebulaB;
  ctx.fillRect(0, 0, width, height);

  if (richBg) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.lineCap = 'round';
    for (let r = 0; r < 3; r++) {
      const ribbonAlpha = (0.035 + r * 0.018) * perf;
      ctx.strokeStyle = r === 0
        ? `rgba(125,211,252,${ribbonAlpha.toFixed(3)})`
        : r === 1
          ? `rgba(192,132,252,${ribbonAlpha.toFixed(3)})`
          : `rgba(52,211,153,${(ribbonAlpha * 0.78).toFixed(3)})`;
      ctx.lineWidth = (18 + r * 12) * perf;
      ctx.shadowBlur = 24 * perf;
      ctx.shadowColor = ctx.strokeStyle;
      ctx.beginPath();
      ctx.moveTo(-width * 0.10, vanishY + (r - 1) * height * 0.16 + Math.sin(cosmicT + r) * height * 0.04);
      ctx.bezierCurveTo(
        width * 0.24,
        vanishY - height * (0.30 - r * 0.06),
        width * 0.66,
        vanishY + height * (0.26 - r * 0.04),
        width * 1.10,
        vanishY - height * (0.08 + r * 0.05)
      );
      ctx.stroke();
    }
    ctx.restore();
  }

  const starLayerCount = richBg ? 4 : 3;
  for (let layer = 0; layer < starLayerCount; layer++) {
    const depth = (layer + 1) / starLayerCount;
    const count = Math.floor((34 + layer * 26) * perf);
    const parallaxX = (panX * (0.008 + depth * 0.018)) + (Math.sin(cosmicT * (1.2 + depth)) * (8 + layer * 5));
    const parallaxY = (panY * (0.006 + depth * 0.014)) + (Math.cos(cosmicT * (1.1 + depth)) * (5 + layer * 4));
    for (let i = 0; i < count; i++) {
      const rx = pseudoRandomUnit(i + 11, layer + 3);
      const ry = pseudoRandomUnit(i + 29, layer + 7);
      const twinkle = 0.48 + (0.52 * Math.sin(cosmicT * (3.2 + layer) + i * 0.41));
      const sx = ((rx * width) + parallaxX + width) % width;
      const sy = ((ry * height) + parallaxY + height) % height;
      const radius = (0.45 + depth * 1.25 + twinkle * 0.32) * perf;
      const alpha = (0.08 + depth * 0.18) * twinkle;
      ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
      if (layer >= 2 && i % 19 === 0) {
        ctx.strokeStyle = `rgba(125,211,252,${(alpha * 0.36).toFixed(3)})`;
        ctx.lineWidth = Math.max(0.4, radius * 0.38);
        ctx.beginPath();
        ctx.moveTo(sx, sy);
        ctx.lineTo(sx - (10 + layer * 4) * perf, sy + (4 + layer * 2) * perf);
        ctx.stroke();
      }
    }
  }

  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.strokeStyle = `rgba(34,211,238,${(0.055 * perf).toFixed(3)})`;
  ctx.lineWidth = 0.75;
  const rings = richBg ? 5 : 3;
  for (let r = 1; r <= rings; r++) {
    const radius = minDim * (0.14 + r * 0.095);
    ctx.beginPath();
    ctx.ellipse(vanishX, vanishY, radius * 1.55, radius * 0.58, Math.sin(cosmicT) * 0.08, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.restore();

  const gridLines = richBg ? 9 : 6;
  ctx.strokeStyle = `rgba(103,232,249,${(0.045 * perf).toFixed(3)})`;
  ctx.lineWidth = 0.7;
  for (let i = -gridLines; i <= gridLines; i++) {
    const bottomX = (width * 0.5) + (i / gridLines) * width * 0.9;
    ctx.beginPath();
    ctx.moveTo(bottomX, height + 8);
    ctx.lineTo(vanishX, vanishY);
    ctx.stroke();
  }
  for (let i = 0; i < gridLines; i++) {
    const t = i / Math.max(1, gridLines - 1);
    const y = vanishY + Math.pow(t, 1.85) * (height - vanishY + 12);
    const span = width * (0.12 + t * 0.95);
    ctx.beginPath();
    ctx.moveTo(vanishX - span, y);
    ctx.lineTo(vanishX + span, y);
    ctx.stroke();
  }

  const vignette = ctx.createRadialGradient(
    width * 0.52,
    height * 0.48,
    minDim * 0.18,
    width * 0.52,
    height * 0.48,
    maxDim * 0.72
  );
  vignette.addColorStop(0, 'rgba(2,6,23,0)');
  vignette.addColorStop(0.72, 'rgba(2,6,23,0.20)');
  vignette.addColorStop(1, 'rgba(0,0,0,0.62)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
};

const clearCanvas = (nowMs = 0, visualPerf = 1) => {
  if (!ctx || !canvas) return;
  const panX = Number(camera?.panX) || 0;
  const panY = Number(camera?.panY) || 0;

  // === FONDO: Gradiente profundo multi-stop ===
  const bgLinear = ctx.createLinearGradient(0, 0, canvas.width * 0.3, canvas.height);
  bgLinear.addColorStop(0, '#020918');
  bgLinear.addColorStop(0.4, '#030b1a');
  bgLinear.addColorStop(0.8, '#040608');
  bgLinear.addColorStop(1, '#010204');
  ctx.fillStyle = bgLinear;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // === NEBULOSA TRIPLE: cyan + violeta + índigo ===
  const cx = center.x + panX * 0.35;
  const cy = center.y + panY * 0.35;
  const maxR = Math.max(canvas.width, canvas.height) * 0.72;
  const richBg = visualPerf > 0.48;
  const cosmicT = nowMs * 0.00012;

  // Nebulosa 1 — cyan (centro)
  const glow1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR * 0.62);
  glow1.addColorStop(0, 'rgba(6,182,212,0.14)');
  glow1.addColorStop(0.38, 'rgba(6,182,212,0.07)');
  glow1.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow1;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Nebulosa 2 — violeta (desplazada)
  const vx = cx + canvas.width * 0.22;
  const vy = cy - canvas.height * 0.14;
  const glow2 = ctx.createRadialGradient(vx, vy, 0, vx, vy, maxR * 0.48);
  glow2.addColorStop(0, 'rgba(168,85,247,0.13)');
  glow2.addColorStop(0.45, 'rgba(168,85,247,0.05)');
  glow2.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow2;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // Nebulosa 3 — índigo (esquina inferior)
  const ix = cx - canvas.width * 0.18;
  const iy = cy + canvas.height * 0.22;
  const glow3 = ctx.createRadialGradient(ix, iy, 0, ix, iy, maxR * 0.36);
  glow3.addColorStop(0, 'rgba(99,102,241,0.10)');
  glow3.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = glow3;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  if (richBg) {
    const nebPulseA = 0.5 + (0.5 * Math.sin(cosmicT * 1.7));
    const nebPulseB = 0.5 + (0.5 * Math.cos(cosmicT * 1.15));
    const driftX = Math.sin(cosmicT * 0.65) * canvas.width * 0.06;
    const driftY = Math.cos(cosmicT * 0.53) * canvas.height * 0.05;

    const auraA = ctx.createRadialGradient(
      cx - canvas.width * 0.2 + driftX,
      cy - canvas.height * 0.05 + driftY,
      0,
      cx - canvas.width * 0.2 + driftX,
      cy - canvas.height * 0.05 + driftY,
      maxR * 0.52
    );
    auraA.addColorStop(0, `rgba(34,211,238,${(0.07 + nebPulseA * 0.05).toFixed(3)})`);
    auraA.addColorStop(0.52, `rgba(14,116,144,${(0.03 + nebPulseA * 0.02).toFixed(3)})`);
    auraA.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraA;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const auraB = ctx.createRadialGradient(
      cx + canvas.width * 0.27 - driftX * 0.6,
      cy + canvas.height * 0.16 - driftY * 0.5,
      0,
      cx + canvas.width * 0.27 - driftX * 0.6,
      cy + canvas.height * 0.16 - driftY * 0.5,
      maxR * 0.44
    );
    auraB.addColorStop(0, `rgba(217,70,239,${(0.06 + nebPulseB * 0.04).toFixed(3)})`);
    auraB.addColorStop(0.55, `rgba(79,70,229,${(0.02 + nebPulseB * 0.02).toFixed(3)})`);
    auraB.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = auraB;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // === GRID DE REFERENCIA SUTIL (coordenadas 3D) ===
  const gridStep = Math.max(40, Math.round(canvas.width / 14));
  ctx.strokeStyle = 'rgba(6,182,212,0.04)';
  ctx.lineWidth = 0.5;
  for (let x = 0; x < canvas.width; x += gridStep) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, canvas.height);
    ctx.stroke();
  }
  for (let y = 0; y < canvas.height; y += gridStep) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(canvas.width, y);
    ctx.stroke();
  }

  // === ESTRELLAS con variedad de brillo y tamaño ===
  for (let i = 0; i < 60; i++) {
    const sx = ((i * 137.508) % 1) * canvas.width;
    const sy = ((i * 73.33) % 1) * canvas.height;
    const tier = i % 6;
    const r = tier === 0 ? 1.6 : tier === 1 ? 1.2 : 0.7;
    const alpha = tier === 0 ? 0.35 : tier === 1 ? 0.22 : 0.14;
    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }

  const starLayers = richBg ? 3 : 2;
  for (let layer = 0; layer < starLayers; layer++) {
    const count = richBg ? (34 + layer * 16) : (22 + layer * 12);
    const speed = 0.015 + layer * 0.011;
    const driftX = (panX * (0.0009 + layer * 0.0006)) + (Math.sin(cosmicT * speed) * (8 + layer * 6));
    const driftY = (panY * (0.0011 + layer * 0.0007)) + (Math.cos(cosmicT * speed * 1.2) * (6 + layer * 5));
    for (let i = 0; i < count; i++) {
      const base = i + (layer * 97.31);
      const sx = ((((base * 127.1) % 1) * canvas.width) + driftX + canvas.width) % canvas.width;
      const sy = ((((base * 311.7) % 1) * canvas.height) + driftY + canvas.height) % canvas.height;
      const twinkle = 0.45 + (0.55 * Math.sin((cosmicT * (1.3 + layer * 0.4)) + (base * 0.13)));
      const alpha = (0.06 + layer * 0.06) * twinkle;
      const radius = 0.5 + layer * 0.35 + twinkle * 0.25;
      ctx.fillStyle = `rgba(226,232,240,${alpha.toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(sx, sy, radius, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  const vignette = ctx.createRadialGradient(
    canvas.width * 0.52,
    canvas.height * 0.48,
    Math.min(canvas.width, canvas.height) * 0.12,
    canvas.width * 0.52,
    canvas.height * 0.48,
    Math.max(canvas.width, canvas.height) * 0.68
  );
  vignette.addColorStop(0, 'rgba(2,6,23,0)');
  vignette.addColorStop(1, 'rgba(2,6,23,0.45)');
  ctx.fillStyle = vignette;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  drawCinematicDepthBackground(nowMs, visualPerf);
};


const drawFrame = ({ nodes, edges, rotation, camera: frameCamera, interaction = {}, bridgeState = null, signalBursts = null, deterministic, seed, tick }) => {
  if (!ctx || !canvas) return;
  if (deterministic && tick === lastFrameTick) return;
  lastFrameTick = tick;
  const frameNowMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
    ? performance.now()
    : Date.now();
  const visualPerf = clamp(150 / Math.max(1, Array.isArray(nodes) ? nodes.length : 1), 0.35, 1);
  if (frameCamera && typeof frameCamera === 'object') {
    camera = {
      zoom: clamp(Number(frameCamera.zoom) || 1, 0.35, 3.5),
      panX: Number(frameCamera.panX) || 0,
      panY: Number(frameCamera.panY) || 0
    };
  }

  clearCanvas(frameNowMs, visualPerf);

  if (!nodes || nodes.length === 0) {
    self.postMessage({
      type: 'telemetry',
      payload: {
        minDepth: 0,
        maxDepth: 0,
        clampHits: 0,
        nodeCount: 0,
        visibleCount: 0,
        rotationX: rotation?.x ?? 0,
        rotationY: rotation?.y ?? 0,
        frameTs: deterministic ? tick : frameNowMs
      }
    });
    return;
  }

  const currentRotX = rotation?.x ?? 0;
  const currentRotY = rotation?.y ?? 0;
  const sinX = Math.sin(currentRotX);
  const cosX = Math.cos(currentRotX);
  const sinY = Math.sin(currentRotY);
  const cosY = Math.cos(currentRotY);

  let minDepth = Infinity;
  let maxDepth = -Infinity;
  let clampHits = 0;
  let visibleCount = 0;

  const projectedNodes = new Array(nodes.length);
  const zoom = clamp(Number(camera.zoom) || 1, 0.35, 3.5);
  const panX = Number(camera.panX) || 0;
  const panY = Number(camera.panY) || 0;
  for (let i = 0; i < nodes.length; i++) {
    const node = nodes[i];
    const proj = projectWithTrig(node.x, node.y, node.z, sinX, cosX, sinY, cosY, perspective, center, projectionLimits);
    if (proj.clamped) clampHits++;
    if (proj.depth < minDepth) minDepth = proj.depth;
    if (proj.depth > maxDepth) maxDepth = proj.depth;
    const transformedScale = proj.scale * clamp(zoom, 0.6, 1.8);
    const transformedX = ((proj.x2d - center.x) * zoom) + center.x + panX;
    const transformedY = ((proj.y2d - center.y) * zoom) + center.y + panY;
    let smoothedX = transformedX;
    let smoothedY = transformedY;
    let smoothedScale = transformedScale;
    if (!deterministic) {
      const prev = projectionSmoothingCache.get(node.id);
      if (prev) {
        const lerp = clamp(0.22 + transformedScale * 0.18, 0.24, 0.46);
        smoothedX = prev.x + ((transformedX - prev.x) * lerp);
        smoothedY = prev.y + ((transformedY - prev.y) * lerp);
        smoothedScale = prev.s + ((transformedScale - prev.s) * lerp);
      }
      projectionSmoothingCache.set(node.id, { x: smoothedX, y: smoothedY, s: smoothedScale });
    }
    if (smoothedScale >= 0.1) visibleCount++;
    projectedNodes[i] = { node, __index: i, ...proj, x2d: smoothedX, y2d: smoothedY, scale: smoothedScale };
  }

  if (deterministic) {
    projectionSmoothingCache.clear();
  } else if (projectionSmoothingCache.size > Math.max(64, Math.round(nodes.length * 1.35))) {
    const activeIds = new Set();
    for (let i = 0; i < nodes.length; i++) activeIds.add(nodes[i]?.id);
    for (const id of projectionSmoothingCache.keys()) {
      if (!activeIds.has(id)) projectionSmoothingCache.delete(id);
    }
  }

  projectedNodes.sort((a, b) => compareDepthDesc(a.depth, b.depth, (a.node.id || 0), (b.node.id || 0), a.__index, b.__index));

  const projectedById = new Map();
  for (let i = 0; i < projectedNodes.length; i++) {
    const pn = projectedNodes[i];
    projectedById.set(pn.node.id, pn);
  }

  const hoveredProjection = findNearestProjectedNode(projectedNodes, interaction.pointer);
  const hoverNode = hoveredProjection ? buildNodeSummary(hoveredProjection.node) : null;
  const selectedProjection = interaction.selectedId !== null && interaction.selectedId !== undefined
    ? projectedById.get(interaction.selectedId)
    : null;
  const selectedNode = selectedProjection ? buildNodeSummary(selectedProjection.node) : null;
  const focusId = interaction.selectedId ?? hoverNode?.id ?? null;
  const neighborhoodIds = buildNeighborhoodSet(focusId, nodes, edges);
  const hasFocus = neighborhoodIds.size > 0;

  ctx.globalCompositeOperation = 'source-over';

  const edgeDraw = [];
  const performanceFactor = visualPerf;
  const highFx = performanceFactor > 0.5;
  const nowMs = frameNowMs;
  const pulseT = nowMs * 0.001;
  if (Array.isArray(edges)) {
    for (let i = 0; i < edges.length; i++) {
      const e = edges[i];
      const from = projectedById.get(e.fromId);
      const to = projectedById.get(e.toId);
      if (!from || !to || from.scale < 0.1 || to.scale < 0.1) continue;
      const opacity = Math.min(1, (e.weight * 0.5 + (from.node.coherenceState || 0) * 0.5) * from.scale);
      if (opacity < 0.05) continue;
      edgeDraw.push({
        __index: i,
        from,
        to,
        weight: e.weight,
        opacity,
        depth: (from.depth + to.depth) * 0.5
      });
    }
  }

  edgeDraw.sort((a, b) => {
    const dz = b.depth - a.depth;
    if (dz !== 0) return dz;
    if (a.from.node.id !== b.from.node.id) return a.from.node.id - b.from.node.id;
    if (a.to.node.id !== b.to.node.id) return a.to.node.id - b.to.node.id;
    return a.__index - b.__index;
  });

  const bridgeActive = bridgeState ? Boolean(bridgeState.active) : true;
  const bridgeLesioned = Boolean(bridgeState && (bridgeState.tdCutActive || bridgeState.reducibleActive));

  for (let i = 0; i < edgeDraw.length; i++) {
    const { from, to, weight, opacity } = edgeDraw[i];
    const edgeInFocus = hasFocus && neighborhoodIds.has(from.node.id) && neighborhoodIds.has(to.node.id);
    const edgeDim = hasFocus && !edgeInFocus;
    const fromSec = resolveSectorId(from.node);
    const toSec = resolveSectorId(to.node);
    const isBridgeEdge = fromSec !== toSec;
    const fromHue = getNodeHueVariant(SECTOR_HUES[fromSec], from.node.id, from.scale);
    const toHue = getNodeHueVariant(SECTOR_HUES[toSec], to.node.id, to.scale);
    const isEntangled = weight > 0.84;
    const depthAlpha = clamp((from.scale + to.scale) * 0.45, 0.14, 1);
    const focusAlpha = edgeDim ? 0.15 : edgeInFocus ? 1.45 : 1;
    const weightGain = 0.45 + (0.95 * clamp(Number(weight) || 0.35, 0, 1));
    const bridgeGate = isBridgeEdge ? (bridgeActive ? 1.05 : 0.28) : 0.88;
    const alpha = clamp(opacity * depthAlpha * performanceFactor * focusAlpha * weightGain * bridgeGate * 0.56, 0.03, isEntangled || edgeInFocus ? 0.82 : 0.46);
    const avgHue = (fromHue + toHue) * 0.5;
    const grad = highFx ? ctx.createLinearGradient(from.x2d, from.y2d, to.x2d, to.y2d) : null;
    if (isBridgeEdge && bridgeLesioned) {
      ctx.strokeStyle = `hsla(348 82% 54% / ${(alpha * 0.85).toFixed(3)})`;
      ctx.shadowBlur = 0;
      ctx.lineWidth = (0.55 + weight * 0.85) * clamp(from.scale, 0.45, 1.25) * (edgeInFocus ? 1.35 : edgeDim ? 0.65 : 1);
    } else if (isEntangled || (isBridgeEdge && bridgeActive && weight > 0.62)) {
      if (grad) {
        grad.addColorStop(0, `hsla(${fromHue.toFixed(1)} 92% 66% / ${alpha.toFixed(3)})`);
        grad.addColorStop(0.5, `hsla(${isBridgeEdge ? 172 : avgHue.toFixed(1)} 96% 74% / ${Math.min(0.92, alpha * 1.28).toFixed(3)})`);
        grad.addColorStop(1, `hsla(${toHue.toFixed(1)} 92% 66% / ${alpha.toFixed(3)})`);
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = `hsla(${isBridgeEdge ? 172 : avgHue.toFixed(1)} 92% 68% / ${alpha.toFixed(3)})`;
      }
      ctx.shadowBlur = 0;
      ctx.lineWidth = (0.85 + weight * 1.35) * clamp(from.scale, 0.42, 1.35) * (edgeInFocus ? 1.35 : edgeDim ? 0.65 : 1);
    } else {
      if (grad) {
        grad.addColorStop(0, `hsla(${fromHue.toFixed(1)} 88% 60% / ${alpha.toFixed(3)})`);
        grad.addColorStop(1, `hsla(${toHue.toFixed(1)} 88% 60% / ${alpha.toFixed(3)})`);
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = `hsla(${avgHue.toFixed(1)} 88% 60% / ${alpha.toFixed(3)})`;
      }
      ctx.shadowBlur = 0;
      ctx.lineWidth = (0.55 + weight * 0.95) * clamp(from.scale, 0.45, 1.25) * (edgeInFocus ? 1.35 : edgeDim ? 0.65 : 1);
    }
    const midX = (from.x2d + to.x2d) * 0.5;
    const midY = (from.y2d + to.y2d) * 0.5;
    const dx = to.x2d - from.x2d;
    const dy = to.y2d - from.y2d;
    const curve = clamp((weight - 0.48) * 14, -4, 9) * clamp((from.scale + to.scale) * 0.5, 0.45, 1.2);
    const controlX = midX - dy * 0.015 * curve;
    const controlY = midY + dx * 0.015 * curve;
    if (edgeInFocus) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = isEntangled
        ? `rgba(94,234,212,${(alpha * 0.35).toFixed(3)})`
        : `rgba(103,232,249,${(alpha * 0.28).toFixed(3)})`;
      ctx.lineWidth *= 2.2;
      ctx.beginPath();
      ctx.moveTo(from.x2d, from.y2d);
      ctx.quadraticCurveTo(controlX, controlY, to.x2d, to.y2d);
      ctx.stroke();
      ctx.restore();
    }
    ctx.beginPath();
    ctx.moveTo(from.x2d, from.y2d);
    ctx.quadraticCurveTo(controlX, controlY, to.x2d, to.y2d);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }

  // Subtle Central Constructive Core Diamond & orbital hairline matching 3D view
  const coreProj = projectWithTrig(center.x, center.y, 0, sinX, cosX, sinY, cosY, perspective, center, projectionLimits);
  if (coreProj && coreProj.scale >= 0.1) {
    const cx = ((coreProj.x2d - center.x) * zoom) + center.x + panX;
    const cy = ((coreProj.y2d - center.y) * zoom) + center.y + panY;
    const cs = coreProj.scale * clamp(zoom, 0.6, 1.8);
    const dTone = bridgeState?.decisionTone || 'affirmative';
    const diamondColor = dTone === 'negative' ? '#f43f5e' : (dTone === 'reserve' ? '#f59e0b' : '#24ebb8');
    const rDiam = clamp(6.5 * cs, 3.5, 12);
    ctx.save();
    ctx.strokeStyle = dTone === 'negative' ? 'rgba(244,63,94,0.28)' : 'rgba(56,189,248,0.22)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(cx, cy, rDiam * 3.8, rDiam * 1.9, 0.32, 0, Math.PI * 2);
    ctx.stroke();
    ctx.fillStyle = diamondColor;
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.moveTo(cx, cy - rDiam);
    ctx.lineTo(cx + rDiam * 0.85, cy);
    ctx.lineTo(cx, cy + rDiam);
    ctx.lineTo(cx - rDiam * 0.85, cy);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  ctx.shadowBlur = 0;

  if (performanceFactor > 0.45) {
    let sumX = 0;
    let sumY = 0;
    let totalW = 0;
    for (let i = 0; i < projectedNodes.length; i++) {
      const pn = projectedNodes[i];
      if (pn.scale >= 0.2) {
        sumX += pn.x2d * pn.scale;
        sumY += pn.y2d * pn.scale;
        totalW += pn.scale;
      }
    }
    if (totalW > 0) {
      const comX = sumX / totalW;
      const comY = sumY / totalW;
      const fieldR = Math.min(canvas.width, canvas.height) * 0.38;
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const field = ctx.createRadialGradient(comX, comY, 0, comX, comY, fieldR);
      field.addColorStop(0, 'rgba(6,182,212,0.06)');
      field.addColorStop(0.4, 'rgba(6,182,212,0.02)');
      field.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = field;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.restore();
    }
  }

  const maxHaloNodes = Math.max(28, Math.floor(130 * performanceFactor));
  let haloCount = 0;
  for (let i = 0; i < projectedNodes.length; i++) {
    const pNode = projectedNodes[i];
    const { node, x2d, y2d, scale } = pNode;
    if (scale < 0.1) continue;
    const nodeInFocus = hasFocus && neighborhoodIds.has(node.id);
    const nodeDim = hasFocus && !nodeInFocus;
    const nodeSelected = interaction.selectedId === node.id;
    const nodeHovered = hoverNode?.id === node.id;
    const coh = clamp(Number(node.coherenceState) || 0, 0, 1);
    const cohBoost = clamp(coh * 1.4, 0, 1);
    const inten = clamp(Number(node.intensity) || 0, 0, 1);
    const sigPulse = clamp((Number(node.signalPulse) || 0) * 0.35, 0, 1);
    const deg = Number(node.degree || 4);
    const hubBoost = Math.min(2.0, Math.max(0, deg - 4) * 0.35);
    const baseRadius = 2.0 + (inten * 2.6) + hubBoost + (sigPulse * 2.0);
    const focusScale = nodeSelected ? 1.55 : nodeHovered ? 1.35 : nodeInFocus ? 1.15 : 1;
    const radius = baseRadius * scale * focusScale;
    const secId = resolveSectorId(node);
    const hueVar = getNodeHueVariant(SECTOR_HUES[secId], node.id, scale);
    const coreLight = Math.min(84, 52 + (coh * 18) + (sigPulse * 18));
    const coreColor = `hsl(${hueVar.toFixed(1)} 92% ${coreLight.toFixed(1)}%)`;
    const dimFactor = nodeDim ? 0.34 : 1;
    const opacity = clamp(Math.min(1, coh * 1.5) * scale * dimFactor, nodeDim ? 0.05 : 0.10, nodeSelected || nodeHovered ? 1 : 0.97);
    const depthLift = clamp(scale, 0.25, 1.8);
    const shadowAlpha = clamp(0.10 + depthLift * 0.07, 0.06, 0.20) * dimFactor;
    ctx.save();
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = `rgba(0,0,0,${shadowAlpha.toFixed(3)})`;
    ctx.beginPath();
    ctx.ellipse(
      x2d + radius * 0.45,
      y2d + radius * 0.62,
      radius * 1.1,
      radius * 0.42,
      0.18,
      0,
      Math.PI * 2
    );
    ctx.fill();
    ctx.restore();

    // === HALO EXTERIOR multi-stop (sólo para nodos coherentes) ===
    const canDrawHalo = highFx && haloCount < maxHaloNodes && coh > 0.5 && !nodeDim;
    if (canDrawHalo) {
      const haloR = radius * (nodeSelected ? 4.6 : nodeHovered ? 4.2 : coh > 0.85 ? 3.8 : 2.6);
      const haloAlpha = clamp(
        (0.04 + coh * 0.18) * performanceFactor,
        0.02, nodeSelected || nodeHovered ? 0.34 : 0.22
      ) * clamp(scale, 0.4, 1.1);
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      const halo = ctx.createRadialGradient(x2d, y2d, 0, x2d, y2d, haloR);
      halo.addColorStop(0, `hsla(${hueVar.toFixed(1)} 100% 70% / ${haloAlpha.toFixed(3)})`);
      halo.addColorStop(0.5, `hsla(${hueVar.toFixed(1)} 90% 55% / ${(haloAlpha * 0.4).toFixed(3)})`);
      halo.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(x2d, y2d, haloR, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
      haloCount++;
    }

    // === CUERPO del nodo: gradiente radial multi-stop ===
    // Centro blanco-brillante → color coherente → borde difuminado
    ctx.globalCompositeOperation = 'source-over';
    const nodeGrad = ctx.createRadialGradient(
      x2d - radius * 0.28, y2d - radius * 0.28, 0,
      x2d, y2d, radius * 1.05
    );
    const lightCenter = Math.round(Math.min(98, 62 + coh * 36));
    nodeGrad.addColorStop(0, `hsla(${hueVar.toFixed(1)} 100% ${lightCenter}% / ${opacity.toFixed(3)})`);
    nodeGrad.addColorStop(0.45, coreColor);
    nodeGrad.addColorStop(0.82, `hsla(${hueVar.toFixed(1)} 85% 38% / ${(opacity * 0.7).toFixed(3)})`);
    nodeGrad.addColorStop(1, `hsla(${hueVar.toFixed(1)} 70% 22% / 0)`);
    ctx.fillStyle = nodeGrad;
    ctx.globalAlpha = opacity;
    ctx.beginPath();
    ctx.arc(x2d, y2d, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    // === INNER GLOW suave (siempre, sin strobe) ===
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.fillStyle = `hsla(${hueVar} 100% 78% / ${clamp(0.04 + coh * 0.07, 0.04, 0.14).toFixed(3)})`;
    ctx.beginPath();
    ctx.arc(x2d, y2d, radius * 0.72, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // === SPECULAR HIGHLIGHT (esfera 3D) ===
    if (radius > 3.5 && coh > 0.25) {
      const specX = x2d - radius * 0.32;
      const specY = y2d - radius * 0.32;
      const specR = radius * 0.28;
      const spec = ctx.createRadialGradient(specX, specY, 0, specX, specY, specR);
      spec.addColorStop(0, `rgba(255,255,255,${(0.55 + coh * 0.30).toFixed(3)})`);
      spec.addColorStop(0.6, `rgba(255,255,255,${(0.10 * coh).toFixed(3)})`);
      spec.addColorStop(1, 'rgba(255,255,255,0)');
      ctx.fillStyle = spec;
      ctx.beginPath();
      ctx.arc(specX, specY, specR, 0, Math.PI * 2);
      ctx.fill();
    }

    // === BORDE exterior luminoso ===
    const borderAlpha = clamp(opacity * 0.85, 0.15, 0.92);
    ctx.strokeStyle = `hsla(${hueVar.toFixed(1)} 100% 80% / ${borderAlpha.toFixed(3)})`;
    ctx.lineWidth = clamp(1.2 + coh * 1.2, 0.8, 2.4) * scale * (nodeSelected ? 1.7 : nodeHovered ? 1.45 : 1);
    ctx.shadowBlur = nodeSelected || nodeHovered ? 12 * scale : coh > 0.80 ? 8 * scale : 0;
    ctx.shadowColor = coreColor;
    ctx.stroke();
    ctx.shadowBlur = 0;

    // === INDICADOR DE FASE (vector de estado cuántico) ===
    const phase = node.phase || 0;
    const phaseLen = radius * (1.4 + coh * 0.6);
    const phaseX = x2d + Math.cos(phase) * phaseLen;
    const phaseY = y2d + Math.sin(phase) * phaseLen;
    ctx.beginPath();
    ctx.moveTo(x2d, y2d);
    ctx.lineTo(phaseX, phaseY);
    ctx.strokeStyle = `hsla(${hueVar.toFixed(1)} 98% 74% / ${(opacity * 0.55).toFixed(3)})`;
    ctx.lineWidth = clamp(0.8 + coh * 0.6, 0.5, 1.6) * scale;
    ctx.shadowBlur = 0;
    ctx.stroke();

    if (nodeSelected || nodeHovered) {
      ctx.save();
      ctx.globalCompositeOperation = 'screen';
      ctx.strokeStyle = nodeSelected
        ? 'rgba(255,245,157,0.92)'
        : 'rgba(103,232,249,0.78)';
      ctx.lineWidth = Math.max(1, 1.2 * scale);
      ctx.setLineDash([Math.max(3, 5 * scale), Math.max(2, 4 * scale)]);
      ctx.beginPath();
      ctx.arc(x2d, y2d, radius * (nodeSelected ? 1.95 : 1.72), 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }
  }


  if (performanceFactor > 0.45) {
    const topNodes = [...projectedNodes]
      .filter(pn => pn.scale >= 0.3 && (pn.node.coherenceState || 0) > 0.7)
      .sort((a, b) => (b.node.coherenceState || 0) - (a.node.coherenceState || 0))
      .slice(0, 3);
    for (let i = 0; i < topNodes.length; i++) {
      const pn = topNodes[i];
      const { x2d, y2d, scale } = pn;
      const coh = pn.node.coherenceState || 0;
      const style = getCoherenceStyle(clamp(coh * 1.4, 0, 1));
      const radius = (4 + (pn.node.intensity || 0) * 10) * scale;
      const labelY = y2d - radius - 8 * scale;
      const fontSize = Math.max(8, Math.round(10 * scale));

      ctx.font = `600 ${fontSize}px "Space Grotesk", monospace`;
      ctx.textAlign = 'center';
      ctx.fillStyle = style.edge;
      ctx.globalAlpha = clamp(0.85 * scale, 0.25, 0.95);
      ctx.fillText(`# ${(coh * 100).toFixed(0)}%`, x2d, labelY);
      ctx.globalAlpha = 1.0;
    }
  }

  // Real traveling signal bursts emitted by processSignals() (matches 3D signal traffic)
  if (Array.isArray(signalBursts) && signalBursts.length > 0 && !deterministic) {
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    for (let i = 0; i < signalBursts.length; i += 1) {
      const sb = signalBursts[i];
      const fromP = projectedById.get(sb.fromId);
      const toP = projectedById.get(sb.toId);
      if (!fromP || !toP || fromP.scale < 0.1 || toP.scale < 0.1) continue;
      const t = clamp(Number(sb.t) || 0, 0, 1);
      const px = fromP.x2d + ((toP.x2d - fromP.x2d) * t);
      const py = fromP.y2d + ((toP.y2d - fromP.y2d) * t);
      const sc = (fromP.scale + toP.scale) * 0.5;
      const pr = clamp((2.0 + (sb.strength || 0.5) * 1.8) * sc, 1.4, 4.6);
      const env = Math.sin(t * Math.PI);
      ctx.fillStyle = sb.isInter
        ? `rgba(110, 255, 200, ${(0.45 + 0.50 * env).toFixed(3)})`
        : `rgba(145, 235, 255, ${(0.40 + 0.48 * env).toFixed(3)})`;
      ctx.beginPath();
      ctx.arc(px, py, pr * 1.9, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(px, py, pr * 0.72, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  } else {
    if (nodes.length > 0) {
      const nodesKey = deterministic ? computeNodesKeyUnordered(nodes) : computeNodesKeyOrdered(nodes);
      if (particles.length === 0 || (deterministic && particlesKey !== nodesKey)) {
        particles = createParticles(nodes, seed, deterministic);
        particlesKey = nodesKey;
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    for (let i = 0; i < particles.length; i++) {
      const p = particles[i];
      const pNode = projectedById.get(p.nodeId);
      if (!pNode || pNode.scale < 0.1) continue;
      const angle = deterministic ? computeOrbitalAngle(p.baseAngle, p.speed, tick) : (p.angle += p.speed);
      const ox = Math.cos(angle) * p.radius;
      const oy = Math.sin(angle) * p.radius;
      const px = pNode.x2d + ox * pNode.scale;
      const py = pNode.y2d + oy * pNode.scale;
      const pr = p.size * pNode.scale;

      if (highFx) {
        const glowAlpha = clamp((0.25 * pNode.scale) * performanceFactor, 0.05, 0.30);
        const hslaColor = p.color.replace('hsl(', 'hsla(').replace(')', ` / ${glowAlpha.toFixed(3)})`);
        ctx.save();
        ctx.globalCompositeOperation = 'lighter';
        const pGrad = ctx.createRadialGradient(px, py, 0, px, py, pr * 2.5);
        pGrad.addColorStop(0, hslaColor);
        pGrad.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pGrad;
        ctx.beginPath();
        ctx.arc(px, py, pr * 2.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }

      ctx.fillStyle = p.color;
      ctx.globalAlpha = clamp((0.12 + (0.28 * pNode.scale)) * performanceFactor, 0.08, 0.35);
      ctx.beginPath();
      ctx.arc(px, py, pr, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1.0;
    }
  }

  ctx.globalCompositeOperation = 'source-over';

  self.postMessage({
    type: 'telemetry',
    payload: {
      minDepth: Number.isFinite(minDepth) ? minDepth : 0,
      maxDepth: Number.isFinite(maxDepth) ? maxDepth : 0,
      clampHits,
      nodeCount: projectedNodes.length,
      visibleCount,
      visibleOnscreenCount: projectedNodes.filter((pn) => pn.scale >= 0.1 && pn.x2d >= -24 && pn.x2d <= canvas.width + 24 && pn.y2d >= -24 && pn.y2d <= canvas.height + 24).length,
      drawnEdgesCount: edgeDraw.length,
      hoverNode,
      selectedNode,
      focusNeighborhoodSize: neighborhoodIds.size,
      rotationX: currentRotX,
      rotationY: currentRotY,
      frameTs: deterministic ? tick : (typeof performance !== 'undefined' ? performance.now() : Date.now())
    }
  });
};

self.onmessage = (event) => {
  const msg = event.data || {};
  if (msg.type === 'init') {
    canvas = msg.canvas;
    ctx = canvas.getContext('2d', { alpha: false });
    if (typeof msg.width === 'number') canvas.width = msg.width;
    if (typeof msg.height === 'number') canvas.height = msg.height;
    perspective = msg.perspective ?? perspective;
    center = msg.center ?? center;
    projectionLimits = msg.projectionLimits ?? projectionLimits;
    if (msg.camera && typeof msg.camera === 'object') {
      camera = {
        zoom: clamp(Number(msg.camera.zoom) || 1, 0.35, 3.5),
        panX: Number(msg.camera.panX) || 0,
        panY: Number(msg.camera.panY) || 0
      };
    }
    clearCanvas();
    return;
  }
  if (msg.type === 'frame') {
    drawFrame(msg);
  }
  if (msg.type === 'resize') {
    if (canvas) {
      if (typeof msg.width === 'number') canvas.width = msg.width;
      if (typeof msg.height === 'number') canvas.height = msg.height;
      // FIX 5: Actualizar center y projectionLimits al hacer resize
      // Sin esto, la proyección 3D seguiría usando las dimensiones anteriores
      if (msg.center && typeof msg.center === 'object') center = msg.center;
      if (msg.projectionLimits && typeof msg.projectionLimits === 'object') projectionLimits = msg.projectionLimits;
      clearCanvas();
    }
  }

};
