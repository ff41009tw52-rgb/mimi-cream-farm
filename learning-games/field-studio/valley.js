(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  const lessons = [
    {
      name: '溪口試飛',
      start: 1,
      den: 4,
      span: 1,
      bases: [[0, 4]],
      calls: [[2, '溪口隊', false]],
    },
    {
      name: '雙峰交會',
      start: 2,
      den: 4,
      span: 2,
      bases: [
        [0, 6],
        [4, 4],
      ],
      calls: [
        [3, '松林隊', false],
        [5, '溪谷隊', false],
      ],
    },
    {
      name: '稜線回聲',
      start: 3,
      den: 3,
      span: 2,
      bases: [
        [3, 4],
        [6, 4],
      ],
      calls: [
        [4, '稜線隊', true],
        [2, '冷杉隊', false],
      ],
    },
  ];
  let stage = 0,
    mission,
    callIndex,
    baseIndex,
    pin,
    flights,
    used,
    airborne,
    finished,
    stranded,
    revisionCount = 0;
  const baseNames = ['杉木站', '岩壁站'];
  const total = () => mission.den * mission.span;
  const pct = (value) => (100 * value) / total() + '%';
  const actual = (tick) => mission.start * mission.den + tick;
  const fraction = (tick, mixed) => {
    const n = actual(tick),
      d = mission.den,
      whole = Math.floor(n / d),
      r = n % d;
    if (mixed && r === 0) return String(whole);
    const num = mixed ? r : n;
    return (mixed ? whole + ' 又 ' : '') + num + '/' + d;
  };
  function fractionMarkup(tick, mixed) {
    const plain = fraction(tick, mixed),
      parts = plain.match(/^(?:(\d+) 又 )?(\d+)\/(\d+)$/);
    if (!parts) return plain;
    return (
      '<span aria-hidden="true">' +
      (parts[1] || '') +
      '<span class="frac"><span>' +
      parts[2] +
      '</span><span>' +
      parts[3] +
      '</span></span></span><span class="sr">' +
      plain +
      '</span>'
    );
  }
  function makeWild(previous) {
    let mission;
    do {
      const den = [3, 4, 5][Math.floor(Math.random() * 3)],
        start = 1 + Math.floor(Math.random() * 4);
      const mirror = Math.random() < 0.5,
        edge = Math.random() < 0.5 ? 1 : 2;
      const first = mirror ? den + 1 : den - 1,
        second = mirror ? den - edge : den + edge;
      mission = {
        name: '霧谷新座標',
        start,
        den,
        span: 2,
        bases: mirror
          ? [
              [den, 4],
              [2 * den, 2 * (den - 1)],
            ]
          : [
              [0, 2 * (den - 1)],
              [den, 4],
            ],
        calls: [
          [first, '石橋隊', Math.random() < 0.5],
          [second, '雲瀑隊', Math.random() < 0.5],
        ],
      };
    } while (
      previous &&
      mission.den === previous.den &&
      mission.start === previous.start &&
      mission.calls[0][0] === previous.calls[0][0]
    );
    return mission;
  }
  function setup(newMap = true) {
    if (newMap) mission = lessons[stage] || makeWild(mission);
    callIndex = 0;
    baseIndex = mission.bases.length === 1 ? 0 : null;
    pin = null;
    flights = [];
    used = new Set();
    airborne = false;
    finished = false;
    stranded = false;
    $('stage').textContent = '任務 ' + (stage + 1) + ' / 4';
    $('region').textContent = mission.name;
    window.gameGuide?.cue('rescue',stage===0?'溪口隊正守著無線電。讀電訊，標出第一個投放點。':mission.name+'收到兩通求救。兩隊都在等物資，先留意哪架飛機能返航。');
    $('objective').textContent =
      stage === 0
        ? '讀取求救座標，在山谷數線點出落點，再派機送急救包。'
        : '兩隊都需要急救包。先看兩個座標，再決定每架飛哪裡。';
    $('scale-note').textContent = '每小格 1/' + mission.den + ' 公里';
    $('scale').setAttribute('aria-valuemax', total());
    $('aircraft').hidden = true;
    $('log').hidden = true;
    $('next').hidden = true;
    $('retry').hidden = true;
    $('ticks').replaceChildren();
    for (let k = 0; k <= total(); k++) {
      const tick = document.createElement('i');
      tick.style.left = pct(k);
      tick.setAttribute('aria-hidden', 'true');
      if (k % mission.den === 0) {
        tick.className = 'major';
        const label = document.createElement('b');
        label.textContent = mission.start + k / mission.den + ' km';
        tick.append(label);
      }
      $('ticks').append(tick);
    }
    paintChoices();
    paintMap();
    say(
      stage === 0
        ? '從 ' +
            mission.start +
            ' 公里開始數。點地圖標出溪口隊的座標，再按「派機往返」。'
        : '可先切換求救隊看座標，選基地後，在地圖上標出那一隊的落點。',
    );
  }
  const done = (i) => flights.some((f) => f.call === i);
  const cost = (base, tick) => Math.abs(tick - mission.bases[base][0]) * 2;
  function say(message) {
    $('status').textContent = message;
  }
  function choice(kind, i, active, disabled, title, detail) {
    const button = document.createElement('button');
    button.className = 'choice';
    button.dataset.index = i;
    button.setAttribute('aria-pressed', String(active));
    button.disabled = disabled;
    const strong = document.createElement('strong');
    strong.textContent = title;
    const small = document.createElement('small');
    small.innerHTML = detail;
    button.append(strong, small);
    button.addEventListener('click', () => select(kind, i));
    return button;
  }
  function paintChoices() {
    const locked = airborne || finished || stranded;
    $('calls').replaceChildren(
      ...mission.calls.map(([tick, name, mixed], i) =>
        choice(
          'call',
          i,
          callIndex === i,
          locked || done(i),
          name,
          (done(i) ? '✓ 已送達 · ' : '') +
            fractionMarkup(tick, mixed) +
            ' 公里',
        ),
      ),
    );
    $('bases').replaceChildren(
      ...mission.bases.map(([tick, power], i) =>
        choice(
          'base',
          i,
          baseIndex === i,
          locked || used.has(i),
          baseNames[i] + ' · ' + fraction(tick, true) + ' km',
          used.has(i) ? '✓ 已出勤' : power + ' 格電可往返',
        ),
      ),
    );
    $('left').disabled = locked || (pin !== null && pin <= 0);
    $('right').disabled = locked || (pin !== null && pin >= total());
    $('scale').setAttribute('aria-disabled', String(locked));
    $('fly').disabled = locked || pin === null || baseIndex === null;
    $('fly').hidden = finished || stranded;
  }
  function paintMap() {
    $('markers').replaceChildren();
    mission.bases.forEach(([k], i) => {
      const marker = document.createElement('b');
      marker.className =
        'base-flag' + (i ? ' second' : '') + (used.has(i) ? ' used' : '');
      marker.style.left = pct(k);
      marker.textContent = baseNames[i];
      $('markers').append(marker);
    });
    flights.forEach((f) => {
      const tag = document.createElement('span');
      tag.className = 'delivered';
      tag.style.left = pct(mission.calls[f.call][0]);
      tag.textContent = '✓';
      $('markers').append(tag);
    });
    $('pin').hidden = pin === null;
    if (pin !== null) $('pin').style.left = pct(pin);
    $('route').hidden = pin === null || baseIndex === null;
    if (!$('route').hidden) {
      const start = mission.bases[baseIndex][0];
      $('route').style.left = pct(Math.min(start, pin));
      $('route').style.width = pct(Math.abs(start - pin));
    }
    $('scale').setAttribute('aria-valuenow', pin ?? 0);
    $('scale').setAttribute(
      'aria-valuetext',
      pin === null
        ? '尚未標記，起點 ' + mission.start + ' 公里'
        : '從 ' + mission.start + ' 公里往右 ' + pin + ' 小格',
    );
  }
  function select(kind, i) {
    if (airborne || finished || stranded) return;
    if (kind === 'call') {
      if (done(i) || callIndex === i) return;
      callIndex = i;
      pin = null;
      say('已接通' + mission.calls[i][1] + '。依這隊的座標在地圖標出落點。');
    } else {
      if (used.has(i)) return;
      baseIndex = i;
      say(baseNames[i] + '待命。記得把回基地的路程也算進電量。');
    }
    paintChoices();
    paintMap();
    (kind === 'call' ? $('calls') : $('bases')).children[i].focus({
      preventScroll: true,
    });
  }
  function mark(value) {
    if (airborne || finished || stranded) return;
    pin = Math.max(0, Math.min(total(), value));
    paintMap();
    paintChoices();
    say(
      baseIndex === null
        ? '已標記落點，選一座有足夠往返電量的基地。'
        : '落點已標記。核對座標和來回格數後，就可以派機。',
    );
  }
  document.querySelector('.terrain').addEventListener('click', (event) => {
    const rect = $('scale').getBoundingClientRect();
    if (rect.width)
      mark(Math.round(((event.clientX - rect.left) * total()) / rect.width));
  });
  $('left').addEventListener('click', () => mark((pin ?? 1) - 1));
  $('right').addEventListener('click', () => mark((pin ?? 0) + 1));
  $('scale').addEventListener('keydown', (e) => {
    const moves = {
      ArrowLeft: (pin ?? 1) - 1,
      ArrowRight: (pin ?? 0) + 1,
      Home: 0,
      End: total(),
    };
    if (e.key in moves) {
      e.preventDefault();
      mark(moves[e.key]);
    }
  });
  const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function animateFlight(start, end) {
    const craft = $('aircraft'),
      reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    craft.style.left = pct(start);
    craft.hidden = false;
    craft.getBoundingClientRect();
    await pause(35);
    craft.style.left = pct(end);
    await pause(reduced ? 60 : 710);
    say('急救包已投放，無人機正在返航。');
    craft.style.left = pct(start);
    await pause(reduced ? 60 : 710);
    craft.hidden = true;
  }
  function flightLog() {
    $('log').hidden = false;
    $('log').replaceChildren();
    const heading = document.createElement('strong');
    heading.textContent = '飛行紀錄';
    $('log').append(heading);
    for (const flight of flights) {
      const [tick, name] = mission.calls[flight.call],
        line = document.createElement('div'),
        dist = flight.energy / 2;
      line.textContent =
        baseNames[flight.base] +
        ' → ' +
        name +
        '　' +
        fraction(tick, false) +
        ' = ' +
        fraction(tick, true) +
        ' 公里，去 ' +
        dist +
        ' 格＋回 ' +
        dist +
        ' 格，共 ' +
        flight.energy +
        ' 格電。';
      $('log').append(line);
    }
  }
  async function fly() {
    if (airborne || finished || stranded || pin === null || baseIndex === null)
      return;
    const [target, name] = mission.calls[callIndex],
      [base, power] = mission.bases[baseIndex],
      need = cost(baseIndex, pin);
    if (pin !== target) {
      revisionCount++;
      say(
        '定位偏' +
          (pin < target ? '左' : '右') +
          '。你標在 ' +
          fraction(pin, true) +
          ' 公里，' +
          name +
          '通報 ' +
          fraction(target, mission.calls[callIndex][2]) +
          ' 公里。從最近的整數刻度重新數。',
      );
      return;
    }
    if (need > power) {
      revisionCount++;
      say(
        '座標正確。單程 ' +
          need / 2 +
          ' 格，來回要 ' +
          need +
          ' 格電，' +
          baseNames[baseIndex] +
          '只有 ' +
          power +
          ' 格。換一座能返航的基地。',
      );
      return;
    }
    airborne = true;
    paintChoices();
    say(baseNames[baseIndex] + '起飛，正在送急救包。');
    await animateFlight(base, pin);
    flights.push({ call: callIndex, base: baseIndex, energy: need });
    used.add(baseIndex);
    airborne = false;
    pin = null;
    baseIndex = null;
    flightLog();
    const pending = mission.calls.map((_, i) => i).filter((i) => !done(i));
    if (!pending.length) {
      finished = true;
      window.gameGuide?.cue('rescue',stage===3?'最後一包物資送到了，隊員和飛機全數平安。':'求救隊已回報收到物資，飛機也回到基地。');
      callIndex = null;
      say(
        '全隊收到急救包，無人機都已返航！' +
          (stage === 3 ? ' 本輪共調整 ' + revisionCount + ' 次。' : ''),
      );
      $('next').textContent = stage === 3 ? '換一張新地圖' : '接下一個任務';
      $('next').hidden = false;
    } else {
      callIndex = pending[0];
      const target = mission.calls[callIndex][0],
        remaining = mission.bases.findIndex((_, i) => !used.has(i));
      if (cost(remaining, target) > mission.bases[remaining][1]) {
        stranded = true;
        window.gameGuide?.cue('rescue','還有一隊在等。回到派機前，重新分配兩架無人機。');
        revisionCount++;
        $('retry').hidden = false;
        say(
          name +
            '已收到物資。剩下的' +
            baseNames[remaining] +
            '來回要 ' +
            cost(remaining, target) +
            ' 格電，只有 ' +
            mission.bases[remaining][1] +
            ' 格。重新調度，把能飛到第二隊的機會留給它。',
        );
      } else {
        baseIndex = remaining;
        window.gameGuide?.cue('rescue',mission.calls[callIndex][1]+'還在線上。讀它的座標，派出剩下的飛機。');
        $('retry').hidden = false;
        say(
          name +
            '已收到物資。現在接通' +
            mission.calls[callIndex][1] +
            '，請標出新的落點。',
        );
      }
    }
    if (finished) $('retry').hidden = true;
    paintChoices();
    paintMap();
    if (finished) $('next').focus({ preventScroll: true });
    else if (stranded) $('retry').focus({ preventScroll: true });
    else $('scale').focus({ preventScroll: true });
  }
  $('fly').addEventListener('click', fly);
  $('retry').addEventListener('click', () => {
    if (airborne) return;
    setup(false);
    $('scale').focus({ preventScroll: true });
  });
  $('next').addEventListener('click', () => {
    if (stage === 3) revisionCount = 0;
    else stage++;
    setup();
    window.scrollTo(0, 0);
    $('scale').focus({ preventScroll: true });
  });
  setup();
})();
