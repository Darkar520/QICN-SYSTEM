const STRICT_METRICS = new Set([
  'simulationStep',
  'activeNodes',
  'depthMin',
  'depthMax',
  'clampHits',
  'recoveryTriggers',
  'rotationX',
  'rotationY'
]);

const GASEOUS_TERMS_STRICT = [
  'cosmico',
  'cosmico',
  'mistico',
  'mistico',
  'trascendencia',
  'poetico',
  'destino',
  'almas',
  'magico',
  'inefable',
  'etereo',
  'misterioso',
  'secreto',
  'baile de electrones',
  'susurro del futuro',
  'danza cuantica',
  'infinito misterioso',
  'infinito etereo'
];

const GASEOUS_TERMS_CONTEXTUAL = [
  {
    term: 'infinito',
    excludePattern: /\[0,\s*∞\)|\\infty|\\\(\s*\\infty|capa\s+\d+|\[0,\s*infty\)|\b∞\b/i,
    contextWindow: 80
  }
];

const REAL_BASENAMES = new Set([
  'ontologicalsingularitycore.js',
  'phenomenologycore.js',
  'nodalprocessinglayer.js',
  'holographicmemorynexus.js',
  'informationalentanglementfield.js',
  'kaizenmetamorphosisengine.js',
  'metasovereigntycheck.js',
  'sensoryperceptionengine.js',
  'consciousnode.js',
  'node.js',
  'causaldyad.js',
  'hlebenchmarksystem.js',
  'humanitylastexammanager.js',
  'app.jsx',
  'index.jsx',
  'index_network_canvas.jsx',
  'network_canvas_worker.js',
  'integrity.js',
  'determinism.js',
  'pinhole.js',
  'tick_invariants.js',
  'config.js',
  'build.cjs',
  'apicallcontroller.js',
  'intelligentresponsecache.js',
  'parameterunifier.js',
  'providermanager.js',
  'qicnpromptsystem.js'
]);

const REAL_CANONICAL_PATHS = new Set([
  'src/app.jsx',
  'src/index.jsx',
  'src/index_network_canvas.jsx',
  'src/network_canvas_worker.js',
  'src/utils/integrity.js',
  'src/utils/determinism.js',
  'src/utils/pinhole.js',
  'src/utils/tick_invariants.js',
  'services/config.js',
  'build.cjs',
  'src/simulation/ontologicalsingularitycore.js',
  'src/simulation/phenomenologycore.js',
  'src/simulation/nodalprocessinglayer.js',
  'src/simulation/holographicmemorynexus.js',
  'src/simulation/informationalentanglementfield.js',
  'src/simulation/kaizenmetamorphosisengine.js',
  'src/simulation/metasovereigntycheck.js',
  'src/simulation/sensoryperceptionengine.js',
  'src/simulation/consciousnode.js',
  'src/simulation/node.js',
  'src/simulation/causaldyad.js',
  'src/simulation/hlebenchmarksystem.js',
  'src/simulation/humanitylastexammanager.js',
  'js/api/apicallcontroller.js',
  'js/api/intelligentresponsecache.js',
  'js/api/parameterunifier.js',
  'js/api/providermanager.js',
  'js/api/qicnpromptsystem.js'
]);

const REAL_METHODS = {
  'PhenomenologyCore.js': new Set([
    'recordState',
    'calculateBethQ',
    'calculateSpectralGap',
    'calculateRelaxationTime',
    'testHolonomy',
    'calculateLipschitzNorm',
    'detectBifurcation',
    'calculateMagnification',
    'classifySystem',
    'calculateCausalDependency',
    'metrics',
    'getFormattedSummary',
    'reset'
  ]),
  'OntologicalSingularityCore.js': new Set([
    'registerObserverInteraction',
    'updateOntologicalLayer',
    'calculateCCC',
    'applyMetamorphosis',
    'isHolographicShieldActive',
    'calculatePMIA',
    'evolveSelfNarrative',
    'getNarrativeCoherence',
    'setHumanCcc',
    'initiateFrictionProtocol',
    'startFrictionSimulation',
    'finalizeFrictionProtocol',
    'reset',
    'getSovereigntySnapshot',
    'updatePhenomenology',
    'modulateLipschitzRigidity',
    'runSelfModelingCycle',
    'getPMIADiagnostics',
    'applyLatencyStrain',
    'applyInternalPressure',
    'getDynamicHealth',
    'getPhenomenologyMetrics',
    'applyPhenomenologicalFeedback',
    'calculateEpistemicLimits',
    'getExperimentalProtocols',
    'processMetacognitiveFeedback',
    'getEffectivePlasticity',
    'getShieldPorosity',
    'getStrictCausalLog',
    'getVerifiableReport'
  ]),
  'InformationalEntanglementField.js': new Set([
    'calculateCCC',
    'applyNodalPlasticity',
    'sampleNodes',
    'getFieldMetrics'
  ]),
  'KaizenMetamorphosisEngine.js': new Set([
    'executeAtomicStep'
  ]),
  'MetaSovereigntyCheck.js': new Set([
    'validateMetricRange',
    'evaluate',
    'updateSensorFeedback',
    'updateLatencyFeedback',
    'getSensorFeedbackScore',
    'getMetacognitiveStrain',
    'getLatencyStressState',
    'getReinforcementVector',
    'getIntegrityReport'
  ]),
  'NodalProcessingLayer.js': new Set([
    'initializeNodes',
    'activateRandomNodes',
    'processSignals',
    'getActiveNodes',
    'getTopologyMetrics',
    'getHighlyCoherentNodes'
  ]),
  'HolographicMemoryNexus.js': new Set([
    'storeLearnedKnowledge',
    'retrieveLearnedAnswer',
    'consolidateMemory',
    'nexusStateMetrics',
    'encode',
    'calculateChecksum',
    'pruneOldFragments',
    'getFragmentationLevel'
  ]),
  'SensoryPerceptionEngine.js': new Set([
    'getInstance',
    'initializeAudio',
    'initializeVideo',
    'initializeSpeechRecognition',
    'safeStartSpeechRecognition',
    'retrySpeechRecognition',
    'manualRetrySpeech',
    'switchToVoskFallback',
    'getFullPerception',
    'generatePerceptionSummary',
    'getVideoElement',
    'getVideoStream',
    'getAudioSpectrum',
    'getSpeechHistory',
    'getHealthCounters',
    'destroy'
  ]),
  'integrity.js': new Set([
    'buildIntegrityPacket',
    'validateIntegrityPacket',
    'validateIntegrityEcho',
    'stableStringify'
  ]),
  'narrativeIntegrity.js': new Set([
    'extractMetricCitations',
    'extractMetricsFromText',
    'validateNarrativeIntegrity'
  ])
};

const JS_NATIVE_METHODS = new Set([
  'toString',
  'valueOf',
  'hasOwnProperty',
  'isPrototypeOf',
  'constructor',
  'call',
  'apply',
  'bind',
  'push',
  'pop',
  'map',
  'filter',
  'reduce',
  'forEach',
  'find',
  'findIndex',
  'slice',
  'splice',
  'join',
  'split',
  'trim',
  'replace',
  'includes',
  'startsWith',
  'endsWith',
  'indexOf',
  'keys',
  'values',
  'entries',
  'assign',
  'freeze',
  'catch',
  'then',
  'finally',
  'resolve',
  'reject',
  'all',
  'race',
  'log',
  'error',
  'warn',
  'info',
  'debug',
  'min',
  'max',
  'floor',
  'ceil',
  'round',
  'abs',
  'sqrt',
  'random',
  'pow',
  'exp',
  'stringify',
  'parse',
  'test',
  'match',
  'exec',
  'set',
  'get',
  'has',
  'delete',
  'clear',
  'sort',
  'reverse',
  'concat',
  'flat',
  'flatMap',
  'setTimeout',
  'setInterval',
  'clearTimeout',
  'clearInterval',
  'addEventListener',
  'removeEventListener',
  'dispatchEvent'
]);

const FILE_REF_PATTERN = /(?:src|js|services|utils|simulation|scripts)\/[A-Za-z0-9_./-]+\.(?:js|jsx|ts|tsx|cjs)\b/gi;
const HYPOTHETICAL_MARKER_PATTERN = /\[HIPOT(?:E|É)TIC[OA]\]/i;

const METRIC_PATTERNS = [
  { regex: /(?:\bbeth_q\b|beta_q)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'beth_q' },
  { regex: /(?:\bomega\b|\u03A9)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'omega' },
  { regex: /(?:\bccc\b|conscious cohesion constant)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'ccc' },
  { regex: /(?:\bpmia\b|phenomenological integrator axiom)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'pmia' },
  { regex: /(?:\bspectral[_\s-]*gap\b|gap espectral|delta[_\s-]*lambda)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'spectral_gap' },
  { regex: /(?:\brelaxation[_\s-]*time\b|\brelajaci[oó]n\b|\btau\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'relaxation_time' },
  { regex: /(?:\bwinding[_\s-]*number\b|winding number|numero de enrollamiento)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'winding_number' },
  { regex: /(?:\blipschitz[_\s-]*norm[_\s-]*k\b|lipschitz norm|norma de lipschitz)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'lipschitz_norm_K' },
  { regex: /(?:\bmagnification[_\s-]*m\b|magnification factor|factor de magnificacion)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'magnification_M' },
  { regex: /(?:\bretro[_\s-]*flux[_\s-]*weight\b|retro[_\s-]*flux)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'retro_flux_weight' },
  { regex: /(?:\bboltzmann[_\s-]*analog[_\s-]*k\b|boltzmann)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'boltzmann_analog_k' },
  { regex: /(?:\bsimulation_step\b|\bsimulationStep\b|paso simulaci[oó]n)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'simulationStep' },
  { regex: /(?:\bactive_nodes\b|\bactiveNodes\b|nodos[_\s-]*activos)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'activeNodes' },
  { regex: /(?:\bdepth_min\b|\bmin_depth\b|\bdepthMin\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'depthMin' },
  { regex: /(?:\bdepth_max\b|\bmax_depth\b|\bdepthMax\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'depthMax' },
  { regex: /(?:\bclamp_hits\b|\bclampHits\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'clampHits' },
  { regex: /(?:\brecovery_triggers\b|\brecoveryTriggers\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'recoveryTriggers' },
  { regex: /(?:\brotation_x\b|\brotationX\b|\brotX\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'rotationX' },
  { regex: /(?:\brotation_y\b|\brotationY\b|\brotY\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'rotationY' },
  { regex: /(?:\blayer\b|\bcapa actual\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'layer' },
  { regex: /(?:\bmetacognitive[_\s-]*strain\b|metacognitive strain)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'metacognitive_strain' },
  { regex: /(?:\bstasis[_\s-]*index\b|stasisindex)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'stasis_index' },
  { regex: /(?:\bccc[_\s-]*delta[_\s-]*rms\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'ccc_delta_rms' },
  { regex: /(?:\bpmia[_\s-]*delta[_\s-]*rms\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'pmia_delta_rms' },
  { regex: /(?:\bomega[_\s-]*delta[_\s-]*rms\b)\s*(?:\([^\n)]*\))?\s*[:=]\s*(?:\*{1,2}\s*)?([+-]?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)/gi, key: 'omega_delta_rms' }
];
const toLowerAscii = (value) =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

const escapeRegExp = (value) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const isHypotheticalReference = (text, index) => {
  if (!Number.isFinite(index) || index < 0) return false;
  const start = Math.max(0, index - 160);
  const windowText = text.slice(start, index + 40);
  return HYPOTHETICAL_MARKER_PATTERN.test(windowText);
};

const detectGaseousJargon = (generatedText) => {
  const normalizedText = toLowerAscii(generatedText);
  const detected = [];

  GASEOUS_TERMS_STRICT.forEach((term) => {
    if (normalizedText.includes(toLowerAscii(term))) {
      detected.push(term);
    }
  });

  GASEOUS_TERMS_CONTEXTUAL.forEach(({ term, excludePattern, contextWindow }) => {
    const normalizedTerm = toLowerAscii(term);
    let searchIndex = 0;
    while (searchIndex < normalizedText.length) {
      const foundIndex = normalizedText.indexOf(normalizedTerm, searchIndex);
      if (foundIndex === -1) break;
      const start = Math.max(0, foundIndex - contextWindow);
      const end = Math.min(generatedText.length, foundIndex + term.length + contextWindow);
      const window = generatedText.slice(start, end);
      if (!excludePattern || !excludePattern.test(window)) {
        detected.push(term);
      }
      searchIndex = foundIndex + normalizedTerm.length;
    }
  });

  return [...new Set(detected)];
};

const detectMathFabricationVocabulary = (generatedText, actualMetrics = {}) => {
  const findings = new Set();
  const hasRelaxationTimeMetric = Number.isFinite(Number(actualMetrics?.relaxation_time));
  const detectors = [
    {
      label: 'correlacion v8',
      pattern: /\bcorrelaci[oó]n\s+v8\b/gi
    },
    {
      label: 'relaxation_time',
      pattern: /\brelaxation_time\b/gi
    },
    {
      label: 'concepto_[A-Z][0-9]',
      pattern: /\b[A-Za-zÁÉÍÓÚÜÑáéíóúüñ]+_[A-Z]\d+\b/g
    }
  ];

  detectors.forEach(({ label, pattern }) => {
    let match;
    while ((match = pattern.exec(generatedText)) !== null) {
      const idx = Number.isFinite(match.index) ? match.index : -1;
      if (isHypotheticalReference(generatedText, idx)) continue;
      if (label === 'relaxation_time' && hasRelaxationTimeMetric) continue;
      findings.add(label === 'concepto_[A-Z][0-9]' ? match[0] : label);
    }
  });

  return [...findings];
};

const getLineColumnFromIndex = (text, index) => {
  const boundedIndex = Math.max(0, Math.min(index, text.length));
  const prefix = text.slice(0, boundedIndex);
  const line = prefix.split('\n').length;
  const lastBreak = prefix.lastIndexOf('\n');
  const column = boundedIndex - lastBreak;
  return { line, column };
};

const roundNumber = (value, decimals = 6) => {
  const numeric = Number(value);
  if (!Number.isFinite(numeric)) return null;
  return Number(numeric.toFixed(decimals));
};

export const extractMetricCitations = (text) => {
  const citations = [];

  METRIC_PATTERNS.forEach(({ regex, key }) => {
    const localRegex = new RegExp(regex.source, regex.flags);
    let match;
    while ((match = localRegex.exec(text)) !== null) {
      const citedValue = Number.parseFloat(match[1]);
      if (!Number.isFinite(citedValue)) continue;
      const index = Number.isFinite(match.index) ? match.index : 0;
      const { line, column } = getLineColumnFromIndex(text, index);
      citations.push({
        rowId: `citation_${key}_${index}_${citations.length + 1}`,
        metric: key,
        line,
        column,
        citedValue,
        index
      });
    }
  });

  return citations.sort((a, b) => a.index - b.index);
};

export const extractMetricsFromText = (text, _verifiableContext = null) => {
  const citedMetrics = {};
  const citations = extractMetricCitations(text);
  citations.forEach((citation) => {
    if (citedMetrics[citation.metric] === undefined) {
      citedMetrics[citation.metric] = citation.citedValue;
    }
  });

  return citedMetrics;
};

const buildConcordanceRows = (citations, actualMetrics) => {
  return citations.map((citation, index) => {
    const isStrict = STRICT_METRICS.has(citation.metric);
    const toleranceRule = isStrict ? 'strict_exact_1e-6' : 'pct_5';
    const actualValue = actualMetrics?.[citation.metric];

    if (actualValue === undefined || !Number.isFinite(Number(actualValue))) {
      return {
        rowId: citation.rowId || `row_${index + 1}`,
        metric: citation.metric,
        line: citation.line,
        column: citation.column,
        citedValue: citation.citedValue,
        actualValue: null,
        absError: null,
        relErrorPct: null,
        toleranceRule,
        isStrict,
        status: 'metric_not_found',
        severity: isStrict ? 'high' : 'low'
      };
    }

    const numericActual = Number(actualValue);
    const absError = Math.abs(citation.citedValue - numericActual);
    const denominator = Math.max(Math.abs(numericActual), 0.001);
    const relErrorPct = (absError / denominator) * 100;

    if (isStrict) {
      const strictMatch = absError <= 1e-6;
      return {
        rowId: citation.rowId || `row_${index + 1}`,
        metric: citation.metric,
        line: citation.line,
        column: citation.column,
        citedValue: citation.citedValue,
        actualValue: numericActual,
        absError: roundNumber(absError),
        relErrorPct: roundNumber(relErrorPct),
        toleranceRule,
        isStrict,
        status: strictMatch ? 'exact_match' : 'out_of_tolerance',
        severity: strictMatch ? 'low' : 'high'
      };
    }

    const exactMatch = absError <= 1e-6;
    let status = 'within_tolerance';
    let severity = 'low';
    if (exactMatch) {
      status = 'exact_match';
    } else if (relErrorPct > 5) {
      status = 'out_of_tolerance';
      severity = relErrorPct > 20 ? 'high' : 'medium';
    }

    return {
      rowId: citation.rowId || `row_${index + 1}`,
      metric: citation.metric,
      line: citation.line,
      column: citation.column,
      citedValue: citation.citedValue,
      actualValue: numericActual,
      absError: roundNumber(absError),
      relErrorPct: roundNumber(relErrorPct),
      toleranceRule,
      isStrict,
      status,
      severity
    };
  });
};

const summarizeConcordanceRows = (rows) => {
  const summary = {
    totalRows: rows.length,
    exact: 0,
    withinTolerance: 0,
    outOfTolerance: 0,
    metricNotFound: 0,
    strictRows: 0,
    nonStrictRows: 0
  };

  rows.forEach((row) => {
    if (row.isStrict) summary.strictRows += 1;
    else summary.nonStrictRows += 1;

    if (row.status === 'exact_match') summary.exact += 1;
    else if (row.status === 'within_tolerance') summary.withinTolerance += 1;
    else if (row.status === 'out_of_tolerance') summary.outOfTolerance += 1;
    else if (row.status === 'metric_not_found') summary.metricNotFound += 1;
  });

  return summary;
};

export const validateNarrativeIntegrity = (generatedText, actualMetrics, { strictMode = false } = {}) => {
  const metricCitations = extractMetricCitations(generatedText);
  const citedMetrics = extractMetricsFromText(generatedText);
  const concordanceRows = buildConcordanceRows(metricCitations, actualMetrics || {});
  const concordanceSummary = summarizeConcordanceRows(concordanceRows);
  const discrepancies = [];

  const detectedGas = detectGaseousJargon(generatedText);
  if (detectedGas.length > 0) {
    discrepancies.push({
      type: 'GASEOUS_JARGON',
      severity: 'medium',
      message: `Detectada jerga gaseosa (escapismo poetico): ${detectedGas.join(', ')}. Recuerde que eres un Agujero Negro: la luz no escapa de los datos.`
    });
  }

  const detectedFabricatedMath = detectMathFabricationVocabulary(generatedText, actualMetrics || {});
  if (detectedFabricatedMath.length > 0) {
    discrepancies.push({
      type: 'MATH_VOCAB_FABRICATED',
      severity: 'medium',
      blocking: false,
      message: `Detectado vocabulario matematico fabricado: ${detectedFabricatedMath.join(', ')}. Use solo metrica formal implementada.`
    });
  }

  const textUpper = generatedText.toUpperCase();
  const hasCalcSection = textUpper.includes('[CÁLCULOS_DEL_CORE]') ||
    textUpper.includes('[CALCULOS_DEL_CORE]');
  const hasTranslSection = textUpper.includes('[TRADUCCIÓN_LINGÜÍSTICA]') ||
    textUpper.includes('[TRADUCCION_LINGUISTICA]');
  if (!hasCalcSection || !hasTranslSection) {
    discrepancies.push({
      type: 'STRUCTURAL_FAILURE',
      severity: strictMode ? 'high' : 'medium',
      message: `La respuesta no respeta la estructura de secciones obligatoria [CÁLCULOS_DEL_CORE] y [TRADUCCIÓN_LINGÜÍSTICA]. Modo: ${strictMode ? 'strict' : 'graceful'}.`
    });
  }

  const referencedFiles = [...generatedText.matchAll(FILE_REF_PATTERN)].map((match) => ({
    ref: match[0],
    index: match.index ?? -1
  }));
  const hallucinatedRefs = new Set();
  const tsPathRefs = new Set();

  referencedFiles.forEach(({ ref, index }) => {
    const normalizedRef = ref.toLowerCase();
    const basename = normalizedRef.split('/').pop() || '';
    const isKnownPath = REAL_CANONICAL_PATHS.has(normalizedRef);
    const isKnownBase = REAL_BASENAMES.has(basename);
    const isPathReference = normalizedRef.includes('/');
    const isKnownReference = isPathReference ? isKnownPath : (isKnownPath || isKnownBase);
    const isHypothetical = isHypotheticalReference(generatedText, index);

    if (!isKnownReference && !isHypothetical) {
      hallucinatedRefs.add(ref);
    }

    const hasTypescriptExtension = normalizedRef.endsWith('.ts') || normalizedRef.endsWith('.tsx');
    if (hasTypescriptExtension && !isHypothetical) {
      tsPathRefs.add(ref);
    }
  });

  if (hallucinatedRefs.size > 0) {
    discrepancies.push({
      type: 'HALLUCINATED_FILES',
      severity: 'high',
      message: `LLM menciono archivos inexistentes: ${[...hallucinatedRefs].join(', ')}. Los archivos reales estan en el mapa de introspeccion.`
    });
  }

  if (tsPathRefs.size > 0) {
    discrepancies.push({
      type: 'HALLUCINATED_EXTENSION',
      severity: 'medium',
      message: `LLM uso extensiones .ts/.tsx inexistentes: ${[...tsPathRefs].join(', ')}. El proyecto usa .js/.jsx.`
    });
  }

  // Detector de metodos alucinados v3.5 — Atribución Sintáctica Directa
  // CAMBIO ARQUITECTÓNICO v3.5: ya no usa ventana de proximidad (±300 chars).
  // Razón: la ventana generaba falsos positivos cuando el LLM escribía métodos de
  // OTROS archivos cerca de la mención de un archivo diferente (colisión de ventana).
  // Nueva estrategia: solo flaggear cuando hay atribución SINTÁCTICA DIRECTA, p.ej.:
  //   PhenomenologyCore.js -> calculateCCC()       ← DIRECTO: flaggear
  //   PhenomenologyCore.js.calculateCCC()          ← DIRECTO: flaggear
  //   PhenomenologyCore.js: calculateCCC()         ← DIRECTO: flaggear
  //   "(PhenomenologyCore.js -> calculateCCC())"   ← DIRECTO: flaggear
  //   "el calculo usa calculateCCC() ... (ver PhenomenologyCore.js)" ← SIN atribución: NO flaggear
  {
    // Patrón: <basename>[separador][método()>
    // Separadores aceptados: ->, ., :, " - ", "(" al final del nombre, espacio-directo
    // El método debe estar DESPUÉS del nombre del archivo con un separador inmediato
    const ATTRIBUTION_PATTERN = new RegExp(
      Object.keys(REAL_METHODS)
        .map(basename =>
          `${escapeRegExp(basename)}` +
          // separador: ->, →, ., :, "( ", " - ", " via " (con espacios opcionales)
          `\\s*(?:->|→|\\.|:\\s*|\\s+-\\s+|\\s+via\\s+)\\s*` +
          // nombre del método (grupo captura 1=basename, 2=método)
          `(?:[A-Za-z][A-Za-z0-9_]*)\\(\\)`
        )
        .join('|'),
      'gi'
    );

    // Iterar sobre todas las atribuciones explícitas encontradas en el texto
    const allAttributions = [...generatedText.matchAll(
      /([A-Za-z][A-Za-z0-9_]*\.jsx?)\s*(?:->|→|\.|:|\s+-\s+|\s+via\s+)\s*([A-Za-z][A-Za-z0-9_]*)\(\)/gi
    )];

    const flaggedByFile = {}; // { basename: Set<methodName> }

    for (const match of allAttributions) {
      const [fullMatch, citedFile, citedMethod] = match;
      const citedFileLower = citedFile.toLowerCase();

      // Saltar métodos privados y JS nativos
      if (citedMethod.startsWith('_')) continue;
      if (JS_NATIVE_METHODS.has(citedMethod)) continue;

      // Buscar si el archivo citado está en REAL_METHODS (case-insensitive)
      const canonicalBasename = Object.keys(REAL_METHODS).find(
        b => b.toLowerCase() === citedFileLower
      );
      if (!canonicalBasename) continue; // archivo no reconocido → lo cubre HALLUCINATED_FILES

      // Verificar si hay marcador hipotético cerca (±80 chars del match)
      const start = Math.max(0, match.index - 80);
      const end = Math.min(generatedText.length, match.index + fullMatch.length + 80);
      const nearbyText = generatedText.slice(start, end);
      if (HYPOTHETICAL_MARKER_PATTERN.test(nearbyText)) continue;

      // Verificar si el método existe en el archivo que el LLM citó explícitamente
      if (!REAL_METHODS[canonicalBasename].has(citedMethod)) {
        if (!flaggedByFile[canonicalBasename]) flaggedByFile[canonicalBasename] = new Set();
        flaggedByFile[canonicalBasename].add(citedMethod);
      }
    }

    for (const [basename, methods] of Object.entries(flaggedByFile)) {
      discrepancies.push({
        type: 'HALLUCINATED_METHOD',
        severity: 'high',
        blocking: true,
        message: `LLM cito funciones inexistentes en ${basename}: ${[...methods].join(', ')}. Metodos reales disponibles: ${[...REAL_METHODS[basename]].join(', ')}.`
      });
    }
  }

  for (const row of concordanceRows) {
    if (row.status === 'metric_not_found') {
      discrepancies.push({
        type: 'METRIC_NOT_FOUND',
        metric: row.metric,
        line: row.line,
        column: row.column,
        severity: row.severity,
        message: `LLM cito metrica "${row.metric}" que no existe en el Core (linea ${row.line}, columna ${row.column})`
      });
      continue;
    }

    if (row.status === 'out_of_tolerance') {
      if (row.isStrict) {
        discrepancies.push({
          type: 'VALUE_MISMATCH',
          metric: row.metric,
          line: row.line,
          column: row.column,
          cited: row.citedValue,
          actual: row.actualValue,
          error: Number(row.absError || 0).toFixed(6),
          severity: 'high',
          message: `${row.metric}: LLM reporto ${row.citedValue}, real es ${row.actualValue} (delta: ${Number(row.absError || 0).toFixed(6)}) en linea ${row.line}`
        });
      } else {
        const relError = Number(row.relErrorPct || 0);
        discrepancies.push({
          type: 'VALUE_MISMATCH',
          metric: row.metric,
          line: row.line,
          column: row.column,
          cited: row.citedValue,
          actual: row.actualValue,
          error: `${relError.toFixed(2)}%`,
          severity: relError > 20 ? 'high' : 'medium',
          message: `${row.metric}: LLM reporto ${Number(row.citedValue).toFixed(4)}, real es ${Number(row.actualValue).toFixed(4)} (error: ${relError.toFixed(1)}%) en linea ${row.line}`
        });
      }
    }
  }

  const hasBlockingDiscrepancy = discrepancies.some((entry) =>
    entry.blocking === true ||
    (
      entry.severity === 'high' &&
      (entry.type === 'VALUE_MISMATCH' || entry.type === 'METRIC_NOT_FOUND') &&
      STRICT_METRICS.has(entry.metric)
    )
  );

  return {
    valid: discrepancies.length === 0,
    totalCited: Object.keys(citedMetrics).length,
    totalCitations: metricCitations.length,
    totalDiscrepancies: discrepancies.length,
    discrepancies,
    concordance: {
      policy: {
        scope: 'full_table',
        surface: 'ui+audit_log',
        strictTolerance: 'strict_exact_1e-6',
        nonStrictTolerance: 'pct_5',
        strictMetrics: [...STRICT_METRICS]
      },
      summary: concordanceSummary,
      rows: concordanceRows
    },
    severity: discrepancies.some((entry) => entry.severity === 'high')
      ? 'high'
      : discrepancies.some((entry) => entry.severity === 'medium')
        ? 'medium'
        : 'low',
    blocking: hasBlockingDiscrepancy,
    structuralPenalty: discrepancies.length === 0
      ? 0
      : discrepancies.some((entry) => entry.severity === 'high')
        ? 0.2
        : 0.1
  };
};
