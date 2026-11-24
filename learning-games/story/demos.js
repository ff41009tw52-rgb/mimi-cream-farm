// Practice props are mounted inside the guide. They never operate the live game.
export function mountDemo(mode, root) {
  const props = document.createElement('div');
  props.className = 'sg-props';
  const controls = document.createElement('div');
  controls.className = 'sg-demo-controls';
  const reply = document.createElement('p');
  reply.className = 'sg-demo-reply';
  reply.setAttribute('role', 'status');
  root.replaceChildren(props, controls, reply);
  function button(text, act, holder = controls) {
    const key = document.createElement('button');
    key.type = 'button';
    key.textContent = text;
    key.addEventListener('click', () => act(key));
    holder.append(key);
    return key;
  }
  function tokens(names) {
    const tags = names.map((name) => {
      const token = document.createElement('span');
      token.textContent = name;
      return token;
    });
    props.append(...tags);
    return tags;
  }
  function lane(icon, start, end, stops) {
    const track = document.createElement('div');
    track.className = 'sg-track';
    const rail = document.createElement('div');
    rail.className = 'sg-sleepers';
    rail.style.setProperty('--spaces', stops);
    const vehicle = document.createElement('span');
    vehicle.className = 'sg-vehicle';
    vehicle.textContent = icon;
    vehicle.setAttribute('aria-hidden', 'true');
    const ends = document.createElement('div');
    ends.className = 'sg-track-ends';
    ends.append(
      ...[start, end].map((name) => {
        const label = document.createElement('b');
        label.textContent = name;
        return label;
      }),
    );
    track.append(rail, vehicle, ends);
    props.append(track);
    return (n) => {
      vehicle.style.left = (100 * n) / stops + '%';
    };
  }
  if (mode === 'radio') {
    const [soup] = tokens(['熱濃湯', '烤脆餅']);
    button('播「它熱呼呼的」', () => {
      soup.classList.remove('sg-ruled-out');
      reply.textContent = '聽眾：「兩份都熱，我還選不出來。」';
    });
    button('播「咬下去喀滋一聲」', () => {
      soup.classList.add('sg-ruled-out');
      reply.textContent = '聽眾：「濃湯咬不出喀滋聲，我知道是脆餅了！」';
    });
  } else if (mode === 'recipe') {
    let selected = null;
    let steps = ['蓋上吐司', '抹果醬'];
    const cards = steps.map((name, i) =>
      button(
        '',
        (key) => {
          if (selected === null) {
            selected = i;
            key.setAttribute('aria-pressed', 'true');
            reply.textContent = '已拿起這張。再點另一張，兩張會互換。';
            return;
          }
          if (selected !== i) steps.reverse();
          selected = null;
          paint();
          reply.textContent =
            steps[0] === '抹果醬'
              ? '先抹果醬，再蓋吐司。兩張步驟和手帳對上了！'
              : '先讀「先」後面的動作，再交換兩張試試。';
        },
        props,
      ),
    );
    function paint() {
      cards.forEach((key, i) => {
        key.textContent = (i === 0 ? '① ' : '② ') + steps[i];
        key.setAttribute('aria-pressed', 'false');
      });
    }
    paint();
  } else if (mode === 'sensory') {
    const [pan] = tokens(['鍋蓋下的爆米花']);
    button('用耳朵聽', () => {
      pan.textContent = '劈哩啪啦！';
      reply.textContent = '耳朵聽到玉米爆開的聲音，這句可以寫進「聽覺」菜單。';
    });
    button('用鼻子聞', () => {
      pan.textContent = '奶油香飄了出來';
      reply.textContent = '鼻子聞到氣味，這句可以寫進「嗅覺」菜單。';
    });
  } else if (mode === 'characters') {
    const [proof] = tokens(['□ 亮']);
    let left = false,
      right = false;
    function print() {
      proof.textContent = left && right ? '明亮' : left ? '日 ＋ □' : '□ ＋ 月';
      reply.textContent =
        left && right
          ? '「日」在左，「月」在右，合起來印出「明亮」！'
          : '另一個部件還在字盤裡，再拿一塊就能試印。';
    }
    button('左字模「日」', (key) => {
      left = true;
      key.setAttribute('aria-pressed', 'true');
      print();
    });
    button('右字模「月」', (key) => {
      right = true;
      key.setAttribute('aria-pressed', 'true');
      print();
    });
  } else if (mode === 'delivery') {
    const tray = document.createElement('div');
    tray.className = 'sg-slices';
    tray.setAttribute('aria-hidden', 'true');
    for (let i = 0; i < 4; i++) tray.append(document.createElement('i'));
    props.append(tray);
    let boxed = false;
    button('把 4 片合成 1 張', (key) => {
      boxed = !boxed;
      tray.classList.toggle('sg-boxed', boxed);
      key.textContent = boxed ? '拆回散片' : '把 4 片合成 1 張';
      reply.textContent = boxed
        ? '整張盒 1 盒，散片 0 片。四個四分之一合起來剛好一張。'
        : '整張盒空出來了，車上又有 4 片散片。';
    });
  } else if (mode === 'pizzaPractice') {
    let denominator = 0;
    const pie = button(
      '未切',
      () => {
        if (!denominator) {
          reply.textContent = '先選切法，才知道每片有多大。';
          return;
        }
        reply.textContent =
          denominator === 3
            ? '取到一片三分之一，試吃份量剛好！'
            : '你拿了一片二分之一，比客人要的大。試試三等份。';
      },
      props,
    );
    pie.className = 'sg-sample-pizza';
    pie.setAttribute('aria-label', '從試吃餅取一片');
    for (const d of [2, 3])
      button('切成 ' + d + ' 等份', () => {
        denominator = d;
        pie.dataset.cuts = d;
        pie.textContent = '取一片';
        reply.textContent = '一張已平分成 ' + d + ' 份。點試吃餅取一片。';
      });
  } else if (mode === 'rail') {
    const move = lane('🚂', '0', '1', 3);
    let stop = 0;
    function drive(delta) {
      stop = Math.min(3, Math.max(0, stop + delta));
      move(stop);
      reply.textContent =
        stop === 2
          ? '停靠成功！從 0 向右兩個小格就是三分之二。'
          : '現在是 ' +
            stop +
            '/3。' +
            (stop < 2 ? '乘客的站還在右邊。' : '超過了，退回一小格。');
    }
    button('退一格', () => drive(-1));
    button('前進一格', () => drive(1));
    move(0);
  } else if (mode === 'angles') {
    const gauge = document.createElement('div');
    gauge.className = 'sg-gauge';
    const ray = document.createElement('i');
    gauge.append(ray);
    props.append(gauge);
    const [reading] = tokens(['20°']);
    let angle = 20;
    function turn(delta) {
      angle = Math.min(90, Math.max(0, angle + delta));
      ray.style.setProperty('--angle', angle + 'deg');
      reading.textContent = angle + '°';
      reply.textContent =
        angle === 30
          ? '光束到位！30° 小於一個直角。'
          : '現在是 ' +
            angle +
            '°，往' +
            (angle < 30 ? '上轉大' : '下轉小') +
            '就更接近 30°。';
    }
    button('−10°', () => turn(-10));
    button('＋10°', () => turn(10));
  } else if (mode === 'rescue') {
    const move = lane('📦', '基地', '投放旗', 2);
    let step = 0;
    const [energy] = tokens(['電量 4 格']);
    button('起飛投放', (key) => {
      step = (step + 1) % 3;
      move(step === 1 ? 2 : 0);
      energy.textContent = '電量 ' + [4, 2, 0][step] + ' 格';
      key.textContent = ['起飛投放', '飛回基地', '再試一次'][step];
      reply.textContent = [
        '試飛機已充好電。',
        '飛去用掉 2 格電。東西送到了，還要留電回家。',
        '返航再用 2 格電。去 2 格＋回 2 格，這趟共用 4 格。',
      ][step];
    });
  }
  if (!props.children.length) props.hidden = true;
  if (!controls.children.length) controls.hidden = true;
}
