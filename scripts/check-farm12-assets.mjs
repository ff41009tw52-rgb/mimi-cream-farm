import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.cwd();
const manifestPath = path.join(root, 'assets/farm12/farm12-assets.js');
const pagePath = path.join(root, '12-1.html');

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(manifestPath, 'utf8'), sandbox, {
  filename: manifestPath
});

const manifest = sandbox.window.FARM12_ASSETS;
if (!manifest || manifest.version < 2) {
  throw new Error('Farm 12 asset manifest is missing or outdated.');
}

const collectPaths = (value, output = []) => {
  if (typeof value === 'string' && value.startsWith('assets/farm12/')) {
    output.push(value);
  } else if (Array.isArray(value)) {
    value.forEach(item => collectPaths(item, output));
  } else if (value && typeof value === 'object') {
    Object.values(value).forEach(item => collectPaths(item, output));
  }
  return output;
};

const html = fs.readFileSync(pagePath, 'utf8');
const pageRefs = [...html.matchAll(/assets\/farm12\/[A-Za-z0-9_./-]+\.(?:webp|png|svg)/g)]
  .map(match => match[0]);
const manifestRefs = collectPaths(manifest);
const references = [...new Set([...manifestRefs, ...pageRefs])].sort();

const errors = [];
const walkAssets = directory => fs.readdirSync(directory, { withFileTypes: true }).flatMap(entry => {
  const target = path.join(directory, entry.name);
  return entry.isDirectory() ? walkAssets(target) : [target];
});
const listed = new Set(manifestRefs);
const inventory = walkAssets(path.join(root, 'assets/farm12'))
  .filter(file => /\.(?:webp|png|svg)$/.test(file))
  .map(file => path.relative(root, file).replaceAll(path.sep, '/'));
for (const asset of inventory) {
  if (!listed.has(asset)) errors.push(`Not listed in manifest: ${asset}`);
}

for (const relativePath of references) {
  const absolutePath = path.join(root, relativePath);
  if (!fs.existsSync(absolutePath)) {
    errors.push(`Missing: ${relativePath}`);
    continue;
  }
  const stats = fs.statSync(absolutePath);
  if (!stats.isFile() || stats.size === 0) errors.push(`Empty: ${relativePath}`);
  if (relativePath.endsWith('.webp')) {
    const signature = fs.readFileSync(absolutePath).subarray(0, 12);
    if (signature.toString('ascii', 0, 4) !== 'RIFF' || signature.toString('ascii', 8, 12) !== 'WEBP') {
      errors.push(`Invalid WebP: ${relativePath}`);
    }
  }
}

if (html.includes("fetch('./12.html") || html.includes('frame.srcdoc')) {
  errors.push('12-1.html is no longer standalone.');
}
if (!html.includes('href="12.html"') || !html.includes('遊玩原版')) {
  errors.push('Original-version link is missing.');
}

if (errors.length) {
  console.error(errors.join('\n'));
  process.exit(1);
}

console.log(`Farm 12 assets OK: ${references.length} referenced files checked.`);
console.log(`Critical preload set: ${manifest.critical.length} files.`);
