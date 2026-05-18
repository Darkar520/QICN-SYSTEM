const interventions = new Map();

export const resetInterventionRegistry = () => {
  interventions.clear();
};

export const registerIntervention = ({ id, family, parameters = {}, evidenceScope = 'INTERNAL_SUPPORT_ONLY' }) => {
  if (!id || typeof id !== 'string') throw new Error('registerIntervention requires a string id');
  const record = {
    id,
    family: family || 'unspecified_intervention_family',
    parameters,
    evidence_scope: evidenceScope,
    interpretation_boundary: 'Registered intervention family only; not external validation.'
  };
  interventions.set(id, record);
  return record;
};

export const getIntervention = (id) => interventions.get(id) || null;

export const listInterventions = () => [...interventions.values()];
