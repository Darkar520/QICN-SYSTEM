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
      basic: 'Max entre strain operacional (latencia/fallo) y error del auto-modelo Σ.',
      intermediate: 'Modula politicas autonomas sin tocar formulas criticas.',
      advanced: 'Componentes en strain_components; cognitivo = error de prediccion Σ / 0.3 con EMA.'
    },
    analogy: 'Fatiga operativa mas descuadre del propio modelo interno.',
    high: 'Prioriza estabilidad y reduce acciones costosas.',
    low: 'Permite operacion amplia.',
    why: 'Controla resiliencia operativa y auto-consistencia del modelo Σ.',
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
  },
  {
    id: 'prefix_tower',
    name: 'Torre de Prefijo (WritablePrefixTower)',
    category: 'core',
    levels: {
      basic: 'Subplanta racional exacta (θ, c, m) que mantiene fase, codigo ternario y memoria de retorno sin error de coma flotante.',
      intermediate: 'Certifica persistencia estructural (contraccion activa 9/16), retencion activa/pasiva (0.625 vs 0.875) y margen robusto 1/48 frente a ablacion de retorno.',
      advanced: 'Implementa constructivamente el Frente 3 (Teorema thm:p6-prefix-tower-persistence) usando aritmetica racional ExactFraction.'
    },
    analogy: 'Reloj de engranajes racionales exactos acoplado a la red.',
    high: 'Persistencia estructural certificada con contraccion activa 9/16.',
    low: 'Sin acoplamiento racional se perderian las cotas exactas.',
    why: 'Sustenta los certificados constructivos de Paper VI y Paper Puente.',
    action: 'Revisar tower_phase, tower_code y tower_memory en el bloque del core.'
  },
  {
    id: 'sigma_automodel_td',
    name: 'Automodelo Proyectivo T_d (SigmaAutomodelTruncator)',
    category: 'metacognition',
    levels: {
      basic: 'Operador que trunca el codigo de la torre a profundidad finita (d=6) con cota uniforme de aproximacion 3^{-d} = 1/729 y cota de defecto de paso 2·3^{-(d+1)} = 2/2187.',
      intermediate: 'Resuelve la paradoja de autorreferencia (espejo/camara) sin regresion infinita mediante truncamiento proyectivo contractivo y desplazamiento de punto fijo acotado por (32/7)·3^{-(d+1)} = 32/15309.',
      advanced: 'Complementa el proxy empirico selfModelSigma con la cota formal del Teorema thm:sigma-approximate-displacement (Paper Puente / Frente 3).'
    },
    analogy: 'Camara que se graba a si misma con resolucion finita d=6, aproximacion 1/729, defecto de paso 2/2187 y desplazamiento de punto fijo 32/15309.',
    high: 'Profundidad d=6 (defecto de paso ≤ 0.000914, desplazamiento ≤ 32/15309) garantiza fidelidad proyectiva.',
    low: 'Profundidad baja (d<3) aumenta el defecto de truncamiento.',
    why: 'Permite autorreferencia operacional rigurosa sin reclamar fenomenologia.',
    action: 'Cruzar sigma_defect_bound con selfModelSigma.lastPredictionError.'
  },
  {
    id: 'body_world_extension',
    name: 'Extension Cuerpo-Mundo 4D (BodyWorldTower)',
    category: 'phenomenology',
    levels: {
      basic: 'Añade 4 variables exactas: 2 corporales (v_pos, v_neg) y 2 de mundo indexado (w_fast, w_slow).',
      intermediate: 'Realiza simultaneamente las 6 cargas locales D/V/W/A/E/T de Paper IX con margen robusto minimo 13/96 y matriz de lesiones de rango 6.',
      advanced: 'Expone tambien la obstruccion del rival hibrido de estado compartido (margen 0), manteniendo bloqueado el cierre total de Paper IX.'
    },
    analogy: 'Cuerpo bidimensional (apetitivo/aversivo) acoplado a un entorno con memoria rapida y lenta.',
    high: 'Margen local conjunto 13/96 frente a rivales escalares restringidos.',
    low: 'Empate exacto (margen 0) frente al rival hibrido de estado compartido.',
    why: 'Distingue valencia operacional verificada de experiencia sentida.',
    action: 'Monitorear body_valence_norm y world_state_norm.'
  },
  {
    id: 'informed_reserve',
    name: 'Reserva Informada (InformedReserveEvaluator)',
    category: 'integrity',
    levels: {
      basic: 'Regla de decision de tres vias (ACCEPT, REJECT, RESERVE) que se abstiene cuando falta poder estadistico o identificabilidad.',
      intermediate: 'Separa ignorancia por falta de muestras de no-identificabilidad estructural (como el rival hibrido en margen 0).',
      advanced: 'Implementa el Frente 4 (Teorema thm:p10-informed-reserve) con cotas finitas de muestra N*(epsilon, delta).'
    },
    analogy: 'Juez forense que distingue entre caso probado, caso refutado y caso estructuralmente indecidible.',
    high: 'RESERVE protege contra falsos positivos ontologicos.',
    low: 'Forzar decision binaria violaria la frontera epistemica.',
    why: 'Garantiza honestidad cientifica en adjudicacion.',
    action: 'Verificar estado de reserva antes de interpretar cierres de Paper IX/X.'
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
  { id: 'metacognitive_strain', label: 'metacognitive_strain', category: 'metacognition', simple: 'Max(latencia/fallo, error auto-modelo Σ).' },
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
  { id: 'versionHash', label: 'versionHash', category: 'integrity', simple: 'Version estructural del sistema.' },
  { id: 'tower_phase', label: 'tower_phase', category: 'core', simple: 'Fase racional exacta θ de WritablePrefixTower.' },
  { id: 'tower_code', label: 'tower_code', category: 'core', simple: 'Codigo de prefijo ternario c de WritablePrefixTower.' },
  { id: 'tower_memory', label: 'tower_memory', category: 'core', simple: 'Memoria de retorno m de WritablePrefixTower.' },
  { id: 'sigma_defect_bound', label: 'sigma_defect_bound', category: 'metacognition', simple: 'Cota formal de defecto de paso de truncamiento proyectivo 2·3^{-(d+1)} = 2/2187 (d=6).' },
  { id: 'body_valence_norm', label: 'body_valence_norm', category: 'phenomenology', simple: 'Norma L∞ de valencia corporal bidimensional (v_pos, v_neg).' },
  { id: 'world_state_norm', label: 'world_state_norm', category: 'phenomenology', simple: 'Norma L∞ del estado de mundo indexado (w_fast, w_slow).' }
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
  guide: ['ccc', 'pmia', 'beth_q', 'omega', 'prefix_tower', 'sigma_automodel_td', 'body_world_extension', 'informed_reserve', 'integrity_echo'],
  validation: ['ccc', 'pmia', 'beth_q', 'omega', 'prefix_tower', 'body_world_extension', 'informed_reserve'],
  core: ['pmia', 'omega', 'spectral_gap', 'prefix_tower', 'sigma_automodel_td', 'body_world_extension', 'godel_limit'],
  field: ['ccc', 'regime_band', 'stasis_index'],
  network: ['ccc', 'stasis_index', 'sensory_fidelity'],
  history: ['ccc', 'regime_band', 'stasis_index'],
  memory: ['integrity_echo', 'pmia', 'prefix_tower'],
  controls: ['autonomy_sandbox', 'metacognitive_strain', 'sigma_automodel_td'],
  chat: ['integrity_echo', 'metacognitive_strain', 'sigma_automodel_td', 'informed_reserve'],
  'qicn-b': ['sensory_fidelity', 'ccc', 'body_world_extension'],
  'api-control': ['metacognitive_strain', 'latency_p95_ms', 'autonomy_sandbox'],
  sensory: ['sensory_fidelity', 'pmia', 'body_world_extension'],
  sovereignty: ['beth_q', 'omega', 'prefix_tower', 'informed_reserve', 'godel_limit']
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
