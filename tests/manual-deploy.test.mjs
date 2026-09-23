import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../google-apps-script/aquatic/', import.meta.url);
const names = ['Constants.gs', 'Auth.gs', 'Setup.gs', 'Store.gs', 'Photos.gs', 'Admin.gs', 'Code.gs'];
const parts = await Promise.all(names.map(async (name) =>
  `// ===== ${name} =====\n${(await readFile(new URL(name, root), 'utf8')).trimEnd()}`
));
const manual = await readFile(new URL('ManualDeploy.gs', root), 'utf8');
assert.equal(manual, `${parts.join('\n\n')}\n`, '人工部署整合版必須與各模組完全一致');
console.log('Aquatic manual deployment bundle is in sync.');
