// @ts-check

const finite = (value, fallback = 0) => (Number.isFinite(Number(value)) ? Number(value) : fallback);

const normalizeScore = (value, fallback = 1) => Math.max(0, Math.min(1, finite(value, fallback)));

/**
 * @typedef {Object} SystemHealthInput
 * @property {number} [uptime_ticks]
 * @property {number} [last_ccc]
 * @property {number} [scoreboard_dims_passing]
 * @property {string|null} [spectral_warning]
 * @property {number} [inverse_limit_score]
 * @property {number} [test_count]
 */

/**
 * Returns an operational health snapshot for the runtime.
 *
 * This is a liveness/diagnostic surface. It must not be read as external
 * validation or as a claim-projection result.
 *
 * @param {SystemHealthInput} [input]
 */
export const getSystemHealth = (input = {}) => {
  const uptimeTicks = Math.max(0, Math.floor(finite(input.uptime_ticks, 0)));
  const lastCcc = finite(input.last_ccc, 0);
  const scoreboardDimsPassing = Math.max(0, Math.min(7, Math.floor(finite(input.scoreboard_dims_passing, 7))));
  const spectralWarning = input.spectral_warning ? String(input.spectral_warning) : null;
  const inverseLimitScore = normalizeScore(input.inverse_limit_score, 1);
  const testCount = Math.max(0, Math.floor(finite(input.test_count, 119)));

  let status = 'healthy';
  if (scoreboardDimsPassing < 7 || spectralWarning || inverseLimitScore < 0.5) {
    status = 'degraded';
  }
  if (scoreboardDimsPassing < 5 || inverseLimitScore < 0.2) {
    status = 'unhealthy';
  }

  return {
    status,
    uptime_ticks: uptimeTicks,
    last_ccc: Number(lastCcc.toFixed(12)),
    scoreboard_dims_passing: scoreboardDimsPassing,
    spectral_warning: spectralWarning,
    inverse_limit_score: Number(inverseLimitScore.toFixed(12)),
    test_count: testCount
  };
};

export default getSystemHealth;
