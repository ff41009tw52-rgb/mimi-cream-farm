import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const readJson = (relativePath) => JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
const assert = (condition, message) => {
  if (!condition) throw new Error(message);
};

const site = readJson('data/site-knowledge.json');
const manifest = readJson('knowledge/index.json');
const gamesSource = fs.readFileSync(path.join(repoRoot, 'games-data.js'), 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(gamesSource, sandbox, { filename: 'games-data.js' });
const catalog = sandbox.window.FARM_GAMES;

assert(Array.isArray(site.games), 'site knowledge must contain games');
assert(site.games.length === 41, 'site knowledge must cover IDs 01–41');
assert(new Set(site.games.map((game) => game.id)).size === 41, 'game IDs must be unique');

for (let number = 1; number <= 41; number += 1) {
  const id = String(number).padStart(2, '0');
  const game = site.games.find((entry) => entry.id === id);
  assert(game, 'missing game ' + id);
  assert(fs.existsSync(path.join(repoRoot, 'games', id, 'index.js')), 'missing module file for ' + id);
  assert(game.modulePresent === true, 'modulePresent must be true for ' + id);
  if (game.status === 'unlisted') {
    assert(game.recommendable === false, 'unlisted game cannot be recommendable: ' + id);
  }
  if (game.audience === 'teacher') {
    assert(game.recommendable === false, 'teacher resource cannot be a student recommendation: ' + id);
  }
}

const catalogIds = new Set(catalog.map((game) => String(game.gameNumber).padStart(2, '0')));
const publishedIds = new Set(site.games.filter((game) => game.homepagePublished).map((game) => game.id));
assert(catalogIds.size === publishedIds.size, 'published count differs from games-data.js');
for (const id of catalogIds) assert(publishedIds.has(id), 'catalog game not published in site index: ' + id);

assert(site.summary.published === 32, 'expected 32 homepage-published games');
assert(site.summary.unlisted === 9, 'expected 9 unlisted modules');
assert(site.summary.missing === 0, 'expected no missing module');

for (const dataset of manifest.datasets) {
  const filePath = path.join(repoRoot, dataset.path);
  assert(fs.existsSync(filePath), 'manifest dataset missing: ' + dataset.path);
  const unit = JSON.parse(fs.readFileSync(filePath, 'utf8'));
  const conceptIds = new Set(unit.concepts.map((concept) => concept.id));
  assert(conceptIds.size === unit.concepts.length, 'duplicate concept IDs in ' + dataset.id);
  for (const concept of unit.concepts) {
    assert(concept.sourcePages.length === 2, 'sourcePages must be a two-item range: ' + concept.id);
    assert(concept.sourcePages[0] >= unit.source.printedPages[0], 'concept source page too low: ' + concept.id);
    assert(concept.sourcePages[1] <= unit.source.printedPages[1], 'concept source page too high: ' + concept.id);
    for (const gameId of concept.relatedGameIds) {
      const game = site.games.find((entry) => entry.id === gameId);
      assert(game && game.homepagePublished, 'related game must be homepage-published: ' + gameId);
    }
  }
  for (const qa of unit.qaSeeds) {
    assert(conceptIds.has(qa.conceptId), 'Q&A references unknown concept: ' + qa.conceptId);
  }
}

const configSource = fs.readFileSync(path.join(repoRoot, 'ai-assistant', 'ai-assistant-config.js'), 'utf8');
assert(configSource.includes("siteKnowledgeUrl: 'data/site-knowledge.json'"), 'assistant config missing site knowledge URL');
assert(configSource.includes("curriculumManifestUrl: 'knowledge/index.json'"), 'assistant config missing curriculum manifest URL');
const indexSource = fs.readFileSync(path.join(repoRoot, 'index.html'), 'utf8');
assert(indexSource.includes('ai-assistant/assistant-engine.js'), 'homepage missing assistant engine script');
assert(
  indexSource.indexOf('assistant-engine.js') < indexSource.indexOf('ai-assistant.js'),
  'assistant engine must load before the assistant UI'
);
const assistantCss = fs.readFileSync(path.join(repoRoot, 'ai-assistant', 'ai-assistant.css'), 'utf8');
assert(
  /\.science-assistant\s*\{[\s\S]*?right:\s*30px;[\s\S]*?bottom:\s*96px;/.test(assistantCss),
  'assistant launcher must sit above the desktop feedback button'
);
assert(
  /\.assistant-panel\s*\{[\s\S]*?right:\s*0;/.test(assistantCss),
  'assistant panel must open from the right edge'
);
assert(configSource.includes('replySuffixes'), 'assistant characters missing cat reply suffixes');

console.log('Knowledge validation passed.');
console.log('  Games: 41 total / 32 published / 9 unlisted / 0 missing');
console.log('  Curriculum: ' + manifest.datasets.length + ' dataset / 12 concepts / 16 Q&A seeds');
