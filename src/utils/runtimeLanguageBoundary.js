// Closed vocabulary: values are captured from core fields, never from the model.
// Descriptions name implementation quantities without asserting scientific claims.
const METRICS = Object.freeze({
  ccc: { label: 'CCC (cohesión interna)', read: core => core?.ontologicalState?.coherence },
  pmia: { label: 'PMIA (índice interno)', read: core => core?.pmiaValue },
  layer: { label: 'Banda interna', read: core => core?.currentLayer },
  beth_q: { label: 'beth_q (proxy interno no calibrado)', read: core => core?.ontologicalState?.beth_q },
  omega: { label: 'Omega (índice interno)', read: core => core?.ontologicalState?.omega },
  spectral_gap: { label: 'Gap espectral interno', read: core => core?.ontologicalState?.spectral_gap },
  relaxation_time: { label: 'Tiempo de relajación interno', read: core => core?.ontologicalState?.relaxation_time },
  winding_number: { label: 'Número de winding interno', read: core => core?.ontologicalState?.holonomy_winding }
});

export function captureLanguageSnapshot(core) {
  const values = Object.create(null);
  for (const [id, spec] of Object.entries(METRICS)) {
    const value = spec.read(core);
    if (typeof value === 'number' && Number.isFinite(value)) values[id] = value;
  }
  return Object.freeze(values);
}

export function languageSelectionPrompt(snapshot) {
  const catalog = Object.keys(snapshot).map(id => `${id}: ${METRICS[id].label}`).join('\n');
  return `Selecciona exclusivamente los identificadores del catálogo que respondan a la última pregunta.\n` +
    `El programa añadirá los valores después; no necesitas verlos. Si la pregunta nombra una lectura disponible, selecciónala.\n` +
    `Si la pregunta no corresponde a ninguna lectura del catálogo, selecciona una lista vacía. No calcules ni expliques.\n` +
    `Responde únicamente con JSON exacto de esta forma: {"metrics":["ccc"]}.\n` +
    `Catálogo disponible:\n${catalog || '(vacío)'}`;
}

export function renderLanguageSelection(modelText, snapshot) {
  let selection;
  try { selection = JSON.parse(modelText.trim()); } catch { throw new Error('Selección del modelo no es JSON válido'); }
  if (!selection || typeof selection !== 'object' || Array.isArray(selection) ||
      Object.keys(selection).length !== 1 || !Array.isArray(selection.metrics) || selection.metrics.length > 8) {
    throw new Error('Selección del modelo fuera del contrato');
  }
  const seen = new Set();
  for (const id of selection.metrics) {
    if (typeof id !== 'string' || !Object.hasOwn(METRICS, id) || !Object.hasOwn(snapshot, id) || seen.has(id)) {
      throw new Error('Identificador ausente, no permitido o repetido');
    }
    seen.add(id);
  }
  if (!seen.size) return 'La consulta no puede responderse con las lecturas disponibles en esta capa. No se ha inferido una respuesta.';
  const lines = [...seen].map(id => `• ${METRICS[id].label}: ${snapshot[id]}`);
  return `Lecturas internas capturadas al enviar la consulta:\n${lines.join('\n')}\nSon valores del runtime; no constituyen validación externa ni demuestran experiencia subjetiva.`;
}

export function renderAvailableReadings(core) {
  const snapshot = captureLanguageSnapshot(core);
  return renderLanguageSelection(JSON.stringify({ metrics: Object.keys(snapshot) }), snapshot);
}
