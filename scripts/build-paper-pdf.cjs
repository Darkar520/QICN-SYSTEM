const path = require('path');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

(async () => {
  const batchId = parseArg('batch-id', null);
  const roeoRoot = path.resolve(parseArg('roeo-root', 'artifacts/roeo_batches'));
  const exportsRoot = path.resolve(parseArg('exports-root', 'artifacts/paper_exports'));
  const { buildPaperPdf } = await import('./build_paper_pdf_lib.js');
  const result = buildPaperPdf({ batchId, roeoRoot, exportsRoot });
  console.log(JSON.stringify(result.payload));
  process.exit(result.exitCode);
})().catch((error) => {
  console.log(JSON.stringify({
    batchId: parseArg('batch-id', null),
    exportedPdf: false,
    reason: 'LATEX_BUILD_FAILED',
    error: error.message,
    pdfPath: null,
    logPath: null,
    prereg_hash: null,
    manifest_hash: null
  }));
  process.exit(4);
});
