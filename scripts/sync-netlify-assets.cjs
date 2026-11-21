const fs = require('fs');
const path = require('path');

function ensureDir(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

function copyFileSafe(fromPath, toPath) {
  if (!fs.existsSync(fromPath)) return false;
  ensureDir(path.dirname(toPath));
  fs.copyFileSync(fromPath, toPath);
  return true;
}

function writeTextFile(filePath, content) {
  ensureDir(path.dirname(filePath));
  fs.writeFileSync(filePath, content, { encoding: 'utf8' });
}

function run() {
  const projectRoot = path.resolve(__dirname, '..');
  const distDir = path.join(projectRoot, 'dist');

  if (!fs.existsSync(distDir)) {
    throw new Error('No existe ./dist. Ejecuta build:js y build:css antes de sincronizar.');
  }

  const staticFilesForDist = ['index.html', 'manifest.webmanifest', 'sw.js', 'favicon.svg'];
  const copiedToDist = [];
  for (const file of staticFilesForDist) {
    const src = path.join(projectRoot, file);
    const dst = path.join(distDir, file);
    if (copyFileSafe(src, dst)) copiedToDist.push(file);
  }

  const redirectsContent = '/* /index.html 200\n';
  const rootRedirectsPath = path.join(projectRoot, '_redirects');
  const distRedirectsPath = path.join(distDir, '_redirects');
  writeTextFile(rootRedirectsPath, redirectsContent);
  writeTextFile(distRedirectsPath, redirectsContent);

  const distRuntimeAssets = ['bundle.js', 'tailwind.css', 'network_canvas_worker.js', 'microExperiment.worker.js', 'level3Autonomous.worker.js'];
  const copiedToRoot = [];
  for (const file of distRuntimeAssets) {
    const src = path.join(distDir, file);
    const dst = path.join(projectRoot, file);
    if (copyFileSafe(src, dst)) copiedToRoot.push(file);
  }

  console.log('[QICN] Sync deploy assets OK');
  console.log(`[QICN] Dist static synced: ${copiedToDist.join(', ') || 'none'}`);
  console.log(`[QICN] Root runtime synced: ${copiedToRoot.join(', ') || 'none'}`);
  console.log('[QICN] _redirects generado en root y dist');
}

run();
