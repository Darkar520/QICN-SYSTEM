// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Plain-language UI guidance paired with technical identifiers so both casual readers and auditors can read each tab clearly without inflating claims (external_support_certified = false).

export const PLAIN_TAB_COPY = Object.freeze({
  guide: {
    casualTitle: 'Mapa de Bienvenida',
    technicalTag: 'Guía Aterrizada 2.0',
    plainSummary: 'Recorrido rápido para entender qué hace esta simulación y a qué pestaña ir según lo que quieras ver.',
    inSimpleWords: 'Esta vista reúne el recorrido guiado, un mapa directo de todas las secciones y un glosario progresivo de términos.',
    analogy: 'Es como el mapa de entrada de un observatorio: te dice qué hace cada sala antes de entrar a ver los instrumentos.',
    whatToTry: 'Usa el mapa rápido de abajo para saltar a Red Nodal, Chat o Bitácora Nivel 3, o sigue los 3 pasos del recorrido.',
    boundary: 'Telemetría interna del runtime (internal_support_only · external_support_certified = false).'
  },
  validation: {
    casualTitle: 'Ajustes de Respuesta y Sensibilidad',
    technicalTag: 'Validación Empírica · Cf & Bs',
    plainSummary: 'Cuatro deslizadores base para ver cómo cambia la cohesión de la red cuando ajustas complejidad, estabilidad y aprendizaje.',
    inSimpleWords: 'Pausa la simulación, mueve uno de los 4 controles y vuelve a iniciarla para observar cómo reacciona el índice global (CCC).',
    analogy: 'Es como un banco de ecualización de 4 perillas: subes o bajas sensibilidad y ves cómo responde la armonía general.',
    whatToTry: 'Abre "Detalles" en cualquier deslizador para leer su efecto técnico y el diagnóstico del puente (Paper 9 / Paper 10).',
    boundary: 'Pruebas de sensibilidad interna; mover un parámetro no constituye validación científica externa.'
  },
  core: {
    casualTitle: 'Motor Central y Estado Dinámico',
    technicalTag: 'Núcleo Ontológico · Capa 1',
    plainSummary: 'Resume si la simulación está evolucionando con energía, manteniéndose estable o entrando en estancamiento.',
    inSimpleWords: 'Muestra la lectura actual del sistema y 3 indicadores clave; los 8 paneles forenses profundos quedan ordenados debajo al abrir Detalles.',
    analogy: 'Funciona como el tablero principal de un motor: arriba ves velocidad y temperatura, y bajo el capó tienes todos los sensores.',
    whatToTry: 'Revisa los 3 indicadores superiores (Estancamiento, Impulso PMIA y Régimen) y abre solo el panel técnico que necesites.',
    boundary: '«Núcleo Ontológico» es un nombre histórico del módulo; no certifica conciencia ni experiencia subjetiva.'
  },
  network: {
    casualTitle: 'Red Viva en 3D',
    technicalTag: 'Red Nodal · WebGL 3D',
    plainSummary: 'Visualización interactiva de los nodos conectados alrededor de la torre central constructiva.',
    inSimpleWords: 'Cada punto es un nodo del modelo y cada línea es una conexión; haz clic en cualquier nodo para aislar su vecindario.',
    analogy: 'Es una maqueta luminosa de la red trabajando en tiempo real: puedes rotarla, acercarte o activar el modo Fino.',
    whatToTry: 'Prueba el botón "Detalles ▴" en la barra inferior junto a PRESENCIA ESTRUCTURAL o cambia entre η=1/8, η=0 y A=I.',
    boundary: 'Visualización diagnóstica finita del runtime; no prueba pertenencia a clases teóricas externas.'
  },
  history: {
    casualTitle: 'Evolución en el Tiempo',
    technicalTag: 'Historial · Series CCC / PMIA / Ω',
    plainSummary: 'Gráfica temporal para ver si la red mantiene su equilibrio o sufre caídas a lo largo de cientos de pasos.',
    inSimpleWords: 'En lugar de juzgar por un solo instante, aquí ves la película completa de la cohesión y las bandas de comportamiento.',
    analogy: 'Es como un electrocardiograma de la simulación: te deja ver ritmos, mesetas y recuperaciones.',
    whatToTry: 'Cambia el rango de pasos arriba y abre "Personalizar series y diagnóstico · Detalles" solo si necesitas filtrar curvas.',
    boundary: 'Series internas del runtime (internal_support_only · external_support_certified = false).'
  },
  field: {
    casualTitle: 'Campo de Cohesión Global',
    technicalTag: 'Campo · Entrelazamiento',
    plainSummary: 'Mide qué tan sincronizado y estable es el comportamiento colectivo de la red en ventanas recientes.',
    inSimpleWords: 'Resume la fuerza de conexión global y cuánto fluctúa el campo; las fórmulas y métricas finas se despliegan en Detalles.',
    analogy: 'Si la Red Nodal muestra cada músico, el Campo muestra qué tan afinada suena la orquesta entera.',
    whatToTry: 'Observa los 3 indicadores de arriba y despliega "Detalles" para inspeccionar la formulación matemática.',
    boundary: 'Métrica interna de dispersión y acoplamiento; no implica entrelazamiento cuántico físico.'
  },
  memory: {
    casualTitle: 'Guardado, Historial y Continuidad',
    technicalTag: 'Memoria · Registro SHA-256 + v3',
    plainSummary: 'Permite congelar un punto exacto de la simulación (Cristalizar), volver a él (Revocar) y auditar eventos pasados.',
    inSimpleWords: 'Guarda copias íntegras verificadas por firma SHA-256 y registra los cambios importantes en un libro encadenado.',
    analogy: 'Combina un punto de guardado exacto con una caja negra que anota cada cambio de estado sin poder alterarlo.',
    whatToTry: 'Usa Cristalizar/Revocar desde la barra lateral o despliega los bloques de Eventos y Memoria Holográfica abajo.',
    boundary: 'Continuidad de datos e historial operacional verificable; no demuestra identidad personal ni experiencia.'
  },
  controls: {
    casualTitle: 'Modos del Motor y Parámetros',
    technicalTag: 'Controles · Arquitectura Runtime',
    plainSummary: 'Enciende o apaga las capacidades evolutivas del motor (Kaizen, Dinámica Sensorial, Nivel 2 y Nivel 3).',
    inSimpleWords: 'Arriba tienes los interruptores principales en lenguaje claro; las constantes numéricas y leyes auto-escritas están en Detalles.',
    analogy: 'Es la caja de interruptores del laboratorio: te permite activar módulos uno por uno y comparar el comportamiento.',
    whatToTry: 'Abre "Detalles" en los bloques inferiores si deseas editar umbrales finos o inspeccionar los valores mutables de Kaizen.',
    boundary: 'Todos los interruptores son controles internos de ingeniería; la línea base B0 se conserva en config base.'
  },
  chat: {
    casualTitle: 'Conversación Verificada con el Sistema',
    technicalTag: 'Chat · Sistema B (v5)',
    plainSummary: 'Haz preguntas en lenguaje natural sobre el estado actual; cada respuesta se verifica contra los datos reales del tick.',
    inSimpleWords: 'El motor entrega una captura congelada de hechos y el canal de lenguaje solo puede redactar dentro de esos hechos verificados.',
    analogy: 'Es un portavoz con auditoría automática: antes de mostrarte una frase, un verificador comprueba que los números coincidan.',
    whatToTry: 'Escribe una pregunta sobre el estado actual o abre el laboratorio de micro-experimentos (Workbench) en el cajón colapsable.',
    boundary: 'Canal estrictamente observacional (no altera la dinámica del motor; external_support_certified = false).'
  },
  'qicn-b': {
    casualTitle: 'Canal Humano–Sistema',
    technicalTag: 'QICN-B · Protocolo CCC_H',
    plainSummary: 'Espacio experimental para relacionar la señal humana configurada con el estado interno del simulador.',
    inSimpleWords: 'Permite explorar el parámetro experimental CCC_H y comprobar su estado actual de medición.',
    analogy: 'Es un puente de prueba para observar cómo coexisten una referencia externa y la lectura interna.',
    whatToTry: 'Revisa el indicador principal y abre Detalles para ver la nota metodológica del parámetro CCC_H.',
    boundary: 'Parámetro experimental interno (no medido biométricamente ni certificado externamente).'
  },
  'api-control': {
    casualTitle: 'Conexión de IA y Servicios',
    technicalTag: 'API · LLM & Entropía Híbrida',
    plainSummary: 'Verifica si el sistema usa IA externa (Gemini) o funciona en modo local sin conexión, y prueba la conectividad.',
    inSimpleWords: 'Arriba ves el estado esencial de conexión y tu clave/modelo; los paneles de entropía cuántica y métricas de red están en Detalles.',
    analogy: 'Es el panel de red y enchufes: te dice de un vistazo si hay conexión activa o si todo corre localmente.',
    whatToTry: 'Usa el botón de prueba de conexión arriba y despliega "Entropía Cuántica" o "Métricas de tráfico" solo cuando los necesites.',
    boundary: 'El canal LLM es externo y opcional; si falla o se desactiva, el motor conserva su respaldo local determinista.'
  },
  sensory: {
    casualTitle: 'Cámara y Micrófono en Vivo',
    technicalTag: 'Sensorial · Percepción Multimodal',
    plainSummary: 'Activa o desactiva la entrada de cámara y micrófono para que la simulación reaccione a luz, movimiento o sonido.',
    inSimpleWords: 'Te muestra de forma directa qué sensores están encendidos y qué resume la escena; los espectros técnicos quedan en Detalles.',
    analogy: 'Son los ojos y oídos opcionales de la simulación: funcionan solo si tú otorgas permiso en el navegador.',
    whatToTry: 'Enciende cámara o micrófono para ver la respuesta en tiempo real, y abre Detalles para ver bandas de audio y métricas.',
    boundary: 'Señales locales del navegador usadas como entrada acotada; nunca se envían grabaciones sin tu acción.'
  },
  sovereignty: {
    casualTitle: 'Verificación de Integridad y Causalidad',
    technicalTag: 'Soberanía · Auditoría Forense',
    plainSummary: 'Comprueba que los registros no fueron alterados, que los controles negativos responden y qué límites científicos aplican.',
    inSimpleWords: 'Resume arriba 3 semáforos clave (Integridad, Causalidad y Alcance) y agrupa debajo las auditorías técnicas por tema.',
    analogy: 'Es el sello de notaría del sistema: verifica que los números y los hashes coincidan entre sí.',
    whatToTry: 'Revisa los 3 semáforos superiores y abre solo el bloque de auditoría que quieras inspeccionar.',
    boundary: 'Auditoría interna de software y consistencia (internal_support_only · external_support_certified = false).'
  },
  'autonomy-evolution': {
    casualTitle: 'Propuestas de Cambio de Código',
    technicalTag: 'Autoevolución · Selfpatch Σ0/Σ1/Σ2',
    plainSummary: 'Flujo controlado para planificar y revisar propuestas de cambio al código fuente, siempre con aprobación humana obligatoria.',
    inSimpleWords: 'A diferencia de Bitácora Nivel 3 (que ajusta parámetros en vivo), aquí se gestionan solicitudes de parche de código con límites estrictos.',
    analogy: 'Es un taller con inspector humano: puede preparar un borrador de mejora, pero nunca modifica el código sin visto bueno.',
    whatToTry: 'Observa el estado Σ arriba y despliega los bloques del pipeline (Plan → Generate → Apply) solo si vas a auditar un parche.',
    boundary: 'Canal de ingeniería con guardrails y killswitch; nunca auto-aplica cambios sin autorización.'
  },
  'level3-supervisor': {
    casualTitle: 'Supervisor Autónomo',
    technicalTag: 'Bitácora Nivel 3 · Gate 1 + Gate 2',
    plainSummary: 'Observa la simulación, piensa en voz alta en primera persona y solo aplica ajustes si superan una copia segura y 20 ticks de vigilancia.',
    inSimpleWords: 'En lugar de cambiar parámetros a ciegas, el supervisor razona sobre su estado, prueba cualquier idea en un clon aislado (Gate 1) y, si funciona, la vigila en vivo con marcha atrás automática (Gate 2).',
    analogy: 'Es como un piloto automático con simulador de vuelo: primero ensaya la maniobra en una copia segura y, si la aplica en vivo, mantiene el dedo en el botón de deshacer durante 20 pasos.',
    whatToTry: 'Pulsa "Pensar en alto ahora" para leer una reflexión sin cambiar nada, o "Probar mejora en copia segura" (con al menos 1 tick avanzado).',
    boundary: 'Soporte interno (internal_support_only · external_support_certified = false). external_llm_assisted es true solo si respondió Gemini en vivo y false en modo local.'
  }
});

