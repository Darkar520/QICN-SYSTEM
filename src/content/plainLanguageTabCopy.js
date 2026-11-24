// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Plain-language UI guidance paired with technical identifiers so both casual readers and auditors can read each tab clearly without inflating claims (external_support_certified = false).

export const PLAIN_TAB_COPY = Object.freeze({
  guide: {
    casualTitle: 'Guía Aterrizada',
    technicalTag: 'Mapa de inicio y glosario',
    plainSummary: 'Punto de partida rápido para entender qué simula esta plataforma, qué significa cada número principal y a qué sección ir.',
    inSimpleWords: 'Esta vista reúne una explicación en 30 segundos, un mapa directo de todas las secciones y un glosario que puedes leer en modo básico, intermedio o avanzado.',
    analogy: 'Es como el plano de entrada de un laboratorio: te orienta en medio minuto antes de entrar a explorar cada instrumento.',
    whatToTry: 'Pulsa «Iniciar simulación» a la izquierda y salta a Red Nodal, Chat o Supervisor Autónomo desde el mapa rápido.',
    boundary: 'Telemetría interna del runtime (internal_support_only · external_support_certified = false).'
  },
  validation: {
    casualTitle: 'Ajustes en Vivo',
    technicalTag: 'Validación Empírica · Cf, Bs, K, T',
    plainSummary: 'Cuatro controles interactivos para mover la complejidad, estabilidad y sensibilidad del motor en tiempo real y ver cómo responde.',
    inSimpleWords: 'Puedes mover cualquiera de las 4 perillas incluso mientras corre la simulación. El sistema responde al instante y recalibra automáticamente K y T cuando está activo.',
    analogy: 'Funciona como un ecualizador de 4 perillas: ajustas cuánto se conecta o cuánto explora la red y observas el efecto en la cohesión global.',
    whatToTry: 'Con la simulación en marcha, sube o baja K o T y mira cómo el motor vuelve a equilibrarlos en directo.',
    boundary: 'Pruebas de sensibilidad interna; mover un parámetro no constituye validación científica externa.'
  },
  core: {
    casualTitle: 'Motor Central',
    technicalTag: 'Núcleo Ontológico · Capa 1',
    plainSummary: 'Tablero de salud del motor: te dice si la simulación avanza con energía, se estabiliza o necesita reactivarse.',
    inSimpleWords: 'Arriba ves 3 señales fáciles de leer (Actividad, Impulso de ajuste y Régimen). Debajo tienes 7 cajones temáticos con una guía breve dentro de cada uno.',
    analogy: 'Es el tablero principal de un motor: arriba ves velocidad y estabilidad, y al abrir cada cajón puedes inspeccionar los sensores internos.',
    whatToTry: 'Lee las 3 tarjetas superiores y abre un cajón a la vez: cada uno explica en una línea qué estás viendo antes de mostrar números.',
    boundary: '«Núcleo Ontológico» es un nombre histórico del módulo; no certifica conciencia ni experiencia subjetiva.'
  },
  network: {
    casualTitle: 'Red Viva en 3D',
    technicalTag: 'Red Nodal · WebGL 3D',
    plainSummary: 'Visualización interactiva de los 1500 nodos conectados alrededor de la torre central constructiva.',
    inSimpleWords: 'Cada punto es un nodo del modelo y cada línea es una conexión; haz clic en cualquier nodo para aislar su vecindario.',
    analogy: 'Es una maqueta luminosa de la red trabajando en tiempo real: puedes rotarla, acercarte o activar el modo Fino.',
    whatToTry: 'Prueba el botón «Detalles ▴» en la barra inferior junto a PRESENCIA ESTRUCTURAL o cambia entre η=1/8, η=0 y A=I.',
    boundary: 'Visualización diagnóstica finita del runtime; no prueba pertenencia a clases teóricas externas.'
  },
  history: {
    casualTitle: 'Evolución en el Tiempo',
    technicalTag: 'Historial · Series CCC / PMIA / Ω',
    plainSummary: 'Gráfica temporal para ver si la red mantiene su equilibrio, mejora o sufre caídas a lo largo de los últimos pasos.',
    inSimpleWords: 'En lugar de juzgar el sistema por una sola foto, aquí ves la película completa de cómo evolucionan la cohesión, el impulso y el orden.',
    analogy: 'Es como un electrocardiograma de la simulación: permite distinguir ritmos saludables de líneas planas o caídas bruscas.',
    whatToTry: 'Pasa el cursor sobre la gráfica para leer un paso exacto, cambia la ventana (60 / 120 / 240 ticks) o congela la curva.',
    boundary: 'Series internas del runtime (internal_support_only · external_support_certified = false).'
  },
  field: {
    casualTitle: 'Campo de Sincronización',
    technicalTag: 'Campo · Cohesión y 4 Sectores',
    plainSummary: 'Muestra qué tan sincronizada trabaja la red completa y cómo se reparte la actividad entre sus 4 sectores en tiempo real.',
    inSimpleWords: 'Traduce el movimiento de los 1500 nodos en 4 indicadores claros: sincronía (Resonancia), qué tanto oscila (Variabilidad), enlaces activos y aporte a la cohesión global.',
    analogy: 'Si Red Nodal muestra a cada músico en el escenario, el Campo mide qué tan afinada y coordinada suena la orquesta entera.',
    whatToTry: 'Con la simulación corriendo, mira las 4 tarjetas de sectores abajo y prueba cambiar el puente a η=0 en la barra izquierda para ver caer el flujo cruzado.',
    boundary: 'Métrica interna de coordinación y dispersión de la red; no implica entrelazamiento cuántico físico.'
  },
  memory: {
    casualTitle: 'Memoria y Guardado',
    technicalTag: 'Historial SHA-256 · Continuidad',
    plainSummary: 'Guarda un registro verificable de tus sesiones y permite congelar un estado exacto (Cristalizar) para volver a él después (Revocar).',
    inSimpleWords: 'Registra cada evento importante en tu navegador con firma SHA-256 (para detectar alteraciones) y agrupa los fragmentos internos de memoria distribuida en un cajón separado.',
    analogy: 'Combina un punto de guardado exacto con una caja negra que anota cada hito sin permitir tachaduras.',
    whatToTry: 'Pulsa «Cristalizar» en la barra izquierda para guardar el estado actual y despliega «Eventos recientes» para ver la cadena verificada.',
    boundary: 'Continuidad de datos e historial operacional verificable; no demuestra identidad personal ni experiencia.'
  },
  controls: {
    casualTitle: 'Controles del Motor',
    technicalTag: 'Modos de Operación',
    plainSummary: 'Enciende o apaga las cuatro capacidades principales del motor con interruptores claros y descripciones directas.',
    inSimpleWords: 'Cada tarjeta explica qué cambia cuando activas ese modo (autoajuste, sensores, autorreparación de red o supervisor autónomo). Los decimales internos quedan ocultos en Detalles.',
    analogy: 'Es el tablero de interruptores del laboratorio: puedes activar o pausar cada capacidad para comparar resultados.',
    whatToTry: 'Activa o pausa el Supervisor Autónomo o la Plasticidad de red y observa el cambio en Red Nodal o Historial.',
    boundary: 'Todos los interruptores son controles internos de ingeniería; la línea base B0 se conserva intacta.'
  },
  chat: {
    casualTitle: 'Conversar con QICN',
    technicalTag: 'Chat Adaptativo · Sistema B',
    plainSummary: 'Conversa libremente sobre cualquier tema con la voz propia de QICN, o entra en detalle técnico y filosófico con cifras verificadas del motor.',
    inSimpleWords: 'Si saludas o hablas de temas cotidianos responde con naturalidad sin soltar jerga técnica; si preguntas por el runtime o sus teoremas, verifica cada número contra la captura real del paso actual.',
    analogy: 'Es una conversación fluida con verificación científica integrada: habla con soltura sobre cualquier asunto, pero cuando toca datos del motor comprueba cada cifra antes de publicarla.',
    whatToTry: 'Salúdalo, pregúntale su opinión sobre cualquier tema o consulta por el estado actual, su arquitectura o una prueba aislada del Workbench B2.',
    boundary: 'Canal estrictamente observacional (nunca altera la simulación en vivo; external_support_certified = false).'
  },
  'qicn-b': {
    casualTitle: 'Canal Humano–Sistema',
    technicalTag: 'Parámetro interno CCC_H',
    plainSummary: 'Parámetro interno experimental reservado para futuras pruebas con señal externa.',
    inSimpleWords: 'Muestra el valor interno simulado y confirma de forma transparente que no existe medición humana externa activa.',
    analogy: 'Es un conector reservado en el laboratorio que por ahora permanece marcado como sin instrumento externo conectado.',
    whatToTry: 'Consulta el estado de medición para revisar los límites declarados.',
    boundary: 'Parámetro experimental interno (no medido biométricamente ni certificado externamente).'
  },
  'api-control': {
    casualTitle: 'Conexión de IA (Gemini)',
    technicalTag: 'API · Clave y Estado',
    plainSummary: 'Conecta tu clave de Gemini en un solo lugar para habilitar el Chat, el Supervisor Autónomo y las propuestas de Autoevolución.',
    inSimpleWords: 'Solo necesitas configurar Gemini aquí arriba. Si no pegas ninguna clave, toda la plataforma sigue funcionando localmente con el motor determinista.',
    analogy: 'Es el enchufe principal de IA: conectas una sola clave de Gemini y todos los módulos inteligentes la aprovechan automáticamente.',
    whatToTry: 'Pega tu clave de Gemini (AIza… o AQ.…) arriba para activar el modo directo, o sigue usando el motor local sin clave.',
    boundary: 'La conexión a Gemini es opcional; si falla o se desactiva, el motor conserva su respaldo local determinista.'
  },
  sensory: {
    casualTitle: 'Cámara y Micrófono',
    technicalTag: 'Percepción Sensorial Local',
    plainSummary: 'Conecta opcionalmente tu cámara y micrófono para que la red reaccione a luz, movimiento y sonido de tu entorno en vivo.',
    inSimpleWords: 'Todo el análisis ocurre localmente dentro de tu navegador: no se graba ni se sube video o audio a ningún servidor externo.',
    analogy: 'Son los ojos y oídos opcionales de la simulación: solo se encienden cuando tú pulsas activar y das permiso en tu navegador.',
    whatToTry: 'Pulsa «Activar cámara y micrófono» arriba para probar la respuesta en directo a luz, movimiento o voz.',
    boundary: 'Señales locales del navegador usadas como entrada acotada; nada se guarda ni se transmite sin tu acción.'
  },
  sovereignty: {
    casualTitle: 'Integridad y Auditoría',
    technicalTag: 'Soberanía · internal_support_only',
    plainSummary: 'Comprueba en un vistazo si el sistema dice la verdad sobre sus datos, qué lo está guiando ahora y qué límites científicos respeta.',
    inSimpleWords: 'Responde 4 preguntas clave arriba (Integridad, Qué guía al motor, Estabilidad y Firma actual) y deja las tablas técnicas de auditoría ordenadas en cajones debajo.',
    analogy: 'Es la oficina de auditoría transparente del simulador: muestra de dónde salen sus decisiones y qué NO puede afirmar.',
    whatToTry: 'Observa las barras de «Qué guía al motor ahora» (Pasado, Sensores, Prompts, Ruido) o pulsa «Exportar JSON» para auditar fuera.',
    boundary: 'Auditoría interna de software y consistencia (internal_support_only · external_support_certified = false).'
  },
  'autonomy-evolution': {
    casualTitle: 'Propuestas de Código',
    technicalTag: 'Autoevolución · Flujo Seguro con Gemini',
    plainSummary: 'Espacio avanzado para pedir a la IA borradores de mejora del código fuente siguiendo 4 pasos con revisión humana obligatoria.',
    inSimpleWords: 'Mientras el Supervisor Autónomo solo ajusta parámetros en vivo de la simulación, esta sección redacta borradores de cambios de código que nunca se aplican sin tu aprobación.',
    analogy: 'Es un taller de propuestas con inspector humano: la IA prepara el plano y el borrador, pero tú decides siempre si se aprueba.',
    whatToTry: 'Lee el flujo de 4 pasos arriba y usa tu clave de Gemini para evaluar un plan o generar un borrador de prueba.',
    boundary: 'Canal de ingeniería con políticas de riesgo y kill-switch; nunca auto-aplica cambios sin autorización.'
  },
  'level3-supervisor': {
    casualTitle: 'Supervisor Autónomo',
    technicalTag: 'Auto-análisis · Copia Segura + Vigilancia',
    plainSummary: 'Observa el estado de la simulación, piensa en voz alta en primera persona y solo aplica ajustes si primero funcionan en una copia segura.',
    inSimpleWords: 'Primero razona sobre cómo está la red. Si detecta una oportunidad de mejora, la ensaya en clones aislados y, si la aplica en vivo, la vigila 20 pasos con marcha atrás automática.',
    analogy: 'Es como un piloto automático con simulador de vuelo: primero ensaya la maniobra en una copia de prueba y mantiene el botón de deshacer listo.',
    whatToTry: 'Pulsa «Pensar en alto ahora» para leer su análisis sin cambiar nada, o «Probar mejora en copia segura» tras iniciar la simulación.',
    boundary: 'Soporte interno (internal_support_only · external_support_certified = false). external_llm_assisted es true solo si respondió Gemini en vivo.'
  }
});

