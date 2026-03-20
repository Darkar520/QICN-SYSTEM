import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { ensurePaperMainTex } from './paper_main_tex.js';
import { runLatexBuild } from './latex_toolchain.js';

const sha256File = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

export const buildPaperPdf = ({ batchId, roeoRoot, exportsRoot }) => {
  const empty = { batchId, exportedPdf: false, reason: null, pdfPath: null, logPath: null, prereg_hash: null, manifest_hash: null };
  if (!batchId) return { exitCode: 1, payload: { ...empty, batchId: null, reason: 'BATCH_ID_REQUIRED' } };

  const enforcePath = path.join(roeoRoot, batchId, 'roeo_enforcement_report.json');
  if (!fs.existsSync(enforcePath)) return { exitCode: 1, payload: { ...empty, reason: 'MISSING_ENFORCEMENT_REPORT' } };
  const enforcement = JSON.parse(fs.readFileSync(enforcePath, 'utf8'));
  if (String(enforcement?.batch_status || '') !== 'PAPER_ADMISSIBLE') {
    return {
      exitCode: 2,
      payload: { ...empty, reason: 'BATCH_NOT_PAPER_ADMISSIBLE', prereg_hash: enforcement?.prereg_hash || null }
    };
  }

  const exportDir = path.join(exportsRoot, batchId);
  const required = ['tables_ROEO.tex', 'tables_SNO.tex', 'tables_NC.tex', 'appendix_hashes.tex', 'export_manifest.json'];
  const missing = required.filter((name) => !fs.existsSync(path.join(exportDir, name)));
  const figureFiles = fs.existsSync(exportDir) ? fs.readdirSync(exportDir).filter((f) => /^figures_data_.*\.json$/i.test(f)) : [];
  if (missing.length || !figureFiles.length) return { exitCode: 3, payload: { ...empty, reason: 'MISSING_EXPORT_ASSETS', missing, prereg_hash: enforcement?.prereg_hash || null } };

  const { mainPath } = ensurePaperMainTex({ batchId, exportDir });
  const logPath = path.join(exportDir, 'paper_build_log.txt');
  const toolchainPath = path.join(exportDir, 'paper_build_toolchain.json');
  const build = runLatexBuild({ cwd: exportDir, mainTex: path.basename(mainPath), logPath });
  fs.writeFileSync(toolchainPath, `${JSON.stringify({
    batchId,
    ok: build.ok,
    reason: build.reason,
    toolchain: build.toolchain,
    attempts: Array.isArray(build.attempts) ? build.attempts : []
  }, null, 2)}\n`, 'utf8');
  const manifestPath = path.join(exportDir, 'export_manifest.json');
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const preregHash = manifest?.preregister?.sha256 || manifest?.prereg_hash || enforcement?.prereg_hash || null;
  const manifestHash = sha256File(manifestPath);

  if (!build.ok) {
    return {
      exitCode: build.exitCode || 4,
      payload: { ...empty, reason: build.reason, logPath, toolchainPath, prereg_hash: preregHash, manifest_hash: manifestHash }
    };
  }

  return {
    exitCode: 0,
    payload: {
      ...empty,
      exportedPdf: true,
      reason: null,
      pdfPath: path.join(exportDir, 'paper.pdf'),
      logPath,
      toolchainPath,
      prereg_hash: preregHash,
      manifest_hash: manifestHash
    }
  };
};
