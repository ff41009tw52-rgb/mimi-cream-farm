from pathlib import Path
import re

path = Path('herbgameai-formal.html')
s = path.read_text(encoding='utf-8')

def exact(old, new, expected=1, label='replacement'):
    global s
    count = s.count(old)
    if count != expected:
        raise AssertionError(f'{label}: expected {expected}, found {count}')
    s = s.replace(old, new, expected)

def regex(pattern, repl, expected=1, flags=0, label='regex'):
    global s
    s2, count = re.subn(pattern, repl, s, count=expected if expected > 0 else 0, flags=flags)
    if expected >= 0 and count != expected:
        raise AssertionError(f'{label}: expected {expected}, found {count}')
    s = s2

# 開場：不把內向／慢熟視為需要克服的缺點。
old_intro = '''                <p>在民安國小，香草園服務隊每個星期三都會前往香草園，進行環境整理與照護。</p>
                <p>你即將扮演服務隊中的一員。你原本有些害羞、內向，對香草園的一切也還在慢慢熟悉。</p>
                <p>在這個學期裡，你需要鼓起勇氣認識同學與老師，學習與大家互動、合作，也一步一步認識香草園裡的植物與相關知識。</p>
                <p><strong>而今天……似乎剛好又是星期三。</strong></p>
                <div class="intro-divider"></div>
                <h2>遊戲目標</h2>
                <p>在模擬上學生活的過程中，利用下課時間探索校園，逐步認識香草園服務隊的同學、老師與校園環境。</p>
                <p>這個學期裡，你會和 <strong>11 位香草服務隊同學</strong>一起認識、照顧<strong>12 種香草植物</strong>。你認識的人、經歷過的事件，以及做過的選擇，都可能影響之後的校園生活。</p>'''
new_intro = '''                <p>你剛加入香草園服務隊，和很多同學還不熟。</p>
                <p>有的人一下就能和大家聊起來，有的人喜歡先看看、慢慢熟悉。</p>
                <p>在接下來的校園生活裡，你會透過香草與一次次相處，慢慢認識別人，也更了解自己。</p>
                <p>每個星期三，服務隊都會一起前往香草園。</p>
                <p><strong>而今天……剛好又是星期三。</strong></p>
                <div class="intro-divider"></div>
                <h2>遊戲目標</h2>
                <p>探索校園、認識香草植物，並在一次次相處中認識服務隊的同學與老師。</p>
                <p>這個學期裡，你會和 <strong>11 位香草服務隊同學</strong>一起認識、照顧<strong>12 種香草植物</strong>。你的經歷、做過的選擇，以及和不同角色共同發生的故事，都可能影響之後遇到的事件。</p>'''
exact(old_intro, new_intro, label='intro SEL copy')
exact('text: "可是……我有點害羞，不太敢主動跟校長說早安。"', 'text: "我和校長還不熟，一時不知道要不要主動打招呼。"', label='principal pre-choice copy')
exact('text: "其實校長沒有很可怕。",\n                    trustChange: 5,\n                    trustTarget: "校長",', 'text: "校長也跟我打了招呼。",', label='principal greet no reward')
exact('text: "太好了，校長沒有發現。"', 'text: "今天就先這樣走進去吧。"', label='principal passby neutral 1')
exact('text: "明天再考慮要不要打招呼吧……"', 'text: "下次遇到時，再看看自己想不想打招呼。"', label='principal passby neutral 2')

# 玩家面板與 Day 1 結算：移除觀察力與成人信任數值 UI。
regex(r'\n\s*<div class="stat-card">\s*<div class="stat-label">觀察力</div>\s*<div class="stat-value" id="panel-observation">0</div>\s*</div>', '', label='remove observation stat card')
regex(r'\s*觀察力來自仔細觀察與判斷。每位人物的信任度獨立計算，初始皆為 10；一般角色目前上限為 50，校長上限為 100。老師與校長使用「信任度」，學生使用「羈絆度」。關係資料請到「成員介紹」查看；植物名稱與學習進度請到「香草圖鑑」查看；任務進度請到「目前任務」查看。', '                                植物學習進度請到「香草圖鑑」查看；人物的相處進度只由正式人物事件推進；老師與校長的互動以實際發生過的事件記錄，不以分數評量；任務進度請到「目前任務」查看。', label='panel note SEL')
regex(r'\n\s*<div class="de-summary-row"><span>觀察力</span><span id="de-observation">0</span></div>', '', label='remove end observation row')
regex(r'\n\s*<div class="de-summary-row"><span>陳冠瑋老師信任度</span><span id="de-chen-trust">10 / 50</span></div>', '', label='remove end chen trust')
regex(r'\n\s*<div class="de-summary-row"><span>許恒維老師信任度</span><span id="de-xu-trust">10 / 50</span></div>', '', label='remove end xu trust')
exact('小琳羈絆度', '小琳相處進度', label='end relationship wording')
regex(r'\n\s*\.member-trust \{[^\n]*\}\n\s*\.member-trust-value \{[^\n]*\}', '', flags=re.M, label='remove trust CSS')

