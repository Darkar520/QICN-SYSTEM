import fs from 'fs';
import path from 'path';

const file = path.resolve('src/index.jsx');
const content = fs.readFileSync(file, 'utf8');

if (!content.includes('const primaryTabs = [')) throw new Error('primaryTabs definition missing');
if (!content.includes('const moreTabs = [')) throw new Error('moreTabs definition missing');
if (!content.includes("{isMoreMenuOpen ? 'Cerrar' : 'Mas'}")) throw new Error('Mas toggle not found');
if (!content.includes('Top 5 operativo + menu Mas')) throw new Error('Top 5 menu copy missing');
if (content.includes('Herramientas avanzadas')) throw new Error('Legacy advanced tools label still present');

console.log('ok ui-navigation-top5-more.v47');
