// Read-only reference implementation from the approved B0 commit. No checkout,
// worktree or git writes; reference source is never evaluated in the live realm.
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root = process.cwd();
const ref = '454dcb9a5cd5c4a7728b211cc0d438b80258922e';
export async function load(url, context, next) {
  if (!url.startsWith('file:')) return next(url, context);
  const relative = path.relative(root, fileURLToPath(url)).replace(/\\/g, '/');
  if (!/^(src|services)\/.*\.(js|jsx|mjs)$/.test(relative)) return next(url, context);
  const source = execFileSync('git', ['show', `${ref}:${relative}`], { cwd: root, encoding: 'utf8', windowsHide: true });
  return { format: 'module', source, shortCircuit: true };
}
