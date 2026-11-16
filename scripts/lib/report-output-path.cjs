const path = require('node:path');

/** Read an opt-in output flag, retaining each caller's historical aliases. */
function readReportOutputArg(argv = [], aliases = []) {
  const names = new Set(['out', ...aliases]);
  const values = [];
  for (let index = 0; index < argv.length; index += 1) {
    const match = /^--([^=]+)(?:=(.*))?$/.exec(argv[index]);
    if (!match || !names.has(match[1])) continue;
    const value = match[2] === undefined ? argv[++index] : match[2];
    if (typeof value !== 'string' || !value.trim() || value.startsWith('--')) {
      throw new Error(`Missing report path for --${match[1]}`);
    }
    values.push(value);
  }
  if (new Set(values).size > 1) throw new Error('Conflicting report output paths');
  return values[0];
}

/**
 * No opt-in: return the historical default unchanged (including null).
 * Explicit path wins over QICN_REPORT_DIR. The directory mirrors the default's
 * project-relative path, avoiding collisions between manifests in subfolders.
 * This helper resolves paths only; it does not create directories or write.
 */
function resolveReportOutput({
  projectRoot,
  defaultPath,
  outputPath,
  env = process.env,
  cwd = process.cwd()
}) {
  if (outputPath !== undefined && outputPath !== null) {
    if (typeof outputPath !== 'string' || !outputPath.trim()) throw new Error('Empty report output path');
    return path.resolve(cwd, outputPath);
  }
  const reportDir = env.QICN_REPORT_DIR;
  if (typeof reportDir !== 'string' || !reportDir.trim()) return defaultPath;
  if (!defaultPath) throw new Error('QICN_REPORT_DIR requires a report default path');
  const relative = path.relative(projectRoot, defaultPath);
  if (!relative || relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error('Report default must be a file inside projectRoot');
  }
  return path.resolve(cwd, reportDir, relative);
}

// Deliberately exact: inherited values such as "false" must never enable it.
const isBridgeLocalOnly = (env = process.env) => env.QICN_BRIDGE_LOCAL_ONLY === '1';

module.exports = { readReportOutputArg, resolveReportOutput, isBridgeLocalOnly };
