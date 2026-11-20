import { evaluateCircuit } from './circuit.js';

const LABELS = {
  battery: '電池',
  bulb: '燈泡',
  pos: '正極',
  neg: '負極',
  tip: '底部接點',
  thread: '螺紋接點'
};
// The wire ends and the centres of the tappable marks share the metal contacts.
const POINTS = {
  battery: { pos: [-74, 0], neg: [70, 0] },
  bulb: { tip: [0, 50], thread: [-18, 16] }
};
const samePoint = (a, b) => a?.compId === b?.compId && a?.pointType === b?.pointType;
const boardState = () => ({
  components: ['battery', 'bulb'].map((type) => ({ id: type + '-1', type, number: 1, slot: type === 'battery' ? 0 : 1, rotation: 0 })),
  wires: [],
  nextId: 2,
  powered: false,
  sawLight: false
});

export function mount(root, context = {}) {
  root.innerHTML = `
    <link rel="stylesheet" href="${new URL('./style.css?v=20261120-contacts', import.meta.url).href}">
    <div class="circuit-game">
      <header class="circuit-header">
        <h1>奇妙的電路實驗</h1>
        <a class="circuit-home">回農場</a>
      </header>
      <div class="circuit-modes" role="group" aria-label="實驗模式">
        <button type="button" data-mode="guided" aria-pressed="true">跟著做</button>
        <button type="button" data-mode="free" aria-pressed="false">自由實驗</button>
      </div>
      <div class="circuit-guide">
        <p class="circuit-instruction"></p>
        <button type="button" class="circuit-next" hidden>進入自由實驗</button>
      </div>
      <div class="circuit-toolbar" role="group" aria-label="電路工具">
        <button type="button" data-tool="battery" hidden>＋ <span>電池</span></button>
        <button type="button" data-tool="bulb" hidden>＋ <span>燈泡</span></button>
        <button type="button" data-tool="aux" aria-pressed="true">接點標記</button>
        <button type="button" data-tool="reset">重置</button>
        <button type="button" data-tool="power" aria-pressed="false">開啟電源</button>
      </div>
      <div class="circuit-board" role="group" aria-label="接線區">
        <canvas aria-hidden="true"></canvas>
        <div class="circuit-bends"></div>
        <div class="circuit-parts"></div>
      </div>
      <p class="circuit-status" role="status"></p>
      <div class="circuit-wires" aria-label="已接的電線"></div>
    </div>`;

  const find = (selector) => root.querySelector(selector);
  const board = find('.circuit-board');
  const parts = find('.circuit-parts');
  const bends = find('.circuit-bends');
  const canvas = find('canvas');
  const ctx = canvas.getContext('2d');
  const powerButton = find('[data-tool="power"]');
  const status = find('.circuit-status');
  const instruction = find('.circuit-instruction');
  find('.circuit-home').href = context.homeUrl || new URL('../../index.html', import.meta.url).href;

  const boards = { guided: boardState(), free: boardState() };
  let mode = 'guided';
  let state = boards.guided;
  let selected = null;
  let drag = null;
  let preview = null;
  let showAux = true;
  let power = new Map();
  let elementById = new Map();
  let bendById = new Map();

  const componentFor = (id) => state.components.find((component) => component.id === id);
  const endpointName = ({ compId, pointType }) => {
    const { type, number } = componentFor(compId);
    const count = state.components.filter((item) => item.type === type).length;
    return LABELS[type] + (mode === 'free' || count > 1 ? number : '') + LABELS[pointType];
  };

  const clamp = (value, size, part) => {
    const margin = Math.min(part.type === 'battery' ? 100 : 80, size / 2);
    return Math.max(margin, Math.min(value, size - margin));
  };
  const columns = () => Math.max(1, Math.floor(board.clientWidth / 196));

  function resizeBoard() {
    if (!board.clientWidth) return;
    const perRow = columns();
    const slotCount = Math.max(0, ...state.components.map(({ slot }) => slot + 1));
    board.style.minHeight = Math.max(272, Math.ceil(slotCount / perRow) * 150 + 44) + 'px';
    const width = board.clientWidth;
    const height = board.clientHeight;
    const rearrange = state.columns !== undefined && state.columns !== perRow;
    state.columns = perRow;
    for (const component of state.components) {
      const column = component.slot % perRow;
      const row = Math.floor(component.slot / perRow);
      const initialX = mode === 'guided' && perRow > 1
        ? width * (component.type === 'battery' ? 0.27 : 0.73)
        : width * (column + 0.5) / perRow;
      const initialY = row === 0 ? 125 : 105 + row * 150;
      component.x = clamp(rearrange ? initialX : (component.x ?? initialX), width, component);
      component.y = clamp(rearrange ? initialY : (component.y ?? initialY), height, component);
    }

    const ratio = Math.min(2, window.devicePixelRatio || 1);
    if (canvas.width !== Math.round(width * ratio) || canvas.height !== Math.round(height * ratio)) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
    }
    ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
    paint();
  }

  function pointFor(endpoint) {
    const component = componentFor(endpoint.compId);
    const [x, y] = POINTS[component.type][endpoint.pointType];
    const angle = component.rotation * Math.PI / 180;
    return {
      x: component.x + x * Math.cos(angle) - y * Math.sin(angle),
      y: component.y + x * Math.sin(angle) + y * Math.cos(angle)
    };
  }

  function wireControl(wire, a, b) {
    return {
      x: (a.x + b.x) / 2 + wire.bendX,
      y: (a.y + b.y) / 2 + wire.bendY
    };
  }

  function drawWire(a, b, control, temporary = false) {
    ctx.beginPath();
    ctx.moveTo(a.x, a.y);
    ctx.quadraticCurveTo(control.x, control.y, b.x, b.y);
    ctx.strokeStyle = temporary ? '#a94812' : '#fff8e8';
    ctx.lineWidth = temporary ? 4 : 8;
    ctx.lineCap = 'round';
    ctx.setLineDash(temporary ? [6, 6] : []);
    ctx.stroke();
    if (!temporary) {
      ctx.strokeStyle = '#38434a';
      ctx.lineWidth = 4;
      ctx.stroke();
    }
    ctx.setLineDash([]);
  }

  function paint() {
    if (!board.clientWidth) return;
    ctx.clearRect(0, 0, board.clientWidth, board.clientHeight);
    for (const wire of state.wires) {
      const a = pointFor(wire.start);
      const b = pointFor(wire.end);
      const control = wireControl(wire, a, b);
      drawWire(a, b, control);
      const handle = bendById.get(wire.id);
      handle.style.left = (a.x + 2 * control.x + b.x) / 4 + 'px';
      handle.style.top = (a.y + 2 * control.y + b.y) / 4 + 'px';
    }
    if (preview && selected) {
      const a = pointFor(selected);
      drawWire(a, preview, wireControl({ bendX: 0, bendY: 18 }, a, preview), true);
    }
    for (const component of state.components) {
      const entry = elementById.get(component.id);
      entry.style.left = component.x + 'px';
      entry.style.top = component.y + 'px';
      entry.style.setProperty('--part-angle', component.rotation + 'deg');
      const relativePower = state.powered ? power.get(component.id) || 0 : 0;
      entry.classList.toggle('is-lit', relativePower > 0);
      entry.style.setProperty('--glow', relativePower ? Math.min(1, 0.25 + 0.38 * Math.sqrt(relativePower)) : 0);
      entry.style.setProperty('--halo', relativePower ? Math.min(64, 10 + 15 * Math.sqrt(relativePower)) + 'px' : '0px');
      for (const terminal of entry.querySelectorAll('[data-point-type]')) {
        terminal.setAttribute('aria-pressed', String(samePoint(selected, terminal.dataset)));
      }
    }
  }

  function renderParts() {
    elementById = new Map();
    bendById = new Map();
    parts.replaceChildren();
    bends.replaceChildren();
    for (const component of state.components) {
      const element = document.createElement('div');
      element.className = 'circuit-component circuit-component--' + component.type;
      const title = LABELS[component.type] + (mode === 'free' ? component.number : '');
      element.innerHTML = component.type === 'battery'
        ? '<div class="circuit-part-shape circuit-battery"><div class="circuit-battery-face"><span>＋</span><span class="circuit-battery-bars"></span><span>−</span></div><span class="circuit-battery-negative"></span></div>'
        : '<div class="circuit-part-shape circuit-lamp"><div class="circuit-glass"></div><div class="circuit-thread"></div><div class="circuit-tip"></div></div>';
      const shape = element.firstElementChild;
      shape.dataset.movePart = component.id;
      shape.setAttribute('aria-hidden', 'true');
      if (mode === 'free') {
        const rotate = document.createElement('button');
        rotate.type = 'button';
        rotate.className = 'circuit-rotate';
        rotate.dataset.rotatePart = component.id;
        rotate.textContent = '↻';
        rotate.setAttribute('aria-label', '旋轉' + title);
        element.appendChild(rotate);

        const remove = document.createElement('button');
        remove.type = 'button';
        remove.className = 'circuit-remove-part';
        remove.dataset.removePart = component.id;
        remove.textContent = '×';
        remove.setAttribute('aria-label', '移除' + title);
        element.appendChild(remove);
      }
      for (const [pointType, [x, y]] of Object.entries(POINTS[component.type])) {
        const terminal = document.createElement('button');
        terminal.type = 'button';
        terminal.className = 'circuit-terminal circuit-terminal--' + pointType;
        terminal.dataset.compId = component.id;
        terminal.dataset.pointType = pointType;
        terminal.style.setProperty('--point-x', x + 'px');
        terminal.style.setProperty('--point-y', y + 'px');
        terminal.setAttribute('aria-label', title + LABELS[pointType]);
        terminal.title = title + LABELS[pointType];
        terminal.textContent = { pos: '＋', neg: '−', tip: '底', thread: '側' }[pointType];
        element.appendChild(terminal);
      }
      const caption = document.createElement('span');
      caption.className = 'circuit-part-label';
      caption.textContent = title;
      element.appendChild(caption);
      elementById.set(component.id, element);
      parts.appendChild(element);
    }
    for (const wire of state.wires) {
      const handle = document.createElement('div');
      handle.className = 'circuit-bend';
      handle.dataset.bendWire = wire.id;
      handle.title = '拖曳調整電線的彎曲';
      handle.setAttribute('aria-hidden', 'true');
      bends.appendChild(handle);
      bendById.set(wire.id, handle);
    }

    const wires = find('.circuit-wires');
    wires.replaceChildren();
    for (const wire of state.wires) {
      const button = document.createElement('button');
      button.type = 'button';
      button.dataset.removeWire = wire.id;
      button.textContent = endpointName(wire.start) + ' — ' + endpointName(wire.end);
      button.setAttribute('aria-label', '拿掉電線，' + button.textContent);
      const cross = document.createElement('span');
      cross.setAttribute('aria-hidden', 'true');
      cross.textContent = ' ×';
      button.appendChild(cross);
      wires.appendChild(button);
    }
    resizeBoard();
  }

  function updateStatus() {
    const { litBulbIds, bulbPower, directShort } = evaluateCircuit(state.components, state.wires);
    power = bulbPower;

    const glowing = state.powered ? litBulbIds.size : 0;
    if (glowing) state.sawLight = true;
    const isBreak = state.powered && state.sawLight && state.wires.length === 1 && !glowing;
    const guided = mode === 'guided';
    if (guided) {
      instruction.textContent = isBreak
        ? '拿掉一條線後，燈泡熄滅了。電路中斷，沒有完整的通路。'
        : glowing
          ? '燈泡亮了。從接線區下方拿掉一條電線，看看燈泡會怎樣。'
          : !state.powered && state.sawLight && state.wires.length === 1
            ? '再開啟電源，觀察少了一條線的燈泡。'
            : litBulbIds.size
              ? '接線完成。按「開啟電源」，觀察燈泡。'
              : '點兩個接點或拖曳接線。用兩條電線，把電池的兩端分別接到燈泡的底部和側邊。';
      find('.circuit-next').hidden = !isBreak;
    } else {
      instruction.textContent = '點兩個接點或拖曳接線。電池和燈泡各使用相同規格，以一顆電池接一顆燈泡作為亮度基準。';
      find('.circuit-next').hidden = true;
    }

    if (selected) {
      status.textContent = '已選擇' + endpointName(selected) + '，請選另一個接點。';
    } else if (!state.powered) {
      status.textContent = state.wires.length ? '已接 ' + state.wires.length + ' 條電線。' : '尚未接線。';
    } else if (directShort) {
      status.textContent = '偵測到電池短路。請檢查電池兩端的接線和方向。'
        + (glowing ? '其餘電路有 ' + glowing + ' 顆燈泡發光。' : '');
    } else if (!state.components.some(({ type }) => type === 'battery')) {
      status.textContent = '請加入一顆電池。';
    } else if (glowing) {
      const lampSummary = mode === 'free' ? state.components
        .filter(({ id }) => litBulbIds.has(id))
        .map(({ id, number }) => '燈泡' + number + (bulbPower.get(id) < 0.9 ? '較暗' : bulbPower.get(id) > 1.1 ? '較亮' : '基準亮度'))
        .join('、') : '';
      status.textContent = glowing + ' 顆燈泡發光。' + (lampSummary ? lampSummary + '。' : '');
    } else {
      status.textContent = '燈泡沒有發光。請檢查電線是否接成完整通路。';
    }
    powerButton.textContent = state.powered ? '關閉電源' : '開啟電源';
    powerButton.setAttribute('aria-pressed', String(state.powered));
    paint();
  }

  function render() {
    for (const button of root.querySelectorAll('[data-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.mode === mode));
    }
    for (const type of ['battery', 'bulb']) {
      const button = find('[data-tool="' + type + '"]');
      button.hidden = mode === 'guided';
      button.disabled = state.components.filter((component) => component.type === type).length >= 5;
    }
    board.classList.toggle('hide-aux', !showAux);
    find('[data-tool="aux"]').setAttribute('aria-pressed', String(showAux));
    renderParts();
    updateStatus();
  }

  function switchMode(nextMode) {
    if (nextMode === mode) return;
    state.powered = false;
    mode = nextMode;
    state = boards[mode];
    selected = null;
    preview = null;
    showAux = true;
    render();
  }

  function editWiring() {
    selected = null;
    preview = null;
    render();
  }

  function pick(endpoint) {
    if (!endpoint || !showAux) return;
    if (!selected || samePoint(selected, endpoint)) {
      selected = selected ? null : endpoint;
      updateStatus();
      return;
    }
    if (state.wires.some(({ start, end }) =>
      (samePoint(start, selected) && samePoint(end, endpoint)) ||
      (samePoint(end, selected) && samePoint(start, endpoint))
    )) {
      selected = null;
      updateStatus();
      status.textContent = '這兩個接點已經有一條電線。';
      return;
    }
    state.wires.push({ id: 'w-' + state.nextId++, start: selected, end: endpoint, bendX: 0, bendY: 32 });
    editWiring();
    elementById.get(endpoint.compId)?.querySelector('[data-point-type="' + endpoint.pointType + '"]')?.focus({ preventScroll: true });
  }

  function boardPoint(event) {
    const rect = board.getBoundingClientRect();
    return { x: event.clientX - rect.left - board.clientLeft, y: event.clientY - rect.top - board.clientTop };
  }

  const endpointOf = (element) => {
    const target = element?.closest('[data-point-type]');
    if (!target || !board.contains(target)) return null;
    return { compId: target.dataset.compId, pointType: target.dataset.pointType };
  };

  board.addEventListener('pointerdown', (event) => {
    if (!event.isPrimary || event.button !== 0) return;
    const position = boardPoint(event);
    const terminal = endpointOf(event.target);
    const move = event.target.closest('[data-move-part]');
    const rotate = event.target.closest('[data-rotate-part]');
    const bend = event.target.closest('[data-bend-wire]');
    if (terminal) drag = { kind: 'terminal', terminal, position };
    else if (move || rotate) {
      const component = componentFor(move?.dataset.movePart || rotate.dataset.rotatePart);
      drag = { kind: rotate ? 'rotate' : 'move', component, position, x: component.x, y: component.y };
    } else if (bend) {
      drag = { kind: 'bend', wire: state.wires.find(({ id }) => id === bend.dataset.bendWire), position };
    } else return;
    drag.pointerId = event.pointerId;
    board.setPointerCapture(event.pointerId);
  });

  board.addEventListener('pointermove', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    const { x, y } = boardPoint(event);
    const dx = x - drag.position.x;
    const dy = y - drag.position.y;
    drag.moved ||= Math.hypot(dx, dy) >= 6;
    if (!drag.moved) return;
    if (drag.kind === 'terminal') {
      selected = drag.terminal;
      preview = { x, y };
    } else if (drag.kind === 'move') {
      drag.component.x = clamp(drag.x + dx, board.clientWidth, drag.component);
      drag.component.y = clamp(drag.y + dy, board.clientHeight, drag.component);
    } else if (drag.kind === 'rotate') {
      drag.component.rotation = Math.atan2(y - drag.component.y, x - drag.component.x) * 180 / Math.PI + 90;
    } else {
      const a = pointFor(drag.wire.start);
      const b = pointFor(drag.wire.end);
      drag.wire.bendX = 2 * (x - (a.x + b.x) / 2);
      drag.wire.bendY = 2 * (y - (a.y + b.y) / 2);
    }
    paint();
  });

  board.addEventListener('pointerup', (event) => {
    if (drag?.pointerId !== event.pointerId) return;
    const current = drag;
    drag = null;
    preview = null;
    if (current.kind === 'terminal') {
      if (!current.moved) {
        pick(current.terminal);
      } else {
        const target = endpointOf(document.elementFromPoint(event.clientX, event.clientY));
        if (target && !samePoint(current.terminal, target)) pick(target);
        else updateStatus();
      }
    } else if (current.kind === 'rotate' && !current.moved) {
      current.component.rotation += 90;
      paint();
    }
  });

  const cancelDrag = () => {
    if (!drag) return;
    drag = null;
    preview = null;
    updateStatus();
  };
  board.addEventListener('pointercancel', cancelDrag);
  board.addEventListener('lostpointercapture', cancelDrag);

  root.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;
    const { tool, mode: targetMode, removeWire, removePart, rotatePart } = button.dataset;
    if (targetMode || button.matches('.circuit-next')) {
      switchMode(targetMode || 'free');
    } else if (tool === 'reset') {
      state = boards[mode] = boardState();
      showAux = true;
      editWiring();
    } else if (tool === 'power') {
      state.powered = !state.powered;
      selected = null;
      preview = null;
      updateStatus();
    } else if (tool === 'aux') {
      showAux = !showAux;
      selected = null;
      preview = null;
      board.classList.toggle('hide-aux', !showAux);
      button.setAttribute('aria-pressed', String(showAux));
      updateStatus();
    } else if (tool === 'battery' || tool === 'bulb') {
      const number = state.nextId++;
      const used = state.components.filter((component) => component.type === tool).map((component) => component.number);
      const displayNumber = [1, 2, 3, 4, 5].find((candidate) => !used.includes(candidate));
      const occupied = new Set(state.components.map(({ slot }) => slot));
      let slot = 0;
      while (occupied.has(slot)) slot += 1;
      state.components.push({ id: tool + '-' + number, type: tool, number: displayNumber, slot, rotation: 0 });
      editWiring();
    } else if (removeWire || removePart) {
      state.wires = state.wires.filter(({ id, start, end }) =>
        id !== removeWire && start.compId !== removePart && end.compId !== removePart
      );
      if (removePart) state.components = state.components.filter(({ id }) => id !== removePart);
      editWiring();
    } else if (event.detail === 0) {
      if (rotatePart) {
        componentFor(rotatePart).rotation += 90;
        paint();
      } else {
        pick(endpointOf(button));
      }
    }
  });
  board.addEventListener('keydown', (event) => {
    if (event.key !== 'Escape') return;
    selected = null;
    preview = null;
    updateStatus();
  });

  new ResizeObserver(resizeBoard).observe(board);
  render();
}