# 教師／校長關係資料不再使用 trust 類型。
if s.count('relationshipType:"trust"') != 3:
    raise AssertionError('unexpected staff trust relationship type count')
s = s.replace('relationshipType:"trust"', 'relationshipType:"interaction"')

# 人物圖鑑：第一印象 -> 目前印象，保留 discoveries。
old_impressions = {
    '一直插話、很快跟人熟，下課時間總想往外跑。':'第一次聊天時，她接話很快，也很快把話題帶到遊樂場。',
    '能少講一句就少講一句，比起熱鬧更喜歡離人群遠一點。':'第一次聽他介紹自己時，他話不多，說自己喜歡人少、安靜的後操場角落。',
    '想到就想立刻衝去做，不太喜歡等待。':'第一次見面時，他一說到前操場和打球，整個人就很有精神。',
    '會注意顏色、裝飾、造型和料理，常先看到東西好不好看。':'第一次自我介紹時，他特別提到南瓜馬車的顏色和裝飾。',
    '拿到植物時會先想到故事、節慶、阿嬤和家裡以前怎麼用。':'第一次聊天時，她很快把植物和故事、節慶、家裡的經驗連在一起。',
    '沒確認以前不喜歡亂下結論，常常先安靜看很久。':'第一次見面時，他回答不多，老師說他常在生態池看很久。',
    '嘴巴很直接，但看到別人有事時，手常常比嘴巴先去幫忙。':'第一次見面時，他說話很直接，也很快說出自己喜歡遊戲區的攀爬架。',
    '很容易先想到要不要幫忙，也會注意大家平常從哪裡經過。':'第一次聊天時，她很熟悉南瓜馬車附近的人流和大家平常會經過的地方。',
    '拿到新東西第一件事就是問問題，喜歡比較、分類和驗證。':'第一次自我介紹時，他一提到241自然教室的顯微鏡和標本就很興奮。',
    '不搶話，但會看到大家沒注意的小東西和細節。':'第一次見面時，他注意到後操場牆角那些大家容易忽略的小東西。',
    '喜歡人群和熱鬧，看到有趣的東西會立刻想分享。':'第一次自我介紹時，她很快聊起南瓜馬車附近聊天、拍照的人群。'
}
if s.count('firstImpression:') != 11:
    raise AssertionError('unexpected firstImpression property count')
s = s.replace('firstImpression:', 'currentImpression:')
exact('info.firstImpression', 'info.currentImpression', label='render current impression property')
exact('<strong>第一印象</strong>', '<strong>目前印象</strong>', label='current impression label')
for old, new in old_impressions.items():
    exact(old, new, label=f'impression copy: {old[:8]}')

# 學生相處進度：只由正式人物事件節點推進。
exact('function createInitialStudentRelations(){return Object.fromEntries(Object.entries(STUDENT_INFO).map(([id,info])=>[id,{bond:info.bond,status:info.status,completedEvents:[...info.completedEvents]}]));}',
      'function createInitialStudentRelations(){return Object.fromEntries(Object.entries(STUDENT_INFO).map(([id,info])=>[id,{bond:info.bond,status:info.status,completedEvents:[...info.completedEvents],discoveries:[]}])) ;}', label='student discoveries')
