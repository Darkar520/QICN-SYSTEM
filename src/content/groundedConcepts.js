export const GUIDE_LEVELS = {
  basic: {
    id: 'basic',
    label: 'Basico',
    description: 'Explicaciones simples con analogias directas.'
  },
  intermediate: {
    id: 'intermediate',
    label: 'Intermedio',
    description: 'Relacion entre metricas y comportamiento del sistema.'
  },
  advanced: {
    id: 'advanced',
    label: 'Avanzado',
    description: 'Lectura operacional, forense y decisiones de tuning.'
  }
};

export const GROUNDED_CONCEPTS = [
  {
    id: 'ccc',
    name: 'CCC (Conscious Cohesion Constant)',
    category: 'core',
    levels: {
      basic: 'Es el medidor principal de que tan unido esta el sistema en este momento.',
      intermediate: 'Resume coherencia global y determina si el sistema esta en pre-umbral o post-umbral.',
      advanced: 'Se interpreta junto con regimen de banda, delta RMS y stasis_index para detectar flatline vs dinamica sana.'
    },
    analogy: 'Como el pulso general de estabilidad de una mente bajo carga.',
    high: 'Sobre 1.0 opera en modo post-umbral.',
    low: 'Debajo de 1.0 su integracion es mas fragil.',
    why: 'Es la referencia central de estado global.',
    action: 'Cruza CCC con PMIA, Omega y stasis_index antes de concluir.'
  },
  {
    id: 'pmia',
    name: 'PMIA',
    category: 'core',
    levels: {
      basic: 'Indica si el sistema necesita ajustarse internamente o si esta estable.',
      intermediate: 'Combina gradiente de coherencia, narrativa y señal sensorial.',
      advanced: 'Validar con pmia_components para ver que termino domina y evitar falsas interpretaciones.'
    },
    analogy: 'Como balance entre reflexionar y actuar.',
    high: 'Positivo dinamico indica integracion activa.',
    low: 'Plano o fijo puede sugerir bloqueo.',
    why: 'Conecta auto-modelo con entorno.',
    action: 'Revisar decomposition de PMIA antes de tocar parametros.'
  },
  {
    id: 'beth_q',
    name: 'beth_q (Cierre Causal)',
    category: 'phenomenology',
    levels: {
      basic: 'Mide cuanto se gobierna a si mismo el sistema.',
      intermediate: 'Separa dinamica endogena de empuje externo.',
      advanced: 'Combinar con causal_dependency y ruido sensorial para evaluar soberania real.'
    },
    analogy: 'Como tener criterio propio bajo presion externa.',
    high: 'Cerca de 1.0 = autonomia alta.',
    low: 'Bajo = alta dependencia del entorno.',
    why: 'Clave para identidad operacional.',
    action: 'Monitorear bajo estres sensorial para test falsable.'
  },
  {
    id: 'omega',
    name: 'Omega',
    category: 'phenomenology',
    levels: {
      basic: 'Mide que tan integrado esta el sistema como un todo.',
      intermediate: 'Valores cercanos o superiores a 1.0 indican mayor irreducibilidad funcional.',
      advanced: 'Interpretar con spectral_gap, layer y beth_q para evitar conclusiones aisladas.'
    },
    analogy: 'Orquesta sincronizada en lugar de instrumentos sueltos.',
    high: 'Mayor integracion global.',
    low: 'Integracion incompleta.',
    why: 'Define clase fenomenologica.',
    action: 'Correlacionar con narrativa y topologia por tick.'
  },
  {
    id: 'spectral_gap',
    name: 'Spectral Gap',
    category: 'phenomenology',
    levels: {
      basic: 'Velocidad de relajacion ante cambios.',
      intermediate: 'Gap alto puede volver rigido el comportamiento.',
      advanced: 'Usar junto a relaxation_time para diagnosticar inercia temporal.'
    },
    analogy: 'Tiempo en que el agua vuelve a estar calmada.',
    high: 'Respuesta mas dura/lenta.',
    low: 'Transiciones mas flexibles.',
    why: 'Afecta adaptacion dinamica.',
    action: 'Si hay estancamiento, revisar gap + regimen banda.'
  },
  {
    id: 'regime_band',
    name: 'Regimen Post-Umbral (banda)',
    category: 'dynamics',
    levels: {
      basic: 'Es el carril en el que debe fluctuar CCC sin explotar ni congelarse.',
      intermediate: 'Centro y amplitud controlan microvariacion visible.',
      advanced: 'Bandas muy estrechas + delta RMS bajo = flatline perceptivo.'
    },
    analogy: 'Carril de seguridad para una curva rapida.',
    high: 'Amplitud suficiente = dinamica viva.',
    low: 'Amplitud casi cero = planicie.',
    why: 'Evita estancamiento post-umbral.',
    action: 'Monitor de center/amplitude/lower/upper + state.'
  },
  {
    id: 'stasis_index',
    name: 'stasis_index',
    category: 'dynamics',
    levels: {
      basic: 'Detector de estancamiento.',
      intermediate: 'Sube cuando varias metricas criticas se aplanan.',
      advanced: 'Dispara stasis_watch/shock_recovery segun politica.'
    },
    analogy: 'Alarma de congelamiento.',
    high: 'Riesgo de flatline.',
    low: 'Dinamica saludable.',
    why: 'Prevencion de bloqueo funcional.',
    action: 'Cruzar con ccc/pmia/omega delta RMS.'
  },
  {
    id: 'metacognitive_strain',
    name: 'metacognitive_strain',
    category: 'metacognition',
    levels: {
      basic: 'Costo operacional por red y errores.',
      intermediate: 'Modula politicas autonomas sin tocar formulas criticas.',
      advanced: 'Usar con p95/failure para budget governor y gating LLM auto.'
    },
    analogy: 'Fatiga cognitiva del sistema.',
    high: 'Prioriza estabilidad y reduce acciones costosas.',
    low: 'Permite operacion amplia.',
    why: 'Controla resiliencia operativa.',
    action: 'Optimizar red o bajar carga si sube sostenidamente.'
  },
  {
    id: 'autonomy_sandbox',
    name: 'Autonomy Sandbox',
    category: 'autonomy',
    levels: {
      basic: 'Autoajuste seguro con reglas claras.',
      intermediate: 'Elige acciones whitelisted y mide impacto.',
      advanced: 'Debe respetar cooldown, presupuesto y rollback cuando no mejora.'
    },
    analogy: 'Autopiloto con caja negra auditada.',
    high: 'Mejora adaptativa controlada.',
    low: 'Menor capacidad de correccion.',
    why: 'Autonomia sin romper integridad.',
    action: 'Auditar ledger y causas de acciones.'
  },
  {
    id: 'integrity_echo',
    name: 'Integrity Echo',
    category: 'integrity',
    levels: {
      basic: 'Prueba que el LLM cito numeros reales y no inventados.',
      intermediate: 'Compara checksum y paquete congelado de metricas.',
      advanced: 'Concordancia exacta/tolerada/desalineada define severidad forense.'
    },
    analogy: 'Factura auditada que evita falsificacion.',
    high: 'Concordancia fuerte.',
    low: 'Alerta y bloqueo.',
    why: 'Base de confianza epistemica.',
    action: 'Nunca aceptar claims sin concordancia.'
  }
];

