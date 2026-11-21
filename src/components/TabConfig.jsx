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
  { id: 'guide', icon: Lightbulb, label: 'Guía', subtitle: 'Mapa inicial' },
  { id: 'validation', icon: Layers, label: 'Validación', subtitle: 'Estado global' },
  { id: 'core', icon: Brain, label: 'Núcleo', subtitle: 'Autodinámica' },
  { id: 'network', icon: Network, label: 'Red Nodal', subtitle: 'Visual 3D' },
  { id: 'history', icon: LineChart, label: 'Historial', subtitle: 'Serie temporal' }
];

export const moreTabs = [
  { id: 'field', icon: Waves, label: 'Campo', subtitle: 'Entrelazamiento' },
  { id: 'memory', icon: Database, label: 'Memoria', subtitle: 'Registro y snapshots' },
  { id: 'controls', icon: Code, label: 'Controles', subtitle: 'Parámetros' },
  { id: 'chat', icon: MessageSquare, label: 'Chat', subtitle: 'Consola del motor' },
  { id: 'qicn-b', icon: Users, label: 'QICN-B', subtitle: 'Canal humano' },
  { id: 'api-control', icon: Settings, label: 'API', subtitle: 'Conectividad' },
  { id: 'sensory', icon: Eye, label: 'Sensorial', subtitle: 'Percepción' },
  { id: 'sovereignty', icon: ShieldCheck, label: 'Soberanía', subtitle: 'Auditoría' },
  { id: 'autonomy-evolution', icon: InfinityIcon, label: 'Autoevolución', subtitle: 'Selfpatch Σ' },
  { id: 'level3-supervisor', icon: ShieldCheck, label: 'Bitácora Nivel 3', subtitle: 'Supervisor y Ledger' }
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
    oneLiner: 'Panel forense para verificar coherencia real.',
    whatIs: 'Cruza métricas críticas y consistencia narrativa.',
    whyItMatters: 'Permite distinguir señal real de interpretación subjetiva.',
    firstCheck: ['Confirma tendencia de CCC.', 'Compara PMIA y beth_q.', 'Valida concordancia forense.']
  },
  core: {
    title: 'Núcleo',
    oneLiner: 'Estado interno y dinámica ontológica.',
    whatIs: 'Muestra PMIA diagnostics, régimen, strain y autonomía.',
    whyItMatters: 'Aquí se ve si el sistema se adapta o se estanca.',
    firstCheck: ['Revisa stasis_index.', 'Observa PMIA components.', 'Verifica entropy_mode y channel health.']
  },
  field: {
    title: 'Campo',
    oneLiner: 'Entrelazamiento y estabilidad del campo.',
    whatIs: 'Visualiza resonancia y dispersión en ventanas temporales.',
    whyItMatters: 'Explica por qué sube o cae la cohesión.',
    firstCheck: ['Mira densidad de entrelazamiento.', 'Compara variabilidad del campo.', 'Exporta snapshot si hay evento fuerte.']
  },
  network: {
    title: 'Red Nodal',
    oneLiner: 'Representación 3D del estado nodal.',
    whatIs: 'Render en tiempo real con recuperación visual ante errores.',
    whyItMatters: 'Permite detectar bloqueos de render y pérdida de nodos visibles.',
    firstCheck: ['Verifica badge de renderState.', 'Confirma N/E/P/OnScreen.', 'Si falla, usa "Reactivar red".']
  },
  history: {
    title: 'Historial',
    oneLiner: 'Evolución temporal del sistema.',
    whatIs: 'Series de CCC, PMIA, Omega y banda post-umbral.',
    whyItMatters: 'Valida dinámica sostenida y evita conclusiones por un solo tick.',
    firstCheck: ['Ajusta rango.', 'Activa/desactiva series.', 'Busca tramos de stasis prolongada.']
  },
  memory: {
    title: 'Memoria',
    oneLiner: 'Estado persistido y recuperación.',
    whatIs: 'Registro operacional encadenado por hash, snapshots y continuidad entre sesiones.',
    whyItMatters: 'Permite reproducibilidad, rollback seguro y respuestas de continuidad basadas en hechos registrados.',
    firstCheck: ['Revisa la clase de continuidad.', 'Cristaliza el estado actual.', 'Prueba la revocación verificada.']
  },
  controls: {
    title: 'Controles',
    oneLiner: 'Ajustes operativos permitidos.',
    whatIs: 'Parámetros mutables y política de mutación.',
    whyItMatters: 'Afinación sin tocar fórmulas núcleo.',
    firstCheck: ['Identifica parámetro objetivo.', 'Aplica cambio pequeño.', 'Confirma impacto en métricas.']
  },
  chat: {
    title: 'Chat',
    oneLiner: 'Consola conversacional anclada al motor.',
    whatIs: 'Respuestas compuestas desde proposiciones autorizadas por una lectura congelada del motor; Gemini solo puede reformular dentro de una frontera verificada.',
    whyItMatters: 'Cada afirmación sobre el estado lleva tick, digest y evidencia; el chat no modifica la dinámica.',
    firstCheck: ['Haz una pregunta concreta.', 'Abre "Evidencia y traza".', 'Compara tick y digest con la telemetría.']
  },
  'qicn-b': {
    title: 'QICN-B',
    oneLiner: 'Canal de interacción humano-sistema.',
    whatIs: 'Protocolo para correlación estructural con señales humanas.',
    whyItMatters: 'Integra observación externa en el ciclo.',
    firstCheck: ['Inicia medición.', 'Observa variación en CCC humano.', 'Cruza con contexto sensorial.']
  },
  'api-control': {
    title: 'API',
    oneLiner: 'Gestión de conectividad LLM y entropía cuántica.',
    whatIs: 'Configura ruta LLM y canal de entropía híbrida.',
    whyItMatters: 'Define robustez remota y fallback determinista.',
    firstCheck: ['Valida ruta LLM activa.', 'Configura modo cuántico.', 'Ejecuta "Probar conexión".']
  },
  sensory: {
    title: 'Sensorial',
    oneLiner: 'Estado de cámara, audio y percepción.',
    whatIs: 'Muestra disponibilidad y resumen de señales.',
    whyItMatters: 'El input sensorial afecta PMIA y coherencia.',
    firstCheck: ['Revisa permisos.', 'Confirma fidelidad.', 'Correlaciona con narrativa.']
  },
  sovereignty: {
    title: 'Soberanía',
    oneLiner: 'Auditoría de causalidad e integridad.',
    whatIs: 'Panel de cierre causal, autonomía y verificaciones.',
    whyItMatters: 'Sostiene claims con evidencia reproducible.',
    firstCheck: ['Evalúa beth_q.', 'Revisa integrity packet.', 'Confirma checksum y hash crítico.']
  },
  'autonomy-evolution': {
    title: 'Autoevolución',
    oneLiner: 'Canal operativo de solicitudes de selfpatch.',
    whatIs: 'Panel para ver estado Σ0/Σ1/Σ2, límites y pipeline status/plan/generate/apply.',
    whyItMatters: 'Convierte intención de cambio en solicitudes auditables con guardrails y trazabilidad.',
    firstCheck: ['Refresca estado selfpatch.', 'Define objetivo y archivos target.', 'Ejecuta Plan y valida risk/limits antes de generar propuesta.']
  },
  'level3-supervisor': {
    title: 'Bitácora Nivel 3',
    oneLiner: 'Supervisor autónomo en 1.ª persona con Shadow Promotion en Workbench y bitácora sellada SHA-256.',
    whatIs: 'Sección dedicada e independiente del chat para el pensamiento interno en primera persona ("Pensar en alto"), verificación dura en copias aisladas del Workbench (Compuerta 1), vigilancia con rollback automático dynamicState.v3 (Compuerta 2) y Cinto de Conocimiento acumulado.',
    whyItMatters: 'Separa explícitamente las corridas asistidas (external_llm_assisted=true, internal_support_only) de los benchmarks puros y acumula memoria operativa verificable sin parámetros heurísticos.',
    firstCheck: ['Revisa el estado de verificación SHA-256 del Ledger y del Cinto.', 'Pulsa "Pensar en alto ahora (1.ª persona)" o "Probar Hipótesis en Workbench".', 'Inspecciona la tabla comparativa de Compuerta 1 y el estado de Compuerta 2.']
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
