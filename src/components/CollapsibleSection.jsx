/**
 * CollapsibleSection.jsx
 * Componente acordeón estable a nivel de módulo + helpers de persistencia.
 * Extraído como parte del refactor de descomposición (Fase 2).
 *
 * CRÍTICO: Debe vivir FUERA del componente principal. Si se define dentro,
 * React lo destruye/recrea en cada re-render del padre (cada ~1s por el tick),
 * perdiendo el estado isOpen y cerrando el acordeón automáticamente.
 */
import React from 'react';

export const SECTION_ACCENT_STYLES = {
  cyan: { border: 'border-cyan-700/40 bg-cyan-950/10', text: 'text-cyan-300', header: 'hover:bg-cyan-950/20' },
  amber: { border: 'border-amber-700/40 bg-amber-950/10', text: 'text-amber-300', header: 'hover:bg-amber-950/20' },
  violet: { border: 'border-violet-700/40 bg-violet-950/10', text: 'text-violet-300', header: 'hover:bg-violet-950/20' },
  fuchsia: { border: 'border-fuchsia-700/40 bg-fuchsia-950/10', text: 'text-fuchsia-300', header: 'hover:bg-fuchsia-950/20' },
  indigo: { border: 'border-indigo-700/40 bg-indigo-950/10', text: 'text-indigo-300', header: 'hover:bg-indigo-950/20' },
  emerald: { border: 'border-emerald-700/40 bg-emerald-950/10', text: 'text-emerald-300', header: 'hover:bg-emerald-950/20' },
  rose: { border: 'border-rose-700/40 bg-rose-950/10', text: 'text-rose-300', header: 'hover:bg-rose-950/20' },
  slate: { border: 'border-slate-700/40 bg-slate-950/20', text: 'text-slate-300', header: 'hover:bg-slate-800/30' },
  blue: { border: 'border-blue-700/40 bg-blue-950/10', text: 'text-blue-300', header: 'hover:bg-blue-950/20' },
  purple: { border: 'border-purple-700/40 bg-purple-950/10', text: 'text-purple-300', header: 'hover:bg-purple-950/20' },
};

const COLLAPSIBLE_OPEN_STATE = new Map();
const COLLAPSIBLE_STORAGE_PREFIX = 'QICN_COLLAPSIBLE_STATE_';

export const readPersistedCollapsibleState = (sectionId, defaultOpen) => {
  if (!sectionId) return defaultOpen;
  if (COLLAPSIBLE_OPEN_STATE.has(sectionId)) {
    return Boolean(COLLAPSIBLE_OPEN_STATE.get(sectionId));
  }
  try {
    const raw = window?.localStorage?.getItem(`${COLLAPSIBLE_STORAGE_PREFIX}${sectionId}`);
    if (raw === 'true' || raw === 'false') {
      return raw === 'true';
    }
  } catch (_) {
    // Ignore localStorage read failures; fallback to defaultOpen.
  }
  return defaultOpen;
};

export const persistCollapsibleState = (sectionId, isOpen) => {
  if (!sectionId) return;
  COLLAPSIBLE_OPEN_STATE.set(sectionId, Boolean(isOpen));
  try {
    window?.localStorage?.setItem(`${COLLAPSIBLE_STORAGE_PREFIX}${sectionId}`, String(Boolean(isOpen)));
  } catch (_) {
    // Ignore localStorage write failures.
  }
};

export const CollapsibleSection = React.memo(function CollapsibleSection({
  sectionId = '',
  title,
  subtitle = null,
  accent = 'cyan',
  defaultOpen = false,
  badge = null,
  children,
  className = ''
}) {
  const [isOpen, setIsOpen] = React.useState(() => readPersistedCollapsibleState(sectionId, defaultOpen));
  const styles = SECTION_ACCENT_STYLES[accent] || SECTION_ACCENT_STYLES.slate;

  React.useEffect(() => {
    setIsOpen(readPersistedCollapsibleState(sectionId, defaultOpen));
  }, [sectionId, defaultOpen]);

  React.useEffect(() => {
    persistCollapsibleState(sectionId, isOpen);
  }, [sectionId, isOpen]);

  return (
    <div className={`rounded-xl border ${styles.border} mb-3 overflow-hidden ${className}`}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 sm:px-4 sm:py-3 cursor-pointer select-none font-semibold text-xs sm:text-sm ${styles.text} ${styles.header} transition-colors`}
        aria-expanded={isOpen}
      >
        <span className="min-w-0 flex-1 text-left">
          <span className="block break-words">{title}</span>
          {subtitle && (
            <span className="mt-0.5 block text-[11px] font-normal text-slate-400">{subtitle}</span>
          )}
        </span>
        <div className="flex max-w-[44%] sm:max-w-none items-center gap-1.5 sm:gap-2 flex-shrink-0 ml-1 sm:ml-2">
          {badge != null && (
            <span className="truncate text-[10px] sm:text-[11px] font-mono opacity-75 font-normal">{badge}</span>
          )}
          <span className={`shrink-0 text-[11px] opacity-60 transition-transform duration-200 inline-block ${isOpen ? 'rotate-180' : 'rotate-0'}`}>▾</span>
        </div>
      </button>
      {isOpen && (
        <div className="px-3 pb-3 pt-2 sm:px-4 sm:pb-4 border-t border-white/5 overflow-x-clip">
          {children}
        </div>
      )}
    </div>
  );
});

export default CollapsibleSection;
