import { dataDigest, sealData, verifyData, freezeData } from './contracts.js';
const GENESIS = '0'.repeat(64);
export function createExperimentalChain(captureDigest, protocolDigest, branchId) {
  const records = [];
  let head = dataDigest('qicn.workbench_chain_root.v1', { captureDigest, protocolDigest, branchId, genesis: GENESIS });
  return {
    append(tick, kind, payload) {
      const row = sealData({ schema: 'qicn.workbench_chain_record.v1', captureDigest, protocolDigest, branchId, seq: records.length, tick, kind, payload, prevHash: head });
      records.push(row); head = row.digest; return row;
    },
    snapshot: () => freezeData({ records: [...records], headHash: head })
  };
}
export function verifyExperimentalChain(chain, { captureDigest, protocolDigest, branchId }) {
  let head = dataDigest('qicn.workbench_chain_root.v1', { captureDigest, protocolDigest, branchId, genesis: GENESIS });
  let lastTick = -1;
  if (!chain || !Array.isArray(chain.records) || !chain.records.length) throw new Error('empty_experimental_chain');
  chain.records.forEach((record, seq) => {
    const row = verifyData(record, 'qicn.workbench_chain_record.v1');
    if (row.seq !== seq || row.prevHash !== head || row.branchId !== branchId || row.captureDigest !== captureDigest || row.protocolDigest !== protocolDigest || row.tick < lastTick) throw new Error('experimental_chain_link_mismatch');
    head = record.digest; lastTick = row.tick;
  });
  if (head !== chain.headHash) throw new Error('experimental_chain_head_mismatch');
  return true;
}
