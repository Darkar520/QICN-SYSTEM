const path = require('path');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

(async () => {
  const corpusId = parseArg('corpus-id', `pdf_corpus_${new Date().toISOString().slice(0, 10).replace(/-/g, '')}`);
  const rootsRaw = parseArg('roots', 'papers,theory,docs,notebook LM,notebooks,artifacts/paper_exports,exports,reports');
  const outRoot = parseArg('out-root', 'artifacts/pdf_corpus');
  const preferLatexmk = String(parseArg('prefer-latexmk', 'true')).toLowerCase() !== 'false';
  const deterministic = String(parseArg('deterministic', 'true')).toLowerCase() !== 'false';
  const zipMode = parseArg('zip-mode', 'store');
  const roots = rootsRaw.split(',').map((s) => s.trim()).filter(Boolean);
  const { buildPdfCorpus } = await import('../src/tools/pdf_corpus_builder.js');
  const result = buildPdfCorpus({
    corpusId,
    roots,
    outRoot: path.resolve(outRoot),
    preferLatexmk,
    deterministic,
    zipMode
  });
  console.log(JSON.stringify(result));
})().catch((error) => {
  console.error(`FAIL build-pdf-corpus: ${error.message}`);
  process.exit(1);
});
