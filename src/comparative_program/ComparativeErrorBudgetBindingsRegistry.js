import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const COMPARATIVE_ERROR_BUDGET_BINDINGS = Object.freeze(
  readJson('../../docs/comparative_error_budget_bindings.v1.json')
);

export const listComparativeErrorBudgetBindings = () =>
  [...(COMPARATIVE_ERROR_BUDGET_BINDINGS.budget_bindings || [])];

export const getComparativeErrorBudgetBinding = (budgetId) =>
  (COMPARATIVE_ERROR_BUDGET_BINDINGS.budget_bindings || []).find(
    (entry) => entry.budget_id === budgetId
  ) || null;

export default {
  COMPARATIVE_ERROR_BUDGET_BINDINGS,
  listComparativeErrorBudgetBindings,
  getComparativeErrorBudgetBinding
};
