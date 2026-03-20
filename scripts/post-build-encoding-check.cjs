const fs = require('fs');
const path = require('path');

const decoder = new TextDecoder('utf-8', { fatal: true });
const projectRoot = path.resolve(__dirname, '..');

const targets = [
  path.join(projectRoot, 'dist', 'bundle.js'),
  path.join(projectRoot, 'dist', 'network_canvas_worker.js')
];

const suspiciousPatterns = [
  /Ã./,
  /Â./,
  /â€./,
  /�/
];

const spanishCharRegex = /[áéíóúñÁÉÍÓÚÑ¿¡]/;
const sourceFiles = [
  path.join(projectRoot, 'src', 'index.jsx'),
  path.join(projectRoot, 'src', 'index_network_canvas.jsx')
];

function fail(message) {
  console.error(`[encoding-check] FAIL: ${message}`);
  process.exit(1);
}

function readUtf8Strict(filePath) {
  const raw = fs.readFileSync(filePath);
  try {
    decoder.decode(raw);
  } catch (error) {
    fail(`${path.relative(projectRoot, filePath)} is not valid UTF-8 (${error.message})`);
  }
  return raw.toString('utf8');
}

for (const target of targets) {
  if (!fs.existsSync(target)) {
    fail(`Missing build artifact: ${path.relative(projectRoot, target)}`);
  }
  const text = readUtf8Strict(target);
  for (const pattern of suspiciousPatterns) {
    if (pattern.test(text)) {
      fail(`Mojibake token detected in ${path.relative(projectRoot, target)} (pattern: ${pattern})`);
    }
  }
}

const sourcesContainSpanish = sourceFiles.some((filePath) => {
  if (!fs.existsSync(filePath)) return false;
  return spanishCharRegex.test(fs.readFileSync(filePath, 'utf8'));
});

if (sourcesContainSpanish) {
  const bundleText = fs.readFileSync(path.join(projectRoot, 'dist', 'bundle.js'), 'utf8');
  if (!spanishCharRegex.test(bundleText)) {
    fail('Spanish UTF-8 characters were not preserved in dist/bundle.js');
  }
}

console.log('[encoding-check] OK: UTF-8 integrity validated for dist artifacts.');