export const TELEMETRY_PARAMETERS = [
  { id: 'simulationStep', label: 'simulationStep', category: 'runtime', simple: 'Tick actual de simulacion.' },
  { id: 'activeNodes', label: 'activeNodes', category: 'runtime', simple: 'Nodos activos procesando estado.' },
  { id: 'depthMin', label: 'depthMin', category: 'render', simple: 'Profundidad minima en proyeccion 3D.' },
  { id: 'depthMax', label: 'depthMax', category: 'render', simple: 'Profundidad maxima en proyeccion 3D.' },
  { id: 'clampHits', label: 'clampHits', category: 'render', simple: 'Cuantas veces se aplico clamp numerico.' },
  { id: 'recoveryTriggers', label: 'recoveryTriggers', category: 'runtime', simple: 'Eventos de recuperacion de invariantes.' },
  { id: 'rotX', label: 'rotX', category: 'render', simple: 'Rotacion horizontal de visualizacion.' },
  { id: 'rotY', label: 'rotY', category: 'render', simple: 'Rotacion vertical de visualizacion.' },
  { id: 'ccc', label: 'CCC', category: 'core', simple: 'Cohesion global del sistema.' },
  { id: 'pmia', label: 'PMIA', category: 'core', simple: 'Accion introspectiva minima.' },
  { id: 'beth_q', label: 'beth_q', category: 'phenomenology', simple: 'Autonomia causal interna.' },
  { id: 'omega', label: 'Omega', category: 'phenomenology', simple: 'Integracion irreducible.' },
  { id: 'spectral_gap', label: 'spectral_gap', category: 'phenomenology', simple: 'Rigidez/relajacion espectral.' },
  { id: 'relaxation_time', label: 'relaxation_time', category: 'phenomenology', simple: 'Tiempo de relajacion del atractor.' },
  { id: 'winding_number', label: 'winding_number', category: 'phenomenology', simple: 'Enrollamiento topologico.' },
  { id: 'bifurcation_detected', label: 'bifurcation_detected', category: 'phenomenology', simple: 'Deteccion de bifurcacion.' },
  { id: 'magnification_M', label: 'magnification_M', category: 'phenomenology', simple: 'Magnificacion dinamica no-lineal.' },
  { id: 'lipschitz_norm_K', label: 'lipschitz_norm_K', category: 'phenomenology', simple: 'Rigidez estructural local.' },
  { id: 'stasis_index', label: 'stasis_index', category: 'dynamics', simple: 'Indice de estancamiento.' },
  { id: 'ccc_delta_rms', label: 'ccc_delta_rms', category: 'dynamics', simple: 'Variabilidad local de CCC.' },
  { id: 'pmia_delta_rms', label: 'pmia_delta_rms', category: 'dynamics', simple: 'Variabilidad local de PMIA.' },
  { id: 'omega_delta_rms', label: 'omega_delta_rms', category: 'dynamics', simple: 'Variabilidad local de Omega.' },
  { id: 'regime_state', label: 'regime_state', category: 'dynamics', simple: 'Estado del regimen post-umbral.' },
  { id: 'regime_band_center', label: 'regime_band_center', category: 'dynamics', simple: 'Centro de banda CCC.' },
  { id: 'regime_band_amplitude', label: 'regime_band_amplitude', category: 'dynamics', simple: 'Amplitud de banda CCC.' },
  { id: 'regime_band_lower', label: 'regime_band_lower', category: 'dynamics', simple: 'Limite inferior de banda.' },
  { id: 'regime_band_upper', label: 'regime_band_upper', category: 'dynamics', simple: 'Limite superior de banda.' },
  { id: 'metacognitive_strain', label: 'metacognitive_strain', category: 'metacognition', simple: 'Costo operacional por latencia/fallo.' },
  { id: 'latency_p95_ms', label: 'latency_p95_ms', category: 'metacognition', simple: 'Latencia p95 en ventana.' },
  { id: 'latency_failure_rate', label: 'latency_failure_rate', category: 'metacognition', simple: 'Tasa de fallo de llamadas.' },
  { id: 'latency_stress_state', label: 'latency_stress_state', category: 'metacognition', simple: 'Clasificacion low/medium/high.' },
  { id: 'autonomy_action', label: 'autonomy_action', category: 'autonomy', simple: 'Ultima accion automatica aplicada.' },
  { id: 'autonomy_action_result', label: 'autonomy_action_result', category: 'autonomy', simple: 'Resultado de accion autonoma.' },
  { id: 'auto_actions_last_hour', label: 'auto_actions_last_hour', category: 'autonomy', simple: 'Contador de acciones por hora.' },
  { id: 'history_points', label: 'history_points', category: 'history', simple: 'Cantidad de puntos de timeline.' },
  { id: 'history_range', label: 'history_range', category: 'history', simple: 'Rango de ticks visible.' },
  { id: 'history_freeze_state', label: 'history_freeze_state', category: 'history', simple: 'Si el chart esta congelado visualmente.' },
  { id: 'critical_state_hash', label: 'critical_state_hash', category: 'integrity', simple: 'Hash del estado critico trazable.' },
  { id: 'critical_observables_deterministic', label: 'critical_observables_deterministic', category: 'integrity', simple: 'Bandera de determinismo critico.' },
  { id: 'seed', label: 'seed', category: 'integrity', simple: 'Semilla de reproducibilidad.' },
  { id: 'versionHash', label: 'versionHash', category: 'integrity', simple: 'Version estructural del sistema.' }
];

