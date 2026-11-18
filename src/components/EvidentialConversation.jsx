import React from 'react';

export const displayValue = (value) => (value === null || value === undefined || value === '' ? 'N/D' : typeof value === 'object' ? JSON.stringify(value) : String(value));

const STATUS_BADGES = {
  exact_match: 'border-green-500/40 bg-green-900/40 text-green-100',
  verified_b2: 'border-cyan-400/50 bg-cyan-900/40 text-cyan-100',
  verified_atom: 'border-emerald-400/40 bg-emerald-900/40 text-emerald-100',
  out_of_tolerance: 'border-red-500/40 bg-red-900/40 text-red-100',
  from_fact: 'border-gray-500/30 bg-gray-900/30 text-gray-100'
};

export function EvidentialConversation({ conversation, text: propsText }) {
  const text = String(propsText ?? conversation?.text ?? '');
  return (
    <div data-testid="evidential-conversation">
      <p className="whitespace-pre-wrap break-words text-pretty text-sm leading-relaxed sm:text-base">{text}</p>
    </div>
  );
}

export function EvidentialConcordance({ rows }) {
  return (
    <table data-testid="evidential-concordance" className="min-w-full border-collapse text-left text-[11px]">
      <thead>
        <tr className="text-gray-200">
          {['Frase', 'Dato / Tipo', 'En el texto', 'Motor / B2', 'Fuente', 'Estado'].map((label) => (
            <th key={label} className="pb-1 pr-3">{label}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {(rows || []).map((row, idx) => (
          <tr key={`${row.atom || 'row'}-${row.sentence ?? idx}-${idx}`} className="align-top">
            <td className="py-0.5 pr-3 font-mono">{displayValue(row.sentence)}</td>
            <td className="py-0.5 pr-3 font-mono">{displayValue(row.atom)} · {displayValue(row.type)}</td>
            <td className="py-0.5 pr-3 font-mono">{displayValue(row.inserted)}</td>
            <td className="py-0.5 pr-3 font-mono">{displayValue(row.engine)}</td>
            <td className="py-0.5 pr-3 break-all">{displayValue(row.source)}</td>
            <td className="py-0.5 pr-3">
              <span className={`inline-flex rounded px-1.5 py-0.5 font-semibold ${STATUS_BADGES[row.status] || STATUS_BADGES.from_fact}`}>
                {displayValue(row.status)}
              </span>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
