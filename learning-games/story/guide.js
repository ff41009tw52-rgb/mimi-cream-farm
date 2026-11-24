import { scenes } from './scenes.js';
import { mountDemo } from './demos.js';

const entry = document.body.dataset.story;
const hostHeader = document.querySelector('header');
if (scenes[entry] && hostHeader) mountGuide();

function mountGuide() {
  const visited = new Set();
  const cues = new Map();
  let mode = entry;
  let returning = false;
  const hud = document.createElement('aside');
  hud.className = 'sg-hud';
  hud.setAttribute('aria-label', '遊戲任務與說明');
  hud.innerHTML =
    '<img class="sg-portrait" alt=""><div class="sg-transmission"><b></b><span></span></div><button type="button" class="sg-help" aria-haspopup="dialog">故事與玩法</button>';
  hostHeader.after(hud);
  const help = hud.querySelector('button');

  const dialog = document.createElement('dialog');
  dialog.className = 'sg-dialog';
  dialog.setAttribute('aria-labelledby', 'sg-title');
  dialog.innerHTML = `
    <div class="sg-scroll"><div class="sg-page">
      <div class="sg-visual"><img alt=""><div class="sg-caption"><p></p><h2 id="sg-title" tabindex="-1"></h2></div></div>
      <div class="sg-script">
        <p class="sg-speaker"></p><p class="sg-quote"></p><p class="sg-aim"></p>
        <div class="sg-options" role="group" aria-label="選擇說明內容">
          <button type="button" data-view="demo" aria-controls="sg-demo">動手示範</button>
          <button type="button" data-view="rules" aria-controls="sg-rules">遊戲說明</button>
        </div>
        <section id="sg-demo"><h3></h3><p class="sg-try-hint"></p><div class="sg-sandbox"></div></section>
        <section id="sg-rules" aria-label="遊戲操作步驟" hidden><ol></ol></section>
      </div>
    </div></div>
    <footer class="sg-footer"><a class="sg-back"></a><button type="button" class="sg-enter"></button></footer>`;
  document.body.append(dialog);
  const find = (selector) => dialog.querySelector(selector);
  const windows = { demo: find('#sg-demo'), rules: find('#sg-rules') };
  function page(view) {
    for (const [name, panel] of Object.entries(windows)) {
      panel.hidden = view !== name;
      find('[data-view="' + name + '"]').setAttribute(
        'aria-pressed',
        String(view === name),
      );
    }
  }
  for (const key of dialog.querySelectorAll('[data-view]'))
    key.addEventListener('click', () => page(key.dataset.view));

  function hudText() {
    const scene = scenes[mode];
    hud.dataset.look = scene.look;
    const portrait = hud.querySelector('img');
    if (portrait.getAttribute('src') !== scene.art) portrait.src = scene.art;
    hud.querySelector('b').textContent = scene.speaker;
    hud.querySelector('.sg-transmission span').textContent =
      cues.get(mode) || scene.ready;
  }
  function open(revisit) {
    const scene = scenes[mode];
    returning = revisit;
    dialog.dataset.look = scene.look;
    find('.sg-visual img').src = scene.art;
    find('.sg-caption p').textContent = scene.game;
    find('#sg-title').replaceChildren(
      ...scene.title.map((part) => {
        const group = document.createElement('span');
        group.textContent = part;
        return group;
      }),
    );
    find('.sg-speaker').textContent = scene.speaker;
    find('.sg-quote').textContent = scene.line;
    find('.sg-aim').textContent = scene.aim;
    find('#sg-demo h3').textContent = scene.tryTitle;
    find('.sg-try-hint').textContent = scene.tryHint;
    mountDemo(scene.demo, find('.sg-sandbox'));
    find('#sg-rules ol').replaceChildren(
      ...scene.rules.map(([label, desc]) => {
        const li = document.createElement('li'),
          strong = document.createElement('strong'),
          p = document.createElement('p');
        strong.textContent = label;
        p.textContent = desc;
        li.append(strong, p);
        return li;
      }),
    );
    const back = hostHeader.querySelector('a');
    find('.sg-back').href = back.href;
    find('.sg-back').textContent = back.href.includes('chinese.html')
      ? '回語文故事屋'
      : '回數學遊樂城';
    find('.sg-enter').textContent = revisit ? '繼續這一局' : scene.cta;
    page(revisit ? 'rules' : 'demo');
    if (!dialog.open) dialog.showModal();
    document.documentElement.classList.add('sg-open');
    find('.sg-scroll').scrollTop = 0;
    find('#sg-title').focus({ preventScroll: true });
  }
  dialog.addEventListener('close', () => {
    document.documentElement.classList.remove('sg-open');
    visited.add(mode);
    const focusTarget = returning
      ? help
      : document.querySelector(scenes[mode].first);
    (focusTarget && !focusTarget.disabled && focusTarget.getClientRects().length
      ? focusTarget
      : help
    ).focus({ preventScroll: true });
  });
  find('.sg-enter').addEventListener('click', () => dialog.close());
  help.addEventListener('click', () => open(true));

  window.gameGuide = {
    mode(next) {
      if (!scenes[next] || next === mode) return;
      mode = next;
      hudText();
      if (!visited.has(mode)) open(false);
    },
    cue(modeKey, message) {
      if (!scenes[modeKey]) return;
      if (message) cues.set(modeKey, message);
      else cues.delete(modeKey);
      if (modeKey === mode) hudText();
    },
  };
  // A quick tap on a mode switch can precede a cold module download.
  if (
    entry === 'recipe' &&
    document.querySelector('#sensory-mode')?.getAttribute('aria-pressed') ===
      'true'
  )
    mode = 'sensory';
  if (
    entry === 'delivery' &&
    document.querySelector('#practice-mode')?.getAttribute('aria-pressed') ===
      'true'
  )
    mode = 'pizzaPractice';
  hudText();
  open(false);
}
