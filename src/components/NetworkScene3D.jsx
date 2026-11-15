import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';

const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
const fract = (value) => value - Math.floor(value);
const pseudoRandomUnit = (a, b = 0) => fract(Math.sin((a * 12.9898) + (b * 78.233)) * 43758.5453123);

const BOUNDARY_TEXT =
  'Visualizacion diagnostica interna: proyeccion WebGL finita del runtime; no certifica conciencia, experiencia, subjetividad ni validacion externa.';

const EDGE_VERTEX_SHADER = `
  attribute vec3 color;
  attribute float edgePhase;
  uniform float time;
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    vColor = color;
    float wave = sin((time * 2.2) + edgePhase * 6.28318);
    vAlpha = 0.26 + smoothstep(-0.25, 1.0, wave) * 0.36;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const EDGE_FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vAlpha;

  void main() {
    gl_FragColor = vec4(vColor, vAlpha);
  }
`;

const NEBULA_VERTEX_SHADER = `
  varying vec2 vUv;

  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const NEBULA_FRAGMENT_SHADER = `
  uniform float time;
  uniform vec2 resolution;
  varying vec2 vUv;

  float noise(in vec2 p) {
    return fract(sin(p.x * 12.9898 + p.y * 78.233) * 43758.5453123);
  }

  float softNoise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    float a = noise(i);
    float b = noise(i + vec2(1.0, 0.0));
    float c = noise(i + vec2(0.0, 1.0));
    float d = noise(i + vec2(1.0, 1.0));
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(a, b, u.x) + (c - a) * u.y * (1.0 - u.x) + (d - b) * u.x * u.y;
  }

  void main() {
    vec2 uv = vUv - vec2(0.5);
    uv.x *= resolution.x / max(1.0, resolution.y);
    float dist = length(uv);
    float drift = time * 0.035;
    float gasA = softNoise((uv * 3.2) + vec2(drift, -drift * 0.7));
    float gasB = softNoise((uv * 7.0) + vec2(-drift * 0.55, drift * 0.8));
    float waveCyan = sin(time * 0.23 + dist * 8.0 + gasA * 2.4) * 0.5 + 0.5;
    float waveViolet = cos(time * 0.17 - dist * 11.5 + gasB * 3.1) * 0.5 + 0.5;

    vec3 colorCyan = vec3(0.015, 0.42, 0.58) * waveCyan;
    vec3 colorViolet = vec3(0.36, 0.045, 0.52) * waveViolet;
    vec3 colorAmber = vec3(0.58, 0.25, 0.035) * smoothstep(0.70, 0.96, gasB) * 0.45;
    vec3 finalNebula = (colorCyan + colorViolet + colorAmber) * (1.0 - smoothstep(0.22, 0.86, dist)) * 0.42;

    float star = noise(gl_FragCoord.xy * 0.014 + time * 0.8) > 0.996 ? 0.48 : 0.0;
    finalNebula += vec3(star);
    gl_FragColor = vec4(finalNebula, 0.68);
  }
