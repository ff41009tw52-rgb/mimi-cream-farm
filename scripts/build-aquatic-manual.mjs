import { readFile, writeFile } from 'node:fs/promises';

const root = new URL('../google-apps-script/aquatic/', import.meta.url);
const names = ['Constants.gs', 'Auth.gs', 'Setup.gs', 'Store.gs', 'Photos.gs', 'Admin.gs', 'Code.gs'];
const parts = await Promise.all(names.map(async (name) =>
  `// ===== ${name} =====\n${(await readFile(new URL(name, root), 'utf8')).trimEnd()}`
));
await writeFile(new URL('ManualDeploy.gs', root), `${parts.join('\n\n')}\n`);
