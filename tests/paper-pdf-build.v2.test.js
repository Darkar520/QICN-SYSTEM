import fs from 'fs';
import os from 'os';
import path from 'path';
import { runLatexBuild } from '../scripts/latex_toolchain.js';

const assert = (c, m) => { if (!c) throw new Error(m); };

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'paper-pdf-v2-'));
  fs.writeFileSync(path.join(tmp, 'main.tex'), '\\documentclass{article}\\begin{document}x\\end{document}\n', 'utf8');
  const execFn = (cmd, args, { cwd }) => {
    const full = `${cmd} ${args.join(' ')}`.trim();
    if (full === 'latexmk -v') return { status: 0, stdout: 'latexmk 4.80', stderr: '' };
    if (full === 'pdflatex --version') return { status: 0, stdout: 'pdfTeX 3.14159', stderr: '' };
    if (cmd === 'latexmk' && args.includes('-pdf')) return { status: 1, stdout: '', stderr: 'perl not found' };
    if (cmd === 'pdflatex' && args.includes('-halt-on-error')) {
      if (!fs.existsSync(path.join(cwd, 'paper.pdf'))) fs.writeFileSync(path.join(cwd, 'paper.pdf'), 'fakepdf', 'utf8');
      return { status: 0, stdout: 'pdflatex ok', stderr: '' };
    }
    return { status: 1, stdout: '', stderr: 'unknown command' };
  };

  const logPath = path.join(tmp, 'paper_build_log.txt');
  const res = runLatexBuild({
    cwd: tmp,
    mainTex: 'main.tex',
    logPath,
    execFn
  });

  assert(res.ok === true, 'CASE 1 FAIL: fallback to pdflatex must succeed');
  assert(res.toolchain === 'pdflatex', 'CASE 2 FAIL: resulting toolchain must be pdflatex after latexmk failure');
  assert(fs.existsSync(path.join(tmp, 'paper.pdf')), 'CASE 3 FAIL: fallback run must produce paper.pdf');
  const logText = fs.readFileSync(logPath, 'utf8');
  assert(logText.includes('[fallback]'), 'CASE 4 FAIL: log must include explicit fallback marker');
  console.log('OK: paper-pdf-build.v2 tests passed');
})().catch((error) => {
  console.error('FAIL: paper-pdf-build.v2 tests failed:', error.message);
  process.exit(1);
});
