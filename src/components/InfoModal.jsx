/**
 * InfoModal.jsx
 * Modals informativos (trigger-based y persistente).
 * Extraído como parte del refactor de descomposición (Fase 2).
 */
import React, { useState, useCallback } from 'react';

export const InfoModal = ({
  title,
  content,
  children,
  triggerClassName = 'w-5 h-5 bg-blue-500 hover:bg-blue-600 rounded-full inline-flex items-center justify-center text-white text-xs font-bold shadow-lg transition-colors'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const closeModal = useCallback(() => setIsOpen(false), []);
  const openModal = useCallback((event) => {
    event.preventDefault();
    event.stopPropagation();
    setIsOpen(true);
  }, []);

  return (
    <>
      <button
        type="button"
        className="inline-flex items-center justify-center"
        onClick={openModal}
        onMouseDown={(event) => event.stopPropagation()}
        aria-label={title || 'Información'}
      >
        {children || <span className={triggerClassName}>i</span>}
      </button>
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-[2px]"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-blue-500 rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[85dvh] overflow-y-auto shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-start gap-3 mb-3 sm:mb-4">
              <h3 className="text-base sm:text-xl font-bold text-blue-400 break-words">{title}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-gray-300 hover:text-white text-sm font-bold"
                aria-label="Cerrar información"
              >
                ✕
              </button>
            </div>
            <div className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
              {content}
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const PersistentInfoModal = ({ modal, onClose }) => {
  if (!modal?.open) return null;
  return (
    <div
      className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3 sm:p-4 backdrop-blur-[2px]"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-cyan-500 rounded-xl p-4 sm:p-6 max-w-2xl w-full max-h-[85dvh] overflow-y-auto shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-start gap-3 mb-3 sm:mb-4">
          <h3 className="text-base sm:text-xl font-bold text-cyan-300 break-words">{modal.title || 'Información'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-800/80 text-gray-300 hover:text-white text-sm font-bold"
            aria-label="Cerrar información"
          >
            ✕
          </button>
        </div>
        <div className="text-gray-300 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap break-words">
          {modal.content || 'Sin contenido.'}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
