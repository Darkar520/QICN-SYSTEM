/**
 * TabConfig.jsx
 * Configuración de tabs, metadatos de ayuda, lazy loading y botón de navegación.
 * Extraído como parte del refactor de descomposición (Fase 2).
 */
import React from 'react';
import {
  Lightbulb, Layers, Brain, Network, LineChart, Waves, Database, Code,
  MessageSquare, Settings, Eye, ShieldCheck, InfinityIcon
} from './icons/SimulationIcons.jsx';

export const primaryTabs = [
  { id: 'guide', icon: Lightbulb, label: 'Guía', subtitle: 'Inicio' },
  { id: 'validation', icon: Layers, label: 'Validación', subtitle: 'Ajustes' },
  { id: 'core', icon: Brain, label: 'Núcleo', subtitle: 'Motor' },
  { id: 'network', icon: Network, label: 'Red Nodal', subtitle: 'Mapa 3D' },
  { id: 'history', icon: LineChart, label: 'Historial', subtitle: 'Evolución' }
];

export const moreTabs = [
  { id: 'chat', icon: MessageSquare, label: 'Chat', subtitle: 'Conversar con QICN', group: 'interact' },
  { id: 'field', icon: Waves, label: 'Campo', subtitle: 'Sincronización global', group: 'interact' },
  { id: 'sensory', icon: Eye, label: 'Sensorial', subtitle: 'Cámara y micrófono', group: 'interact' },
  { id: 'level3-supervisor', icon: ShieldCheck, label: 'Supervisor', subtitle: 'Auto-análisis seguro', group: 'supervise' },
  { id: 'sovereignty', icon: ShieldCheck, label: 'Integridad', subtitle: 'Auditoría y causalidad', group: 'supervise' },
  { id: 'memory', icon: Database, label: 'Memoria', subtitle: 'Guardado y registro', group: 'supervise' },
  { id: 'controls', icon: Code, label: 'Controles', subtitle: 'Modos del motor', group: 'configure' },
  { id: 'api-control', icon: Settings, label: 'API', subtitle: 'Gemini y servicios', group: 'configure' },
  { id: 'autonomy-evolution', icon: InfinityIcon, label: 'Autoevolución', subtitle: 'Propuestas de código', group: 'configure' }
];