export const QUICK_TAB_MAP_GROUPS = Object.freeze([
  {
    id: 'observe',
    title: '1. Observar la simulación',
    description: 'Mira cómo se comporta la red en vivo y a lo largo del tiempo.',
    tabs: [
      { id: 'network', label: 'Red Nodal 3D', hint: 'Ver los 1500 nodos y la torre central' },
      { id: 'core', label: 'Núcleo', hint: 'Salud del motor, estancamiento y PMIA' },
      { id: 'history', label: 'Historial', hint: 'Curvas en el tiempo de CCC y bandas' },
      { id: 'field', label: 'Campo', hint: 'Cohesión colectiva y estabilidad' }
    ]
  },
  {
    id: 'interact',
    title: '2. Interactuar y ajustar',
    description: 'Conversa con el sistema, mueve parámetros o activa sensores.',
    tabs: [
      { id: 'chat', label: 'Chat Verificado', hint: 'Preguntar en lenguaje natural (Sistema B)' },
      { id: 'validation', label: 'Validación', hint: '4 deslizadores base (Cf, Bs, aprendizaje)' },
      { id: 'controls', label: 'Controles', hint: 'Encender Kaizen, Nivel 2 y Nivel 3' },
      { id: 'sensory', label: 'Sensorial', hint: 'Cámara y micrófono opcionales' },
      { id: 'qicn-b', label: 'QICN-B', hint: 'Canal experimental humano–sistema' }
    ]
  },
  {
    id: 'audit',
    title: '3. Supervisión, memoria y auditoría',
    description: 'Inspecciona reflexiones autónomas, copias guardadas y sellos SHA-256.',
    tabs: [
      { id: 'level3-supervisor', label: 'Bitácora Nivel 3', hint: 'Supervisor en 1.ª persona + pruebas seguras' },
      { id: 'memory', label: 'Memoria', hint: 'Guardar/Restaurar v3 y registro encadenado' },
      { id: 'sovereignty', label: 'Soberanía', hint: 'Semáforos de integridad y causalidad' },
      { id: 'api-control', label: 'API', hint: 'Conexión Gemini / modo local / cuántica' },
      { id: 'autonomy-evolution', label: 'Autoevolución', hint: 'Solicitudes de cambio de código con visto bueno' }
    ]
  }
]);
