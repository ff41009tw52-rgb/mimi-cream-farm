import { evaluateCircuit } from './circuit.js?v=20261124-repair';
import { routeWire } from './wire-route.js';

const ports = {
  supply: { label: '總開關出口', compId: 'main', pointType: 'out' },
  return: { label: '回到電池', compId: 'battery', pointType: 'neg' },
  aIn: { label: '教室 A 入口', compId: 'switch-a', pointType: 'in' },
  aOut: { label: '教室 A 出口', compId: 'lamp-a', pointType: 'thread' },
  bIn: { label: '教室 B 入口', compId: 'switch-b', pointType: 'in' },
  bOut: { label: '教室 B 出口', compId: 'lamp-b', pointType: 'thread' }
};
const link = (a, left, b, right) => ({
  start: { compId: a, pointType: left },
  end: { compId: b, pointType: right }
});
const builtIn = [
  link('battery', 'pos', 'main', 'in'),
  link('switch-a', 'out', 'lamp-a', 'tip'),
  link('switch-b', 'out', 'lamp-b', 'tip')
];
const checks = [
  { switches: [true, true, true], lamps: [true, true], note: '三個開關都打開時，兩間教室都應該亮。' },
  { switches: [true, true, false], lamps: [true, false], note: '只開教室 A 時，教室 A 要亮，教室 B 要熄。' },
  { switches: [true, false, true], lamps: [false, true], note: '只開教室 B 時，教室 B 要亮，教室 A 要熄。' },
  { switches: [true, false, false], lamps: [false, false], note: '兩個教室開關都關閉時，兩間都應該熄燈。' },
  { switches: [false, true, true], lamps: [false, false], note: '關掉總開關後，即使教室開關還開著，兩間也要熄燈。' }
];
const switchIds = ['main', 'switch-a', 'switch-b'];
const lampIds = ['lamp-a', 'lamp-b'];
const wireColors = ['#ffb25b', '#a9e5e6', '#e9d77f', '#ffc1ab', '#bbcbff', '#f0bce4'];
const simulatedParts = (switches) => [
  { id: 'battery', type: 'battery' },
  ...switchIds.map((id, i) => ({ id, type: 'switch', closed: switches[i] })),
  ...lampIds.map((id) => ({ id, type: 'bulb' }))
];
const portButton = (id, label) => `<button type="button" data-port="${id}" aria-pressed="false" aria-label="${ports[id].label}"><i aria-hidden="true"></i>${label}</button>`;
const switchButton = (i, label) => `<button type="button" data-switch="${i}" aria-pressed="false"><span>${label}</span><strong>關</strong></button>`;

