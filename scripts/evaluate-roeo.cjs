const path = require('path');

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

(async () => {
  const preregPath = parseArg('preregister', 'config/roeo/roeo_preregister.v1.json');
  const batchId = parseArg('batch-id', `roeo_${Date.now()}`);
  const outputRoot = parseArg('output-root', 'artifacts/roeo_batches');
  const withSno = String(parseArg('with-sno', 'true')).toLowerCase() !== 'false';
  const withNc = String(parseArg('with-nc', 'false')).toLowerCase() === 'true';
  const { evaluateRoeoBatch } = await import('../src/experiments/roeo_signature.js');
  const { evaluateSnoBatch } = await import('../src/experiments/sno_discriminator.js');
  const { runNegativeControlsBatch, evaluateBatchEnforcement } = await import('../src/experiments/negative_controls_runner.js');
  const { outPath, payload } = evaluateRoeoBatch({
    preregPath: path.resolve(preregPath),
    batchId,
    outputRoot: path.resolve(outputRoot)
  });
  let snoPath = null;
  let snoLeakPath = null;
  if (withSno) {
    const sno = evaluateSnoBatch({ preregPath: path.resolve(preregPath), batchId, outputRoot: path.resolve(outputRoot), injectLeak: false });
    snoPath = sno.outPath;
    const leak = evaluateSnoBatch({ preregPath: path.resolve(preregPath), batchId: `${batchId}_leak`, outputRoot: path.resolve(outputRoot), injectLeak: true });
    snoLeakPath = leak.outPath;
  }
  let ncPath = null;
  let enforcementPath = null;
  if (withNc) {
    if (!withSno) throw new Error('with-nc requires --with-sno=true');
    ncPath = runNegativeControlsBatch({ preregPath: path.resolve(preregPath), batchId, outputRoot: path.resolve(outputRoot) }).outPath;
    enforcementPath = evaluateBatchEnforcement({ preregPath: path.resolve(preregPath), batchId, outputRoot: path.resolve(outputRoot) }).outPath;
  }
  console.log(JSON.stringify({
    batchId,
    operational_equivalence_path: outPath,
    sno_report_path: snoPath,
    sno_leak_report_path: snoLeakPath,
    negative_controls_report_path: ncPath,
    roeo_enforcement_report_path: enforcementPath,
    pair_count: payload?.pairs?.length || 0,
    prereg_hash: payload?.prereg_hash || null
  }));
})().catch((error) => {
  console.error(`FAIL evaluate-roeo: ${error.message}`);
  process.exit(1);
});
