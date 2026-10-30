import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

// Exercise the real frontend through its form and retry button, without an AI key.
class Element {
  constructor(tag) {
    this.tagName = tag;
    this.children = [];
    this.dataset = {};
    this.style = {};
    this.listeners = {};
    this.attributes = {};
    this.value = '';
    this.className = '';
    this.ownText = '';
    this.classList = { toggle() {}, contains() { return false; } };
  }
  set textContent(value) { this.ownText = value; this.children = []; }
  get textContent() { return this.ownText + this.children.map((child) => child.textContent).join(''); }
  append(...children) { children.forEach((child) => this.appendChild(child)); }
  appendChild(child) { child.parent = this; this.children.push(child); return child; }
  replaceChildren(...children) { this.children = []; this.append(...children); }
  remove() { this.parent.children = this.parent.children.filter((child) => child !== this); }
  setAttribute(key, value) { this.attributes[key] = value; }
  addEventListener(type, fn) { this.listeners[type] = fn; }
  closest() { return this; }
  focus() {}
  querySelector(selector) { return find(this, (element) => element.tagName === selector); }
}
function find(root, predicate) {
  if (predicate(root)) return root;
  for (const child of root.children) {
    const result = find(child, predicate);
    if (result) return result;
  }
  return null;
}
const script = fs.readFileSync('ai-assistant/ai-assistant.js', 'utf8');
const configScript = fs.readFileSync('ai-assistant/ai-assistant-config.js', 'utf8');
const engineScript = fs.readFileSync('ai-assistant/assistant-engine.js', 'utf8');
const flush = async () => { for (let i = 0; i < 12; i++) await new Promise(setImmediate); };

async function setup(post) {
  const body = new Element('body');
  const document = {
    body,
    createElement: (tag) => new Element(tag),
    createTextNode: (text) => { const node = new Element('#text'); node.textContent = text; return node; },
    addEventListener() {},
    querySelector: () => null
  };
  const requests = [];
  const window = {
    fetch: async (url, options = {}) => {
      if (options.method === 'POST') {
        requests.push(JSON.parse(options.body));
        return post(requests.length, options);
      }
      return new Response(JSON.stringify(String(url).includes('knowledge/index') ? { datasets: [] } : { games: [] }));
    },
    setTimeout: (fn, delay) => { if (delay < 3000) queueMicrotask(fn); return 1; },
    clearTimeout() {}
  };
  const context = vm.createContext({ window, document, console: { warn() {}, error() {} }, AbortController, TypeError });
  vm.runInContext(configScript, context);
  vm.runInContext(engineScript, context);
  vm.runInContext(script, context);
  await flush();
  const byClass = (name) => find(body, (element) => element.className.split(' ').includes(name));
  const gradeGrid = byClass('assistant-grade-grid');
  gradeGrid.listeners.click({ target: gradeGrid.children[0] });
  const form = byClass('assistant-compose');
  const input = form.children[0];
  const ask = async (question) => {
    input.value = question;
    form.listeners.submit({ preventDefault() {} });
    await flush();
  };
  const lastReply = () => byClass('assistant-messages').children.at(-1).textContent;
  return { ask, byClass, lastReply, requests };
}

const failures = [
  ['AI_NETWORK', () => { throw new TypeError('Failed to fetch'); }],
  ['AI_TIMEOUT', () => { const error = new Error('aborted'); error.name = 'AbortError'; throw error; }],
  ['AI_HTTP_429', () => new Response('{}', { status: 429 })],
  ['AI_HTTP_502', () => new Response(JSON.stringify({ detail: 'private upstream detail' }), { status: 502 })],
  ['AI_RESPONSE', () => new Response('<html>unexpected response</html>', { status: 200 })]
];
for (const [code, fail] of failures) {
  const app = await setup((count) => count === 1 ? fail() : new Response(JSON.stringify({ ok: true, reply: '陽光進入小水滴，經過折射和反射形成彩虹。' })));
  await app.ask('彩虹怎麼來的');
  assert.ok(app.lastReply().includes('連線代碼：' + code), code);
  assert.ok(!app.lastReply().includes('private upstream detail'));
  const retry = app.byClass('assistant-message__action');
  assert.equal(retry.textContent, '再試一次');
  retry.listeners.click();
  await flush();
  assert.equal(app.requests.length, 2);
  assert.equal(app.requests[1].message, '彩虹怎麼來的');
  assert.deepEqual(app.requests[1].history, [], 'failed answers must not enter AI history');
  assert.ok(app.lastReply().includes('折射和反射'));
  assert.equal(app.byClass('assistant-typing'), null, 'typing indicator is removed');
}

const guarded = await setup(() => new Response(JSON.stringify({ blocked: true, policy: 'off_topic', reply: '請問自然科學相關問題。' }), { status: 400 }));
await guarded.ask('彩虹怎麼來的');
assert.ok(guarded.lastReply().includes('請問自然科學相關問題'));
assert.equal(guarded.byClass('assistant-message__action'), null, 'guard replies must not become network errors');
console.log('Assistant connection tests passed: network, timeout, 429, 502, invalid payload, retry, history, guard.');
