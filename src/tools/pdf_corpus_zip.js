import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';

const ZIP_EPOCH_DATE = 33; // 1980-01-01
const ZIP_EPOCH_TIME = 0;

const crcTable = (() => {
  const table = new Uint32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[n] = c >>> 0;
  }
  return table;
})();

const crc32 = (buf) => {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
};

const sha256File = (p) => createHash('sha256').update(fs.readFileSync(p)).digest('hex');

const localHeader = ({ nameBuf, crc, size }) => {
  const h = Buffer.alloc(30);
  h.writeUInt32LE(0x04034b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(0, 6);
  h.writeUInt16LE(0, 8); // store
  h.writeUInt16LE(ZIP_EPOCH_TIME, 10);
  h.writeUInt16LE(ZIP_EPOCH_DATE, 12);
  h.writeUInt32LE(crc, 14);
  h.writeUInt32LE(size, 18);
  h.writeUInt32LE(size, 22);
  h.writeUInt16LE(nameBuf.length, 26);
  h.writeUInt16LE(0, 28);
  return h;
};

const centralHeader = ({ nameBuf, crc, size, offset }) => {
  const h = Buffer.alloc(46);
  h.writeUInt32LE(0x02014b50, 0);
  h.writeUInt16LE(20, 4);
  h.writeUInt16LE(20, 6);
  h.writeUInt16LE(0, 8);
  h.writeUInt16LE(0, 10);
  h.writeUInt16LE(ZIP_EPOCH_TIME, 12);
  h.writeUInt16LE(ZIP_EPOCH_DATE, 14);
  h.writeUInt32LE(crc, 16);
  h.writeUInt32LE(size, 20);
  h.writeUInt32LE(size, 24);
  h.writeUInt16LE(nameBuf.length, 28);
  h.writeUInt16LE(0, 30);
  h.writeUInt16LE(0, 32);
  h.writeUInt16LE(0, 34);
  h.writeUInt16LE(0, 36);
  h.writeUInt32LE(0, 38);
  h.writeUInt32LE(offset, 42);
  return h;
};

const endCentral = ({ totalEntries, centralSize, centralOffset }) => {
  const h = Buffer.alloc(22);
  h.writeUInt32LE(0x06054b50, 0);
  h.writeUInt16LE(0, 4);
  h.writeUInt16LE(0, 6);
  h.writeUInt16LE(totalEntries, 8);
  h.writeUInt16LE(totalEntries, 10);
  h.writeUInt32LE(centralSize, 12);
  h.writeUInt32LE(centralOffset, 16);
  h.writeUInt16LE(0, 20);
  return h;
};

export const buildDeterministicZip = ({ sourceDir, zipPath }) => {
  const allFiles = [];
  const walk = (dir) => {
    const entries = fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => a.name.localeCompare(b.name));
    for (const e of entries) {
      const full = path.join(dir, e.name);
      if (e.isDirectory()) walk(full);
      else allFiles.push(full);
    }
  };
  walk(sourceDir);
  allFiles.sort((a, b) => path.relative(sourceDir, a).replace(/\\/g, '/').localeCompare(path.relative(sourceDir, b).replace(/\\/g, '/')));

  const buffers = [];
  const centralEntries = [];
  let offset = 0;

  for (const file of allFiles) {
    const data = fs.readFileSync(file);
    const rel = path.relative(sourceDir, file).replace(/\\/g, '/');
    const nameBuf = Buffer.from(rel, 'utf8');
    const crc = crc32(data);
    const size = data.length >>> 0;
    const lh = localHeader({ nameBuf, crc, size });
    buffers.push(lh, nameBuf, data);
    centralEntries.push({ nameBuf, crc, size, offset });
    offset += lh.length + nameBuf.length + data.length;
  }

  const centralStart = offset;
  const centralBuffers = [];
  for (const e of centralEntries) {
    const ch = centralHeader(e);
    centralBuffers.push(ch, e.nameBuf);
    offset += ch.length + e.nameBuf.length;
  }
  const centralSize = offset - centralStart;
  const end = endCentral({ totalEntries: centralEntries.length, centralSize, centralOffset: centralStart });
  const zipBuf = Buffer.concat([...buffers, ...centralBuffers, end]);
  fs.mkdirSync(path.dirname(zipPath), { recursive: true });
  fs.writeFileSync(zipPath, zipBuf);
  return {
    zipPath,
    corpus_zip_sha256: sha256File(zipPath),
    file_count: allFiles.length
  };
};
