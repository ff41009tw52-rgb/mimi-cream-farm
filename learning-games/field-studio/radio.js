(() => {
  'use strict';
  const $ = (id) => document.getElementById(id);
  // Each menu crosses two observable traits. One rival shares each trait with the order.
  const shows = [
    {
      title: '義大利麵來電',
      axes: ['麵的形狀', '醬汁的味道'],
      traits: [
        ['蝴蝶麵', '車輪麵'],
        ['番茄紅醬', '奶油白醬'],
      ],
      name: ([a, b]) => b + a,
      marks: ['⋈', '⊛'],
      ink: ['red', 'cream'],
      lines: [
        [
          '中間束起來，兩邊像張開的小翅膀。',
          '圓圓的麵圈裡，藏著一根根小輻條。',
        ],
        ['舌尖先嚐到微酸，接著是番茄的甜。', '入口滑滑的，濃濃奶香留在嘴裡。'],
      ],
      alternate: [
        '那兩片扇子似的麵皮，在中央捏成一束。',
        '一個個小圓圈，像能在盤子上滾起來。',
      ],
      broad: '一口咬下，麵條裹滿了醬汁。',
    },
    {
      title: '壽司店的來信',
      axes: ['上層的外觀', '內餡的口感'],
      traits: [
        ['玉子燒', '鮮蝦'],
        ['小黃瓜', '酪梨'],
      ],
      name: ([a, b]) => a + '配' + b,
      marks: ['▰', '♧'],
      lines: [
        ['最上頭疊著一層層金黃的蛋皮。', '橘白相間的身體彎成一彎月亮。'],
        [
          '咬到翠綠的小條，喀滋一聲好清脆。',
          '牙齒輕輕一壓，淡綠色的果肉就化開了。',
        ],
      ],
      alternate: [
        '飯上像蓋了一條金黃色的小棉被，斷面看得見蛋皮的層次。',
        '飯上的尾巴翹起，身上還有一道道橘紋。',
      ],
      broad: '米粒擠在一起，一口就吃得下。',
    },
    {
      title: '印度甩餅現場',
      axes: ['起手動作', '收尾動作'],
      ordered: true,
      traits: [
        ['拍平', '擀平'],
        ['甩上空中', '攤上鐵盤'],
      ],
      name: ([a, b]) => '先' + a + '、再' + b,
      marks: ['✋', '▱'],
      lines: [
        [
          '手掌一下、一下，把麵團拍成扁圓。',
          '師傅雙手來回推動木棍，把麵團壓薄。',
        ],
        ['手腕一轉，餅皮旋著飛離指尖。', '師傅捏住兩角，把薄皮貼上熱鐵盤。'],
      ],
      alternate: [
        '掌心落下又抬起，厚麵團慢慢變扁。',
        '木棍從中央滾向邊緣，餅皮越來越薄。',
      ],
      broad: '師傅兩隻手忙個不停。',
    },
    {
      title: '校門口的飯糰',
      axes: ['外皮的樣子', '內餡的口感'],
      traits: [
        ['海苔', '蛋皮'],
        ['油條', '肉鬆'],
      ],
      name: ([a, b]) => a + '包' + b,
      marks: ['▧', '▱'],
      lines: [
        [
          '墨綠色的薄片裹住白飯，邊邊有點皺。',
          '金黃色的薄衣包起米飯，還聞得到蛋香。',
        ],
        [
          '咬開中心，細長的炸麵條喀啦作響。',
          '米飯中間是一絲絲鬆軟的肉，越嚼越香。',
        ],
      ],
      alternate: [
        '外層像一張深綠的紙，透著淡淡海味。',
        '薄薄的蛋香外衣，像替飯糰披上一層金布。',
      ],
      broad: '捧在手心，飯糰還暖呼呼的。',
    },
  ];
  function shuffle(items) {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
  let episode = 0,
    target,
    dishes,
    clips,
    selected = [],
    passed = false,
    airing = false,
    audio,
    sound = false;
  let firstTakes = 0,
    takes = 0,
    lastCandidates = [];
  const show = () => shows[episode];
  const unit = () => (show().ordered ? '段' : '份');
  const name = (d) =>
    show().name(d.map((value, axis) => show().traits[axis][value]));
  const same = (a, b) => a[0] === b[0] && a[1] === b[1];
  function beep(hz) {
    if (!sound || !audio) return;
    const oscillator = audio.createOscillator(),
      gain = audio.createGain(),
      now = audio.currentTime;
    oscillator.frequency.value = hz;
    gain.gain.setValueAtTime(0.055, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.13);
    oscillator.connect(gain).connect(audio.destination);
    oscillator.start(now);
    oscillator.stop(now + 0.15);
  }
  function renderMenu(possible, finished = false) {
    lastCandidates = possible;
    $('menu').replaceChildren(
      ...dishes.map((d) => {
        const item = document.createElement('div'),
          inPlay = possible.includes(d);
        item.className =
          'dish' +
          (!inPlay
            ? ' out'
            : finished && possible.length === 1 && same(d, target)
              ? ' hit'
              : '');
        const icon = document.createElement('span');
        icon.className = 'food-icon ' + (show().ink?.[d[1]] || '');
        icon.textContent = show().marks[d[0]];
        icon.setAttribute('aria-hidden', 'true');
        const label = document.createElement('div'),
          title = document.createElement('strong'),
          state = document.createElement('small');
        title.textContent = name(d);
        state.textContent = !inPlay
          ? '已排除'
          : finished && possible.length === 1
            ? '聽眾選了這' + unit()
            : '仍有可能';
        label.append(title, state);
        item.append(icon, label);
        return item;
      }),
    );
    $('table-state').textContent =
      '剩 ' + possible.length + ' / ' + dishes.length + ' ' + unit();
  }
  function controls() {
    Array.from($('clips').children).forEach((button, id) => {
      const slot = selected.indexOf(id);
      button.setAttribute('aria-pressed', String(slot >= 0));
      button.disabled = airing || passed;
      button.querySelector('.channel').textContent =
        slot === -1 ? '＋' : String(slot + 1);
    });
    $('slot-count').textContent = '已選 ' + selected.length + ' / 2 句';
    $('air').disabled = selected.length !== 2 || airing || passed;
    $('air').textContent = airing ? '播出中' : '播出';
    $('listen').disabled = !selected.length || airing;
  }
  function makeEpisode(variant, resetTakes = true) {
    window.speechSynthesis?.cancel();
    if (resetTakes) takes = 0;
    target = [variant >> 1, variant % 2];
    dishes = shuffle([
      target,
      [1 - target[0], target[1]],
      [target[0], 1 - target[1]],
    ]);
    const data = show();
    clips = shuffle([
      ...data.lines.flatMap((pair, axis) =>
        pair.map((line, value) => ({ axis, value, line })),
      ),
      { axis: 0, value: target[0], line: data.alternate[target[0]] },
      { axis: -1, line: data.broad },
    ]);
    selected = [];
    passed = false;
    airing = false;
    $('episode').textContent =
      '第 ' + (episode + 1) + ' / ' + shows.length + ' 集';
    window.gameGuide?.cue('radio',data.ordered?'甩餅現場的畫面傳來了。請依先後把師傅的動作播給聽眾。':data.title+'已經接通，這次請描述「'+name(target)+'」。');
    $('order').textContent = name(target);
    $('table-title').textContent = data.ordered ? '聽眾的螢幕' : '聽眾的餐桌';
    document.querySelector('.order p').textContent = data.ordered
      ? '聽眾在看三段無聲影片。用兩句話，讓他挑中指定的甩餅動作。'
      : '用兩句話，讓看不見指定單的聽眾挑中這一份。';
    $('desk-title').textContent = data.ordered ? '剪接動作轉播' : '剪接播報稿';
    document.querySelector('.instruction').textContent = data.ordered
      ? '先挑起手的動作，再挑收尾。點已選句帶可抽回。'
      : '點兩張句帶放進稿子，點已選句帶可抽回。';
    $('clips').replaceChildren(
      ...clips.map((clip, i) => {
        const button = document.createElement('button');
        button.className = 'clip';
        button.type = 'button';
        const number = document.createElement('span');
        number.className = 'channel';
        number.setAttribute('aria-hidden', 'true');
        button.append(number, document.createTextNode(clip.line));
        button.addEventListener('click', () => choose(i));
        return button;
      }),
    );
    $('next').hidden = true;
    $('remix').hidden = true;
    $('edit').hidden = true;
    $('playback').hidden = true;
    $('reply').textContent =
      '「這裡是' +
      data.title +
      (data.ordered
        ? '。螢幕上有三段影片，請轉播師傅的動作！」'
        : '。我面前有三份，你可以開始描述了！」');
    renderMenu(dishes);
    controls();
  }
  function choose(id) {
    if (airing || passed) return;
    if (selected.includes(id)) selected = selected.filter((n) => n !== id);
    else if (selected.length < 2) selected.push(id);
    else {
      $('reply').textContent =
        '兩句都放好了。想換句子，先點一張有編號的句帶抽回。';
      return;
    }
    $('edit').hidden = true;
    $('playback').hidden = true;
    if (lastCandidates.length !== 3) renderMenu(dishes);
    $('reply').textContent =
      selected.length === 2
        ? '「稿子準備好了，按播出，我就照著選。」'
        : '「我等著聽你的描述。」';
    controls();
  }
  function evaluateLine(candidates, clip, step) {
    if (clip.axis < 0) return candidates;
    if (show().ordered && clip.axis !== step) return [];
    return candidates.filter((d) => d[clip.axis] === clip.value);
  }
  const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
  async function broadcast() {
    if (selected.length !== 2 || airing || passed) return;
    window.speechSynthesis?.cancel();
    airing = true;
    takes++;
    controls();
    beep(415);
    let remaining = dishes;
    const record = [];
    $('edit').hidden = true;
    $('playback').hidden = true;
    if ($('menu').getBoundingClientRect().bottom > window.innerHeight)
      $('table-title').scrollIntoView({ block: 'start' });
    for (const [step, id] of selected.entries()) {
      const button = $('clips').children[id];
      button.classList.add('on-air');
      const before = remaining;
      remaining = evaluateLine(remaining, clips[id], step);
      renderMenu(remaining);
      const ruledOut = before.filter((d) => !remaining.includes(d)).map(name);
      const row = document.createElement('div');
      row.textContent =
        '第' +
        (step ? '二' : '一') +
        '句「' +
        clips[id].line +
        '」' +
        (ruledOut.length
          ? '排除：' + ruledOut.join('、')
          : '沒有再排除其他選項') +
        '。';
      record.push(row);
      $('reply').textContent =
        '第' +
        (step ? '二' : '一') +
        '句「' +
        clips[id].line +
        '」　聽眾留下 ' +
        remaining.length +
        ' ' +
        unit() +
        '。';
      await delay(step ? 1050 : 1450);
      button.classList.remove('on-air');
    }
    airing = false;
    passed = remaining.length === 1 && same(remaining[0], target);
    renderMenu(remaining, true);
    controls();
    beep(passed ? 660 : 250);
    $('playback').replaceChildren(...record);
    $('playback').hidden = false;
    const axes = show().axes;
    if (passed) {
      window.gameGuide?.cue('radio',episode===shows.length-1?'最後一通來電收線了！今天的四集節目播送完畢。':'來電的聽眾選中了！下一條線上還有人等你。');
      if (takes === 1) firstTakes++;
      $('reply').textContent =
        '「我選' +
        name(target) +
        '！」兩句分別交代了' +
        axes.join('和') +
        '，另外兩' +
        unit() +
        '都對不上。';
      if (episode === shows.length - 1)
        $('reply').textContent +=
          ' 四集播完！其中 ' + firstTakes + ' 集在第一次播出時就讓聽眾選中。';
      $('next').textContent =
        episode < shows.length - 1 ? '接下一通來電' : '再開一輪節目';
      $('next').hidden = false;
      $('remix').hidden = false;
      $('next').focus({ preventScroll: true });
    } else {
      $('edit').hidden = false;
      let suggestion;
      if (
        show().ordered &&
        selected.some((id, i) => clips[id].axis >= 0 && clips[id].axis !== i)
      )
        suggestion = '動作的先後也會改變畫面。先播起手，再播收尾。';
      else if (!remaining.some((d) => same(d, target)))
        suggestion =
          '有一句和指定單不符。比對指定單和被排除的選項，抽回那一句。';
      else {
        const rival = remaining.find((d) => !same(d, target));
        const axis = rival.findIndex((v, i) => v !== target[i]);
        suggestion =
          '兩' +
          unit() +
          '都符合你說的線索。試著補上「' +
          axes[axis] +
          '」的差別。';
        if (remaining.length === 3)
          suggestion =
            '三' + unit() + '都符合。加一句讓人想像得到' + axes[0] + '的描述。';
      }
      $('reply').textContent =
        (remaining.length === 1
          ? '「我選' + name(remaining[0]) + '……跟指定單不同！」'
          : remaining.length === 0
            ? '「沒有一' + unit() + '跟播報完全相同。」'
            : '「我還有 ' + remaining.length + ' ' + unit() + '可以選。」') +
        ' ' +
        suggestion;
    }
  }
  function differentVariant() {
    return (target[0] * 2 + target[1] + 1 + Math.floor(Math.random() * 3)) % 4;
  }
  $('air').addEventListener('click', broadcast);
  $('edit').addEventListener('click', () => {
    const first = $('clips').children[selected[0]];
    first.focus({ preventScroll: true });
    first.scrollIntoView({ block: 'center' });
  });
  $('next').addEventListener('click', () => {
    episode = (episode + 1) % shows.length;
    if (episode === 0) firstTakes = 0;
    makeEpisode(Math.floor(Math.random() * 4));
    $('clips').firstChild.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  $('remix').addEventListener('click', () => {
    if (takes === 1) firstTakes--;
    makeEpisode(differentVariant());
    $('clips').firstChild.focus({ preventScroll: true });
    window.scrollTo(0, 0);
  });
  $('sound').addEventListener('click', () => {
    const Engine = window.AudioContext || window.webkitAudioContext;
    if (!Engine) {
      $('sound').textContent = '裝置無音效';
      $('sound').disabled = true;
      return;
    }
    sound = !sound;
    if (sound) {
      audio ??= new Engine();
      audio.resume().catch(() => {});
      beep(480);
    }
    $('sound').textContent = sound ? '音效開' : '音效關';
    $('sound').setAttribute('aria-pressed', String(sound));
  });
  function chineseVoice() {
    return window.speechSynthesis
      ?.getVoices()
      .filter((v) => /^zh|^cmn/i.test(v.lang))
      .sort(
        (a, b) => Number(/TW/i.test(b.lang)) - Number(/TW/i.test(a.lang)),
      )[0];
  }
  function checkVoice() {
    $('listen').hidden = !chineseVoice();
  }
  $('listen').addEventListener('click', () => {
    const voice = chineseVoice();
    if (!voice) return;
    const speech = new SpeechSynthesisUtterance(
      selected.map((i) => clips[i].line).join('　'),
    );
    speech.voice = voice;
    speech.lang = voice.lang;
    speech.rate = 0.85;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(speech);
  });
  window.speechSynthesis?.addEventListener?.('voiceschanged', checkVoice);
  makeEpisode(0);
  checkVoice();
})();
