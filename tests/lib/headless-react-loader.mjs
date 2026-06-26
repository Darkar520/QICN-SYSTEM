import { pathToFileURL } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const SHIM = pathToFileURL(path.resolve(process.cwd(), 'tests/lib/react-headless-shim.mjs')).href;
const EXTS = ['.js', '.jsx', '.mjs', '.cjs'];

export async function resolve(specifier, context, next) {
  if (specifier === 'react') return { url: SHIM, shortCircuit: true };
  if ((specifier.startsWith('./') || specifier.startsWith('../')) && !path.extname(specifier)) {
    const base = context.parentURL ? path.dirname(new URL(context.parentURL).pathname) : process.cwd();
    const baseFixed = process.platform === 'win32' && base.startsWith('/') ? base.slice(1) : base;
    for (const ext of EXTS) {
      const cand = path.resolve(baseFixed, specifier + ext);
      if (fs.existsSync(cand)) return { url: pathToFileURL(cand).href, shortCircuit: true };
    }
    for (const ext of EXTS) {
      const idx = path.resolve(baseFixed, specifier, 'index' + ext);
      if (fs.existsSync(idx)) return { url: pathToFileURL(idx).href, shortCircuit: true };
    }
  }
  // CSS/asset imports: stub them out
  if (/\.(css|svg|png|jpg|webp|json)$/.test(specifier) && (specifier.startsWith('./') || specifier.startsWith('../'))) {
    const stub = pathToFileURL(path.resolve(process.cwd(), 'tests/lib/empty-stub.mjs')).href;
    if (!specifier.endsWith('.json')) return { url: stub, shortCircuit: true };
  }
  return next(specifier, context);
}