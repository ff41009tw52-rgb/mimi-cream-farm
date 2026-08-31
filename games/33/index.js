const stylesheetUrl = new URL('./styles.css', import.meta.url).href;

const loadStylesheet = (root) => new Promise((resolve, reject) => {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = stylesheetUrl;
  link.addEventListener('load', resolve, { once: true });
  link.addEventListener('error', () => reject(new Error('無法載入第 33 號遊戲樣式')), { once: true });
  root.append(link);
});

export async function mount(root, context = {}) {
  if (!root || typeof root.replaceChildren !== 'function') {
    throw new TypeError('第 33 號遊戲需要有效的掛載容器');
  }

  root.replaceChildren();
  await loadStylesheet(root);

  const content = document.createElement('section');
  content.className = 'arm-game';
  content.setAttribute('aria-labelledby', 'arm33-title');
  content.innerHTML = [
    '<div class="arm-game__card">',
      '<header class="arm-game__header">',
        '<a class="arm-game__home" href="index.html" aria-label="回到科學農場首頁">🐾 回農場</a>',
        '<div class="arm-game__heading">',
          '<h1 id="arm33-title">💪 手臂運動原理互動教學</h1>',
          '<p>拉動下方的滑桿，觀察骨骼與肌肉如何配合讓手臂動作。</p>',
        '</div>',
      '</header>',
      '<div class="arm-game__visual">',
        '<svg id="arm33-svg" viewBox="0 0 500 400" role="img" aria-labelledby="arm33-diagram-title arm33-diagram-desc">',
          '<title id="arm33-diagram-title">手臂骨骼與肌肉動作模型</title>',
          '<desc id="arm33-diagram-desc">滑桿改變手肘角度時，下臂、肱二頭肌與肱三頭肌會同步改變。</desc>',
          '<circle cx="150" cy="100" r="8" fill="#cbd5e1"></circle>',
          '<line x1="150" y1="100" x2="150" y2="250" stroke="#94a3b8" stroke-width="12" stroke-linecap="round"></line>',
          '<text x="100" y="175" fill="#475569" font-size="14">上臂骨（固定）</text>',
          '<g id="arm33-forearm">',
            '<line x1="0" y1="0" x2="200" y2="0" stroke="#94a3b8" stroke-width="10" stroke-linecap="round"></line>',
            '<circle cx="210" cy="0" r="15" fill="#fecaca"></circle>',
            '<text x="100" y="25" fill="#475569" font-size="14">下臂骨</text>',
          '</g>',
          '<path id="arm33-biceps" fill="#4ade80" stroke="#15803d" stroke-width="2"></path>',
          '<path id="arm33-triceps" fill="#f87171" stroke="#dc2626" stroke-width="2"></path>',
          '<circle cx="150" cy="250" r="10" fill="#64748b"></circle>',
          '<text x="120" y="275" fill="#334155" font-weight="700">肘關節</text>',
        '</svg>',
        '<aside class="arm-game__status" aria-label="肌肉狀態">',
          '<p><span class="arm-game__dot arm-game__dot--green" aria-hidden="true"></span><strong>肱二頭肌：</strong><span id="arm33-biceps-status">舒張</span></p>',
          '<p><span class="arm-game__dot arm-game__dot--red" aria-hidden="true"></span><strong>肱三頭肌：</strong><span id="arm33-triceps-status">收縮</span></p>',
        '</aside>',
      '</div>',
      '<div class="arm-game__controls">',
        '<div class="arm-game__range-labels" aria-hidden="true"><span>彎曲（45 度）</span><span>伸直（180 度）</span></div>',
        '<label class="arm-game__slider-label" for="arm33-angle">調整手肘角度</label>',
        '<input id="arm33-angle" type="range" min="45" max="180" value="180" step="1" aria-describedby="arm33-action">',
        '<p id="arm33-action" class="arm-game__action">手臂處於<strong>伸直</strong>狀態，目前 180 度。</p>',
      '</div>',
      '<section class="arm-game__knowledge" aria-labelledby="arm33-knowledge-title">',
        '<h2 id="arm33-knowledge-title" class="arm-game__sr-only">知識補給站</h2>',
        '<article class="arm-game__note arm-game__note--green">',
          '<h3>彎曲手臂時</h3>',
          '<ul><li>肱二頭肌收縮，變短、變厚</li><li>肱三頭肌舒張，變長、變薄</li><li>帶動骨骼向上運動</li></ul>',
        '</article>',
        '<article class="arm-game__note arm-game__note--red">',
          '<h3>伸直手臂時</h3>',
          '<ul><li>肱二頭肌舒張，變長、變薄</li><li>肱三頭肌收縮，變短、變厚</li><li>帶動骨骼向下運動</li></ul>',
        '</article>',
      '</section>',
    '</div>'
  ].join('');

  root.append(content);

  const homeLink = content.querySelector('.arm-game__home');
  const slider = content.querySelector('#arm33-angle');
  const forearm = content.querySelector('#arm33-forearm');
  const biceps = content.querySelector('#arm33-biceps');
  const triceps = content.querySelector('#arm33-triceps');
  const bicepsStatus = content.querySelector('#arm33-biceps-status');
  const tricepsStatus = content.querySelector('#arm33-triceps-status');
  const action = content.querySelector('#arm33-action');

  if (!homeLink || !slider || !forearm || !biceps || !triceps || !bicepsStatus || !tricepsStatus || !action) {
    throw new Error('第 33 號遊戲缺少必要的互動元件');
  }

  if (context.homeUrl) {
    homeLink.href = context.homeUrl;
  }

  const updateArm = (jointAngle) => {
    const angle = Math.min(180, Math.max(45, Number(jointAngle) || 180));
    const visualAngle = angle - 90;
    const progress = (angle - 45) / 135;
    const radians = (visualAngle * Math.PI) / 180;
    const attachX = 150 + Math.cos(radians) * 40;
    const attachY = 250 + Math.sin(radians) * 40;
    const bicepsThickness = 5 + (1 - progress) * 60;
    const bicepsMidY = 175 - (1 - progress) * 25;
    const tricepsThickness = 5 + progress * 40;
    const tricepsMidY = 175 + progress * 15;
    const tricepsAttachX = 150 + Math.cos(radians) * -15;
    const tricepsAttachY = 250 + Math.sin(radians) * -15;
    const isBent = angle <= 110;

    forearm.setAttribute('transform', 'translate(150, 250) rotate(' + visualAngle + ')');
    biceps.setAttribute('d', 'M 150 120 Q ' + (150 + bicepsThickness) + ' ' + bicepsMidY + ' ' + attachX + ' ' + attachY + ' Q 155 ' + bicepsMidY + ' 150 120');
    triceps.setAttribute('d', 'M 150 110 Q ' + (150 - tricepsThickness) + ' ' + tricepsMidY + ' ' + tricepsAttachX + ' ' + tricepsAttachY + ' Q 145 ' + tricepsMidY + ' 150 110');

    bicepsStatus.textContent = isBent ? '收縮（變短、變厚）' : '舒張（變長、變薄）';
    tricepsStatus.textContent = isBent ? '舒張（變長、變薄）' : '收縮（變短、變厚）';
    bicepsStatus.className = isBent ? 'arm-game__active arm-game__active--green' : '';
    tricepsStatus.className = isBent ? '' : 'arm-game__active arm-game__active--red';
    action.innerHTML = '手臂處於<strong>' + (isBent ? '彎曲' : '伸直') + '</strong>狀態，目前 ' + angle + ' 度。';
    slider.setAttribute('aria-valuetext', angle + ' 度，手臂' + (isBent ? '彎曲' : '伸直'));
  };

  slider.addEventListener('input', () => updateArm(slider.value));
  updateArm(slider.value);
}
