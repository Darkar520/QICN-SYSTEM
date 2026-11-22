/**
 * TabConfig.jsx
 * Configuración de tabs, metadatos de ayuda, lazy loading y botón de navegación.
 * Extraído como parte del refactor de descomposición (Fase 2).
 */
import React from 'react';
import {
  Lightbulb, Layers, Brain, Network, LineChart, Waves, Database, Code,
  MessageSquare, Users, Settings, Eye, ShieldCheck, InfinityIcon
} from './icons/SimulationIcons.jsx';

export const primaryTabs = [
  { id: 'guide', icon: Lightbulb, label: 'Guía', subtitle: 'Inicio rápido' },
  { id: 'validation', icon: Layers, label: 'Validación', subtitle: '4 ajustes base' },
  { id: 'core', icon: Brain, label: 'Núcleo', subtitle: 'Estado del motor' },
  { id: 'network', icon: Network, label: 'Red Nodal', subtitle: 'Red viva 3D' },
  { id: 'history', icon: LineChart, label: 'Historial', subtitle: 'Curvas en tiempo' }
];

export const moreTabs = [
  { id: 'field', icon: Waves, label: 'Campo', subtitle: 'Cohesión global' },
  { id: 'memory', icon: Database, label: 'Memoria', subtitle: 'Guardar y registro' },
  { id: 'controls', icon: Code, label: 'Controles', subtitle: 'Modos del motor' },
  { id: 'chat', icon: MessageSquare, label: 'Chat', subtitle: 'Conversar (v5)' },
  { id: 'qicn-b', icon: Users, label: 'QICN-B', subtitle: 'Canal humano' },
  { id: 'api-control', icon: Settings, label: 'API', subtitle: 'Conexión e IA' },
  { id: 'sensory', icon: Eye, label: 'Sensorial', subtitle: 'Cámara y audio' },
  { id: 'sovereignty', icon: ShieldCheck, label: 'Soberanía', subtitle: 'Integridad' },
  { id: 'autonomy-evolution', icon: InfinityIcon, label: 'Autoevolución', subtitle: 'Parches de código' },
  { id: 'level3-supervisor', icon: ShieldCheck, label: 'Bitácora Nivel 3', subtitle: 'Supervisor autónomo' }
];

export const LazyQICNBTab = React.lazy(() => import('./lazy-tabs/QICNBTab.jsx'));
export const LazyApiControlTab = React.lazy(() => import('./lazy-tabs/ApiControlTab.jsx'));
export const LazySensoryTab = React.lazy(() => import('./lazy-tabs/SensoryTab.jsx'));
export const LazySovereigntyTab = React.lazy(() => import('./lazy-tabs/SovereigntyTab.jsx'));
export const LazyAutonomyEvolutionTab = React.lazy(() => import('./lazy-tabs/AutonomyEvolutionTab.jsx'));
export const LazyLevel3SupervisorTab = React.lazy(() => import('./lazy-tabs/Level3SupervisorTab.jsx'));

export const TabLoadingFallback = ({ label }) => (
  <div className="rounded-lg border border-slate-700/60 bg-slate-950/60 p-4 text-sm text-slate-300">
    Cargando {label}...
  </div>
);

export const renderLazyMoreTab = (LazyComponent, label, children) => (
  <React.Suspense fallback={<TabLoadingFallback label={label} />}>
    <LazyComponent>
      {children}
    </LazyComponent>
  </React.Suspense>
);

