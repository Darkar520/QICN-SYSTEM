// claim_scope: internal_runtime_engineering
// evidence_scope: internal_support_only
// interpretation_boundary: Reusable minimalist progressive-disclosure UI primitives (TabPlainHeader, DetailToggleStrip, MetricDualLabel) modeled after the Red Nodal HUD "Detalles" toggle. Pure presentation layer; does not alter simulation math or frozen contracts.

import React from 'react';
import {
  readPersistedCollapsibleState,
  persistCollapsibleState
} from './CollapsibleSection.jsx';
import { PLAIN_TAB_COPY } from '../content/plainLanguageTabCopy.js';

const ACCENT_PALETTE = {
  cyan: {
    shell: 'border-cyan-500/30 bg-gradient-to-r from-slate-900/95 via-cyan-950/35 to-slate-900/95',
    title: 'text-cyan-200',
    tag: 'border-cyan-400/35 bg-cyan-950/60 text-cyan-300',
    button: 'border-cyan-400/40 bg-slate-900/90 text-cyan-200 hover:bg-cyan-950/70',
    drawer: 'border-cyan-500/25 bg-slate-950/80'
  },
  teal: {
    shell: 'border-teal-500/30 bg-gradient-to-r from-slate-900/95 via-teal-950/35 to-slate-900/95',
    title: 'text-teal-200',
    tag: 'border-teal-400/35 bg-teal-950/60 text-teal-300',
    button: 'border-teal-400/40 bg-slate-900/90 text-teal-200 hover:bg-teal-950/70',
    drawer: 'border-teal-500/25 bg-slate-950/80'
  },
  purple: {
    shell: 'border-purple-500/30 bg-gradient-to-r from-slate-900/95 via-purple-950/35 to-slate-900/95',
    title: 'text-purple-200',
    tag: 'border-purple-400/35 bg-purple-950/60 text-purple-300',
    button: 'border-purple-400/40 bg-slate-900/90 text-purple-200 hover:bg-purple-950/70',
    drawer: 'border-purple-500/25 bg-slate-950/80'
  },
  indigo: {
    shell: 'border-indigo-500/30 bg-gradient-to-r from-slate-900/95 via-indigo-950/35 to-slate-900/95',
    title: 'text-indigo-200',
    tag: 'border-indigo-400/35 bg-indigo-950/60 text-indigo-300',
    button: 'border-indigo-400/40 bg-slate-900/90 text-indigo-200 hover:bg-indigo-950/70',
    drawer: 'border-indigo-500/25 bg-slate-950/80'
  },
  emerald: {
    shell: 'border-emerald-500/30 bg-gradient-to-r from-slate-900/95 via-emerald-950/35 to-slate-900/95',
    title: 'text-emerald-200',
    tag: 'border-emerald-400/35 bg-emerald-950/60 text-emerald-300',
    button: 'border-emerald-400/40 bg-slate-900/90 text-emerald-200 hover:bg-emerald-950/70',
    drawer: 'border-emerald-500/25 bg-slate-950/80'
  },
  blue: {
    shell: 'border-blue-500/30 bg-gradient-to-r from-slate-900/95 via-blue-950/35 to-slate-900/95',
    title: 'text-blue-200',
    tag: 'border-blue-400/35 bg-blue-950/60 text-blue-300',
    button: 'border-blue-400/40 bg-slate-900/90 text-blue-200 hover:bg-blue-950/70',
    drawer: 'border-blue-500/25 bg-slate-950/80'
  },
  fuchsia: {
    shell: 'border-fuchsia-500/30 bg-gradient-to-r from-slate-900/95 via-fuchsia-950/35 to-slate-900/95',
    title: 'text-fuchsia-200',
    tag: 'border-fuchsia-400/35 bg-fuchsia-950/60 text-fuchsia-300',
    button: 'border-fuchsia-400/40 bg-slate-900/90 text-fuchsia-200 hover:bg-fuchsia-950/70',
    drawer: 'border-fuchsia-500/25 bg-slate-950/80'
  },
  slate: {
    shell: 'border-slate-600/40 bg-gradient-to-r from-slate-900/95 via-slate-800/40 to-slate-900/95',
    title: 'text-slate-100',
    tag: 'border-slate-600/50 bg-slate-900 text-slate-300',
    button: 'border-slate-600/60 bg-slate-900/90 text-slate-200 hover:bg-slate-800',
    drawer: 'border-slate-700/60 bg-slate-950/80'
  }
};

/**
 * Dual casual + technical metric header so both casual readers and auditors stay oriented at a glance.
 */
export const MetricDualLabel = React.memo(function MetricDualLabel({
  casual = '',
  label = '',
  technical = '',
  accent = '',
  className = ''
}) {
  const primaryText = casual || label;
  return (
    <div className={`flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-xs ${className}`}>
      <span className={`font-semibold ${accent || 'text-slate-100'}`}>{primaryText}</span>
      {technical && (
        <span className="font-mono text-[10px] text-slate-400">· {technical}</span>
      )}
    </div>
  );
});

/**
 * Minimalist tab header with 1-sentence casual summary and an expandable "Detalles ▾" explanation card.
 * Keeps module-level stability so live simulation ticks never collapse an open drawer.
 */
