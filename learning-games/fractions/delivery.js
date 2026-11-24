const orders = [
  { denominator: 8, amounts: [11, 5] },
  { denominator: 4, amounts: [3, 5] },
  { denominator: 6, amounts: [10, 2] }
];
const tables = ['一桌', '二桌'];
const toppingPositions = [[7, -5], [-8, 7], [2, 12]];

export function mountDelivery(root, { frac, amount, wedge }) {
  let round = 0;
  let active = 0;
  let allocations = [];
  let grouped = [];
  let finished = false;
  let order;
  const count = (table) => allocations.filter((owner) => owner === table).length;
  const loose = (table) => count(table) - (grouped[table] ? order.denominator : 0);
  const target = (selector) => root.querySelector(selector);

  function begin(focus = false) {
    order = orders[round];
    allocations = Array(order.denominator * 2).fill(null);
    grouped = [false, false];
    active = 0;
    finished = false;
    root.innerHTML = `
      <section class="delivery" aria-label="外送裝箱">
        <header class="delivery-intro">
          <h2 tabindex="-1">外送裝箱</h2>
          <span>第 ${round + 1} / ${orders.length} 批</span>
          <p>先選桌號，再點披薩片裝盒。外送車最多放 1 個整張盒和 ${order.denominator} 片散片。</p>
        </header>
        <div class="delivery-tickets" role="group" aria-label="選擇要裝箱的訂單">
          ${order.amounts.map((quantity, table) => `
            <button type="button" class="delivery-ticket" data-table="${table}" aria-pressed="false"
              aria-label="${tables[table]}，${order.denominator} 分之 ${quantity} 張">
              <span class="ticket-table">${tables[table]}</span>
              <span class="ticket-amount">${frac(quantity, order.denominator)} 張</span>
            </button>`).join('')}
        </div>
        <div class="delivery-counter">
          <section class="delivery-stock">
            <h3>備餐台 <span>每片是 ${frac(1, order.denominator)} 張</span></h3>
            <div class="delivery-pizzas"></div>
          </section>
          <section class="delivery-boxes">
            <h3>外送車</h3>
            <div class="delivery-capacity"></div>
            <div class="delivery-trays"></div>
            <div class="delivery-actions">
              <button id="clear-trays" type="button">清空裝箱</button>
              <button id="send-pizzas" type="button">出車</button>
              <button id="next-delivery" type="button" hidden>${round === orders.length - 1 ? '再玩一輪' : '接下一批訂單'}</button>
            </div>
          </section>
        </div>
        <div class="delivery-output" role="status" aria-live="polite"></div>
      </section>`;
    draw();
    if (focus) target('h2').focus({ preventScroll: true });
  }

  function draw(focusId) {
    const d = order.denominator;
    for (const button of root.querySelectorAll('[data-table]')) {
      button.setAttribute('aria-pressed', String(Number(button.dataset.table) === active));
      button.disabled = finished;
    }
    target('.delivery-pizzas').innerHTML = [0, 1].map((pizza) => `
      <svg class="delivery-pizza" viewBox="0 0 200 200" role="group" aria-label="第 ${pizza + 1} 張披薩，${d} 等份">
        <circle cx="100" cy="100" r="98" class="delivery-plate"/>
        ${Array.from({ length: d }, (_, slice) => {
          const id = pizza * d + slice;
          const isAvailable = allocations[id] === null;
          const angle = (slice + .5) * 360 / d;
          return `<g id="delivery-piece-${id}" ${isAvailable && !finished
            ? `data-piece="${id}" tabindex="0" role="button" aria-label="取第 ${pizza + 1} 張披薩第 ${slice + 1} 片，${d} 分之一張"`
            : 'aria-hidden="true"'} class="delivery-slice ${isAvailable ? '' : 'is-gone'}">
            <path d="${wedge(slice, d, 88)}"/>
            ${isAvailable ? `<g transform="rotate(${angle} 100 100) translate(100 42)" class="delivery-toppings">${toppingPositions.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="4"/>`).join('')}<path d="M-6 -10q4-7 7-7q0 5-7 7"/></g>` : ''}
          </g>`;
        }).join('')}
      </svg>`).join('');

    const looseTotal = loose(0) + loose(1);
    target('.delivery-capacity').innerHTML = `
      <span class="capacity-whole"><i aria-hidden="true"></i>整張盒 ${grouped.filter(Boolean).length} / 1</span>
      <span class="capacity-loose ${looseTotal > d ? 'capacity-over' : ''}">散片 ${looseTotal} / ${d} 片${looseTotal > d ? '，超出可載片數' : ''}</span>`;
    target('.delivery-trays').innerHTML = tables.map((table, i) => {
      const ids = allocations.flatMap((owner, id) => owner === i ? [id] : []);
      const looseIds = ids.slice(grouped[i] ? d : 0);
      const packedAmount = ids.length === 0 ? '0' : amount(ids.length, d, grouped[i] ? 'mixed' : 'fraction');
      return `<section class="delivery-tray" aria-label="${table}的裝箱">
        <h4>${table}<small>已裝 ${packedAmount} 張</small></h4>
        <div class="delivery-pieces" aria-label="已裝的小片">
          ${grouped[i] ? '<span class="boxed-whole">整張</span>' : ''}
          ${looseIds.map((id) => `<button type="button" class="boxed-piece" data-return="${id}" ${finished ? 'disabled' : ''} aria-label="放回${table}的一片披薩"><span aria-hidden="true"></span></button>`).join('')}
          ${!ids.length ? '<span class="empty-tray">空盒</span>' : ''}
        </div>
        <button type="button" class="delivery-group" id="delivery-group-${i}" data-group="${i}" ${finished || (!grouped[i] && (loose(i) < d || grouped.some(Boolean))) ? 'disabled' : ''}>
          ${grouped[i] ? '拆成散片' : `把 ${d} 片合成 1 張`}
        </button>
      </section>`;
    }).join('');
    target('#clear-trays').disabled = finished || allocations.every((owner) => owner === null);
    target('#send-pizzas').hidden = finished;
    target('#next-delivery').hidden = !finished;

    if (focusId) target(focusId)?.focus({ preventScroll: true });
  }

  function say(html, problem = false) {
    target('.delivery-output').classList.toggle('is-warning', problem);
    target('.delivery-output').innerHTML = html;
  }

  function send() {
    const d = order.denominator;
    const mismatches = order.amounts.flatMap((goal, table) => {
      const difference = goal - count(table);
      return difference === 0 ? [] : [`${tables[table]}${difference > 0 ? '還少' : '多了'} ${frac(Math.abs(difference), d)} 張`];
    });
    if (mismatches.length > 0) {
      say(mismatches.join('，') + '。點已裝的散片可以放回。', true);
      return;
    }
    if (loose(0) + loose(1) > d) {
      say(`兩桌的份量都對。車上散片只能放 ${d} 片，試著選一桌，把 ${d} 片合成 1 張。`, true);
      return;
    }

    finished = true;
    const wholeTable = grouped.indexOf(true);
    const total = order.amounts[wholeTable];
    draw('#next-delivery');
    say(`兩桌都送到了。${tables[wholeTable]}的 ${frac(total, d)} 張
      ＝ ${amount(total, d, 'mixed')} 張。`);
  }

  function take(piece) {
    if (finished || allocations[piece] !== null) return;
    allocations[piece] = active;
    const next = allocations.findIndex((owner) => owner === null);
    draw(next < 0 ? '#send-pizzas' : '#delivery-piece-' + next);
    say(`${tables[active]}已裝 ${frac(count(active), order.denominator)} 張。`);
  }

  root.onclick = (event) => {
    if (!root.querySelector('.delivery')) return;
    const element = event.target.closest('button, [data-piece]');
    if (!element) return;
    const { table, piece, group, return: returnId } = element.dataset;
    if (piece !== undefined) {
      take(Number(piece));
    } else if (table !== undefined) {
      active = Number(table);
      draw();
      say(`正在裝${tables[active]}的訂單。`);
    } else if (group !== undefined) {
      const i = Number(group);
      grouped[i] = !grouped[i];
      draw('#delivery-group-' + i);
      say(grouped[i] ? `${tables[i]}把 ${order.denominator} 片合成了 1 張。` : `${tables[i]}的整張盒已拆成散片。`);
    } else if (returnId !== undefined) {
      allocations[Number(returnId)] = null;
      draw('#delivery-piece-' + returnId);
      say('已放回一片披薩。');
    } else if (element.id === 'clear-trays') {
      begin(true);
    } else if (element.id === 'send-pizzas') {
      send();
    } else if (element.id === 'next-delivery') {
      round = (round + 1) % orders.length;
      begin(true);
    }
  };
  root.onkeydown = (event) => {
    const piece = event.target.dataset.piece;
    if (piece === undefined || !['Enter', ' '].includes(event.key)) return;
    event.preventDefault();
    take(Number(piece));
  };

  begin();
}
