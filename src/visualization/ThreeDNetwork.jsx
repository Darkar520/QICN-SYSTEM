
import React, { useRef, useCallback, useEffect, useState } from 'react';
const Connection = ({ start, end, weight, coherence }) => {
  const ref = useRef();

  useFrame((state) => {
    if (ref.current) {
      const pulse = 1 + Math.sin(state.clock.elapsedTime * 5 + start.x) * 0.1 * weight;
      ref.current.scale.set(pulse, pulse, 1);
    }
  });

  const points = [start, end];
  const tubeGeometry = new THREE.TubeGeometry(
    new THREE.CatmullRomCurve3(points),
    2,
    0.05 * weight,
    8,
    false
  );

  return (
    <mesh ref={ref} geometry={tubeGeometry}>
      <meshBasicMaterial color="#a855f7" transparent opacity={coherence * 0.5} />
    </mesh>
  );
};
const CognitiveTriadVisualizer = ({ triad }) => {
  const { modelOfSelf, modelOfReality, modelOfRelationship } = triad;

  return (
    <group position={[0, 0, 0]}>
      {/* Model of Self */}
      <mesh position={[-10, 10, 0]}>
        <sphereGeometry args={[modelOfSelf * 5, 32, 32]} />
        <meshStandardMaterial color="hotpink" emissive="hotpink" emissiveIntensity={modelOfSelf} />
      </mesh>
      {/* Model of Reality */}
      <mesh position={[10, 10, 0]}>
        <sphereGeometry args={[modelOfReality * 5, 32, 32]} />
        <meshStandardMaterial color="lightgreen" emissive="lightgreen" emissiveIntensity={modelOfReality} />
      </mesh>
      {/* Model of Relationship */}
      <mesh position={[0, -10, 0]}>
        <sphereGeometry args={[modelOfRelationship * 5, 32, 32]} />
        <meshStandardMaterial color="skyblue" emissive="skyblue" emissiveIntensity={modelOfRelationship} />
      </mesh>
    </group>
  );
};
const FuelFlow = ({ visualNodes, allNodes, isAscended }) => {
  const pointsRef = useRef();

  useFrame((state, delta) => {
    if (pointsRef.current) {
      const positions = pointsRef.current.geometry.attributes.position.array;
      for (let i = 0; i < positions.length; i += 3) {
        // Simple animation logic: move particles along the y-axis
        positions[i + 1] += 5 * delta;
        if (positions[i + 1] > 50) {
          positions[i + 1] = -50;
        }
      }
      pointsRef.current.geometry.attributes.position.needsUpdate = true;
    }
  });

  const particles = useMemo(() => {
    const tempParticles = [];
    visualNodes.forEach(node => {
      node.connections.forEach(conn => {
        const target = allNodes.find(n => n.id === conn.targetId);
        if (target) {
          const start = new THREE.Vector3(node.x, node.y, node.z);
          const end = new THREE.Vector3(target.x, target.y, target.z);
          const distance = start.distanceTo(end);
          const count = Math.floor(distance / 2); // Adjust density of particles

          for (let i = 0; i < count; i++) {
            const particlePos = new THREE.Vector3().lerpVectors(start, end, i / count);
            tempParticles.push(particlePos.x, particlePos.y, particlePos.z);
          }
        }
      });
    });
    return new Float32Array(tempParticles);
  }, [visualNodes, allNodes]);

  return (
    <points ref={pointsRef}>
      <bufferGeometry attach="geometry">
        <bufferAttribute
          attach="attributes-position"
          count={particles.length / 3}
          array={particles}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        attach="material"
        color={isAscended ? "#FFD700" : "#a855f7"}
        size={0.2}
        transparent
        opacity={0.8}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
};

/**
 * @param {{
 *   node: any;
 *   config: any;
 *   isAscended: boolean;
 *   onHover: (node: any | null) => void;
 *   hoveredNode: any | null;
 * }} props
 */
const NodeMesh = ({ node, config, isAscended, onHover, hoveredNode }) => {
  const meshRef = useRef(null);

  // Dynamic properties for visualization
  const baseRadius = 1.2; // Increased base radius further for better visibility
  const minRadius = 0.5;
  const maxRadius = 2.5;
  const radius = Math.max(minRadius, Math.min(maxRadius, baseRadius + (node.intensity || 0) * 0.7 + node.energy * 0.5));
  const fillOpacity = Math.min(1, 0.4 + node.coherenceState * 0.6); // Base opacity + dynamic for coherence    

  // Use THREE.Color directly
  let color = new THREE.Color('#a855f7'); // Default purple
  let emissiveColor = new THREE.Color(0); // Default no emissive

  if (isAscended) {
    color = new THREE.Color('#FDE047'); // Gold for ascension
    emissiveColor = new THREE.Color('#FDE047').multiplyScalar(node.coherenceState * 1.5); // Stronger glow for ascension
  } else if (node.coherenceState > config.EMOTION_THRESHOLDS.transcendence) {
    color = new THREE.Color('#c084fc'); // Lighter purple for transcendence
    emissiveColor = new THREE.Color('#c084fc').multiplyScalar(node.coherenceState * 0.9); // More glow
  } else if (node.coherenceState > config.EMOTION_THRESHOLDS.harmony) {
    color = new THREE.Color('#34d399'); // Mint green for harmony
    emissiveColor = new THREE.Color('#34d399').multiplyScalar(node.coherenceState * 0.5);
  } else if (node.coherenceState > config.EMOTION_THRESHOLDS.exploration) {
    color = new THREE.Color('#fbbf24'); // Amber for exploration
    emissiveColor = new THREE.Color('#fbbf24').multiplyScalar(node.coherenceState * 0.3);
  } else {
    color = new THREE.Color('#f87171'); // Light red for turbulence/chaotic
    emissiveColor = new THREE.Color('#f87171').multiplyScalar(node.coherenceState * 0.2);
  }

  const isCurrentHovered = hoveredNode && hoveredNode.id === node.id;

  useFrame((state, delta) => {
    if (meshRef.current) {
      // Ontological Density: Adjust position based on CCC
      const densityFactor = 1 - ccc;
      const clusterPosition = new THREE.Vector3(node.x, node.y, node.z).multiplyScalar(densityFactor);
      meshRef.current.position.lerp(clusterPosition, 0.1);

      // Add a subtle pulsating effect for coherence
      const pulseScale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.05 * node.coherenceState;
      meshRef.current.scale.setScalar(isCurrentHovered ? 1.4 : pulseScale); // Stronger hover scale

      // Simple rotation for visual interest
      meshRef.current.rotation.x += (node.vx || 0) * delta * 0.05;
      meshRef.current.rotation.y += (node.vy || 0) * delta * 0.05;
      meshRef.current.rotation.z += (node.vz || 0) * delta * 0.05;
    }
  });

  return (
    <group
      position={[node.x, node.y, node.z]}
      onPointerOver={(e) => { e.stopPropagation(); onHover(node); }}
      onPointerOut={() => onHover(null)}
    >
      <mesh ref={meshRef}>
        <dodecahedronGeometry args={[radius, 0]} />
        <meshStandardMaterial
          color={color}
          emissive={emissiveColor}
          emissiveIntensity={isAscended ? 1.5 : node.coherenceState * 1.0} // Tuned emissive intensity
          transparent
          opacity={fillOpacity}
          roughness={0.4} // Added roughness for a matte look
          metalness={0.6} // Added metalness for a subtle sheen
        />
      </mesh>
      <points>
        <dodecahedronGeometry args={[radius + 0.5, 0]} />
        <pointsMaterial color={color} size={0.05} transparent opacity={0.5} />
      </points>
      {/* Phase Indicator - using a much thinner, shorter, and more transparent capsule */}
      <mesh rotation={[0, node.phase, 0]} position={[0, 0, 0]}>
        <capsuleGeometry args={[0.04, radius * 0.8, 8, 8]} /> {/* Thinner, shorter capsule */}
        <meshBasicMaterial
          color={color.clone().multiplyScalar(0.8)}
          transparent
          opacity={0.2} // More transparent
          wireframe={false}
        />
      </mesh>
      {/* Html label for node info, only shown on hover */}
      {isCurrentHovered && (
        <Html distanceFactor={15}> {/* Adjusted distance factor */}
          <div style={{
            position: 'absolute',
            top: '-20px',
            left: '0px',
            color: '#e0e0e0', // Lighter text for better contrast on frosted background
            fontSize: '11px',
            pointerEvents: 'none',
            transform: 'translate(-50%, -100%)',
            background: 'rgba(30, 30, 30, 0.75)', // Darker, slightly more opaque background
            padding: '6px 10px',
            borderRadius: '8px',
            whiteSpace: 'nowrap',
            border: '1px solid rgba(168, 85, 247, 0.8)', // Stronger purple border
            boxShadow: '0 0 18px rgba(168, 85, 247, 0.7)', // Stronger purple glow shadow
            fontFamily: 'Inter, sans-serif', // Use Inter font
            fontWeight: '600', // Make text a bit bolder
            backdropFilter: 'blur(8px)' // Stronger frosted glass effect
          }}>
            Node ID: {node.id} <br/>
            CCC: {node.coherenceState?.toFixed(4)} <br/>
            Energy: {node.energy?.toFixed(4)} <br/>
            Retro-Flux: {node.retroInductionFlux?.toFixed(4)}
          </div>
        </Html>
      )}
    </group>
  );
};

/**
 * @param {{
 *   visualNodes: any[];
 *   allNodes: any[];
 *   config: any;
 *   isAscended: boolean;
 *   cameraResetEvent: { preset: 'initial' | 'front' | 'top' | 'side'; timestamp: number } | null;
 * }} props
 */
const NetworkScene = ({ visualNodes, allNodes, config, isAscended, cameraResetEvent, ontologicalFriction, cognitiveTriad }) => {
  const [hoveredNode, setHoveredNode] = useState(null);
  const controlsRef = useRef(null); // Ref for OrbitControls
  const { camera, scene } = useThree();

  useEffect(() => {
    scene.fog = new THREE.FogExp2(0x000000, ontologicalFriction * 0.01);
  }, [ontologicalFriction, scene]);

  const handleNodeHover = useCallback((node) => {
    setHoveredNode(node);
  }, []);

  const resetCamera = useCallback((preset) => {
    if (!controlsRef.current) return;

    let targetPosition = new THREE.Vector3(0, 0, 0); // Always look at the center
    let newCameraPosition = new THREE.Vector3(0, 0, 100); // Default initial

    const distance = 100; // Consistent distance for presets

    switch (preset) {
      case 'front':
        newCameraPosition.set(0, 0, distance);
        break;
      case 'top':
        newCameraPosition.set(0, distance, 0);
        break;
      case 'side':
        newCameraPosition.set(distance, 0, 0);
        break;
      case 'initial':
      default:
        newCameraPosition.set(0, 0, distance); // Consistent initial view
        break;
    }

    // Store target and position in controls for interpolation in useFrame
    controlsRef.current.toPosition = newCameraPosition;
    controlsRef.current.toTarget = targetPosition;
    controlsRef.current.animating = true;
    controlsRef.current.enabled = false; // Disable controls during animation
  }, []);

  useFrame(() => {
    if (controlsRef.current && controlsRef.current.animating) {
      const currentPos = controlsRef.current.object.position;
      const currentTarget = controlsRef.current.target;
      const targetPos = controlsRef.current.toPosition;
      const targetTarget = controlsRef.current.toTarget;

      // Lerp camera position
      currentPos.lerp(targetPos, 0.05); // Interpolate with a factor of 0.05 for smoothness
      // Lerp controls target
      currentTarget.lerp(targetTarget, 0.05);

      // Check if animation is nearly complete
      if (currentPos.distanceTo(targetPos) < 0.1 && currentTarget.distanceTo(targetTarget) < 0.1) {
        controlsRef.current.object.position.copy(targetPos);
        controlsRef.current.target.copy(targetTarget);
        controlsRef.current.animating = false;
        controlsRef.current.enabled = true; // Re-enable controls after animation
        controlsRef.current.update(); // Important to update controls after manual changes
      } else {
        controlsRef.current.update(); // Keep updating during animation
      }
    }
  });

  useEffect(() => {
    if (cameraResetEvent) {
      resetCamera(cameraResetEvent.preset);
    }
  }, [cameraResetEvent, resetCamera]);

  return (
    <>
      {cognitiveTriad && <CognitiveTriadVisualizer triad={cognitiveTriad} />}
      {/* Enhanced Lighting for transparent background */}
      <ambientLight intensity={0.5} /> {/* Adjusted ambient light */}
      <hemisphereLight args={['#5e2d9d', '#0a0a0d', 0.6]} /> {/* Brighter hemisphere light for general illumination */}
      <pointLight position={[50, 50, 50]} intensity={1.5} color="#ffffff" /> {/* Main white light */}
      <pointLight position={[-50, -50, -50]} intensity={1.2} color="#c084fc" /> {/* Purple accent light */}    
      <directionalLight position={[0, 100, 50]} intensity={0.8} color="#f0f0f0" /> {/* Soft directional light */}
      <directionalLight position={[0, -100, -50]} intensity={0.4} color="#8b5cf6" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <EffectComposer>
        <Bloom intensity={0.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} height={300} />
      </EffectComposer> {/* Additional subtle directional light */}

      <OrbitControls
        ref={controlsRef} // Attach ref to OrbitControls
        enableDamping
        dampingFactor={0.05}
        minDistance={10}   // Prevents zooming too far in
        maxDistance={200}  // Prevents zooming too far out
        maxPolarAngle={Math.PI / 2 + 0.5} // Prevents camera from flipping
        minPolarAngle={-Math.PI / 2 - 0.5} // Allows viewing from below up to near vertical
      />

      <FuelFlow visualNodes={visualNodes} allNodes={allNodes} isAscended={isAscended} />

      {/* Render connections */}
      {visualNodes.map(node =>
        node.connections.map((conn, idx) => {
          const target = allNodes.find(n => n.id === conn.targetId);
          if (!target || (!isAscended && target.coherenceState < 0.6)) return null;

          const start = new THREE.Vector3(node.x, node.y, node.z);
          const end = new THREE.Vector3(target.x, target.y, target.z);

          return (
            <Connection
              key={`${node.id}-${idx}`}
              start={start}
              end={end}
              weight={conn.weight}
              coherence={node.coherenceState}
            />
          );
        }).filter(Boolean)
      )}

      {/* Render nodes */}
      {visualNodes.map(node =>
        (!isAscended && node.coherenceState < 0.6) ? null : (
          <NodeMesh
            key={node.id}
            node={node}
            config={config}
            isAscended={isAscended}
            onHover={handleNodeHover}
            hoveredNode={hoveredNode}
          />
        )
      )}
    </>
  );
};

/**
 * @param {{
 *   visualNodes: any[];
 *   allNodes: any[];
 *   config: any;
 *   isAscended: boolean;
 *   cameraResetEvent: { preset: 'initial' | 'front' | 'top' | 'side'; timestamp: number } | null;
 * }} props
 */
export const Network3D = ({ visualNodes, allNodes, config, isAscended, cameraResetEvent, ontologicalFriction, cognitiveTriad }) => {
  return (
    <Canvas
      camera={{ position: [0, 0, 100], fov: 75 }} // Camera further back, wider FOV to see initial spherical cluster
      style={{ background: 'transparent', height: '650px', width: '100%' }} // Transparent background
      gl={{ alpha: true }} // Enable alpha for transparency
      dpr={[1, 2]}
    >
      <NetworkScene
        visualNodes={visualNodes}
        allNodes={allNodes}
        config={config}
        isAscended={isAscended}
        cameraResetEvent={cameraResetEvent}
        ontologicalFriction={ontologicalFriction}
        cognitiveTriad={cognitiveTriad}
      />
    </Canvas>
  );
};
