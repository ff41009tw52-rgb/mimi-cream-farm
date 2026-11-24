import assert from 'node:assert/strict';
import { readFileSync, existsSync } from 'node:fs';
import test from 'node:test';
import vm from 'node:vm';
import { scenes } from '../learning-games/story/scenes.js';

const root = new URL('../', import.meta.url);
const read = (path) => readFileSync(new URL(path, root), 'utf8');
const context = { window: {} };
vm.runInNewContext(read('assets/learning-worlds/games-data.js'), context);

test('each published language and math entry point opens its own playable briefing', () => {
  const used = new Set();
  for (const games of Object.values(context.window.LEARNING_GAMES)) {
    for (const game of games.filter((game) => game.status === 'published')) {
      const html = read(game.url);
      const mode = html.match(/data-story="([^"]+)"/)?.[1];
      assert.equal(scenes[mode]?.game, game.title, game.url);
      assert.match(html, /src="story\/guide.js"/);
      assert.match(html, /href="story\/guide.css"/);
      used.add(mode);
    }
  }
  // The cooking journal and pizza shop each switch to a second, distinct activity.
  for (const key of ['sensory', 'pizzaPractice']) used.add(key);
  assert.deepEqual(used, new Set(Object.keys(scenes)));
  for (const [key, scene] of Object.entries(scenes)) {
    assert.ok(scene.rules.length && scene.aim && scene.cta && scene.first, key);
    assert.ok(existsSync(new URL('learning-games/' + scene.art, root)), scene.art);
  }
});
