/**
 * NETWORK CANVAS COMPONENT (v8.1 - CINEMATIC 2.5D PROJECTION ENGINE)
 * Motor de renderizado 3D de alta fidelidad con proyección de pinhole y rotación interactiva.
 * 
 * CARACTERÍSTICAS:
 * - Proyección 3D interactiva (Rotación por ratón: click + arrastrar)
 * - Efectos de profundidad (Cercanía/Lejanía) con Z-Sorting
 * - Zero Cloning - Lectura directa de nodalLayer (Máximo rendimiento)
 * - Persistencia Visual - El canvas se dibuja incluso si la simulación está pausada
 * - Estética Premium - Sombras, brillos y partículas orbitantes
 */
import React, { useRef, useCallback, useEffect, useState, useMemo } from 'react';
import { projectWithTrig } from './utils/pinhole';
import { createRng, computeNodesKeyUnordered, compareDepthDesc, computeOrbitalAngle } from './utils/determinism';
import { createCanvasTraceRecorder, shouldTraceRenderHash } from './utils/render_trace_hash';
import { QICNConfig } from '../services/config.js';
import {
    NODAL_3D_VIEW_MODES,
    buildRealSynapticEdgeSelection,
    computeCoupledNodeTargets,
    createProjectionWorkspace,
    createSignalPacketPool,
    extractCoreVisualizationState,
    selectStratifiedRenderIndices,
    spawnSignalPacketsFromView,
    stepSignalPackets
} from './simulation/Nodal3DSceneProjection.js';

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

const toNodeArray = (value) => (Array.isArray(value) ? value.filter(Boolean) : []);

const buildSyntheticRecoveryNodes = (count = 36) =>
    Array.from({ length: count }, (_, idx) => {
        const angle = (idx / count) * Math.PI * 2;
        const radius = 120 + ((idx % 5) * 14);
        const z = ((idx % 7) - 3) * 22;
        return {
            id: 800000 + idx,
            x: Math.cos(angle) * radius,
            y: Math.sin(angle) * radius,
            z,
            coherenceState: 0.55 + ((idx % 4) * 0.1),
            intensity: 0.45 + ((idx % 3) * 0.15),
            phase: angle,
            connections: []
        };
    });

const clampCamera = (camera, canvas) => {
    if (!canvas) return camera;
    const zoom = clamp(Number(camera.zoom) || 1, 0.35, 3.5);
    const panLimitX = Math.max(220, (canvas.width * (zoom - 1)) + 260);
    const panLimitY = Math.max(180, (canvas.height * (zoom - 1)) + 220);
    return {
        zoom,
        panX: clamp(Number(camera.panX) || 0, -panLimitX, panLimitX),
        panY: clamp(Number(camera.panY) || 0, -panLimitY, panLimitY)
    };
};

const getCoherenceColor = (coherence) => {
    const c = clamp(Number(coherence) || 0, 0, 1);
    const hue = 10 + (c * 190); // rojo -> cian
    const light = 46 + (c * 16);
    return `hsl(${hue.toFixed(1)} 90% ${light.toFixed(1)}%)`;
};

// ============================================================
// PALETA SEMÁNTICA DE ESTADOS ONTOLÓGICOS (ULTRATHINK v2)
// 8 estados con colores impactantes que reflejan la teoría QICN
// ============================================================
const SEMANTIC_STATES = [
    // coh range         hue  sat  coreL  name                  glow token
    { min: 0.00, hue: 4, sat: 96, coreL: 50, name: 'Turbulencia' }, // Rojo sangre
    { min: 0.15, hue: 20, sat: 95, coreL: 54, name: 'Caos' }, // Naranja ardiente
    { min: 0.30, hue: 44, sat: 98, coreL: 58, name: 'Exploración' }, // Ámbar (amarillo)
    { min: 0.44, hue: 84, sat: 92, coreL: 56, name: 'Emergencia' }, // Lima brillante
    { min: 0.57, hue: 138, sat: 86, coreL: 54, name: 'Armonía' }, // Verde esmeralda
    { min: 0.70, hue: 174, sat: 88, coreL: 56, name: 'Coherencia' }, // Teal/menta
    { min: 0.82, hue: 264, sat: 90, coreL: 62, name: 'Ascensión' }, // Violeta profundo
    { min: 0.92, hue: 47, sat: 100, coreL: 62, name: 'Trascendencia' }, // Oro absolutamente puro
];

const getSemanticState = (coh) => {
    const c = clamp(Number(coh) || 0, 0, 1);
    let state = SEMANTIC_STATES[0];
    for (let i = SEMANTIC_STATES.length - 1; i >= 0; i--) {
        if (c >= SEMANTIC_STATES[i].min) { state = SEMANTIC_STATES[i]; break; }
    }
    const { hue, sat, coreL } = state;
    return {
        hue,
        sat,
        coreL,
        name: state.name,
        core: `hsl(${hue} ${sat}% ${coreL}%)`,
        edge: `hsl(${hue} ${sat}% ${Math.min(88, coreL + 14)}%)`,
        phase: `hsla(${hue} ${sat}% 74% / 0.55)`,
        haloLight: Math.min(88, coreL + 18)
    };
};

// Compatibilidad: alias para llamadas existentes legacy
const getCoherenceStyle = (coh) => getSemanticState(coh);

// getNodeHueVariant ya no es necesaria — la paleta semántica provee la variedad
// Mantenida para compatibilidad con código generado por Codex
const getNodeHueVariant = (baseHue, nodeId, scale = 1) => baseHue;

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
    const state = getSemanticState(coherence);
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
        stateName: state.name
    };
};

const sameNodeSummary = (a, b) => {
    if (!a && !b) return true;
    if (!a || !b) return false;
    return a.id === b.id
        && Math.abs(a.coherence - b.coherence) < 0.001
        && Math.abs(a.intensity - b.intensity) < 0.001
        && a.degree === b.degree
        && a.stateName === b.stateName;
};