export const QUICK_TAB_MAP_GROUPS = Object.freeze([
  {
    id: 'observe',
    title: '1. Observar la simulación',
    description: 'Visualiza cómo se organiza la red en vivo y cómo cambia con el tiempo.',
    tabs: [
      { id: 'network', label: 'Red Nodal 3D', hint: 'Mapa interactivo de los 1500 nodos y la torre central' },
      { id: 'core', label: 'Núcleo', hint: 'Salud del motor, actividad e impulso de ajuste' },
      { id: 'history', label: 'Historial', hint: 'Gráfica temporal de cohesión, impulso y orden' },
      { id: 'field', label: 'Campo', hint: 'Sincronización colectiva y actividad de 4 sectores' }
    ]
  },
  {
    id: 'interact',
    title: '2. Conversar y experimentar',
    description: 'Haz preguntas verificadas, mueve controles en vivo o usa sensores.',
    tabs: [
      { id: 'chat', label: 'Chat', hint: 'Conversar en lenguaje natural con datos verificados' },
      { id: 'validation', label: 'Validación', hint: '4 deslizadores en tiempo real (Cf, Bs, K, T)' },
      { id: 'controls', label: 'Controles', hint: 'Encender o pausar modos del motor' },
      { id: 'sensory', label: 'Sensorial', hint: 'Cámara y micrófono opcionales en tu navegador' }
    ]
  },
  {
    id: 'audit',
    title: '3. Supervisión, integridad y conexión',
    description: 'Revisa el auto-análisis seguro, auditoría transparente y tu clave de Gemini.',
    tabs: [
      { id: 'level3-supervisor', label: 'Supervisor', hint: 'Auto-análisis en 1.ª persona y pruebas en copia segura' },
      { id: 'sovereignty', label: 'Integridad', hint: 'Qué guía al motor, auditoría y límites honestos' },
      { id: 'memory', label: 'Memoria', hint: 'Guardar/Restaurar estado y cadena SHA-256' },
      { id: 'api-control', label: 'API', hint: 'Conectar tu clave de Gemini (un solo lugar)' },
      { id: 'autonomy-evolution', label: 'Autoevolución', hint: 'Borradores guiados de cambio de código' }
    ]
  }
]);