export function mountRepair(root) {
  root.innerHTML = `
    <section class="repair" aria-label="校園夜間巡修">
      <div class="repair-heading">
        <h2>校園夜間巡修</h2>
        <p>先點兩個接點接線，讓教室 A、B 能各自亮燈。關掉總開關時，兩間都要熄燈。</p>
      </div>
      <div class="repair-map">
        <svg class="repair-lines" aria-hidden="true"></svg>
        <div class="repair-power">
          <div class="repair-source">${switchButton(0, '總開關')}${portButton('supply', '電源出口')}</div>
          <div class="repair-source"><span class="repair-battery" aria-hidden="true">＋ −</span>${portButton('return', '回到電池')}</div>
        </div>
        <div class="repair-rooms">
          ${['A', 'B'].map((room, i) => `<section class="repair-room" data-room="${i}" aria-label="教室 ${room}">
            <div class="repair-terminals">${portButton(room.toLowerCase() + 'In', '入口')}${portButton(room.toLowerCase() + 'Out', '出口')}</div>
            <div class="repair-room-head"><h3>教室 ${room}</h3><span class="repair-lamp"><i aria-hidden="true"></i><span class="repair-lamp-state">熄燈</span></span></div>
            ${switchButton(i + 1, '教室開關')}
          </section>`).join('')}
        </div>
      </div>
      <div class="repair-toolbar">
        <button type="button" id="repair-undo" disabled>撤回接線</button>
        <button type="button" id="repair-reset">重置</button>
        <button type="button" id="repair-check">驗收開關</button>
      </div>
      <p class="repair-feedback" role="status" aria-live="polite"></p>
      <ol class="repair-connections" aria-label="目前接線"></ol>
    </section>`;
  const find = (selector) => root.querySelector(selector);
  const map = find('.repair-map');
  const layer = find('.repair-lines');
  const connections = find('.repair-connections');
  const buttons = new Map([...root.querySelectorAll('[data-port]')].map((button) => [button.dataset.port, button]));
  let wires = [];
  let switches = [true, true, true];
  let selected = null;

  function evaluate(configuration = switches) {
    const userWires = wires.map(([start, end]) => ({ start: ports[start], end: ports[end] }));
    const result = evaluateCircuit(simulatedParts(configuration), [...builtIn, ...userWires]);
    return { lamps: lampIds.map((id) => result.litBulbIds.has(id)), short: result.directShort };
  }

  function paint() {
    const rect = map.getBoundingClientRect();
    if (!rect.width) return;
    const centre = (id) => {
      const pin = buttons.get(id).querySelector('i').getBoundingClientRect();
      return {
        x: Math.round(pin.left + pin.width / 2 - rect.left - map.clientLeft),
        y: Math.round(pin.top + pin.height / 2 - rect.top - map.clientTop),
        dx: 0,
        dy: id === 'supply' || id === 'return' ? 1 : -1
      };
    };
    const size = { width: map.clientWidth, height: map.clientHeight };
    const points = new Map(Object.keys(ports).map((id) => [id, centre(id)]));
    const from = Math.max(points.get('supply').y, points.get('return').y) + 18;
    const to = Math.min(...['aIn', 'aOut', 'bIn', 'bOut'].map((id) => points.get(id).y)) - 18;
    layer.innerHTML = wires.map(([start, end], index) => {
      const track = from + (to - from) * ((index % wireColors.length + 1) / (wireColors.length + 1));
      const route = routeWire(points.get(start), points.get(end), size, [], { axis: 'y', track });
      const pathPoints = route.points.map(({ x, y }) => x + ',' + y).join(' ');
      const stroke = wireColors[index % wireColors.length];
      return `<polyline points="${pathPoints}" fill="none" stroke="#14262b" stroke-width="8"/><polyline points="${pathPoints}" fill="none" stroke="${stroke}" stroke-width="4" stroke-dasharray="${index % 2 ? '9 4' : 'none'}"/>`;
    }).join('');
  }

  function draw() {
    const result = evaluate();
    for (const [id, button] of buttons) button.setAttribute('aria-pressed', String(selected === id));
    for (const [i, on] of switches.entries()) {
      const button = find(`[data-switch="${i}"]`);
      button.setAttribute('aria-pressed', String(on));
      button.querySelector('strong').textContent = on ? '開' : '關';
    }
    for (const [i, lit] of result.lamps.entries()) {
      const room = find(`[data-room="${i}"]`);
      room.classList.toggle('is-lit', lit);
      room.querySelector('.repair-lamp-state').textContent = lit ? '亮燈' : '熄燈';
    }
    connections.innerHTML = wires.map(([start, end], i) => `<li style="--wire-color:${wireColors[i % wireColors.length]}"><span>${ports[start].label} → ${ports[end].label}</span><button type="button" data-cut="${i}" aria-label="拆除 ${ports[start].label} 到 ${ports[end].label} 的線">拆線</button></li>`).join('');
    find('#repair-undo').disabled = wires.length === 0;
    paint();
    return result;
  }

  function say(message, state = '') {
    const feedback = find('.repair-feedback');
    feedback.textContent = message;
    feedback.dataset.state = state;
  }

  function showConnectionChange() {
    const result = draw();
    say(result.short
      ? '這組接線讓電流直接回到電池，形成短路。請拆除旁通的線。'
      : `教室 A ${result.lamps[0] ? '亮' : '熄'}，教室 B ${result.lamps[1] ? '亮' : '熄'}。`, result.short ? 'warning' : '');
  }

  function connect(id) {
    if (!selected || selected === id) {
      selected = selected ? null : id;
      draw();
      say(selected ? `已選${ports[id].label}，再點一個接點。` : '已取消選取。');
      return;
    }

    const start = selected;
    selected = null;
    if (wires.some(([a, b]) => (a === start && b === id) || (a === id && b === start))) {
      draw();
      say('這兩個接點已經接在一起。');
      return;
    }
    wires.push([start, id]);
    showConnectionChange();
  }

  function check() {
    selected = null;
    for (const test of checks) {
      const { lamps, short } = evaluate(test.switches);
      if (short || lamps.some((lit, i) => lit !== test.lamps[i])) {
        switches = [...test.switches];
        draw();
        const hint = short ? '這個狀態會短路，請檢查有沒有一條線繞過燈泡。'
          : test === checks[0] ? '目前至少有一間教室沒有完整通路。'
            : '檢查看看兩間教室能不能分開形成通路。';
        say(`驗收已切到這個狀態。${test.note}${hint}`, 'warning');
        return;
      }
    }
    draw();
    say('五種開關狀態都通過。兩間教室各有一條通路，教室開關只控制自己的支路，總開關接在兩條支路共用的路徑上。', 'complete');
  }

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { port, switch: switchNumber, cut } = button.dataset;
    if (port) {
      connect(port);
    } else if (switchNumber !== undefined) {
      const index = Number(switchNumber);
      switches[index] = !switches[index];
      selected = null;
      showConnectionChange();
    } else if (cut !== undefined || button.id === 'repair-undo') {
      wires.splice(cut === undefined ? -1 : Number(cut), 1);
      selected = null;
      showConnectionChange();
      if (cut !== undefined) find('#repair-undo:not(:disabled), #repair-reset').focus();
    } else if (button.id === 'repair-reset') {
      wires = [];
      selected = null;
      switches = [true, true, true];
      draw();
      say('接線已清空。');
    } else if (button.id === 'repair-check') {
      check();
    }
  });

  new ResizeObserver(paint).observe(map);
  draw();
}