exact('relation=this.gameState.studentRelations[id] || {bond:0,status:"未認識",completedEvents:[]};', 'relation=this.gameState.studentRelations[id] || {bond:0,status:"未認識",completedEvents:[],discoveries:[]};', label='student render fallback')
exact('<div class="member-meta-row"><strong>目前印象</strong><span>${info.currentImpression}</span></div><div class="member-meta-row"><strong>故事進度</strong><span>${relation.status}</span></div>', '<div class="member-meta-row"><strong>目前印象</strong><span>${info.currentImpression}</span></div>${relation.discoveries?.length ? `<div class="member-meta-row"><strong>新的發現</strong><span>${relation.discoveries.join("／")}</span></div>` : ""}<div class="member-meta-row"><strong>故事進度</strong><span>${relation.status}</span></div>', label='new discoveries render')
exact('<div class="member-bond"><span>羈絆度</span><span class="member-bond-value">${relation.bond}%</span></div>', '<div class="member-bond"><span>相處進度</span><span class="member-bond-value">${relation.bond}%</span></div>', label='relationship UI wording')
exact('if(node.bondChange&&node.bondTarget&&this.gameState.studentRelations[node.bondTarget])', 'if(node.bondChange&&node.studentEventComplete&&node.bondTarget&&this.gameState.studentRelations[node.bondTarget])', label='bond gated by event')
exact('title:"【羈絆度變化】",message:`${STUDENT_INFO[node.bondTarget].name} 羈絆度 ${sign}${actual}%（${relation.bond}%）`', 'title:"【相處進度更新】",message:`${STUDENT_INFO[node.bondTarget].name} 相處進度 ${sign}${actual}%（${relation.bond}%）`', label='relationship toast wording')

# 植物圖鑑階段取代數值觀察力。
exact('function createInitialHerbKnowledge(){return Object.fromEntries(HERB_ORDER.map(name=>[name,{appearance:false,identification:false,aroma:false,use:false,caution:false,observation:false}]));}', 'function createInitialHerbKnowledge(){return Object.fromEntries(HERB_ORDER.map(name=>[name,{appearance:false,identification:false,aroma:false,use:false,caution:false,observed:false}]));}\n        function getHerbProgressStage(name,gameState){const k=gameState.herbKnowledge[name]||{};if(gameState.knownPlants.has(name))return {id:"complete",label:"complete｜完整圖鑑 ✓"};const researched=["appearance","identification","aroma","use","caution"].some(key=>k[key]);if(researched)return {id:"researched",label:"researched｜已查詢資料"};if(k.observed)return {id:"observed",label:"observed｜已實際觀察"};return {id:"discovered",label:"discovered｜已知道名稱"};}', label='herb stages')
exact("${completed?'完整圖鑑 ✓':'名稱 ✓・學習中'}", '${getHerbProgressStage(name,this.gameState).label}', label='herb stage label')
exact("knowledge.observation?'已完成':'未完成'", "knowledge.observed?'已完成':'未完成'", label='observed flag render')
exact('addNode(n,"ai_mint_smell_question",{type:"dialogue",speaker:"小琳",speakerType:"npc",text:"很酷吧？你覺得聞起來像什麼？",choices:[', 'addNode(n,"ai_mint_smell_question",{type:"dialogue",speaker:"小琳",speakerType:"npc",text:"很酷吧？你覺得聞起來像什麼？",herbObserved:"薄荷",choices:[', label='mint observed progress')

# 遊戲狀態：刪除 observation 與成人信任分數，新增非數值紀錄。
s, count = re.subn(r'trustByMember:\s*\{[^{}]*\},\s*trustMaxByMember:\s*\{[^{}]*\},\s*observation:\s*0,\s*', '', s)
if count != 2:
    raise AssertionError(f'expected 2 initial score blocks, got {count}')
if s.count('morningGreeting: null,') != 2:
    raise AssertionError('unexpected morningGreeting init count')
s = s.replace('morningGreeting: null,', 'morningGreeting: null, interactionHistory: { principal: [] }, dailyChoices: {}, completedTasks: new Set(), experienceFlags: new Set(),', 2)
regex(r'^\s*panelObservation: document\.getElementById\(\'panel-observation\'\),\n', '', flags=re.M, label='remove observation DOM ref')
exact('if (!this.dom.panelObservation) return;\n                this.dom.panelObservation.innerText = this.gameState.observation;', 'if (!this.dom.panelPlants) return;', label='render panel without observation')

