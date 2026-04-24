#!/usr/bin/env node
/* eslint-disable no-console */
const fs = require('fs');
const path = require('path');
const cp = require('child_process');
const { pathToFileURL } = require('url');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT_RUNTIME = path.join(ROOT, 'artifacts', 'runtime_health');
const CLEAN_ROOM_ROOT = path.join(ROOT, '.stage3_clean_room', 'qicn_system_cleanroom');
const RELEASE_ROOT = path.resolve(ROOT, '..', 'release_repo_qicn_2026-03-01');
const STAGE36_DIR = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_6');
const STAGE37_DIR = path.join(ROOT, 'artifacts', 'external_adjudication', 'stage3_7');
const PAPER10_STATUS_PATH = path.join(
  ROOT,
  'artifacts',
  'external_adjudication',
  'stage3_2',
  'paper10_protocol_hardening_status.json'
);
const EXECUTION_FREEZE_PATH = path.join(ROOT, 'docs', 'execution_campaign_freeze.v1.json');
const npmBinary = process.platform === 'win32' ? 'npm.cmd' : 'npm';
const gitBinary = process.platform === 'win32' ? 'git.exe' : 'git';
const npmExecPath = process.env.npm_execpath && fs.existsSync(process.env.npm_execpath)
  ? process.env.npm_execpath
  : null;

const ensureDir = (target) => fs.mkdirSync(target, { recursive: true });
const readJson = (target) => JSON.parse(fs.readFileSync(target, 'utf8'));
const writeJson = (target, payload) =>
  fs.writeFileSync(target, `${JSON.stringify(payload, null, 2)}\n`, 'utf8');
const normalize = (value) => String(value || '').replace(/\\/g, '/');
const rel = (value) => normalize(path.relative(ROOT, value));
const escapeRegExp = (value) => String(value).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const OUTPUT_SANITIZERS = [
  [new RegExp(escapeRegExp(ROOT), 'gi'), '<workspace-root>'],
  [new RegExp(escapeRegExp(normalize(ROOT)), 'gi'), '<workspace-root>'],
  [new RegExp(escapeRegExp(CLEAN_ROOM_ROOT), 'gi'), '<clean-room-root>'],
  [new RegExp(escapeRegExp(normalize(CLEAN_ROOM_ROOT)), 'gi'), '<clean-room-root>'],
  [new RegExp(escapeRegExp(RELEASE_ROOT), 'gi'), '<release-root>'],
  [new RegExp(escapeRegExp(normalize(RELEASE_ROOT)), 'gi'), '<release-root>'],
  [/OneDrive[\\/]+Escritorio[\\/]+QICN-FRAMEWORK[\\/]+Sistema(?:%20| )Canon(?:%20| )Sandbox[\\/]+\.stage3_clean_room[\\/]+qicn_system_cleanroom/gi, '<clean-room-root>'],
  [/OneDrive[\\/]+Escritorio[\\/]+QICN-FRAMEWORK[\\/]+Sistema(?:%20| )Canon(?:%20| )Sandbox/gi, '<workspace-root>'],
  [/OneDrive[\\/]+Escritorio[\\/]+QICN-FRAMEWORK[\\/]+release_repo_qicn_2026-03-01/gi, '<release-root>'],
  [/[A-Za-z]:\\Users\\[^\\\r\n]+/g, '<local-user-root>'],
  [/[A-Za-z]:\/Users\/[^/\r\n]+/g, '<local-user-root>'],
  [/\/c:\/Users\/[^/\r\n]+/gi, '<local-user-root>']
];
const sanitizeOutput = (value) =>
  OUTPUT_SANITIZERS.reduce(
    (text, [pattern, replacement]) => text.replace(pattern, replacement),
    String(value || '')
  );
const tail = (text, lineCount = 24) =>
  sanitizeOutput(text)
    .split(/\r?\n/)
    .filter(Boolean)
    .slice(-lineCount)
    .join('\n');

const getHeadSha = () =>
  cp.execFileSync(gitBinary, ['rev-parse', 'HEAD'], {
    cwd: ROOT,
    encoding: 'utf8'
  }).trim();

const runCommand = (command, args, options = {}) => {
  const startedAt = Date.now();
  const result = cp.spawnSync(command, args, {
    cwd: options.cwd || ROOT,
    encoding: 'utf8',
    timeout: options.timeoutMs || 300000,
    maxBuffer: 50 * 1024 * 1024,
    env: {
      ...process.env,
      ...(options.env || {})
    }
  });

  return {
    id: options.id || [command, ...args].join(' '),
    command: options.displayCommand || [command, ...args].join(' '),
    cwd: rel(options.cwd || ROOT) || '.',
    exit_code: Number.isInteger(result.status) ? result.status : -1,
    signal: result.signal || null,
    duration_ms: Date.now() - startedAt,
    stdout_excerpt: tail(result.stdout || ''),
    stderr_excerpt: tail(result.stderr || ''),
    error: result.error ? sanitizeOutput(String(result.error.message || result.error)) : null
  };
};

