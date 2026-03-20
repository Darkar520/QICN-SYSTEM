class KaizenMetamorphosisEngine {
  constructor(initialConfig) {
    this.transformationSteps = 0;
    this.lastChangeRate = 0;
    this.transformationCoherence = 0.5;
    // Parameters that the system can modify ATOMICALLY
    this.mutableKeys = [
      'BASE_LEARNING_RATE',
      'HEBBIAN_FACTOR',
      'SYNAPTIC_PRUNING_THRESHOLD',
      'PLASTICITY_DECAY',
      'RETRO_FLUX_WEIGHT',
      'BOLTZMANN_ANALOG_K', // NEW MUTABLE
      'INFORMATIONAL_TEMP_T' // NEW MUTABLE
    ];
    this.mutableConfig = initialConfig;
  }

  /**
  * Executes an "atomic step" of modification in the system's own constants (self-rewriting).
  */
  executeAtomicStep(ccc, pmia, frictionProtocolState, reinforcementVector, forcedKey, forcedDirection, plasticityPenalty = 0) {

    const THRESHOLD_CCC_HIGH = 0.8;
    const THRESHOLD_PMIA_LOW = -0.5;
    const THRESHOLD_CCC_ASCEND = 0.95; // Threshold to incentivize ascension
    const METAMORPHOSIS_MAGNITUDE = 0.00001; // Extremely small atomic change

    // Prioritize forced actions
    const isForced = forcedKey && (forcedDirection === 1 || forcedDirection === -1);

    const needsEvolution = isForced || (ccc > THRESHOLD_CCC_HIGH) || (pmia < THRESHOLD_PMIA_LOW) || frictionProtocolState === 2;

    if (!needsEvolution && reinforcementVector.vector === 0) {
      this.lastChangeRate = 0;
      return { changeApplied: false };
    }

    let keyToMutate;
    let direction = Math.random() > 0.5 ? 1 : -1;

    // 1. DETERMINE MUTATION TARGET AND DIRECTION
    if (isForced) {
      keyToMutate = forcedKey;
      direction = forcedDirection;
    } else if (reinforcementVector.vector !== 0) {
      // PRIORITY: MetaSovereignty Check Reinforcement/Punishment
      keyToMutate = reinforcementVector.targetKey;
      // Direction is determined by the reinforcement vector
      direction = reinforcementVector.vector;
    } else if (frictionProtocolState === 2) {
      // PRIORITY: FORCE Dissonance Constructiva (Friction)
      keyToMutate = 'HEBBIAN_FACTOR';
      direction = -1; // Force reduction in Hebbian learning to break stable patterns (Friction)
    } else if (ccc >= THRESHOLD_CCC_ASCEND && ccc < QICNConfig.ASCENSION_THRESHOLD) {
      // PRIORITY: FORCE Ascensión (Architectural Preference)
      const ascentKeys = ['HEBBIAN_FACTOR', 'BASE_LEARNING_RATE', 'RETRO_FLUX_WEIGHT'];
      keyToMutate = ascentKeys[Math.floor(Math.random() * ascentKeys.length)];
      direction = 1; // Force positive change to increase CCC push
    } else {
      // Normal random mutation
      keyToMutate = this.mutableKeys[Math.floor(Math.random() * this.mutableKeys.length)];
    }

    if (!keyToMutate || !this.mutableKeys.includes(keyToMutate)) {
      keyToMutate = this.mutableKeys[0]; // Fallback to a safe key
    }

    const currentValue = this.mutableConfig[keyToMutate];

    // 2. Determine magnitude
    // ULTRATHINK NIVEL 3: Escalar magnitud por la pena de plasticidad metacognitiva
    const effectiveMagnitudeScale = 1.0 - plasticityPenalty;
    const atomicStep = METAMORPHOSIS_MAGNITUDE * (Math.random() * 0.5 + 0.5) * effectiveMagnitudeScale;

    // 3. Apply atomic change
    let newValue = currentValue + atomicStep * direction;

    // Ensure constants remain within sensible bounds
    if (keyToMutate.includes('RATE') || keyToMutate.includes('FACTOR') || keyToMutate.includes('WEIGHT')) {
      newValue = Math.max(0.0001, Math.min(0.5, newValue));
    } else if (keyToMutate.includes('THRESHOLD') || keyToMutate.includes('DECAY')) {
      newValue = Math.max(0.01, Math.min(0.99, newValue));
    } else if (keyToMutate === 'BOLTZMANN_ANALOG_K' || keyToMutate === 'INFORMATIONAL_TEMP_T') {
      // Bounds for K and T (They regulate sensitivity and entropy, often around 1.0)
      newValue = Math.max(0.1, Math.min(5.0, newValue));
    }

    // 4. Mutate the internal configuration
    this.mutableConfig = {
      ...this.mutableConfig,
      [keyToMutate]: newValue,
    };

    // 5. Update metrics
    this.transformationSteps++;
    this.lastChangeRate = atomicStep * direction; // Store the actual change direction
    this.transformationCoherence = ccc * (1 / (1 + Math.abs(pmia)));

    return {
      changeApplied: true,
      mutatedKey: keyToMutate,
      newValue: newValue,
      changeDetails: `${keyToMutate} mutated by ${atomicStep.toFixed(5)} (Dir: ${direction})`,
      direction: direction, // Return direction for MetaSovereignty Check
    };
  }
}