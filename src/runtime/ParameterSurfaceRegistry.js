export const PARAMETER_SURFACE_BOUNDARY =
  'Runtime parameter registry for UI alignment. Entries describe operational influence paths; they do not prove external validity or consciousness claims.';

export const PARAMETER_SURFACE_REGISTRY = Object.freeze({
  complexityFactor: Object.freeze({
    uiLabel: 'Complexity factor',
    sourceOfTruth: 'React state: complexityFactor',
    runtimeConsumers: Object.freeze([
      'InformationalEntanglementField.calculateCCC(nodes, cf, mutableConfig)',
      'SimulationEngine post-threshold telemetry'
    ]),
    mathematicalRole: 'Weights field resonance and coherence/resonance coupling in CCC.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'A control parameter for field-complexity weighting, not a direct consciousness dial.'
  }),
  stabilityBias: Object.freeze({
    uiLabel: 'Stability bias',
    sourceOfTruth: 'React state: stabilityBias',
    runtimeConsumers: Object.freeze([
      'Node.introspectiveUpdate(finalCCC, stabilityBias)'
    ]),
    mathematicalRole: 'Biases node introspective update toward retention or adaptation.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'A nodal update bias, not proof of stable subjectivity.'
  }),
  BOLTZMANN_ANALOG_K: Object.freeze({
    uiLabel: 'Boltzmann analog K',
    sourceOfTruth: 'mutableConfig.BOLTZMANN_ANALOG_K / QICNConfig.BOLTZMANN_ANALOG_K',
    runtimeConsumers: Object.freeze([
      'ConsciousNode.calculateResonance(node, cf, mutableConfig)',
      'InformationalEntanglementField.calculateCCC via resonance sampling'
    ]),
    mathematicalRole: 'Scales energy-difference sensitivity in the resonance kernel.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'A resonance-kernel parameter, not thermodynamic temperature.'
  }),
  INFORMATIONAL_TEMP_T: Object.freeze({
    uiLabel: 'Informational temperature T',
    sourceOfTruth: 'mutableConfig.INFORMATIONAL_TEMP_T / QICNConfig.INFORMATIONAL_TEMP_T',
    runtimeConsumers: Object.freeze([
      'ConsciousNode.calculateResonance(node, cf, mutableConfig)',
      'OntologicalSingularityCore sensory thermal shift'
    ]),
    mathematicalRole: 'Modulates informational-energy decay in resonance and selected adaptive shifts.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'An informational control parameter, not physical temperature.'
  }),
  COHERENCE_THRESHOLD_THETA: Object.freeze({
    uiLabel: 'Coherence threshold theta',
    sourceOfTruth: 'QICNConfig.COHERENCE_THRESHOLD_THETA',
    runtimeConsumers: Object.freeze([
      'ConsciousNode.calculateResonance denominator'
    ]),
    mathematicalRole: 'Phase/coherence threshold factor in pairwise resonance.',
    evidenceType: 'config_runtime_input',
    claimBoundary: 'A resonance threshold, not a phenomenological threshold.'
  }),
  HEBBIAN_FACTOR: Object.freeze({
    uiLabel: 'Hebbian factor',
    sourceOfTruth: 'mutableConfig.HEBBIAN_FACTOR / QICNConfig.HEBBIAN_FACTOR',
    runtimeConsumers: Object.freeze([
      'ConsciousNode.applyPlasticity(feedbackSignal, mutableConfig)',
      'KaizenMetamorphosisEngine mutation policy'
    ]),
    mathematicalRole: 'Scales plasticity updates under feedback.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'A plasticity coefficient, not biological Hebbian learning evidence.'
  }),
  RETRO_FLUX_WEIGHT: Object.freeze({
    uiLabel: 'Retro flux weight',
    sourceOfTruth: 'mutableConfig.RETRO_FLUX_WEIGHT / QICNConfig.RETRO_FLUX_WEIGHT',
    runtimeConsumers: Object.freeze([
      'Node.calculateRetroInduction',
      'OntologicalSingularityCore metamorphosis and human-coupling modulation'
    ]),
    mathematicalRole: 'Scales retroinductive influence in node/state update pathways.',
    evidenceType: 'direct_runtime_input',
    claimBoundary: 'A model-internal retroprojection weight, not evidence of backward-in-time causation.'
  }),
  TEMPORAL_HORIZON: Object.freeze({
    uiLabel: 'Temporal horizon',
    sourceOfTruth: 'QICNConfig.TEMPORAL_HORIZON',
    runtimeConsumers: Object.freeze([
      'OntologicalSingularityCore.computeRetroinductiveProjection',
      'prospective scenario horizon clamp'
    ]),
    mathematicalRole: 'Sets bounded lookahead length for prospective/retroinductive projection.',
    evidenceType: 'config_runtime_input',
    claimBoundary: 'A bounded planning horizon, not actual future access.'
  })
});

export const getParameterSurfaceEntry = (key) => PARAMETER_SURFACE_REGISTRY[key] || null;

export const listParameterSurfaceEntries = () => Object.entries(PARAMETER_SURFACE_REGISTRY).map(([key, value]) => ({
  key,
  ...value
}));

export default PARAMETER_SURFACE_REGISTRY;
