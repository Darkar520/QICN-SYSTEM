const { applyHygieneGuard } = require('./latex_hygiene_guard.cjs');

function runTest() {
    console.log("=== PR-10A LaTeX Hygiene Guard Unit Test ===");

    const badTex = `\\documentclass{article}
\\begin{document}
Here is a table:
\\begin{tabular}{cc}
a_1 & b_2 \\\\
\\end{tabular}

\\begin{theorem}
This is a test.
\\end{defin}

And some math \\mathscr{M} and \\Q.
\\end{document}
`;

    const result = applyHygieneGuard(badTex, 'test.tex');

    let passed = true;

    if (!result.isMutated) {
        console.error("FAIL: Should have mutated the text.");
        passed = false;
    }

    if (result.classification !== 'LATEX_HYGIENE_ONLY') {
        console.error(`FAIL: Expected classification LATEX_HYGIENE_ONLY, got ${result.classification}`);
        passed = false;
    }

    if (!result.mutatedText.includes('\\_')) {
        console.error("FAIL: Underscores in tabular not escaped.");
        passed = false;
    }

    if (!result.mutatedText.includes('\\end{theorem}')) {
        console.error("FAIL: Environment mismatch not fixed.");
        passed = false;
    }

    if (!result.mutatedText.includes('\\usepackage{mathrsfs}')) {
        console.error("FAIL: mathrsfs package not added.");
        passed = false;
    }

    if (passed) {
        console.log("PASS: Hygiene Guard correctly identified and patched all LaTeX standard trace conditions.");
        console.log("Mutations Trace:\n", result.mutations.map(m => ` - ${m}`).join('\n'));
        console.log("Diff generated:\n" + result.diff);
    } else {
        process.exit(1);
    }
}

runTest();
