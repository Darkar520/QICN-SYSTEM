import fs from 'fs';

const readJson = (relativePath) =>
  JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const STATISTICAL_ANALYSIS_SHELLS = Object.freeze(
  readJson('../../docs/statistical_analysis_shells.v1.json')
);

export const listStatisticalAnalysisShells = () => [
  ...(STATISTICAL_ANALYSIS_SHELLS.shells || [])
];

export const getStatisticalAnalysisShell = (shellId) =>
  listStatisticalAnalysisShells().find((entry) => entry.shell_id === shellId) || null;

export default {
  STATISTICAL_ANALYSIS_SHELLS,
  listStatisticalAnalysisShells,
  getStatisticalAnalysisShell
};
