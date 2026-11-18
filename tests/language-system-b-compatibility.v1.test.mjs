import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { prepareTurn, normalizeContract, finalizeTurn } from '../src/language/conversationEngine.js';
import { makeSnapshot, makeLedger } from './fixtures/languageFixtures.mjs';
import { prepareEvidential, evidentialReply } from './fixtures/evidentialFixtures.mjs';
import { withGlobalTraps } from './lib/workbench-fixtures.mjs';

const base='5dfddd5b2b101865621c4d10f8177ff260b8813b';
for(const file of ['src/language/freeRealization.js','src/language/realizationContract.js','src/language/runtimeSnapshot.js','tests/language-grounded-conversation.v2.test.mjs','tests/language-semantic-contract.v3.test.mjs','tests/language-free-contract.v4.test.mjs','scripts/run-historical-dependence-ablation.mjs','config/language/system-b-preregister.v1.json','config/workbench/preregister.v1.json']) {
  const prior=execFileSync('git',['show',`${base}:${file}`],{encoding:'utf8',windowsHide:true});
  assert.equal(fs.readFileSync(file,'utf8').replace(/\r\n/g,'\n'),prior.replace(/\r\n/g,'\n'),`frozen contract/default changed: ${file}`);
}
const snapshot=makeSnapshot();
assert.equal(prepareTurn({question:'¿Qué es CCC?',snapshot}).contract,'verified','legacy helper default changed');
assert.equal(prepareTurn({question:'¿Qué es CCC?',snapshot,contract:'free'}).contract,'free','chat v4 contract changed');
assert.equal(normalizeContract('unknown'),'verified');
for(const contract of ['evidential','v5','qicn.language_realization.v5'])assert.equal(prepareEvidential({contract}).contract,'evidential');
assert.equal(prepareEvidential().snapshotId,snapshot.digest,'v5 must bind all 64 digest characters');
// The registry's transitive imports must never pull an executor or core into
// the language layer. Constructor defaults in inert data codecs are not called.
const visited=new Set();
function inspect(file) {
  file=path.resolve(file);if(visited.has(file))return;visited.add(file);
  assert.ok(!/[/\\](?:simulation|workers)[/\\]|HeadlessRuntimeSession|SimulationCycleDriver|[/\\]workbench[/\\](?:runner|restore)\.js$/.test(file),`language registry imports execution capability: ${file}`);
  const source=fs.readFileSync(file,'utf8');
  for(const match of source.matchAll(/(?:from\s+|import\s*)['"]([^'"]+)['"]/g))if(match[1].startsWith('.'))inspect(path.resolve(path.dirname(file),match[1]));
}
inspect('src/language/evidential/evidenceRegistry.js');
const {ledger}=makeLedger(),before=JSON.stringify(ledger.data);
let writes=0;
for(const method of ['record','heartbeat','observeTick','markStateOrigin','_persist'])ledger[method]=()=>{writes++;throw new Error('language attempted ledger write');};
const mutableSnapshot=structuredClone(snapshot),priorSnapshot=JSON.stringify(mutableSnapshot);
await withGlobalTraps(async()=>{
  const prepared=prepareEvidential({snapshot:mutableSnapshot,ledger});
  const reply=evidentialReply(prepared);
  assert.equal(finalizeTurn(prepared,{mode:'gemini',modelText:JSON.stringify(reply)}).trace.route,'gemini_evidential_checked');
  assert.equal(Object.isExtensible(mutableSnapshot),true);
  assert.equal(Object.isExtensible(ledger.data),true);
  assert.equal(Object.isExtensible(ledger.data.events),true);
});
assert.equal(writes,0);assert.equal(JSON.stringify(ledger.data),before);assert.equal(JSON.stringify(mutableSnapshot),priorSnapshot);
console.log('OK: frozen v2/v3(87)/v4(95), API/helper and chat defaults, v1/legacy/B4 surfaces intact; explicit v5 only; evidence registry has no executor dependency');
console.log('OK: v5 preparation/publication consumes no global clock/RNG/network/timers, writes no ledger and does not freeze/mutate caller data');
