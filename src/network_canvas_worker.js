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
  { min: 0.00, hue: 4, sat: 96, coreL: 50 },
  { min: 0.15, hue: 20, sat: 95, coreL: 54 },
  { min: 0.30, hue: 44, sat: 98, coreL: 58 },
  { min: 0.44, hue: 84, sat: 92, coreL: 56 },
  { min: 0.57, hue: 138, sat: 86, coreL: 54 },
  { min: 0.70, hue: 174, sat: 88, coreL: 56 },
  { min: 0.82, hue: 264, sat: 90, coreL: 62 },
  { min: 0.92, hue: 47, sat: 100, coreL: 62 },
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
    core: `hsl(${hue} ${sat}% ${coreL}%)`,
    edge: `hsl(${hue} ${sat}% ${Math.min(88, coreL + 14)}%)`,
    phase: `hsla(${hue} ${sat}% 74% / 0.55)`,
    haloLight: Math.min(88, coreL + 18)
  };
};
const getCoherenceStyle = (coh) => getSemanticState(coh);
const getNodeHueVariant = (h) => h;


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
};


const drawFrame = ({ nodes, edges, rotation, camera: frameCamera, deterministic, seed, tick }) => {
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

  for (let i = 0; i < edgeDraw.length; i++) {
    const { from, to, weight, opacity } = edgeDraw[i];
    const fromC = clamp((Number(from.node.coherenceState) || 0) * 1.4, 0, 1);
    const toC = clamp((Number(to.node.coherenceState) || 0) * 1.4, 0, 1);
    const fromHue = getNodeHueVariant(10 + (fromC * 190), from.node.id, from.scale);
    const toHue = getNodeHueVariant(10 + (toC * 190), to.node.id, to.scale);
    const isEntangled = weight > 0.88;
    const depthAlpha = clamp((from.scale + to.scale) * 0.45, 0.15, 1);
    const alpha = clamp(opacity * depthAlpha * performanceFactor, 0.04, isEntangled ? 0.65 : 0.40);
    const avgHue = (fromHue + toHue) * 0.5;
    const grad = highFx ? ctx.createLinearGradient(from.x2d, from.y2d, to.x2d, to.y2d) : null;
    if (isEntangled) {
      if (grad) {
        grad.addColorStop(0, `hsla(48 100% 72% / ${alpha.toFixed(3)})`);
        grad.addColorStop(0.5, `hsla(56 100% 80% / ${Math.min(1, alpha * 1.3).toFixed(3)})`);
        grad.addColorStop(1, `hsla(48 100% 72% / ${alpha.toFixed(3)})`);
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = `hsla(48 100% 72% / ${alpha.toFixed(3)})`;
      }
      if (highFx) {
        ctx.shadowBlur = 5 * clamp(from.scale, 0.5, 1.2);
        ctx.shadowColor = 'rgba(255,200,0,0.6)';
      } else {
        ctx.shadowBlur = 0;
      }
      ctx.lineWidth = (1.8 + weight * 2.2) * clamp(from.scale, 0.4, 1.5);
    } else {
      if (grad) {
        grad.addColorStop(0, `hsla(${fromHue.toFixed(1)} 90% 60% / ${alpha.toFixed(3)})`);
        grad.addColorStop(1, `hsla(${toHue.toFixed(1)} 90% 60% / ${alpha.toFixed(3)})`);
        ctx.strokeStyle = grad;
      } else {
        ctx.strokeStyle = `hsla(${avgHue.toFixed(1)} 90% 60% / ${alpha.toFixed(3)})`;
      }
      ctx.shadowBlur = 0;
      ctx.lineWidth = (0.8 + weight * 1.2) * clamp(from.scale, 0.45, 1.3);
    }
    ctx.beginPath();
    ctx.moveTo(from.x2d, from.y2d);
    ctx.lineTo(to.x2d, to.y2d);
    ctx.stroke();
    ctx.shadowBlur = 0;
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
    const coh = clamp(Number(node.coherenceState) || 0, 0, 1);
    const cohBoost = clamp(coh * 1.4, 0, 1);
    const inten = clamp(Number(node.intensity) || 0, 0, 1);
    const baseRadius = 4 + inten * 10;
    const pulseAmp = 0.06 + coh * 0.10;
    const pulseMod = 1 + pulseAmp * Math.sin(pulseT * 2.5 + (node.phase || 0));
    const radius = baseRadius * scale * pulseMod;
    const style = getCoherenceStyle(cohBoost);
    const hueVar = getNodeHueVariant(style.hue, node.id, scale);
    const coreLight = 48 + (cohBoost * 18);
    const coreColor = `hsl(${hueVar.toFixed(1)} 92% ${coreLight.toFixed(1)}%)`;
    const opacity = clamp(Math.min(1, coh * 1.5) * scale, 0.10, 0.97);

    // === HALO EXTERIOR multi-stop (sólo para nodos coherentes) ===
    const canDrawHalo = highFx && haloCount < maxHaloNodes && coh > 0.5;
    if (canDrawHalo) {
      const haloR = radius * (coh > 0.85 ? 3.8 : 2.6);
      const haloAlpha = clamp(
        (0.04 + coh * 0.18) * performanceFactor,
        0.02, 0.22
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
    ctx.lineWidth = clamp(1.2 + coh * 1.2, 0.8, 2.4) * scale;
    ctx.shadowBlur = coh > 0.80 ? 8 * scale : 0;
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

  ctx.globalCompositeOperation = 'source-over';

  self.postMessage({
    type: 'telemetry',
    payload: {
      minDepth: Number.isFinite(minDepth) ? minDepth : 0,
      maxDepth: Number.isFinite(maxDepth) ? maxDepth : 0,
      clampHits,
      nodeCount: projectedNodes.length,
      visibleCount,
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