# Staff cards: role + concrete description only.
regex(r'^\s*const trust = this\.gameState\.trustByMember\[name\] \?\? 10;\n', '', flags=re.M, label='remove staff trust local')
regex(r'^\s*const trustMax = this\.gameState\.trustMaxByMember\?\.\[name\] \?\? \(name === "校長" \? 100 : 50\);\n', '', flags=re.M, label='remove staff trust max local')
exact('<span class="member-type-badge">信任度</span>', '<span class="member-type-badge">${name === "校長" ? "校長" : "老師"}</span>', label='staff role badge')
exact('${unlocked ? `<div class="member-trust"><span>信任度</span><span class="member-trust-value">${trust} / ${trustMax}</span></div>` : \'\'}', '', label='remove staff trust display')

# History snapshot / restore.
regex(r'^\s*trustByMember: \{ \.\.\.this\.gameState\.trustByMember \},\n', '', flags=re.M, label='clone remove trust')
regex(r'^\s*trustMaxByMember: \{ \.\.\.this\.gameState\.trustMaxByMember \},\n', '', flags=re.M, label='clone remove trust max')
regex(r'^\s*observation: this\.gameState\.observation,\n', '', flags=re.M, label='clone remove observation')
exact('morningGreeting: this.gameState.morningGreeting ?? null,', 'morningGreeting: this.gameState.morningGreeting ?? null,\n                    interactionHistory: JSON.parse(JSON.stringify(this.gameState.interactionHistory || { principal: [] })),\n                    dailyChoices: { ...(this.gameState.dailyChoices || {}) },\n                    completedTasks: new Set(this.gameState.completedTasks || []),\n                    experienceFlags: new Set(this.gameState.experienceFlags || []),', label='clone records')
exact('studentRelations: Object.fromEntries(Object.entries(this.gameState.studentRelations).map(([id,r])=>[id,{...r,completedEvents:[...r.completedEvents]}]))', 'studentRelations: Object.fromEntries(Object.entries(this.gameState.studentRelations).map(([id,r])=>[id,{...r,completedEvents:[...r.completedEvents],discoveries:[...(r.discoveries||[])]}]))', label='clone discoveries')
regex(r'^\s*trustByMember: \{ \.\.\.\(snapshot\.gameState\.trustByMember \|\| \{ "校長": 10, "陳冠瑋老師": 10, "許恒維老師": 10 \}\) \},\n', '', flags=re.M, label='restore remove trust')
regex(r'^\s*trustMaxByMember: \{ \.\.\.\(snapshot\.gameState\.trustMaxByMember \|\| \{ "校長": 100, "陳冠瑋老師": 50, "許恒維老師": 50 \}\) \},\n', '', flags=re.M, label='restore remove trust max')
regex(r'^\s*observation: snapshot\.gameState\.observation,\n', '', flags=re.M, label='restore remove observation')
exact('morningGreeting: snapshot.gameState.morningGreeting ?? null,', 'morningGreeting: snapshot.gameState.morningGreeting ?? null,\n                    interactionHistory: JSON.parse(JSON.stringify(snapshot.gameState.interactionHistory || { principal: [] })),\n                    dailyChoices: { ...(snapshot.gameState.dailyChoices || {}) },\n                    completedTasks: new Set(snapshot.gameState.completedTasks || []),\n                    experienceFlags: new Set(snapshot.gameState.experienceFlags || []),', label='restore records')
exact('studentRelations: Object.fromEntries(Object.entries(snapshot.gameState.studentRelations || createInitialStudentRelations()).map(([id,r])=>[id,{...r,completedEvents:[...(r.completedEvents||[])]}]))', 'studentRelations: Object.fromEntries(Object.entries(snapshot.gameState.studentRelations || createInitialStudentRelations()).map(([id,r])=>[id,{...r,completedEvents:[...(r.completedEvents||[])],discoveries:[...(r.discoveries||[])]}]))', label='restore discoveries')

