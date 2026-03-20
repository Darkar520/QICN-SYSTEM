import fs from 'fs';
import path from 'path';

export const buildPaperMainTex = ({ batchId, exportDir, figureJsonFiles = [] }) => {
  const figures = [...figureJsonFiles].sort();
  const figureLines = figures.length
    ? figures.map((f) => `\\item \\texttt{${f.replace(/_/g, '\\_')}}`)
    : ['\\item \\texttt{figures\\_data\\_ROEO.json}'];
  return [
    '\\documentclass[11pt]{article}',
    '\\usepackage[margin=1in]{geometry}',
    '\\usepackage[T1]{fontenc}',
    '\\usepackage[utf8]{inputenc}',
    '\\title{QICN ROEO Export}',
    `\\author{Batch ${String(batchId).replace(/_/g, '\\_')}}`,
    '\\date{}',
    '\\begin{document}',
    '\\maketitle',
    '\\section*{Operational Equivalence}',
    '\\input{tables_ROEO.tex}',
    '\\section*{Substrate Non-Observability}',
    '\\input{tables_SNO.tex}',
    '\\section*{Negative Controls}',
    '\\input{tables_NC.tex}',
    '\\section*{Provenance Hashes}',
    '\\input{appendix_hashes.tex}',
    '\\section*{Figure Data References}',
    '\\begin{itemize}',
    ...figureLines,
    '\\end{itemize}',
    '\\end{document}'
  ].join('\n');
};

export const ensurePaperMainTex = ({ batchId, exportDir }) => {
  const figFiles = fs.readdirSync(exportDir).filter((f) => /^figures_data_.*\.json$/i.test(f));
  const next = buildPaperMainTex({ batchId, exportDir, figureJsonFiles: figFiles });
  const mainPath = path.join(exportDir, 'main.tex');
  if (!fs.existsSync(mainPath) || fs.readFileSync(mainPath, 'utf8') !== next) {
    fs.writeFileSync(mainPath, `${next}\n`, 'utf8');
  }
  return { mainPath, figureFiles: figFiles.sort() };
};
