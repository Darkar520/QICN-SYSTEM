import fs from 'fs';
import path from 'path';
import assert from 'node:assert/strict';

const file = path.resolve('src/App.jsx');
const content = fs.readFileSync(file, 'utf8');

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
