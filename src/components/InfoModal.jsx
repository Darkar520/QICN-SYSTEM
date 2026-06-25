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
          className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="bg-gray-900 border border-blue-500 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-blue-400">{title}</h3>
              <button
                type="button"
                onClick={closeModal}
                className="text-gray-400 hover:text-white text-xl font-bold px-2"
                aria-label="Cerrar información"
              >
                x
              </button>
            </div>
            <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
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
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-gray-900 border border-cyan-500 rounded-xl p-6 max-w-2xl w-full max-h-[80vh] overflow-y-auto"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-xl font-bold text-cyan-300">{modal.title || 'Información'}</h3>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-white text-xl font-bold px-2"
            aria-label="Cerrar información"
          >
            x
          </button>
        </div>
        <div className="text-gray-300 text-sm leading-relaxed whitespace-pre-wrap">
          {modal.content || 'Sin contenido.'}
        </div>
      </div>
    </div>
  );
};

export default InfoModal;