export const tabHelpMeta = {
  guide: {
    title: 'Guía',
    oneLiner: 'Vista guiada para entender el sistema sin tecnicismos.',
    whatIs: 'Es el mapa de lectura del QICN: conceptos, telemetría y recorrido mínimo.',
    whyItMatters: 'Reduce la curva de aprendizaje y evita lecturas ambiguas.',
    firstCheck: ['Lee el resumen del estado actual.', 'Revisa 3 métricas base: CCC, PMIA, Omega.', 'Abre una pestaña con "Ir a esta pestaña".']
  },
  validation: {
    title: 'Validación',
    oneLiner: 'Los 4 ajustes principales (Cf, Bs, K, T) para experimentar con el motor.',
    whatIs: 'Controles interactivos que permiten probar cómo responden la cohesión (CCC) y el orden (Ω) al variar la complejidad, el sesgo, la sincronización o la agitación.',
    whyItMatters: 'Permite ver causa y efecto en directo y comparar el comportamiento con los diagnósticos internos.',
    firstCheck: ['Mueve un deslizador (p. ej. K o T) y observa el indicador de Cohesión (CCC).', 'Abre "Detalles" en una tarjeta para ver su traza técnica.', 'Despliega "Evaluación de requisitos" si buscas auditoría profunda.']
  },
  core: {
    title: 'Núcleo',
    oneLiner: 'Resumen del estado interno del motor y sus 7 paneles técnicos plegables.',
    whatIs: 'Muestra 3 indicadores clave (Estancamiento, Impulso PMIA y Régimen) y agrupa los diagnósticos profundos en cajones desplegables.',
    whyItMatters: 'Permite saber de un vistazo si el sistema está activo o estancado, sin abrumar con fórmulas.',
    firstCheck: ['Revisa Dinámica Activa y el impulso PMIA.', 'Observa si el régimen está en banda.', 'Despliega cualquier cajón técnico solo cuando lo necesites.']
  },
  field: {
    title: 'Campo',
    oneLiner: 'Qué tan sincronizados y activos están los vínculos de la red.',
    whatIs: 'Visualiza resonancia, variabilidad, conexiones estimadas y aporte a la cohesión en los últimos 120 pasos.',
    whyItMatters: 'Ayuda a entender por qué sube o baja la cohesión global del sistema.',
    firstCheck: ['Mira la resonancia y la variabilidad.', 'Pasa el cursor por la gráfica para inspeccionar un paso exacto.', 'Despliega "Suavizado y fórmula" para afinar la vista.']
  },
  network: {
    title: 'Red Nodal',
    oneLiner: 'Vista 3D en vivo de los 1500 nodos y su torre estructural.',
    whatIs: 'Mapa interactivo 3D con un HUD compacto arriba y botones η=1/8, η=0 y A=I para comparar escenarios.',
    whyItMatters: 'Permite ver físicamente la organización de los 4 sectores y comprobar cómo se rompe si cortas el acoplamiento (η=0).',
    firstCheck: ['Observa el estado superior (Presencia / Reserva / Desacople).', 'Haz clic en "Detalles" del HUD para leer la explicación simple.', 'Prueba η=0 o A=I para ver el control negativo en directo.']
  },
  history: {
    title: 'Historial',
    oneLiner: 'Evolución en el tiempo de cohesión (CCC), impulso (PMIA) y orden (Ω).',
    whatIs: 'Gráfica temporal interactiva de los últimos 60, 120 o 240 pasos.',
    whyItMatters: 'Permite comprobar tendencias reales en lugar de juzgar el sistema por un solo instante.',
    firstCheck: ['Cambia la ventana (60 / 120 / 240 ticks).', 'Usa "Freeze chart" para inspeccionar un pico con calma.', 'Despliega "Filtros de líneas" para activar o suavizar curvas.']
  },
  memory: {
    title: 'Memoria',
    oneLiner: 'Historial de sesiones sellado con SHA-256 y memoria distribuida interna.',
    whatIs: 'Guarda eventos clave en este navegador con verificación de integridad y muestra los fragmentos internos en un cajón desplegable.',
    whyItMatters: 'Permite verificar continuidad entre sesiones sin alterar la dinámica del motor.',
    firstCheck: ['Comprueba si la cadena SHA-256 está íntegra.', 'Despliega "Eventos recientes" para ver qué ha ocurrido.', 'Despliega "Memoria Holográfica" si quieres inspeccionar los fragmentos internos.']
  },
  controls: {
    title: 'Controles',
    oneLiner: 'Interruptores claros para activar o pausar los modos del motor.',
    whatIs: 'Agrupa los 4 modos principales (Kaizen, Sensorial, Plasticidad Nivel 2 y Supervisor Nivel 3) y deja los valores numéricos finos en cajones plegables.',
    whyItMatters: 'Permite configurar el comportamiento del sistema sin perderse entre constantes técnicas.',
    firstCheck: ['Revisa qué modos están activos en las 4 tarjetas principales.', 'Pausa la simulación si deseas probar una mutación manual.', 'Despliega "Leyes auto-escritas" solo para auditar decimales.']
  },
  chat: {
    title: 'Chat',
    oneLiner: 'Conversa con el sistema sobre su estado real con verificación en vivo.',
    whatIs: 'Consola conversacional (Sistema B unificado) anclada al snapshot exacto del motor; los paneles de 4 ejes y el Workbench B2 permanecen plegados debajo.',
    whyItMatters: 'Cada cifra se verifica contra el motor y el chat nunca modifica la simulación en vivo.',
    firstCheck: ['Haz clic en una pregunta sugerida o escribe la tuya.', 'Abre "Concordancia" o "Evidencia y traza" dentro de una respuesta.', 'Despliega los paneles inferiores solo si deseas correr pruebas B2.']
  },
  'qicn-b': {
    title: 'QICN-B',
    oneLiner: 'Parámetro interno simulado del canal humano (sin medición externa real).',
    whatIs: 'Muestra el parámetro interno CCC_H con sus límites epistémicos explícitos.',
    whyItMatters: 'Deja transparente que no existe medición humana externa validada todavía.',
    firstCheck: ['Revisa el valor interno CCC_H.', 'Pulsa "Consultar estado de medición".', 'Abre "Estado y límites" para leer el detalle honesto.']
  },
  'api-control': {
    title: 'API',
    oneLiner: 'Configura tu clave de Gemini y revisa la salud de las conexiones.',
    whatIs: 'Muestra la clave principal de Gemini y el estado del canal, dejando Codex, Entropía Cuántica y métricas de rate limit en cajones plegables.',
    whyItMatters: 'Centraliza el acceso a IA externa con respaldo local automático si no hay clave.',
    firstCheck: ['Comprueba la ruta activa de Gemini.', 'Pega tu clave si deseas usar Gemini directo en navegador.', 'Despliega "Entropía Cuántica" o "Codex" solo si los vas a configurar.']
  },
  sensory: {
    title: 'Sensorial',
    oneLiner: 'Cámara, micrófono y reconocimiento de voz opcionales.',
    whatIs: 'Muestra la vista previa de cámara, espectro de audio y transcripción de voz, con el análisis detallado de escena y frecuencias plegado.',
    whyItMatters: 'Permite observar cómo reacciona el sistema ante movimiento, luz o sonido del entorno.',
    firstCheck: ['Activa sensores y acepta permisos del navegador.', 'Lee la "Lectura resumida" superior.', 'Despliega "Detalles de escena" o "Bandas de frecuencia" para ver métricas finas.']
  },
  sovereignty: {
    title: 'Soberanía',
    oneLiner: 'Auditoría forense de integridad, causalidad y límites declarados.',
    whatIs: 'Muestra un resumen en 4 indicadores (Integridad, Cohesión, Determinismo y Firma) y 6 cajones técnicos desplegables.',
    whyItMatters: 'Permite exportar un JSON completo y revisar con transparencia qué afirma y qué no afirma el sistema.',
    firstCheck: ['Revisa el resumen superior de 4 indicadores.', 'Usa "Exportar JSON" si necesitas auditar fuera de la app.', 'Despliega "Canal causal" o "Limites epistemicos declarados".']
  },
  'autonomy-evolution': {
    title: 'Autoevolución',
    oneLiner: 'Canal avanzado de propuestas de parches de código (Selfpatch Σ0/Σ1/Σ2).',
    whatIs: 'Gestiona solicitudes de cambio de código mediante Codex; es independiente de la Bitácora Nivel 3 (que solo ajusta parámetros del motor).',
    whyItMatters: 'Mantiene separada la edición experimental de código bajo guardrails y aprobación explícita.',
    firstCheck: ['Revisa la barra de estado superior (Clave, Autorun, Pipeline).', 'Usa "Ir a Bitácora Nivel 3" si buscas pruebas de parámetros del motor.', 'Despliega los cajones solo para operar el flujo Plan → Generate → Apply.']
  },
  'level3-supervisor': {
    title: 'Bitácora Nivel 3',
    oneLiner: 'Diario de auto-análisis en primera persona y pruebas seguras en copia aislada.',
    whatIs: 'El sistema observa sus métricas, razona en primera persona qué podría mejorar, lo prueba en una copia aparte (Gate 1) y guarda cada resultado con sello SHA-256.',
    whyItMatters: 'Permite probar mejoras con control negativo y reversión automática (Gate 2) sin arriesgar la simulación principal ni inflar evidencia científica.',
    firstCheck: ['Pulsa "Pensar en alto ahora" para generar un diagnóstico en 1.ª persona.', 'Pulsa "Probar mejora en copia segura" para ver el veredicto de Gate 1.', 'Haz clic en "Detalles técnicos" de cualquier tarjeta para ver números y sellos SHA-256.']
  }
};