const buildNeighborhoodSet = (focusId, nodes) => {
    const ids = new Set();
    if (focusId === null || focusId === undefined) return ids;
    ids.add(focusId);
    for (let i = 0; i < nodes.length; i++) {
        const node = nodes[i];
        if (!node) continue;
        if (node.id === focusId && Array.isArray(node.connections)) {
            for (let j = 0; j < node.connections.length; j++) {
                ids.add(node.connections[j]?.targetId);
            }
        }
        if (Array.isArray(node.connections) && node.connections.some((conn) => conn?.targetId === focusId)) {
            ids.add(node.id);
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
        const node = pn.node || {};
        const intensity = clamp(Number(node.intensity) || 0, 0, 1);
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

const drawCinematicDepthBackground = (ctx, canvas, center, camera, nowMs, visualPerf = 1) => {
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


const RENDER_STATE_META = {
    active: {
        label: 'DINAMICA ACTIVA',
        badgeClass: 'text-emerald-300 bg-emerald-900/30 border-emerald-500/30'
    },
    recovering: {
        label: 'RECUPERANDO NODOS',
        badgeClass: 'text-amber-300 bg-amber-900/30 border-amber-500/30'
    },
    no_visible_nodes: {
        label: 'SIN NODOS VISIBLES',
        badgeClass: 'text-rose-300 bg-rose-900/30 border-rose-500/30'
    },
    fallback_2d: {
        label: 'FALLBACK 2D',
        badgeClass: 'text-sky-300 bg-sky-900/30 border-sky-500/30'
    },
    worker_fault: {
        label: 'WORKER FAULT',
        badgeClass: 'text-rose-200 bg-rose-900/40 border-rose-400/40'
    },
    projection_fault: {
        label: 'PROJECTION FAULT',
        badgeClass: 'text-orange-200 bg-orange-900/40 border-orange-400/40'
    },
    data_fault: {
        label: 'DATA FAULT',
        badgeClass: 'text-yellow-200 bg-yellow-900/40 border-yellow-400/40'
    }
};

const NetworkCanvas = ({
    nodalLayer,
    ontologicalState,
    bridgeMetrics = null,
    endogenousDecision = null,
    onCouplingModeChange = null,
    isRunning,
    onTelemetry,
    deterministic = false,
    seed = 0,
    tick = 0,
    viewportMode = 'desktop',
    canvasScale = 1,
    uiDensity = 'comfortable',
    touchEnabled = false
}) => {
    const containerRef = useRef(null);
    const canvasRef = useRef(null);
    const latestPropsRef = useRef({ ontologicalState, endogenousDecision, bridgeMetrics, tick, viewportMode });
    latestPropsRef.current = { ontologicalState, endogenousDecision, bridgeMetrics, tick, viewportMode };
    const [isExpanded, setIsExpanded] = useState(false);
    const [showHudDetails, setShowHudDetails] = useState(false);
    const [bridgeHudState, setBridgeHudState] = useState({
        mode: 'bidirectional',
        effectiveEta: 0.125,
        decisionTone: 'affirmative',
        activeSignals: 0
    });
    const proj2dWorkspaceRef = useRef(null);
    const proj2dSignalPoolRef = useRef(null);
    const proj2dMetaRef = useRef({
        lastNodeCount: -1,
        renderCount: 0,
        lastEdgeTick: -999,
        lastMode: '',
        lastLayoutMs: -999,
        lastSignalMs: 0,
        edgeStats: { totalEdges: 0, bridgeEdges: 0, intraEdges: 0 }
    });
    const renderCountRef = useRef(0);
    const lastRenderTimeRef = useRef(0);
    const animationFrameRef = useRef(null);
    const particlesRef = useRef([]);
    const particlesKeyRef = useRef(0);
    const autoRotBaseRef = useRef({ tick0: 0, rotY0: 0.5 });
    const rotationRef = useRef({ x: 0.5, y: 0.5 });
    const cameraRef = useRef({ zoom: 1, panX: 0, panY: 0 });
    const frameStatsRef = useRef({ lastTs: 0, fps: 60, uiTs: 0 });
    const nodesCacheRef = useRef({ ts: 0, nodes: [] });
    const offscreenFramesRef = useRef(0);
    const emptyNodeFramesRef = useRef(0);
    const workerRef = useRef(null);
    const workerReadyRef = useRef(false);
    const workerHeartbeatRef = useRef(0);
    const workerRestartCountRef = useRef(0);
    const recoveryAttemptCountRef = useRef(0);
    const transferredToWorkerRef = useRef(false);
    const recoveringCanvasRef = useRef(false);
    const lastRenderableNodesRef = useRef([]);
    const lastRenderErrorRef = useRef({ code: 'none', message: '' });
    const renderStateRef = useRef({ state: 'recovering', detail: 'Inicializando malla nodal.', ts: 0 });
    const projectionSmoothingRef = useRef(new Map());
    const interactionRef = useRef({
        pointer: null,
        hoveredId: null,
        selectedId: null,
        tooltip: null
    });
    const dragMovedRef = useRef(false);

    // ESTADO DE ROTACIÓN 3D (Ángulos en radianes)
    const [fpsDisplay, setFpsDisplay] = useState(60);
    const [workerMode, setWorkerMode] = useState(Boolean(QICNConfig?.RENDER_WORKER));
    const [canvasEpoch, setCanvasEpoch] = useState(0);
    const [renderState, setRenderState] = useState('recovering');
    const [renderStateDetail, setRenderStateDetail] = useState('Inicializando malla nodal.');
    const [drawStats, setDrawStats] = useState({
        visibleNodes: 0,
        edgeCount: 0,
        projectedNodes: 0,
        visibleOnScreen: 0,
        workerRestarts: 0,
        recoveryAttempts: 0,
        renderErrorCode: 'none'
    });
    const [hoverNode, setHoverNode] = useState(null);
    const [selectedNode, setSelectedNode] = useState(null);
    const isDragging = useRef(false);
    const dragModeRef = useRef('rotate');
    const lastMousePos = useRef({ x: 0, y: 0 });
    const touchStateRef = useRef({
        active: false,
        startDistance: 0,
        startZoom: 1,
        startPanX: 0,
        startPanY: 0,
        lastTapTs: 0
    });
    const [canvasSize, setCanvasSize] = useState({ width: 900, height: 650, dpr: 1 });

    // PARÁMETROS DE CÁMARA (PINHOLE)
    const perspective = 800; // Focal length
    const center = useMemo(() => ({ x: canvasSize.width * 0.5, y: canvasSize.height * 0.5 }), [canvasSize.width, canvasSize.height]);
    const projectionLimits = useMemo(() => ({
        sMin: 0.02,
        sMax: 4.0,
        depthOffset: perspective,
        denomEps: 1e-3
    }), [perspective]);

    const useWorkerRender = useMemo(() => {
        return workerMode && typeof OffscreenCanvas !== 'undefined' && typeof Worker !== 'undefined';
    }, [workerMode]);

    const getCanvasPointFromEvent = useCallback((event) => {
        const canvas = canvasRef.current;
        if (!canvas || !event) return null;
        const rect = canvas.getBoundingClientRect();
        const scaleX = canvas.width / Math.max(1, rect.width);
        const scaleY = canvas.height / Math.max(1, rect.height);
        return {
            x: clamp((event.clientX - rect.left) * scaleX, 0, canvas.width),
            y: clamp((event.clientY - rect.top) * scaleY, 0, canvas.height),
            cssX: event.clientX - rect.left,
            cssY: event.clientY - rect.top
        };
    }, []);

    const updateHoverSummary = useCallback((summary) => {
        interactionRef.current.hoveredId = summary?.id ?? null;
        interactionRef.current.tooltip = summary || null;
        setHoverNode((prev) => (sameNodeSummary(prev, summary) ? prev : summary));
    }, []);

    const updateSelectedSummary = useCallback((summary) => {
        interactionRef.current.selectedId = summary?.id ?? null;
        setSelectedNode((prev) => (sameNodeSummary(prev, summary) ? prev : summary));
    }, []);

    const setRenderStateSafe = useCallback((state, detail = '', errorCode = 'none', errorMessage = '') => {
        const now = Date.now();
        const prev = renderStateRef.current;
        if (prev.state === state && prev.detail === detail && (now - prev.ts) < 350) return;
        renderStateRef.current = { state, detail, ts: now };
        lastRenderErrorRef.current = {
            code: errorCode || 'none',
            message: errorMessage || detail || ''
        };
        setRenderState(state);
        setRenderStateDetail(detail || '');
        setDrawStats((prevStats) => ({
            ...prevStats,
            workerRestarts: workerRestartCountRef.current,
            recoveryAttempts: recoveryAttemptCountRef.current,
            renderErrorCode: errorCode || 'none'
        }));
    }, []);

    const queueCanvasRecovery = useCallback((reason = 'manual_recovery') => {
        if (recoveringCanvasRef.current) return;
        recoveringCanvasRef.current = true;
        recoveryAttemptCountRef.current += 1;
        setWorkerMode(false);
        setCanvasEpoch((prev) => prev + 1);
        setRenderStateSafe(
            'recovering',
            'Recuperando canvas 2D tras transferencia Offscreen.',
            'canvas_recovery_remount',
            reason
        );
        requestAnimationFrame(() => { recoveringCanvasRef.current = false; });
    }, [setRenderStateSafe]);

    const paintRecoveryCanvas = useCallback((ctx, canvas, title, detail) => {
        const bgLinear = ctx.createLinearGradient(0, 0, 0, canvas.height);
        bgLinear.addColorStop(0, '#03102b');
        bgLinear.addColorStop(0.55, '#05091f');
        bgLinear.addColorStop(1, '#03050f');
        ctx.fillStyle = bgLinear;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const glow = ctx.createRadialGradient(canvas.width * 0.5, canvas.height * 0.4, 0, canvas.width * 0.5, canvas.height * 0.4, Math.max(canvas.width, canvas.height) * 0.55);
        glow.addColorStop(0, 'rgba(6,182,212,0.15)');
        glow.addColorStop(0.45, 'rgba(168,85,247,0.12)');
        glow.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = glow;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const fontBase = Math.max(12, Math.round(canvas.width * 0.018));
        ctx.textAlign = 'center';
        ctx.fillStyle = '#67e8f9';
        ctx.font = `600 ${fontBase}px "Space Grotesk", sans-serif`;
        ctx.fillText(title, canvas.width * 0.5, canvas.height * 0.44);
        ctx.fillStyle = 'rgba(226,232,240,0.85)';
        ctx.font = `400 ${Math.max(11, Math.round(fontBase * 0.78))}px "Space Grotesk", sans-serif`;
        ctx.fillText(detail, canvas.width * 0.5, canvas.height * 0.52);
        ctx.fillStyle = 'rgba(148,163,184,0.85)';
        ctx.font = `500 ${Math.max(10, Math.round(fontBase * 0.66))}px "Space Grotesk", sans-serif`;
        ctx.fillText('Sugerencia: usa "Reactivar red" o inicia simulacion para poblar nodos.', canvas.width * 0.5, canvas.height * 0.58);
    }, []);

    useEffect(() => {
        const node = containerRef.current;
        if (!node) return undefined;

        const computeHeight = (width) => {
            if (viewportMode === 'mobile') return Math.max(320, Math.round(width * 0.72));
            if (viewportMode === 'tablet') return Math.max(380, Math.round(width * 0.68));
            return Math.max(420, Math.round(width * 0.62));
        };

        const updateSize = () => {
            const rect = node.getBoundingClientRect();
            const cssWidth = Math.max(320, Math.floor(rect.width));
            const cssHeight = computeHeight(cssWidth);
            const dprRaw = (window.devicePixelRatio || 1) * clamp(Number(canvasScale) || 1, 0.7, 1.5);
            const dpr = clamp(dprRaw, 1, 2);
            const width = Math.floor(cssWidth * dpr);
            const height = Math.floor(cssHeight * dpr);
            setCanvasSize((prev) => {
                if (prev.width === width && prev.height === height && prev.dpr === dpr) return prev;
                return { width, height, dpr };
            });
        };

        updateSize();
        const observer = new ResizeObserver(updateSize);
        observer.observe(node);
        window.addEventListener('orientationchange', updateSize, { passive: true });
        return () => {
            observer.disconnect();
            window.removeEventListener('orientationchange', updateSize);
        };
    }, [viewportMode, canvasScale]);


    /**
     * Inicialización de Partículas Orbitantes
     */
    const createParticles = useCallback((nodes, seedValue) => {
        const particles = [];
        const sortedNodes = deterministic ? [...nodes].sort((a, b) => (a?.id || 0) - (b?.id || 0)) : nodes;
        sortedNodes.forEach(node => {
            if (!node || node.coherenceState < 0.6) return;

            const rng = deterministic ? createRng((seedValue ^ node.id) >>> 0) : Math.random;
            const numParticles = Math.floor(node.coherenceState * 6);
            for (let i = 0; i < numParticles; i++) {
                const baseAngle = rng() * Math.PI * 2;
                particles.push({
                    nodeId: node.id,
                    baseAngle,
                    angle: baseAngle,
                    speed: 0.01 + rng() * 0.02,
                    radius: 12 + rng() * 15,
                    size: 1 + rng() * 1.5,
                    color: getCoherenceColor(node.coherenceState)
                });
            }
        });
        return particles;
    }, [deterministic]);

    useEffect(() => {
        if (!deterministic) return;
        autoRotBaseRef.current = { tick0: tick, rotY0: rotationRef.current.y };
    }, [deterministic, tick]);

    useEffect(() => {
        if (!useWorkerRender) {
            transferredToWorkerRef.current = false;
        }
    }, [useWorkerRender, canvasEpoch]);

    // FIX 4: Reset del flag de transfer cuando el canvas se remonta (canvasEpoch++)
    // Esto permite que el próximo mount del canvas inicie un transfer limpio
    useEffect(() => {
        transferredToWorkerRef.current = false;
    }, [canvasEpoch]);

    useEffect(() => {
        if (!useWorkerRender) return;
        const canvas = canvasRef.current;
        if (!canvas) return;
        if (workerRef.current) return;

        let worker = null;
        try {
            worker = new Worker(new URL('./network_canvas_worker.js', import.meta.url), { type: 'module' });
        } catch (error) {
            console.error('[QICN][3D] Worker init failed. Using main-thread canvas fallback.', error);
            workerReadyRef.current = false;
            workerRef.current = null;
            transferredToWorkerRef.current = false;
            return;
        }

        workerRef.current = worker;
        workerHeartbeatRef.current = Date.now();
        worker.onmessage = (event) => {
            const msg = event.data || {};
            if (msg.type === 'telemetry') {
                workerHeartbeatRef.current = Date.now();
                const payload = msg.payload || {};
                if (payload.nodeCount <= 0) {
                    setRenderStateSafe('no_visible_nodes', 'Worker activo, pero sin nodos visibles.');
                } else if (payload.visibleCount <= 0) {
                    setRenderStateSafe('recovering', 'Worker activo. Recentrando foco nodal.');
                } else {
                    setRenderStateSafe('active', `Nodos visibles: ${payload.visibleCount}`);
                }
                setDrawStats((prevStats) => ({
                    ...prevStats,
                    visibleNodes: Number(payload.visibleCount || 0),
                    edgeCount: Number(payload.drawnEdgesCount || payload.edgeCount || 0),
                    projectedNodes: Number(payload.projectedNodesCount || payload.nodeCount || 0),
                    visibleOnScreen: Number(payload.visibleOnscreenCount || payload.visibleCount || 0),
                    workerRestarts: workerRestartCountRef.current,
                    recoveryAttempts: recoveryAttemptCountRef.current
                }));
                if (onTelemetry) {
                    onTelemetry({
                        ...payload,
                        render_error_code: lastRenderErrorRef.current.code || 'none',
                        render_error_message: lastRenderErrorRef.current.message || '',
                        worker_restart_count: workerRestartCountRef.current,
                        recovery_attempt_count: recoveryAttemptCountRef.current,
                        visible_on_screen_count: Number(payload.visibleOnscreenCount || payload.visibleCount || 0),
                        projected_nodes_count: Number(payload.projectedNodesCount || payload.nodeCount || 0),
                        drawn_edges_count: Number(payload.drawnEdgesCount || payload.edgeCount || 0)
                    });
                }
                if ('hoverNode' in payload) {
                    updateHoverSummary(payload.hoverNode || null);
                }
                if ('selectedNode' in payload) {
                    setSelectedNode((prev) => (sameNodeSummary(prev, payload.selectedNode || null) ? prev : (payload.selectedNode || null)));
                }
            }
        };
        worker.onerror = (event) => {
            console.error('[QICN][3D] Worker runtime error. Falling back to main-thread rendering.', event);
            workerRestartCountRef.current += 1;
            const message = String(event?.message || 'worker_runtime_error');
            setRenderStateSafe('worker_fault', 'Error de worker detectado. Activando fallback estable.', 'worker_runtime_fault', message);
            workerReadyRef.current = false;
            workerRef.current?.terminate();
            workerRef.current = null;
            if (transferredToWorkerRef.current) queueCanvasRecovery('worker_runtime_fault');
            else setWorkerMode(false);
        };
        worker.onmessageerror = (event) => {
            console.error('[QICN][3D] Worker message error. Falling back to main-thread rendering.', event);
            workerRestartCountRef.current += 1;
            const message = String(event?.message || 'worker_message_error');
            setRenderStateSafe('worker_fault', 'Canal de worker inconsistente. Activando fallback estable.', 'worker_message_fault', message);
            workerReadyRef.current = false;
            workerRef.current?.terminate();
            workerRef.current = null;
            if (transferredToWorkerRef.current) queueCanvasRecovery('worker_message_fault');
            else setWorkerMode(false);
        };

        // FIX 1: Guard definitivo contra double-transfer
        // Si el canvas ya fue transferido (ej: resize re-ejecutó este effect), abortar inmediatamente
        if (transferredToWorkerRef.current) {
            console.warn('[QICN][3D] Canvas ya fue transferido a OffscreenCanvas. Abortando re-transfer para evitar InvalidStateError.');
            worker.terminate();
            workerRef.current = null;
            queueCanvasRecovery('double_transfer_guard');
            return;
        }

        try {
            const offscreen = canvas.transferControlToOffscreen();
            worker.postMessage({
                type: 'init',
                canvas: offscreen,
                width: canvas.width,
                height: canvas.height,
                perspective,
                center,
                projectionLimits,
                camera: cameraRef.current
            }, [offscreen]);
            workerReadyRef.current = true;
            transferredToWorkerRef.current = true;
        } catch (error) {
            console.error('[QICN][3D] Offscreen transfer failed. Using main-thread canvas fallback.', error);
            workerReadyRef.current = false;
            worker.terminate();
            workerRef.current = null;
            transferredToWorkerRef.current = false;
            return;
        }

        return () => {
            workerReadyRef.current = false;
            worker.terminate();
            workerRef.current = null;
        };
        // FIX 2: canvasSize.width y canvasSize.height ELIMINADOS de las dependencias.
        // Re-incluirlos causaba que el effect re-ejecutara en cada resize, re-intentando transferControlToOffscreen()
        // en un canvas ya transferido => InvalidStateError. El resize se maneja via postMessage (Fix 3).
    }, [useWorkerRender, onTelemetry, perspective, center, projectionLimits, setRenderStateSafe, queueCanvasRecovery, updateHoverSummary]);

    // FIX 3: Enviar resize al worker via postMessage en lugar de re-inicializar el useEffect del worker.
    // Esto mantiene el canvas offscreen vivo y actualiza solo las dimensiones.
    useEffect(() => {
        if (!workerRef.current || !workerReadyRef.current) return;
        workerRef.current.postMessage({
            type: 'resize',
            width: canvasSize.width,
            height: canvasSize.height,
            center,
            projectionLimits
        });
    }, [canvasSize.width, canvasSize.height, center, projectionLimits]);

    useEffect(() => {
        if (!useWorkerRender) return undefined;
        const watchdog = setInterval(() => {
            const age = Date.now() - workerHeartbeatRef.current;
            if (workerReadyRef.current && age > 1200) {
                console.warn('[QICN][3D] Worker heartbeat timeout. Switching to main-thread renderer.');
                workerRestartCountRef.current += 1;
                setRenderStateSafe('worker_fault', 'Timeout de heartbeat. Reiniciando en hilo principal.', 'worker_heartbeat_timeout', `heartbeat_age_ms=${age}`);
                workerReadyRef.current = false;
                workerRef.current?.terminate();
                workerRef.current = null;
                if (transferredToWorkerRef.current) queueCanvasRecovery('worker_heartbeat_timeout');
                else setWorkerMode(false);
            }
        }, 400);
        return () => clearInterval(watchdog);
    }, [useWorkerRender, setRenderStateSafe, queueCanvasRecovery]);


    /**
     * Render Cycle Principal
     */
    const draw = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;

        try {
            const usingWorker = useWorkerRender && workerRef.current && workerReadyRef.current;
            if (!usingWorker && transferredToWorkerRef.current) {
                queueCanvasRecovery('offscreen_context_guard');
                return;
            }
            const baseCtx = usingWorker ? null : canvas.getContext('2d', { alpha: false });
            if (!usingWorker && !baseCtx) {
                setRenderStateSafe(
                    'projection_fault',
                    'Contexto 2D no disponible. Remontando canvas.',
                    'canvas_context_unavailable',
                    'canvas_2d_context_missing'
                );
                // Si el canvas fue transferido al worker y falló, remóntalo para recuperar contexto 2D real.
                if (transferredToWorkerRef.current) queueCanvasRecovery('canvas_context_unavailable');
                return;
            }

            const traceEnabled = !usingWorker && shouldTraceRenderHash(deterministic);
            const traceRecorder = !usingWorker
                ? createCanvasTraceRecorder(baseCtx, traceEnabled)
                : null;
            const ctx = traceRecorder?.ctx || baseCtx;

            const frameNowMs = Date.now();
            const stats = frameStatsRef.current;
            if (stats.lastTs > 0) {
                const dt = Math.max(1, frameNowMs - stats.lastTs);
                const instantFps = 1000 / dt;
                stats.fps = (stats.fps * 0.85) + (instantFps * 0.15);
            }
            stats.lastTs = frameNowMs;
            if (frameNowMs - stats.uiTs > 500) {
                setFpsDisplay(Math.max(1, Math.round(stats.fps)));
                stats.uiTs = frameNowMs;
            }

            const {
                ontologicalState: liveOntologicalState,
                endogenousDecision: liveEndogenousDecision,
                bridgeMetrics: liveBridgeMetrics,
                tick: liveTick,
                viewportMode: liveViewportMode
            } = latestPropsRef.current;

            // Limitar a 30 FPS estables para paridad de fluidez con WebGL 3D.
            const now = deterministic ? liveTick : Date.now();
            const minFrameInterval = 33;
            if (deterministic) {
                if (now === lastRenderTimeRef.current) return;
            } else if (now - lastRenderTimeRef.current < minFrameInterval) {
                return;
            }
            const frameDtSec = deterministic ? 0.033 : clamp((now - (lastRenderTimeRef.current || now - 33)) * 0.001, 0.008, 0.08);
            lastRenderTimeRef.current = now;

            // 1. OBTENCIÓN DE DATOS (Alineado con física orgánica fuerza-dirigida 3D + señales reales)
            const adaptiveFps = stats.fps || 30;
            const nodeBudget = liveViewportMode === 'mobile' ? 108 : (liveViewportMode === 'tablet' ? 168 : 240);
            const cacheTtlMs = adaptiveFps < 18 ? 140 : 90;
            if (!nodalLayer?.current) {
                setRenderStateSafe(
                    'data_fault',
                    'La capa nodal no esta disponible. Esperando inicializacion.',
                    'layer_unavailable',
                    'nodal_layer_ref_missing'
                );
                if (!usingWorker && ctx) {
                    paintRecoveryCanvas(ctx, canvas, 'Red nodal inicializando', 'La capa de nodos aun no esta lista.');
                }
                return;
            }

            let organicBridgeState = null;
            let liveSignalBursts = null;
            const layerInst = nodalLayer.current;

            if (!deterministic && typeof layerInst?.get3DTelemetryView === 'function' && Array.isArray(layerInst.nodes) && layerInst.nodes.length > 0) {
                if (!proj2dWorkspaceRef.current || proj2dWorkspaceRef.current.nodeCapacity < 260) {
                    proj2dWorkspaceRef.current = createProjectionWorkspace(260, 720);
                }
                if (!proj2dSignalPoolRef.current) {
                    proj2dSignalPoolRef.current = createSignalPacketPool(120);
                }
                const ws = proj2dWorkspaceRef.current;
                const sigPool = proj2dSignalPoolRef.current;
                const meta = proj2dMetaRef.current;

                const view3d = layerInst.get3DTelemetryView(
                    liveOntologicalState?.tower_telemetry || null,
                    liveEndogenousDecision || liveOntologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision || null
                );
                const coreState = extractCoreVisualizationState(view3d, liveOntologicalState);
                const resolvedMode = coreState.bridgeMode || liveBridgeMetrics?.mode || 'bidirectional';
                const resolvedEta = Number.isFinite(coreState.effectiveEta)
                    ? coreState.effectiveEta
                    : Number(liveBridgeMetrics?.effective_eta ?? 0.125);
                organicBridgeState = {
                    mode: resolvedMode,
                    active: coreState.bridgeActive,
                    tdCutActive: coreState.tdCutActive,
                    reducibleActive: coreState.reducibleActive,
                    effectiveEta: resolvedEta,
                    decisionTone: coreState.decisionTone
                };

                const targetCap = Math.min(ws.nodeCapacity, nodeBudget);
                if (view3d.nodeCount !== meta.lastNodeCount || meta.renderCount !== Math.min(view3d.nodeCount, targetCap)) {
                    meta.lastNodeCount = view3d.nodeCount;
                    meta.renderCount = selectStratifiedRenderIndices(view3d, targetCap, ws);
                    ws.relaxInitialized = false;
                    meta.lastEdgeTick = -999;
                }
                const rc = meta.renderCount;
                const needEdges = !ws.relaxInitialized
                    || Math.abs(liveTick - meta.lastEdgeTick) >= 8
                    || (coreState.bridgeActive && meta.edgeStats.bridgeEdges === 0 && coreState.interSectorRatio > 0.05)
                    || meta.lastMode !== resolvedMode;
                if (needEdges && rc > 0) {
                    meta.edgeStats = buildRealSynapticEdgeSelection(
                        layerInst.nodes,
                        view3d,
                        ws,
                        rc,
                        ws.edgeCapacity,
                        coreState,
                        { viewMode: NODAL_3D_VIEW_MODES.COUPLED }
                    );
                    meta.lastEdgeTick = liveTick;
                    meta.lastMode = resolvedMode;
                    meta.lastLayoutMs = -999;
                }
                if (!ws.relaxInitialized || (frameNowMs - meta.lastLayoutMs) >= 95) {
                    meta.lastLayoutMs = frameNowMs;
                    computeCoupledNodeTargets(view3d, ws, rc, coreState, {
                        viewMode: NODAL_3D_VIEW_MODES.COUPLED,
                        nodes: layerInst.nodes,
                        activeEdgeCount: meta.edgeStats.totalEdges
                    });
                }

                // Spawn & step real traveling signal bursts along real synapses
                spawnSignalPacketsFromView(sigPool, view3d, ws, rc, coreState, NODAL_3D_VIEW_MODES.COUPLED);
                const sigPulseBuf = view3d.buffers.signalPulse;
                if (sigPool.activeCount < 24 && meta.edgeStats.totalEdges > 0 && sigPulseBuf) {
                    const edgeTotal = meta.edgeStats.totalEdges;
                    const stride = Math.max(1, Math.floor(edgeTotal / 28));
                    const phaseOffset = Math.abs(liveTick) % stride;
                    let added = 0;
                    for (let eIdx = phaseOffset; eIdx < edgeTotal && added < 12; eIdx += stride) {
                        const rU = ws.edgeSourceRenderIdx[eIdx];
                        const rV = ws.edgeTargetRenderIdx[eIdx];
                        const mU = ws.renderToModelIndex[rU];
                        const pulseU = sigPulseBuf[mU] || 0;
                        if (pulseU < 0.32) continue;
                        const isInterEdge = ws.edgeIsBridge[eIdx] > 0 ? 1 : 0;
                        if (isInterEdge && !coreState.bridgeActive) continue;
                        const slot = sigPool.cursor % sigPool.capacity;
                        sigPool.cursor = (sigPool.cursor + 1) % sigPool.capacity;
                        sigPool.alive[slot] = 1;
                        sigPool.fromRender[slot] = rU;
                        sigPool.toRender[slot] = rV;
                        sigPool.progress[slot] = 0.02 + ((eIdx % 5) * 0.04);
                        sigPool.speed[slot] = 0.85 + (Math.min(1, pulseU * 0.5) * 0.75);
                        sigPool.strength[slot] = clamp(pulseU * 0.65, 0.35, 1.0);
                        sigPool.isInter[slot] = isInterEdge;
                        added += 1;
                    }
                }
                stepSignalPackets(sigPool, ws.targetPositions, rc, frameDtSec, false);
                liveSignalBursts = [];
                for (let sIdx = 0; sIdx < sigPool.capacity; sIdx += 1) {
                    if (!sigPool.alive[sIdx]) continue;
                    const mU = ws.renderToModelIndex[sigPool.fromRender[sIdx]];
                    const mV = ws.renderToModelIndex[sigPool.toRender[sIdx]];
                    const nU = layerInst.nodes[mU];
                    const nV = layerInst.nodes[mV];
                    if (!nU || !nV) continue;
                    liveSignalBursts.push({
                        fromId: nU.id,
                        toId: nV.id,
                        t: sigPool.progress[sIdx],
                        strength: sigPool.strength[sIdx],
                        isInter: sigPool.isInter[sIdx] > 0
                    });
                }

                // Build clean 2.5D projected node descriptors centered on (center.x, center.y) for pinhole projection
                const scaleWorld = clamp(Math.min(canvas.width, canvas.height) * 0.036, 14, 34);
                const organicNodes = new Array(rc);
                for (let r = 0; r < rc; r += 1) {
                    const mIdx = ws.renderToModelIndex[r];
                    const srcNode = layerInst.nodes[mIdx];
                    const p3 = r * 3;
                    organicNodes[r] = {
                        id: srcNode?.id ?? mIdx,
                        x: center.x + (ws.targetPositions[p3] * scaleWorld),
                        y: center.y + (ws.targetPositions[p3 + 1] * scaleWorld),
                        z: ws.targetPositions[p3 + 2] * scaleWorld,
                        coherenceState: view3d.buffers.coherence[mIdx],
                        intensity: view3d.buffers.intensity[mIdx],
                        phase: view3d.buffers.phase[mIdx],
                        sectorId: view3d.buffers.sectorId[mIdx],
                        signalPulse: sigPulseBuf ? sigPulseBuf[mIdx] : 0,
                        degree: ws.nodeDegree[r] || (srcNode?.connections?.length || 0),
                        connections: srcNode?.connections || []
                    };
                }
                nodesCacheRef.current = { ts: frameNowMs, nodes: organicNodes };

                if ((frameNowMs - meta.lastSignalMs) >= 450) {
                    meta.lastSignalMs = frameNowMs;
                    setBridgeHudState({
                        mode: resolvedMode,
                        effectiveEta: resolvedEta,
                        decisionTone: coreState.decisionTone,
                        activeSignals: liveSignalBursts.length
                    });
                }
            } else if ((frameNowMs - nodesCacheRef.current.ts) >= cacheTtlMs || nodesCacheRef.current.nodes.length === 0) {
                let refreshedNodes = nodalLayer.current?.getHighlyCoherentNodes?.(nodeBudget) || [];
                if (refreshedNodes.length === 0) {
                    refreshedNodes = (nodalLayer.current?.getActiveNodes?.() || []).slice(0, nodeBudget);
                }
                nodesCacheRef.current = {
                    ts: frameNowMs,
                    nodes: refreshedNodes
                };
            }
            let focusedNodes = nodesCacheRef.current.nodes;
            if (focusedNodes.length === 0) {
                focusedNodes = (nodalLayer.current?.getActiveNodes?.() || []).slice(0, nodeBudget);
                if (focusedNodes.length === 0) {
                    emptyNodeFramesRef.current += 1;
                    if (emptyNodeFramesRef.current > 18) {
                        nodalLayer.current?.activateRandomNodes?.(Math.max(150, nodeBudget));
                        focusedNodes = (nodalLayer.current?.getActiveNodes?.() || []).slice(0, nodeBudget);
                        emptyNodeFramesRef.current = 0;
                    }
                } else {
                    emptyNodeFramesRef.current = 0;
                }
                if (focusedNodes.length === 0) {
                    const passiveNodes = nodalLayer.current?.nodes?.slice(0, nodeBudget) || [];
                    if (passiveNodes.length > 0) {
                        focusedNodes = passiveNodes;
                    }
                }
            } else {
                emptyNodeFramesRef.current = 0;
            }

            const validNodes = focusedNodes.filter((node) =>
                node
                && Number.isFinite(Number(node.x))
                && Number.isFinite(Number(node.y))
                && Number.isFinite(Number(node.z))
                && Number.isFinite(Number(node.coherenceState))
            );

            if (validNodes.length !== focusedNodes.length) {
                setRenderStateSafe(
                    'data_fault',
                    `Se descartaron ${focusedNodes.length - validNodes.length} nodos invalidos.`,
                    'invalid_node_payload',
                    'node_fields_non_finite'
                );
            }
            focusedNodes = validNodes;

            if (focusedNodes.length > 0) {
                lastRenderableNodesRef.current = focusedNodes;
            } else if (lastRenderableNodesRef.current.length > 0) {
                focusedNodes = lastRenderableNodesRef.current;
                setRenderStateSafe('recovering', 'Usando ultimo estado nodal valido mientras se restablece actividad.');
            } else {
                const syntheticNodes = buildSyntheticRecoveryNodes(36);
                focusedNodes = syntheticNodes;
                lastRenderableNodesRef.current = syntheticNodes;
                nodesCacheRef.current = { ts: frameNowMs, nodes: syntheticNodes };
                setRenderStateSafe(
                    'recovering',
                    'Recuperacion visual activa con malla sintetica temporal.',
                    'synthetic_mesh_recovery',
                    'no_valid_nodes_available'
                );
            }

            if (!usingWorker && focusedNodes.length === 0) {
                setRenderStateSafe('no_visible_nodes', 'Sin nodos activos. Esperando reactivacion o inicio.');
                paintRecoveryCanvas(ctx, canvas, 'Red nodal sin actividad visible', 'El motor sigue vivo, pero no hay nodos listos para proyectar.');
                if (onTelemetry) {
                    const traceHash = traceRecorder?.finalizeTraceHash?.() || null;
                    const traceOpCount = traceRecorder?.getOpCount?.() || 0;
                    onTelemetry({
                        minDepth: 0,
                        maxDepth: 0,
                        clampHits: 0,
                        nodeCount: 0,
                        visibleCount: 0,
                        rotationX: rotationRef.current.x,
                        rotationY: rotationRef.current.y,
                        frameTs: now,
                        renderState: 'no_visible_nodes',
                        render_error_code: lastRenderErrorRef.current.code || 'none',
                        render_error_message: lastRenderErrorRef.current.message || '',
                        worker_restart_count: workerRestartCountRef.current,
                        visible_on_screen_count: 0,
                        projected_nodes_count: 0,
                        drawn_edges_count: 0,
                        render_trace_hash: traceHash,
                        render_trace_op_count: traceOpCount
                    });
                }
                return;
            }

            // 2. ACTUALIZACIÓN DE ESTADO (Auto-rotación)
            let currentRotX = rotationRef.current.x;
            let currentRotY = rotationRef.current.y;
            if (!isDragging.current && isRunning) {
                currentRotY += 0.002; // Rotación constante lenta
            }

            // 3. PROYECCIÓN Y Z-SORTING (determinista y acotado)
            if (!isDragging.current && isRunning && deterministic) {
                const base = autoRotBaseRef.current;
                currentRotY = base.rotY0 + (liveTick - base.tick0) * 0.002;
            }
            rotationRef.current = { x: currentRotX, y: currentRotY };

            if (useWorkerRender && workerRef.current && workerReadyRef.current) {
                const renderNodes = [];
                const focusIdSet = new Set();
                for (let i = 0; i < focusedNodes.length; i++) {
                    const node = focusedNodes[i];
                    if (!node) continue;
                    renderNodes.push({
                        id: node.id,
                        x: node.x,
                        y: node.y,
                        z: node.z,
                        coherenceState: node.coherenceState,
                        intensity: node.intensity,
                        phase: node.phase,
                        sectorId: resolveSectorId(node),
                        signalPulse: Number(node.signalPulse || 0),
                        degree: Number.isFinite(Number(node.degree))
                            ? Number(node.degree)
                            : (Array.isArray(node.connections) ? node.connections.length : 0)
                    });
                    focusIdSet.add(node.id);
                }

                const edges = [];
                for (let i = 0; i < focusedNodes.length; i++) {
                    const node = focusedNodes[i];
                    if (!node || !node.connections) continue;
                    for (let j = 0; j < node.connections.length; j++) {
                        const conn = node.connections[j];
                        if (focusIdSet.has(conn.targetId)) {
                            edges.push({ fromId: node.id, toId: conn.targetId, weight: conn.weight });
                        }
                    }
                }

                workerRef.current.postMessage({
                    type: 'frame',
                    nodes: renderNodes,
                    edges,
                    rotation: { x: currentRotX, y: currentRotY },
                    camera: cameraRef.current,
                    interaction: {
                        pointer: interactionRef.current.pointer,
                        selectedId: interactionRef.current.selectedId
                    },
                    bridgeState: organicBridgeState,
                    signalBursts: liveSignalBursts,
                    deterministic,
                    seed,
                    tick: liveTick
                });
                renderCountRef.current++;
                return;
            }

            const sinX = Math.sin(currentRotX);
            const cosX = Math.cos(currentRotX);
            const sinY = Math.sin(currentRotY);
            const cosY = Math.cos(currentRotY);

            let minDepth = Infinity;
            let maxDepth = -Infinity;
            let clampHits = 0;
            let visibleCount = 0;

            const projectedNodes = new Array(focusedNodes.length);
            const camera = cameraRef.current;
            const zoom = clamp(Number(camera.zoom) || 1, 0.35, 3.5);
            const panX = Number(camera.panX) || 0;
            const panY = Number(camera.panY) || 0;
            const smoothCache = projectionSmoothingRef.current;
            for (let i = 0; i < focusedNodes.length; i++) {
                const node = focusedNodes[i];
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
                    const prev = smoothCache.get(node.id);
                    if (prev) {
                        const lerp = clamp(0.22 + transformedScale * 0.18, 0.24, 0.46);
                        smoothedX = prev.x + ((transformedX - prev.x) * lerp);
                        smoothedY = prev.y + ((transformedY - prev.y) * lerp);
                        smoothedScale = prev.s + ((transformedScale - prev.s) * lerp);
                    }
                    smoothCache.set(node.id, { x: smoothedX, y: smoothedY, s: smoothedScale });
                }
                if (smoothedScale >= 0.1) visibleCount++;
                projectedNodes[i] = {
                    node,
                    __index: i,
                    ...proj,
                    x2d: smoothedX,
                    y2d: smoothedY,
                    scale: smoothedScale
                };
            }

            if (deterministic && smoothCache.size > 0) {
                smoothCache.clear();
            } else if (!deterministic && (renderCountRef.current % 24 === 0) && smoothCache.size > 0) {
                const activeIds = new Set();
                for (let i = 0; i < focusedNodes.length; i++) {
                    activeIds.add(focusedNodes[i]?.id);
                }
                for (const id of smoothCache.keys()) {
                    if (!activeIds.has(id)) smoothCache.delete(id);
                }
            }

            let visibleOnscreen = 0;
            for (let i = 0; i < projectedNodes.length; i++) {
                const p = projectedNodes[i];
                if (
                    p.scale >= 0.1 &&
                    p.x2d >= -24 && p.x2d <= canvas.width + 24 &&
                    p.y2d >= -24 && p.y2d <= canvas.height + 24
                ) {
                    visibleOnscreen++;
                }
            }
            if (projectedNodes.length > 0 && visibleOnscreen === 0) {
                offscreenFramesRef.current += 1;
                if (offscreenFramesRef.current > 10) {
                    cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
                    offscreenFramesRef.current = 0;
                    setRenderStateSafe('recovering', 'Nodos fuera de campo. Recentrando camara.');
                }
            } else {
                offscreenFramesRef.current = 0;
            }
            if (projectedNodes.length === 0) {
                setRenderStateSafe('no_visible_nodes', 'Sin nodos proyectables en este ciclo.');
            } else if (visibleOnscreen === 0) {
                setRenderStateSafe('recovering', 'Nodos detectados, pero fuera del viewport.');
            } else {
                setRenderStateSafe('active', `Nodos visibles: ${visibleOnscreen}`);
            }

            // Z-Sorting: Pintar de atrás (más profundo) hacia adelante (más cerca)
            projectedNodes.sort((a, b) => {
                return compareDepthDesc(a.depth, b.depth, (a.node.id || 0), (b.node.id || 0), a.__index, b.__index);
            });

            const projectedById = new Map();
            projectedNodes.forEach(pn => {
                projectedById.set(pn.node.id, pn);
            });

            const hoveredProjection = findNearestProjectedNode(projectedNodes, interactionRef.current.pointer);
            const hoverSummary = hoveredProjection ? buildNodeSummary(hoveredProjection.node) : null;
            updateHoverSummary(hoverSummary);
            const selectedProjection = interactionRef.current.selectedId !== null
                ? projectedById.get(interactionRef.current.selectedId)
                : null;
            const selectedSummary = selectedProjection ? buildNodeSummary(selectedProjection.node) : null;
            if (interactionRef.current.selectedId !== null) {
                setSelectedNode((prev) => (sameNodeSummary(prev, selectedSummary) ? prev : selectedSummary));
            }
            const focusId = interactionRef.current.selectedId ?? interactionRef.current.hoveredId;
            const neighborhoodIds = buildNeighborhoodSet(focusId, focusedNodes);
            const hasFocus = neighborhoodIds.size > 0;

            // 4. DIBUJO — Fondo atmosférico ULTRATHINK
            // === FONDO: Gradiente profundo multi-stop diagonal ===
            const bgLinear = ctx.createLinearGradient(0, 0, canvas.width * 0.3, canvas.height);
            bgLinear.addColorStop(0, '#020918');
            bgLinear.addColorStop(0.4, '#030b1a');
            bgLinear.addColorStop(0.8, '#040608');
            bgLinear.addColorStop(1, '#010204');
            ctx.fillStyle = bgLinear;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // === NEBULOSA TRIPLE: cyan + violeta + índigo ===
            const nebCx = center.x + panX * 0.35;
            const nebCy = center.y + panY * 0.35;
            const maxNebR = Math.max(canvas.width, canvas.height) * 0.72;
            const visualPerf = clamp((frameStatsRef.current.fps || 60) / 60, 0.35, 1);
            const richBg = visualPerf > 0.48;
            const cosmicT = now * 0.00012;

            // Nebulosa 1 — cyan (centro)
            const glow1 = ctx.createRadialGradient(nebCx, nebCy, 0, nebCx, nebCy, maxNebR * 0.62);
            glow1.addColorStop(0, 'rgba(6,182,212,0.15)');
            glow1.addColorStop(0.38, 'rgba(6,182,212,0.07)');
            glow1.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow1;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Nebulosa 2 — violeta (desplazada)
            const nebVx = nebCx + canvas.width * 0.22;
            const nebVy = nebCy - canvas.height * 0.14;
            const glow2 = ctx.createRadialGradient(nebVx, nebVy, 0, nebVx, nebVy, maxNebR * 0.48);
            glow2.addColorStop(0, 'rgba(168,85,247,0.13)');
            glow2.addColorStop(0.45, 'rgba(168,85,247,0.05)');
            glow2.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = glow2;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Nebulosa 3 — índigo (esquina inferior)
            const nebIx = nebCx - canvas.width * 0.18;
            const nebIy = nebCy + canvas.height * 0.22;
            const glow3 = ctx.createRadialGradient(nebIx, nebIy, 0, nebIx, nebIy, maxNebR * 0.36);
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
                    nebCx - canvas.width * 0.2 + driftX,
                    nebCy - canvas.height * 0.05 + driftY,
                    0,
                    nebCx - canvas.width * 0.2 + driftX,
                    nebCy - canvas.height * 0.05 + driftY,
                    maxNebR * 0.52
                );
                auraA.addColorStop(0, `rgba(34,211,238,${(0.07 + nebPulseA * 0.05).toFixed(3)})`);
                auraA.addColorStop(0.52, `rgba(14,116,144,${(0.03 + nebPulseA * 0.02).toFixed(3)})`);
                auraA.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = auraA;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                const auraB = ctx.createRadialGradient(
                    nebCx + canvas.width * 0.27 - driftX * 0.6,
                    nebCy + canvas.height * 0.16 - driftY * 0.5,
                    0,
                    nebCx + canvas.width * 0.27 - driftX * 0.6,
                    nebCy + canvas.height * 0.16 - driftY * 0.5,
                    maxNebR * 0.44
                );
                auraB.addColorStop(0, `rgba(217,70,239,${(0.06 + nebPulseB * 0.04).toFixed(3)})`);
                auraB.addColorStop(0.55, `rgba(79,70,229,${(0.02 + nebPulseB * 0.02).toFixed(3)})`);
                auraB.addColorStop(1, 'rgba(0,0,0,0)');
                ctx.fillStyle = auraB;
                ctx.fillRect(0, 0, canvas.width, canvas.height);
            }

            // === GRID DE REFERENCIA SUTIL (profundidad científica) ===
            const gridStep = Math.max(40, Math.round(canvas.width / 14));
            ctx.strokeStyle = 'rgba(6,182,212,0.04)';
            ctx.lineWidth = 0.5;
            for (let gx = 0; gx < canvas.width; gx += gridStep) {
                ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, canvas.height); ctx.stroke();
            }
            for (let gy = 0; gy < canvas.height; gy += gridStep) {
                ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(canvas.width, gy); ctx.stroke();
            }

            // === ESTRELLAS con 3 tiers de brillo ===
            for (let i = 0; i < 60; i++) {
                const sx = ((i * 137.508) % 1) * canvas.width;
                const sy = ((i * 73.331) % 1) * canvas.height;
                const tier = i % 6;
                const sr = tier === 0 ? 1.6 : tier === 1 ? 1.2 : 0.7;
                const salpha = tier === 0 ? 0.35 : tier === 1 ? 0.22 : 0.14;
                ctx.fillStyle = `rgba(255,255,255,${salpha})`;
                ctx.beginPath();
                ctx.arc(sx, sy, sr, 0, Math.PI * 2);
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

            drawCinematicDepthBackground(ctx, canvas, center, cameraRef.current, now, visualPerf);

            ctx.globalCompositeOperation = 'source-over';

            // 4.1. Dibujar Conexiones (Entrelazamiento) - ordenadas por profundidad media
            const edges = [];
            const performanceFactor = clamp((stats.fps || 60) / 60, 0.35, 1);
            const highFx = performanceFactor > 0.5;
            const nowMs = (typeof performance !== 'undefined' && typeof performance.now === 'function')
                ? performance.now()
                : Date.now();
            const pulseT = nowMs * 0.001;
            const maxEdges = Math.max(140, Math.floor(focusedNodes.length * (4 + (3 * performanceFactor))));
            let edgeIndex = 0;
            projectedNodes.forEach(pNode => {
                const { node, x2d, y2d, scale } = pNode;
                if (scale < 0.1 || !node.connections) return;

                node.connections.forEach(conn => {
                    if (edges.length >= maxEdges) return;
                    const targetProj = projectedById.get(conn.targetId);
                    if (!targetProj || targetProj.scale < 0.1) return;

                    const opacity = Math.min(1, (conn.weight * 0.5 + node.coherenceState * 0.5) * scale);
                    if (opacity < 0.05) return;

                    edges.push({
                        __index: edgeIndex++,
                        from: pNode,
                        to: targetProj,
                        weight: conn.weight,
                        opacity,
                        depth: (pNode.depth + targetProj.depth) * 0.5
                    });
                });
            });

            edges.sort((a, b) => {
                const dz = b.depth - a.depth;
                if (dz !== 0) return dz;
                if (a.from.node.id !== b.from.node.id) return a.from.node.id - b.from.node.id;
                if (a.to.node.id !== b.to.node.id) return a.to.node.id - b.to.node.id;
                return a.__index - b.__index;
            });

            const bridgeActive2d = organicBridgeState ? Boolean(organicBridgeState.active) : true;
            const bridgeLesioned2d = Boolean(organicBridgeState && (organicBridgeState.tdCutActive || organicBridgeState.reducibleActive));

            edges.forEach(edge => {
                const { from, to, weight, opacity } = edge;
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
                const bridgeGate = isBridgeEdge ? (bridgeActive2d ? 1.05 : 0.28) : 0.88;
                const alpha = clamp(opacity * depthAlpha * performanceFactor * focusAlpha * weightGain * bridgeGate * 0.56, 0.03, isEntangled || edgeInFocus ? 0.82 : 0.46);
                const avgHue = (fromHue + toHue) * 0.5;
                const grad = highFx ? ctx.createLinearGradient(from.x2d, from.y2d, to.x2d, to.y2d) : null;

                if (isBridgeEdge && bridgeLesioned2d) {
                    ctx.strokeStyle = `hsla(348 82% 54% / ${(alpha * 0.85).toFixed(3)})`;
                    ctx.shadowBlur = 0;
                    ctx.lineWidth = (0.55 + weight * 0.85) * clamp(from.scale, 0.45, 1.25) * (edgeInFocus ? 1.35 : edgeDim ? 0.65 : 1);
                } else if (isEntangled || (isBridgeEdge && bridgeActive2d && weight > 0.62)) {
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
            });

            // Central Constructive Core Diamond & orbital hairline matching 3D view
            const coreProj2d = projectWithTrig(center.x, center.y, 0, sinX, cosX, sinY, cosY, perspective, center, projectionLimits);
            if (coreProj2d && coreProj2d.scale >= 0.1) {
                const zoom2d = clamp(Number(cameraRef.current.zoom) || 1, 0.35, 3.5);
                const cx = ((coreProj2d.x2d - center.x) * zoom2d) + center.x + (Number(cameraRef.current.panX) || 0);
                const cy = ((coreProj2d.y2d - center.y) * zoom2d) + center.y + (Number(cameraRef.current.panY) || 0);
                const cs = coreProj2d.scale * clamp(zoom2d, 0.6, 1.8);
                const dTone = organicBridgeState?.decisionTone || 'affirmative';
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
                projectedNodes.forEach(pn => {
                    if (pn.scale >= 0.2) {
                        sumX += pn.x2d * pn.scale;
                        sumY += pn.y2d * pn.scale;
                        totalW += pn.scale;
                    }
                });
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

            // 4.2. Nodos Conscientes — Gradiente radial multi-stop (ULTRATHINK UPGRADE)
            const maxHaloNodes = Math.max(28, Math.floor(130 * performanceFactor));
            let haloCount = 0;
            projectedNodes.forEach(pNode => {
                const { node, x2d, y2d, scale } = pNode;
                if (scale < 0.1) return;
                const nodeInFocus = hasFocus && neighborhoodIds.has(node.id);
                const nodeDim = hasFocus && !nodeInFocus;
                const nodeSelected = interactionRef.current.selectedId === node.id;
                const nodeHovered = interactionRef.current.hoveredId === node.id;

                const coh = clamp(Number(node.coherenceState) || 0, 0, 1);
                const inten = clamp(Number(node.intensity) || 0, 0, 1);
                const sigPulse = clamp((Number(node.signalPulse) || 0) * 0.35, 0, 1);
                const deg = Number(node.degree || (Array.isArray(node.connections) ? node.connections.length : 4));
                const hubBoost = Math.min(2.0, Math.max(0, deg - 4) * 0.35);
                const baseRadius = 2.0 + (inten * 2.6) + hubBoost + (sigPulse * 2.0);
                const focusScale = nodeSelected ? 1.55 : nodeHovered ? 1.35 : nodeInFocus ? 1.15 : 1;
                const radius = baseRadius * scale * focusScale;
                const secId = resolveSectorId(node);
                const hueVar = SECTOR_HUES[secId];
                const coreLight = Math.min(84, 52 + (coh * 18) + (sigPulse * 18));
                const coreColor = `hsl(${hueVar.toFixed(1)} 92% ${coreLight.toFixed(1)}%)`;
                const dimFactor = nodeDim ? 0.34 : 1;
                const opacity = clamp(Math.min(1, coh * 1.5 + 0.2) * scale * dimFactor, nodeDim ? 0.05 : 0.12, nodeSelected || nodeHovered ? 1 : 0.97);
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

                // === HALO: siempre visible, blend 'screen' (suave, sin strobe) ===
                // SE ELIMINÓ: highFx && — causaba halos ON/OFF al borde de 30fps
                const canDrawHalo = haloCount < maxHaloNodes && coh > 0.40 && !nodeDim;
                if (canDrawHalo) {
                    const haloR = radius * (nodeSelected ? 4.6 : nodeHovered ? 4.2 : coh > 0.85 ? 3.8 : coh > 0.65 ? 3.0 : 2.2);
                    const haloAlpha = clamp(
                        (0.05 + coh * 0.20) * performanceFactor,
                        0.03, nodeSelected || nodeHovered ? 0.38 : 0.28
                    ) * clamp(scale, 0.4, 1.1);
                    ctx.save();
                    ctx.globalCompositeOperation = 'screen'; // SIN STROBE vs 'lighter'
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

                // === CUERPO: gradiente radial multi-stop ===
                // Punto brillante (highlight de esfera) → color coherente → borde difuminado
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

                // === SPECULAR HIGHLIGHT (simulación esfera 3D) ===
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
                const borderAlpha = clamp(opacity * 0.85, 0.18, 0.92);
                ctx.strokeStyle = `hsla(${hueVar} 100% 80% / ${borderAlpha.toFixed(3)})`;
                ctx.lineWidth = clamp(1.2 + coh * 1.2, 0.8, 2.4) * scale * (nodeSelected ? 1.7 : nodeHovered ? 1.45 : 1);
                ctx.shadowBlur = nodeSelected || nodeHovered ? 12 * scale : coh > 0.75 ? 7 * scale : 0;
                ctx.shadowColor = coreColor;
                ctx.stroke();
                ctx.shadowBlur = 0;

                // === VECTOR DE FASE (indicador cuántico) ===
                const phase = node.phase || 0;
                const phaseLen = radius * (1.4 + coh * 0.6);
                const phaseX = x2d + Math.cos(phase) * phaseLen;
                const phaseY = y2d + Math.sin(phase) * phaseLen;
                ctx.beginPath();
                ctx.moveTo(x2d, y2d);
                ctx.lineTo(phaseX, phaseY);
                ctx.strokeStyle = `hsla(${hueVar} 98% 74% / ${(opacity * 0.45).toFixed(3)})`;
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
            });

            if (performanceFactor > 0.45) {
                const topNodes = [...projectedNodes]
                    .filter(pn => pn.scale >= 0.3 && (pn.node.coherenceState || 0) > 0.7)
                    .sort((a, b) => (b.node.coherenceState || 0) - (a.node.coherenceState || 0))
                    .slice(0, 3);
                topNodes.forEach(pn => {
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
                });
            }

            // 4.3. Señales reales viajando por sinapsis (o partículas deterministas en modo determinista)
            if (Array.isArray(liveSignalBursts) && liveSignalBursts.length > 0 && !deterministic) {
                ctx.save();
                ctx.globalCompositeOperation = 'screen';
                for (let sIdx = 0; sIdx < liveSignalBursts.length; sIdx += 1) {
                    const sb = liveSignalBursts[sIdx];
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
                const allowParticles = (stats.fps || 60) >= 26;
                if (allowParticles && focusedNodes.length > 0) {
                    const nodesKey = deterministic ? computeNodesKeyUnordered(focusedNodes) : computeNodesKeyOrdered(focusedNodes);
                    if (particlesRef.current.length === 0 || (deterministic && particlesKeyRef.current !== nodesKey)) {
                        particlesRef.current = createParticles(focusedNodes, seed);
                        particlesKeyRef.current = nodesKey;
                    }
                } else if (!allowParticles && particlesRef.current.length > 0) {
                    particlesRef.current = [];
                }

                ctx.globalCompositeOperation = 'source-over';
                particlesRef.current.forEach(p => {
                    const pNode = projectedById.get(p.nodeId);
                    if (!pNode || pNode.scale < 0.1) return;

                    const angle = deterministic ? computeOrbitalAngle(p.baseAngle, p.speed, liveTick) : (p.angle += p.speed);
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
                });
            }

            ctx.globalCompositeOperation = 'source-over';

            setDrawStats((prevStats) => ({
                ...prevStats,
                visibleNodes: visibleCount,
                edgeCount: edges.length,
                projectedNodes: projectedNodes.length,
                visibleOnScreen: visibleOnscreen,
                workerRestarts: workerRestartCountRef.current,
                recoveryAttempts: recoveryAttemptCountRef.current
            }));

            if (onTelemetry) {
                const traceHash = traceRecorder?.finalizeTraceHash?.() || null;
                const traceOpCount = traceRecorder?.getOpCount?.() || 0;
                onTelemetry({
                    minDepth: Number.isFinite(minDepth) ? minDepth : 0,
                    maxDepth: Number.isFinite(maxDepth) ? maxDepth : 0,
                    clampHits,
                    nodeCount: projectedNodes.length,
                    visibleCount,
                    rotationX: currentRotX,
                    rotationY: currentRotY,
                    frameTs: now,
                    renderState: visibleOnscreen > 0 ? 'active' : (projectedNodes.length > 0 ? 'recovering' : 'no_visible_nodes'),
                    render_error_code: lastRenderErrorRef.current.code || 'none',
                    render_error_message: lastRenderErrorRef.current.message || '',
                    worker_restart_count: workerRestartCountRef.current,
                    recovery_attempt_count: recoveryAttemptCountRef.current,
                    visible_on_screen_count: visibleOnscreen,
                    projected_nodes_count: projectedNodes.length,
                    drawn_edges_count: edges.length,
                    hover_node_id: hoverSummary?.id ?? null,
                    selected_node_id: selectedSummary?.id ?? null,
                    focus_neighborhood_size: neighborhoodIds.size,
                    render_trace_hash: traceHash,
                    render_trace_op_count: traceOpCount
                });
            }

            renderCountRef.current++;
        } catch (error) {
            console.error('[QICN][3D] draw fallback after error:', error);
            const errorMessage = String(error?.message || 'unknown_render_error');
            const projectionFault = /projection|pinhole|depth|clamp|denom|NaN|Infinity/i.test(errorMessage);
            if (transferredToWorkerRef.current) {
                queueCanvasRecovery(errorMessage);
                return;
            }
            const fallbackCtx = canvas.getContext('2d', { alpha: false });
            if (fallbackCtx) {
                paintRecoveryCanvas(
                    fallbackCtx,
                    canvas,
                    'Render en recuperacion',
                    `Error: ${errorMessage.slice(0, 120)}`
                );
            } else {
                queueCanvasRecovery('fallback_context_unavailable');
                return;
            }
            setRenderStateSafe(
                projectionFault ? 'projection_fault' : 'fallback_2d',
                `Error de render detectado (${errorMessage.slice(0, 80)}). Ejecutando recuperacion defensiva.`,
                projectionFault ? 'projection_fault' : 'render_fault',
                errorMessage
            );
            cameraRef.current = { zoom: 1, panX: 0, panY: 0 };
            nodesCacheRef.current = { ts: 0, nodes: [] };
        }
    }, [nodalLayer, isRunning, createParticles, deterministic, seed, onTelemetry, perspective, center, projectionLimits, useWorkerRender, setRenderStateSafe, paintRecoveryCanvas, queueCanvasRecovery, updateHoverSummary]);

    const handleReactivateNetwork = useCallback(() => {
        const count = viewportMode === 'mobile' ? 180 : viewportMode === 'tablet' ? 260 : 340;
        nodalLayer.current?.activateRandomNodes?.(count);
        const activatedNodes = (nodalLayer.current?.getActiveNodes?.() || []).slice(0, count);
        const recoveryNodes = activatedNodes.length > 0 ? activatedNodes : buildSyntheticRecoveryNodes(48);
        lastRenderableNodesRef.current = recoveryNodes;
        nodesCacheRef.current = { ts: 0, nodes: recoveryNodes };
        emptyNodeFramesRef.current = 0;
        offscreenFramesRef.current = 0;
        cameraRef.current = clampCamera({ zoom: 1, panX: 0, panY: 0 }, canvasRef.current);
        setRenderStateSafe(
            'recovering',
            activatedNodes.length > 0
                ? `Reactivacion solicitada (${activatedNodes.length} nodos).`
                : 'Reactivacion sin nodos activos del core. Usando malla sintetica temporal.',
            activatedNodes.length > 0 ? 'manual_reactivation' : 'synthetic_mesh_reactivation',
            ''
        );
        draw();
    }, [nodalLayer, viewportMode, setRenderStateSafe, draw]);

    // HANDLERS DE INTERACCIÓN
    const handleMouseDown = (e) => {
        interactionRef.current.pointer = getCanvasPointFromEvent(e);
        dragMovedRef.current = false;
        if (e.button === 2 || e.button === 1 || e.shiftKey) {
            dragModeRef.current = 'pan';
        } else {
            dragModeRef.current = 'rotate';
        }
        isDragging.current = true;
        lastMousePos.current = { x: e.clientX, y: e.clientY };
    };

    const handleMouseMove = useCallback((e) => {
        interactionRef.current.pointer = getCanvasPointFromEvent(e);
        if (!isDragging.current) return;

        const dx = e.clientX - lastMousePos.current.x;
        const dy = e.clientY - lastMousePos.current.y;
        if (Math.abs(dx) + Math.abs(dy) > 4) {
            dragMovedRef.current = true;
        }

        if (dragModeRef.current === 'pan') {
            cameraRef.current = clampCamera({
                ...cameraRef.current,
                panX: cameraRef.current.panX + dx,
                panY: cameraRef.current.panY + dy
            }, canvasRef.current);
        } else {
            const nextRotation = {
                x: rotationRef.current.x + dy * 0.005,
                y: rotationRef.current.y + dx * 0.005
            };
            rotationRef.current = nextRotation;
        }

        lastMousePos.current = { x: e.clientX, y: e.clientY };

        if (!isRunning) draw(); // Redibujar inmediatamente al mover si está en pausa
    }, [isRunning, draw, getCanvasPointFromEvent]);

    const handleMouseUp = useCallback(() => {
        isDragging.current = false;
        dragModeRef.current = 'rotate';
        if (deterministic) {
            autoRotBaseRef.current = { tick0: tick, rotY0: rotationRef.current.y };
        }
    }, [deterministic, tick]);

    const handleCanvasClick = useCallback(() => {
        if (dragMovedRef.current) {
            dragMovedRef.current = false;
            return;
        }
        updateSelectedSummary(interactionRef.current.tooltip || null);
        if (!isRunning) draw();
    }, [draw, isRunning, updateSelectedSummary]);

    const handleMouseLeave = useCallback(() => {
        interactionRef.current.pointer = null;
        updateHoverSummary(null);
        handleMouseUp();
    }, [handleMouseUp, updateHoverSummary]);

    const handleDoubleClick = useCallback(() => {
        cameraRef.current = clampCamera({ zoom: 1, panX: 0, panY: 0 }, canvasRef.current);
        setRenderStateSafe('recovering', 'Camara recentrada manualmente.');
        draw();
    }, [draw, setRenderStateSafe]);

    const getTouchDistance = (touches) => {
        if (!touches || touches.length < 2) return 0;
        const dx = touches[0].clientX - touches[1].clientX;
        const dy = touches[0].clientY - touches[1].clientY;
        return Math.sqrt((dx * dx) + (dy * dy));
    };

    const getTouchMidpoint = (touches) => {
        if (!touches || touches.length < 2) return { x: 0, y: 0 };
        return {
            x: (touches[0].clientX + touches[1].clientX) * 0.5,
            y: (touches[0].clientY + touches[1].clientY) * 0.5
        };
    };

    const handleTouchStart = useCallback((e) => {
        if (!touchEnabled) return;
        if (e.touches.length === 1) {
            const now = Date.now();
            if (now - touchStateRef.current.lastTapTs < 280) {
                handleDoubleClick();
                touchStateRef.current.lastTapTs = 0;
                return;
            }
            touchStateRef.current.lastTapTs = now;
            isDragging.current = true;
            dragModeRef.current = 'rotate';
            lastMousePos.current = { x: e.touches[0].clientX, y: e.touches[0].clientY };
            interactionRef.current.pointer = getCanvasPointFromEvent(e.touches[0]);
            dragMovedRef.current = false;
        } else if (e.touches.length >= 2) {
            isDragging.current = true;
            dragModeRef.current = 'pan';
            touchStateRef.current.active = true;
            touchStateRef.current.startDistance = getTouchDistance(e.touches);
            touchStateRef.current.startZoom = cameraRef.current.zoom;
            touchStateRef.current.startPanX = cameraRef.current.panX;
            touchStateRef.current.startPanY = cameraRef.current.panY;
            const mid = getTouchMidpoint(e.touches);
            lastMousePos.current = { x: mid.x, y: mid.y };
            interactionRef.current.pointer = null;
            dragMovedRef.current = true;
        }
    }, [touchEnabled, handleDoubleClick, getCanvasPointFromEvent]);

    const handleTouchMove = useCallback((e) => {
        if (!touchEnabled) return;
        if (!isDragging.current) return;
        e.preventDefault();

        if (e.touches.length === 1 && !touchStateRef.current.active) {
            interactionRef.current.pointer = getCanvasPointFromEvent(e.touches[0]);
            handleMouseMove({ clientX: e.touches[0].clientX, clientY: e.touches[0].clientY });
            return;
        }

        if (e.touches.length >= 2) {
            const mid = getTouchMidpoint(e.touches);
            const dx = mid.x - lastMousePos.current.x;
            const dy = mid.y - lastMousePos.current.y;
            if (Math.abs(dx) + Math.abs(dy) > 4) {
                dragMovedRef.current = true;
            }
            cameraRef.current = clampCamera({
                ...cameraRef.current,
                panX: cameraRef.current.panX + dx,
                panY: cameraRef.current.panY + dy
            }, canvasRef.current);
            lastMousePos.current = { x: mid.x, y: mid.y };

            const distance = getTouchDistance(e.touches);
            const baseDistance = Math.max(1, touchStateRef.current.startDistance || distance);
            const zoomFactor = distance / baseDistance;
            cameraRef.current = clampCamera({
                ...cameraRef.current,
                zoom: clamp(touchStateRef.current.startZoom * zoomFactor, 0.35, 3.5)
            }, canvasRef.current);
            if (!isRunning) draw();
        }
    }, [touchEnabled, isRunning, draw, handleMouseMove, getCanvasPointFromEvent]);

    const handleTouchEnd = useCallback(() => {
        isDragging.current = false;
        dragModeRef.current = 'rotate';
        touchStateRef.current.active = false;
        if (deterministic) {
            autoRotBaseRef.current = { tick0: tick, rotY0: rotationRef.current.y };
        }
    }, [deterministic, tick]);

    // INVARIANTE L3 (INTERACTION): El estado de arrastre siempre se libera en mouseup y cuando la ventana pierde foco.
    useEffect(() => {
        const stopDragging = () => {
            isDragging.current = false;
        };
        window.addEventListener('mouseup', stopDragging);
        window.addEventListener('blur', stopDragging);
        return () => {
            window.removeEventListener('mouseup', stopDragging);
            window.removeEventListener('blur', stopDragging);
        };
    }, []);

    // ANIMATION ENGINE
    useEffect(() => {
        const animate = () => {
            draw();
            animationFrameRef.current = requestAnimationFrame(animate);
        };

        // Loop infinito para permitir rotación fluida incluso pausado
        animationFrameRef.current = requestAnimationFrame(animate);

        return () => {
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, [draw]);

    // Efecto de redibujo ante cambios en props y ticks deterministas
    useEffect(() => {
        draw();
    }, [draw, deterministic, tick]);

    const toggleExpand2d = useCallback((e) => {
        e?.stopPropagation?.();
        setIsExpanded((prev) => {
            const next = !prev;
            try {
                if (next && containerRef.current && typeof containerRef.current.requestFullscreen === 'function' && !document.fullscreenElement) {
                    containerRef.current.requestFullscreen().catch(() => {});
                } else if (!next && typeof document !== 'undefined' && document.fullscreenElement && typeof document.exitFullscreen === 'function') {
                    document.exitFullscreen().catch(() => {});
                }
            } catch {
                // Fallback smoothly to fixed full-viewport overlay
            }
            return next;
        });
    }, []);

    useEffect(() => {
        if (typeof document === 'undefined' || typeof window === 'undefined') return undefined;
        const onKeyDown = (ev) => {
            if (ev.key === 'Escape' && isExpanded) setIsExpanded(false);
        };
        const onFsChange = () => {
            if (!document.fullscreenElement && isExpanded) setIsExpanded(false);
        };
        window.addEventListener('keydown', onKeyDown);
        document.addEventListener('fullscreenchange', onFsChange);
        return () => {
            window.removeEventListener('keydown', onKeyDown);
            document.removeEventListener('fullscreenchange', onFsChange);
        };
    }, [isExpanded]);

    const verdict2dLabel = bridgeHudState.decisionTone === 'affirmative'
        ? 'PRESENCIA ESTRUCTURAL'
        : (bridgeHudState.decisionTone === 'negative' ? 'CORTE / DESACOPLE' : 'RESERVA ESTRUCTURAL');
    const verdict2dClass = bridgeHudState.decisionTone === 'affirmative'
        ? 'border-emerald-400/50 bg-emerald-950/75 text-emerald-200'
        : (bridgeHudState.decisionTone === 'negative'
            ? 'border-rose-400/60 bg-rose-950/80 text-rose-200'
            : 'border-amber-400/50 bg-amber-950/75 text-amber-200');

    return (
        <div
            ref={containerRef}
            data-expanded={isExpanded ? 'true' : 'false'}
            className={isExpanded
                ? 'fixed inset-0 z-[9999] h-dvh w-screen cursor-grab active:cursor-grabbing overflow-hidden bg-[#020510]'
                : 'relative h-full w-full cursor-grab active:cursor-grabbing overflow-hidden rounded-xl border border-cyan-500/25 shadow-2xl bg-[#030612]'}
            role="application"
            aria-label="Red nodal interactiva: arrastra para rotar, usa los botones para acercar y click para fijar un nodo."
            tabIndex={0}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseLeave}
            onClick={handleCanvasClick}
            onDoubleClick={handleDoubleClick}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onContextMenu={(e) => e.preventDefault()}
        >
            <canvas
                key={canvasEpoch}
                ref={canvasRef}
                width={canvasSize.width}
                height={canvasSize.height}
                className="h-full w-full block"
            />

            {(renderState === 'fallback_2d' || renderState === 'worker_fault' || renderState === 'projection_fault' || renderState === 'data_fault') && (
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none px-4">
                    <div className="pointer-events-auto max-w-md rounded-xl border border-cyan-500/40 bg-slate-950/85 backdrop-blur-sm p-4 text-center">
                        <div className="text-sm font-semibold text-cyan-200 mb-1">Render en recuperación</div>
                        <div className="text-xs text-slate-200 mb-3">{renderStateDetail || 'Se detectó una falla visual. El sistema mantiene el tick activo.'}</div>
                        <div className="text-[10px] font-mono text-amber-200 mb-3">
                            code: {lastRenderErrorRef.current.code || 'none'}
                        </div>
                        <div className="flex items-center justify-center gap-2">
                            <button
                                type="button"
                                className="text-[11px] font-mono text-emerald-200 px-2 py-1 rounded bg-emerald-900/30 hover:bg-emerald-800/40"
                                onClick={handleDoubleClick}
                            >
                                Recentrar cámara
                            </button>
                            <button
                                type="button"
                                className="text-[11px] font-mono text-cyan-200 px-2 py-1 rounded bg-cyan-900/30 hover:bg-cyan-800/40"
                                onClick={handleReactivateNetwork}
                            >
                                Reactivar red
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Minimalist Top Bar aligned with WebGL 3D */}
            <div
                className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-10 flex flex-wrap items-center justify-between gap-1.5"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="pointer-events-auto inline-flex items-center overflow-hidden rounded-lg border border-slate-600/50 bg-slate-950/75 text-[11px] font-mono text-slate-200 backdrop-blur-md">
                    <button
                        type="button"
                        className="px-2 py-1 hover:bg-slate-800"
                        onClick={() => {
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            cameraRef.current = clampCamera({
                                ...cameraRef.current,
                                zoom: cameraRef.current.zoom * 1.12
                            }, canvas);
                        }}
                    >
                        +
                    </button>
                    <button
                        type="button"
                        className="border-l border-slate-700/70 px-2 py-1 hover:bg-slate-800"
                        onClick={() => {
                            const canvas = canvasRef.current;
                            if (!canvas) return;
                            cameraRef.current = clampCamera({
                                ...cameraRef.current,
                                zoom: cameraRef.current.zoom * 0.89
                            }, canvas);
                        }}
                    >
                        −
                    </button>
                    <button
                        type="button"
                        className="border-l border-slate-700/70 px-2 py-1 text-emerald-200 hover:bg-slate-800"
                        onClick={handleDoubleClick}
                    >
                        Reset
                    </button>
                    <button
                        type="button"
                        className="border-l border-slate-700/70 px-2 py-1 text-amber-200 hover:bg-slate-800"
                        onClick={handleReactivateNetwork}
                    >
                        Reactivar
                    </button>
                </div>

                <div className="flex flex-wrap items-center gap-1.5">
                    {onCouplingModeChange && (
                        <div role="group" aria-label="Modo del puente en vivo 2D" className="pointer-events-auto inline-flex overflow-hidden rounded-lg border border-emerald-500/35 bg-slate-950/75 text-[10px] font-mono backdrop-blur-md">
                            {[
                                { id: 'bidirectional', label: 'η=1/8' },
                                { id: 'td_cut_eta_zero', label: 'η=0' },
                                { id: 'reducible_control', label: 'A=I' }
                            ].map((m) => (
                                <button
                                    key={m.id}
                                    type="button"
                                    data-testid={`2d-coupling-btn-${m.id}`}
                                    aria-pressed={bridgeHudState.mode === m.id}
                                    onClick={() => onCouplingModeChange(m.id)}
                                    className={`px-2 py-1 transition-colors ${bridgeHudState.mode === m.id ? 'bg-emerald-600/85 text-white' : 'text-slate-300 hover:bg-slate-800/80'}`}
                                >
                                    {m.label}
                                </button>
                            ))}
                        </div>
                    )}

                    <button
                        type="button"
                        data-testid="2d-expand-fullscreen-btn"
                        aria-pressed={isExpanded}
                        onClick={toggleExpand2d}
                        title={isExpanded ? 'Salir de pantalla completa (ESC)' : 'Expandir a pantalla completa'}
                        className="pointer-events-auto rounded-lg border border-cyan-400/50 bg-cyan-950/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-100 backdrop-blur-md transition-colors hover:bg-cyan-800/80"
                    >
                        {isExpanded ? '✕ Salir (ESC)' : '⛶ Expandir'}
                    </button>
                </div>
            </div>

            {(selectedNode || hoverNode) && (
                <div
                    className="absolute pointer-events-none max-w-[250px] rounded-xl border border-cyan-400/45 bg-slate-950/90 px-3 py-2 text-[10px] font-mono text-slate-100 shadow-2xl backdrop-blur-md z-20"
                    style={{
                        left: interactionRef.current.pointer?.cssX
                            ? `${Math.min(Math.max(12, interactionRef.current.pointer.cssX + 14), Math.max(12, (canvasSize.width / canvasSize.dpr) - 260))}px`
                            : '14px',
                        top: interactionRef.current.pointer?.cssY
                            ? `${Math.min(Math.max(48, interactionRef.current.pointer.cssY + 14), Math.max(48, (canvasSize.height / canvasSize.dpr) - 140))}px`
                            : '54px'
                    }}
                    data-testid="network-node-focus-tooltip"
                >
                    <div className="mb-1 flex items-center justify-between gap-2 text-cyan-200 border-b border-slate-800 pb-1">
                        <span>{selectedNode ? 'Nodo fijado' : 'Nodo enfocado'} #{selectedNode?.id ?? hoverNode?.id}</span>
                        {(selectedNode?.sectorLabel || hoverNode?.sectorLabel) && (
                            <span
                                className="rounded px-1.5 py-0.5 text-[9px] font-semibold text-slate-950"
                                style={{ backgroundColor: selectedNode?.sectorAccent || hoverNode?.sectorAccent || '#24ebb8' }}
                            >
                                {selectedNode?.sectorLabel ?? hoverNode?.sectorLabel}
                            </span>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-x-3 gap-y-0.5 text-slate-300">
                        <span>estado</span><span className="text-right text-emerald-200">{selectedNode?.stateName ?? hoverNode?.stateName}</span>
                        <span>coh</span><span className="text-right">{(((selectedNode?.coherence ?? hoverNode?.coherence) || 0) * 100).toFixed(1)}%</span>
                        <span>int</span><span className="text-right">{(((selectedNode?.intensity ?? hoverNode?.intensity) || 0) * 100).toFixed(1)}%</span>
                        <span>pulso</span><span className="text-right text-yellow-200">{Number(selectedNode?.signalPulse ?? hoverNode?.signalPulse ?? 0).toFixed(2)}</span>
                        <span>grado</span><span className="text-right">{selectedNode?.degree ?? hoverNode?.degree ?? 0}</span>
                    </div>
                    <div className="mt-1 border-t border-cyan-500/20 pt-1 text-[9px] text-cyan-200/70">
                        Diagnostico visual interno; no es gate ni validacion externa.
                    </div>
                </div>
            )}

            {/* Compact 1-Line Bottom HUD aligned with 3D (preserving 2.5D ENGINE v8.1 Active) */}
            <div
                data-testid="network-2d-coupled-hud"
                className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-end justify-between gap-2"
                onMouseDown={(e) => e.stopPropagation()}
                onClick={(e) => e.stopPropagation()}
            >
                <div className={`pointer-events-auto rounded-xl border border-cyan-500/25 bg-slate-950/75 text-[10px] font-mono text-slate-200 shadow-xl backdrop-blur-md ${uiDensity === 'compact' ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}>
                    <div className="flex flex-wrap items-center gap-2">
                        <span className={`rounded border px-1.5 py-0.5 text-[9px] font-semibold ${verdict2dClass}`}>
                            {verdict2dLabel}
                        </span>
                        <span className="text-cyan-300">2.5D ENGINE v8.1 Active</span>
                        <span className="text-slate-300">
                            {bridgeHudState.mode} (η={bridgeHudState.effectiveEta})
                        </span>
                        <span className="text-teal-300">
                            N {drawStats.visibleNodes} | E {drawStats.edgeCount}
                        </span>
                        <span className="text-emerald-300">{Math.min(30, fpsDisplay)} FPS</span>
                        <button
                            type="button"
                            data-testid="2d-hud-details-toggle"
                            aria-expanded={showHudDetails}
                            onClick={() => setShowHudDetails((v) => !v)}
                            className="rounded border border-slate-600/70 bg-slate-900/80 px-1.5 py-0.5 text-[9px] text-slate-200 hover:bg-slate-800"
                        >
                            {showHudDetails ? 'Ocultar ▾' : 'Detalles ▴'}
                        </button>
                    </div>
                    {showHudDetails && (
                        <div className="mt-1.5 border-t border-slate-800/80 pt-1 text-[9px] text-slate-300 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                            <span>Z {cameraRef.current.zoom.toFixed(2)}x</span>
                            <span>{useWorkerRender ? 'THREAD: WORKER' : 'THREAD: MAIN'}</span>
                            <span>{(RENDER_STATE_META[renderState] || RENDER_STATE_META.recovering).label}</span>
                            <span>P {drawStats.projectedNodes} · OnScreen {drawStats.visibleOnScreen}</span>
                            <span>Senales vivas: {bridgeHudState.activeSignals}</span>
                            <span>{touchEnabled ? '1 dedo: Rotar · 2 dedos: Zoom' : 'Arrastrar: Rotar · Shift: Pan · Doble click: Reset'}</span>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default NetworkCanvas;
