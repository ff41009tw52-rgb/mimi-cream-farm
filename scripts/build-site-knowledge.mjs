import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const gamesDataPath = path.join(repoRoot, 'games-data.js');
const source = fs.readFileSync(gamesDataPath, 'utf8');
const sandbox = { window: {} };
vm.runInNewContext(source, sandbox, { filename: gamesDataPath });

const publishedGames = sandbox.window.FARM_GAMES;
if (!Array.isArray(publishedGames)) {
  throw new Error('games-data.js did not expose window.FARM_GAMES');
}

const topicMeta = {
  '01': ['物質與材料', ['物質特性', '觀察', '分類']],
  '02': ['物質與材料', ['物質特性', '分類']],
  '03': ['電與磁', ['電磁鐵', '磁力']],
  '04': ['酸鹼反應', ['酸鹼', '滴定', '指示劑']],
  '05': ['混合物分離', ['過濾', '蒸發', '分離']],
  '06': ['網站角色', ['農場角色', '網站介紹']],
  '07': ['空氣與力', ['空氣', '壓縮', '彈性']],
  '08': ['電路', ['燈泡', '導體', '串聯', '並聯']],
  '09': ['酸鹼反應', ['酸性', '中性', '鹼性']],
  '10': ['教師專區', ['教師介紹', '教學資源']],
  '11': ['植物', ['蔬菜', '食用部位', '植物構造']],
  '12': ['植物與季節', ['季節', '蔬菜', '生長']],
  '13': ['酸鹼反應', ['酸性', '中性', '鹼性']],
  '14': ['植物', ['播種', '種子', '生長條件']],
  '15': ['簡單機械', ['槓桿', '施力點', '支點', '抗力點']],
  '16': ['電路', ['燈泡', '導體', '串聯', '並聯']],
  '17': ['水域環境', ['水生植物', '水生動物', '環境']],
  '18': ['簡單機械', ['輪軸', '省力', '費力']],
  '19': ['星空', ['星座', '觀測', '方位']],
  '20': ['植物', ['向光性', '光線', '生長']],
  '21': ['水的變化', ['凝固', '結冰', '溫度']],
  '22': ['物質變化', ['可逆變化', '加熱', '冷卻']],
  '23': ['天氣與作物', ['天氣', '蔬菜', '防災']],
  '24': ['水的三態', ['固態', '液態', '氣態']],
  '25': ['動物', ['動物特徵', '分類']],
  '26': ['人體運動', ['肌肉', '骨骼', '關節']],
  '27': ['水與力', ['虹吸', '水位差', '水流']],
  '28': ['溫度', ['溫度計', '測量', '讀值']],
  '29': ['資訊科技', ['電腦', '基本配備']],
  '30': ['簡單機械', ['齒輪', '轉動', '方向']],
  '31': ['昆蟲', ['甲蟲', '身體構造', '生活史']],
  '32': ['動物行為', ['鬥魚', '領域行為', '觀察']],
  '33': ['人體運動', ['肌肉', '骨骼', '關節']],
  '34': ['水與力', ['虹吸', '水位差', '水流']],
  '35': ['簡單機械', ['槓桿', '滑輪', '輪軸']],
  '36': ['簡單機械', ['槓桿', '施力點', '支點', '抗力點']],
  '37': ['教師專區', ['教師檢定', '歷屆試題']],
  '38': ['教師專區', ['教師檢定', '歷屆試題']],
  '39': ['天氣', ['雨量', '測量', '紀錄']],
  '40': ['植物', ['高麗菜', '生長', '栽培']],
  '41': ['地表的變化', ['礫石', '沙', '土壤', '流水作用']]
};

const curriculumLinks = {
  '08': [{ grade: '4', semester: '上', unit: '第四單元', title: '好玩的電路', confidence: 'confirmed' }],
  '16': [{ grade: '4', semester: '上', unit: '第四單元', title: '好玩的電路', confidence: 'confirmed' }],
  '17': [{ grade: '4', semester: '上', unit: '第二單元', title: '水生生物與環境', confidence: 'confirmed' }],
  '41': [{ grade: '4', semester: '上', unit: '第一單元', title: '地表的靜與動', confidence: 'confirmed' }]
};