export const tabTourSteps = Object.fromEntries(
  Object.entries(tabHelpMeta).map(([tabId, meta]) => [
    tabId,
    meta.firstCheck.map((step, idx) => ({ id: `${tabId}-tour-${idx + 1}`, text: step }))
  ])
);

export const NavigationTabButton = React.memo(function NavigationTabButton({
  tabId,
  icon: Icon,
  label,
  subtitle = '',
  compact = false,
  selectedTab,
  onSelect,
  onOpenInfo
}) {
  const help = tabHelpMeta[tabId];
  const helpContent = help
    ? `QUÉ ES\n${help.whatIs}\n\nPARA QUÉ SIRVE\n${help.whyItMatters}\n\nQUÉ MIRAR PRIMERO\n- ${(help.firstCheck || []).join('\n- ')}`
    : `${label}\n\n${subtitle || 'Sección operativa del sistema.'}`;

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onSelect(tabId)}
        className={`flex items-center space-x-2 px-3 py-2 rounded-lg font-semibold transition-all whitespace-nowrap text-sm border ${selectedTab === tabId
          ? 'bg-cyan-600/60 text-white shadow-lg shadow-cyan-500/30 border-cyan-400/50'
          : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700/90 border-slate-600/70'
          }`}
      >
        <Icon className="w-5 h-5" />
        <span className="text-left leading-tight">
          <span className="block">{label}</span>
          {!compact && subtitle && (
            <span className="block text-[10px] opacity-80">{subtitle}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        className="w-4 h-4 bg-cyan-500 hover:bg-cyan-400 rounded-full inline-flex items-center justify-center text-white text-[10px] font-bold shadow-md transition-colors"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenInfo(`${label} — ayuda rápida`, helpContent);
        }}
        aria-label={`Información de ${label}`}
      >
        i
      </button>
    </div>
  );
});
