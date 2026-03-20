import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

const run = (cmd, args, cwd, envOverrides = null, execFn = null) => {
  if (typeof execFn === 'function') return execFn(cmd, args, { cwd, env: envOverrides ? { ...process.env, ...envOverrides } : process.env });
  const env = envOverrides ? { ...process.env, ...envOverrides } : process.env;
  const first = spawnSync(cmd, args, { cwd, encoding: 'utf8', env });
  if (process.platform === 'win32' && first.error && first.error.code === 'ENOENT') {
    return spawnSync('cmd.exe', ['/c', cmd, ...args], { cwd, encoding: 'utf8', env });
  }
  return first;
};

const hasCriticalLatexmkFailure = (stdout, stderr) => {
  const text = `${stdout || ''}\n${stderr || ''}`.toLowerCase();
  return text.includes('perl') || text.includes('script engine') || text.includes('cannot find') || text.includes('not recognized');
};

export const detectLatexToolchain = (cwd, envOverrides = null, execFn = null) => {
  const latexmk = run('latexmk', ['-v'], cwd, envOverrides, execFn);
  if (!latexmk.error && latexmk.status === 0) return { kind: 'latexmk' };
  const pdflatex = run('pdflatex', ['--version'], cwd, envOverrides, execFn);
  if (!pdflatex.error && pdflatex.status === 0) return { kind: 'pdflatex' };
  return { kind: 'none' };
};

export const runLatexBuild = ({ cwd, mainTex = 'main.tex', logPath, envOverrides = null, execFn = null }) => {
  const detected = detectLatexToolchain(cwd, envOverrides, execFn);
  if (detected.kind === 'none') {
    fs.writeFileSync(logPath, 'LATEX_TOOLCHAIN_MISSING\n', 'utf8');
    return { ok: false, reason: 'LATEX_TOOLCHAIN_MISSING', toolchain: 'none', exitCode: 5, attempts: [] };
  }

  const logs = [];
  const attempts = [];
  let finalStatus = 1;
  let usedTool = detected.kind;
  if (detected.kind === 'latexmk') {
    const latexmkArgs = ['-pdf', '-interaction=nonstopmode', '-halt-on-error', mainTex];
    const r = run('latexmk', latexmkArgs, cwd, envOverrides, execFn);
    attempts.push({ tool: 'latexmk', args: latexmkArgs, exitCode: Number.isInteger(r.status) ? r.status : null });
    logs.push(`$ latexmk -pdf -interaction=nonstopmode -halt-on-error ${mainTex}`);
    logs.push(r.stdout || '');
    logs.push(r.stderr || '');
    const latexmkStatus = Number.isInteger(r.status) ? r.status : 1;
    const pdflatexProbe = run('pdflatex', ['--version'], cwd, envOverrides, execFn);
    const pdflatexAvailable = !pdflatexProbe.error && pdflatexProbe.status === 0;
    const mustFallback = latexmkStatus !== 0 && pdflatexAvailable && hasCriticalLatexmkFailure(r.stdout, r.stderr);
    if (!mustFallback) {
      finalStatus = latexmkStatus;
    } else {
      usedTool = 'pdflatex';
      logs.push('[fallback] latexmk failed with critical toolchain signal; switching to pdflatex x2');
      const cmdArgs = ['-interaction=nonstopmode', '-halt-on-error', mainTex];
      for (let pass = 1; pass <= 2; pass += 1) {
        const pr = run('pdflatex', cmdArgs, cwd, envOverrides, execFn);
        attempts.push({ tool: 'pdflatex', args: cmdArgs, pass, exitCode: Number.isInteger(pr.status) ? pr.status : null });
        logs.push(`$ pdflatex ${cmdArgs.join(' ')} [pass ${pass}]`);
        logs.push(pr.stdout || '');
        logs.push(pr.stderr || '');
        finalStatus = Number.isInteger(pr.status) ? pr.status : 1;
        if (finalStatus !== 0) break;
      }
    }
  }
  if (detected.kind === 'pdflatex') {
    const cmdArgs = ['-interaction=nonstopmode', '-halt-on-error', mainTex];
    for (let pass = 1; pass <= 2; pass += 1) {
      const r = run('pdflatex', cmdArgs, cwd, envOverrides, execFn);
      attempts.push({ tool: 'pdflatex', args: cmdArgs, pass, exitCode: Number.isInteger(r.status) ? r.status : null });
      logs.push(`$ pdflatex ${cmdArgs.join(' ')} [pass ${pass}]`);
      logs.push(r.stdout || '');
      logs.push(r.stderr || '');
      finalStatus = Number.isInteger(r.status) ? r.status : 1;
      if (finalStatus !== 0) break;
    }
  }

  fs.writeFileSync(logPath, `${logs.join('\n')}\n`, 'utf8');
  const pdfPath = path.join(cwd, 'paper.pdf');
  const pdfOk = fs.existsSync(pdfPath) && fs.statSync(pdfPath).size > 0;
  if (finalStatus !== 0 || !pdfOk) return { ok: false, reason: 'LATEX_BUILD_FAILED', toolchain: usedTool, exitCode: 4, attempts };
  return { ok: true, reason: null, toolchain: usedTool, exitCode: 0, attempts };
};