# 任務／學習改用具體經歷旗標。
exact('"scene16_01": { type: "dialogue", speaker: "我", speakerType: "player", text: "原來先看清楚再動手，真的很重要。", addObservation: 1, taskProgress: [2, 3], next: "scene16_02" }', '"scene16_01": { type: "dialogue", speaker: "我", speakerType: "player", text: "原來先看清楚再動手，真的很重要。", experienceFlag: "firstHerbGardenObservation", taskProgress: [2, 3], next: "scene16_02" }', label='replace observation point')
exact('this.gameState.questsCompleted++;\n                        this.gameState.currentTask = {', 'this.gameState.questsCompleted++;\n                        this.gameState.completedTasks.add(node.missionComplete.name);\n                        this.gameState.experienceFlags.add(`task:${node.missionComplete.name}`);\n                        this.gameState.currentTask = {', label='mission completion record')
regex(r'\n\s*if \(node\.addObservation\) \{.*?\n\s*\}\n\s*if \(node\.trustChange && node\.trustTarget\) \{.*?\n\s*\}\n', '\n', flags=re.S, label='remove node score effects')
exact('if(node.discoverHerbName&&HERB_INFO[node.discoverHerbName]&&!this.gameState.discoveredHerbNames.has(node.discoverHerbName)){this.gameState.discoveredHerbNames.add(node.discoverHerbName);this.showToast({title:"【香草名稱解鎖】",message:node.discoverHerbName,duration:1800});}', 'if(node.discoverHerbName&&HERB_INFO[node.discoverHerbName]&&!this.gameState.discoveredHerbNames.has(node.discoverHerbName)){this.gameState.discoveredHerbNames.add(node.discoverHerbName);this.showToast({title:"【香草名稱解鎖】",message:node.discoverHerbName,duration:1800});}\n                    if(node.herbObserved&&HERB_INFO[node.herbObserved]){this.gameState.discoveredHerbNames.add(node.herbObserved);if(this.gameState.herbKnowledge[node.herbObserved])this.gameState.herbKnowledge[node.herbObserved].observed=true;}\n                    if(node.experienceFlag)this.gameState.experienceFlags.add(node.experienceFlag);', label='learning records')
regex(r'\n\s*// 未來事件可設定 requiredTrust \+ requiredTrustTarget；指定人物信任不足時走 failureResponse / failureNext\n\s*if \(choice\.requiredTrust && choice\.requiredTrustTarget &&.*?\n\s*return;\n\s*\}\n', '\n', flags=re.S, label='remove trust gate')
regex(r'\n\s*if \(choice\.trustChange && choice\.trustTarget\) \{.*?this\.renderPlayerPanel\(\);\n\s*\}\n', '\n', flags=re.S, label='remove choice score effect')

# 校長互動：只保存行動紀錄。
exact('''                if (choice.setState && typeof choice.setState === "object") {
                    Object.entries(choice.setState).forEach(([key, value]) => {
                        this.gameState[key] = value;
                    });
                }
''', '''                if (choice.setState && typeof choice.setState === "object") {
                    Object.entries(choice.setState).forEach(([key, value]) => {
                        this.gameState[key] = value;
                    });
                    if (Object.prototype.hasOwnProperty.call(choice.setState, "morningGreeting")) {
                        const action = choice.setState.morningGreeting;
                        this.gameState.interactionHistory.principal.push({ week: 1, day: "Wednesday", type: "morningGreeting", action });
                        this.gameState.dailyChoices["week1-wednesday:morningGreeting"] = action;
                    }
                }
''', label='principal interaction history')

# 現有故事中移除成人認可分數。
exact('{ id: "A", text: "沒有啊，我一直都在", trustChange: -5, trustTarget: "陳冠瑋老師", response:', '{ id: "A", text: "沒有啊，我一直都在", setState: { day1LateResponse: "deny" }, response:', label='late A')
exact('{ id: "B", text: "對不起，我忘記今天星期三了",  trustChange: 5, trustTarget: "陳冠瑋老師", response:', '{ id: "B", text: "對不起，我忘記今天星期三了", setState: { day1LateResponse: "admit" }, response:', label='late B')
exact('{ id: "C", text: "老師，我只是去巡視校園", trustChange: -5, trustTarget: "陳冠瑋老師", response:', '{ id: "C", text: "老師，我只是去巡視校園", setState: { day1LateResponse: "patrol" }, response:', label='late C')
exact('{ id: "C", text: "全部拔掉最快", trustChange: -5, trustTarget: "陳冠瑋老師", response:', '{ id: "C", text: "全部拔掉最快", response:', label='plant wrong no penalty')
exact('''                    text: "你有先觀察再判斷，沒有急著動手，做得很好。",
                    trustChange: 5,
                    trustTarget: "許恒維老師",
                    next: "scene14_correct_chen"''', '''                    text: "對，就是先看清楚兩邊的差別，再決定要處理哪一區。",
                    next: "scene14_correct_chen"''', label='plant correct xu')