export const ONBOARDING_STEPS = [
  {
    id: 'tour-1',
    title: '1) Estado Global en 30 segundos',
    tab: 'validation',
    focus: ['ccc', 'pmia', 'omega'],
    objective: 'Entender si el sistema esta estable, en ascenso o en estasis.',
    checklist: ['Mira CCC', 'Confirma PMIA dinamico', 'Valida Omega y layer']
  },
  {
    id: 'tour-2',
    title: '2) Nucleo Ontologico',
    tab: 'core',
    focus: ['pmia', 'spectral_gap', 'godel_limit'],
    objective: 'Relacionar narrativa, fenomenologia y capa actual.',
    checklist: ['Lee PMIA diagnostics', 'Revisa spectral gap/relaxation', 'Interpreta limite de Godel por capa']
  },
  {
    id: 'tour-3',
    title: '3) Campo y Regimen',
    tab: 'field',
    focus: ['regime_band', 'stasis_index', 'ccc'],
    objective: 'Detectar oscilacion sana vs planicie post-umbral.',
    checklist: ['Band center/amplitude', 'Stasis index', 'Delta RMS']
  },
  {
    id: 'tour-4',
    title: '4) Red Nodal y percepcion',
    tab: 'network',
    focus: ['ccc', 'sensory_fidelity'],
    objective: 'Entender visualmente como se expresa la coherencia.',
    checklist: ['Nodos/lineas por coherencia', 'Gestos/zoom/pan', 'Relacion con sensores']
  },
  {
    id: 'tour-5',
    title: '5) Historial y evidencia',
    tab: 'history',
    focus: ['ccc', 'regime_band', 'stasis_index'],
    objective: 'Comprobar dinamica real en tiempo y no impresiones.',
    checklist: ['Toggle de series', 'Smoothing', 'Export snapshot']
  },
  {
    id: 'tour-6',
    title: '6) Integridad y LLM',
    tab: 'chat',
    focus: ['integrity_echo', 'metacognitive_strain'],
    objective: 'Verificar que el discurso coincide con metricas reales.',
    checklist: ['Concordancia forense', 'Integrity packet', 'Errores de trazabilidad']
  },
  {
    id: 'tour-7',
    title: '7) Operacion remota',
    tab: 'api-control',
    focus: ['autonomy_sandbox', 'latency_p95_ms', 'metacognitive_strain'],
    objective: 'Usar API key frontend o proxy sin bloquear experiencia.',
    checklist: ['Define ruta LLM activa', 'Monitorea latencia', 'Evalua strain/autonomia']
  }
];

