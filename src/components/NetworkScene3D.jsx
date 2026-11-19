import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import {
  NODAL_3D_SECTORS,
  NODAL_3D_VIEW_MODES,
  buildFallback3DView,
  buildRealSynapticEdgeSelection,
  computeCoupledNodeTargets,
  createProjectionWorkspace,
  extractCoreVisualizationState,
  selectStratifiedRenderIndices
} from '../simulation/Nodal3DSceneProjection.js';

const QUALITY_PRESETS = Object.freeze({
  desktop: Object.freeze({
    tier: 'webgl_desktop',
    maxNodes: 1500,
    maxEdges: 1800,
    starCount: 280,
    sphereSegments: 5,
    enableBloom: true,
    bloomStrength: 0.16,
    bloomRadius: 0.26,
    bloomThreshold: 0.68,
    maxPixelRatio: 1.0,
    targetFps: 30
  }),
  tablet: Object.freeze({
    tier: 'webgl_tablet',
    maxNodes: 760,
    maxEdges: 960,
    starCount: 180,
    sphereSegments: 5,
    enableBloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    maxPixelRatio: 1.0,
    targetFps: 30
  }),
  mobile: Object.freeze({
    tier: 'webgl_mobile',
    maxNodes: 420,
    maxEdges: 520,
    starCount: 100,
    sphereSegments: 5,
    enableBloom: false,
    bloomStrength: 0,
    bloomRadius: 0,
    bloomThreshold: 1,
    maxPixelRatio: 1.0,
    targetFps: 30
  })
});

const NEBULA_VERTEX_SHADER = `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.999, 1.0);
  }
`;

// Ultra-light analytical radial backdrop shader (zero per-pixel FBM loops -> 60 FPS fill rate!)
const NEBULA_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uCoherence;
  uniform float uReducedMotion;
  uniform float uBridgeActive;
  varying vec2 vUv;

  void main() {
    vec2 uv = (vUv - 0.5) * 2.0;
    float r = length(uv);
    float drift = mix(uTime * 0.08, 0.0, uReducedMotion);
    float halo = exp(-r * r * 1.45);
    float sheen = 0.5 + 0.5 * sin((uv.x * 1.8) - (uv.y * 1.4) + drift);

    vec3 deepVoid = vec3(0.009, 0.014, 0.036);
    vec3 tealCore = vec3(0.020, 0.070, 0.098);
    vec3 violetEdge = vec3(0.055, 0.022, 0.110);

    vec3 glow = mix(violetEdge, tealCore, (0.35 + 0.65 * uBridgeActive) * (0.45 + 0.55 * sheen));
    vec3 color = deepVoid + (glow * halo * (0.38 + 0.22 * uCoherence));
    gl_FragColor = vec4(color, 1.0);
  }
`;

const EDGE_VERTEX_SHADER = `
  attribute float aEdgeProgress;
  attribute float aEdgeIsBridge;
  attribute float aEdgeHighlight;
  attribute vec3 color;
  varying vec3 vColor;
  varying float vProgress;
  varying float vIsBridge;
  varying float vHighlight;
  varying float vDepth;

  void main() {
    vColor = color;
    vProgress = aEdgeProgress;
    vIsBridge = aEdgeIsBridge;
    vHighlight = aEdgeHighlight;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    vDepth = -mvPos.z;
    gl_Position = projectionMatrix * mvPos;
  }
`;

const EDGE_FRAGMENT_SHADER = `
  uniform float uTime;
  uniform float uReducedMotion;
  uniform float uBridgeActive;
  uniform float uBaseAlpha;
  varying vec3 vColor;
  varying float vProgress;
  varying float vIsBridge;
  varying float vHighlight;
  varying float vDepth;

  void main() {
    float speed = mix(1.3 + vIsBridge * 1.1, 0.25, uReducedMotion);
    float pulse = 0.5 + 0.5 * sin((vProgress * 6.0) - (uTime * speed));
    float travelGlow = pulse * pulse;
    float depthFade = clamp(1.32 - (vDepth * 0.024), 0.24, 1.0);
    float bridgeGate = mix(1.0, mix(0.22, 1.0, uBridgeActive), vIsBridge);

    float alpha = (uBaseAlpha + (travelGlow * (0.07 + 0.11 * vIsBridge))) * bridgeGate * depthFade;
    vec3 finalCol = vColor + (vec3(0.08, 0.20, 0.22) * travelGlow * vIsBridge * uBridgeActive);
    alpha = mix(alpha, 0.88, vHighlight);
    finalCol = mix(finalCol, vec3(0.72, 0.98, 0.95), vHighlight * 0.55);

    gl_FragColor = vec4(finalCol, clamp(alpha, 0.04, 0.94));
  }