exact('''                    text: "不錯，這次有先確認再動手。看來可以慢慢放心把香草園的工作交給你了。",
                    trustChange: 5,
                    trustTarget: "陳冠瑋老師",
                    next: "scene16_01"''', '''                    text: "對，就是先確認再動手。今天這一區就照這個方式繼續。",
                    next: "scene16_01"''', label='plant correct chen')
exact('// 正確判斷後，兩位老師分別增加信任度', '// 正確判斷後，老師針對玩家的具體觀察方式給回饋', label='trust comment')

# 下午植物分配：移除人格等號。
old_group = '''            8:[
                {speaker:"小琳",text:"欸，怎麼越看越覺得每個人的植物都很像本人？"},
                {speaker:"陳冠瑋老師",text:"你現在才發現不是隨便抽的喔？"},
                {speaker:"某同學",text:"所以老師真的有故意分？"},
                {speaker:"許恒維老師",text:"有些是我們覺得很適合。"},
                {speaker:"許恒維老師",text:"有些……你們認識久一點以後，自己猜看看。"}
            ]'''
new_group = '''            8:[
                {speaker:"小琳",text:"老師，你們是怎麼分植物的啊？"},
                {speaker:"陳冠瑋老師",text:"有些是看你們平常對什麼有興趣，有些是想讓你們認識以前沒接觸過的。"},
                {speaker:"許恒維老師",text:"先別急著找理由。"},
                {speaker:"許恒維老師",text:"相處一陣子，你們也許會發現，植物和人都比第一眼看到的複雜。"}
            ]'''
exact(old_group, new_group, label='plant assignment theme')
exact('text:"超適合你的啊！"', 'text:"這個名字你今天一定會記得吧！"', label='rosemary joke')
exact('text:"其實這張迷迭香，是我們特別留給你的。"', 'text:"這張迷迭香，就由你來負責。"', label='legacy rosemary wording')

# Demo end renderer。
exact("document.getElementById('de-observation').innerText=this.gameState.observation;document.getElementById('de-students').innerText=`${this.gameState.unlockedStudents.size} / 11`;document.getElementById('de-chen-trust').innerText=`${this.gameState.trustByMember[\"陳冠瑋老師\"]} / 50`;document.getElementById('de-xu-trust').innerText=`${this.gameState.trustByMember[\"許恒維老師\"]} / 50`;document.getElementById('de-mint-bond').innerText=`${this.gameState.studentRelations.mint_student.bond}%`;this.renderPlayerPanel();this.dom.demoEndScreen.classList.add('active');", "document.getElementById('de-students').innerText=`${this.gameState.unlockedStudents.size} / 11`;document.getElementById('de-mint-bond').innerText=`${this.gameState.studentRelations.mint_student.bond}%`;this.renderPlayerPanel();this.dom.demoEndScreen.classList.add('active');", label='demo end renderer')

# Final acceptance.
for token in ['bravery','requiredBravery','braveryChange','addBravery','panel-bravery','de-bravery','勇氣值','勇氣不足','勇氣檢定','勇氣選項','勇氣結局','observation','addObservation','observationChange','panel-observation','de-observation','觀察力','trustByMember','trustMaxByMember','trustChange','trustTarget','requiredTrust','requiredTrustTarget','teacherTrust','chenTrust','xuTrust','principalTrust','信任度不足','信任度變化','校長信任']:
    if token.lower() in s.lower():
        raise AssertionError(f'forbidden old-system token remains: {token}')
for phrase in ['克服害羞','提高勇氣','老師信任增加','老師信任下降','校長信任增加','每個人的植物都很像本人']:
    if phrase in s:
        raise AssertionError(f'old SEL framing remains: {phrase}')
for token in ['目前印象','新的發現','相處進度','interactionHistory','dailyChoices','completedTasks','experienceFlags','discovered｜已知道名稱','observed｜已實際觀察','researched｜已查詢資料','complete｜完整圖鑑 ✓','植物和人都比第一眼看到的複雜','getDay1DiaryText','mint_student_event_01','plant-card-reveal-layer']:
    if token not in s:
        raise AssertionError(f'required calibrated token missing: {token}')
for m in re.finditer(r'bondChange\s*:', s):
    window = s[max(0,m.start()-500):m.start()+500]
    if 'studentEventComplete' not in window:
        raise AssertionError('bondChange found outside formal student event')

path.write_text(s, encoding='utf-8')
print('SEL calibrated HTML bytes:', path.stat().st_size)
