const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const dataCode = fs.readFileSync(path.join(root, 'assets/learning-worlds/games-data.js'), 'utf8');
const renderer = fs.readFileSync(path.join(root, 'assets/learning-worlds/home.js'), 'utf8');
class Element {
  constructor(tag = 'div') { this.tagName = tag; this.children = []; this.dataset = {}; this.attrs = {}; this.events = {}; this.textContent = ''; this.hidden = false; }
  append(...nodes) { this.children.push(...nodes); }
  replaceChildren(...nodes) { this.children = nodes; }
  setAttribute(k, v) { this.attrs[k] = v; }
  addEventListener(k, v) { this.events[k] = v; }
  focus() { this.focused = true; }
}
function run(subject, data) {
  const ids = Object.fromEntries(['all-games','featured-games','empty-state','featured-empty','empty-title','filter-status','game-count','show-all'].map(id => [id, new Element()]));
  const buttons = ['all','3','4','5','6'].map(grade => { const b = new Element('button'); b.dataset.grade = grade; return b; });
  const navs = [new Element('nav'), new Element('nav')];
  const document = { body: { dataset: { subject } }, baseURI: `https://example.org/farm/${subject}.html`, createElement: tag => new Element(tag), getElementById: id => ids[id], querySelectorAll: selector => selector === '[data-world-nav]' ? navs : buttons };
  const ctx = { window: {}, document, URL };
  vm.runInNewContext(dataCode, ctx);
  if (data) ctx.window.LEARNING_GAMES = { [subject]: data };
  vm.runInNewContext(renderer, ctx);
  return { ids, buttons, navs, games: ctx.window.LEARNING_GAMES[subject] };
}
const descendants = node => node.children.flatMap(n => [n, ...descendants(n)]);
for (const [subject, count, playable] of [
  ['chinese', 6, ['kitchen', 'characters']],
  ['math', 7, ['angles', 'pizza']]
]) {
  const {ids, buttons, navs, games} = run(subject);
  assert.equal(games.length, count);
  assert.equal(new Set(games.map(g => g.id)).size, count);
  for (const g of games) {
    for (const field of ['id','title','grades','topic','description','icon','cover','url','status','order','publishedAt','featured']) assert.ok(field in g, field);
    if (g.status === 'coming-soon') assert.equal(g.url, '');
  }
  assert.equal(ids['all-games'].children.length, count);
  assert.equal(ids['featured-games'].children.length, 2);
  const links = descendants(ids['all-games']).filter(n => n.tagName === 'a');
  assert.deepEqual(links.map(n => n.href), playable.map(game => `https://example.org/farm/learning-games/${game}.html`));
  for (const game of playable) assert.ok(fs.existsSync(path.join(root, 'learning-games', `${game}.html`)));
  assert.equal(ids['filter-status'].textContent, `全部年級｜${playable.length} 款可以玩、${count - playable.length} 款準備中`);
  for (const grade of ['3','5','6']) {
    buttons.find(b => b.dataset.grade === grade).events.click();
    assert.equal(ids['all-games'].children.length, 0);
    assert.equal(ids['empty-state'].hidden, false);
    assert.equal(ids['featured-empty'].hidden, false);
    assert.equal(buttons.filter(b => b.attrs['aria-pressed'] === 'true').length, 1);
  }
  ids['show-all'].events.click();
  assert.equal(ids['all-games'].children.length, count); assert.ok(buttons[0].focused);
  buttons.find(b => b.dataset.grade === '4').events.click();
  assert.equal(ids['all-games'].children.length, count);
  for (const nav of navs) {
    assert.deepEqual(nav.children.map(n => n.href), ['index.html','chinese.html','math.html']);
    assert.equal(nav.children.filter(n => n.attrs['aria-current'] === 'page').length, 1);
  }
  const html = fs.readFileSync(path.join(root, `${subject}.html`), 'utf8');
  for (const match of html.matchAll(/(?:src|href)="([^"#]+)"/g)) assert.ok(fs.existsSync(path.join(root, match[1])), `missing ${match[1]}`);
  assert.equal((html.match(/href="about.html"/g)||[]).length, 2);
  assert.ok(!/localStorage|sessionStorage/.test(renderer));
}
// Future publication: newest live games first, coming-soon never linked,
// hidden entries omitted, and invalid URLs never become play buttons.
const seed = run('chinese').games.find(game => game.status === 'coming-soon');
const mock = (id, overrides) => ({...seed, id, ...overrides});
const future = run('chinese', [
  mock('soon', {order: 0}),
  mock('older', {status: 'published',url:'older.html',publishedAt:'2026-10-01'}),
  mock('newest', {status: 'published',url:'new.html',publishedAt:'2026-11-09'}),
  mock('hidden', {status:'hidden'}),
  mock('unsafe', {status:'published',url:'javascript:alert(1)'}),
  mock('missing-url', {status:'published',url:''})
]);
assert.deepEqual(future.ids['all-games'].children.slice(0, 2).map(n=>n.dataset.gameId), ['newest','older']);
assert.equal(future.ids['all-games'].children.length, 5);
assert.equal(descendants(future.ids['all-games']).filter(n => n.tagName === 'a').length, 2);
assert.equal(descendants(future.ids['all-games']).find(n => n.tagName === 'a').href, 'https://example.org/farm/new.html');
const science = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
assert.doesNotMatch(science, /learning-worlds\/(?:home\.(?:js|css)|games-data\.js)/);
console.log('PASS: 13 cards, 4 playable games, every grade, empty/reset states, navigation, assets and safe links.');