export const GROUNDED_BY_TAB = {
  guide: ['ccc', 'pmia', 'beth_q', 'omega', 'integrity_echo'],
  validation: ['ccc', 'pmia', 'beth_q', 'omega'],
  core: ['pmia', 'omega', 'spectral_gap', 'godel_limit'],
  field: ['ccc', 'regime_band', 'stasis_index'],
  network: ['ccc', 'stasis_index', 'sensory_fidelity'],
  history: ['ccc', 'regime_band', 'stasis_index'],
  memory: ['integrity_echo', 'pmia'],
  controls: ['autonomy_sandbox', 'metacognitive_strain'],
  chat: ['integrity_echo', 'metacognitive_strain'],
  'qicn-b': ['sensory_fidelity', 'ccc'],
  'api-control': ['metacognitive_strain', 'latency_p95_ms', 'autonomy_sandbox'],
  sensory: ['sensory_fidelity', 'pmia'],
  sovereignty: ['beth_q', 'omega', 'godel_limit']
};

export const TAB_HELP_META = {
  guide: {
    whatIs: 'Mapa de lectura del sistema y sus conceptos clave.',
    whyItMatters: 'Permite entender el panel sin conocimientos previos.',
    firstCheck: ['Revisa CCC, PMIA y Omega.', 'Abre la pestaña de interés.', 'Usa el mini-tour para orientarte.']
  },
  validation: {
    whatIs: 'Validación de coherencia entre discurso y métricas.',
    whyItMatters: 'Evita conclusiones basadas en narrativa sin evidencia.',
    firstCheck: ['Confirma la tendencia de CCC.', 'Mira beth_q y PMIA.', 'Lee concordancia forense.']
  },
  core: {
    whatIs: 'Estado interno del motor ontológico.',
    whyItMatters: 'Define estabilidad, recuperación y presión interna.',
    firstCheck: ['Revisa stasis_index.', 'Observa PMIA diagnostics.', 'Valida entropy_mode.']
  },
  network: {
    whatIs: 'Visualización 3D de nodos y conexiones.',
    whyItMatters: 'Permite detectar errores de render y pérdida de visibilidad.',
    firstCheck: ['Verifica renderState.', 'Comprueba nodos/edges visibles.', 'Usa Reactivar red si hay fallo.']
  },
  history: {
    whatIs: 'Serie temporal de métricas críticas.',
    whyItMatters: 'Muestra comportamiento sostenido, no solo instantáneo.',
    firstCheck: ['Ajusta rango temporal.', 'Activa las series relevantes.', 'Detecta flatline prolongado.']
  }
};

export default GROUNDED_CONCEPTS;