export const MORE_TAB_GROUPS = Object.freeze([
  { id: 'interact', title: 'Conversar y observar', accent: 'text-cyan-300' },
  { id: 'supervise', title: 'Supervisión y auditoría', accent: 'text-emerald-300' },
  { id: 'configure', title: 'Ajustes y conexión IA', accent: 'text-fuchsia-300' }
]);

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
    oneLiner: 'Mapa de entrada para entender el simulador en menos de un minuto.',
    whatIs: 'Reúne un resumen claro de qué hace QICN, acceso directo a cada sección y un glosario por niveles.',
    whyItMatters: 'Permite orientarse rápidamente sin necesidad de conocer la jerga matemática.',
    firstCheck: ['Pulsa «Iniciar simulación» en el panel izquierdo.', 'Elige qué quieres explorar en el mapa rápido.', 'Abre el glosario solo cuando quieras profundizar en un término.']
  },
  validation: {
    title: 'Validación',
    oneLiner: 'Los 4 ajustes principales (Cf, Bs, K, T) modificables en tiempo real.',
    whatIs: 'Deslizadores interactivos para probar cómo responde la cohesión global al variar complejidad, estabilidad, sensibilidad energética y exploración.',
    whyItMatters: 'Permite observar causa y efecto en directo y ver cómo el motor recalibra K y T de forma autónoma.',
    firstCheck: ['Mueve un deslizador mientras corre la simulación.', 'Observa cómo responde la Cohesión global (CCC) arriba.', 'Abre «Detalles» en una tarjeta si buscas la trazabilidad técnica.']
  },
  core: {
    title: 'Núcleo',
    oneLiner: 'Tablero principal de salud del motor y 7 cajones explicados paso a paso.',
    whatIs: 'Resume actividad, impulso de ajuste (PMIA) y estado del régimen, agrupando los diagnósticos profundos con guías de lectura sencillas.',
    whyItMatters: 'Permite comprobar de un vistazo si la simulación avanza sana o si entró en estancamiento.',
    firstCheck: ['Mira las 3 tarjetas superiores (Actividad, Impulso y Régimen).', 'Lee la lectura actual del núcleo.', 'Abre un cajón técnico y lee primero su recuadro «Cómo leer este panel».']
  },
  field: {
    title: 'Campo',
    oneLiner: 'Qué tan sincronizada está la red y cómo trabajan sus 4 sectores en vivo.',
    whatIs: 'Traduce el movimiento de los 1500 nodos en resonancia, variabilidad, conexiones activas y actividad por sector.',
    whyItMatters: 'Explica por qué sube o baja la cohesión global y muestra en directo el flujo entre sectores.',
    firstCheck: ['Lee el diagnóstico automático en palabras simples.', 'Observa la gráfica en vivo y los 4 sectores de abajo.', 'Prueba cambiar el puente a η=0 en la barra izquierda para ver el efecto.']
  },
  network: {
    title: 'Red Nodal',
    oneLiner: 'Vista 3D en vivo de los 1500 nodos y su torre estructural.',
    whatIs: 'Mapa interactivo 3D con un HUD compacto arriba y botones η=1/8, η=0 y A=I para comparar escenarios.',
    whyItMatters: 'Permite ver físicamente la organización de los 4 sectores y comprobar cómo se rompe si cortas el acoplamiento (η=0).',
    firstCheck: ['Observa el estado superior (Presencia / Reserva / Desacople).', 'Haz clic en «Detalles» del HUD para leer la explicación simple.', 'Prueba η=0 o A=I para ver el control negativo en directo.']
  },
  history: {
    title: 'Historial',
    oneLiner: 'Evolución en el tiempo de cohesión (CCC), impulso (PMIA) y orden (Ω).',
    whatIs: 'Gráfica temporal interactiva de los últimos 60, 120 o 240 pasos con lectura resumida automática.',
    whyItMatters: 'Permite comprobar tendencias reales en lugar de juzgar el sistema por un solo instante.',
    firstCheck: ['Lee el resumen automático de la ventana actual.', 'Pasa el cursor sobre la gráfica o usa «Freeze chart».', 'Despliega «Filtros de líneas» para activar o suavizar curvas.']
  },
  memory: {
    title: 'Memoria',
    oneLiner: 'Historial de sesiones sellado con SHA-256 y puntos de guardado.',
    whatIs: 'Guarda eventos clave en este navegador con verificación de integridad y muestra los fragmentos distribuidos internos en un cajón desplegable.',
    whyItMatters: 'Permite comprobar continuidad entre sesiones y restaurar un estado exacto con Cristalizar / Revocar.',
    firstCheck: ['Comprueba si la cadena SHA-256 está íntegra.', 'Usa Cristalizar / Revocar en la barra izquierda para guardar o volver a un punto.', 'Despliega «Eventos recientes» o «Memoria distribuida» para inspeccionar detalles.']
  },
  controls: {
    title: 'Controles',
    oneLiner: 'Interruptores claros para activar o pausar cada capacidad del motor.',
    whatIs: 'Agrupa los 4 modos principales (Autoajuste, Sensores, Autorreparación de red y Supervisor Autónomo) y deja las constantes finas en cajones plegables.',
    whyItMatters: 'Permite configurar el comportamiento del motor sin perderse entre decimales técnicos.',
    firstCheck: ['Revisa qué modos están encendidos en las 4 tarjetas principales.', 'Lee en cada tarjeta qué efecto tiene activarlo.', 'Despliega «Leyes auto-escritas» solo para auditoría numérica.']
  },
  chat: {
    title: 'Chat',
    oneLiner: 'Conversa con el sistema sobre su estado real con verificación en vivo.',
    whatIs: 'Consola conversacional (Sistema B) anclada al paso exacto del motor; cada número se verifica automáticamente contra la simulación.',
    whyItMatters: 'Garantiza respuestas honestas con datos reales y nunca altera la simulación en vivo.',
    firstCheck: ['Haz clic en una pregunta sugerida o escribe tu propia duda.', 'Abre «Concordancia» o «Evidencia y traza» dentro de cualquier respuesta.', 'Marca «Adjuntar resultado Workbench verificado» para incluir pruebas aisladas.']
  },
  'qicn-b': {
    title: 'QICN-B',
    oneLiner: 'Parámetro interno simulado del canal humano (sin medición externa real).',
    whatIs: 'Muestra el parámetro interno CCC_H con sus límites epistémicos explícitos.',
    whyItMatters: 'Deja transparente que no existe medición humana externa validada todavía.',
    firstCheck: ['Revisa el valor interno CCC_H.', 'Pulsa «Consultar estado de medición».', 'Abre «Estado y límites» para leer el detalle honesto.']
  },
  'api-control': {
    title: 'API',
    oneLiner: 'Conecta tu clave de Gemini en un solo lugar para toda la plataforma.',
    whatIs: 'Centraliza tu clave de Gemini para Chat, Supervisor Autónomo y Autoevolución, dejando conectores opcionales y límites de red en cajones plegables.',
    whyItMatters: 'Evita configurar claves repetidas y mantiene respaldo local automático si no usas IA externa.',
    firstCheck: ['Revisa el estado de conexión de Gemini arriba.', 'Pega tu clave de Gemini si quieres activar el modo directo.', 'Abre «Opciones avanzadas» solo si necesitas conectores opcionales.']
  },
  sensory: {
    title: 'Sensorial',
    oneLiner: 'Cámara, micrófono y voz opcionales procesados localmente en tu navegador.',
    whatIs: 'Permite activar cámara y micrófono en un clic para observar cómo luz, movimiento y sonido modulan la simulación.',
    whyItMatters: 'Conecta el entorno real de forma segura y privada (sin subir video ni audio a servidores).',
    firstCheck: ['Pulsa «Activar cámara y micrófono» y concede permiso en tu navegador.', 'Observa la vista previa, espectro de audio y lectura resumida.', 'Despliega detalles de escena o frecuencias si quieres ver métricas finas.']
  },
  sovereignty: {
    title: 'Integridad',
    oneLiner: 'Auditoría clara de integridad narrativa, causalidad y límites declarados.',
    whatIs: 'Responde qué guía al motor en este instante (Pasado, Sensores, Prompts, Ruido), verifica coherencia/determinismo y lista límites científicos honestos.',
    whyItMatters: 'Mantiene total transparencia entre soporte interno del software y validación externa.',
    firstCheck: ['Mira las barras de «Qué está guiando al motor ahora».', 'Comprueba el estado de integridad y determinismo arriba.', 'Usa «Exportar JSON» o despliega «Limites epistemicos declarados».']
  },
  'autonomy-evolution': {
    title: 'Autoevolución',
    oneLiner: 'Flujo guiado en 4 pasos para generar propuestas de código con Gemini y visto bueno humano.',
    whatIs: 'Permite describir una mejora de código, evaluar su riesgo y generar un borrador revisable, siempre separado del Supervisor Autónomo.',
    whyItMatters: 'Mantiene cualquier cambio de código bajo políticas de riesgo, pruebas y aprobación explícita.',
    firstCheck: ['Revisa el esquema de 4 pasos y la diferencia frente al Supervisor Autónomo.', 'Usa Gemini (o cambia de motor en opciones avanzadas) para evaluar un plan.', 'Inspecciona el borrador generado antes de considerar aplicarlo.']
  },
  'level3-supervisor': {
    title: 'Supervisor',
    oneLiner: 'Auto-análisis en primera persona con pruebas seguras en copia aislada.',
    whatIs: 'El supervisor lee el estado actual, piensa en voz alta qué mejorar y ensaya cualquier cambio en copias aisladas antes de tocar la simulación.',
    whyItMatters: 'Evita cambios a ciegas mediante pruebas con control negativo y reversión automática si algo empeora.',
    firstCheck: ['Pulsa «Pensar en alto ahora» para leer su diagnóstico sin cambiar nada.', 'Pulsa «Probar mejora en copia segura» con la simulación avanzada.', 'Abre «Ver auditoría técnica» en cualquier tarjeta para ver números y SHA-256.']
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
  fullWidth = false,
  selectedTab,
  onSelect,
  onOpenInfo
}) {
  const help = tabHelpMeta[tabId];
  const helpContent = help
    ? `QUÉ ES\n${help.whatIs}\n\nPARA QUÉ SIRVE\n${help.whyItMatters}\n\nQUÉ MIRAR PRIMERO\n- ${(help.firstCheck || []).join('\n- ')}`
    : `${label}\n\n${subtitle || 'Sección operativa del sistema.'}`;
  const isSelected = selectedTab === tabId;

  return (
    <div
      className={`group inline-flex items-stretch overflow-hidden rounded-xl border transition-all ${fullWidth ? 'w-full' : 'min-w-0'} ${isSelected
        ? 'border-cyan-400/70 bg-gradient-to-b from-cyan-600/45 to-cyan-700/35 text-white shadow-md shadow-cyan-500/20'
        : 'border-slate-700/80 bg-slate-900/80 text-slate-200 hover:border-cyan-500/45 hover:bg-slate-800/90'
        }`}
    >
      <button
        type="button"
        onClick={() => onSelect(tabId)}
        className={`flex min-w-0 flex-1 items-center gap-2 text-left transition-colors ${compact ? 'px-2.5 py-2' : 'px-2.5 py-2'}`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${isSelected ? 'text-cyan-100' : 'text-cyan-400/85 group-hover:text-cyan-300'}`} />
        <span className="min-w-0 flex-1 leading-tight">
          <span className={`block text-[13px] font-semibold tracking-tight ${fullWidth ? '' : 'whitespace-nowrap'}`}>
            {label}
          </span>
          {!compact && subtitle && (
            <span className={`mt-0.5 block truncate text-[10px] leading-tight ${isSelected ? 'text-cyan-100/85' : 'text-slate-400'}`}>
              {subtitle}
            </span>
          )}
        </span>
      </button>
      <button
        type="button"
        className={`flex w-6 shrink-0 items-center justify-center border-l text-[10px] font-bold transition-colors ${isSelected
          ? 'border-cyan-300/25 text-cyan-100/80 hover:bg-cyan-400/25 hover:text-white'
          : 'border-slate-700/60 text-slate-500 hover:bg-slate-700/60 hover:text-cyan-200'
          }`}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onOpenInfo(`${label} — ayuda rápida`, helpContent);
        }}
        title={`Ayuda rápida de ${label}`}
        aria-label={`Información de ${label}`}
      >
        ?
      </button>
    </div>
  );
});
