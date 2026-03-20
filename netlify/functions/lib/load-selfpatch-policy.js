import fs from 'node:fs';
import path from 'node:path';

const resolvePolicyPath = () => {
  const candidates = [
    path.resolve(process.cwd(), 'netlify', 'functions', 'lib', 'selfpatch-policy.json'),
    path.resolve(process.cwd(), 'selfpatch-policy.json')
  ];
  const existing = candidates.find((candidate) => fs.existsSync(candidate));
  return existing || candidates[0];
};

const policyPath = resolvePolicyPath();

export const loadSelfPatchPolicy = () => {
  const raw = fs.readFileSync(policyPath, 'utf8');
  return JSON.parse(raw);
};

export const selfPatchPolicy = loadSelfPatchPolicy();

export default selfPatchPolicy;