`;

const clamp01 = (v) => {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0;
  return n < 0 ? 0 : (n > 1 ? 1 : n);
};

function computeNodeAccentColor(outColor, modelIdx, sectorId, coherence, energy, interFlux, bridgeActive, rgbArr, idx3) {
  if (bridgeActive && coherence >= 0.90 && interFlux > 1.8 && (modelIdx % 7 === 0)) {
    outColor.setHSL(145 / 360, 0.84, clamp01(0.50 + (energy * 0.18)));
    return outColor;
  }
  if (sectorId === 3) {
    const hue = 290 + Math.round((coherence - 0.5) * 34);
    outColor.setHSL(((hue % 360) + 360) % 360 / 360, 0.78, clamp01(0.46 + (energy * 0.20)));
    return outColor;
  }
  outColor.setRGB(rgbArr[idx3], rgbArr[idx3 + 1], rgbArr[idx3 + 2]);
  return outColor;
}

function createOrbitRings(scene) {
  const group = new THREE.Group();

  const makeRing = (radius, tube, color, opacity, rotX, rotY) => {
    const geom = new THREE.TorusGeometry(radius, tube, 6, 72);
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity,
      depthWrite: false
    });
    const mesh = new THREE.Mesh(geom, mat);
    mesh.rotation.x = rotX;
    mesh.rotation.y = rotY;
    group.add(mesh);
    return mesh;
  };

  const writableRing = makeRing(2.0, 0.010, 0x24ebb8, 0.22, Math.PI * 0.36, 0.24);
  const tdRing = makeRing(2.75, 0.011, 0x38bdf8, 0.24, Math.PI * 0.5, 0);
  const bodyWorldRing = makeRing(3.55, 0.009, 0xc084fc, 0.18, -Math.PI * 0.28, Math.PI * 0.18);
  const bridgeEquatorRing = makeRing(4.35, 0.008, 0x5eead4, 0.14, Math.PI * 0.5, 0);

  scene.add(group);
  return {
    group,
    writableRing,
    tdRing,
    bodyWorldRing,
    bridgeEquatorRing
  };
}

function deepDispose(root) {
  if (!root) return;
  root.traverse((obj) => {
    if (obj.geometry && typeof obj.geometry.dispose === 'function') {
      obj.geometry.dispose();
    }
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const mat of mats) {
      if (!mat) continue;
      if (mat.uniforms) {
        Object.values(mat.uniforms).forEach((u) => {
          if (u?.value && typeof u.value.dispose === 'function') u.value.dispose();
        });
      }
      if (typeof mat.dispose === 'function') mat.dispose();
    }
  });
}

function buildNodeInspectorSummary(modelIdx, renderIdx, view, workspace, edgeStats, nodes) {
  const buffers = view?.buffers;
  if (!buffers || modelIdx < 0 || modelIdx >= view.nodeCount) return null;
  const secId = Math.max(0, Math.min(3, buffers.sectorId[modelIdx] ?? 0));
  const secMeta = NODAL_3D_SECTORS[secId];
  const nodeObj = Array.isArray(nodes) ? nodes[modelIdx] : null;
  let intraDeg = 0;
  let interDeg = 0;
  if (nodeObj && Array.isArray(nodeObj.connections)) {
    for (let i = 0; i < nodeObj.connections.length; i += 1) {
      const targetId = nodeObj.connections[i]?.targetId;
      const targetSec = (targetId >= 0 && targetId < buffers.sectorId.length)
        ? buffers.sectorId[targetId]
        : (Math.abs(Number(targetId) || 0) % 4);
      if (targetSec === secId) intraDeg += 1;
      else interDeg += 1;
    }
  }
  return {
    id: nodeObj?.id ?? modelIdx,
    renderIdx,
    sectorId: secId,
    sectorKey: secMeta.key,
    sectorLabel: secMeta.label,
    sectorAccent: secMeta.accentHex,
    active: buffers.activeMask[modelIdx] > 0,
    coherence: clamp01(buffers.coherence[modelIdx]),
    energy: clamp01(buffers.energy[modelIdx]),
    intensity: clamp01(buffers.intensity[modelIdx]),
    phase: Number.isFinite(buffers.phase[modelIdx]) ? buffers.phase[modelIdx] : 0,
    interFlux: Number(buffers.interFlux[modelIdx] || 0),
    intraDegree: intraDeg,
    interDegree: interDeg,
    totalDegree: intraDeg + interDeg,
    neighborhoodSize: workspace?.neighborSet?.size || (intraDeg + interDeg + 1),
    visibleEdges: edgeStats?.totalEdges || 0
  };
}

const DEFAULT_CAMERA_POS = [0, 3.0, 26.5];

const NetworkScene3D = React.memo(({
  nodalLayer,
  nodes = [],
  ontologicalState = null,
  endogenousDecision = null,
  bridgeMetrics = null,
  isRunning = true,
  tick = 0,
  viewportMode = 'desktop',
  canvasScale = 1,
  uiDensity = 'comfortable',
  onTelemetry,
  onFallback,
  onCouplingModeChange = null
}) => {
  const rootRef = useRef(null);
  const containerRef = useRef(null);
  const latestPropsRef = useRef({
    nodalLayer,
    nodes,
    ontologicalState,
    endogenousDecision,
    bridgeMetrics,
    isRunning,
    tick,
    onTelemetry
  });
  latestPropsRef.current = {
    nodalLayer,
    nodes,
    ontologicalState,
    endogenousDecision,
    bridgeMetrics,
    isRunning,
    tick,
    onTelemetry
  };

  const viewModeRef = useRef(NODAL_3D_VIEW_MODES.COUPLED);
  const selectedRenderIdxRef = useRef(-1);
  const hoveredRenderIdxRef = useRef(-1);
  const lastEdgeRebuildTickRef = useRef(-999);
  const lastEdgeModeRef = useRef('');
  const lastEdgeViewModeRef = useRef('');
  const lastFocusIdxRef = useRef(-999);
  const cameraApiRef = useRef({ zoomBy: null, resetView: null, focusCore: null });

  const [viewMode, setViewMode] = useState(NODAL_3D_VIEW_MODES.COUPLED);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showHudDetails, setShowHudDetails] = useState(false);
  const [hoveredNode, setHoveredNode] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);
  const [hudSummary, setHudSummary] = useState({
    renderCount: 0,
    modelNodeCount: 0,
    totalEdges: 0,
    bridgeEdges: 0,
    intraEdges: 0,
    bridgeMode: 'bidirectional',
    effectiveEta: 0.125,
    interSectorRatio: 0,
    nonFactorizabilityFlux: 0,
    bridgeSyncIndex: 0,
    sigmaExactDefect: 0,
    writableRetention: 1,
    decisionCode: null,
    decisionTone: 'reserve',
    ccc: 0.5,
    fps: 60,
    sectors: []
  });

  const quality = useMemo(() => (
    QUALITY_PRESETS[viewportMode] || QUALITY_PRESETS.desktop
  ), [viewportMode]);

  const prefersReducedMotion = useMemo(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    return Boolean(window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  }, []);

  const handleViewModeChange = useCallback((nextMode) => {
    viewModeRef.current = nextMode;
    lastEdgeViewModeRef.current = '';
    setViewMode(nextMode);
  }, []);

  const clearSelection = useCallback(() => {
    selectedRenderIdxRef.current = -1;
    lastFocusIdxRef.current = -999;
    setSelectedNode(null);
  }, []);

  const toggleExpand = useCallback(() => {
    setIsExpanded((prev) => {
      const next = !prev;
      try {
        if (next && rootRef.current && typeof rootRef.current.requestFullscreen === 'function' && !document.fullscreenElement) {
          rootRef.current.requestFullscreen().catch(() => {});
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
      if (ev.key === 'Escape' && isExpanded) {
        setIsExpanded(false);
      }
    };
    const onFsChange = () => {
      if (!document.fullscreenElement && isExpanded) {
        // Keep user control predictable when exiting native fullscreen via ESC
        setIsExpanded(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    document.addEventListener('fullscreenchange', onFsChange);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      document.removeEventListener('fullscreenchange', onFsChange);
    };
  }, [isExpanded]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return undefined;

    let disposed = false;
    let rafId = 0;
    let renderer;
    let composer;
    let bloomPass;
    let orbitControls;
    let scene;
    let camera;
    let resizeObserver;
    let handleContextLost;

    try {
      const width = Math.max(240, container.clientWidth || 720);
      const height = Math.max(240, container.clientHeight || 480);

      scene = new THREE.Scene();
      scene.fog = new THREE.FogExp2(0x030612, 0.007);

      camera = new THREE.PerspectiveCamera(44, width / height, 0.25, 220);
      camera.position.set(DEFAULT_CAMERA_POS[0], DEFAULT_CAMERA_POS[1], DEFAULT_CAMERA_POS[2]);

      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: 'high-performance',
        alpha: false,
        stencil: false
      });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.maxPixelRatio));
      renderer.setSize(width, height);
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.05;
      renderer.domElement.style.display = 'block';
      renderer.domElement.style.width = '100%';
      renderer.domElement.style.height = '100%';

      container.innerHTML = '';
      container.appendChild(renderer.domElement);

      handleContextLost = (ev) => {
        ev.preventDefault();
        if (typeof onFallback === 'function') onFallback('webgl_context_lost');
      };
      renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);

      orbitControls = new OrbitControls(camera, renderer.domElement);
      orbitControls.enableDamping = true;
      orbitControls.dampingFactor = 0.065;
      orbitControls.minDistance = 5.0;
      orbitControls.maxDistance = 72;
      orbitControls.enablePan = true;
      orbitControls.rotateSpeed = 0.78;
      orbitControls.zoomSpeed = 0.95;
      orbitControls.autoRotate = !prefersReducedMotion;
      orbitControls.autoRotateSpeed = 0.22;

      const ambientLight = new THREE.AmbientLight(0xa5bced, 0.84);
      scene.add(ambientLight);
      const directionalLight = new THREE.DirectionalLight(0xf0f9ff, 1.38);
      directionalLight.position.set(18, 22, 24);
      scene.add(directionalLight);
      const coreLight = new THREE.PointLight(0x24ebb8, 1.5, 34, 1.8);
      coreLight.position.set(0, 0, 0);
      scene.add(coreLight);

      // Ultra-fast analytical nebula backdrop
      const nebulaUniforms = {
        uTime: { value: 0 },
        uCoherence: { value: 0.6 },
        uReducedMotion: { value: prefersReducedMotion ? 1.0 : 0.0 },
        uBridgeActive: { value: 1.0 }
      };
      const nebulaQuad = new THREE.Mesh(
        new THREE.PlaneGeometry(2, 2),
        new THREE.ShaderMaterial({
          uniforms: nebulaUniforms,
          vertexShader: NEBULA_VERTEX_SHADER,
          fragmentShader: NEBULA_FRAGMENT_SHADER,
          depthWrite: false,
          depthTest: false
        })
      );
      nebulaQuad.frustumCulled = false;
      nebulaQuad.renderOrder = -100;
      scene.add(nebulaQuad);

      // Lightweight starfield
      const starCount = quality.starCount;
      const starPositions = new Float32Array(starCount * 3);
      const starColors = new Float32Array(starCount * 3);
      for (let i = 0; i < starCount; i += 1) {
        const phi = Math.acos(1 - (2 * ((i + 0.5) / starCount)));
        const theta = Math.PI * (1 + Math.sqrt(5)) * i;
        const rad = 52 + ((i % 19) * 1.5);
        starPositions[i * 3] = rad * Math.sin(phi) * Math.cos(theta);
        starPositions[i * 3 + 1] = rad * Math.cos(phi);
        starPositions[i * 3 + 2] = rad * Math.sin(phi) * Math.sin(theta);
        const tint = (i % 3 === 0) ? [0.58, 0.86, 1.0] : (i % 3 === 1 ? [0.80, 0.68, 1.0] : [0.50, 0.94, 0.84]);
        starColors[i * 3] = tint[0];
        starColors[i * 3 + 1] = tint[1];
        starColors[i * 3 + 2] = tint[2];
      }
      const starGeom = new THREE.BufferGeometry();
      starGeom.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      starGeom.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
      const starPoints = new THREE.Points(
        starGeom,
        new THREE.PointsMaterial({ size: 0.13, vertexColors: true, transparent: true, opacity: 0.45, depthWrite: false })
      );
      scene.add(starPoints);

      // Delicate central Constructive Core marker (small octahedron jewel + whisper-thin tower rings)
      const coreGroup = new THREE.Group();
      const coreJewelMat = new THREE.MeshPhongMaterial({
        color: 0x24ebb8,
        emissive: 0x059669,
        emissiveIntensity: 0.72,
        shininess: 100,
        transparent: true,
        opacity: 0.65
      });
      const coreJewel = new THREE.Mesh(new THREE.OctahedronGeometry(0.30, 0), coreJewelMat);
      coreGroup.add(coreJewel);
      scene.add(coreGroup);

      const orbitRings = createOrbitRings(scene);

      // Focus node halo
      const focusHalo = new THREE.Mesh(
        new THREE.TorusGeometry(0.34, 0.024, 6, 28),
        new THREE.MeshBasicMaterial({
          color: 0xfef08a,
          transparent: true,
          opacity: 0.92,
          depthWrite: false
        })
      );
      focusHalo.visible = false;
      scene.add(focusHalo);

      // Pre-allocated GPU buffers for 1500 lightweight spherical nodes + 2100 real synaptic filaments
      const nodeCap = quality.maxNodes;
      const edgeCap = quality.maxEdges;
      const workspace = createProjectionWorkspace(nodeCap, edgeCap);
      const currentPositions = new Float32Array(nodeCap * 3);
      const currentRadii = new Float32Array(nodeCap);
      const currentColors = new Float32Array(nodeCap * 3);
      let hasSeededInitialState = false;
      let cachedModelNodeCount = -1;
      let cachedRenderCount = 0;

      const nodeGeometry = new THREE.SphereGeometry(1, quality.sphereSegments, Math.max(4, quality.sphereSegments - 1));
      const nodeMaterial = new THREE.MeshPhongMaterial({
        color: 0xffffff,
        emissive: 0x0a162c,
        emissiveIntensity: 0.48,
        shininess: 92,
        specular: 0xa5f3fc
      });
      const nodeMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, nodeCap);
      nodeMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
      const initColor = new THREE.Color(0xffffff);
      for (let i = 0; i < nodeCap; i += 1) {
        nodeMesh.setColorAt(i, initColor);
      }
      if (nodeMesh.instanceColor) nodeMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
      nodeMesh.count = 0;
      nodeMesh.frustumCulled = false;
      scene.add(nodeMesh);

      // Real synaptic filaments (NormalBlending -> razor-sharp mesh, zero blowout!)
      const edgePositions = new Float32Array(edgeCap * 6);
      const edgeColors = new Float32Array(edgeCap * 6);
      const edgeProgress = new Float32Array(edgeCap * 2);
      const edgeIsBridgeAttrArr = new Float32Array(edgeCap * 2);
      const edgeHighlightArr = new Float32Array(edgeCap * 2);
      for (let i = 0; i < edgeCap; i += 1) {
        edgeProgress[i * 2] = 0;
        edgeProgress[i * 2 + 1] = 1;
      }

      const edgeGeom = new THREE.BufferGeometry();
      const posAttr = new THREE.BufferAttribute(edgePositions, 3);
      posAttr.setUsage(THREE.DynamicDrawUsage);
      const colAttr = new THREE.BufferAttribute(edgeColors, 3);
      colAttr.setUsage(THREE.DynamicDrawUsage);
      const progAttr = new THREE.BufferAttribute(edgeProgress, 1);
      const bridgeAttr = new THREE.BufferAttribute(edgeIsBridgeAttrArr, 1);
      const highAttr = new THREE.BufferAttribute(edgeHighlightArr, 1);

      edgeGeom.setAttribute('position', posAttr);
      edgeGeom.setAttribute('color', colAttr);
      edgeGeom.setAttribute('aEdgeProgress', progAttr);
      edgeGeom.setAttribute('aEdgeIsBridge', bridgeAttr);
      edgeGeom.setAttribute('aEdgeHighlight', highAttr);
      edgeGeom.setDrawRange(0, 0);

      const edgeUniforms = {
        uTime: { value: 0 },
        uReducedMotion: { value: prefersReducedMotion ? 1.0 : 0.0 },
        uBridgeActive: { value: 1.0 },
        uBaseAlpha: { value: 0.16 }
      };
      const edgeMaterial = new THREE.ShaderMaterial({
        uniforms: edgeUniforms,
        vertexShader: EDGE_VERTEX_SHADER,
        fragmentShader: EDGE_FRAGMENT_SHADER,
        transparent: true,
        blending: THREE.NormalBlending,
        depthWrite: false
      });
      const edgeSegments = new THREE.LineSegments(edgeGeom, edgeMaterial);
      edgeSegments.frustumCulled = false;
      scene.add(edgeSegments);

      // Initialize optional Bloom post-processing target (default direct single-pass render for rock-solid 30 FPS!)
      let useComposer = false;
      if (quality.enableBloom) {
        composer = new EffectComposer(renderer);
        composer.addPass(new RenderPass(scene, camera));
        bloomPass = new UnrealBloomPass(
          new THREE.Vector2(width, height),
          quality.bloomStrength,
          quality.bloomRadius,
          quality.bloomThreshold
        );
        composer.addPass(bloomPass);
        // Keep single-pass direct GPU path active by default so 1500 nodes + 1800 synapses stay silky at 30 FPS
        useComposer = false;
      }

      cameraApiRef.current = {
        zoomBy: (factor) => {
          const offset = camera.position.clone().sub(orbitControls.target);
          offset.multiplyScalar(factor);
          const dist = offset.length();
          if (dist >= orbitControls.minDistance && dist <= orbitControls.maxDistance) {
            camera.position.copy(orbitControls.target).add(offset);
          }
        },
        resetView: () => {
          orbitControls.target.set(0, 0, 0);
          camera.position.set(DEFAULT_CAMERA_POS[0], DEFAULT_CAMERA_POS[1], DEFAULT_CAMERA_POS[2]);
          orbitControls.update();
        },
        focusCore: () => {
          orbitControls.target.set(0, 0, 0);
          camera.position.set(0, 1.4, 9.0);
          orbitControls.update();
        }
      };

      const resizeRenderer = () => {
        if (!container || disposed) return;
        const nextW = Math.max(240, container.clientWidth || width);
        const nextH = Math.max(240, container.clientHeight || height);
        camera.aspect = nextW / nextH;
        camera.updateProjectionMatrix();
        renderer.setSize(nextW, nextH);
        if (composer) composer.setSize(nextW, nextH);
        if (bloomPass) bloomPass.setSize(nextW, nextH);
      };
      if (typeof ResizeObserver === 'function') {
        resizeObserver = new ResizeObserver(resizeRenderer);
        resizeObserver.observe(container);
      }

      // Raycasting for node & neighborhood inspection
      const raycaster = new THREE.Raycaster();
      const pointerNdc = new THREE.Vector2();
      let pointerDownPos = null;
      let latestViewRef = null;
      let latestNodesRef = [];
      let latestEdgeStats = { totalEdges: 0, bridgeEdges: 0, intraEdges: 0 };

      const pickNodeAtEvent = (ev) => {
        const rect = renderer.domElement.getBoundingClientRect();
        if (rect.width <= 0 || rect.height <= 0 || nodeMesh.count <= 0) return -1;
        pointerNdc.x = (((ev.clientX - rect.left) / rect.width) * 2) - 1;
        pointerNdc.y = -(((ev.clientY - rect.top) / rect.height) * 2) + 1;
        raycaster.setFromCamera(pointerNdc, camera);
        const hits = raycaster.intersectObject(nodeMesh, false);
        return (hits.length > 0 && Number.isInteger(hits[0].instanceId)) ? hits[0].instanceId : -1;
      };

      let lastRaycastMs = 0;
      const onPointerDown = (ev) => {
        pointerDownPos = { x: ev.clientX, y: ev.clientY };
      };

      const onPointerMove = (ev) => {
        // Never raycast 1500 instances while actively dragging OrbitControls, and throttle hover picks to ~12 Hz
        if (pointerDownPos) return;
        const tNow = performance.now();
        if ((tNow - lastRaycastMs) < 80) return;
        lastRaycastMs = tNow;
        const hitRenderIdx = pickNodeAtEvent(ev);
        if (hitRenderIdx !== hoveredRenderIdxRef.current) {
          hoveredRenderIdxRef.current = hitRenderIdx;
          renderer.domElement.style.cursor = hitRenderIdx >= 0 ? 'pointer' : 'grab';
          if (hitRenderIdx >= 0 && latestViewRef) {
            const mIdx = workspace.renderToModelIndex[hitRenderIdx];
            setHoveredNode(buildNodeInspectorSummary(mIdx, hitRenderIdx, latestViewRef, workspace, latestEdgeStats, latestNodesRef));
          } else {
            setHoveredNode(null);
          }
        }
      };

      const onPointerUp = (ev) => {
        if (!pointerDownPos) return;
        const moved = Math.hypot(ev.clientX - pointerDownPos.x, ev.clientY - pointerDownPos.y);
        pointerDownPos = null;
        if (moved > 6) return;
        const hitRenderIdx = pickNodeAtEvent(ev);
        if (hitRenderIdx >= 0 && latestViewRef) {
          selectedRenderIdxRef.current = hitRenderIdx;
          const mIdx = workspace.renderToModelIndex[hitRenderIdx];
          lastFocusIdxRef.current = -999;
          setSelectedNode(buildNodeInspectorSummary(mIdx, hitRenderIdx, latestViewRef, workspace, latestEdgeStats, latestNodesRef));
        } else if (selectedRenderIdxRef.current >= 0) {
          selectedRenderIdxRef.current = -1;
          lastFocusIdxRef.current = -999;
          setSelectedNode(null);
        }
      };

      renderer.domElement.addEventListener('pointerdown', onPointerDown);
      renderer.domElement.addEventListener('pointermove', onPointerMove);
      renderer.domElement.addEventListener('pointerup', onPointerUp);

      const scratchColor = new THREE.Color();
      const colorWhite = new THREE.Color(0xffffff);
      const clockStart = performance.now();
      const targetFrameIntervalMs = 1000 / Math.max(15, Number(quality.targetFps) || 30);
      let prevFrameTime = clockStart - targetFrameIntervalMs;
      let lastLayoutTime = -999;
      let lastHudEmitTime = 0;
      let fpsFrames = 0;
      let fpsWindowStart = clockStart;
      let smoothedFps = 30;
      let edgeMetaDirty = true;

      const animate = (now) => {
        if (disposed) return;
        rafId = requestAnimationFrame(animate);

        // Deterministic 30 FPS frame-pacer: leaves generous CPU/GPU headroom for simulation & silky OrbitControls!
        const rawDtMs = now - prevFrameTime;
        if (hasSeededInitialState && rawDtMs < (targetFrameIntervalMs - 2.0)) {
          return;
        }
        const dt = Math.min(0.08, Math.max(0.008, rawDtMs * 0.001));
        prevFrameTime = now;
        const elapsedSec = (now - clockStart) * 0.001;

        fpsFrames += 1;
        if ((now - fpsWindowStart) >= 500) {
          smoothedFps = Math.min(30, Math.round((fpsFrames * 1000) / Math.max(1, now - fpsWindowStart)));
          fpsFrames = 0;
          fpsWindowStart = now;
        }

        const props = latestPropsRef.current;
        const layerObj = props.nodalLayer?.current;
        const modelNodes = layerObj?.nodes || props.nodes || [];
        latestNodesRef = modelNodes;

        const towerTelem = props.ontologicalState?.tower_telemetry || null;
        const endoDecision = props.endogenousDecision
          || props.ontologicalState?.constructive_finite_cuts?.endogenous_epistemic_decision
          || null;
        const view = (layerObj && typeof layerObj.get3DTelemetryView === 'function')
          ? layerObj.get3DTelemetryView(towerTelem, endoDecision)
          : buildFallback3DView(modelNodes, props.ontologicalState, props.bridgeMetrics, endoDecision);
        latestViewRef = view;

        const coreState = extractCoreVisualizationState(view, props.ontologicalState);
        const curViewMode = viewModeRef.current;

        // 1. Index selection ONLY when model nodeCount changes
        if (view.nodeCount !== cachedModelNodeCount) {
          cachedModelNodeCount = view.nodeCount;
          cachedRenderCount = selectStratifiedRenderIndices(view, nodeCap, workspace);
          workspace.relaxInitialized = false;
          hasSeededInitialState = false;
          edgeMetaDirty = true;
        }
        const renderCount = cachedRenderCount;

        // 2. Rebuild real synaptic & cross-sector edge list on mode/view/focus change or periodic refresh
        const focusIdx = selectedRenderIdxRef.current >= 0
          ? selectedRenderIdxRef.current
          : hoveredRenderIdxRef.current;
        const needEdgeRebuild = !hasSeededInitialState
          || (Math.abs(props.tick - lastEdgeRebuildTickRef.current) >= 30)
          || lastEdgeModeRef.current !== coreState.bridgeMode
          || lastEdgeViewModeRef.current !== curViewMode
          || lastFocusIdxRef.current !== focusIdx;

        if (needEdgeRebuild && renderCount > 0) {
          if (!hasSeededInitialState) {
            computeCoupledNodeTargets(view, workspace, renderCount, coreState, {
              timeSeconds: 0,
              viewMode: curViewMode,
              nodes: modelNodes,
              activeEdgeCount: 0
            });
          }
          latestEdgeStats = buildRealSynapticEdgeSelection(modelNodes, view, workspace, renderCount, edgeCap, coreState, {
            viewMode: curViewMode,
            focusRenderIdx: focusIdx
          });
          lastEdgeRebuildTickRef.current = props.tick;
          lastEdgeModeRef.current = coreState.bridgeMode;
          lastEdgeViewModeRef.current = curViewMode;
          lastFocusIdxRef.current = focusIdx;
          lastLayoutTime = -999;
          edgeMetaDirty = true;
        }

        // 3. Recompute free-form emergent synaptic physics at ~15 Hz (interpolated smoothly at locked 30 FPS!)
        if (!hasSeededInitialState || (now - lastLayoutTime) >= 66) {
          lastLayoutTime = now;
          computeCoupledNodeTargets(view, workspace, renderCount, coreState, {
            timeSeconds: prefersReducedMotion ? 0 : elapsedSec,
            viewMode: curViewMode,
            nodes: modelNodes,
            activeEdgeCount: latestEdgeStats.totalEdges
          });
        }

        // 4. Direct typed-array GPU InstancedMesh updates (zero Object3D/Matrix4 overhead!)
        const lerpAlpha = (!hasSeededInitialState || prefersReducedMotion) ? 1.0 : (1 - Math.exp(-8.0 * dt));
        const hasFocus = focusIdx >= 0 && focusIdx < renderCount;
        const neighbors = workspace.neighborSet;
        const matArr = nodeMesh.instanceMatrix.array;
        const colArr = nodeMesh.instanceColor ? nodeMesh.instanceColor.array : null;

        nodeMesh.count = renderCount;
        for (let r = 0; r < renderCount; r += 1) {
          const i3 = r * 3;
          const m16 = r * 16;
          const mIdx = workspace.renderToModelIndex[r];
          const coh = view.buffers.coherence[mIdx] || 0;
          const energy = view.buffers.energy[mIdx] || 0;
          const interFlux = view.buffers.interFlux[mIdx] || 0;
          const secId = view.buffers.sectorId[mIdx] ?? 0;

          if (!hasSeededInitialState) {
            currentPositions[i3] = workspace.targetPositions[i3];
            currentPositions[i3 + 1] = workspace.targetPositions[i3 + 1];
            currentPositions[i3 + 2] = workspace.targetPositions[i3 + 2];
            currentRadii[r] = workspace.targetRadii[r];
            currentColors[i3] = workspace.targetColors[i3];
            currentColors[i3 + 1] = workspace.targetColors[i3 + 1];
            currentColors[i3 + 2] = workspace.targetColors[i3 + 2];
          } else {
            currentPositions[i3] += (workspace.targetPositions[i3] - currentPositions[i3]) * lerpAlpha;
            currentPositions[i3 + 1] += (workspace.targetPositions[i3 + 1] - currentPositions[i3 + 1]) * lerpAlpha;
            currentPositions[i3 + 2] += (workspace.targetPositions[i3 + 2] - currentPositions[i3 + 2]) * lerpAlpha;
            currentRadii[r] += (workspace.targetRadii[r] - currentRadii[r]) * lerpAlpha;
            currentColors[i3] += (workspace.targetColors[i3] - currentColors[i3]) * lerpAlpha;
            currentColors[i3 + 1] += (workspace.targetColors[i3 + 1] - currentColors[i3 + 1]) * lerpAlpha;
            currentColors[i3 + 2] += (workspace.targetColors[i3 + 2] - currentColors[i3 + 2]) * lerpAlpha;
          }

          let rad = currentRadii[r];
          computeNodeAccentColor(scratchColor, mIdx, secId, coh, energy, interFlux, coreState.bridgeActive, currentColors, i3);
          if (hasFocus) {
            if (r === focusIdx) {
              rad *= 2.25;
              scratchColor.lerp(colorWhite, 0.65);
            } else if (neighbors.has(r)) {
              rad *= 1.48;
            } else {
              rad *= 0.56;
              scratchColor.multiplyScalar(0.20);
            }
          }

          matArr[m16] = rad;
          matArr[m16 + 1] = 0;
          matArr[m16 + 2] = 0;
          matArr[m16 + 3] = 0;
          matArr[m16 + 4] = 0;
          matArr[m16 + 5] = rad;
          matArr[m16 + 6] = 0;
          matArr[m16 + 7] = 0;
          matArr[m16 + 8] = 0;
          matArr[m16 + 9] = 0;
          matArr[m16 + 10] = rad;
          matArr[m16 + 11] = 0;
          matArr[m16 + 12] = currentPositions[i3];
          matArr[m16 + 13] = currentPositions[i3 + 1];
          matArr[m16 + 14] = currentPositions[i3 + 2];
          matArr[m16 + 15] = 1;

          if (colArr) {
            colArr[i3] = scratchColor.r;
            colArr[i3 + 1] = scratchColor.g;
            colArr[i3 + 2] = scratchColor.b;
          }
        }
        nodeMesh.instanceMatrix.needsUpdate = true;
        if (nodeMesh.instanceColor) nodeMesh.instanceColor.needsUpdate = true;

        if (hasFocus) {
          const f3 = focusIdx * 3;
          focusHalo.visible = true;
          focusHalo.position.set(currentPositions[f3], currentPositions[f3 + 1], currentPositions[f3 + 2]);
          focusHalo.quaternion.copy(camera.quaternion);
          focusHalo.scale.setScalar(0.92 + (0.12 * Math.sin(elapsedSec * 5.0)));
        } else {
          focusHalo.visible = false;
        }

        // 5. Update real synaptic web endpoints (only upload metadata attributes when dirty!)
        const drawnEdges = latestEdgeStats.totalEdges;
        for (let e = 0; e < drawnEdges; e += 1) {
          const rU = workspace.edgeSourceRenderIdx[e];
          const rV = workspace.edgeTargetRenderIdx[e];
          const u3 = rU * 3;
          const v3 = rV * 3;
          const p6 = e * 6;

          edgePositions[p6] = currentPositions[u3];
          edgePositions[p6 + 1] = currentPositions[u3 + 1];
          edgePositions[p6 + 2] = currentPositions[u3 + 2];
          edgePositions[p6 + 3] = currentPositions[v3];
          edgePositions[p6 + 4] = currentPositions[v3 + 1];
          edgePositions[p6 + 5] = currentPositions[v3 + 2];

          const isBridge = workspace.edgeIsBridge[e];
          if (edgeMetaDirty) {
            const v2 = e * 2;
            const isFocusEdge = hasFocus && (rU === focusIdx || rV === focusIdx);
            edgeIsBridgeAttrArr[v2] = isBridge;
            edgeIsBridgeAttrArr[v2 + 1] = isBridge;
            edgeHighlightArr[v2] = isFocusEdge ? 1.0 : 0.0;
            edgeHighlightArr[v2 + 1] = isFocusEdge ? 1.0 : 0.0;
          }

          if (isBridge) {
            if (coreState.bridgeActive) {
              edgeColors[p6] = (currentColors[u3] * 0.72) + 0.08;
              edgeColors[p6 + 1] = (currentColors[u3 + 1] * 0.78) + 0.16;
              edgeColors[p6 + 2] = (currentColors[u3 + 2] * 0.80) + 0.16;
              edgeColors[p6 + 3] = (currentColors[v3] * 0.72) + 0.08;
              edgeColors[p6 + 4] = (currentColors[v3 + 1] * 0.78) + 0.16;
              edgeColors[p6 + 5] = (currentColors[v3 + 2] * 0.80) + 0.16;
            } else {
              edgeColors[p6] = 0.56;
              edgeColors[p6 + 1] = 0.18;
              edgeColors[p6 + 2] = 0.28;
              edgeColors[p6 + 3] = 0.48;
              edgeColors[p6 + 4] = 0.16;
              edgeColors[p6 + 5] = 0.26;
            }
          } else {
            const wBoost = 0.52 + (workspace.edgeWeight[e] * 0.34);
            edgeColors[p6] = currentColors[u3] * wBoost;
            edgeColors[p6 + 1] = currentColors[u3 + 1] * wBoost;
            edgeColors[p6 + 2] = currentColors[u3 + 2] * wBoost;
            edgeColors[p6 + 3] = currentColors[v3] * wBoost;
            edgeColors[p6 + 4] = currentColors[v3 + 1] * wBoost;
            edgeColors[p6 + 5] = currentColors[v3 + 2] * wBoost;
          }
        }
        posAttr.needsUpdate = true;
        colAttr.needsUpdate = true;
        if (edgeMetaDirty) {
          bridgeAttr.needsUpdate = true;
          highAttr.needsUpdate = true;
          edgeMetaDirty = false;
        }
        edgeGeom.setDrawRange(0, drawnEdges * 2);

        // 6. Central Constructive Core dynamics
        const animTime = prefersReducedMotion ? 0 : elapsedSec;
        const coreEmphasis = curViewMode === NODAL_3D_VIEW_MODES.CORE_ONLY ? 2.6 : 1.0;

        nebulaUniforms.uTime.value = animTime;
        nebulaUniforms.uCoherence.value = clamp01(coreState.ccc);
        nebulaUniforms.uBridgeActive.value = coreState.bridgeActive ? 1.0 : 0.20;

        edgeUniforms.uTime.value = animTime;
        edgeUniforms.uBridgeActive.value = coreState.bridgeActive ? 1.0 : 0.0;
        edgeUniforms.uBaseAlpha.value = curViewMode === NODAL_3D_VIEW_MODES.BRIDGE_ONLY ? 0.28 : 0.16;

        const jewelPulse = 1.0 + (0.12 * Math.sin((coreState.towerPhase || 0) + (animTime * 2.0)));
        coreGroup.scale.setScalar(jewelPulse * (curViewMode === NODAL_3D_VIEW_MODES.CORE_ONLY ? 1.85 : 1.0));
        coreGroup.rotation.y = (coreState.towerPhase * 0.4) + (animTime * 0.28);
        coreGroup.rotation.x = Math.sin(animTime * 0.25) * 0.22;

        if (coreState.decisionTone === 'affirmative') {
          coreJewelMat.color.setHex(0x24ebb8);
          coreJewelMat.emissive.setHex(0x059669);
          coreLight.color.setHex(0x24ebb8);
        } else if (coreState.decisionTone === 'negative') {
          coreJewelMat.color.setHex(0xf43f5e);
          coreJewelMat.emissive.setHex(0xbe123c);
          coreLight.color.setHex(0xf43f5e);
        } else {
          coreJewelMat.color.setHex(0xf59e0b);
          coreJewelMat.emissive.setHex(0xb45309);
          coreLight.color.setHex(0xf59e0b);
        }
        coreLight.intensity = 1.3 + (clamp01(coreState.ccc) * 1.1);

        orbitRings.writableRing.scale.setScalar(0.75 + (Math.min(1.2, coreState.writableRetention) * 0.35));
        orbitRings.writableRing.rotation.z = animTime * 0.30;
        orbitRings.writableRing.material.opacity = Math.min(0.85, 0.20 * coreEmphasis);

        const tdWobble = (coreState.tdCutActive || Math.abs(coreState.sigmaExactDefect) > 1e-9)
          ? (0.36 * Math.sin(animTime * 3.2))
          : 0.0;
        orbitRings.tdRing.rotation.x = (Math.PI * 0.5) + tdWobble;
        orbitRings.tdRing.rotation.y = animTime * (coreState.tdCutActive ? 0.55 : -0.20);
        orbitRings.tdRing.material.color.setHex(coreState.tdCutActive ? 0xf43f5e : 0x38bdf8);
        orbitRings.tdRing.material.opacity = Math.min(0.85, (coreState.tdCutActive ? 0.42 : 0.22) * coreEmphasis);

        orbitRings.bodyWorldRing.rotation.x = (-Math.PI * 0.28) + (Math.tanh(coreState.bodyBalance * 3.0) * 0.45);
        orbitRings.bodyWorldRing.rotation.y = (Math.PI * 0.18) + (Math.tanh(coreState.worldContrast * 3.0) * 0.45);
        orbitRings.bodyWorldRing.rotation.z = animTime * 0.16;
        orbitRings.bodyWorldRing.material.opacity = Math.min(0.78, 0.16 * coreEmphasis);

        orbitRings.bridgeEquatorRing.material.opacity = coreState.bridgeActive
          ? Math.min(0.70, 0.14 * coreEmphasis)
          : 0.04;
        orbitRings.bridgeEquatorRing.material.color.setHex(coreState.bridgeActive ? 0x5eead4 : 0xf43f5e);
        orbitRings.bridgeEquatorRing.rotation.z = -animTime * 0.12;

        hasSeededInitialState = true;
        orbitControls.update();

        if (useComposer && composer) composer.render();
        else renderer.render(scene, camera);

        // 7. Throttled HUD & parent visual-only telemetry update (~3 Hz)
        if ((now - lastHudEmitTime) >= 320) {
          lastHudEmitTime = now;
          const sectorsSnapshot = Array.isArray(coreState.sectors)
            ? coreState.sectors.map((sec, idx) => ({
              key: sec.key,
              label: NODAL_3D_SECTORS[idx]?.shortLabel || sec.key,
              accentHex: NODAL_3D_SECTORS[idx]?.accentHex || '#22d3ee',
              coherence: Number(sec.mean_coherence || 0),
              phaseOrderR: Number(sec.phase_order_r || 0),
              interFlux: Number(sec.inter_flux || 0)
            }))
            : [];

          setHudSummary({
            renderCount,
            modelNodeCount: view.nodeCount,
            totalEdges: latestEdgeStats.totalEdges,
            bridgeEdges: latestEdgeStats.bridgeEdges,
            intraEdges: latestEdgeStats.intraEdges,
            bridgeMode: coreState.bridgeMode,
            effectiveEta: coreState.effectiveEta,
            interSectorRatio: coreState.interSectorRatio,
            nonFactorizabilityFlux: coreState.nonFactorizabilityFlux,
            bridgeSyncIndex: coreState.bridgeSyncIndex,
            sigmaExactDefect: coreState.sigmaExactDefect,
            writableRetention: coreState.writableRetention,
            decisionCode: coreState.decisionCode,
            decisionTone: coreState.decisionTone,
            ccc: coreState.ccc,
            fps: smoothedFps,
            sectors: sectorsSnapshot
          });

          if (typeof props.onTelemetry === 'function') {
            props.onTelemetry({
              renderer_mode: 'webgl_three',
              render_quality_tier: quality.tier,
              visible_on_screen_count: renderCount,
              projected_nodes_count: renderCount,
              model_nodes_count: view.nodeCount,
              drawn_edges_count: latestEdgeStats.totalEdges,
              drawn_bridge_edges_count: latestEdgeStats.bridgeEdges,
              drawn_intra_edges_count: latestEdgeStats.intraEdges,
              hover_node_id: hoveredRenderIdxRef.current >= 0 ? workspace.renderToModelIndex[hoveredRenderIdxRef.current] : null,
              selected_node_id: selectedRenderIdxRef.current >= 0 ? workspace.renderToModelIndex[selectedRenderIdxRef.current] : null,
              focus_neighborhood_size: workspace.neighborSet.size,
              bridge_mode: coreState.bridgeMode,
              decision_code: coreState.decisionCode,
              fps: smoothedFps
            });
          }
        }
      };

      rafId = requestAnimationFrame(animate);

      return () => {
        disposed = true;
        if (rafId) cancelAnimationFrame(rafId);
        if (resizeObserver) resizeObserver.disconnect();
        if (renderer?.domElement) {
          renderer.domElement.removeEventListener('pointerdown', onPointerDown);
          renderer.domElement.removeEventListener('pointermove', onPointerMove);
          renderer.domElement.removeEventListener('pointerup', onPointerUp);
          if (handleContextLost) {
            renderer.domElement.removeEventListener('webglcontextlost', handleContextLost, false);
          }
        }
        orbitControls?.dispose();
        composer?.dispose();
        bloomPass?.dispose();
        deepDispose(scene);
        renderer?.dispose();
      };
    } catch (error) {
      if (typeof onFallback === 'function') {
        onFallback(error?.message || 'webgl_init_error');
      }
      return undefined;
    }
  }, [quality, prefersReducedMotion, viewportMode, onFallback]);

  const activeInspectNode = selectedNode || hoveredNode;
  const compactMode = uiDensity === 'compact' || viewportMode === 'mobile';
  const verdictShort = hudSummary.decisionTone === 'affirmative'
    ? 'PRESENCIA ESTRUCTURAL'
    : (hudSummary.decisionTone === 'negative' ? 'CORTE / DESACOPLE' : 'RESERVA ESTRUCTURAL');
  const verdictColorClass = hudSummary.decisionTone === 'affirmative'
    ? 'border-emerald-400/50 bg-emerald-950/75 text-emerald-200'
    : (hudSummary.decisionTone === 'negative'
      ? 'border-rose-400/60 bg-rose-950/80 text-rose-200'
      : 'border-amber-400/50 bg-amber-950/75 text-amber-200');

  return (
    <div
      ref={rootRef}
      data-expanded={isExpanded ? 'true' : 'false'}
      className={isExpanded
        ? 'fixed inset-0 z-[9999] h-dvh w-screen select-none overflow-hidden bg-[#020510]'
        : 'relative h-full w-full min-h-[360px] select-none overflow-hidden rounded-xl border border-cyan-500/25 bg-[#030612]'}
      role="application"
      aria-label="Red nodal interactiva WebGL 3D acoplada a las torres constructivas"
      style={!isExpanded && canvasScale !== 1 ? { transform: `scale(${canvasScale})` } : undefined}
    >
      <div ref={containerRef} data-testid="network-webgl-mount" className="h-full w-full" />

      {/* Minimalist Top Bar (unobtrusive, leaves >93% of canvas open) */}
      <div className="pointer-events-none absolute left-2.5 right-2.5 top-2.5 z-10 flex flex-wrap items-center justify-between gap-1.5">
        <div className="flex flex-wrap items-center gap-1.5">
          <div role="group" aria-label="Capa de proyeccion 3D" className="pointer-events-auto inline-flex overflow-hidden rounded-lg border border-cyan-400/30 bg-slate-950/70 text-[11px] backdrop-blur-md">
            {[
              { id: NODAL_3D_VIEW_MODES.COUPLED, label: `Red (${hudSummary.renderCount || quality.maxNodes})` },
              { id: NODAL_3D_VIEW_MODES.BRIDGE_ONLY, label: 'Puente' },
              { id: NODAL_3D_VIEW_MODES.CORE_ONLY, label: 'Torre' }
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                data-testid={`3d-view-mode-${tab.id}`}
                aria-pressed={viewMode === tab.id}
                onClick={() => handleViewModeChange(tab.id)}
                className={`px-2 py-1 font-medium transition-colors ${viewMode === tab.id ? 'bg-cyan-600/90 text-white' : 'text-slate-200 hover:bg-slate-800/80'}`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="pointer-events-auto inline-flex items-center overflow-hidden rounded-lg border border-slate-600/50 bg-slate-950/70 text-[11px] text-slate-200 backdrop-blur-md">
            <button type="button" onClick={() => cameraApiRef.current.zoomBy?.(0.82)} title="Acercar" className="px-2 py-1 hover:bg-slate-800">+</button>
            <button type="button" onClick={() => cameraApiRef.current.zoomBy?.(1.22)} title="Alejar" className="border-l border-slate-700/70 px-2 py-1 hover:bg-slate-800">−</button>
            <button type="button" onClick={() => cameraApiRef.current.resetView?.()} title="Reiniciar camara" className="border-l border-slate-700/70 px-2 py-1 hover:bg-slate-800">Reset</button>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          {onCouplingModeChange && (
            <div role="group" aria-label="Modo del puente en vivo" className="pointer-events-auto inline-flex overflow-hidden rounded-lg border border-emerald-500/35 bg-slate-950/70 text-[10px] font-mono backdrop-blur-md">
              {[
                { id: 'bidirectional', label: 'η=1/8' },
                { id: 'td_cut_eta_zero', label: 'η=0' },
                { id: 'reducible_control', label: 'A=I' }
              ].map((m) => (
                <button
                  key={m.id}
                  type="button"
                  data-testid={`3d-coupling-btn-${m.id}`}
                  aria-pressed={hudSummary.bridgeMode === m.id}
                  onClick={() => onCouplingModeChange(m.id)}
                  className={`px-2 py-1 transition-colors ${hudSummary.bridgeMode === m.id ? 'bg-emerald-600/85 text-white' : 'text-slate-300 hover:bg-slate-800/80'}`}
                >
                  {m.label}
                </button>
              ))}
            </div>
          )}

          <button
            type="button"
            data-testid="3d-expand-fullscreen-btn"
            aria-pressed={isExpanded}
            onClick={toggleExpand}
            title={isExpanded ? 'Salir de pantalla completa (ESC)' : 'Expandir a pantalla completa'}
            className="pointer-events-auto rounded-lg border border-cyan-400/50 bg-cyan-950/80 px-2.5 py-1 font-mono text-[11px] font-semibold text-cyan-100 backdrop-blur-md transition-colors hover:bg-cyan-800/80"
          >
            {isExpanded ? '✕ Salir (ESC)' : '⛶ Expandir'}
          </button>
        </div>
      </div>

      {/* Hover / Selected Node Inspector (offset below top toolbar) */}
      {activeInspectNode && (
        <div
          data-testid="network-node-focus-tooltip"
          className="pointer-events-auto absolute right-3 top-12 z-20 w-64 rounded-xl border border-cyan-400/45 bg-slate-950/90 p-3 text-xs text-slate-100 shadow-2xl backdrop-blur-md"
        >
          <div className="flex items-center justify-between gap-2 border-b border-slate-800 pb-1.5">
            <span className="font-mono font-bold text-cyan-300">
              Nodo #{activeInspectNode.id} {selectedNode ? '· FIJO' : ''}
            </span>
            <span
              className="rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-950"
              style={{ backgroundColor: activeInspectNode.sectorAccent }}
            >
              {activeInspectNode.sectorLabel}
            </span>
          </div>
          <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 font-mono text-[11px]">
            <div className="text-slate-400">Coherencia:</div>
            <div className="text-right text-emerald-300">{activeInspectNode.coherence.toFixed(3)}</div>
            <div className="text-slate-400">Energia:</div>
            <div className="text-right text-cyan-200">{activeInspectNode.energy.toFixed(3)}</div>
            <div className="text-slate-400">Intensidad:</div>
            <div className="text-right text-sky-200">{activeInspectNode.intensity.toFixed(3)}</div>
            <div className="text-slate-400">Fase (rad):</div>
            <div className="text-right text-purple-200">{activeInspectNode.phase.toFixed(2)}</div>
            <div className="text-slate-400">Flujo cruzado:</div>
            <div className="text-right text-teal-300">{activeInspectNode.interFlux.toFixed(4)}</div>
            <div className="text-slate-400">Sinapsis (i/x):</div>
            <div className="text-right text-amber-200">{activeInspectNode.intraDegree} / {activeInspectNode.interDegree}</div>
          </div>
          {selectedNode && (
            <button
              type="button"
              onClick={clearSelection}
              className="mt-2 w-full rounded border border-cyan-500/40 bg-cyan-950/60 py-1 font-mono text-[10px] text-cyan-200 hover:bg-cyan-900/70"
            >
              Liberar vecindario ({activeInspectNode.neighborhoodSize} nodos)
            </button>
          )}
          <div className="mt-1.5 border-t border-slate-800/80 pt-1 text-[10px] text-slate-400">
            Visualizacion diagnostica interna · no certifica conciencia.
          </div>
        </div>
      )}

      {/* Ultra-Compact Bottom Floating Telemetry Strip (expandable on demand via Detalles) */}
      <div
        data-testid="network-3d-coupled-hud"
        className="pointer-events-none absolute bottom-2.5 left-2.5 right-2.5 z-10 flex flex-wrap items-end justify-between gap-2"
      >
        <div className="pointer-events-auto rounded-xl border border-cyan-500/25 bg-slate-950/75 px-2.5 py-1.5 text-[11px] text-slate-200 shadow-xl backdrop-blur-md">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded border px-1.5 py-0.5 font-mono text-[10px] font-semibold ${verdictColorClass}`}>
              {verdictShort}
            </span>
            <span className="font-mono text-cyan-300">
              {hudSummary.bridgeMode} (η={hudSummary.effectiveEta})
            </span>
            <span className="font-mono text-slate-300">
              Nodos: {hudSummary.renderCount}/{hudSummary.modelNodeCount}
            </span>
            <span className="font-mono text-teal-300">
              Sinapsis: {hudSummary.intraEdges} + {hudSummary.bridgeEdges} puente
            </span>
            <span className="font-mono text-emerald-300">{hudSummary.fps} FPS</span>
            <button
              type="button"
              data-testid="3d-hud-details-toggle"
              aria-expanded={showHudDetails}
              onClick={() => setShowHudDetails((v) => !v)}
              className="rounded border border-slate-600/70 bg-slate-900/80 px-1.5 py-0.5 font-mono text-[10px] text-slate-200 hover:bg-slate-800"
            >
              {showHudDetails ? 'Ocultar ▾' : 'Detalles ▴'}
            </button>
          </div>

          {showHudDetails && !compactMode && (
            <div className="mt-1.5 border-t border-slate-800/80 pt-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[10px] text-slate-300">
                <span>CCC: {hudSummary.ccc.toFixed(4)}</span>
                <span>Inter-sector: {hudSummary.interSectorRatio.toFixed(3)}</span>
                <span>NF-Flux: {hudSummary.nonFactorizabilityFlux.toFixed(3)}</span>
                <span>Sync N-T: {hudSummary.bridgeSyncIndex.toFixed(3)}</span>
                <span>Ret: {hudSummary.writableRetention.toFixed(2)} (≥9/16)</span>
                <span>T_d def: {hudSummary.sigmaExactDefect}</span>
              </div>
              {hudSummary.sectors.length === 4 && (
                <div className="mt-1.5 grid grid-cols-4 gap-1.5 font-mono text-[10px]">
                  {hudSummary.sectors.map((sec) => (
                    <div key={sec.key} className="rounded border border-slate-800 bg-slate-900/80 px-1.5 py-0.5">
                      <div className="flex items-center justify-between">
                        <span style={{ color: sec.accentHex }}>{sec.label}</span>
                        <span className="text-slate-300">{sec.coherence.toFixed(2)}</span>
                      </div>
                      <div className="mt-0.5 h-1 w-full overflow-hidden rounded bg-slate-800">
                        <div
                          className="h-full rounded transition-all"
                          style={{
                            width: `${Math.round(clamp01(sec.coherence) * 100)}%`,
                            backgroundColor: sec.accentHex
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-1 text-[10px] font-mono text-slate-400">
                Rombo central = Nucleo Constructivo (Torres 9/16, T_d, BodyWorld) · Visualizacion diagnostica interna · no certifica conciencia
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

NetworkScene3D.displayName = 'NetworkScene3D';

export default NetworkScene3D;
