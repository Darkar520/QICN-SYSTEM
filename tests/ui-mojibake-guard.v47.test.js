import fs from 'fs';
import path from 'path';

const files = [
  path.resolve('src/index.jsx')
];

const patterns = [
  /\uFFFD/g,
  /Ã[\x80-\xBF]/g,
  /Â[\x80-\xBF]/g
];

for (const file of files) {
  const content = fs.readFileSync(file, 'utf8');
  for (const pattern of patterns) {
    const hit = content.match(pattern);
    if (hit && hit.length > 0) {
      throw new Error(`mojibake pattern ${pattern} found in ${path.basename(file)} (${hit.length})`);
    }
  }
}

console.log('ok ui-mojibake-guard.v47');