const runNpmCommand = (args, options = {}) => {
  if (npmExecPath) {
    return runCommand(process.execPath, [npmExecPath, ...args], {
      ...options,
      displayCommand: `npm ${args.join(' ')}`
    });
  }
  if (process.platform === 'win32') {
    return runCommand('cmd.exe', ['/d', '/s', '/c', 'npm', ...args], {
      ...options,
      displayCommand: `npm ${args.join(' ')}`
    });
  }
  return runCommand(npmBinary, args, {
    ...options,
    displayCommand: `npm ${args.join(' ')}`
  });
};

const commandSucceeded = (result) => result.exit_code === 0 && !result.error;

const classifyPreferredInstall = (result) => {
  const stderr = `${result.stderr_excerpt}\n${result.error || ''}`;
  if (commandSucceeded(result)) return 'preferred_install_passed';
  if (/EBADENGINE|Exit handler never called|EPERM|permission|EACCES/i.test(stderr)) {
    return 'preferred_install_failed_environmental';
  }
  return 'preferred_install_failed_repo_local';
};

const classifyState = ({ commands, warnings, blockers }) => {
  if (blockers.length > 0) return 'runtime_health_fail';
  if (warnings.length > 0) return 'runtime_health_pass_with_warnings';
  if (commands.length === 0) return 'runtime_health_not_checked';
  return 'runtime_health_pass';
};

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const probeLocalStart = async () => {
  const startedAt = Date.now();
  const child = cp.spawn('node', ['scripts/local-sandbox-server.mjs'], {
    cwd: ROOT,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  child.stdout.on('data', (chunk) => {
    stdout += chunk.toString();
  });
  child.stderr.on('data', (chunk) => {
    stderr += chunk.toString();
  });

  try {
    await wait(2500);
    const rootResponse = await fetch('http://127.0.0.1:3000/', {
      signal: AbortSignal.timeout(5000)
    });
    const healthResponse = await fetch('http://127.0.0.1:3000/.netlify/functions/runtime-health', {
      signal: AbortSignal.timeout(5000)
    });
    const healthBody = await healthResponse.text();

    return {
      id: 'npm_run_start_local_probe',
      command: 'npm run start:local',
      cwd: '.',
      exit_code: rootResponse.ok && healthResponse.ok ? 0 : 1,
      signal: null,
      duration_ms: Date.now() - startedAt,
      stdout_excerpt: tail(
        `${stdout}\nroot_status=${rootResponse.status}\nhealth_status=${healthResponse.status}\nhealth_body=${healthBody}`
      ),
      stderr_excerpt: tail(stderr),
      error: null
    };
  } catch (error) {
    return {
      id: 'npm_run_start_local_probe',
      command: 'npm run start:local',
      cwd: '.',
      exit_code: 1,
      signal: null,
      duration_ms: Date.now() - startedAt,
      stdout_excerpt: tail(stdout),
      stderr_excerpt: tail(`${stderr}\n${error.message || error}`),
      error: sanitizeOutput(String(error.message || error))
    };
  } finally {
    child.kill('SIGTERM');
    await wait(750);
    if (!child.killed) child.kill('SIGKILL');
  }
};

const updateExecutionFreezeHead = (currentHead) => {
  const freeze = readJson(EXECUTION_FREEZE_PATH);
  freeze.current_trunk_linkage = {
    ...(freeze.current_trunk_linkage || {}),
    qicn_system_current_main_sha: currentHead
  };
  writeJson(EXECUTION_FREEZE_PATH, freeze);
};

const updateExecutionFreezeHeadAt = (targetPath, currentHead) => {
  const freeze = readJson(targetPath);
  freeze.current_trunk_linkage = {
    ...(freeze.current_trunk_linkage || {}),
    qicn_system_current_main_sha: currentHead
  };
  writeJson(targetPath, freeze);
};

const gitTrackedArtifactPaths = () =>
  cp
    .execFileSync(
      gitBinary,
      ['ls-files', 'artifacts/comparative_program', 'artifacts/external_adjudication'],
      {
        cwd: ROOT,
        encoding: 'utf8'
      }
    )
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const snapshotArtifacts = (relativePaths) =>
  Object.fromEntries(
    relativePaths.map((relativePath) => {
      const absolutePath = path.join(ROOT, relativePath);
      return [
        relativePath,
        fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null
      ];
    })
  );

const stripVolatileFields = (value) => {
  if (Array.isArray(value)) return value.map(stripVolatileFields);
  if (!value || typeof value !== 'object') return value;
  const next = {};
  Object.entries(value).forEach(([key, entryValue]) => {
    if (key === 'generated_at' || key === 'current_lineage') return;
    next[key] = stripVolatileFields(entryValue);
  });
  return next;
};

const classifyArtifactDrift = (beforeText, afterText) => {
  if (beforeText === afterText) return 'unchanged';
  const beforeIsJson = beforeText && /^\s*[\[{]/.test(beforeText);
  const afterIsJson = afterText && /^\s*[\[{]/.test(afterText);
  if (beforeIsJson && afterIsJson) {
    try {
      const beforeJson = stripVolatileFields(JSON.parse(beforeText));
      const afterJson = stripVolatileFields(JSON.parse(afterText));
      if (JSON.stringify(beforeJson) === JSON.stringify(afterJson)) {
        return 'expected_provenance_drift';
      }
    } catch {
      // Ignore JSON parse issues and fall through.
    }
  }
  return beforeText == null ? 'new_artifact' : 'source_driven_semantic_drift';
};

const rebuildStage3ControlledExecution = () =>
  runCommand('node', ['scripts/build-stage3-controlled-execution-opening.cjs'], {
    id: 'build_stage3_controlled_execution_opening',
    timeoutMs: 300000
  });

const buildArtifactRegenerationAudit = ({ beforeSnapshots, trackedArtifacts, currentHead }) => {
  const changedArtifacts = [];
  trackedArtifacts.forEach((relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    const afterText = fs.existsSync(absolutePath) ? fs.readFileSync(absolutePath, 'utf8') : null;
    const drift = classifyArtifactDrift(beforeSnapshots[relativePath], afterText);
    if (drift !== 'unchanged') {
      changedArtifacts.push({
        artifact: relativePath,
        drift_classification: drift
      });
    }
  });

  let artifact_regeneration_state = 'artifacts_current';
  if (changedArtifacts.length > 0) {
    const onlyProvenance = changedArtifacts.every(
      (entry) => entry.drift_classification === 'expected_provenance_drift'
    );
    if (onlyProvenance) {
      artifact_regeneration_state = 'artifacts_regenerated_with_expected_provenance_drift';
    } else if (
      changedArtifacts.some((entry) => entry.drift_classification === 'source_driven_semantic_drift')
    ) {
      artifact_regeneration_state = 'artifacts_stale_and_fixed';
    } else {
      artifact_regeneration_state = 'artifacts_regenerated_without_semantic_drift';
    }
  }

  return {
    artifact_role: 'artifact_regeneration_audit',
    artifact_name: 'artifact_regeneration_audit.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_6b_artifact_regeneration_audit',
    layer_version: 'comparative_expansion_layer.stage3_6b_artifact_regeneration_audit.v1',
    estimator_version: 'artifact_regeneration_audit_builder.v1',
    implementation_status: 'artifact_regeneration_audit_defined',
    artifact_regeneration_state,
    changed_artifact_count: changedArtifacts.length,
    changed_artifacts: changedArtifacts,
    paper10_status_coherence: fs.existsSync(PAPER10_STATUS_PATH)
      ? readJson(PAPER10_STATUS_PATH).paper10_state === 'paper10_protocol_grade_backbone'
      : false,
    boundary_flags: {
      framework_internal_only: true,
      no_manual_backfill_claimed: true
    },
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: {
        qicn_system_head: currentHead
      }
    },
    schema_ref: 'src/comparative_program/schemas/artifact_regeneration_audit.v1.json'
  };
};

const collectTrackedFiles = (...relativeDirs) =>
  cp
    .execFileSync(gitBinary, ['ls-files', ...relativeDirs], {
      cwd: ROOT,
      encoding: 'utf8'
    })
    .split(/\r?\n/)
    .map((entry) => entry.trim())
    .filter(Boolean);

const buildPathLeakageAudit = ({ currentHead }) => {
  const trackedFiles = collectTrackedFiles(
    'docs',
    'src',
    'scripts',
    'paper10_external_adjudication_and_human_comparators'
  );
  const findings = [];

  trackedFiles.forEach((relativePath) => {
    const absolutePath = path.join(ROOT, relativePath);
    const text = fs.readFileSync(absolutePath, 'utf8');

    if (/[A-Za-z]:[\\/]+Users[\\/]/.test(text)) {
      const classification = relativePath.startsWith('docs/superpowers/plans/')
        ? 'allowed_historical_snapshot'
        : 'requires_fix';
      findings.push({
        file: relativePath,
        classification,
        note:
          classification === 'allowed_historical_snapshot'
            ? 'Historical planning surface preserved as evidence of prior execution.'
            : 'Live normative surface contains a user-specific absolute path.'
      });
    }

    if (
      /LOCAL_PATH_PATTERN|OneDrive|Escritorio|Sistema Canon Sandbox|release_repo_qicn_2026-03-01/.test(
        text
      )
    ) {
      if (
        /LOCAL_PATH_PATTERN/.test(text)
        || relativePath.endsWith('ComparativeRuntimeUtils.js')
        || relativePath.endsWith('PhenomenalBridgeRuntimeUtils.js')
        || relativePath.endsWith('SubjectivityEcosystemIntegrator.js')
      ) {
        findings.push({
          file: relativePath,
          classification: 'allowed_detector_pattern',
          note: 'Detector or sibling-root resolution logic, not a leaked absolute path.'
        });
      }
    }
  });

  const executionFreeze = readJson(EXECUTION_FREEZE_PATH);
  if (executionFreeze.current_trunk_linkage?.qicn_system_current_main_sha !== currentHead) {
    findings.push({
      file: 'docs/execution_campaign_freeze.v1.json',
      classification: 'requires_fix',
      note: 'Live trunk SHA pin was stale before this audit refresh.'
    });
  }

  const liveNormativeLeakCount = findings.filter((entry) => entry.classification === 'requires_fix')
    .length;
  const blockerCount = findings.filter((entry) => entry.classification === 'blocker').length;

  return {
    artifact_role: 'path_and_local_leakage_audit',
    artifact_name: 'path_and_local_leakage_audit.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_6b_path_and_local_leakage_audit',
    layer_version: 'comparative_expansion_layer.stage3_6b_path_and_local_leakage_audit.v1',
    estimator_version: 'path_and_local_leakage_audit_builder.v1',
    implementation_status: 'path_and_local_leakage_audit_defined',
    path_leakage_state:
      blockerCount > 0
        ? 'path_leakage_blocking'
        : liveNormativeLeakCount > 0
          ? 'path_leakage_requires_fix'
          : findings.length > 0
            ? 'path_leakage_clear_with_historical_examples'
            : 'path_leakage_clear',
    finding_count: findings.length,
    live_normative_leak_count: liveNormativeLeakCount,
    blocker_count: blockerCount,
    findings,
    boundary_flags: {
      historical_snapshots_preserved: true,
      live_normative_leaks_absent_after_fix: liveNormativeLeakCount === 0,
      blocker_absent: blockerCount === 0
    },
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: {
        qicn_system_head: currentHead
      }
    },
    schema_ref: 'src/comparative_program/schemas/path_and_local_leakage_audit.v1.json'
  };
};

const copyEntry = (sourcePath, targetPath, cleanRoomBase) => {
  fs.cpSync(sourcePath, targetPath, {
    recursive: true,
    force: true,
    filter: (innerSource) => {
      const resolved = path.resolve(innerSource);
      const pathSegments = resolved.split(path.sep);
      const relativeSource = normalize(path.relative(ROOT, resolved));
      if (resolved.startsWith(cleanRoomBase)) return false;
      if (pathSegments.includes('.git')) return false;
      if (pathSegments.includes('.stage3_clean_room')) return false;
      if (
        relativeSource === 'artifacts/ecosystem_release_candidate'
        || relativeSource.startsWith('artifacts/ecosystem_release_candidate/')
      ) {
        return false;
      }
      if (resolved.includes(`${path.sep}node_modules`)) return false;
      if (resolved.includes(`${path.sep}dist`)) return false;
      return true;
    }
  });
};

const prepareCleanRoom = () => {
  fs.rmSync(CLEAN_ROOM_ROOT, { recursive: true, force: true });
  ensureDir(CLEAN_ROOM_ROOT);

  for (const entry of fs.readdirSync(ROOT, { withFileTypes: true })) {
    if (['.git', 'node_modules', 'dist', '.stage3_clean_room'].includes(entry.name)) continue;
    const sourcePath = path.join(ROOT, entry.name);
    const targetPath = path.join(CLEAN_ROOM_ROOT, entry.name);
    copyEntry(sourcePath, targetPath, CLEAN_ROOM_ROOT);
  }

  fs.rmSync(path.join(CLEAN_ROOM_ROOT, 'artifacts', 'runtime_health'), {
    recursive: true,
    force: true
  });
  fs.rmSync(path.join(CLEAN_ROOM_ROOT, 'artifacts', 'ecosystem_release_candidate'), {
    recursive: true,
    force: true
  });
  fs.rmSync(path.join(CLEAN_ROOM_ROOT, 'artifacts', 'external_adjudication', 'stage3_7'), {
    recursive: true,
    force: true
  });
  fs.rmSync(
    path.join(CLEAN_ROOM_ROOT, 'paper10_external_adjudication_and_human_comparators', 'main.pdf'),
    { force: true }
  );
  fs.rmSync(path.join(CLEAN_ROOM_ROOT, 'artifacts', 'external_adjudication', 'stage3_6'), {
    recursive: true,
    force: true
  });

  const initResult = runCommand(gitBinary, ['init', '-b', 'main'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_git_init'
  });
  const configResult = commandSucceeded(initResult)
    ? runCommand(gitBinary, ['config', 'core.longpaths', 'true'], {
        cwd: CLEAN_ROOM_ROOT,
        id: 'clean_room_git_config_longpaths'
      })
    : null;
  const addResult = runCommand(gitBinary, ['add', '--all', '.'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_git_add'
  });
  const commitResult = runCommand(
    gitBinary,
    [
      '-c',
      'user.name=QICN Clean Room',
      '-c',
      'user.email=cleanroom@example.invalid',
      'commit',
      '-m',
      'clean-room snapshot'
    ],
    {
      cwd: CLEAN_ROOM_ROOT,
      id: 'clean_room_git_commit'
    }
  );
  const revParseResult = commandSucceeded(commitResult)
    ? runCommand(gitBinary, ['rev-parse', 'HEAD'], {
        cwd: CLEAN_ROOM_ROOT,
        id: 'clean_room_git_rev_parse'
      })
    : null;

  return {
    initResult,
    configResult,
    addResult,
    commitResult,
    targetSha: revParseResult ? revParseResult.stdout_excerpt.trim() : 'clean_room_commit_unavailable',
    revParseResult
  };
};

const buildCleanRoomAudit = async ({ sourceHead }) => {
  const cleanRoomEnv = {
    ECO_RELEASE_ROOT: RELEASE_ROOT
  };
  const { initResult, configResult, addResult, commitResult, targetSha, revParseResult } = prepareCleanRoom();
  const command_results = [];
  command_results.push(initResult);
  if (configResult) command_results.push(configResult);
  command_results.push(addResult, commitResult);
  if (revParseResult) command_results.push(revParseResult);

  const nodeVersion = runCommand('node', ['-v'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_node_version'
  });
  const npmVersion = runNpmCommand(['-v'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_npm_version',
    env: cleanRoomEnv
  });
  command_results.push(nodeVersion, npmVersion);

  if (targetSha !== 'clean_room_commit_unavailable') {
    updateExecutionFreezeHeadAt(
      path.join(CLEAN_ROOM_ROOT, 'docs', 'execution_campaign_freeze.v1.json'),
      targetSha
    );
  }

  const preferredInstall = runNpmCommand(['ci'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_npm_ci',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  command_results.push(preferredInstall);

  let fallbackInstall = null;
  if (!commandSucceeded(preferredInstall)) {
    fallbackInstall = runNpmCommand(['install'], {
      cwd: CLEAN_ROOM_ROOT,
      id: 'clean_room_npm_install',
      timeoutMs: 300000,
      env: cleanRoomEnv
    });
    command_results.push(fallbackInstall);
  }

  const buildResult = runNpmCommand(['run', 'build'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_build',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  const testResult = runNpmCommand(['test'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_test',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  const stage36Build = runNpmCommand(['run', 'build:stage3-controlled-execution-opening'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_stage3_6_build',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  const verifySource = runNpmCommand(['run', 'verify:source-of-truth'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_verify_source_of_truth',
    timeoutMs: 120000,
    env: cleanRoomEnv
  });
  const verifyClosure = runNpmCommand(['run', 'verify:comparative-program-closure'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_verify_comparative_closure',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  const verifyStage36 = runNpmCommand(['run', 'verify:stage3-controlled-execution-opening'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_verify_stage3_6',
    timeoutMs: 300000,
    env: cleanRoomEnv
  });
  const verifyPaper9 = runNpmCommand(['run', 'verify:paper9-handoff-readiness'], {
    cwd: CLEAN_ROOM_ROOT,
    id: 'clean_room_verify_paper9_handoff',
    timeoutMs: 120000,
    env: cleanRoomEnv
  });
  command_results.push(
    buildResult,
    testResult,
    stage36Build,
    verifySource,
    verifyClosure,
    verifyStage36,
    verifyPaper9
  );

  let paper10CompileStatus = 'paper10_status_unavailable';
  const cleanRoomPaper10StatusPath = path.join(
    CLEAN_ROOM_ROOT,
    'artifacts',
    'external_adjudication',
    'stage3_2',
    'paper10_protocol_hardening_status.json'
  );
  if (fs.existsSync(cleanRoomPaper10StatusPath)) {
    paper10CompileStatus = readJson(cleanRoomPaper10StatusPath).compile_status;
  }

  const warnings = [];
  if (!commandSucceeded(preferredInstall)) {
    warnings.push(`preferred_install:${classifyPreferredInstall(preferredInstall)}`);
  }
  if (
    preferredInstall.stderr_excerpt.includes('EBADENGINE')
    || (fallbackInstall && fallbackInstall.stderr_excerpt.includes('EBADENGINE'))
  ) {
    warnings.push('engine_mismatch');
  }
  warnings.push('bounded_dual_repo_dependency');
  warnings.push('clean_room_excludes_generated_release_candidate_bundle');
  if (paper10CompileStatus !== 'compiled') {
    warnings.push(`paper10_compile:${paper10CompileStatus}`);
  }

  const fallbackSucceeded = fallbackInstall ? commandSucceeded(fallbackInstall) : false;
  const blockers = [];
  if (!commandSucceeded(initResult)) blockers.push('clean_room_git_init_failed');
  if (!commandSucceeded(addResult)) blockers.push('clean_room_git_add_failed');
  if (!commandSucceeded(commitResult)) blockers.push('clean_room_git_snapshot_failed');
  if (!commandSucceeded(buildResult)) blockers.push('clean_room_build_failed');
  if (!commandSucceeded(testResult)) blockers.push('clean_room_test_failed');
  if (!commandSucceeded(stage36Build)) blockers.push('clean_room_stage3_6_build_failed');
  if (!commandSucceeded(verifySource)) blockers.push('clean_room_source_of_truth_failed');
  if (!commandSucceeded(verifyClosure)) blockers.push('clean_room_comparative_closure_failed');
  if (!commandSucceeded(verifyStage36)) blockers.push('clean_room_stage3_6_verifier_failed');
  if (!commandSucceeded(verifyPaper9)) blockers.push('clean_room_paper9_verifier_failed');
  if (
    !commandSucceeded(preferredInstall)
    && !(fallbackInstall && fallbackSucceeded)
  ) {
    blockers.push('clean_room_dependency_install_failed');
  }

  const clean_room_state =
    blockers.length > 0
      ? 'clean_room_failed'
      : warnings.length > 0
        ? 'clean_room_reproducible_with_warnings'
        : 'clean_room_reproducible';

  return {
    artifact_role: 'clean_room_reproducibility_audit',
    artifact_name: 'clean_room_reproducibility_audit.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_6b_clean_room_reproducibility',
    layer_version: 'comparative_expansion_layer.stage3_6b_clean_room_reproducibility.v1',
    estimator_version: 'clean_room_reproducibility_audit_builder.v1',
    implementation_status: 'clean_room_reproducibility_audit_defined',
    clean_room_state,
    clean_room_method: 'bounded_local_copy_with_clean_git_snapshot_and_explicit_release_root',
    source_sha: sourceHead,
    target_clean_room_sha: targetSha,
    clean_room_root: rel(CLEAN_ROOM_ROOT),
    paper10_compile_status: paper10CompileStatus,
    command_results,
    warnings,
    blockers,
    boundary_flags: {
      clean_room_is_local_only: true,
      collection_not_started: true,
      evidence_generation_absent: true
    },
    non_implications: [
      'Clean-room reproducibility is not evidence generation.',
      'Clean-room reproducibility is not adjudication.',
      'Clean-room reproducibility is not Paper 10 final authorization.'
    ],
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: {
        qicn_system_head: sourceHead
      }
    },
    schema_ref:
      'src/comparative_program/schemas/clean_room_reproducibility_audit.v1.json'
  };
};

const buildRuntimeHealthAudit = async ({ sourceHead }) => {
  const command_results = [];
  const warnings = [];
  const blockers = [];

  const nodeVersion = runCommand('node', ['-v'], { id: 'node_version' });
  const npmVersion = runNpmCommand(['-v'], { id: 'npm_version' });
  command_results.push(nodeVersion, npmVersion);

  const preferredInstall = runNpmCommand(['ci'], {
    id: 'dependency_install_preferred',
    timeoutMs: 300000
  });
  command_results.push(preferredInstall);

  let fallbackInstall = null;
  if (!commandSucceeded(preferredInstall)) {
    const preferredClassification = classifyPreferredInstall(preferredInstall);
    warnings.push(preferredClassification);
    fallbackInstall = runNpmCommand(['install'], {
      id: 'dependency_install_fallback',
      timeoutMs: 300000
    });
    command_results.push(fallbackInstall);
    if (!commandSucceeded(fallbackInstall)) {
      blockers.push('dependency_install_failed');
    }
  }

  if (
    preferredInstall.stderr_excerpt.includes('EBADENGINE')
    || (fallbackInstall && fallbackInstall.stderr_excerpt.includes('EBADENGINE'))
  ) {
    warnings.push('engine_mismatch');
  }
  if (
    preferredInstall.stdout_excerpt.includes('vulnerabilities')
    || preferredInstall.stderr_excerpt.includes('vulnerabilities')
    || (fallbackInstall && /vulnerabilities/i.test(fallbackInstall.stdout_excerpt))
  ) {
    warnings.push('dependency_advisories_present');
  }

  const buildResult = runNpmCommand(['run', 'build'], {
    id: 'repository_build',
    timeoutMs: 300000
  });
  const testResult = runNpmCommand(['test'], {
    id: 'repository_test',
    timeoutMs: 300000
  });
  const startLocalResult = await probeLocalStart();
  const verifySource = runNpmCommand(['run', 'verify:source-of-truth'], {
    id: 'verify_source_of_truth',
    timeoutMs: 120000
  });
  const verifyClosure = runNpmCommand(['run', 'verify:comparative-program-closure'], {
    id: 'verify_comparative_program_closure',
    timeoutMs: 120000
  });
  const verifyStage36 = runNpmCommand(['run', 'verify:stage3-controlled-execution-opening'], {
    id: 'verify_stage3_controlled_execution_opening',
    timeoutMs: 300000
  });
  const verifyStage35 = runNpmCommand(['run', 'verify:stage3-5-readiness'], {
    id: 'verify_stage3_5_readiness',
    timeoutMs: 300000
  });
  const verifyPaper9 = runNpmCommand(['run', 'verify:paper9-handoff-readiness'], {
    id: 'verify_paper9_handoff_readiness',
    timeoutMs: 120000
  });

  command_results.push(
    buildResult,
    testResult,
    startLocalResult,
    verifySource,
    verifyClosure,
    verifyStage36,
    verifyStage35,
    verifyPaper9
  );

  if (!commandSucceeded(buildResult)) blockers.push('repository_build_failed');
  if (!commandSucceeded(testResult)) blockers.push('repository_test_failed');
  if (!commandSucceeded(startLocalResult)) blockers.push('local_start_probe_failed');
  if (!commandSucceeded(verifySource)) blockers.push('source_of_truth_verifier_failed');
  if (!commandSucceeded(verifyClosure)) blockers.push('comparative_program_closure_verifier_failed');
  if (!commandSucceeded(verifyStage36)) blockers.push('stage3_controlled_execution_verifier_failed');
  if (!commandSucceeded(verifyStage35)) blockers.push('stage3_5_verifier_failed');
  if (!commandSucceeded(verifyPaper9)) blockers.push('paper9_handoff_verifier_failed');

  return {
    artifact_role: 'runtime_health_audit',
    artifact_name: 'runtime_health_audit.json',
    artifact_version: '1.0.0',
    schema_version: '1.0.0',
    layer_id: 'comparative_expansion_layer.stage3_6b_runtime_health_audit',
    layer_version: 'comparative_expansion_layer.stage3_6b_runtime_health_audit.v1',
    estimator_version: 'runtime_health_audit_builder.v1',
    implementation_status: 'runtime_health_audit_defined',
    runtime_health_state: classifyState({ commands: command_results, warnings, blockers }),
    environment: {
      platform: process.platform,
      arch: process.arch,
      node_version: nodeVersion.stdout_excerpt.trim(),
      npm_version: npmVersion.stdout_excerpt.trim(),
      declared_node_engine: '20.x',
      package_lock_present: fs.existsSync(path.join(ROOT, 'package-lock.json'))
    },
    dependency_install: {
      preferred_command: 'npm ci',
      preferred_status: classifyPreferredInstall(preferredInstall),
      fallback_command: fallbackInstall ? 'npm install' : null,
      fallback_status: fallbackInstall
        ? (commandSucceeded(fallbackInstall) ? 'fallback_install_passed' : 'fallback_install_failed')
        : null
    },
    build_status: commandSucceeded(buildResult) ? 'passed' : 'failed',
    test_status: commandSucceeded(testResult) ? 'passed' : 'failed',
    start_local_status: commandSucceeded(startLocalResult) ? 'passed' : 'failed',
    command_results,
    warnings: [...new Set(warnings)],
    blockers,
    non_implications: [
      'Runtime health is not evidence generation.',
      'Runtime health is not collection start.',
      'Runtime health is not adjudication.',
      'Runtime health is not Paper 10 final authorization.'
    ],
    provenance: {
      generated_at: new Date().toISOString(),
      current_lineage: {
        qicn_system_head: sourceHead
      }
    },
    schema_ref: 'src/comparative_program/schemas/runtime_health_audit.v1.json'
  };
};

const main = async () => {
  ensureDir(OUTPUT_RUNTIME);
  ensureDir(STAGE37_DIR);

  const sourceHead = getHeadSha();
  updateExecutionFreezeHead(sourceHead);

  const trackedArtifacts = gitTrackedArtifactPaths();
  const beforeSnapshots = snapshotArtifacts(trackedArtifacts);
  const rebuildResult = rebuildStage3ControlledExecution();
  if (!commandSucceeded(rebuildResult)) {
    throw new Error(rebuildResult.stderr_excerpt || rebuildResult.error || 'Stage3-6 rebuild failed');
  }

  const runtimeHealthAudit = await buildRuntimeHealthAudit({ sourceHead });
  const cleanRoomAudit = await buildCleanRoomAudit({ sourceHead });
  const pathLeakageAudit = buildPathLeakageAudit({ currentHead: sourceHead });
  const artifactRegenerationAudit = buildArtifactRegenerationAudit({
    beforeSnapshots,
    trackedArtifacts,
    currentHead: sourceHead
  });

  writeJson(path.join(OUTPUT_RUNTIME, 'runtime_health_audit.json'), runtimeHealthAudit);
  writeJson(
    path.join(OUTPUT_RUNTIME, 'clean_room_reproducibility_audit.json'),
    cleanRoomAudit
  );
  writeJson(
    path.join(OUTPUT_RUNTIME, 'path_and_local_leakage_audit.json'),
    pathLeakageAudit
  );
  writeJson(
    path.join(OUTPUT_RUNTIME, 'artifact_regeneration_audit.json'),
    artifactRegenerationAudit
  );

  const runtimeModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'comparative_program', 'ComparativeRuntimeUtils.js')
    ).href
  );
  const stage37BuilderModule = await import(
    pathToFileURL(
      path.join(ROOT, 'src', 'comparative_program', 'Stage3_7FirstAdmissibleCollectionGateBuilder.js')
    ).href
  );
  const stage36bBuilderModule = await import(
    pathToFileURL(
      path.join(
        ROOT,
        'src',
        'comparative_program',
        'Stage3_6BRuntimeReproducibilityGateBuilder.js'
      )
    ).href
  );

  const currentLineage = runtimeModule.captureComparativeLineage({
    layerVersion: 'comparative_expansion_layer.stage3_6b_runtime_health_and_stage3_7.v1',
    estimatorVersion: 'build-stage3-runtime-health.cjs',
    extraRefs: {
      runtime_health_audit_policy: {
        ref: 'docs/runtime_health_audit.v1.json',
        sha256: runtimeModule.hashFileRelative('docs/runtime_health_audit.v1.json')
      },
      clean_room_reproducibility_audit_policy: {
        ref: 'docs/clean_room_reproducibility_audit.v1.json',
        sha256: runtimeModule.hashFileRelative('docs/clean_room_reproducibility_audit.v1.json')
      },
      stage3_7_opening_criteria: {
        ref: 'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json',
        sha256: runtimeModule.hashFileRelative(
          'docs/stage3_7_first_admissible_collection_opening_criteria.v1.json'
        )
      }
    }
  });

  const stage3_6_manifest = readJson(path.join(STAGE36_DIR, 'stage3_6_manifest.json'));
  const stage3_6_controlled_execution_gate = readJson(
    path.join(STAGE36_DIR, 'stage3_6_controlled_execution_gate.json')
  );
  const paper10Status = readJson(PAPER10_STATUS_PATH);

  const { stage3_7_opening_gate, first_collection_opening_manifest } =
    stage37BuilderModule.createStage3_7FirstAdmissibleCollectionGateBuilder().build({
      runtimeHealthAudit,
      cleanRoomAudit,
      pathLeakageAudit,
      artifactRegenerationAudit,
      stage3_6_manifest,
      stage3_6_controlled_execution_gate,
      paper10Status,
      currentLineage
    });

  writeJson(path.join(STAGE37_DIR, 'stage3_7_opening_gate.json'), stage3_7_opening_gate);
  writeJson(
    path.join(STAGE37_DIR, 'first_collection_opening_manifest.json'),
    first_collection_opening_manifest
  );

  const stage3_6bGate =
    stage36bBuilderModule.createStage3_6BRuntimeReproducibilityGateBuilder().build({
      runtimeHealthAudit,
      cleanRoomAudit,
      pathLeakageAudit,
      artifactRegenerationAudit,
      paper10Status,
      stage3_7_opening_gate,
      currentLineage
    });
  writeJson(
    path.join(OUTPUT_RUNTIME, 'stage3_6b_runtime_reproducibility_gate.json'),
    stage3_6bGate
  );

  console.log('PASS build-stage3-runtime-health');
  console.log(`  runtime_health_state: ${runtimeHealthAudit.runtime_health_state}`);
  console.log(`  clean_room_state: ${cleanRoomAudit.clean_room_state}`);
  console.log(`  path_leakage_state: ${pathLeakageAudit.path_leakage_state}`);
  console.log(
    `  artifact_regeneration_state: ${artifactRegenerationAudit.artifact_regeneration_state}`
  );
  console.log(`  stage3_7_state: ${stage3_7_opening_gate.stage3_7_state}`);
  console.log(`  stage3_6b_state: ${stage3_6bGate.stage3_6b_state}`);
};

main().catch((error) => {
  console.error(`FAIL build-stage3-runtime-health: ${error.message}`);
  process.exitCode = 1;
});
