(() => {
  const pageName = decodeURIComponent(location.pathname.split('/').pop() || '');

  const addStyle = (id, css) => {
    if (document.getElementById(id)) return;
    const style = document.createElement('style');
    style.id = id;
    style.textContent = css;
    document.head.appendChild(style);
  };

  const waitFor = (check, callback, attempt = 0) => {
    if (check()) {
      callback();
      return;
    }
    if (attempt < 120) setTimeout(() => waitFor(check, callback, attempt + 1), 80);
  };

  const create = (tag, attributes = {}, html = '') => {
    const element = document.createElement(tag);
    Object.entries(attributes).forEach(([key, value]) => {
      if (key === 'class') element.className = value;
      else element.setAttribute(key, value);
    });
    element.innerHTML = html;
    return element;
  };

  function enhance03() {
    waitFor(
      () => document.querySelector('#root header') && document.querySelector('#root button'),
      () => {
        if (document.getElementById('magnet-learning-guide')) return;
        addStyle('magnet-learning-guide-style', `
          #magnet-learning-guide{max-width:1024px;margin:0 auto 20px;padding:16px;border-radius:18px;background:#fff7d6;border:2px solid #f4c95d;color:#4a3b13;box-shadow:0 7px 18px rgba(126,91,11,.12)}
          #magnet-learning-guide h2{margin:0 0 8px;font-size:20px}#magnet-learning-guide p{margin:6px 0;line-height:1.6}
          .magnet-predictions{display:flex;gap:10px;flex-wrap:wrap;margin:10px 0}.magnet-predictions button{border:0;border-radius:999px;padding:9px 14px;background:#fff;color:#714d00;font-weight:800;cursor:pointer;box-shadow:0 2px 0 #e4bf55}.magnet-predictions button:hover{transform:translateY(-1px)}
          .magnet-task-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:8px;margin-top:10px}.magnet-task{background:#fff;border-radius:12px;padding:10px;border:1px solid #ead49a;font-size:14px}.magnet-task.done{background:#e4f7e8;border-color:#65b774;color:#175d2d}.magnet-task.done::before{content:'✓ ';font-weight:900}
          .magnet-record{width:100%;border-collapse:collapse;margin-top:12px;background:#fff;font-size:14px}.magnet-record th,.magnet-record td{border:1px solid #e6d8a8;padding:7px;text-align:left}.magnet-record th{background:#fff2ba}.magnet-arrow{margin-top:10px;padding:9px 12px;border-radius:10px;background:#e6f1ff;color:#1e5c9f;font-weight:800}
        `);

        const guide = create('section', { id: 'magnet-learning-guide' }, `
          <h2>🧲 先猜一猜，再動手做</h2>
          <p>通電後，指北針的紅色 N 極會不會轉動？先選一個答案，再開始實驗。</p>
          <div class="magnet-predictions">
            <button type="button" data-magnetic-prediction="會轉動">我猜：會轉動</button>
            <button type="button" data-magnetic-prediction="不會轉動">我猜：不會轉動</button>
          </div>
          <p id="magnet-prediction-feedback" aria-live="polite">選好後，依序完成下方四個任務。</p>
          <div class="magnet-task-list">
            <div class="magnet-task" data-magnet-task="power">任務 1：接通電路，觀察指北針。</div>
            <div class="magnet-task" data-magnet-task="reverse">任務 2：切換電池方向，看看 N 極往哪裡轉。</div>
            <div class="magnet-task" data-magnet-task="below">任務 3：把導線移到指北針下方。</div>
            <div class="magnet-task" data-magnet-task="record">任務 4：完成觀察紀錄。</div>
          </div>
          <div class="magnet-arrow" id="magnet-flow-arrow">電流方向提示：開啟電源後，留意電池方向與箭頭的改變。</div>
          <table class="magnet-record"><thead><tr><th>我的操作</th><th>我看到的現象</th></tr></thead><tbody id="magnet-record-body"><tr><td>通電前</td><td>指北針安靜指向北方。</td></tr></tbody></table>
        `);
        const header = document.querySelector('#root header');
        header.insertAdjacentElement('afterend', guide);

        const state = { predicted: false, power: false, reverse: false, below: false, records: new Set() };
        const update = () => {
          const power = guide.querySelector('[data-magnet-task="power"]');
          const reverse = guide.querySelector('[data-magnet-task="reverse"]');
          const below = guide.querySelector('[data-magnet-task="below"]');
          const record = guide.querySelector('[data-magnet-task="record"]');
          power.classList.toggle('done', state.power);
          reverse.classList.toggle('done', state.reverse);
          below.classList.toggle('done', state.below);
          record.classList.toggle('done', state.power && state.reverse && state.below);
          guide.querySelector('#magnet-flow-arrow').textContent = state.reverse
            ? '電流方向提示：電池方向反過來時，指北針偏轉方向也會改變。'
            : '電流方向提示：開啟電源後，留意電池方向與箭頭的改變。';
        };
        const addRecord = (action, observation) => {
          if (state.records.has(action)) return;
          state.records.add(action);
          guide.querySelector('#magnet-record-body').insertAdjacentHTML('beforeend', `<tr><td>${action}</td><td>${observation}</td></tr>`);
        };
        guide.addEventListener('click', (event) => {
          const button = event.target.closest('[data-magnetic-prediction]');
          if (!button) return;
          state.predicted = true;
          const guess = button.dataset.magneticPrediction;
          guide.querySelector('#magnet-prediction-feedback').textContent = `你猜「${guess}」。現在用實驗來找答案！`;
          guide.querySelectorAll('[data-magnetic-prediction]').forEach(item => item.disabled = true);
        });
        document.addEventListener('click', (event) => {
          const button = event.target.closest('button');
          if (!button || guide.contains(button)) return;
          const label = (button.textContent || '').replace(/\s+/g, '');
          if (label.includes('接通電路')) {
            state.power = true;
            addRecord('接通電路', '指北針的 N 極開始偏轉。');
          }
          if (label.includes('切換電池方向')) {
            state.reverse = true;
            addRecord('切換電池方向', 'N 極改往另一個方向偏轉。');
          }
          if (label.includes('指北針下方')) {
            state.below = true;
            addRecord('導線移到下方', '導線位置不同，偏轉方向也會不同。');
          }
          update();
        }, true);
      }
    );
  }

  function enhance04() {
    waitFor(
      () => document.getElementById('beakersContainer') && document.querySelectorAll('.beaker').length,
      () => {
        if (document.getElementById('indicator-record-card')) return;
        addStyle('indicator-record-style', `
          body{background:radial-gradient(circle at top,#3f2a72 0%,#1f1b45 55%,#11142d 100%)!important;min-height:100vh!important;color:#fff!important;padding-bottom:30px}.instructions{background:rgba(255,255,255,.16)!important;border:1px solid rgba(255,255,255,.25)}
          #indicator-record-card{width:min(900px,92vw);background:rgba(255,255,255,.96);color:#30234e;border-radius:18px;padding:16px 18px;box-sizing:border-box;box-shadow:0 10px 24px rgba(0,0,0,.25);margin:6px 0 16px}#indicator-record-card h2{margin:0 0 8px;font-size:20px}#indicator-record-card p{margin:6px 0;line-height:1.55}
          #indicator-record-table{width:100%;border-collapse:collapse;font-size:15px;margin-top:10px}#indicator-record-table th,#indicator-record-table td{border:1px solid #cfc8e8;padding:8px;text-align:center}#indicator-record-table th{background:#ece8ff}#indicator-record-table td{min-width:120px}
          .beaker-wrapper{cursor:pointer}.beaker-wrapper::after{content:'也可以直接點燒杯';display:block;text-align:center;font-size:11px;color:#d6d0ff;margin-top:4px}
        `);
        const card = create('section', { id: 'indicator-record-card' }, `
          <h2>📝 變色紀錄表</h2>
          <p>選擇一種天然色素後，可以拖曳滴管，也可以<strong>直接點燒杯</strong>，觀察顏色變化並完成紀錄。</p>
          <table id="indicator-record-table"><thead><tr><th>液體</th><th>高麗菜汁顏色</th><th>蝶豆花顏色</th></tr></thead><tbody></tbody></table>
          <p><strong>小結：</strong>不同液體會讓天然色素變成不同顏色，所以可以幫助我們分辨酸性、鹼性和中性。</p>
        `);
        const instructions = document.querySelector('.instructions');
        instructions.insertAdjacentElement('afterend', card);
        const tbody = card.querySelector('tbody');
        const labels = ['檸檬汁', '食鹽水', '小蘇打水', '清水'];
        const resetRows = () => {
          tbody.innerHTML = labels.map(label => `<tr data-liquid="${label}"><td>${label}</td><td>—</td><td>—</td></tr>`).join('');
        };
        resetRows();
        const syncResults = () => {
          const isCabbage = (document.getElementById('bottleLabel')?.textContent || '').includes('高麗菜');
          document.querySelectorAll('.beaker-wrapper').forEach(wrapper => {
            const liquid = wrapper.querySelector('.beaker-label')?.textContent?.trim();
            const result = wrapper.querySelector('.result-tag')?.textContent?.trim();
            const row = [...tbody.querySelectorAll('tr')].find(item => item.dataset.liquid === liquid);
            if (!row || !result) return;
            row.children[isCabbage ? 1 : 2].textContent = result;
          });
        };
        const observer = new MutationObserver(() => {
          if (document.querySelectorAll('.beaker-wrapper').length === 4 && tbody.children.length !== 4) resetRows();
          syncResults();
        });
        observer.observe(document.getElementById('beakersContainer'), { childList: true, subtree: true, characterData: true });
        document.getElementById('beakersContainer').addEventListener('click', (event) => {
          const beaker = event.target.closest('.beaker');
          if (!beaker || beaker.dataset.filled !== 'false' || typeof window.performTitration !== 'function') return;
          const rect = beaker.getBoundingClientRect();
          window.performTitration(beaker, rect.left + rect.width / 2, rect.top + 8);
        });
      }
    );
  }

  function enhance05() {
    waitFor(
      () => document.getElementById('ui-container') && document.getElementById('s-title'),
      () => {
        if (document.getElementById('separation-thinking-card')) return;
        addStyle('separation-thinking-style', `
          #separation-thinking-card{margin-top:12px;background:#fff7e6;border:2px solid #ffc46b;border-radius:12px;padding:10px;color:#623a0b;font-size:14px;line-height:1.5}.separation-answer-row{display:flex;gap:6px;flex-wrap:wrap;margin-top:7px}.separation-answer-row button,#replay-step-btn,#collapse-dialogue-btn{border:0;border-radius:999px;padding:7px 10px;font-size:13px;font-weight:800;background:#fff;color:#8b4a00;box-shadow:0 2px 0 #e4a44b;cursor:pointer}.separation-answer-row button[data-correct="true"]{background:#eaf8e8;color:#1d6a31}.separation-answer-row button[data-correct="false"]{background:#fff0f0;color:#a13b3b}#separation-feedback{min-height:20px;margin-top:6px;font-weight:700}.dialogue-collapse-wrap{position:absolute;right:10px;top:-14px;z-index:3}.dialogue-collapsed .bubble-box{display:none}.dialogue-collapsed{justify-content:flex-end!important;height:80px!important}.dialogue-collapsed .cat-container{transform:scale(.75)!important}.separation-final{position:fixed;inset:auto 50% 22px auto;transform:translateX(50%);z-index:50;width:min(520px,86vw);background:#fff;border:3px solid #ffb74d;border-radius:18px;padding:15px;color:#50320f;box-shadow:0 10px 25px rgba(0,0,0,.25);display:none}.separation-final.show{display:block}
        `);
        const card = create('section', { id: 'separation-thinking-card' }, `
          <strong id="separation-question">🔎 停下來想一想：哪一種物質會溶到水裡？</strong>
          <div class="separation-answer-row" id="separation-answer-row"></div>
          <div id="separation-feedback" aria-live="polite"></div>
          <button type="button" id="replay-step-btn">🔁 再看一次這一步</button>
        `);
        document.getElementById('ui-container').appendChild(card);
        const finalCard = create('aside', { class: 'separation-final', id: 'separation-final' }, `<strong>🎉 分離成果</strong><p>篩網上留下的是<strong>沙子</strong>；流下去的是<strong>食鹽水</strong>。想拿回食鹽，還要把食鹽水放進蒸發皿，讓水慢慢蒸發。</p><p><strong>原因：</strong>食鹽能溶於水，沙子不容易溶於水。</p>`);
        document.body.appendChild(finalCard);
        const prompts = {
          '觀察混合物': { q: '哪一種物質會溶到水裡？', options: [['食鹽', true], ['沙子', false]], right: '答對了！食鹽可以溶到水裡。' },
          '加水溶解': { q: '加水後，下一步為什麼要攪拌？', options: [['讓食鹽更快溶解', true], ['讓沙子變大顆', false]], right: '答對了！攪拌可以幫助食鹽更快溶解。' },
          '攪拌加速溶解': { q: '攪拌後，哪一種物質還看得見？', options: [['沙子', true], ['食鹽', false]], right: '答對了！沙子沒有溶掉，仍然看得見。' },
          '準備過濾': { q: '過濾時，哪一種物質會留在篩網上？', options: [['沙子', true], ['食鹽水', false]], right: '答對了！沙子會被篩網攔住。' },
          '過濾分離': { q: '流到下方燒杯的是什麼？', options: [['食鹽水', true], ['乾的食鹽', false]], right: '答對了！食鹽溶在水裡，所以會跟著水流下去。' }
        };
        const refreshPrompt = () => {
          const title = document.getElementById('s-title')?.textContent || '';
          const key = Object.keys(prompts).find(item => title.includes(item));
          const data = prompts[key] || prompts['觀察混合物'];
          card.querySelector('#separation-question').textContent = `🔎 停下來想一想：${data.q}`;
          card.querySelector('#separation-answer-row').innerHTML = data.options.map(([label, correct]) => `<button type="button" data-correct="${correct}">${label}</button>`).join('');
          card.querySelector('#separation-feedback').textContent = '';
          finalCard.classList.toggle('show', title.includes('實驗完成'));
        };
        card.addEventListener('click', event => {
          const answer = event.target.closest('[data-correct]');
          if (answer) {
            const ok = answer.dataset.correct === 'true';
            card.querySelector('#separation-feedback').textContent = ok ? '✅ 答對了！觀察得很仔細。' : '💡 再看看這一步的現象，想想哪一種物質會溶進水裡。';
          }
          if (event.target.id === 'replay-step-btn') {
            const bubble = document.querySelector('.bubble-box');
            bubble?.animate([{ transform: 'scale(.96)' }, { transform: 'scale(1)' }], { duration: 320 });
            card.querySelector('#separation-feedback').textContent = '🔁 已經幫你再次提醒這一步的重點，看看橘咪咪和白奶油的對話吧！';
          }
        });
        const dialogue = document.getElementById('dialogue-area');
        const collapseWrap = create('div', { class: 'dialogue-collapse-wrap' }, '<button type="button" id="collapse-dialogue-btn">收合對話</button>');
        dialogue.appendChild(collapseWrap);
        collapseWrap.addEventListener('click', () => {
          dialogue.classList.toggle('dialogue-collapsed');
          collapseWrap.querySelector('button').textContent = dialogue.classList.contains('dialogue-collapsed') ? '展開對話' : '收合對話';
        });
        new MutationObserver(refreshPrompt).observe(document.getElementById('s-title'), { childList: true, characterData: true, subtree: true });
        refreshPrompt();
      }
    );
  }

  function enhance06() {
    waitFor(
      () => document.querySelectorAll('.char-card').length === 2,
      () => {
        if (document.getElementById('farm-role-note')) return;
        addStyle('farm-role-style', `
          .farm-role-note{background:#f6fff0;border:2px dashed #8bc34a;border-radius:12px;padding:12px;margin:0 0 16px;color:#355c18;line-height:1.6}.char-card{cursor:pointer}.char-card:focus-within,.char-card:hover{outline:3px solid rgba(255,183,77,.35)}.farm-speech{margin-top:12px;padding:10px 12px;border-radius:12px;background:#fff8e1;color:#704a12;font-weight:700;display:none}.farm-speech.show{display:block}
        `);
        const title = document.querySelector('.intro-title');
        title.insertAdjacentHTML('afterend', `<section id="farm-role-note" class="farm-role-note"><strong>農場任務分工：</strong>橘咪咪負責仔細觀察，白奶油負責提出問題。點一點角色卡，聽聽他們想說什麼！</section>`);
        const cards = [...document.querySelectorAll('.char-card')];
        const data = [
          { title: '🔎 橘咪咪是農場觀察員', tags: ['#仔細觀察', '#發現問題', '#記錄線索'], text: '我最會找細節！植物葉子變黃、土壤太乾，通通逃不過我的眼睛。', speech: '我發現葉子好像不太有精神，我們先看看它需要什麼！' },
          { title: '💡 白奶油是農場提問員', tags: ['#勇敢提問', '#想方法', '#科學推理'], text: '我喜歡問「為什麼」。只要有問題，我就會和大家一起想出可以試試看的方法。', speech: '我有一個問題！改變陽光或水分，結果會不會不一樣呢？' }
        ];
        cards.forEach((card, index) => {
          const info = data[index];
          card.querySelector(index === 0 ? '.mimi-header' : '.cream-header').textContent = info.title;
          card.querySelector('.tags').innerHTML = info.tags.map(tag => `<span class="tag ${index === 0 ? 'mimi-tag' : 'cream-tag'}">${tag}</span>`).join('');
          card.querySelector('.description').textContent = info.text;
          const speech = create('div', { class: 'farm-speech', 'aria-live': 'polite' }, `💬 ${info.speech}`);
          card.querySelector('.card-body').appendChild(speech);
          card.tabIndex = 0;
          const toggleSpeech = () => speech.classList.toggle('show');
          card.addEventListener('click', toggleSpeech);
          card.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); toggleSpeech(); } });
        });
        const ownerButton = document.querySelector('.floating-owner-btn');
        if (ownerButton) ownerButton.textContent = '👨‍🏫 認識農場老師';
        document.querySelector('.footer-nav')?.remove();
      }
    );
  }

  function enhance07() {
    waitFor(
      () => document.getElementById('missionBox') && typeof window.getAirLabState === 'function',
      () => {
        if (document.getElementById('air-lab-learning-card')) return;
        addStyle('air-lab-learning-style', `
          #air-lab-learning-card{margin-top:12px;background:rgba(255,255,255,.94);border-radius:14px;padding:12px;box-shadow:0 5px 12px rgba(0,0,0,.08)}#air-lab-learning-card h2{font-size:17px;margin:0 0 8px;color:#244b6c}.air-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin:8px 0}.air-metric{background:#eaf6ff;border-radius:10px;padding:9px;text-align:center}.air-metric span{display:block;font-size:12px;color:#567}.air-metric strong{font-size:18px;color:#195a8c}.air-predict{display:flex;gap:6px;flex-wrap:wrap}.air-predict button{border:0;border-radius:999px;background:#edf7ff;padding:7px 10px;font-weight:800;color:#28608f;cursor:pointer}.air-predict button:hover{background:#cdeaff}.air-conclusion{margin-top:8px;border-radius:10px;padding:9px;background:#e9f8e7;color:#255b27;font-weight:700;display:none}.air-conclusion.show{display:block}
        `);
        const card = create('section', { id: 'air-lab-learning-card' }, `
          <h2>💨 先預測，再觀察</h2>
          <p style="margin:0 0 7px;line-height:1.5">把活塞往下壓時，空氣粒子會變得比較分散，還是比較擠？</p>
          <div class="air-predict"><button type="button" data-air-answer="spread">比較分散</button><button type="button" data-air-answer="close">比較擠</button></div>
          <p id="air-predict-feedback" style="min-height:20px;margin:7px 0 0;font-weight:700"></p>
          <div class="air-metrics"><div class="air-metric"><span>現在空氣體積</span><strong id="air-volume">0 mL</strong></div><div class="air-metric"><span>空氣擠得多不多</span><strong id="air-density">鬆鬆的</strong></div></div>
          <div class="air-conclusion" id="air-conclusion">🎉 空間變小時，空氣粒子會靠得更近、跑得更快。</div>
        `);
        document.querySelector('.left-panel').appendChild(card);
        card.addEventListener('click', event => {
          const answer = event.target.closest('[data-air-answer]');
          if (!answer) return;
          document.getElementById('air-predict-feedback').textContent = answer.dataset.airAnswer === 'close' ? '✅ 答對了！空間變小時，空氣會擠在一起。' : '💡 再想一想：同樣多的空氣，被放進更小的空間會怎樣？';
        });
        setInterval(() => {
          const state = window.getAirLabState();
          if (!state) return;
          const volume = Math.round(state.volume || 0);
          const targetLine = document.getElementById('targetLine');
          const targetLabel = targetLine?.querySelector('.target-label');
          document.getElementById('air-volume').textContent = `${volume} mL`;
          const packed = state.isBlocked && volume < 20;
          document.getElementById('air-density').textContent = packed ? '擠在一起' : '鬆鬆的';
          const closeToTarget = Math.abs(volume - 20) <= 2;
          const reachedTarget = Math.abs(volume - 20) <= 0.7;
          if (targetLine) targetLine.style.backgroundColor = reachedTarget ? '#22c55e' : closeToTarget ? '#facc15' : '#ef4444';
          if (targetLabel) { targetLabel.style.backgroundColor = reachedTarget ? '#16a34a' : closeToTarget ? '#ca8a04' : '#ef4444'; targetLabel.textContent = reachedTarget ? '完成 20 mL！' : '20 mL'; }
          document.getElementById('air-conclusion').classList.toggle('show', Number(state.step) >= 4);
        }, 180);
      }
    );
  }

  function enhance08() {
    waitFor(
      () => document.querySelector('#root h1') && document.querySelector('#root button'),
      () => {
        if (document.getElementById('circuit-guide')) return;
        addStyle('circuit-guide-style', `
          #circuit-guide{width:min(980px,94vw);margin:12px auto 0;background:#eff9ff;border:2px solid #8ecdf2;border-radius:16px;padding:12px 16px;color:#1f4d70;box-sizing:border-box}#circuit-guide h2{margin:0 0 6px;font-size:19px}.circuit-mode-row{display:flex;gap:8px;flex-wrap:wrap;margin:8px 0}.circuit-mode-row button{border:0;border-radius:999px;padding:8px 12px;font-weight:800;cursor:pointer;background:#d6efff;color:#155f94}.circuit-mode-row button.active{background:#2f96d4;color:#fff}.circuit-steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px}.circuit-step{background:#fff;border:1px solid #b7dcef;border-radius:10px;padding:8px;font-size:14px}.circuit-step.done{background:#e5f7e8;border-color:#6fc879;color:#1f6d33}.circuit-step.done::before{content:'✓ ';font-weight:900}.circuit-tip{margin:8px 0 0;background:#fff7d8;border-radius:9px;padding:8px;font-weight:700;color:#725100}
        `);
        const guide = create('section', { id: 'circuit-guide' }, `
          <h2>💡 電路跟著做</h2>
          <div class="circuit-mode-row"><button type="button" class="active" data-circuit-mode="guided">跟著做</button><button type="button" data-circuit-mode="free">自由挑戰</button></div>
          <div class="circuit-steps"><div class="circuit-step" data-circuit-step="one">第 1 步：把電池正極連到燈泡底部的小圓點。</div><div class="circuit-step" data-circuit-step="two">第 2 步：把電池負極連到燈泡旁邊的金屬螺紋。</div><div class="circuit-step" data-circuit-step="three">第 3 步：按「開啟電源」，讓電流走成完整圈圈。</div></div>
          <div class="circuit-tip" id="circuit-tip">提示：接錯時按「↶ 上一步」就能移除最後一條電線。</div>
        `);
        const toolbar = document.querySelector('#root h1')?.closest('div[class*="bg-white"]');
        toolbar?.insertAdjacentElement('beforebegin', guide);
        let freeMode = false;
        const update = () => {
          const wireCount = document.querySelectorAll('svg path[stroke="#000000"]').length;
          const status = [...document.querySelectorAll('#root div')].map(node => node.textContent || '').find(text => text.includes('完整迴路') || text.includes('兩個接點')) || '';
          guide.querySelector('[data-circuit-step="one"]').classList.toggle('done', wireCount >= 1);
          guide.querySelector('[data-circuit-step="two"]').classList.toggle('done', wireCount >= 2);
          guide.querySelector('[data-circuit-step="three"]').classList.toggle('done', status.includes('完整迴路'));
          guide.querySelector('#circuit-tip').textContent = status.includes('完整迴路')
            ? '🎉 燈泡會亮，是因為兩個接點分別連到電池正、負極，電流走成完整的圈圈。'
            : freeMode ? '自由挑戰中：可以增加元件、旋轉元件，測試不同接法。' : '提示：先用一顆電池和一顆燈泡完成基本迴路。';
        };
        guide.addEventListener('click', event => {
          const button = event.target.closest('[data-circuit-mode]');
          if (!button) return;
          freeMode = button.dataset.circuitMode === 'free';
          guide.querySelectorAll('[data-circuit-mode]').forEach(item => item.classList.toggle('active', item === button));
          update();
        });
        new MutationObserver(update).observe(document.getElementById('root'), { childList: true, subtree: true, characterData: true });
        setInterval(update, 350);
        update();
      }
    );
  }

  function enhance09() {
    waitFor(
      () => document.getElementById('start-screen') && document.getElementById('score-display'),
      () => {
        if (document.getElementById('badge-mission-note')) return;
        addStyle('badge-mission-style', `#badge-mission-note{background:rgba(255,255,255,.16);border:1px solid rgba(255,255,255,.35);padding:12px 16px;border-radius:14px;line-height:1.65;color:#fff;margin:10px auto;max-width:85%;font-weight:700}#badge-mission-note span{display:inline-block;margin:3px 6px;padding:3px 8px;border-radius:999px;background:rgba(0,0,0,.22)}`);
        document.getElementById('start-screen').insertAdjacentHTML('beforeend', '<div id="badge-mission-note">完成三個分類任務，獲得三枚徽章：<br><span>🍋 酸性小達人</span><span>🫧 鹼性小達人</span><span>🧂 中性小達人</span></div>');
      }
    );
  }

  function enhance10() {
    waitFor(
      () => document.querySelector('.intro-text') && document.querySelector('.feature-box'),
      () => {
        if (document.getElementById('teacher-promise-list')) return;
        addStyle('teacher-cottage-style', `
          #teacher-promise-list{display:grid;gap:9px;margin:18px 0}.teacher-promise{border-radius:12px;padding:11px 13px;background:#eff8e9;border-left:5px solid #6fa83f;font-weight:800;color:#315b1d}.teacher-surprise{margin-top:18px;border:2px dashed #c8b6e8;border-radius:12px;background:#faf7ff;padding:4px 13px}.teacher-surprise summary{cursor:pointer;font-weight:900;color:#6b3fa0;padding:10px 0}.teacher-surprise .feature-box{margin-top:0;background:transparent;border-left:0;padding:5px 0}
        `);
        const intro = document.querySelector('.intro-text');
        intro.innerHTML = '歡迎來到老師的科學小屋！在這裡，我們不只記住答案，也會用自己的眼睛、雙手和想法找到答案。';
        const promise = create('section', { id: 'teacher-promise-list' }, '<div class="teacher-promise">👀 我們會先觀察。</div><div class="teacher-promise">👐 我們會自己動手做。</div><div class="teacher-promise">🤝 我們會一起找答案。</div>');
        intro.insertAdjacentElement('afterend', promise);
        const feature = document.querySelector('.feature-box');
        const details = create('details', { class: 'teacher-surprise' }, '<summary>🎁 老師的小驚喜</summary>');
        feature.parentElement.insertBefore(details, feature);
        details.appendChild(feature);
        document.querySelector('.footer-nav')?.remove();
      }
    );
  }

  const run = () => {
    if (pageName === '03.html') enhance03();
    if (pageName === '04.html') enhance04();
    if (pageName === '05.html') enhance05();
    if (pageName === '06.html') enhance06();
    if (pageName === '07.html') enhance07();
    if (pageName === '08.html') enhance08();
    if (pageName === '09.html') enhance09();
    if (pageName === '10.html') enhance10();
  };

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', run, { once: true });
  else run();
})();
