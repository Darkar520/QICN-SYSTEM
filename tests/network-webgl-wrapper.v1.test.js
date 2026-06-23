import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const assert = (condition, message) => { if (!condition) throw new Error(message); };

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const root = path.join(__dirname, '..');

const packageJson = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const wrapperText = fs.readFileSync(path.join(root, 'src/components/NetworkCanvas.jsx'), 'utf8');
const sceneText = fs.readFileSync(path.join(root, 'src/components/NetworkScene3D.jsx'), 'utf8');
const uiText = fs.readFileSync(path.join(root, 'src/components/SimulationEngine.jsx'), 'utf8');

assert(packageJson.dependencies?.three, 'three should be an explicit runtime dependency for the WebGL nodal renderer');
assert(wrapperText.includes('NetworkScene3D'), 'NetworkCanvas wrapper should mount the WebGL renderer when available');
assert(wrapperText.includes('BaseNetworkCanvas'), 'NetworkCanvas wrapper should retain the legacy Canvas renderer as fallback');
assert(wrapperText.includes('canvas_fallback'), 'NetworkCanvas wrapper should emit fallback telemetry');
assert(!wrapperText.includes('prefers-reduced-motion'), 'reduced-motion should not force the whole renderer into Canvas fallback');
assert(sceneText.includes('prefersReducedMotion'), 'WebGL scene should handle reduced motion inside the renderer');
assert(sceneText.includes("renderer_mode: 'webgl_three'"), 'WebGL renderer should report visual-only renderer_mode telemetry');
assert(sceneText.includes('OrbitControls'), 'WebGL renderer should use native OrbitControls for real 3D interaction');
assert(sceneText.includes('EffectComposer'), 'WebGL renderer should use EffectComposer for controlled desktop/tablet bloom');
assert(sceneText.includes('UnrealBloomPass'), 'WebGL renderer should include adaptive bloom for luminous nodal depth');
assert(sceneText.includes('InstancedMesh'), 'WebGL renderer should use InstancedMesh for real spherical repeated nodes');
assert(sceneText.includes('SphereGeometry'), 'WebGL renderer should render nodes as lit sphere geometry');
assert(sceneText.includes('MeshPhongMaterial'), 'WebGL renderer should use Phong shading for specular nodal volume');
assert(sceneText.includes('AmbientLight'), 'WebGL renderer should include ambient light for spherical node depth');
assert(sceneText.includes('DirectionalLight'), 'WebGL renderer should include directional light for specular highlights');
assert(sceneText.includes('PointLight'), 'WebGL renderer should include a core point light for attractor glow');
assert(sceneText.includes('ShaderMaterial'), 'WebGL renderer should retain ShaderMaterial for pulsed edges and nebula rendering');
assert(sceneText.includes('NEBULA_FRAGMENT_SHADER'), 'WebGL renderer should define a procedural nebula shader');
assert(sceneText.includes('EDGE_VERTEX_SHADER'), 'WebGL renderer should define a pulsed edge shader');
assert(!sceneText.includes('createNodeShaderMaterial'), 'WebGL renderer should not regress to flat point sprites for nodes');
assert(sceneText.includes('BufferGeometry'), 'WebGL renderer should use BufferGeometry for lightweight stars/edges');
assert(sceneText.includes('pixelRatio') || sceneText.includes('setPixelRatio'), 'WebGL renderer should clamp pixel ratio for performance');
assert(sceneText.includes('setHSL(145 / 360'), 'WebGL renderer should reserve emerald nodes for high-coherence core accents');
assert(sceneText.includes('const hue = 290 +'), 'WebGL renderer should use the unified magenta/violet nodal palette');
assert(sceneText.includes('createOrbitRings'), 'WebGL renderer should include lightweight orbital depth geometry');
assert(sceneText.includes('webglcontextlost'), 'WebGL renderer should handle context loss and request Canvas fallback');
assert(sceneText.includes('deepDispose'), 'WebGL renderer should dispose GPU resources on unmount');
assert(sceneText.includes('composer?.dispose'), 'WebGL renderer should dispose composer render targets on unmount');
assert(sceneText.includes('bloomPass?.dispose'), 'WebGL renderer should explicitly dispose bloom pass resources on unmount');
assert(uiText.includes("import NetworkCanvas from './NetworkCanvas.jsx';"), 'SimulationEngine should import the guarded NetworkCanvas wrapper');

console.log('OK: network WebGL wrapper guards passed');
