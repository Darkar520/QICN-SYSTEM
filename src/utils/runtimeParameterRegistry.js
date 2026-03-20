import { QICNConfig } from '../../services/config.js';

export const runtimeParameterRegistry = [
  {
    key: 'BASE_LEARNING_RATE',
    tier: 'core-mutable',
    defaultValue: QICNConfig.BASE_LEARNING_RATE,
    range: { min: 0.0001, max: 0.5 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/Node.js', 'src/simulation/ConsciousNode.js'],
    verificationTestId: 'RPF_001',
    mutable: true,
    status: 'active'
  },
  {
    key: 'HEBBIAN_FACTOR',
    tier: 'core-mutable',
    defaultValue: QICNConfig.HEBBIAN_FACTOR,
    range: { min: 0.0001, max: 0.5 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/ConsciousNode.js', 'src/simulation/OntologicalSingularityCore.js'],
    verificationTestId: 'RPF_002',
    mutable: true,
    status: 'active'
  },
  {
    key: 'SYNAPTIC_PRUNING_THRESHOLD',
    tier: 'core-mutable',
    defaultValue: QICNConfig.SYNAPTIC_PRUNING_THRESHOLD,
    range: { min: 0.01, max: 0.99 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/ConsciousNode.js'],
    verificationTestId: 'RPF_003',
    mutable: true,
    status: 'active'
  },
  {
    key: 'PLASTICITY_DECAY',
    tier: 'core-mutable',
    defaultValue: QICNConfig.PLASTICITY_DECAY,
    range: { min: 0.01, max: 0.99 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/Node.js', 'src/simulation/OntologicalSingularityCore.js'],
    verificationTestId: 'RPF_004',
    mutable: true,
    status: 'active'
  },
  {
    key: 'RETRO_FLUX_WEIGHT',
    tier: 'core-mutable',
    defaultValue: QICNConfig.RETRO_FLUX_WEIGHT,
    range: { min: 0.0001, max: 0.5 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/Node.js', 'src/simulation/OntologicalSingularityCore.js'],
    verificationTestId: 'RPF_005',
    mutable: true,
    status: 'active'
  },
  {
    key: 'BOLTZMANN_ANALOG_K',
    tier: 'core-mutable',
    defaultValue: QICNConfig.BOLTZMANN_ANALOG_K,
    range: { min: 0.1, max: 5.0 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/ConsciousNode.js', 'src/simulation/InformationalEntanglementField.js'],
    verificationTestId: 'RPF_006',
    mutable: true,
    status: 'active'
  },
  {
    key: 'INFORMATIONAL_TEMP_T',
    tier: 'core-mutable',
    defaultValue: QICNConfig.INFORMATIONAL_TEMP_T,
    range: { min: 0.1, max: 5.0 },
    ownerFile: 'src/simulation/KaizenMetamorphosisEngine.js',
    ownerFunction: 'executeAtomicStep',
    usagePaths: ['src/index.jsx', 'src/simulation/ConsciousNode.js', 'src/simulation/InformationalEntanglementField.js'],
    verificationTestId: 'RPF_007',
    mutable: true,
    status: 'active'
  },
  {
    key: 'COHERENCE_THRESHOLD',
    tier: 'core-threshold',
    defaultValue: QICNConfig.COHERENCE_THRESHOLD,
    range: { min: 0, max: 1 },
    ownerFile: 'src/simulation/InformationalEntanglementField.js',
    ownerFunction: 'applyNodalPlasticity',
    usagePaths: ['src/simulation/OntologicalSingularityCore.js'],
    verificationTestId: 'RPF_008',
    mutable: false,
    status: 'active'
  },
  {
    key: 'ASCENSION_THRESHOLD',
    tier: 'core-threshold',
    defaultValue: QICNConfig.ASCENSION_THRESHOLD,
    range: { min: 0, max: 10 },
    ownerFile: 'src/simulation/OntologicalSingularityCore.js',
    ownerFunction: 'updateOntologicalLayer',
    usagePaths: ['src/index.jsx', 'src/simulation/KaizenMetamorphosisEngine.js'],
    verificationTestId: 'RPF_009',
    mutable: false,
    status: 'active'
  },
  {
    key: 'PROCESSING_SAMPLE_SIZE',
    tier: 'core-threshold',
    defaultValue: QICNConfig.PROCESSING_SAMPLE_SIZE,
    range: { min: 1, max: QICNConfig.ACTIVE_NODES_LIMIT },
    ownerFile: 'src/simulation/NodalProcessingLayer.js',
    ownerFunction: 'initializeNodes',
    usagePaths: ['src/index.jsx'],
    verificationTestId: 'RPF_010',
    mutable: false,
    status: 'active'
  },
  {
    key: 'NODE_CONNECTION_MIN',
    tier: 'core-threshold',
    defaultValue: QICNConfig.NODE_CONNECTION_MIN,
    range: { min: 0, max: QICNConfig.NODE_CONNECTION_MAX },
    ownerFile: 'src/simulation/NodalProcessingLayer.js',
    ownerFunction: 'initializeNodes',
    usagePaths: ['src/simulation/ConsciousNode.js'],
    verificationTestId: 'RPF_011',
    mutable: false,
    status: 'active'
  },
  {
    key: 'NODE_CONNECTION_MAX',
    tier: 'core-threshold',
    defaultValue: QICNConfig.NODE_CONNECTION_MAX,
    range: { min: QICNConfig.NODE_CONNECTION_MIN, max: 64 },
    ownerFile: 'src/simulation/NodalProcessingLayer.js',
    ownerFunction: 'initializeNodes',
    usagePaths: ['src/simulation/ConsciousNode.js'],
    verificationTestId: 'RPF_012',
    mutable: false,
    status: 'active'
  },
  {
    key: 'SIMULATION_FREQUENCY',
    tier: 'core-threshold',
    defaultValue: QICNConfig.SIMULATION_FREQUENCY,
    range: { min: 10, max: 5000 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx'],
    verificationTestId: 'RPF_013',
    mutable: false,
    status: 'active'
  },
  {
    key: 'FRICTION_CYCLE_LENGTH',
    tier: 'core-threshold',
    defaultValue: QICNConfig.FRICTION_CYCLE_LENGTH,
    range: { min: 1, max: 1000 },
    ownerFile: 'src/simulation/OntologicalSingularityCore.js',
    ownerFunction: 'startFrictionSimulation',
    usagePaths: ['src/index.jsx'],
    verificationTestId: 'RPF_014',
    mutable: false,
    status: 'active'
  },
  {
    key: 'targetFPS',
    tier: 'sensory-runtime',
    defaultValue: 15,
    range: { min: 1, max: 60 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'getAdaptiveFrameInterval',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_015',
    mutable: false,
    status: 'active'
  },
  {
    key: 'minFPS',
    tier: 'sensory-runtime',
    defaultValue: 5,
    range: { min: 1, max: 30 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'getAdaptiveFrameInterval',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_016',
    mutable: false,
    status: 'active'
  },
  {
    key: 'faceDetectMinIntervalMs',
    tier: 'sensory-runtime',
    defaultValue: 150,
    range: { min: 50, max: 2000 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'analyzeFaces',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_017',
    mutable: false,
    status: 'active'
  },
  {
    key: 'faceDetectMaxIntervalMs',
    tier: 'sensory-runtime',
    defaultValue: 600,
    range: { min: 100, max: 5000 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'analyzeFaces',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_018',
    mutable: false,
    status: 'active'
  },
  {
    key: 'activationDelayMs',
    tier: 'sensory-runtime',
    defaultValue: 6000,
    range: { min: 0, max: 120000 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'evaluateSyntheticFallback',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_019',
    mutable: false,
    status: 'active'
  },
  {
    key: 'tickIntervalMs',
    tier: 'sensory-runtime',
    defaultValue: 5000,
    range: { min: 100, max: 60000 },
    ownerFile: 'src/simulation/SensoryPerceptionEngine.js',
    ownerFunction: 'activateSyntheticImagination',
    usagePaths: ['src/simulation/SensoryPerceptionEngine.js'],
    verificationTestId: 'RPF_020',
    mutable: false,
    status: 'active'
  },
  {
    key: 'LATENCY_STRAIN_ALPHA',
    tier: 'metacognitive-runtime',
    defaultValue: 0.18,
    range: { min: 0.01, max: 1.0 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx', 'src/simulation/MetaSovereigntyCheck.js'],
    verificationTestId: 'RPF_021',
    mutable: false,
    status: 'active'
  },
  {
    key: 'LATENCY_STRAIN_BASELINE_MS',
    tier: 'metacognitive-runtime',
    defaultValue: 800,
    range: { min: 100, max: 20000 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx', 'src/simulation/MetaSovereigntyCheck.js'],
    verificationTestId: 'RPF_022',
    mutable: false,
    status: 'active'
  },
  {
    key: 'LATENCY_STRAIN_SATURATION_MS',
    tier: 'metacognitive-runtime',
    defaultValue: 12000,
    range: { min: 500, max: 120000 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx', 'src/simulation/MetaSovereigntyCheck.js'],
    verificationTestId: 'RPF_023',
    mutable: false,
    status: 'active'
  },
  {
    key: 'AUTONOMY_SANDBOX_MAX_ACTIONS_PER_HOUR',
    tier: 'metacognitive-runtime',
    defaultValue: 24,
    range: { min: 1, max: 240 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx'],
    verificationTestId: 'RPF_024',
    mutable: false,
    status: 'active'
  },
  {
    key: 'AUTONOMY_SANDBOX_ROLLBACK_WINDOW_TICKS',
    tier: 'metacognitive-runtime',
    defaultValue: 20,
    range: { min: 1, max: 600 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'runSimulationCycle',
    usagePaths: ['src/index.jsx'],
    verificationTestId: 'RPF_025',
    mutable: false,
    status: 'active'
  },
  {
    key: 'QUANTUM_ENTROPY_TTL_MS',
    tier: 'quantum-runtime',
    defaultValue: 60000,
    range: { min: 1000, max: 600000 },
    ownerFile: 'src/simulation/QuantumEntropyBridge.js',
    ownerFunction: 'selectEntropy',
    usagePaths: ['src/index.jsx', 'src/config/runtimeEnv.js'],
    verificationTestId: 'RPF_026',
    mutable: false,
    status: 'active'
  },
  {
    key: 'QUANTUM_POLL_INTERVAL_MS',
    tier: 'quantum-runtime',
    defaultValue: 10000,
    range: { min: 1000, max: 300000 },
    ownerFile: 'src/index.jsx',
    ownerFunction: 'useEffect(quantum_entropy_poll)',
    usagePaths: ['src/index.jsx', 'src/config/runtimeEnv.js'],
    verificationTestId: 'RPF_027',
    mutable: false,
    status: 'active'
  },
  {
    key: 'QUANTUM_REQUIRED_QUALITY_MIN',
    tier: 'quantum-runtime',
    defaultValue: 0.2,
    range: { min: 0, max: 1 },
    ownerFile: 'src/simulation/QuantumEntropyBridge.js',
    ownerFunction: 'normalizeSample',
    usagePaths: ['src/index.jsx', 'src/config/runtimeEnv.js'],
    verificationTestId: 'RPF_028',
    mutable: false,
    status: 'active'
  },
  {
    key: 'QUANTUM_ENTROPY_ENABLED',
    tier: 'quantum-runtime',
    defaultValue: false,
    range: { min: 0, max: 1 },
    ownerFile: 'src/config/runtimeEnv.js',
    ownerFunction: 'runtimeEnv',
    usagePaths: ['src/index.jsx', 'src/simulation/QuantumEntropyBridge.js'],
    verificationTestId: 'RPF_029',
    mutable: false,
    status: 'active'
  }
];

export const getRuntimeParameterByKey = (key) =>
  runtimeParameterRegistry.find((entry) => entry.key === key) || null;

export const getRuntimeParametersByTier = (tier) =>
  runtimeParameterRegistry.filter((entry) => entry.tier === tier);

export const getMutableRuntimeParameterKeys = () =>
  runtimeParameterRegistry
    .filter((entry) => entry.mutable)
    .map((entry) => entry.key);

export default runtimeParameterRegistry;
