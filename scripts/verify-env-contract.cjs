const fs = require('fs');
const path = require('path');

const PROJECT_ROOT = path.resolve(__dirname, '..');
const EXPECTED_NODE_MAJOR = 20;
const REQUIRED_ENV_KEYS = [
  'APP_ENV',
  'NODE_ENV',
  'PORT',
  'AUTH_REQUIRED',
  'INTEGRITY_HMAC_SECRET',
  'QICN_SEED',
  'COGNITIVE_EMERGENCE_EVAL_SEED',
  'SEED',
  'RENDER_DETERMINISTIC',
  'QUANTUM_ENTROPY_ENABLED',
  'QUANTUM_EXPERIMENT_CONDITION'
];
const OPTIONAL_EXTERNAL_KEYS = [
  'GEMINI_API_KEY',
  'OPENAI_API_KEY',
  'IBM_QUANTUM_API_KEY',
  'NETLIFY_TOKEN',
  'NETLIFY_SITE_ID',
  'GITHUB_SELFPATCH_TOKEN'
];

const parseArg = (name, fallback = null) => {
  const hit = process.argv.find((arg) => arg.startsWith(`--${name}=`));
  return hit ? hit.slice(name.length + 3) : fallback;
};

const parseEnvFile = (content) => {
  const parsed = {};
  for (const rawLine of String(content || '').split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;
    const index = line.indexOf('=');
    if (index <= 0) continue;
    parsed[line.slice(0, index).trim()] = line.slice(index + 1).trim();
  }
  return parsed;
};

const ensureDirForFile = (filePath) => {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
};

const isPlaceholderValue = (value) => /^replace_with_/i.test(String(value || ''));

function verifyEnvironmentContract({
  projectRoot = PROJECT_ROOT,
  envExamplePath = path.join(projectRoot, '.env.example'),
  envPath = path.join(projectRoot, '.env'),
  outputPath = path.join(projectRoot, 'artifacts', 'operational_readiness', 'environment_contract_manifest.json')
} = {}) {
  if (!fs.existsSync(envExamplePath)) {
    throw new Error(`Missing env example: ${envExamplePath}`);
  }

  const envExample = parseEnvFile(fs.readFileSync(envExamplePath, 'utf8'));
  const envFilePresent = fs.existsSync(envPath);
  const envFile = envFilePresent ? parseEnvFile(fs.readFileSync(envPath, 'utf8')) : {};
  const nvmrcPath = path.join(projectRoot, '.nvmrc');
  const nvmrcPresent = fs.existsSync(nvmrcPath);
  const nvmrcValue = nvmrcPresent ? fs.readFileSync(nvmrcPath, 'utf8').trim() : null;
  const nodeVersion = process.versions.node;
  const nodeMajor = Number(String(nodeVersion).split('.')[0] || 0);

  const missingRequiredKeys = REQUIRED_ENV_KEYS.filter((key) => !Object.prototype.hasOwnProperty.call(envExample, key));
  const documentedOptionalKeys = OPTIONAL_EXTERNAL_KEYS.filter((key) => Object.prototype.hasOwnProperty.call(envExample, key));
  const placeholderValuesPresent = Object.entries(envFile)
    .filter(([, value]) => isPlaceholderValue(value))
    .map(([key]) => key);

  const manifest = {
    artifact_role: 'environment_contract_manifest',
    project_root: projectRoot,
    expected_node_major: EXPECTED_NODE_MAJOR,
    actual_node_version: nodeVersion,
    actual_node_major: nodeMajor,
    canonical_node_match: nodeMajor === EXPECTED_NODE_MAJOR,
    compatibility_pass: nodeMajor >= EXPECTED_NODE_MAJOR,
    nvmrc_present: nvmrcPresent,
    nvmrc_value: nvmrcValue,
    env_example_path: envExamplePath,
    env_file_present: envFilePresent,
    required_keys_documented: REQUIRED_ENV_KEYS,
    required_keys_missing_in_example: missingRequiredKeys,
    optional_external_keys_documented: documentedOptionalKeys,
    local_env_placeholder_values_detected: placeholderValuesPresent,
    interpretation_boundary: 'Operational environment contract only; not external validation, not theory support, not claim closure.',
    non_claim_restrictions: [
      'Operational readiness does not imply scientific validation.',
      'Deterministic config does not imply causal confirmation.',
      'Configured provider surfaces remain operational dependencies, not evidence.'
    ]
  };

  ensureDirForFile(outputPath);
  fs.writeFileSync(outputPath, `${JSON.stringify(manifest, null, 2)}\n`, 'utf8');

  const ok = nodeMajor === EXPECTED_NODE_MAJOR
    && nvmrcPresent
    && String(nvmrcValue || '').startsWith(String(EXPECTED_NODE_MAJOR))
    && missingRequiredKeys.length === 0;
  const compatible = nodeMajor >= EXPECTED_NODE_MAJOR
    && nvmrcPresent
    && String(nvmrcValue || '').startsWith(String(EXPECTED_NODE_MAJOR))
    && missingRequiredKeys.length === 0;

  return { ok: compatible, canonicalMatch: ok, outputPath, manifest };
}

if (require.main === module) {
  try {
    const projectRoot = path.resolve(parseArg('project-root', PROJECT_ROOT));
    const outputPath = path.resolve(parseArg('output', path.join(projectRoot, 'artifacts', 'operational_readiness', 'environment_contract_manifest.json')));
    const result = verifyEnvironmentContract({ projectRoot, outputPath });
    if (!result.ok) {
      throw new Error(`Environment contract verification failed. Node=${result.manifest.actual_node_version}, missingKeys=${result.manifest.required_keys_missing_in_example.join(',') || 'none'}, nvmrcPresent=${result.manifest.nvmrc_present}`);
    }
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
  } catch (error) {
    console.error(`FAIL verify-env-contract: ${error.message}`);
    process.exit(1);
  }
}

module.exports = {
  verifyEnvironmentContract,
  parseEnvFile
};