const unlistedModules = {
  '06': { title: '關於農場主', type: 'info', audience: 'all', note: '模組存在，但目前未收錄於首頁遊戲資料。' },
  '10': { title: '老師的科學小屋', type: 'teacher-resource', audience: 'teacher', note: '教師介紹頁，不列為學生遊戲推薦。' },
  '13': { title: '橘咪咪與白奶油的實驗室', type: 'game', audience: 'student', note: '酸鹼中性接物遊戲；模組存在但未在首頁發布。' },
  '23': { title: '科學農場大挑戰：天氣與蔬菜保衛戰', type: 'game', audience: 'student', note: '模組存在但未在首頁發布。' },
  '29': { title: '1-4 電腦和基本配備', type: 'learning-module', audience: 'student', note: '資訊科技主題；模組存在但未在首頁發布。' },
  '34': { title: '虹吸現象互動實驗', type: 'experiment', audience: 'student', note: '與 27 號主題重疊；模組存在但未在首頁發布。' },
  '36': { title: '自然科學實驗：槓桿原理', type: 'experiment', audience: 'student', note: '模組存在但未在首頁發布。' },
  '37': { title: '教檢歷屆刷題系統', type: 'teacher-resource', audience: 'teacher', note: '教師檢定資源，不列為學生遊戲推薦。' },
  '38': { title: '教檢歷屆刷題系統（110–114完整版）', type: 'teacher-resource', audience: 'teacher', note: '教師檢定資源，不列為學生遊戲推薦。' }
};

const publishedById = new Map(publishedGames.map((game) => [String(game.gameNumber).padStart(2, '0'), game]));
const games = [];

for (let number = 1; number <= 41; number += 1) {
  const id = String(number).padStart(2, '0');
  const published = publishedById.get(id);
  const modulePath = path.join(repoRoot, 'games', id, 'index.js');
  const modulePresent = fs.existsSync(modulePath);
  const fallback = unlistedModules[id];
  const status = published ? 'published' : modulePresent ? 'unlisted' : 'missing';
  const [topicGroup, topics] = topicMeta[id] || ['其他', []];
  const type = published ? 'game' : (fallback?.type || 'unknown');
  const audience = published ? 'student' : (fallback?.audience || 'unknown');

  games.push({
    id,
    title: published?.title || fallback?.title || '未命名模組 ' + id,
    displayTitle: id + '．' + (published?.title || fallback?.title || '未命名模組'),
    type,
    audience,
    grades: published?.grades || [],
    gradeLabel: published?.gradeLabel || null,
    subject: '自然科學',
    topicGroup,
    topics,
    curriculumLinks: curriculumLinks[id] || [],
    description: published?.description || '',
    aliases: published?.aliases || [],
    status,
    homepagePublished: Boolean(published),
    modulePresent,
    recommendable: Boolean(published && audience === 'student'),
    supportLevel: published ? 'catalog-confirmed' : modulePresent ? 'module-confirmed' : 'missing',
    url: published?.url || null,
    moduleUrl: modulePresent ? 'games/' + id + '/index.html' : null,
    publishedAt: published?.publishedAt || null,
    ...(fallback?.note ? { notes: fallback.note } : {})
  });
}

const summary = games.reduce((result, game) => {
  result[game.status] += 1;
  if (game.modulePresent) result.moduleFilesPresent += 1;
  return result;
}, { published: 0, unlisted: 0, missing: 0, moduleFilesPresent: 0 });

const output = {
  schemaVersion: '1.0.0',
  generatedOn: '2026-09-18',
  sourceOfTruth: {
    publishedCatalog: 'games-data.js',
    modulePattern: 'games/NN/index.js',
    note: '首頁是否發布，以 games-data.js 為準；只有模組存在，不代表可向學生推薦。'
  },
  assistantPolicy: {
    recommendationRule: 'Only recommend entries where recommendable is true.',
    neverInventRules: true,
    unlistedHandling: '可說明模組存在，但必須明確標示尚未在首頁發布，且不要主動推薦。',
    teacherResourceHandling: '教師專區與教檢資源不可當作學生遊戲推薦。'
  },
  summary: {
    totalSlots: games.length,
    ...summary
  },
  games
};

const outputPath = path.join(repoRoot, 'data', 'site-knowledge.json');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, JSON.stringify(output, null, 2) + '\n');
console.log('Wrote ' + path.relative(repoRoot, outputPath) + ': ' + games.length + ' entries (' + summary.published + ' published, ' + summary.unlisted + ' unlisted)');
