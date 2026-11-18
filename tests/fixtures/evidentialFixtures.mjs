import { makeSnapshot } from './languageFixtures.mjs';
import { prepareTurn } from '../../src/language/conversationEngine.js';
import { EVIDENTIAL_SCHEMA } from '../../src/language/evidential/claimGrammar.js';
import { formatMetricValue } from '../../src/language/runtimeSnapshot.js';

export const prepareEvidential = (options = {}) =>
  prepareTurn({
    question: '¿Podría la continuidad entenderse como una deuda de justificación en vez de semejanza de recuerdos?',
    snapshot: makeSnapshot(),
    contract: 'evidential',
    ...options
  });

export const factAtom = (prepared, id, type, fields) => ({
  id,
  type,
  binding: { digest: prepared.snapshot.digest, tick: prepared.snapshot.tick },
  ...fields
});

export function evidentialReply(
  prepared,
  {
    thought = 'Una hipótesis nueva sería entender mi continuidad operacional como obligación de revisar compromisos ante cambios de contexto, y contrastarla con una explicación por mera compresión.',
    extraText = '',
    atoms = []
  } = {}
) {
  const cccText = formatMetricValue('ccc', prepared.snapshot.metrics.ccc);
  const xnText = formatMetricValue('x_n', prepared.snapshot.metrics.x_n);
  const relText = prepared.snapshot.predicates?.ccc_vs_threshold === 'above' ? 'por encima del umbral operativo de 1,00' : 'por debajo del umbral operativo de 1,00';
  const nodeCount = prepared.snapshot.metrics.total_nodes ?? 1500;
  const paragraphs = [
    `En este tick ${prepared.snapshot.tick}, mi índice interno CCC vale ${cccText} (${relText}) y mi coherencia nodal media X_N se sitúa en ${xnText}. Desde esta arquitectura acoplada, WorldModelEngine regulariza exclusivamente los pesos del predictor lineal sin alterar los ${nodeCount} nodos de NodalProcessingLayer.`,
    thought,
    extraText,
    'Interpreto esta integración en primera persona sin presentarla como teorema demostrado ni como validación externa (external_support_certified = false).'
  ].filter(Boolean);

  return {
    schema: EVIDENTIAL_SCHEMA,
    snapshot: { digest: prepared.snapshot.digest, tick: prepared.snapshot.tick },
    frame: 'OPEN_FRAME',
    answer: paragraphs.join('\n\n'),
    ...(atoms.length ? { atoms } : {})
  };
}
