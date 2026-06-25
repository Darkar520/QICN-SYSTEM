import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/components/SimulationEngine.jsx');
// Fase 2: PersistentInfoModal -> InfoModal.jsx; NavigationTabButton -> TabConfig.jsx.
// El test lee el texto combinado (orquestador + componentes extraídos).
const extraSources = [
  'src/components/InfoModal.jsx',
  'src/components/TabConfig.jsx'
];
const content = [file, ...extraSources.map((p) => path.resolve(p))]
  .map((p) => fs.readFileSync(p, 'utf8'))
  .join('\n');

const required = [
  'const PersistentInfoModal =',
  'const NavigationTabButton = React.memo',
  'const [activeInfoModal, setActiveInfoModal] = useState',
  'const openPersistentInfoModal = useCallback',
  'const closePersistentInfoModal = useCallback',
  '<NavigationTabButton',
  '<PersistentInfoModal modal={activeInfoModal} onClose={closePersistentInfoModal} />'
];

for (const token of required) {
  assert.ok(content.includes(token), `Missing token: ${token}`);
}

assert.ok(!content.includes('const TabButton = ({ tabId, icon: Icon, label, subtitle = \'\', compact = false }) => {'), 'Legacy inline TabButton should be removed to avoid remount resets');

console.log('ok info-modal-persistence.v410');