`;

const supportsWebGL = () => {
  if (typeof document === 'undefined') return false;
  try {
    const canvas = document.createElement('canvas');
    return !!(canvas.getContext('webgl2') || canvas.getContext('webgl'));
  } catch (_error) {
    return false;
  }
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined'
    && window.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches === true;

const createLineMaterial = () =>
  new THREE.ShaderMaterial({
    vertexShader: EDGE_VERTEX_SHADER,
    fragmentShader: EDGE_FRAGMENT_SHADER,
    uniforms: { time: { value: 0 } },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

const colorForNode = (node, index = 0) => {
  const coherence = clamp(Number(node?.coherenceState) || 0, 0, 1);
  const intensity = clamp(Number(node?.intensity) || 0, 0, 1);
  if (coherence > 0.82 && index % 5 === 0) {
    return new THREE.Color().setHSL(145 / 360, 0.95, 0.38);
  }

  const hue = 290 + (pseudoRandomUnit(index, 17) * 45);
  const saturation = 0.85 + Math.max(coherence, intensity) * 0.15;
  const light = 0.52 + clamp(intensity, 0, 1) * 0.26;
  return new THREE.Color().setHSL(hue / 360, saturation, light);
};

const colorForEdge = (node, index = 0) => {
  const color = colorForNode(node, index);
  color.offsetHSL(0, -0.12, -0.32);
  return color;
};

const toRenderableNodes = (nodalLayer, viewportMode) => {
  const targetCount = viewportMode === 'mobile' ? 80 : viewportMode === 'tablet' ? 120 : 150;
  const layer = nodalLayer?.current || nodalLayer;
  const source =
    layer?.getHighlyCoherentNodes?.(targetCount)
    || layer?.getActiveNodes?.()
    || [];
  const nodes = Array.isArray(source) ? source.filter(Boolean).slice(0, targetCount) : [];
  if (nodes.length > 0) return nodes;

  return Array.from({ length: Math.min(72, targetCount) }, (_, index) => {
    const angle = (index / 72) * Math.PI * 2;
    const arm = index % 6;
    const radius = 70 + arm * 28 + pseudoRandomUnit(index, 2) * 64;
    return {
      id: 900000 + index,
      x: Math.cos(angle + arm * 0.42) * radius,
      y: Math.sin(angle + arm * 0.42) * radius,
      z: (pseudoRandomUnit(index, 5) - 0.5) * 190,
      coherenceState: 0.56 + pseudoRandomUnit(index, 7) * 0.39,
      intensity: 0.45 + pseudoRandomUnit(index, 11) * 0.5,
      phase: angle,
      connections: []
    };
  });
};

const computeNodePosition = (node, index, count, tick) => {
  const u = pseudoRandomUnit(index, 1);
  const v = pseudoRandomUnit(index, 2);
  const theta = u * 2.0 * Math.PI;
  const phi = Math.acos((2.0 * v) - 1.0);
  const r = 40 + Math.pow(pseudoRandomUnit(index, 3), 1.6) * 165;
  const drift = Math.sin((tick * 0.012) + index * 0.45) * 5;
  const harmonic = Math.cos((tick * 0.008) + index * 0.31) * 3;

  return new THREE.Vector3(
    (Math.sin(phi) * Math.cos(theta) * r) + drift,
    (Math.sin(phi) * Math.sin(theta) * r) + harmonic,
    Math.cos(phi) * r
  );
};

const buildEdges = (nodes, positions, maxEdges) => {
  const edges = [];
  const seen = new Set();

  const pushEdge = (a, b) => {
    if (!Number.isInteger(a) || !Number.isInteger(b) || a === b) return;
    if (!positions[a] || !positions[b]) return;
    const key = a < b ? `${a}:${b}` : `${b}:${a}`;
    if (seen.has(key) || edges.length >= maxEdges) return;
    seen.add(key);
    edges.push([a, b]);
  };

  for (let i = 0; i < nodes.length && edges.length < maxEdges; i++) {
    const origin = positions[i];
    if (!origin) continue;
    const nearest = [];
    for (let j = 0; j < nodes.length; j++) {
      if (i === j || !positions[j]) continue;
      const distance = origin.distanceTo(positions[j]);
      if (distance < 112) nearest.push({ index: j, distance });
    }
    nearest.sort((a, b) => a.distance - b.distance);
    pushEdge(i, nearest[0]?.index);
    if (i % 4 === 0) pushEdge(i, nearest[1]?.index);
    if (i % 17 === 0) pushEdge(i, Math.floor(nodes.length * pseudoRandomUnit(i, 44)));
  }

  return edges;
};

const createOrbitRings = (viewportMode) => {
  const ringGroup = new THREE.Group();
  const segments = viewportMode === 'mobile' ? 96 : 160;
  const configs = [
    { rx: 330, ry: 156, z: -28, hue: 0.82, opacity: 0.22, tilt: 0.18 },
    { rx: 260, ry: 122, z: 34, hue: 0.52, opacity: 0.21, tilt: -0.12 },
    { rx: 210, ry: 88, z: 86, hue: 0.41, opacity: 0.16, tilt: 0.34 }
  ];

  configs.forEach((config, ringIndex) => {
    const positions = new Float32Array((segments + 1) * 3);
    for (let i = 0; i <= segments; i++) {
      const t = (i / segments) * Math.PI * 2;
      positions[i * 3] = Math.cos(t) * config.rx;
      positions[i * 3 + 1] = Math.sin(t) * config.ry;
      positions[i * 3 + 2] = config.z + Math.sin(t * 2 + ringIndex) * 20;
    }
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color().setHSL(config.hue, 0.96, 0.62),
      transparent: true,
      opacity: config.opacity,
      blending: THREE.AdditiveBlending,
      depthWrite: false
    });
    const ring = new THREE.Line(geometry, material);
    ring.rotation.x = config.tilt;
    ring.rotation.z = -0.16 + ringIndex * 0.31;
    ringGroup.add(ring);
  });

  return ringGroup;
};

const createNodeMaterial = () =>
  new THREE.MeshPhongMaterial({
    color: 0xffffff,
    shininess: 95,
    specular: new THREE.Color(0xffffff),
    emissive: new THREE.Color(0x12001f),
    transparent: true,
    opacity: 0.94,
    vertexColors: true
  });

const createSelectedHaloMaterial = () =>
  new THREE.MeshBasicMaterial({
    color: 0xa5f3fc,
    transparent: true,
    opacity: 0.24,
    blending: THREE.AdditiveBlending,
    depthWrite: false
  });

const deepDispose = (object) => {
  object?.traverse?.((child) => {
    if (child.geometry) child.geometry.dispose();
    const materials = Array.isArray(child.material) ? child.material : [child.material];
    materials.filter(Boolean).forEach((material) => {
      Object.values(material).forEach((value) => {
        if (value && typeof value.dispose === 'function') value.dispose();
      });
      material.dispose?.();
    });
  });
};

const NetworkScene3D = React.memo(({
  nodalLayer,
  ontologicalState,
  isRunning,
  onTelemetry,
  tick = 0,
  viewportMode = 'desktop',
  touchEnabled = false,
  onFallback
}) => {
  const hostRef = useRef(null);
  const rendererRef = useRef(null);
  const composerRef = useRef(null);
  const sceneRef = useRef(null);
  const cameraRef = useRef(null);
  const networkGroupRef = useRef(null);
  const nodesMeshRef = useRef(null);
  const selectedHaloRef = useRef(null);
  const controlsRef = useRef(null);
  const animationRef = useRef(0);
  const frameStatsRef = useRef({ last: 0, frames: 0, fps: 0, lastTelemetry: 0 });
  const renderDataRef = useRef({ nodes: [], positions: [], nodeCount: 0, edgeCount: 0, selectedIndex: -1 });
  const tickRef = useRef(tick);
  const isRunningRef = useRef(isRunning);
  const [hud, setHud] = useState({ fps: 0, zoom: 1, selected: null, quality: 'high', fallbackReason: '' });
  const [isReady, setIsReady] = useState(false);

  const quality = useMemo(() => {
    if (viewportMode === 'mobile') return { tier: 'low', dpr: 1, maxNodes: 80, maxEdges: 80, starCount: 320 };
    if (viewportMode === 'tablet') return { tier: 'medium', dpr: 1.25, maxNodes: 120, maxEdges: 120, starCount: 520 };
    return { tier: 'high', dpr: 1.5, maxNodes: 160, maxEdges: 155, starCount: 760 };
  }, [viewportMode]);

  const emitTelemetry = useCallback((extra = {}) => {
    const data = renderDataRef.current;
    onTelemetry?.({
      renderer_mode: 'webgl_three',
      renderer_version: 'instanced_spherical_bloom_v1',
      boundary: BOUNDARY_TEXT,
      quality: quality.tier,
      visible_nodes: data.nodeCount,
      visible_edges: data.edgeCount,
      selected_node: data.nodes[data.selectedIndex]?.id ?? null,
      ...extra
    });
  }, [onTelemetry, quality.tier]);

  const resetCamera = useCallback(() => {
    const camera = cameraRef.current;
    const group = networkGroupRef.current;
    const controls = controlsRef.current;
    if (!camera || !group) return;
    camera.position.set(0, 0, viewportMode === 'mobile' ? 820 : 720);
    group.rotation.set(-0.14, 0.16, 0.01);
    controls?.target.set(0, 0, 0);
    controls?.update();
    setHud((prev) => ({ ...prev, zoom: 1 }));
  }, [viewportMode]);

  useEffect(() => { tickRef.current = tick; }, [tick]);
  useEffect(() => { isRunningRef.current = isRunning; }, [isRunning]);

  useEffect(() => {
    const host = hostRef.current;
    if (!host || !supportsWebGL()) {
      onFallback?.('webgl_unavailable');
      return undefined;
    }

    let disposed = false;
    const reducedMotion = prefersReducedMotion();
    const width = Math.max(320, host.clientWidth || 900);
    const height = Math.max(280, host.clientHeight || 520);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(42, width / height, 1, 2600);
    camera.position.set(0, 0, viewportMode === 'mobile' ? 820 : 720);
    const renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
      depth: true
    });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
    renderer.setSize(width, height, false);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 0.78;
    renderer.domElement.className = 'absolute inset-0 h-full w-full';
    renderer.domElement.setAttribute('aria-hidden', 'true');
    host.appendChild(renderer.domElement);

    const composer = viewportMode === 'mobile' ? null : new EffectComposer(renderer);
    let renderPass = null;
    let bloomPass = null;
    if (composer) {
      const bloomStrength = viewportMode === 'tablet' ? 0.78 : 1.15;
      const bloomRadius = viewportMode === 'tablet' ? 0.28 : 0.46;
      renderPass = new RenderPass(scene, camera);
      bloomPass = new UnrealBloomPass(new THREE.Vector2(width, height), bloomStrength, bloomRadius, 0.15);
      composer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
      composer.setSize(width, height);
      composer.addPass(renderPass);
      composer.addPass(bloomPass);
    }

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = reducedMotion ? 0.12 : 0.05;
    // Let the page scroll when the pointer is over the visualisation.
    // The explicit + / - controls continue to adjust the camera.
    controls.enableZoom = false;
    controls.zoomSpeed = 1.05;
    controls.enablePan = true;
    controls.panSpeed = 0.55;
    controls.minDistance = viewportMode === 'mobile' ? 430 : 360;
    controls.maxDistance = viewportMode === 'mobile' ? 1220 : 1180;
    controls.maxPolarAngle = Math.PI / 2 + 0.22;
    controls.target.set(0, 0, 0);

    const backgroundGroup = new THREE.Group();
    const networkGroup = new THREE.Group();
    networkGroup.rotation.set(-0.14, 0.16, 0.01);
    scene.add(backgroundGroup);
    scene.add(networkGroup);

    const ambientLight = new THREE.AmbientLight(0x0c1033, 1.4);
    const dirLight = new THREE.DirectionalLight(0xffffff, 2.8);
    dirLight.position.set(180, 280, 360);
    const corePointLight = new THREE.PointLight(0xd946ef, 3.2, 450);
    corePointLight.position.set(0, 0, 0);
    scene.add(ambientLight);
    scene.add(dirLight);
    scene.add(corePointLight);

    const nebulaUniforms = {
      time: { value: 0 },
      resolution: { value: new THREE.Vector2(width, height) }
    };
    const nebulaMaterial = new THREE.ShaderMaterial({
      vertexShader: NEBULA_VERTEX_SHADER,
      fragmentShader: NEBULA_FRAGMENT_SHADER,
      uniforms: nebulaUniforms,
      transparent: true,
      depthWrite: false,
      depthTest: false
    });
    const nebula = new THREE.Mesh(new THREE.PlaneGeometry(2100, 1200), nebulaMaterial);
    nebula.position.set(0, 0, -780);
    backgroundGroup.add(nebula);

    const starGeometry = new THREE.BufferGeometry();
    const starPositions = new Float32Array(quality.starCount * 3);
    const starColors = new Float32Array(quality.starCount * 3);
    for (let i = 0; i < quality.starCount; i++) {
      const angle = pseudoRandomUnit(i, 1) * Math.PI * 2;
      const radius = 260 + pseudoRandomUnit(i, 2) * 840;
      starPositions[i * 3] = Math.cos(angle) * radius;
      starPositions[i * 3 + 1] = (pseudoRandomUnit(i, 3) - 0.5) * 620;
      starPositions[i * 3 + 2] = -520 + pseudoRandomUnit(i, 4) * 720;
      const c = new THREE.Color().setHSL(0.52 + pseudoRandomUnit(i, 5) * 0.32, 0.74, 0.62 + pseudoRandomUnit(i, 6) * 0.28);
      starColors[i * 3] = c.r;
      starColors[i * 3 + 1] = c.g;
      starColors[i * 3 + 2] = c.b;
    }
    starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
    starGeometry.setAttribute('color', new THREE.BufferAttribute(starColors, 3));
    const stars = new THREE.Points(
      starGeometry,
      new THREE.PointsMaterial({
        size: viewportMode === 'mobile' ? 1.5 : 1.9,
        vertexColors: true,
        transparent: true,
        opacity: 0.42,
        blending: THREE.AdditiveBlending,
        depthWrite: false
      })
    );
    backgroundGroup.add(stars);

    const ringGroup = createOrbitRings(viewportMode);
    networkGroup.add(ringGroup);

    const nodeGeometry = new THREE.SphereGeometry(1, 18, 12);
    const nodeMaterial = createNodeMaterial();
    const nodesMesh = new THREE.InstancedMesh(nodeGeometry, nodeMaterial, quality.maxNodes);
    nodesMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    nodesMesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(quality.maxNodes * 3), 3);
    nodesMesh.instanceColor.setUsage(THREE.DynamicDrawUsage);
    nodesMesh.count = 0;
    nodesMesh.renderOrder = 4;
    networkGroup.add(nodesMesh);

    const selectedHalo = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 18), createSelectedHaloMaterial());
    selectedHalo.scale.setScalar(32);
    selectedHalo.visible = false;
    selectedHalo.renderOrder = 6;
    networkGroup.add(selectedHalo);

    const lineGeometry = new THREE.BufferGeometry();
    const linePositions = new Float32Array(quality.maxEdges * 2 * 3);
    const lineColors = new Float32Array(quality.maxEdges * 2 * 3);
    const linePhases = new Float32Array(quality.maxEdges * 2);
    lineGeometry.setAttribute('position', new THREE.BufferAttribute(linePositions, 3));
    lineGeometry.setAttribute('color', new THREE.BufferAttribute(lineColors, 3));
    lineGeometry.setAttribute('edgePhase', new THREE.BufferAttribute(linePhases, 1));
    lineGeometry.setDrawRange(0, 0);
    const lineSegments = new THREE.LineSegments(lineGeometry, createLineMaterial());
    lineSegments.renderOrder = 3;
    networkGroup.add(lineSegments);

    const nodeTransform = new THREE.Object3D();

    const rebuildNetwork = () => {
      if (disposed) return;
      const tickNow = tickRef.current;
      const nodes = toRenderableNodes(nodalLayer, viewportMode).slice(0, quality.maxNodes);
      const positions = nodes.map((node, index) => computeNodePosition(node, index, nodes.length, tickNow));
      const edges = buildEdges(nodes, positions, quality.maxEdges);

      for (let i = 0; i < quality.maxNodes; i++) {
        const node = nodes[i];
        const position = positions[i];
        if (!node || !position) {
          nodeTransform.position.set(99999, 99999, 99999);
          nodeTransform.scale.setScalar(0.001);
          nodeTransform.updateMatrix();
          nodesMesh.setMatrixAt(i, nodeTransform.matrix);
          nodesMesh.instanceColor.setXYZ(i, 0, 0, 0);
          continue;
        }
        const color = colorForNode(node, i);
        const coherence = clamp(Number(node?.coherenceState) || 0, 0, 1);
        const intensity = clamp(Number(node?.intensity) || 0, 0, 1);
        const heroBoost = i === 0 ? 8 : i % 31 === 0 ? 4 : 0;
        const radius = 6.5 + Math.max(coherence, intensity, 0.32) * 10.5 + heroBoost;
        nodeTransform.position.copy(position);
        nodeTransform.scale.setScalar(radius);
        nodeTransform.updateMatrix();
        nodesMesh.setMatrixAt(i, nodeTransform.matrix);
        nodesMesh.instanceColor.setXYZ(i, color.r, color.g, color.b);
      }
      nodesMesh.count = nodes.length;
      nodesMesh.instanceMatrix.needsUpdate = true;
      nodesMesh.instanceColor.needsUpdate = true;
      nodesMesh.computeBoundingSphere();

      const edgePositionAttr = lineGeometry.getAttribute('position');
      const edgeColorAttr = lineGeometry.getAttribute('color');
      const edgePhaseAttr = lineGeometry.getAttribute('edgePhase');
      edges.forEach(([a, b], edgeIndex) => {
        const aPos = positions[a];
        const bPos = positions[b];
        const edgeColorA = colorForEdge(nodes[a], a);
        const edgeColorB = colorForEdge(nodes[b], b);
        const phase = pseudoRandomUnit(edgeIndex, 81);
        edgePositionAttr.setXYZ(edgeIndex * 2, aPos.x, aPos.y, aPos.z);
        edgePositionAttr.setXYZ(edgeIndex * 2 + 1, bPos.x, bPos.y, bPos.z);
        edgeColorAttr.setXYZ(edgeIndex * 2, edgeColorA.r, edgeColorA.g, edgeColorA.b);
        edgeColorAttr.setXYZ(edgeIndex * 2 + 1, edgeColorB.r, edgeColorB.g, edgeColorB.b);
        edgePhaseAttr.setX(edgeIndex * 2, phase);
        edgePhaseAttr.setX(edgeIndex * 2 + 1, phase + 0.42);
      });
      for (let i = edges.length; i < quality.maxEdges; i++) {
        edgePositionAttr.setXYZ(i * 2, 99999, 99999, 99999);
        edgePositionAttr.setXYZ(i * 2 + 1, 99999, 99999, 99999);
        edgeColorAttr.setXYZ(i * 2, 0, 0, 0);
        edgeColorAttr.setXYZ(i * 2 + 1, 0, 0, 0);
        edgePhaseAttr.setX(i * 2, 0);
        edgePhaseAttr.setX(i * 2 + 1, 0);
      }
      lineGeometry.setDrawRange(0, edges.length * 2);
      edgePositionAttr.needsUpdate = true;
      edgeColorAttr.needsUpdate = true;
      edgePhaseAttr.needsUpdate = true;
      lineGeometry.computeBoundingSphere();

      renderDataRef.current = {
        ...renderDataRef.current,
        nodes,
        positions,
        nodeCount: nodes.length,
        edgeCount: edges.length
      };
      emitTelemetry({ visible_nodes: nodes.length, visible_edges: edges.length });
    };

    const resize = () => {
      if (!host || disposed) return;
      const nextWidth = Math.max(320, host.clientWidth || width);
      const nextHeight = Math.max(280, host.clientHeight || height);
      camera.aspect = nextWidth / nextHeight;
      camera.updateProjectionMatrix();
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
      renderer.setSize(nextWidth, nextHeight, false);
      composer?.setPixelRatio(Math.min(window.devicePixelRatio || 1, quality.dpr));
      composer?.setSize(nextWidth, nextHeight);
      bloomPass?.setSize?.(nextWidth, nextHeight);
      nebulaUniforms.resolution.value.set(nextWidth, nextHeight);
    };

    const handleContextLost = (event) => {
      event.preventDefault();
      onFallback?.('webgl_context_lost');
      setHud((prev) => ({ ...prev, fallbackReason: 'webgl_context_lost' }));
    };

    renderer.domElement.addEventListener('webglcontextlost', handleContextLost, false);
    const resizeObserver = new ResizeObserver(resize);
    resizeObserver.observe(host);

    sceneRef.current = scene;
    rendererRef.current = renderer;
    composerRef.current = composer;
    cameraRef.current = camera;
    networkGroupRef.current = networkGroup;
    nodesMeshRef.current = nodesMesh;
    selectedHaloRef.current = selectedHalo;
    controlsRef.current = controls;
    setIsReady(true);
    rebuildNetwork();

    let lastBuildTick = -1;
    const animate = (now = 0) => {
      if (disposed) return;
      animationRef.current = requestAnimationFrame(animate);
      const stats = frameStatsRef.current;
      stats.frames += 1;
      if (!stats.last) stats.last = now;
      let currentZoom = clamp(720 / Math.max(1, camera.position.length()), 0.45, 1.9);
      if (now - stats.last >= 1000) {
        stats.fps = Math.round((stats.frames * 1000) / (now - stats.last));
        stats.frames = 0;
        stats.last = now;
        currentZoom = clamp(720 / Math.max(1, camera.position.length()), 0.45, 1.9);
        setHud((prev) => ({ ...prev, fps: stats.fps, zoom: Number(currentZoom.toFixed(2)), quality: quality.tier }));
      }

      if (lastBuildTick !== tickRef.current) {
        lastBuildTick = tickRef.current;
        rebuildNetwork();
      }

      const t = now * 0.001;
      nebulaUniforms.time.value = t;
      lineSegments.material.uniforms.time.value = t;
      if (!reducedMotion && isRunningRef.current) {
        networkGroup.rotation.y += 0.0009;
        ringGroup.rotation.z += 0.0005;
        stars.rotation.z -= 0.00018;
      }
      controls.update();
      if (composer) {
        composer.render();
      } else {
        renderer.render(scene, camera);
      }
      if (now - stats.lastTelemetry > 1400) {
        stats.lastTelemetry = now;
        emitTelemetry({ fps: stats.fps, camera_zoom: Number(currentZoom.toFixed(2)) });
      }
    };
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      disposed = true;
      cancelAnimationFrame(animationRef.current);
      resizeObserver.disconnect();
      renderer.domElement.removeEventListener('webglcontextlost', handleContextLost);
      controls.dispose();
      if (renderer.domElement.parentElement === host) host.removeChild(renderer.domElement);
      bloomPass?.dispose?.();
      renderPass?.dispose?.();
      composer?.dispose?.();
      deepDispose(scene);
      renderer.dispose();
      rendererRef.current = null;
      composerRef.current = null;
      sceneRef.current = null;
      cameraRef.current = null;
      networkGroupRef.current = null;
      nodesMeshRef.current = null;
      selectedHaloRef.current = null;
      controlsRef.current = null;
      setIsReady(false);
    };
  }, [emitTelemetry, nodalLayer, onFallback, quality, viewportMode]);

  const handleClick = useCallback((event) => {
    const host = hostRef.current;
    const camera = cameraRef.current;
    const nodesMesh = nodesMeshRef.current;
    if (!host || !camera || !nodesMesh) return;

    const rect = host.getBoundingClientRect();
    const pointer = new THREE.Vector2(
      ((event.clientX - rect.left) / Math.max(1, rect.width)) * 2 - 1,
      -(((event.clientY - rect.top) / Math.max(1, rect.height)) * 2 - 1)
    );
    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(pointer, camera);
    const hits = raycaster.intersectObject(nodesMesh);
    if (hits.length === 0) return;

    const index = Number.isInteger(hits[0].instanceId) ? hits[0].instanceId : hits[0].index;
    const data = renderDataRef.current;
    const selectedNode = data.nodes[index] || null;
    const selectedPosition = data.positions[index] || null;
    if (!selectedNode || !selectedPosition) return;
    renderDataRef.current = { ...data, selectedIndex: index };
    const selectedHalo = selectedHaloRef.current;
    if (selectedHalo) {
      selectedHalo.position.copy(selectedPosition);
      selectedHalo.scale.setScalar(viewportMode === 'mobile' ? 38 : 32);
      selectedHalo.visible = true;
    }
    setHud((prev) => ({ ...prev, selected: selectedNode }));
    emitTelemetry({ selected_node: selectedNode.id ?? index, selection_mode: 'diagnostic_visual_only' });
  }, [emitTelemetry, viewportMode]);

  const handleDoubleClick = useCallback(() => {
    renderDataRef.current = { ...renderDataRef.current, selectedIndex: -1 };
    if (selectedHaloRef.current) selectedHaloRef.current.visible = false;
    setHud((prev) => ({ ...prev, selected: null }));
    resetCamera();
  }, [resetCamera]);

  return (
    <div
      ref={hostRef}
      role="application"
      aria-label="Red nodal WebGL 3D interactiva: arrastra para rotar, usa los botones para acercar y click para fijar un nodo."
      className="relative h-full min-h-[320px] max-w-full overflow-hidden rounded-2xl border border-cyan-400/55 bg-[#020713] shadow-[0_0_30px_rgba(34,211,238,0.24),inset_0_0_42px_rgba(14,165,233,0.10)]"
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onContextMenu={(event) => event.preventDefault()}
      data-testid="network-scene-3d"
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_49%_52%,rgba(34,211,238,0.13),transparent_35%),radial-gradient(circle_at_68%_70%,rgba(217,70,239,0.13),transparent_34%),linear-gradient(135deg,rgba(6,182,212,0.10),transparent_32%,rgba(168,85,247,0.10))]" />

      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex items-center gap-2 text-[10px] font-bold">
        <button type="button" onClick={(event) => { event.stopPropagation(); cameraRef.current?.position.multiplyScalar(0.88); controlsRef.current?.update(); }} className="rounded-md border border-cyan-500/50 bg-cyan-950/65 px-2 py-1 text-cyan-100 hover:bg-cyan-800/80">+</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); cameraRef.current?.position.multiplyScalar(1.12); controlsRef.current?.update(); }} className="rounded-md border border-cyan-500/50 bg-cyan-950/65 px-2 py-1 text-cyan-100 hover:bg-cyan-800/80">-</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); resetCamera(); }} className="rounded-md border border-slate-500/60 bg-slate-950/78 px-3 py-1 text-slate-100 hover:bg-slate-800">RESET</button>
        <button type="button" onClick={(event) => { event.stopPropagation(); resetCamera(); emitTelemetry({ action: 'reactivar_3d_engine' }); }} className="rounded-md border border-amber-500/70 bg-amber-950/55 px-3 py-1 text-amber-200 shadow-[0_0_12px_rgba(245,158,11,0.25)] hover:bg-amber-800/70">REACTIVAR</button>
      </div>

      <div className="pointer-events-none absolute right-4 top-4 z-10 flex flex-wrap justify-end gap-2 text-[10px] font-mono">
        <span className="rounded border border-cyan-500/55 bg-cyan-950/50 px-3 py-1 text-cyan-100">WEBGL INSTANCED SPHERE v1 Active</span>
        <span className="rounded border border-fuchsia-500/45 bg-fuchsia-950/48 px-3 py-1 text-fuchsia-100">{hud.fps || 0} FPS</span>
        <span className="rounded border border-emerald-500/45 bg-emerald-950/48 px-3 py-1 text-emerald-100">Z {hud.zoom.toFixed(2)}x</span>
        <span className="rounded border border-amber-500/45 bg-amber-950/48 px-3 py-1 text-amber-100">THREAD: MAIN</span>
        <span className="rounded border border-teal-500/45 bg-teal-950/48 px-3 py-1 text-teal-100">DINAMICA ACTIVA</span>
      </div>

      <div className="pointer-events-none absolute right-5 top-16 z-10 text-right font-mono text-[9px] leading-5 text-cyan-100/80">
        <p>Nodos visibles: {renderDataRef.current.nodeCount}</p>
        <p>H {Math.round((ontologicalState?.resilience || 0) * 100)} | E {renderDataRef.current.edgeCount} | P {renderDataRef.current.nodeCount}</p>
      </div>

      {hud.selected && (
        <div className="pointer-events-none absolute left-5 top-16 z-20 max-w-[260px] rounded-xl border border-cyan-300/50 bg-slate-950/86 p-3 text-xs text-slate-100 shadow-[0_0_24px_rgba(34,211,238,0.22)]">
          <p className="mb-1 font-bold text-cyan-200">Nodo fijado #{hud.selected.id ?? 'sin-id'}</p>
          <p>Coherencia: {(clamp(Number(hud.selected.coherenceState) || 0, 0, 1) * 100).toFixed(1)}%</p>
          <p>Intensidad: {(clamp(Number(hud.selected.intensity) || 0, 0, 1) * 100).toFixed(1)}%</p>
          <p className="mt-2 text-[10px] text-slate-400">Diagnostico visual interno; no promueve gates.</p>
        </div>
      )}

      <div className="pointer-events-none absolute inset-x-0 bottom-8 z-10 text-center font-mono text-[10px] uppercase tracking-[0.38em] text-slate-400/70">
        Arrastrar: rotar | Botones +/−: zoom | Shift/click derecho: pan | Doble click: reset vista
      </div>

      <div className="pointer-events-none absolute bottom-4 left-5 right-5 z-10 flex flex-col gap-1 font-mono text-[9px] text-slate-300/85 sm:flex-row sm:items-end sm:justify-between">
        <p>{BOUNDARY_TEXT}</p>
        <p className="text-cyan-200">{isReady ? `Calidad ${quality.tier}` : 'Inicializando WebGL'}</p>
      </div>

      {!isReady && (
        <div className="absolute inset-0 grid place-items-center bg-slate-950/82 text-cyan-100">
          <div className="rounded-xl border border-cyan-500/30 bg-slate-950/80 px-4 py-3 text-sm shadow-[0_0_30px_rgba(34,211,238,0.18)]">
            Inicializando motor WebGL diagnostico...
          </div>
        </div>
      )}

      {hud.fallbackReason && (
        <div className="absolute bottom-14 left-5 rounded-lg border border-amber-400/50 bg-amber-950/80 px-3 py-2 text-xs text-amber-100">
          Fallback solicitado: {hud.fallbackReason}
        </div>
      )}
    </div>
  );
});

NetworkScene3D.displayName = 'NetworkScene3D';

export default NetworkScene3D;