export const TabPlainHeader = React.memo(function TabPlainHeader({
  tabId,
  accent = 'cyan',
  icon = null,
  title = null,
  technicalTag = null,
  plainSummary = null,
  actions = null,
  rightSlot = null,
  badges = null,
  extraDetails = null,
  compact = false,
  detailsButtonLabel = 'Detalles'
}) {
  const copy = PLAIN_TAB_COPY[tabId] || {};
  const sectionId = tabId ? `plain-header-${tabId}` : '';
  const [open, setOpen] = React.useState(() => readPersistedCollapsibleState(sectionId, false));
  const palette = ACCENT_PALETTE[accent] || ACCENT_PALETTE.cyan;

  React.useEffect(() => {
    setOpen(readPersistedCollapsibleState(sectionId, false));
  }, [sectionId]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (sectionId) persistCollapsibleState(sectionId, next);
      return next;
    });
  };

  const resolvedTitle = title || copy.casualTitle || 'Sección';
  const resolvedTag = technicalTag !== null ? technicalTag : (copy.technicalTag || '');
  const resolvedSummary = plainSummary || copy.plainSummary || '';

  return (
    <div className={`mb-4 rounded-xl border ${palette.shell} ${compact ? 'p-3' : 'p-4'} shadow-sm`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            {icon && <span className={palette.title}>{icon}</span>}
            <h2 className={`${compact ? 'text-base' : 'text-lg'} font-bold tracking-tight ${palette.title}`}>
              {resolvedTitle}
            </h2>
            {resolvedTag && (
              <span className={`rounded-md border px-2 py-0.5 font-mono text-[10px] font-medium ${palette.tag}`}>
                {resolvedTag}
              </span>
            )}
          </div>
          {resolvedSummary && (
            <p className="mt-1 text-xs leading-relaxed text-slate-300">
              {resolvedSummary}
            </p>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {actions || rightSlot}
          <button
            type="button"
            onClick={toggle}
            aria-expanded={open}
            data-testid={tabId ? `tab-details-toggle-${tabId}` : undefined}
            className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1.5 font-mono text-[11px] font-semibold transition-colors ${palette.button}`}
          >
            <span>{open ? 'Ocultar' : detailsButtonLabel}</span>
            <span aria-hidden="true">{open ? '▴' : '▾'}</span>
          </button>
        </div>
      </div>

      {badges && (
        <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[11px]">
          {badges}
        </div>
      )}

      {open && (
        <div className={`mt-3 rounded-lg border p-3 text-xs text-slate-200 ${palette.drawer}`}>
          <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
            {copy.inSimpleWords && (
              <div className="rounded-md border border-white/5 bg-slate-900/70 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  En palabras simples
                </div>
                <p className="mt-1 leading-relaxed text-slate-200">{copy.inSimpleWords}</p>
              </div>
            )}
            {copy.analogy && (
              <div className="rounded-md border border-white/5 bg-slate-900/70 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Analogía cotidiana
                </div>
                <p className="mt-1 leading-relaxed text-slate-200">{copy.analogy}</p>
              </div>
            )}
            {copy.whatToTry && (
              <div className="rounded-md border border-white/5 bg-slate-900/70 p-2.5">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                  Qué puedes probar
                </div>
                <p className="mt-1 leading-relaxed text-slate-200">{copy.whatToTry}</p>
              </div>
            )}
          </div>
          {extraDetails && <div className="mt-3">{extraDetails}</div>}
          {copy.boundary && (
            <div className="mt-2.5 border-t border-white/10 pt-2 font-mono text-[10px] text-slate-400">
              Límite honesto: {copy.boundary}
            </div>
          )}
        </div>
      )}
    </div>
  );
});

/**
 * Compact expandable detail strip modeled after the Red Nodal HUD "Detalles ▴" pill.
 * Shows summary/header cleanly by default and expands technical details only when clicked.
 */
export const DetailToggleStrip = React.memo(function DetailToggleStrip({
  sectionId = '',
  summary,
  labelClosed = 'Detalles',
  labelOpen = 'Ocultar',
  defaultOpen = false,
  accent = 'slate',
  className = '',
  buttonTestId = undefined,
  children
}) {
  const [open, setOpen] = React.useState(() => readPersistedCollapsibleState(sectionId, defaultOpen));
  const palette = ACCENT_PALETTE[accent] || ACCENT_PALETTE.slate;

  React.useEffect(() => {
    if (sectionId) {
      setOpen(readPersistedCollapsibleState(sectionId, defaultOpen));
    }
  }, [sectionId, defaultOpen]);

  const toggle = () => {
    setOpen((prev) => {
      const next = !prev;
      if (sectionId) persistCollapsibleState(sectionId, next);
      return next;
    });
  };

  return (
    <div className={`rounded-lg border border-white/10 bg-slate-950/60 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="min-w-0 flex-1 text-xs text-slate-300">{summary}</div>
        <button
          type="button"
          onClick={toggle}
          aria-expanded={open}
          data-testid={buttonTestId}
          className={`inline-flex shrink-0 items-center gap-1 rounded-md border px-2 py-1 font-mono text-[10px] font-semibold transition-colors ${palette.button}`}
        >
          <span>{open ? labelOpen : labelClosed}</span>
          <span aria-hidden="true">{open ? '▴' : '▾'}</span>
        </button>
      </div>
      {open && (
        <div className="border-t border-white/10 px-3 pb-3 pt-2.5 text-xs text-slate-200">
          {children}
        </div>
      )}
    </div>
  );
});

export default TabPlainHeader;
