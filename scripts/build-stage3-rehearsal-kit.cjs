#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_STAGE31 = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_1');
const OUTPUT_STAGE32 = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_2');
const OUTPUT_STAGE33 = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_3');
const OUTPUT_STAGE34 = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_4');
const OUTPUT_STAGE34B = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_4b');
const OUTPUT_STAGE35 = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_5');
const PAPER10_DIR = path.join(ROOT, 'paper10_external_adjudication_and_human_comparators');
const PAPER10_MAIN = path.join(PAPER10_DIR, 'main.tex');
const PAPER10_PDF = path.join(PAPER10_DIR, 'main.pdf');
const PAPER10_CLEANUP_SUFFIXES = ['.aux', '.log', '.out', '.toc', '.fdb_latexmk', '.fls'];

const cleanupPaper10BuildArtifacts = () => {
  PAPER10_CLEANUP_SUFFIXES.forEach((suffix) => {
    const target = path.join(PAPER10_DIR, `main${suffix}`);
    if (fs.existsSync(target)) fs.unlinkSync(target);
  });
};

const compilePaper10 = () => {
  if (!fs.existsSync(PAPER10_MAIN)) {
    return {
      status: 'compile_not_run_missing_source',
      warnings: ['paper10_main_tex_missing']
    };
  }

  try {
    for (let i = 0; i < 2; i += 1) {
      const result = cp.spawnSync(
        'pdflatex',
        ['-interaction=nonstopmode', '-halt-on-error', 'main.tex'],
        {
          cwd: PAPER10_DIR,
          encoding: 'utf8'
        }
      );
      if (result.error) throw result.error;
      if (result.status !== 0) {
        throw new Error(
          (result.stderr || result.stdout || 'pdflatex returned a non-zero status')
            .split(/\r?\n/)
            .slice(-20)
            .join('\n')
        );
      }
    }

    const compiled = fs.existsSync(PAPER10_PDF);
    cleanupPaper10BuildArtifacts();
    return {
      status: compiled ? 'compiled' : 'compile_failed_missing_pdf',
      warnings: compiled ? [] : ['paper10_pdf_missing_after_pdflatex']
    };
  } catch (error) {
    cleanupPaper10BuildArtifacts();
    const message = String(error.message || error);
    if (/ENOENT|not recognized as the name of a cmdlet|No such file/i.test(message)) {
      return {
        status: 'compile_not_run_toolchain_unavailable',
        warnings: ['pdflatex_unavailable']
      };
    }
    return {
      status: 'compile_failed',
      warnings: [`paper10_compile_failed:${message.replace(/\s+/g, ' ').slice(0, 240)}`]
    };
  }
};

const build = async () => {
  const builderUrl = pathToFileURL(
    path.join(ROOT, 'src', 'comparative_program', 'Stage3RehearsalPreparationBuilder.js')
  ).href;
  const builderModule = await import(builderUrl);
  const compileResult = compilePaper10();

  const outputs = builderModule.createStage3RehearsalPreparationBuilder().buildArtifacts({
    stage31Dir: OUTPUT_STAGE31,
    stage32Dir: OUTPUT_STAGE32,
    stage33Dir: OUTPUT_STAGE33,
    stage34Dir: OUTPUT_STAGE34,
    stage34bDir: OUTPUT_STAGE34B,
    stage35Dir: OUTPUT_STAGE35,
    paper10CompileResult: compileResult
  });

  console.log('PASS build-stage3-rehearsal-kit');
  console.log(`  rehearsal_kit_state: ${outputs.executionPilotRehearsalKitStatus.rehearsal_kit_state}`);
  console.log(`  rehearsal_state: ${outputs.executionPilotRehearsalKitStatus.rehearsal_state}`);
  console.log(`  dry_run_sequence_state: ${outputs.dryRunSequenceReadiness.dry_run_sequence_state}`);
  console.log(`  event_log_state: ${outputs.rehearsalEventLogStatus.event_log_state}`);
  console.log(`  paper10_compile_status: ${compileResult.status}`);
  compileResult.warnings.forEach((warning) => console.log(`  warning: ${warning}`));
};

build().catch((error) => {
  console.error(`FAIL build-stage3-rehearsal-kit: ${error.message}`);
  process.exitCode = 1;
});
