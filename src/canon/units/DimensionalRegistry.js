const registry = new Map();

const normalizeUnit = (unit) => String(unit || 'unclassified').trim();

export const resetDimensionalRegistry = () => {
  registry.clear();
};

export const registerQuantity = ({ id, unit, normalization = 'not_recorded', source = 'not_recorded' }) => {
  if (!id || typeof id !== 'string') throw new Error('registerQuantity requires a string id');
  const record = {
    id,
    unit: normalizeUnit(unit),
    normalization: String(normalization || 'not_recorded'),
    source: String(source || 'not_recorded')
  };
  registry.set(id, record);
  return record;
};

export const getQuantity = (id) => registry.get(id) || null;

const inputRecordsFor = (inputs) => (Array.isArray(inputs) ? inputs : [])
  .map((input) => (typeof input === 'string' ? getQuantity(input) : input))
  .filter(Boolean);

export const validateDimensionalExpression = ({ id, inputs = [], transform = {}, expectedUnit }) => {
  const records = inputRecordsFor(inputs);
  const missingInputs = (Array.isArray(inputs) ? inputs : [])
    .filter((input) => typeof input === 'string' && !getQuantity(input));
  const outputUnit = normalizeUnit(transform?.outputUnit);
  const expected = normalizeUnit(expectedUnit);
  const heuristicTerms = new Set(transform?.heuristicTerms || []);
  const heuristicInputs = records.filter((record) => heuristicTerms.has(record.id) || record.normalization.includes('runtime_metric'));

  if (missingInputs.length) {
    return {
      id,
      status: 'UNCLASSIFIED_INPUTS',
      expected_unit: expected,
      observed_unit: outputUnit,
      missing_inputs: missingInputs,
      input_units: records.map((record) => ({ id: record.id, unit: record.unit }))
    };
  }

  if (outputUnit !== expected) {
    return {
      id,
      status: 'DIMENSIONAL_INCONSISTENCY',
      expected_unit: expected,
      observed_unit: outputUnit,
      input_units: records.map((record) => ({ id: record.id, unit: record.unit }))
    };
  }

  return {
    id,
    status: heuristicInputs.length ? 'HEURISTIC_DIMENSIONLESS_INPUTS' : 'DIMENSIONALLY_CONSISTENT',
    expected_unit: expected,
    observed_unit: outputUnit,
    heuristic_inputs: heuristicInputs.map((record) => record.id),
    input_units: records.map((record) => ({ id: record.id, unit: record.unit }))
  };
};

export const buildDimensionalAuditReport = ({ expressions = [] }) => {
  const counts = {
    total: expressions.length,
    consistent: expressions.filter((item) => item.status === 'DIMENSIONALLY_CONSISTENT').length,
    heuristic: expressions.filter((item) => item.status === 'HEURISTIC_DIMENSIONLESS_INPUTS').length,
    inconsistent: expressions.filter((item) => item.status === 'DIMENSIONAL_INCONSISTENCY').length,
    unclassified: expressions.filter((item) => item.status === 'UNCLASSIFIED_INPUTS').length
  };
  return {
    artifact_role: 'dimensional_audit_report',
    evidence_scope: 'INTERNAL_SUPPORT_ONLY',
    interpretation_boundary: 'Dimensional registry reports runtime consistency only; not physical validation.',
    counts,
    expressions
  };
};
