import fs from 'fs';

const readJson = (relativePath) => JSON.parse(fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8'));

export const CROSS_SUBSTRATE_TRANSPORT_PROTOCOL = Object.freeze(
  readJson('../../docs/cross_substrate_transport_protocol.v1.json')
);

export const listTransportClasses = () => [
  ...(CROSS_SUBSTRATE_TRANSPORT_PROTOCOL.transport_classes || [])
];

export default {
  CROSS_SUBSTRATE_TRANSPORT_PROTOCOL,
  listTransportClasses
};
