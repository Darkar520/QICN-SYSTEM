import fs from 'fs';
import os from 'os';
import path from 'path';
import { createHash } from 'crypto';
import { buildPdfCorpus } from '../src/tools/pdf_corpus_builder.js';

const assert = (c, m) => { if (!c) throw new Error(m); };
const hashFile = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

(async () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'pdf-corpus-v1-'));
  const rootA = path.join(tmp, 'papers');
  const rootB = path.join(tmp, 'docs');
  fs.mkdirSync(rootA, { recursive: true });
  fs.mkdirSync(rootB, { recursive: true });
  fs.writeFileSync(path.join(rootA, 'a.pdf'), Buffer.from('%PDF-1.4\nA\n%%EOF\n', 'utf8'));
  fs.writeFileSync(path.join(rootB, 'b.pdf'), Buffer.from('%PDF-1.4\nB\n%%EOF\n', 'utf8'));

  const outRoot = path.join(tmp, 'artifacts', 'pdf_corpus');
  const r1 = buildPdfCorpus({
    corpusId: 'corpus_one',
    roots: [rootA, rootB],
    outRoot,
    preferLatexmk: false,
    deterministic: true,
    zipMode: 'store'
  });
  const r2 = buildPdfCorpus({
    corpusId: 'corpus_two',
    roots: [rootA, rootB],
    outRoot,
    preferLatexmk: false,
    deterministic: true,
    zipMode: 'store'
  });

  assert(r1.n_pdf_final === 2, 'CASE 1 FAIL: expected two final PDFs in corpus');
  assert(r1.n_copied === 2, 'CASE 2 FAIL: expected two copied PDFs');
  const m1 = JSON.parse(fs.readFileSync(path.join(r1.outDir, 'pdf_corpus_manifest.json'), 'utf8'));
  const m2 = JSON.parse(fs.readFileSync(path.join(r2.outDir, 'pdf_corpus_manifest.json'), 'utf8'));
  assert(m1.entries.length === m2.entries.length, 'CASE 3 FAIL: manifest entry length mismatch across deterministic runs');
  assert(hashFile(r1.zipPath) === hashFile(r2.zipPath), 'CASE 4 FAIL: deterministic zip hash mismatch');
  assert(fs.existsSync(path.join(r1.outDir, 'pdf_corpus_index.md')), 'CASE 5 FAIL: missing corpus index');
  console.log('OK: pdf-corpus.v1 tests passed');
})().catch((error) => {
  console.error(`FAIL: pdf-corpus.v1 tests failed: ${error.message}`);
  process.exit(1);
});
